import { getCity, routeKey, STORAGE_KEYS } from './helpers.js';
import { normalizeCityStates } from '../data/cityEraData.js';
import { suggestedPrice } from './economy.js';
import { normalizeEraSettlementState } from './eraSettlement.js';
import { syncMegaEventState } from './megaEvents.js';
import { normalizeMainQuestState } from './mainQuest.js';
import { normalizeMilestoneState } from './milestones.js';
import { addCostModifier, addDemandModifier, addSuspensionModifier, normalizeModifierState } from './modifiers.js';
import { normalizeOperationsState } from './operations.js';
import { normalizeStockState } from './stocks.js';
import { normalizeSubsidiaryState } from './subsidiaries.js';
import { PLAYER_TRAIT_SYMBOLS, normalizePlayerTrait } from '../data/playerTraits.js';
import { legacyRandomSeed, normalizeRandomState } from './random.js';

export const SAVE_VERSION = 14;

export const PERSISTED_GAME_STATE_FIELDS = Object.freeze([
  'companyName',
  'hq',
  'era',
  'cash',
  'year',
  'quarter',
  'endYear',
  'oilPrice',
  'prevOilPrice',
  'brand',
  'playerTrait',
  'traitChosen',
  'pendingTraitChoices',
  'routes',
  'fleet',
  'loan',
  'loanRate',
  'branches',
  'branchesConstructing',
  'tech',
  'ai',
  'events',
  'newsItems',
  'cityStates',
  'stocks',
  'portfolio',
  'stockEvents',
  'subsidiaries',
  '_subReturnThisTurn',
  '_subMaintThisTurn',
  '_subValueChangeThisTurn',
  '_acquirePriceSeed',
  'ftpShown',
  'activeModifiers',
  'activeMegaEvents',
  'staffCount',
  'staffNeeded',
  'staffMorale',
  'serviceTier',
  'maintTier',
  'adTier',
  'opsEfficiency',
  'accidentPenalty',
  'accidentPenaltyTurns',
  '_pendingRecruit',
  '_pendingBonus',
  '_retiredThisTurn',
  '_recruitCostThisTurn',
  '_bonusCostThisTurn',
  '_opsCostThisTurn',
  '_faultLossThisTurn',
  '_faultsThisTurn',
  'modifierIdCounter',
  'turnProfit',
  'turnRevenue',
  'turnCost',
  'totalProfit',
  'turnsPlayed',
  'consecutiveProfit',
  'milestones',
  'mainQuest',
  'eraSettlement',
  'bankruptRescued',
  'gameOver',
  'planeIdCounter',
  'history',
  'mapZoom',
  'mapPanX',
  'mapPanY',
  'rng',
  'onboardStep',
  '_onboardReportShown',
  '_mainQuestOnboardShown',
  '_opsPanelOpened',
  '_stockPanelOpened',
  '_subPanelOpened',
  'deliveredThisTurn',
  'lastReportData',
  '_lastTraitFund',
  '_lastStockDividend',
]);

const SAVE_MIGRATIONS = Object.freeze({
  0: preserveLegacyState,
  1: preserveLegacyState,
  2: preserveLegacyState,
  3: preserveLegacyState,
  4: preserveLegacyState,
  5: preserveLegacyState,
  6: preserveLegacyState,
  7: preserveLegacyState,
  8: preserveLegacyState,
  9: preserveLegacyState,
  10: preserveLegacyState,
  11: migrateV11ToV12,
  12: migrateV12ToV13,
  13: migrateV13ToV14,
});

export function saveGameState(state, storage = localStorage) {
  const timestamp = Date.now();
  const previousSave = storage.getItem(STORAGE_KEYS.save);
  if (previousSave) safeStorageSet(storage, STORAGE_KEYS.backup, previousSave);
  const saveData = JSON.stringify({ v: SAVE_VERSION, ts: timestamp, g: serializeGameState(state) });
  storage.setItem(STORAGE_KEYS.save, saveData);
  const info = {
    ts: timestamp,
    company: state.companyName,
    year: state.year,
    quarter: state.quarter,
    cash: state.cash,
    routes: state.routes.length,
    fleet: state.fleet.length,
  };
  storage.setItem(STORAGE_KEYS.slots, JSON.stringify([info]));
}

export function serializeGameState(state) {
  const cleanState = {};
  PERSISTED_GAME_STATE_FIELDS.forEach((field) => {
    if (state[field] !== undefined) cleanState[field] = state[field];
  });
  return cleanState;
}

