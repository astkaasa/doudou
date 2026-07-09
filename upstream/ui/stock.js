// ===== ui/stock.js — 证券市场界面 =====

let _selectedStockId = null;

function openStockModal() {
  if (!G || !G.stocks) return;
  _selectedStockId = null;
  const activeStocks = getActiveStocks();
  if (activeStocks.length === 0) return;
  _selectedStockId = activeStocks[0].id;
  // 标记股票面板已打开（触发FTP发现卡）
  G._stockPanelOpened = true;
  checkFTPs();
  renderStockModal();
}

function renderStockModal() {
  const activeStocks = getActiveStocks();
  const nasdou = calcNasdouIndex();
  const nasdouPct = (nasdou * 100).toFixed(1);
  const nasdouSign = nasdou > 0.001 ? '+' : '';
  const nasdouColor = nasdou > 0.001 ? '#ef4444' : nasdou < -0.001 ? '#22c55e' : '#fbbf24';
  
  // Modal宽度960px，确保各列舒适间距
  let html = `<div class="modal" style="max-width:960px;width:95vw;max-height:82vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h2 style="margin:0;font-size:16px;color:#fbbf24">📈 NASDOU 证券市场</h2>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;color:#94a3b8">${G.year}年 第${G.quarter}季度</span>
        <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;border-radius:4px" onclick="closeModal()">关闭</button>
      </div>
    </div>
    <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:nowrap">`;
  
  // ── 左区：股票行情 ──
  // 固定590px宽度，各列固定宽度+flex-shrink:0+统一gap:8px间距
  // 名称列84px可完整显示"兰姆皇家银行"(5字×16px=80px)
  html += `<div style="width:590px;flex-shrink:0">
    <div style="font-size:12px;color:#94a3b8;margin-bottom:6px">综合指数 <span style="color:${nasdouColor};font-weight:700">${nasdouSign}${nasdouPct}%</span></div>`;
  
  // 表头 — 名称84px完整显示；持仓/持仓成本固定宽度贴右
  html += `<div style="display:flex;align-items:center;gap:8px;padding:4px 8px;font-size:11px;color:#64748b;border-bottom:1px solid #33415580;margin-bottom:2px">
    <span style="width:44px;flex-shrink:0">代码</span>
    <span style="width:84px;flex-shrink:0">名称</span>
    <span style="width:56px;flex-shrink:0;text-align:right">价格</span>
    <span style="width:48px;flex-shrink:0;text-align:right">涨跌</span>
    <span style="width:80px;flex-shrink:0;text-align:center">走势</span>
    <span style="width:36px;flex-shrink:0;text-align:right">持仓</span>
    <span style="width:64px;flex-shrink:0;text-align:right">持仓成本</span>
  </div>`;
  
  activeStocks.forEach(stock => {
    const state = G.stocks[stock.id];
    if (!state) return;
    
    const change = state.prevPrice > 0 ? (state.price - state.prevPrice) / state.prevPrice : 0;
    const changePct = (change * 100).toFixed(1);
    const isUp = change > 0.001;
    const isDown = change < -0.001;
    const arrow = isUp ? '↑' : isDown ? '↓' : '→';
    const changeColor = isUp ? '#ef4444' : isDown ? '#22c55e' : '#94a3b8';
    const sectorColor = STOCK_SECTORS[stock.sector].color;
    const isSelected = _selectedStockId === stock.id;
    const holding = G.portfolio[stock.id] ? G.portfolio[stock.id].shares : 0;
    const avgCost = G.portfolio[stock.id] ? G.portfolio[stock.id].avgCost : 0;
    
    const barChart = buildBarChartSvg(state.history);
    
    html += `<div onclick="selectStock('${stock.id}')" style="
      display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer;
      margin-bottom:2px;font-size:13px;
      background:${isSelected ? '#33415580' : 'transparent'};
      border:1px solid ${isSelected ? sectorColor + '60' : 'transparent'}
    ">
      <span style="font-weight:700;color:${sectorColor};width:44px;flex-shrink:0">${stock.code}</span>
      <span style="width:84px;flex-shrink:0;color:#e0e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${stock.name}">${stock.name}</span>
      <span style="font-weight:600;color:#e0e8f0;width:56px;flex-shrink:0;text-align:right">$${state.price.toFixed(1)}</span>
      <span style="color:${changeColor};font-weight:600;width:48px;flex-shrink:0;text-align:right">${arrow}${changePct}%</span>
      ${barChart}
      <span style="width:36px;flex-shrink:0;text-align:right;font-size:11px;${holding > 0 ? 'color:#fbbf24;font-weight:600' : 'color:#475569'}">${holding > 0 ? holding + 'M' : ''}</span>
      <span style="width:64px;flex-shrink:0;text-align:right;font-size:11px;${holding > 0 ? 'color:#94a3b8' : 'color:#475569'}">${holding > 0 ? '$' + avgCost.toFixed(1) : ''}</span>
    </div>`;
  });
  
  html += `</div>`;
  
  // ── 右区：快捷交易（flex:1自适应） ──
  html += `<div style="flex:1;min-width:240px">`;
  
  if (_selectedStockId && G.stocks[_selectedStockId]) {
    const stockDef = STOCK_MAP[_selectedStockId];
    const state = G.stocks[_selectedStockId];
    const sectorInfo = STOCK_SECTORS[stockDef.sector];
    const change = state.prevPrice > 0 ? (state.price - state.prevPrice) / state.prevPrice : 0;
    const changePct = (change * 100).toFixed(1);
    const isUp = change > 0.001;
    const isDown = change < -0.001;
    const changeColor = isUp ? '#ef4444' : isDown ? '#22c55e' : '#94a3b8';
    const arrow = isUp ? '↑' : isDown ? '↓' : '→';
    const holding = G.portfolio[_selectedStockId] ? G.portfolio[_selectedStockId].shares : 0;
    const avgCost = G.portfolio[_selectedStockId] ? G.portfolio[_selectedStockId].avgCost : 0;
    
    // 个股信息
    html += `<div style="margin-bottom:12px">
      <div style="font-size:14px;font-weight:700;color:${sectorInfo.color}">${stockDef.name}</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:2px">Code: ${stockDef.code} | 板块: ${sectorInfo.name}</div>
      <div style="display:flex;gap:12px;margin-top:6px;font-size:13px">
        <span style="color:#e0e8f0">当前价: <strong>$${state.price.toFixed(1)}</strong></span>
        <span style="color:${changeColor};font-weight:600">${arrow}${changePct}%</span>
      </div>
      <div style="font-size:12px;color:#94a3b8;margin-top:4px">持仓: <span style="${holding > 0 ? 'color:#fbbf24;font-weight:600' : 'color:#64748b'}">${holding > 0 ? holding + 'M' : '--'}</span> | 持仓成本: <span style="${holding > 0 ? 'color:#e0e8f0' : 'color:#64748b'}">${holding > 0 ? '$' + avgCost.toFixed(1) : '--'}</span></div>
    </div>`;
    
    // ── 买入区 ──
    const canBuyMore = holding < STOCK_MAX_HOLDING;
    html += `<div style="border-top:1px solid #334155;padding-top:8px;margin-top:8px">
      <div style="font-size:12px;color:#94a3b8;margin-bottom:6px">── 买入 ──</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">`;
    
    [1, 5, 10, 50, 100].forEach(amt => {
      const cost = state.price * amt;
      const fee = cost * STOCK_TRADE_FEE;
      const total = cost + fee;
      const disabled = !canBuyMore || holding + amt > STOCK_MAX_HOLDING || G.cash < total;
      html += `<button class="btn btn-sm" style="
        background:${disabled ? '#1e293b' : '#16a34a'};color:${disabled ? '#475569' : '#fff'};
        border-radius:4px;padding:3px 10px;font-size:12px;${disabled ? 'cursor:not-allowed' : ''}
      " ${disabled ? 'disabled' : `onclick="executeBuyStock('${_selectedStockId}',${amt})"`}>${amt}M</button>`;
    });
    
    const buyCost1 = state.price * 1 + state.price * 1 * STOCK_TRADE_FEE;
    html += `</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px">1M花费: $${buyCost1.toFixed(1)}M (含手续费1%)</div>
      <div style="font-size:11px;color:#94a3b8">持仓: ${holding}M / 上限${STOCK_MAX_HOLDING}M</div>
    </div>`;
    
    // ── 卖出区 ──
    html += `<div style="border-top:1px solid #334155;padding-top:8px;margin-top:8px">
      <div style="font-size:12px;color:#94a3b8;margin-bottom:6px">── 卖出 ──</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">`;
    
    [1, 5, 10, 50, 100].forEach(amt => {
      const disabled = holding < amt;
      html += `<button class="btn btn-sm" style="
        background:${disabled ? '#1e293b' : '#b91c1c'};color:${disabled ? '#475569' : '#fff'};
        border-radius:4px;padding:3px 10px;font-size:12px;${disabled ? 'cursor:not-allowed' : ''}
      " ${disabled ? 'disabled' : `onclick="executeSellStock('${_selectedStockId}',${amt})"`}>${amt}M</button>`;
    });
    
    // "全部"按钮 — 红色与卖出区统一
    const allDisabled = holding <= 0;
    html += `<button class="btn btn-sm" style="
      background:${allDisabled ? '#1e293b' : '#b91c1c'};color:${allDisabled ? '#475569' : '#fff'};
      border-radius:4px;padding:3px 10px;font-size:12px;font-weight:700;${allDisabled ? 'cursor:not-allowed' : ''}
    " ${allDisabled ? 'disabled' : `onclick="executeSellStock('${_selectedStockId}',${holding})"`}>全部</button>`;
    
    const sellNet1 = state.price * 1 - state.price * 1 * STOCK_TRADE_FEE;
    html += `</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px">1M收入: $${sellNet1.toFixed(1)}M (含手续费1%)</div>
    </div>`;
  } else {
    html += `<div style="font-size:13px;color:#64748b;text-align:center;padding:20px">点击左侧股票进行交易</div>`;
  }
  
  // ── 持仓汇总（金黄色边框#fbbf24 + 金黄色标题） ──
  const pv = calcPortfolioValue();
  const pvlColor = pv.floatingPnL > 0 ? '#ef4444' : pv.floatingPnL < 0 ? '#22c55e' : '#94a3b8';
  
  html += `<div style="border:1px solid #fbbf24;border-radius:6px;padding:8px 10px;margin-top:12px">
    <div style="font-size:12px;color:#fbbf24;font-weight:600;margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid #33415580">持仓汇总</div>
    <div style="font-size:13px;color:#e0e8f0">持仓市值: $${pv.marketValue.toFixed(1)}M</div>
    <div style="font-size:13px;color:${pvlColor}">浮盈: ${pv.floatingPnL >= 0 ? '+' : ''}$${pv.floatingPnL.toFixed(1)}M</div>
    ${G.quarter === 4 ? `<div style="font-size:12px;color:#fbbf24;margin-top:2px">Q4分红结算中</div>` : ''}
  </div>`;
  
  // ── 可用资金 ──
  html += `<div style="border-top:1px solid #334155;padding-top:6px;margin-top:8px;font-size:13px;color:#7ba3cc">
    可用资金: <span style="color:#4ade80;font-weight:700;font-size:15px">${fmt(G.cash)}</span>
  </div>`;
  
  html += `</div></div></div>`;
  
  $('modal-root').innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">${html}</div>`;
}

