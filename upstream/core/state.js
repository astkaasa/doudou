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
    playerTrait:null, traitChosen:false, milestones:{}
  };
}
