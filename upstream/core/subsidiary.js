// ===== core/subsidiary.js — 子公司系统核心逻辑 =====

// ═══════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════

/** 简易字符串哈希 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** 城市投资指数 — 子公司回报乘数
 *  返回值范围: ~0.5(偏远小城) ~ 1.6(顶级都市)
 */
function cityInvestIndex(cityId) {
  const cs = getCityState(cityId);
  if (!cs) return 0.6;

  const popNorm  = 0.2 + Math.min(cs.pop / 30, 1) * 0.8;
  const bizNorm  = 0.2 + Math.min(cs.biz / 80, 1) * 0.8;
  const tourNorm = 0.2 + Math.min(cs.tour / 60, 1) * 0.8;

  return popNorm * SUB_CITY_WEIGHT_POP
       + bizNorm * SUB_CITY_WEIGHT_BIZ
       + tourNorm * SUB_CITY_WEIGHT_TOUR;
}

/** 统计指定城市、指定类型的AI子公司总数 */
function countAISubs(cityId, type) {
  let count = 0;
  if (!G.ai) return 0;
  for (const ai of G.ai) {
    if (ai.subsidiaries && ai.subsidiaries[cityId]) {
      if (ai.subsidiaries[cityId].some(s => s.type === type)) {
        count++;
      }
    }
  }
  return count;
}

// ═══════════════════════════════════════════════════════
// 成本计算
// ═══════════════════════════════════════════════════════

/** 计算新设子公司成本
 *  机场: costBase × cityLevel²
 *  其他: costBase × cityLevel
 */
function calcSubOpenCost(type, cityId) {
  const cfg = SUB_TYPES[type];
  const city = getCity(cityId);
  if (!city) return Infinity;
  if (type === 'airport') {
    return cfg.costBase * city.level * city.level;
  }
  return cfg.costBase * city.level;
}

/** 获取当季收购价 — 基于季度种子确定性派生 */
function getAcquirePrice(type, cityId) {
  const baseCost = calcSubOpenCost(type, cityId);
  const seed = G._acquirePriceSeed || 0;
  const cityHash = hashString(cityId);
  const typeHash = hashString(type);
  const combined = seed * 31 + cityHash * 17 + typeHash;

  const raw = Math.sin(combined) * 10000;
  const rand = ((raw % 1) + 1) % 1;  // 0~1
  const factor = SUB_ACQUIRE_MIN_FACTOR + rand * (SUB_ACQUIRE_MAX_FACTOR - SUB_ACQUIRE_MIN_FACTOR);

  return Math.round(baseCost * factor * 10) / 10;
}

// ═══════════════════════════════════════════════════════
// 子公司获取
// ═══════════════════════════════════════════════════════

/** 新设子公司 / 投资共建机场 */
function openSubsidiary(type, cityId) {
  const cfg = SUB_TYPES[type];
  const city = getCity(cityId);
  if (!city) return { ok: false, msg: '城市不存在' };

  // 1. 解锁条件检查
  if (city.level < cfg.minLevel) return { ok: false, msg: '城市等级不足' };
  if (type === 'travel') {
    const cs = getCityState(cityId);
    if (cs && cs.tour < cfg.minTour) return { ok: false, msg: '旅游指数不足' };
  }
  if (type === 'dutyfree') {
    const cs = getCityState(cityId);
    if (cs && cs.biz < cfg.minBiz) return { ok: false, msg: '商业指数不足' };
  }
  if (cfg.requiresBase && !isBase(cityId)) return { ok: false, msg: '仅总部/分部城市可建' };

  // 2. 同类子公司检查
  if (G.subsidiaries[cityId] && G.subsidiaries[cityId].some(s => s.type === type)) {
    return { ok: false, msg: '该城市已有同类子公司' };
  }

  // 3. 成本+手续费检查
  const cost = calcSubOpenCost(type, cityId);
  const fee = Math.round(cost * SUB_FEE_RATE);
  const totalCost = cost + fee;
  if (G.cash < totalCost) return { ok: false, msg: '资金不足' };

  // 4. 执行
  G.cash -= totalCost;
  if (!G.subsidiaries[cityId]) G.subsidiaries[cityId] = [];
  const source = type === 'airport' ? 'invest' : 'open';
  G.subsidiaries[cityId].push({
    type: type,
    openCost: cost,
    currentValue: cost,
    source: source,
    quarterAcquired: G.turnsPlayed,
    cityLevelAtAcquire: city.level,
    isNew: true
  });

  emit('sub:opened', { type, cityId, cost, fee, source });
  return { ok: true, cost, fee, cityName: city.name };
}

