import { getCity, routeKey, STORAGE_KEYS } from './helpers.js';
import { addCostModifier, addDemandModifier, addSuspensionModifier, normalizeModifierState } from './modifiers.js';

export function saveGameState(state, storage = localStorage) {
  const saveData = JSON.stringify({ v: 6, ts: Date.now(), g: serializeGameState(state) });
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
  return state;
}

function normalizeUpstreamStateFields(state) {
  if (state.loan === undefined) state.loan = 0;
  if (state.loanRate === undefined) state.loanRate = 0.02;
  state.branches = normalizeBranchIds(state);
  if (!Array.isArray(state.deliveredThisTurn)) state.deliveredThisTurn = [];
  if (state.redPacketClaimed === undefined) state.redPacketClaimed = false;
  if (state.consecutiveProfit === undefined) state.consecutiveProfit = 0;
  if (state.lastReportData === undefined) state.lastReportData = state._lastReportData || null;
  delete state.lastNewspaperHtml;
  delete state._lastReportData;
  (state.routes || []).forEach((route) => {
    if (!Array.isArray(route.assignedPlanes)) route.assignedPlanes = [];
  });
  (state.fleet || []).forEach((plane) => {
    if (plane.leaseTurns === undefined) plane.leaseTurns = 0;
    if (plane.maxLeaseTurns === undefined) plane.maxLeaseTurns = 40;
    if (plane.delivering === undefined) plane.delivering = false;
    if (plane.deliverIn === undefined) plane.deliverIn = 0;
  });
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
