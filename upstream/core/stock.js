// ===== core/stock.js — 股票引擎 =====

// 获取当前时代可交易的股票列表
function getActiveStocks() {
  const eraNum = parseInt(G.era.replace('era', ''));
  return STOCKS.filter(s => s.eraStart[eraNum] !== null);
}

// 股价波动模型 v2.5：每季度在 generateEvents() 末尾调用
// 设计目标：内在随机性 > 新闻影响，防止后期单向上行
function updateStockPrices() {
  if (!G.stocks) return;
  
  const sectorShock = { finance: 0, energy: 0, culture: 0, tourism: 0, tech: 0 };
  
  // ── 油价冲击 ──
  if (G.prevOilPrice > 0) {
    const oilChangeRatio = (G.oilPrice - G.prevOilPrice) / G.prevOilPrice;
    if (Math.abs(oilChangeRatio) > 0.03) {
      sectorShock.energy += oilChangeRatio * STOCK_SECTOR_SHOCK_OIL;
      sectorShock.tourism -= oilChangeRatio * STOCK_SECTOR_SHOCK_OIL * 0.5;
    }
  }
  
  // ── 新闻驱动板块冲击（v2.5：影响衰减×0.5，弱化新闻主导） ──
  if (G.newsItems && G.newsItems.length > 0) {
    G.newsItems.forEach(item => {
      if (item.stockEffect) {
        Object.keys(item.stockEffect).forEach(sector => {
          if (sectorShock.hasOwnProperty(sector)) {
            sectorShock[sector] += item.stockEffect[sector] * STOCK_NEWS_IMPACT_SCALE;
          }
        });
      }
    });
  }
  
  // ── 灾害冲击（叠加，不衰减——灾害本就是强负面信号） ──
  if (G.disasterRegions && G.disasterRegions.length > 0) {
    G.disasterRegions.forEach(d => {
      sectorShock.tourism -= STOCK_SECTOR_SHOCK_DISASTER * 0.5;
      sectorShock.culture -= STOCK_SECTOR_SHOCK_DISASTER * 0.2;
    });
  }
  
  // ── 季节性（Q3旺季） ──
  if (G.quarter === 3) {
    sectorShock.tourism += 0.03;
    sectorShock.culture += 0.02;
  }
  
  // ── v2.5新增：随机板块崩盘（独立于新闻，增加非对称下行风险） ──
  // 每季度15%概率，随机选一个板块遭遇3%~8%抛售
  if (Math.random() < STOCK_RANDOM_CRASH_CHANCE) {
    const sectors = ['finance', 'energy', 'culture', 'tourism', 'tech'];
    const crashSector = sectors[Math.floor(Math.random() * sectors.length)];
    const crashMag = rand(STOCK_RANDOM_CRASH_MIN, STOCK_RANDOM_CRASH_MAX);
    sectorShock[crashSector] -= crashMag;
  }
  
  // ── 市场情绪（全局，范围收窄至±2%） ──
  const marketSentiment = rand(-STOCK_MARKET_SENTIMENT, STOCK_MARKET_SENTIMENT);
  
  // ── 当前时代编号（用于均值回归目标） ──
  const eraNum = parseInt(G.era.replace('era', ''));
  
  // ── 逐股更新 ──
  const activeStocks = getActiveStocks();
  activeStocks.forEach(stock => {
    if (!G.stocks[stock.id]) return;
    
    const state = G.stocks[stock.id];
    state.prevPrice = state.price;
    
    // v2.5：内在随机噪声（主要驱动力，±5%×beta）
    const noise = rand(-STOCK_NOISE_RANGE, STOCK_NOISE_RANGE) * stock.beta;
    
    // 板块冲击（本板块）
    const sectorImpact = sectorShock[stock.sector] || 0;
    
    // v2.5：均值回归目标改为当前时代起始价（而非固定basePrice）
    // 这样era2/3的价格溢价不会被立即修正，但仍防止无限漂移
    const stockDef = STOCK_MAP[stock.id];
    const revertTarget = stockDef.eraStart[eraNum] || stockDef.basePrice;
    const deviation = (state.price - revertTarget) / revertTarget;
    
    let meanRevert = 0;
    if (Math.abs(deviation) > STOCK_MEAN_REVERT_THRESHOLD) {
      meanRevert = -Math.sign(deviation) * STOCK_MEAN_REVERT_RATE;
    }
    
    // v2.5新增：高估值惩罚（仅向上偏离时生效）
    // 偏离超过50%后，每多偏离1%产生0.1%额外下行压力
    let overvalPenalty = 0;
    if (deviation > STOCK_OVERVAL_THRESHOLD) {
      overvalPenalty = -(deviation - STOCK_OVERVAL_THRESHOLD) * STOCK_OVERVAL_PENALTY_RATE;
    }
    
    // 总变动 = 情绪×beta + 板块冲击 + 噪声 + 均值回归 + 高估值惩罚
    const totalChange = marketSentiment * stock.beta + sectorImpact + noise + meanRevert + overvalPenalty;
    const clampedChange = clamp(totalChange, -STOCK_MAX_CHANGE, STOCK_MAX_CHANGE);
    
    // 更新价格（下限1，防止归零）
    state.price = Math.max(1, state.price * (1 + clampedChange));
    state.price = Math.round(state.price * 100) / 100;
    
    // 更新历史（最近8个季度）
    state.history.push(state.price);
    if (state.history.length > 8) state.history.shift();
  });
  
  // 记录板块冲击事件（供UI显示）
  G.stockEvents = [];
  Object.keys(sectorShock).forEach(sector => {
    if (Math.abs(sectorShock[sector]) > 0.02) {
      G.stockEvents.push({ sector, impact: sectorShock[sector] });
    }
  });
  
  emit('stock:changed', { sectorShock });
}

