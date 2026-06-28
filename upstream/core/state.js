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

function initState(hq, era) {
  const e = ERAS.find(er=>er.id===era)||ERAS[2];
  return {
    companyName:'豆豆航空', hq:hq, era:era, cash:e.cash, year:e.startYear, quarter:1, endYear:e.endYear,
    oilPrice:e.startOil, prevOilPrice:e.startOil, brand:1, routes:[], fleet:[], fleetMap:{},
    loan:0, loanRate:LOAN_RATE, branches:[], branchesConstructing:[],
    ai: AI_PROFILES.map((p,i)=>({...p, cash:e.cash+i*10, routes:[], fleet:[], brand:1+i})),
    cityStates: initCityStates(era),
    events:[], newsItems:[], lastNewspaperHtml:'',
    disasterRegions:[],
    turnProfit:0, turnRevenue:0, turnCost:0, totalProfit:0, turnsPlayed:0, consecutiveProfit:0,
    gameOver:false, selectedCity:null, planeIdCounter:1, history:[], mapZoom:1, mapPanX:0, mapPanY:0,
    onboardStep:0, deliveredThisTurn:[], leaseExpiredThisTurn:[], redPacketClaimed:false,
    playerTrait:null, traitChosen:false, milestones:{}
  };
}
