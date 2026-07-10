import {
  airportServesCity,
  getAirport,
  getDefaultAirportId,
  getDefaultAirportIdForYear,
  getPlayableAirportsForCity,
} from './airports.js';

export const AIRPORT_UPGRADE_SLOTS = 3;

export const AIRPORT_UPGRADES = Object.freeze({
  runway: Object.freeze({
    id: 'runway',
    name: '跑道扩建',
    description: '有效跑道长度 +12%，缓解短跑道减载',
    costRatio: 0.25,
  }),
  terminal: Object.freeze({
    id: 'terminal',
    name: '航站楼扩建',
    description: '季度容量 +8 点',
    costRatio: 0.18,
  }),
  maintenance: Object.freeze({
    id: 'maintenance',
    name: '维修机库',
    description: '相关航线机场运营成本 -3%',
    costRatio: 0.12,
  }),
  cargo: Object.freeze({
    id: 'cargo',
    name: '货运中心',
    description: '相关航线货运收入 +25%',
    costRatio: 0.14,
  }),
  ground_access: Object.freeze({
    id: 'ground_access',
    name: '地面交通',
    description: '相关航线可获得需求 +4%',
    costRatio: 0.12,
  }),
  resilience: Object.freeze({
    id: 'resilience',
    name: '灾害韧性',
    description: '机场灾害与备降损失降低',
    costRatio: 0.15,
  }),
});

const UPGRADE_IDS = Object.freeze(Object.keys(AIRPORT_UPGRADES));

export function createAirportManagementState() {
  return {
    airportRelations: {},
    airportContracts: [],
    airportContractIdCounter: 1,
    airportContractOfferPeriod: null,
    _lastAirportContractIncome: 0,
    _lastAirportContractPenalty: 0,
  };
}

export function normalizeAirportManagementState(state) {
  if (!state || typeof state !== 'object') return state;
  const relations = {};
  if (state.airportRelations && typeof state.airportRelations === 'object' && !Array.isArray(state.airportRelations)) {
    Object.entries(state.airportRelations).forEach(([airportId, value]) => {
      if (!getAirport(airportId)) return;
      const relation = clamp(Math.round(Number(value) || 0), -100, 100);
      if (relation !== 0) relations[airportId] = relation;
    });
  }
  state.airportRelations = relations;
  if (!Array.isArray(state.airportContracts)) state.airportContracts = [];
  const counter = Number(state.airportContractIdCounter);
  state.airportContractIdCounter = Number.isInteger(counter) && counter > 0 ? counter : 1;
  state.airportContractOfferPeriod = typeof state.airportContractOfferPeriod === 'string'
    ? state.airportContractOfferPeriod
    : null;
  state._lastAirportContractIncome = finiteMoney(state._lastAirportContractIncome);
  state._lastAirportContractPenalty = finiteMoney(state._lastAirportContractPenalty);
  return state;
}

export function normalizeAirportInvestmentFields(entry, cityId, year = null) {
  if (!entry || entry.type !== 'airport') return entry;
  const hadSpecificAirport = Boolean(entry.airportId && airportServesCity(entry.airportId, cityId));
  entry.airportId = hadSpecificAirport ? entry.airportId : getDefaultAirportIdForYear(cityId, year);
  entry.migratedFromCity = hadSpecificAirport
    ? (typeof entry.migratedFromCity === 'string' ? entry.migratedFromCity : null)
    : cityId;
  entry.landingDiscount = clamp(Math.max(0.15, Number(entry.landingDiscount) || 0), 0.15, 0.35);
  const upgrades = {};
  UPGRADE_IDS.forEach((upgradeId) => {
    if (Number(entry.upgrades?.[upgradeId]) > 0) upgrades[upgradeId] = 1;
  });
  entry.upgrades = upgrades;
  entry.upgradeSlots = AIRPORT_UPGRADE_SLOTS;
  return entry;
}

export function getAirportInvestment(state, airportId) {
  if (!airportId) return null;
  for (const [cityId, entries] of Object.entries(state?.subsidiaries || {})) {
    const investment = (entries || []).find((entry) => entry.type === 'airport' && entry.airportId === airportId);
    if (investment) return { cityId, entry: investment };
  }
  return null;
}

export function getAirportInvestmentTargets(state, cityId) {
  const defaultId = getDefaultAirportIdForYear(cityId, state?.year);
  return getPlayableAirportsForCity(cityId, { year: state?.year })
    .filter((airport) => !getAirportInvestment(state, airport.id))
    .sort((a, b) => Number(b.id === defaultId) - Number(a.id === defaultId)
      || (b.gameplay?.capacityTier || 0) - (a.gameplay?.capacityTier || 0));
}

