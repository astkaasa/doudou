import { getCity, routeKey } from './helpers.js';

export const MODIFIER_TYPES = {
  demand: 'demand',
  cost: 'cost',
  suspension: 'suspension',
};

export function addModifier(state, modifier) {
  normalizeModifierState(state);
  const turnsRemaining = modifier.turnsRemaining ?? 1;
  if (turnsRemaining <= 0) return null;
  const created = {
    id: modifier.id || nextModifierId(state),
    source: modifier.source || 'unknown',
    type: modifier.type,
    multiplier: modifier.multiplier,
    turnsRemaining,
    scope: modifier.scope || { kind: 'all' },
  };
  state.activeModifiers.push(created);
  return created;
}

export function addDemandModifier(state, source, scope, multiplier, turnsRemaining = 1) {
  return addModifier(state, { source, type: MODIFIER_TYPES.demand, scope, multiplier, turnsRemaining });
}

export function addCostModifier(state, source, scope, multiplier, turnsRemaining = 1) {
  return addModifier(state, { source, type: MODIFIER_TYPES.cost, scope, multiplier, turnsRemaining });
}

export function addSuspensionModifier(state, source, scope, turnsRemaining = 1) {
  return addModifier(state, { source, type: MODIFIER_TYPES.suspension, scope, turnsRemaining });
}

export function routeDemandMultiplier(state, route) {
  return matchingModifiers(state, route, MODIFIER_TYPES.demand)
    .reduce((value, modifier) => value * (modifier.multiplier ?? 1), 1);
}

export function routeCostMultiplier(state, route) {
  return matchingModifiers(state, route, MODIFIER_TYPES.cost)
    .reduce((value, modifier) => value * (modifier.multiplier ?? 1), 1);
}

export function isRouteSuspended(state, route) {
  return matchingModifiers(state, route, MODIFIER_TYPES.suspension).length > 0;
}

export function routeServiceMultiplier(state, route) {
  if (route?.suspended || isRouteSuspended(state, route)) return 0;
  const multiplier = Number(route?.serviceMultiplier ?? route?.frequency ?? 1);
  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
}

export function advanceActiveModifiers(state) {
  if (!state.activeModifiers) return;
  state.activeModifiers = state.activeModifiers
    .map((modifier) => ({ ...modifier, turnsRemaining: modifier.turnsRemaining - 1 }))
    .filter((modifier) => modifier.turnsRemaining > 0);
}

export function matchingModifiers(state, route, type) {
  return (state.activeModifiers || [])
    .filter((modifier) => modifier.type === type)
    .filter((modifier) => modifier.turnsRemaining > 0)
    .filter((modifier) => routeMatchesScope(route, modifier.scope));
}

export function routeMatchesScope(route, scope = { kind: 'all' }) {
  switch (scope.kind) {
    case 'all':
      return true;
    case 'region':
      return routeCities(route).some((city) => (scope.regions || []).includes(city.region));
    case 'subRegion':
      return routeCities(route).some((city) => (scope.subRegions || []).includes(city.subRegion));
    case 'cityIds':
      return (scope.cityIds || []).includes(route.from) || (scope.cityIds || []).includes(route.to);
    case 'connectsCitySets':
      return connectsCitySets(route, scope.setA || [], scope.setB || []);
    case 'crossRegion':
      return isCrossRegion(route);
    case 'routeKeys':
      return (scope.routeKeys || []).includes(routeKey(route.from, route.to));
    default:
      return false;
  }
}

export function selectRouteKeys(routes, predicate) {
  return (routes || []).filter(predicate).map((route) => routeKey(route.from, route.to));
}

export function normalizeModifierState(state) {
  if (!Array.isArray(state.activeModifiers)) state.activeModifiers = [];
  const ids = state.activeModifiers
    .map((modifier) => String(modifier.id || '').match(/^modifier-(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
  const nextFromIds = ids.length > 0 ? Math.max(...ids) + 1 : state.activeModifiers.length + 1;
  if (!Number.isInteger(state.modifierIdCounter) || state.modifierIdCounter < nextFromIds) {
    state.modifierIdCounter = nextFromIds;
  }
}

function routeCities(route) {
  return [getCity(route.from), getCity(route.to)].filter(Boolean);
}

function nextModifierId(state) {
  const id = `modifier-${state.modifierIdCounter}`;
  state.modifierIdCounter += 1;
  return id;
}

function connectsCitySets(route, setA, setB) {
  return (setA.includes(route.from) && setB.includes(route.to)) || (setA.includes(route.to) && setB.includes(route.from));
}

function isCrossRegion(route) {
  const cities = routeCities(route);
  return cities.length === 2 && cities[0].region !== cities[1].region;
}
