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
  return {
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
    activeMegaEvents:[], bankruptRescued:false
  };
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
