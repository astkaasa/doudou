import { AI_PROFILES } from '../data/aiProfiles.js';
import { ERAS } from '../data/eras.js';
import { PLANES } from '../data/planes.js';
import { randInt } from './helpers.js';

export function initState(hq, era) {
  const e = ERAS.find((er) => er.id === era) || ERAS[2];
  return {
    companyName: '云际航空',
    hq,
    era,
    cash: e.cash,
    year: e.startYear,
    quarter: 1,
    endYear: e.endYear,
    oilPrice: e.startOil,
    prevOilPrice: e.startOil,
    brand: 1,
    routes: [],
    fleet: [],
    tech: { ops: 0, service: 0, eng: 0 },
    ai: AI_PROFILES.map((p, i) => ({ ...p, cash: e.cash + i * 10, routes: [], fleet: [], brand: 1 + i })),
    events: [],
    newsItems: [],
    activeModifiers: [],
    modifierIdCounter: 1,
    turnProfit: 0,
    turnRevenue: 0,
    turnCost: 0,
    totalProfit: 0,
    turnsPlayed: 0,
    gameOver: false,
    selectedCity: null,
    planeIdCounter: 1,
    history: [],
    mapZoom: 1,
    mapPanX: 0,
    mapPanY: 0,
  };
}

export function createSetupState(companyName, eraId) {
  const era = ERAS.find((e) => e.id === eraId) || ERAS[0];
  return {
    companyName: companyName || '云际航空',
    hq: null,
    era: eraId,
    cash: era.cash,
    year: era.startYear,
    quarter: 1,
    endYear: era.endYear,
    oilPrice: era.startOil,
    prevOilPrice: era.startOil,
    brand: 1,
    routes: [],
    fleet: [],
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
    gameOver: false,
    selectedCity: null,
    planeIdCounter: 1,
    history: [],
    mapZoom: 1,
    mapPanX: 0,
    mapPanY: 0,
  };
}

export function seedInitialFleet(state) {
  state.fleet.push({ ...PLANES[0], uid: state.planeIdCounter++, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
  state.fleet.push({ ...PLANES[0], uid: state.planeIdCounter++, age: 2, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
  state.ai.forEach((ai) => {
    for (let i = 0; i < 3; i++) {
      const template = i < 2 ? PLANES[0] : PLANES[2];
      ai.fleet.push({ uid: ai.name + '_' + i, ...template, age: randInt(1, 5), assigned: false });
    }
  });
}
