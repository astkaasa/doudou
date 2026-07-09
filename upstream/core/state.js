// ===== OPERATIONS HELPERS (v0.6) =====
function calcStaffNeeded(g) {
  const routes = g.routes ? g.routes.length : 0;
  const fleet  = g.fleet  ? g.fleet.length : 0;
  const branches = g.branches ? g.branches.length : 0;
  return routes * STAFF_PER_ROUTE + fleet * STAFF_PER_PLANE + branches * STAFF_PER_BRANCH + STAFF_HQ_BASE;
}

function calcOpsEfficiency(g) {
  if (g.staffNeeded <= 0) return 1.0;
  const fillRate = g.staffCount / g.staffNeeded;
  const moraleFactor = g.staffMorale / 60;  // 士气60=1.0(达标线)
  return clamp(fillRate * moraleFactor, 0.3, 1.5);
}

function calcOpsBudgetCost(g) {
  const routes = g.routes ? g.routes.length : 0;
  const fleet  = g.fleet  ? g.fleet.length : 0;
  const branches = g.branches ? g.branches.length : 0;
  const serviceCost = routes * SERVICE_COST_PER_ROUTE * BUDGET_COST_MULT[g.serviceTier];
  const maintCost   = fleet  * MAINT_BUDGET_PER_PLANE * BUDGET_COST_MULT[g.maintTier];
  const adCost      = (routes * AD_COST_PER_ROUTE + branches * AD_COST_PER_BRANCH) * AD_COST_MULT[g.adTier];
  return { serviceCost, maintCost, adCost, total: serviceCost + maintCost + adCost };
}

// v0.6.2: 当 fleet/routes 变化时同步员工数量，避免 fillRate 骤降
// fillTarget: 目标满编率 (0.85 = 补到85%满编)，自然招募只会补到75%
// 目的：开航线/买飞机时自动补充大部分员工，保留短期缺口作为游戏性
function syncStaffToNeeded(fillTarget) {
  if (!G) return;
  G.staffNeeded = calcStaffNeeded(G);
  const gap = G.staffNeeded - G.staffCount;
  if (gap > 0) {
    // 补充到目标满编率，但不超过100%
    const target = Math.min(G.staffNeeded, G.staffCount + gap * fillTarget);
    G.staffCount = Math.round(target * 1000) / 1000;  // 保留3位小数(K)
  }
}

// ===== GAME STATE =====
let G = null;
let selectedEra = null;
let hqSelectMode = false;
let selectedHQ = null;
let branchSelectMode = false;
let selectedBranch = null;

// ===== UI STATE (not persisted to save) =====
const uiState = {
  fleetSort: { key: 'name', dir: 'asc' },
  fleetPage: 0,
  fleetPageSize: 10,
  fleetFilter: 'all',
  fleetMakerFilter: 'all',
  routeListSort: { key: 'profit', dir: 'desc' },
  routeListPage: 0,
  routeListPageSize: 10,
  routeStatusFilter: 'all',
  routeCityFilter: 'all',
  mapDrag: { dragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 },
  hideFlyingPlanes: false,
  debugGrid: false,
  buyPlaneSelectedMaker: 0,
  _buyPlaneGroups: null,
  _buyPlaneCanLease: false,
  _buyPlaneMakerKeys: null
};

function initStockState(era) {
  const stocks = {};
  const portfolio = {};
  const eraNum = parseInt(era.replace('era',''));
  STOCKS.forEach(s => {
    const startPrice = s.eraStart[eraNum];
    if (startPrice !== null) {
      stocks[s.id] = { price: startPrice, prevPrice: startPrice, history: [startPrice] };
    }
  });
  // 默认持仓1M WAPC（吾爱传媒）——新手即时关注
  if (stocks['wuer_media']) {
    portfolio['wuer_media'] = { shares: 1, avgCost: stocks['wuer_media'].price };
  }
  return { stocks, portfolio };
}

function initState(hq, era) {
  const e = ERAS.find(er=>er.id===era)||ERAS[2];
  const { stocks, portfolio } = initStockState(era);
  // v0.6.2: 初始员工=当前staffNeeded满编，确保开局HQ基础人员到位
  // 开局 state: routes=[], fleet=[], branches=[] → staffNeeded = STAFF_HQ_BASE = 0.05K
  // startGame() 追加2架飞机 → staffNeeded 重新计算，同步补人
  // confirmOpenRoute() 开通航线 → staffNeeded 重新计算，自动补充80%缺口
  const initStaffCount = STAFF_HQ_BASE;
  const state = {
    companyName:'豆豆航空', hq:hq, era:era, cash:e.cash, year:e.startYear, quarter:1, endYear:e.endYear,
    oilPrice:e.startOil, prevOilPrice:e.startOil, brand:1, routes:[], fleet:[], fleetMap:{},
    loan:0, loanRate:LOAN_RATE, branches:[], branchesConstructing:[],
    ai: AI_PROFILES.map((p,i)=>({...p, cash:e.cash+i*10, routes:[], fleet:[], brand:1+i})),
    cityStates: initCityStates(era),
    events:[], newsItems:[], lastNewspaperHtml:'',
    disasterRegions:[],
    stocks: stocks,
    portfolio: portfolio,
    stockEvents: [],
    turnProfit:0, turnRevenue:0, turnCost:0, totalProfit:0, turnsPlayed:0, consecutiveProfit:0,
    gameOver:false, selectedCity:null, planeIdCounter:1, history:[], mapZoom:1, mapPanX:0, mapPanY:0,
    onboardStep:0, deliveredThisTurn:[], leaseExpiredThisTurn:[], redPacketClaimed:false,
    playerTrait:null, traitChosen:false, milestones:{},
    ftpShown:{},
    activeMegaEvents:[], bankruptRescued:false,
    mainQuest:{ currentStage:1, stageCompleted:[], victoryGrade:null, victoryTurn:null },
    // ── Operations Management (v0.6) ──
    staffCount:initStaffCount, staffNeeded:0, staffMorale:40,
    serviceTier:'mid', maintTier:'mid', adTier:'mid',
    opsEfficiency:0, // 开局为0，首回合后才计算，HUD显示"--"
    accidentPenalty:0, accidentPenaltyTurns:0,
    _retiredThisTurn:0, _recruitCostThisTurn:0, _bonusCostThisTurn:0,
    _opsCostThisTurn:0, _faultLossThisTurn:0, _faultsThisTurn:[],
    _pendingRecruit:false, _pendingBonus:false,
    _onboardReportShown:false, // v0.7.1: 看懂财报引导步骤标记
    // ── Subsidiary System (v0.7.5) ──
    subsidiaries:{},
    _subReturnThisTurn:0,
    _subMaintThisTurn:0,
    _subValueChangeThisTurn:0,
    _acquirePriceSeed:0
  };
  // 计算运营需求（开局仅总部基础员工）
  state.staffNeeded = calcStaffNeeded(state);
  state.opsEfficiency = 0; // 保持0直到首回合推进
  return state;
}

