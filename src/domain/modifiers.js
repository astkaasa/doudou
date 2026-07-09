import { getCity, routeKey } from './helpers.js';
import { DISASTER_BOTH_CITIES, DISASTER_ONE_CITY } from './constants.js';

export const MODIFIER_TYPES = {
  demand: 'demand',
  cost: 'cost',
  suspension: 'suspension',
};

export const MODIFIER_MODES = {
  disasterDemand: 'disasterDemand',
  megaEvent: 'megaEvent',
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
    mode: modifier.mode,
    disaster: modifier.disaster,
    megaEvent: modifier.megaEvent,
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

export function addDisasterDemandModifier(state, source, scope, turnsRemaining = 1) {
  return addModifier(state, {
    source,
    type: MODIFIER_TYPES.demand,
    mode: MODIFIER_MODES.disasterDemand,
    scope,
    multiplier: DISASTER_ONE_CITY,
    disaster: {
      oneCityMultiplier: DISASTER_ONE_CITY,
      bothCitiesMultiplier: DISASTER_BOTH_CITIES,
    },
    turnsRemaining,
  });
}

export function addMegaEventDemandModifier(state, source, megaEvent, turnsRemaining = 1, id = null) {
  return addModifier(state, {
    id,
    source,
    type: MODIFIER_TYPES.demand,
    mode: MODIFIER_MODES.megaEvent,
    scope: { kind: 'all' },
    multiplier: 1,
    megaEvent,
    turnsRemaining,
  });
}

export function removeMegaEventDemandModifiers(state) {
  if (!Array.isArray(state.activeModifiers)) return;
  state.activeModifiers = state.activeModifiers.filter((modifier) => modifier.mode !== MODIFIER_MODES.megaEvent);
}

export function routeDemandMultiplier(state, route) {
  const demandModifiers = (state.activeModifiers || [])
    .filter((modifier) => modifier.type === MODIFIER_TYPES.demand)
    .filter((modifier) => modifier.turnsRemaining > 0);
  const disasterMultiplier = routeDisasterDemandMultiplier(state, route, demandModifiers);
  const otherMultiplier = demandModifiers
    .filter((modifier) => modifier.mode !== MODIFIER_MODES.disasterDemand)
    .reduce((value, modifier) => value * demandModifierMultiplier(route, modifier), 1);
  return disasterMultiplier * otherMultiplier;
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

function demandModifierMultiplier(route, modifier) {
  if (modifier.mode === MODIFIER_MODES.megaEvent) return megaEventRouteMultiplier(route, modifier);
  return routeMatchesScope(route, modifier.scope) ? (modifier.multiplier ?? 1) : 1;
}

function routeDisasterDemandMultiplier(state, route, modifiers) {
  const disasterModifiers = modifiers.filter((modifier) => modifier.mode === MODIFIER_MODES.disasterDemand);
  if (disasterModifiers.length === 0) return 1;
  const cities = routeCities(route);
  if (cities.length !== 2) return 1;
  const endpointAffected = cities.map((city) => (
    isDisasterImmuneMegaEventHost(state, city)
      ? []
      : disasterModifiers.filter((modifier) => cityMatchesScope(city, modifier.scope))
  ));
  const affectedCount = endpointAffected.filter((matches) => matches.length > 0).length;
  if (affectedCount === 0) return 1;
  if (affectedCount === 2) {
    return Math.min(...endpointAffected.flat().map((modifier) => modifier.disaster?.bothCitiesMultiplier ?? DISASTER_BOTH_CITIES));
  }
  return Math.min(
    ...endpointAffected
      .flat()
      .map((modifier) => modifier.disaster?.oneCityMultiplier ?? modifier.multiplier ?? DISASTER_ONE_CITY),
  );
}

function cityMatchesScope(city, scope = { kind: 'all' }) {
  switch (scope.kind) {
    case 'all':
      return true;
    case 'region':
      return (scope.regions || []).includes(city.region);
    case 'subRegion':
      return (scope.subRegions || []).includes(city.subRegion);
    case 'cityIds':
      return (scope.cityIds || []).includes(city.id);
    default:
      return false;
  }
}

function megaEventRouteMultiplier(route, modifier) {
  const event = modifier.megaEvent;
  if (!event || !Number.isFinite(event.boost) || event.boost <= 0) return 1;
  const cities = routeCities(route);
  if (cities.length !== 2) return 1;
  if (cities.some((city) => city.id === event.hostCityId)) return 1 + event.boost;
  if (cities.some((city) => city.region === event.hostRegion)) return 1 + event.boost * (event.spillover ?? 0);
  if (cities.some((city) => city.level >= 2)) return 1 + event.boost * (event.remoteSpillover ?? 0);
  return 1;
}

function isDisasterImmuneMegaEventHost(state, city) {
  return (state.activeMegaEvents || []).some((event) => event.cityId === city.id && event.currentBoost > 0 && event.quartersFromEvent <= 0);
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
