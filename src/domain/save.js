import { routeKey, STORAGE_KEYS } from './helpers.js';
import { addCostModifier, addDemandModifier, addSuspensionModifier, normalizeModifierState } from './modifiers.js';

export function saveGameState(state, storage = localStorage) {
  const saveData = JSON.stringify({ v: 5, ts: Date.now(), g: state });
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

export function loadGameState(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEYS.save);
  if (!raw) return { ok: false, message: '没有找到存档' };
  const data = JSON.parse(raw);
  if (!data.g) return { ok: false, message: '存档格式无效' };
  normalizeLoadedState(data.g);
  return { ok: true, state: data.g };
}

export function normalizeLoadedState(state) {
  normalizeModifierState(state);
  migrateLegacyRouteModifiers(state);
  return state;
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
