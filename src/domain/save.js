import { getCity, routeKey, STORAGE_KEYS } from './helpers.js';
import { normalizeCityStates } from '../data/cityEraData.js';
import { suggestedPrice } from './economy.js';
import { syncMegaEventState } from './megaEvents.js';
import { normalizeMilestoneState } from './milestones.js';
import { addCostModifier, addDemandModifier, addSuspensionModifier, normalizeModifierState } from './modifiers.js';
import { normalizeStockState } from './stocks.js';
import { PLAYER_TRAIT_SYMBOLS, normalizePlayerTrait } from '../data/playerTraits.js';

export function saveGameState(state, storage = localStorage) {
  const saveData = JSON.stringify({ v: 9, ts: Date.now(), g: serializeGameState(state) });
  storage.setItem(STORAGE_KEYS.save, saveData);
  const info = {
    ts: Date.now(),
    company: state.companyName,
    year: state.year,
    quarter: state.quarter,
    cash: state.cash,
    routes: state.routes.length,
    fleet: state.fleet.length,
  };
  storage.setItem(STORAGE_KEYS.slots, JSON.stringify([info]));
}

function serializeGameState(state) {
  const cleanState = { ...state };
  delete cleanState._lastReportData;
  return cleanState;
}

export function loadGameState(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEYS.save);
  if (!raw) return { ok: false, message: '没有找到存档' };
  const data = JSON.parse(raw);
  if (!data.g) return { ok: false, message: '存档格式无效' };
  normalizeLoadedState(data.g);
  return { ok: true, state: data.g };
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
  if (!Array.isArray(state.routes)) state.routes = [];
  if (!Array.isArray(state.fleet)) state.fleet = [];
  if (!Array.isArray(state.ai)) state.ai = [];
  state.branches = normalizeBranchIds(state);
  state.branchesConstructing = normalizeConstructingBranches(state);
  state.cityStates = normalizeCityStates(state);
  normalizeMilestoneState(state);
  normalizeStockState(state);
  if (!Array.isArray(state.activeMegaEvents)) state.activeMegaEvents = [];
  if (!Array.isArray(state.deliveredThisTurn)) state.deliveredThisTurn = [];
  if (state.redPacketClaimed === undefined) state.redPacketClaimed = false;
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