export function loadGameState(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEYS.save);
  if (!raw) return { ok: false, message: '没有找到存档' };
  const result = decodeSave(raw);
  if (result.ok || result.code === 'newer_version') return result;

  const backupRaw = storage.getItem(STORAGE_KEYS.backup);
  if (!backupRaw) return result;
  const backup = decodeSave(backupRaw);
  if (!backup.ok) return result;
  return {
    ...backup,
    recoveredFromBackup: true,
    message: '主存档损坏，已从上一份备份恢复',
  };
}

export function getSaveSummaries(storage = localStorage) {
  const primary = decodeSave(storage.getItem(STORAGE_KEYS.save));
  if (primary.ok) return [saveSummary(primary)];
  const backup = decodeSave(storage.getItem(STORAGE_KEYS.backup));
  return backup.ok ? [{ ...saveSummary(backup), recoveredFromBackup: true }] : [];
}

function decodeSave(raw) {
  if (!raw) return { ok: false, code: 'missing', message: '没有找到存档' };
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, code: 'invalid_json', message: '存档内容已损坏' };
  }
  if (!isPlainObject(data) || !isPlainObject(data.g)) {
    return { ok: false, code: 'invalid_format', message: '存档格式无效' };
  }
  const version = data.v === undefined ? 0 : Number(data.v);
  if (!Number.isInteger(version) || version < 0) {
    return { ok: false, code: 'invalid_version', message: '存档版本无效' };
  }
  if (version > SAVE_VERSION) {
    return { ok: false, code: 'newer_version', message: `存档来自较新版本（v${version}），请升级游戏后再读取` };
  }
  try {
    const state = migrateSaveState(data.g, version);
    return {
      ok: true,
      state,
      timestamp: Number.isFinite(Number(data.ts)) ? Number(data.ts) : null,
      version: SAVE_VERSION,
      migratedFrom: version,
    };
  } catch {
    return { ok: false, code: 'migration_failed', message: '存档迁移失败，内容可能已损坏' };
  }
}

function migrateSaveState(initialState, fromVersion) {
  let state = initialState;
  for (let version = fromVersion; version < SAVE_VERSION; version++) {
    const migrate = SAVE_MIGRATIONS[version];
    if (!migrate) throw new Error(`Missing save migration for v${version}`);
    state = migrate(state);
  }
  normalizeLoadedState(state);
  return serializeGameState(state);
}

function preserveLegacyState(state) {
  // Versions 0-10 predate gated migrations; their idempotent repairs remain in normalizeLoadedState.
  return state;
}

function migrateV11ToV12(state) {
  if (state.lastReportData === undefined && state._lastReportData !== undefined) {
    state.lastReportData = state._lastReportData;
  }
  delete state._lastReportData;
  delete state.lastNewspaperHtml;
  delete state.selectedCity;
  return state;
}

function migrateV12ToV13(state) {
  state.rng = normalizeRandomState(state.rng, legacyRandomSeed(state));
  return state;
}

function migrateV13ToV14(state) {
  normalizeEraSettlementState(state);
  return state;
}

function saveSummary(result) {
  const state = result.state;
  return {
    ts: result.timestamp,
    company: state.companyName,
    year: state.year,
    quarter: state.quarter,
    cash: state.cash,
    routes: state.routes?.length || 0,
    fleet: state.fleet?.length || 0,
  };
}

function safeStorageSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    // A backup must not prevent the current save from being written.
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeLoadedState(state) {
  normalizeUpstreamStateFields(state);
  normalizeModifierState(state);
  migrateLegacyRouteModifiers(state);
  syncMegaEventState(state);
  return state;
}