export function getAirportUpgradeLevel(state, airportId, upgradeId) {
  return Number(getAirportInvestment(state, airportId)?.entry?.upgrades?.[upgradeId]) > 0 ? 1 : 0;
}

export function getAirportUpgradeCount(state, airportId) {
  return UPGRADE_IDS.reduce((sum, upgradeId) => sum + getAirportUpgradeLevel(state, airportId, upgradeId), 0);
}

export function getAvailableAirportUpgrades(state, airportId) {
  const investment = getAirportInvestment(state, airportId);
  if (!investment || getAirportUpgradeCount(state, airportId) >= AIRPORT_UPGRADE_SLOTS) return [];
  return UPGRADE_IDS.filter((upgradeId) => !getAirportUpgradeLevel(state, airportId, upgradeId));
}

export function airportUpgradeCost(state, airportId, upgradeId) {
  const investment = getAirportInvestment(state, airportId);
  const config = AIRPORT_UPGRADES[upgradeId];
  if (!investment || !config) return Infinity;
  return roundMoney(Math.max(5, investment.entry.openCost * config.costRatio));
}

export function upgradeAirportInvestment(state, airportId, upgradeId) {
  const investment = getAirportInvestment(state, airportId);
  const config = AIRPORT_UPGRADES[upgradeId];
  if (!investment || !config) return { ok: false, message: '机场投资或升级分支不存在' };
  if (getAirportUpgradeLevel(state, airportId, upgradeId) > 0) return { ok: false, message: '该升级已经完成' };
  if (getAirportUpgradeCount(state, airportId) >= AIRPORT_UPGRADE_SLOTS) return { ok: false, message: '机场升级槽位已用完' };
  const cost = airportUpgradeCost(state, airportId, upgradeId);
  if (state.cash < cost) return { ok: false, message: '资金不足' };
  state.cash -= cost;
  investment.entry.upgrades[upgradeId] = 1;
  investment.entry.currentValue = roundMoney(investment.entry.currentValue + cost * 0.8);
  addAirportRelation(state, airportId, 5);
  return { ok: true, airportId, upgradeId, cost, investment: investment.entry };
}

export function getAirportLandingDiscount(state, airportId, cityId = null) {
  const direct = getAirportInvestment(state, airportId)?.entry;
  if (direct) return clamp(Number(direct.landingDiscount) || 0.15, 0, 0.35);
  if (!airportId && cityId) {
    return (state?.subsidiaries?.[cityId] || [])
      .filter((entry) => entry.type === 'airport')
      .reduce((maximum, entry) => Math.max(maximum, Number(entry.landingDiscount) || 0.15), 0);
  }
  const legacy = (state?.subsidiaries?.[cityId] || []).find((entry) => entry.type === 'airport' && !entry.airportId);
  return legacy ? clamp(Number(legacy.landingDiscount) || 0.15, 0, 0.35) : 0;
}

export function airportRelation(state, airportId) {
  return clamp(Number(state?.airportRelations?.[airportId]) || 0, -100, 100);
}

export function addAirportRelation(state, airportId, delta) {
  if (!getAirport(airportId)) return 0;
  if (!state.airportRelations || typeof state.airportRelations !== 'object') state.airportRelations = {};
  const next = clamp(airportRelation(state, airportId) + Number(delta || 0), -100, 100);
  if (next === 0) delete state.airportRelations[airportId];
  else state.airportRelations[airportId] = next;
  return next;
}

export function airportRelationshipFeeDiscount(state, airportId) {
  return clamp(Math.max(0, airportRelation(state, airportId)) / 2000, 0, 0.05);
}

export function airportRunwayMultiplier(state, airportId) {
  return getAirportUpgradeLevel(state, airportId, 'runway') ? 1.12 : 1;
}

export function airportCapacityUpgradeBonus(state, airportId) {
  return getAirportUpgradeLevel(state, airportId, 'terminal') ? 8 : 0;
}

export function airportMaintenanceCostMultiplier(state, airportId) {
  return getAirportUpgradeLevel(state, airportId, 'maintenance') ? 0.97 : 1;
}

export function airportCargoRevenueMultiplier(state, airportId) {
  return getAirportUpgradeLevel(state, airportId, 'cargo') ? 1.25 : 1;
}

export function airportGroundAccessDemandMultiplier(state, airportId) {
  return getAirportUpgradeLevel(state, airportId, 'ground_access') ? 1.04 : 1;
}

export function airportResilienceLevel(state, airportId) {
  return getAirportUpgradeLevel(state, airportId, 'resilience');
}

export function airportInvestmentServesCity(state, airportId, cityId) {
  return Boolean(getAirportInvestment(state, airportId) && airportServesCity(airportId, cityId));
}

function finiteMoney(value) {
  return Number.isFinite(Number(value)) ? roundMoney(Number(value)) : 0;
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
