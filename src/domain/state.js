import { AI_PROFILES } from '../data/aiProfiles.js';
import { ERAS } from '../data/eras.js';
import { DEFAULT_COMPANY_NAME } from './constants.js';
import { availablePlaneTemplates } from './fleet.js';
import { randInt } from './helpers.js';

export function initState(hq, era) {
  const e = findEra(era);
  return createBaseState(e, {
    hq,
    era: e.id,
    ai: AI_PROFILES.map((p, i) => ({ ...p, cash: e.cash + i * 10, routes: [], fleet: [], brand: 1 + i })),
  });
}

export function createSetupState(companyName, eraId) {
  const era = findEra(eraId);
  return createBaseState(era, {
    companyName: companyName || DEFAULT_COMPANY_NAME,
    hq: null,
    era: era.id,
    ai: [],
  });
}

function createBaseState(era, overrides = {}) {
  return {
    companyName: DEFAULT_COMPANY_NAME,
    hq: null,
    era: era.id,
    cash: era.cash,
    year: era.startYear,
    quarter: 1,
    endYear: era.endYear,
    oilPrice: era.startOil,
    prevOilPrice: era.startOil,
    brand: 1,
    playerTrait: null,
    traitChosen: false,
    pendingTraitChoices: null,
    routes: [],
    fleet: [],
    loan: 0,
    loanRate: 0.02,
    branches: [],
    tech: { ops: 0, service: 0, eng: 0 },
    ai: [],
    events: [],
    newsItems: [],
    activeModifiers: [],
    modifierIdCounter: 1,
    turnProfit: 0,
    turnRevenue: 0,
    turnCost: 0,
    totalProfit: 0,
    turnsPlayed: 0,
    consecutiveProfit: 0,
    gameOver: false,
    selectedCity: null,
    planeIdCounter: 1,
    history: [],
    mapZoom: 1,
    mapPanX: 0,
    mapPanY: 0,
    onboardStep: 0,
    deliveredThisTurn: [],
    lastReportData: null,
    redPacketClaimed: false,
    _lastTraitFund: 0,
    ...overrides,
  };
}

function findEra(eraId) {
  return ERAS.find((era) => era.id === eraId) || ERAS[0];
}

export function seedInitialFleet(state) {
  const availablePlanes = availablePlaneTemplates(state);
  const starterPlane = availablePlanes.find((p) => p.type === 'narrow') || availablePlanes[0];
  state.fleet.push({ ...starterPlane, uid: state.planeIdCounter++, age: 0, isLease: false, leasePrice: 0, leaseTurns: 0, maxLeaseTurns: 40, delivering: false, deliverIn: 0 });
  state.fleet.push({ ...starterPlane, uid: state.planeIdCounter++, age: 2, isLease: false, leasePrice: 0, leaseTurns: 0, maxLeaseTurns: 40, delivering: false, deliverIn: 0 });
  state.ai.forEach((ai) => {
    for (let i = 0; i < 3; i++) {
      const template = availablePlanes[i < 2 ? 0 : Math.min(availablePlanes.length - 1, Math.floor(availablePlanes.length / 2))] || starterPlane;
      ai.fleet.push({ uid: ai.name + '_' + i, ...template, age: randInt(1, 5), assigned: false });
    }
  });
}