/** 收购子公司 */
function acquireSubsidiary(type, cityId) {
  const cfg = SUB_TYPES[type];
  const city = getCity(cityId);
  if (!city) return { ok: false, msg: '城市不存在' };

  // 机场不可收购
  if (type === 'airport') return { ok: false, msg: '投资共建项目不可收购' };

  // 解锁条件检查
  if (city.level < cfg.minLevel) return { ok: false, msg: '城市等级不足' };
  if (type === 'travel') {
    const cs = getCityState(cityId);
    if (cs && cs.tour < cfg.minTour) return { ok: false, msg: '旅游指数不足' };
  }
  if (type === 'dutyfree') {
    const cs = getCityState(cityId);
    if (cs && cs.biz < cfg.minBiz) return { ok: false, msg: '商业指数不足' };
  }

  // 同类子公司检查
  if (G.subsidiaries[cityId] && G.subsidiaries[cityId].some(s => s.type === type)) {
    return { ok: false, msg: '该城市已有同类子公司' };
  }

  // 收购价+手续费
  const baseCost = calcSubOpenCost(type, cityId);
  const acquireCost = getAcquirePrice(type, cityId);
  const fee = Math.round(acquireCost * SUB_FEE_RATE);
  const totalCost = acquireCost + fee;
  const randFactor = acquireCost / baseCost;

  if (G.cash < totalCost) return { ok: false, msg: '资金不足' };

  // 执行
  G.cash -= totalCost;
  if (!G.subsidiaries[cityId]) G.subsidiaries[cityId] = [];
  G.subsidiaries[cityId].push({
    type: type,
    openCost: acquireCost,
    currentValue: acquireCost,
    source: 'acquire',
    quarterAcquired: G.turnsPlayed,
    cityLevelAtAcquire: city.level,
    isNew: true
  });

  emit('sub:acquired', { type, cityId, cost: acquireCost, fee, discount: ((1 - randFactor) * 100).toFixed(0) });
  return { ok: true, cost: acquireCost, fee, baseCost, discount: ((1 - randFactor) * 100).toFixed(0) + '%' };
}

/** 出售子公司 */
function sellSubsidiary(cityId, type) {
  if (!G.subsidiaries[cityId]) return { ok: false };
  const idx = G.subsidiaries[cityId].findIndex(s => s.type === type);
  if (idx < 0) return { ok: false };

  const sub = G.subsidiaries[cityId][idx];

  let grossPrice;
  if (type === 'airport') {
    grossPrice = Math.round(sub.currentValue * SUB_AIRPORT_SELLBACK_RATE);
  } else {
    grossPrice = Math.round(sub.currentValue);
  }
  const fee = Math.round(grossPrice * SUB_FEE_RATE);
  const sellPrice = grossPrice - fee;

  G.cash += sellPrice;
  G.subsidiaries[cityId].splice(idx, 1);
  if (G.subsidiaries[cityId].length === 0) delete G.subsidiaries[cityId];

  emit('sub:sold', { type, cityId, sellPrice, fee, originalCost: sub.openCost });
  return { ok: true, sellPrice, fee, originalCost: sub.openCost, profit: sellPrice - sub.openCost };
}

// ═══════════════════════════════════════════════════════
// 估值与回报
// ═══════════════════════════════════════════════════════

/** 更新所有子公司估值（每季度调用） */
function updateSubsidiaryValues() {
  if (!G.subsidiaries) return;

  const totalRouteProfit = G.routes.reduce((s, r) => s + (r.profit || 0), 0);
  const totalRouteRevenue = G.routes.reduce((s, r) => s + (r.revenue || 0), 0);
  const profitRatio = totalRouteRevenue > 0 ? totalRouteProfit / totalRouteRevenue : 0;

  for (const cityId of Object.keys(G.subsidiaries)) {
    for (const sub of G.subsidiaries[cityId]) {
      const cfg = SUB_TYPES[sub.type];

      // 1. 基础季度变动
      let delta = SUB_BASE_APPRECIATION;

      // 2. 航线收益驱动
      if (profitRatio > 0.15)       delta += SUB_PROFIT_BOOST;
      else if (profitRatio < 0.05)   delta -= SUB_LOSS_PENALTY;

      // 3. 同城航线加成
      const hasRouteHere = G.routes.some(r => r.from === cityId || r.to === cityId);
      if (hasRouteHere) delta += SUB_ROUTE_PRESENCE_BONUS;
      else delta -= SUB_NO_ROUTE_PENALTY;

      // 4. 盛事加成
      if (G.activeMegaEvents) {
        for (const evt of G.activeMegaEvents) {
          if (evt.cityId === cityId && evt.currentBoost > 0) {
            delta += evt.currentBoost * SUB_MEGA_VALUE_BOOST;
          }
        }
      }

      // 5. 城市属性成长渗透
      const cs = getCityState(cityId);
      if (cs) {
        delta += (cs.biz - 30) * 0.00002 + (cs.tour - 30) * 0.00002;
      }

      // 应用变动
      const floorRatio = sub.type === 'airport' ? SUB_AIRPORT_VALUE_FLOOR : SUB_VALUE_FLOOR_RATIO;
      sub.currentValue = Math.max(sub.openCost * floorRatio, sub.currentValue * (1 + delta));
      sub.currentValue = Math.round(sub.currentValue * 100) / 100;
    }
  }
}