function selectStock(stockId) {
  _selectedStockId = stockId;
  renderStockModal();
}

function executeBuyStock(stockId, shares) {
  const result = buyStock(stockId, shares);
  if (!result.ok) {
    showBanner(result.msg, '#b91c1c');
  } else {
    showBanner(`买入 ${STOCK_MAP[stockId].code} ${shares}M，花费 $${result.totalCost.toFixed(1)}M`, '#16a34a');
    updateHUD();
  }
  renderStockModal();
}

function executeSellStock(stockId, shares) {
  const result = sellStock(stockId, shares);
  if (!result.ok) {
    showBanner(result.msg, '#b91c1c');
  } else {
    showBanner(`卖出 ${STOCK_MAP[stockId].code} ${shares}M，到账 $${result.netRevenue.toFixed(1)}M`, '#d97706');
    updateHUD();
  }
  renderStockModal();
}

// 构建迷你柱状图 SVG（红涨绿跌，A股风格）
// 固定柱宽8px，最大8柱位，数据不足时只渲染已有柱（右侧空位）
const STOCK_BAR_W = 8;
const STOCK_BAR_GAP = 1;
const STOCK_MAX_BARS = 8;
const STOCK_SVG_W = STOCK_MAX_BARS * (STOCK_BAR_W + STOCK_BAR_GAP) + 2; // 74px
const STOCK_SVG_H = 16;