// ── 存档迁移：补全新增字段+新城市cityState ──
function migrateGameState() {
  if (!G.activeMegaEvents) G.activeMegaEvents = [];
  if (G.bankruptRescued === undefined) G.bankruptRescued = false;
  // Ensure new cities have cityState entries
  CITIES.forEach(c => {
    if (!G.cityStates[c.id]) {
      const d = CITY_ERA_DATA[c.id];
      G.cityStates[c.id] = d
        ? { pop: d[0][0], biz: d[0][1], tour: d[0][2] }
        : { pop: c.pop, biz: 20, tour: 15 };
    }
  });
  // Main quest migration
  if (!G.mainQuest) G.mainQuest = { currentStage:1, stageCompleted:[], victoryGrade:null, victoryTurn:null };
  // Operations management migration (v0.6)
  if (G.staffCount === undefined) {
    G.staffNeeded = calcStaffNeeded(G);
    G.staffCount = G.staffNeeded;
    G.staffMorale = 40;
    G.serviceTier = 'mid';
    G.maintTier = 'mid';
    G.adTier = 'mid';
    G.opsEfficiency = 0;
    G.accidentPenalty = 0;
    G.accidentPenaltyTurns = 0;
  }
  if (G._retiredThisTurn === undefined) G._retiredThisTurn = 0;
  if (G._recruitCostThisTurn === undefined) G._recruitCostThisTurn = 0;
  if (G._bonusCostThisTurn === undefined) G._bonusCostThisTurn = 0;
  if (G._opsCostThisTurn === undefined) G._opsCostThisTurn = 0;
  if (G._faultLossThisTurn === undefined) G._faultLossThisTurn = 0;
  if (!G._faultsThisTurn) G._faultsThisTurn = [];
  if (!G.ftpShown) G.ftpShown = {};
  if (G._pendingOpsModal !== undefined) { G._pendingRecruit = G._pendingOpsModal === 'recruit'; G._pendingBonus = G._pendingOpsModal === 'bonus'; delete G._pendingOpsModal; }
  if (G._pendingRecruit === undefined) G._pendingRecruit = false;
  if (G._pendingBonus === undefined) G._pendingBonus = false;
  if (G._onboardReportShown === undefined) G._onboardReportShown = G.turnsPlayed > 0; // 旧存档已看过财报
  // ── Subsidiary System migration (v0.7.5) ──
  if (!G.subsidiaries) G.subsidiaries = {};
  if (G._subReturnThisTurn === undefined) G._subReturnThisTurn = 0;
  if (G._subMaintThisTurn === undefined) G._subMaintThisTurn = 0;
  if (G._subValueChangeThisTurn === undefined) G._subValueChangeThisTurn = 0;
  if (G._acquirePriceSeed === undefined) G._acquirePriceSeed = 0;
  // AI subsidiaries migration
  if (G.ai) G.ai.forEach(ai => { if (!ai.subsidiaries) ai.subsidiaries = {}; });
  // isNew migration: existing subs default to false
  if (G.subsidiaries) {
    for (const cityId of Object.keys(G.subsidiaries)) {
      for (const sub of G.subsidiaries[cityId]) {
        if (sub.isNew === undefined) sub.isNew = false;
      }
    }
  }
  // Rebuild activeMegaEvents from current game date (handles mid-cycle loads)
  if (G.year && G.quarter && typeof MEGA_EVENTS !== 'undefined') {
    MEGA_EVENTS.forEach(evt => {
      const quartersFromEvent = (G.year - evt.year) * 4 + (G.quarter - evt.quarter);
      const inWindow = quartersFromEvent >= -MEGA_EVENT_PRE_ANNOUNCE
                    && quartersFromEvent <= MEGA_EVENT_DECAY_LENGTH;
      if (inWindow && !G.activeMegaEvents.find(a => a.id === evt.id)) {
        const boost = evt.maxBoost * megaEventBoostCurve(quartersFromEvent);
        G.activeMegaEvents.push({
          id: evt.id, type: evt.type, cityId: evt.cityId,
          name: evt.name, fullName: evt.fullName,
          maxBoost: evt.maxBoost, currentBoost: boost,
          stockEffect: evt.stockEffect,
          quartersFromEvent: quartersFromEvent
        });
      }
    });
  }
}