// 买入股票
function buyStock(stockId, shares) {
  shares = Math.round(shares);
  if (shares < STOCK_MIN_TRADE) return { ok: false, msg: '最小交易1M' };
  
  const stockDef = STOCK_MAP[stockId];
  if (!stockDef) return { ok: false, msg: '股票不存在' };
  
  const state = G.stocks[stockId];
  if (!state) return { ok: false, msg: '该时代此股票不可交易' };
  
  const currentHolding = G.portfolio[stockId] ? G.portfolio[stockId].shares : 0;
  if (currentHolding + shares > STOCK_MAX_HOLDING) {
    return { ok: false, msg: `持仓不能超过${STOCK_MAX_HOLDING}M` };
  }
  
  const cost = state.price * shares;
  const fee = cost * STOCK_TRADE_FEE;
  const totalCost = cost + fee;
  
  if (G.cash < totalCost) return { ok: false, msg: '资金不足' };
  
  // 执行
  G.cash -= totalCost;
  if (!G.portfolio[stockId]) {
    G.portfolio[stockId] = { shares: 0, avgCost: 0 };
  }
  const p = G.portfolio[stockId];
  const totalShares = p.shares + shares;
  p.avgCost = (p.shares * p.avgCost + shares * state.price) / totalShares;
  p.shares = totalShares;
  
  emit('stock:changed', { action: 'buy', stockId, shares, price: state.price, fee });
  return { ok: true, cost, fee, totalCost, shares: p.shares };
}

// 卖出股票
function sellStock(stockId, shares) {
  shares = Math.round(shares);
  if (shares < STOCK_MIN_TRADE) return { ok: false, msg: '最小交易1M' };
  
  const stockDef = STOCK_MAP[stockId];
  if (!stockDef) return { ok: false, msg: '股票不存在' };
  
  const state = G.stocks[stockId];
  if (!state) return { ok: false, msg: '该时代此股票不可交易' };
  
  const p = G.portfolio[stockId];
  if (!p || p.shares < shares) return { ok: false, msg: '持仓不足' };
  
  const revenue = state.price * shares;
  const fee = revenue * STOCK_TRADE_FEE;
  const netRevenue = revenue - fee;
  
  // 执行
  G.cash += netRevenue;
  p.shares -= shares;
  if (p.shares <= 0) {
    delete G.portfolio[stockId];
  }
  
  emit('stock:changed', { action: 'sell', stockId, shares, price: state.price, fee });
  return { ok: true, revenue, fee, netRevenue, shares: (G.portfolio[stockId] ? G.portfolio[stockId].shares : 0) };
}

// Q4结算分红
function calcDividend() {
  if (G.quarter !== 4) return 0;
  
  let totalDividend = 0;
  Object.keys(G.portfolio).forEach(stockId => {
    const p = G.portfolio[stockId];
    const state = G.stocks[stockId];
    const stockDef = STOCK_MAP[stockId];
    if (!state || !stockDef) return;
    
    const dividend = p.shares * state.price * stockDef.dividendYield;
    totalDividend += dividend;
  });
  
  return Math.round(totalDividend * 10) / 10;
}

// 计算NASDOU综合指数（所有股票平均涨跌幅）
function calcNasdouIndex() {
  if (!G.stocks) return 0;
  
  let totalChange = 0;
  let count = 0;
  Object.keys(G.stocks).forEach(stockId => {
    const state = G.stocks[stockId];
    if (state.prevPrice > 0) {
      totalChange += (state.price - state.prevPrice) / state.prevPrice;
      count++;
    }
  });
  
  return count > 0 ? totalChange / count : 0;
}

// 计算持仓市值和浮盈
function calcPortfolioValue() {
  let marketValue = 0;
  let totalCost = 0;
  
  Object.keys(G.portfolio).forEach(stockId => {
    const p = G.portfolio[stockId];
    const state = G.stocks[stockId];
    if (!state) return;
    
    marketValue += p.shares * state.price;
    totalCost += p.shares * p.avgCost;
  });
  
  return { marketValue, totalCost, floatingPnL: marketValue - totalCost };
}

// 检查持仓数量（用于UI显示）
function getPortfolioCount() {
  return Object.keys(G.portfolio).filter(id => G.portfolio[id].shares > 0).length;
}