function buildBarChartSvg(history) {
  if (!history || history.length < 2) return `<span style="width:80px;flex-shrink:0;display:inline-block"></span>`;
  
  let bars = '';
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  
  for (let i = 0; i < history.length; i++) {
    const change = i > 0 && history[i - 1] > 0 ? (history[i] - history[i - 1]) / history[i - 1] : 0;
    const isUp = change > 0.001;
    const isDown = change < -0.001;
    const color = isUp ? '#ef4444' : isDown ? '#22c55e' : '#64748b';
    
    const barH = Math.max(2, Math.round(((history[i] - min) / range) * (STOCK_SVG_H - 2) + 2));
    const x = 1 + i * (STOCK_BAR_W + STOCK_BAR_GAP);
    const y = STOCK_SVG_H - barH;
    
    bars += `<rect x="${x}" y="${y}" width="${STOCK_BAR_W}" height="${barH}" fill="${color}" rx="1"/>`;
  }
  
  return `<svg width="${STOCK_SVG_W}" height="${STOCK_SVG_H}" style="width:80px;flex-shrink:0">${bars}</svg>`;
}

// 更新NASDOU徽章（底部栏）
function updateNasdouBadge() {
  const badge = $('nasdou-badge');
  if (!badge || !G || !G.stocks) return;
  
  const nasdou = calcNasdouIndex();
  const pct = (nasdou * 100).toFixed(1);
  const sign = nasdou > 0.001 ? '+' : '';
  const color = nasdou > 0.001 ? '#ef4444' : nasdou < -0.001 ? '#22c55e' : '#fbbf24';
  
  badge.innerHTML = `📈 NASDOU <span style="color:${color};font-size:10px">${sign}${pct}%</span>`;
}