/** 计算单个子公司回报 */
function calcSubReturn(sub, cityId) {
  const cfg = SUB_TYPES[sub.type];

  // 1. 基础回报
  let baseReturn = sub.currentValue * cfg.baseRate;

  // 2. 城市投资指数乘数
  let cityMult = cityInvestIndex(cityId);

  // 3. 盛事加成
  let megaMult = 1.0;
  if (G.activeMegaEvents && G.activeMegaEvents.length > 0) {
    for (const evt of G.activeMegaEvents) {
      if (evt.cityId === cityId && evt.currentBoost > 0) {
        if (cfg.special === 'mega_boost') {
          megaMult = Math.max(megaMult, 1 + evt.currentBoost * SUB_MEGA_BOOST_MULT);
        } else if (cfg.special === 'mega_boost_s') {
          megaMult = Math.max(megaMult, 1 + evt.currentBoost * SUB_MEGA_BOOST_MULT_S);
        } else {
          megaMult = Math.max(megaMult, 1 + evt.currentBoost * 0.8);
        }
      } else {
        // 溢出效应
        const hostCity = getCity(evt.cityId);
        const c = getCity(cityId);
        if (hostCity && c && hostCity.region === c.region && evt.currentBoost > 0) {
          megaMult = Math.max(megaMult, 1 + evt.currentBoost * MEGA_EVENT_SPILLOVER * SUB_MEGA_SPILLOVER_MULT);
        }
      }
    }
  }

  // 4. AI竞争稀释
  let compDilute = 1.0;
  const aiCount = countAISubs(cityId, sub.type);
  compDilute = 1.0 / (1 + aiCount * SUB_AI_DILUTE_RATE);

  // 5. 维护成本
  let maintCost = sub.currentValue * cfg.maintRate;

  // 净回报
  let gross = baseReturn * cityMult * megaMult * compDilute;
  let net = gross - maintCost;

  // 6. 机场合资方分润
  if (sub.type === 'airport') {
    net *= SUB_AIRPORT_PROFIT_SHARE;
    gross *= SUB_AIRPORT_PROFIT_SHARE;
  }

  return { gross, maint: maintCost, net };
}

// ═══════════════════════════════════════════════════════
// 公司市值
// ═══════════════════════════════════════════════════════

/** 计算公司市值（净资产） */
function calcCompanyValue() {
  const cash = G.cash;

  // 飞机总值
  const fleetValue = G.fleet.reduce((sum, p) => {
    return sum + p.buyPrice * Math.max(0.15, 1 - p.age * PLANE_SELL_AGE_FACTOR);
  }, 0);

  // 子公司总值
  let subValue = 0;
  if (G.subsidiaries) {
    for (const cityId of Object.keys(G.subsidiaries)) {
      for (const sub of G.subsidiaries[cityId]) {
        subValue += sub.currentValue;
      }
    }
  }

  // 股票持仓市值
  const stockValue = calcPortfolioValue().marketValue;

  // 负债
  const loanDebt = G.loan || 0;

  return {
    cash: cash,
    fleetValue: fleetValue,
    subValue: subValue,
    stockValue: stockValue,
    loanDebt: loanDebt,
    totalNetWorth: cash + fleetValue + subValue + stockValue - loanDebt
  };
}

// ═══════════════════════════════════════════════════════
// 破产清算（5阶段渐进式）
// ═══════════════════════════════════════════════════════