function normalizeUpstreamStateFields(state) {
  if (state.loan === undefined) state.loan = 0;
  if (state.loanRate === undefined) state.loanRate = 0.02;
  state.rng = normalizeRandomState(state.rng, legacyRandomSeed(state));
  if (!Array.isArray(state.routes)) state.routes = [];
  if (!Array.isArray(state.fleet)) state.fleet = [];
  if (!Array.isArray(state.ai)) state.ai = [];
  state.branches = normalizeBranchIds(state);
  state.branchesConstructing = normalizeConstructingBranches(state);
  state.cityStates = normalizeCityStates(state);
  normalizeMilestoneState(state);
  normalizeMainQuestState(state);
  normalizeEraSettlementState(state);
  normalizeStockState(state);
  normalizeOperationsState(state);
  normalizeSubsidiaryState(state);
  if (!state.ftpShown || typeof state.ftpShown !== 'object' || Array.isArray(state.ftpShown)) state.ftpShown = {};
  if (state.onboardStep === undefined) state.onboardStep = 0;
  if (state._onboardReportShown === undefined) state._onboardReportShown = (state.turnsPlayed || 0) > 0;
  if (state._mainQuestOnboardShown === undefined) state._mainQuestOnboardShown = false;
  if (!Array.isArray(state.activeMegaEvents)) state.activeMegaEvents = [];
  if (!Array.isArray(state.deliveredThisTurn)) state.deliveredThisTurn = [];
  delete state.redPacketClaimed;
  if (state.bankruptRescued === undefined) state.bankruptRescued = false;
  state.playerTrait = normalizePlayerTrait(state.playerTrait);
  if (!state.playerTrait) state.traitChosen = false;
  else if (state.traitChosen === undefined) state.traitChosen = true;
  if (state.playerTrait) {
    state.pendingTraitChoices = null;
  } else {
    state.pendingTraitChoices = normalizePendingTraitChoices(state.pendingTraitChoices);
  }
  if (state._lastTraitFund === undefined) state._lastTraitFund = 0;
  if (state.consecutiveProfit === undefined) state.consecutiveProfit = 0;
  if (state.turnsPlayed === undefined) state.turnsPlayed = 0;
  if (state.lastReportData === undefined) state.lastReportData = state._lastReportData || null;
  delete state.lastNewspaperHtml;
  delete state._lastReportData;
  state.routes = state.routes.filter((route) => getCity(route.from) && getCity(route.to) && route.from !== route.to);
  state.routes.forEach((route) => {
    if (!Array.isArray(route.assignedPlanes)) route.assignedPlanes = [];
    if (route.suspended === undefined) route.suspended = false;
    if (route.isNew === undefined) route.isNew = false;
    if (!isPositiveNumber(route.serviceMultiplier)) {
      route.serviceMultiplier = isPositiveNumber(route.frequency) ? route.frequency : 1;
    }
    delete route.frequency;
    if (!isPositiveNumber(route.suggestedPrice)) route.suggestedPrice = suggestedPrice(route.from, route.to);
    if (!isPositiveNumber(route.price)) route.price = route.suggestedPrice;
    if (!isFiniteNumber(route.loadFactor)) route.loadFactor = 0;
    if (!isFiniteNumber(route.revenue)) route.revenue = 0;
    if (!isFiniteNumber(route.cost)) route.cost = 0;
    if (!isFiniteNumber(route.profit)) route.profit = 0;
  });
  state.fleet.forEach((plane) => {
    if (plane.leaseTurns === undefined) plane.leaseTurns = 0;
    if (plane.maxLeaseTurns === undefined) plane.maxLeaseTurns = 40;
    if (plane.delivering === undefined) plane.delivering = false;
    if (plane.deliverIn === undefined) plane.deliverIn = 0;
  });
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveNumber(value) {
  return isFiniteNumber(value) && value > 0;
}

function normalizePendingTraitChoices(value) {
  if (!Array.isArray(value)) return null;
  const normalized = value.map(normalizePlayerTrait).filter(Boolean);
  const unique = [...new Set(normalized)];
  if (unique.length !== PLAYER_TRAIT_SYMBOLS.length) return null;
  return unique.every((trait) => PLAYER_TRAIT_SYMBOLS.includes(trait)) ? unique : null;
}

function normalizeBranchIds(state) {
  if (!Array.isArray(state.branches)) return [];
  const seen = new Set();
  return state.branches.filter((cityId) => {
    if (!getCity(cityId) || cityId === state.hq || seen.has(cityId)) return false;
    seen.add(cityId);
    return true;
  });
}

function normalizeConstructingBranches(state) {
  if (!Array.isArray(state.branchesConstructing)) return [];
  const seen = new Set(state.branches || []);
  if (state.hq) seen.add(state.hq);
  const normalized = [];
  state.branchesConstructing.forEach((branch) => {
    const cityId = typeof branch === 'string' ? branch : branch?.cityId;
    if (!getCity(cityId) || seen.has(cityId)) return;
    const constructIn = Math.max(1, Math.floor(Number(branch?.constructIn) || 1));
    seen.add(cityId);
    normalized.push({ cityId, constructIn });
  });
  return normalized;
}

function migrateLegacyRouteModifiers(state) {
  (state.routes || []).forEach((route) => {
    const scope = { kind: 'routeKeys', routeKeys: [routeKey(route.from, route.to)] };
    if (route.suspendedTurns > 0) {
      addSuspensionModifier(state, 'legacy route suspension', scope, route.suspendedTurns);
    }
    if (route.demandMultiplier && route.demandMultiplier !== 1) {
      addDemandModifier(state, 'legacy route demand modifier', scope, route.demandMultiplier, route.demandModifierTurns || 1);
    }
    if (route.costMultiplier && route.costMultiplier !== 1) {
      addCostModifier(state, 'legacy route cost modifier', scope, route.costMultiplier, route.costModifierTurns || 1);
    }
    delete route.suspendedTurns;
    delete route.demandMultiplier;
    delete route.demandModifierTurns;
    delete route.costMultiplier;
    delete route.costModifierTurns;
  });
}