/** Phase 1: 强制贷款 */
function attemptEmergencyLoan() {
  const cv = calcCompanyValue();
  const maxEmergencyLoan = Math.max(0, cv.totalNetWorth * EMERGENCY_LOAN_CAP_RATIO - G.loan);
  if (maxEmergencyLoan <= 0) return false;

  const deficit = Math.abs(Math.min(0, G.cash));
  const loanAmount = Math.min(deficit + 5, maxEmergencyLoan);

  G.loan += loanAmount;
  G.cash += loanAmount;
  G.loanRate = LOAN_RATE * EMERGENCY_LOAN_RATE_MULT;

  emit('emergency:loan', { amount: loanAmount });
  return true;
}

/** Phase 2: 变卖股票 */
function forceSellStocks() {
  if (!G.portfolio || Object.keys(G.portfolio).length === 0) return false;

  const holdings = Object.keys(G.portfolio)
    .map(id => ({ id, shares: G.portfolio[id].shares, value: G.portfolio[id].shares * (G.stocks[id]?.price || 0) }))
    .sort((a, b) => b.value - a.value);

  for (const h of holdings) {
    if (G.cash >= 0) break;
    const result = sellStock(h.id, h.shares);
    if (result.ok) {
      emit('force:sell:stock', { stockId: h.id, shares: h.shares, revenue: result.netRevenue });
    }
  }

  return G.cash >= 0;
}

/** Phase 3: 出售子公司 */
function forceSellSubsidiaries() {
  if (!G.subsidiaries || Object.keys(G.subsidiaries).length === 0) return false;

  const allSubs = [];
  for (const cityId of Object.keys(G.subsidiaries)) {
    for (const sub of G.subsidiaries[cityId]) {
      allSubs.push({ cityId, type: sub.type, value: sub.currentValue });
    }
  }
  allSubs.sort((a, b) => b.value - a.value);

  for (const s of allSubs) {
    if (G.cash >= 0) break;
    const result = sellSubsidiary(s.cityId, s.type);
    if (result.ok) {
      emit('force:sell:sub', { cityId: s.cityId, type: s.type, revenue: result.sellPrice });
    }
  }

  return G.cash >= 0;
}

/** Phase 4: 变卖飞机+关停航线 */
function forceSellPlanes() {
  const sellable = G.fleet
    .filter(p => !p.delivering)
    .map(p => ({
      plane: p,
      sellPrice: p.buyPrice * Math.max(0.15, 1 - p.age * PLANE_SELL_AGE_FACTOR)
    }))
    .sort((a, b) => b.sellPrice - a.sellPrice);

  for (const item of sellable) {
    if (G.cash >= 0) break;

    G.routes.forEach(r => {
      r.assignedPlanes = r.assignedPlanes.filter(pid => pid !== item.plane.uid);
    });

    G.cash += item.sellPrice;
    G.fleet = G.fleet.filter(p => p.uid !== item.plane.uid);

    emit('force:sell:plane', { planeName: item.plane.name, revenue: item.sellPrice });
  }

  // 关停无飞机航线
  G.routes = G.routes.filter(r => r.assignedPlanes.length > 0);
  rebuildFleetMap();
  return G.cash >= 0;
}

/** 破产5阶段总控 — 返回true=游戏结束 */
function handleBankruptcy() {
  // Phase 1: 强制贷款
  if (attemptEmergencyLoan()) {
    showBanner('急救贷款已发放！注意高利率!', '#d97706');
    return false;
  }
  // Phase 2: 变卖股票
  if (forceSellStocks()) {
    showBanner('已强制出售股票以弥补亏损', '#f87171');
    return false;
  }
  // Phase 3: 出售子公司
  if (forceSellSubsidiaries()) {
    showBanner('已强制出售子公司以弥补亏损', '#f87171');
    return false;
  }
  // Phase 4: 变卖飞机
  if (forceSellPlanes()) {
    showBanner('已变卖飞机以弥补亏损，部分航线已关停', '#dc2626');
    return false;
  }
  // Phase 5: 天使投资 / 游戏结束
  if (!G.bankruptRescued) {
    G.bankruptRescued = true;
    emit('game:angel', { turnsPlayed: G.turnsPlayed, routes: G.routes.length, fleet: G.fleet.length });
    return false;
  }
  G.gameOver = true;
  emit('game:over', { reason: 'bankrupt', turnsPlayed: G.turnsPlayed, routes: G.routes.length, fleet: G.fleet.length });
  return true;
}

// ═══════════════════════════════════════════════════════
// AI子公司行为
// ═══════════════════════════════════════════════════════

/** AI子公司决策 — 每季度由aiTurn调用 */
function aiSubDecide(ai) {
  // 仅每4季度决策一次
  if (G.turnsPlayed % 4 !== 0) return;
  if (!ai.routes || ai.routes.length === 0) return;

  // 上限检查
  const aiSubCount = Object.values(ai.subsidiaries || {}).flat().length;
  if (aiSubCount >= ai.routes.length) return;

  // 30%概率
  if (Math.random() > 0.30) return;

  const servedCities = [...new Set(ai.routes.flatMap(r => [r.from, r.to]))];
  const targetCity = servedCities[Math.floor(Math.random() * servedCities.length)];
  const city = getCity(targetCity);
  if (!city || city.level < 2) return;

  const typePool = ai.riskAverse > 0.6
    ? ['shuttle', 'hotel']
    : ai.riskAverse < 0.4
      ? ['dutyfree', 'travel']
      : ['shuttle', 'hotel', 'travel', 'dutyfree'];

  const existingTypes = (ai.subsidiaries?.[targetCity] || []).map(s => s.type);
  const available = typePool.filter(t => !existingTypes.includes(t));
  if (available.length === 0) return;

  const type = available[Math.floor(Math.random() * available.length)];
  const cfg = SUB_TYPES[type];

  const cs = getCityState(targetCity);
  if (city.level < cfg.minLevel) return;
  if (type === 'travel' && cs && cs.tour < cfg.minTour) return;
  if (type === 'dutyfree' && cs && cs.biz < cfg.minBiz) return;
  if (type === 'airport') return; // AI不开机场

  if (!ai.subsidiaries) ai.subsidiaries = {};
  if (!ai.subsidiaries[targetCity]) ai.subsidiaries[targetCity] = [];
  ai.subsidiaries[targetCity].push({
    type: type,
    openCost: 0,
    currentValue: 0,
    source: 'ai',
    quarterAcquired: G.turnsPlayed,
    cityLevelAtAcquire: city.level
  });
}

// ═══════════════════════════════════════════════════════
// 联动效果
// ═══════════════════════════════════════════════════════

/** 检查玩家是否在某城市拥有某类型子公司 */
function hasSubType(cityId, type) {
  return G.subsidiaries?.[cityId]?.some(s => s.type === type) || false;
}

/** 获取旅行社LF加成 — 同城有旅行社则+2% */
function getSubLFBonus(cityId) {
  if (hasSubType(cityId, 'travel')) return SUB_ROUTE_LF_BONUS;
  return 0;
}

/** 获取机场着陆费减免 — 同城有机场则-15% */
function getSubLandingDiscount(cityId) {
  if (hasSubType(cityId, 'airport')) return SUB_LANDING_DISCOUNT;
  return 0;
}

/** 免税店品牌加成结算 — 每季度调用 */
function applyDutyFreeBrandBonus() {
  if (!G.subsidiaries) return;
  for (const cityId of Object.keys(G.subsidiaries)) {
    if (G.subsidiaries[cityId].some(s => s.type === 'dutyfree')) {
      G.brand = clamp(G.brand + SUB_DUTYFREE_BRAND_BONUS, 1, 10);
    }
  }
}

// ═══════════════════════════════════════════════════════
// 查询辅助
// ═══════════════════════════════════════════════════════

/** 获取所有子公司扁平列表 */
function getAllSubsidiaries() {
  const list = [];
  if (!G.subsidiaries) return list;
  for (const cityId of Object.keys(G.subsidiaries)) {
    for (const sub of G.subsidiaries[cityId]) {
      list.push({ cityId, ...sub });
    }
  }
  return list;
}

/** 获取子公司总估值 */
function getTotalSubValue() {
  return getAllSubsidiaries().reduce((s, sub) => s + sub.currentValue, 0);
}

/** 获取城市已有的子公司类型集合 */
function getCitySubTypes(cityId) {
  return (G.subsidiaries?.[cityId] || []).map(s => s.type);
}

/** 获取城市可新建的子公司类型列表 */
function getAvailableSubTypes(cityId) {
  const city = getCity(cityId);
  if (!city) return [];
  const existing = getCitySubTypes(cityId);
  const cs = getCityState(cityId);

  return Object.keys(SUB_TYPES).filter(type => {
    if (existing.includes(type)) return false;
    const cfg = SUB_TYPES[type];
    if (city.level < cfg.minLevel) return false;
    if (type === 'travel' && cs && cs.tour < cfg.minTour) return false;
    if (type === 'dutyfree' && cs && cs.biz < cfg.minBiz) return false;
    if (cfg.requiresBase && !isBase(cityId)) return false;
    return true;
  });
}
