import { routePlanePerformance } from './airportPerformance.js';
import {
  airportDistanceKm,
  allAirports,
  getAirport,
  isAirportActive,
  operatingDistanceForRoute,
} from './airports.js';
import { airportResilienceLevel } from './airportManagement.js';
import { cityDist, getCity } from './helpers.js';

const ALTERNATE_PLANNING_COST = 0.5;
const NEARBY_ALTERNATE_RADIUS_KM = 250;

export function getRouteAlternateOptions(state, routeOrUid, endpoint) {
  const route = resolveRoute(state, routeOrUid);
  const field = endpointField(endpoint);
  if (!route || !field) return [];
  const primaryAirportId = endpoint === 'from' ? route.fromAirportId : route.toAirportId;
  const primaryAirport = getAirport(primaryAirportId);
  if (!primaryAirport) return [];
  const endpointCityId = endpoint === 'from' ? route.from : route.to;
  const candidates = allAirports().filter((airport) => airport.id !== primaryAirportId
    && airport.source.provider !== 'abstract'
    && ['verified', 'high'].includes(airport.audit?.confidence)
    && isAirportActive(airport, state.year)
    && airport.factual?.maxRunwayM > 0)
    .map((airport) => ({
      airport,
      sameCity: airport.servedCityIds?.includes(endpointCityId),
      distanceFromPrimary: airportDistanceKm(primaryAirportId, airport.id),
    }))
    .filter((item) => item.sameCity || item.distanceFromPrimary <= NEARBY_ALTERNATE_RADIUS_KM)
    .filter((item) => alternateCompatible(state, route, endpoint, item.airport.id))
    .sort((a, b) => Number(b.sameCity) - Number(a.sameCity)
      || a.distanceFromPrimary - b.distanceFromPrimary
      || (b.airport.gameplay?.infrastructureTier || 0) - (a.airport.gameplay?.infrastructureTier || 0));
  return candidates.slice(0, 8);
}

export function setRouteAlternateAirport(state, routeUid, endpoint, airportId) {
  const route = resolveRoute(state, routeUid);
  const field = endpointField(endpoint);
  if (!route || !field) return { ok: false, message: '航线或端点不存在' };
  if (!airportId) {
    route[field] = null;
    return { ok: true, route, endpoint, airportId: null, cost: 0 };
  }
  if (route[field] === airportId) {
    return { ok: true, route, endpoint, airportId, cost: 0, unchanged: true };
  }
  const option = getRouteAlternateOptions(state, route, endpoint).find((item) => item.airport.id === airportId);
  if (!option) return { ok: false, message: '所选机场不是当前可用的备降机场' };
  if (state.cash < ALTERNATE_PLANNING_COST) return { ok: false, message: `资金不足，需要 ${ALTERNATE_PLANNING_COST.toFixed(1)}M` };
  state.cash -= ALTERNATE_PLANNING_COST;
  route[field] = airportId;
  return { ok: true, route, endpoint, airportId, cost: ALTERNATE_PLANNING_COST, option };
}

export function normalizeRouteAlternateState(state) {
  (state?.routes || []).forEach((route) => {
    normalizeRouteAlternateField(state, route, 'from');
    normalizeRouteAlternateField(state, route, 'to');
  });
  return state;
}

export function routeAirportDisruptionProtection(state, route, airportId) {
  const endpoint = route?.fromAirportId === airportId ? 'from' : route?.toAirportId === airportId ? 'to' : null;
  if (!endpoint) return { alternate: false, resilience: 0 };
  const alternateId = route[endpointField(endpoint)];
  return {
    alternate: Boolean(alternateId && getAirport(alternateId) && isAirportActive(alternateId, state?.year)),
    resilience: airportResilienceLevel(state, airportId),
  };
}

export function routeAlternateSummary(route) {
  return {
    from: getAirport(route?.fromAlternateAirportId),
    to: getAirport(route?.toAlternateAirportId),
  };
}

function normalizeRouteAlternateField(state, route, endpoint) {
  const field = endpointField(endpoint);
  const primaryId = endpoint === 'from' ? route.fromAirportId : route.toAirportId;
  const alternateId = route[field];
  if (!alternateId || alternateId === primaryId || !getAirport(alternateId) || !isAirportActive(alternateId, state?.year)) {
    route[field] = null;
    return;
  }
  if (!alternateCompatible(state, route, endpoint, alternateId)) route[field] = null;
}

function alternateCompatible(state, route, endpoint, alternateId) {
  const draft = {
    ...route,
    fromAirportId: endpoint === 'from' ? alternateId : route.fromAirportId,
    toAirportId: endpoint === 'to' ? alternateId : route.toAirportId,
  };
  const distance = operatingDistanceForRoute(draft);
  const fallbackDistance = cityDist(getCity(route.from), getCity(route.to));
  const operatingDistance = Number.isFinite(distance) ? distance : fallbackDistance;
  const planes = (route.assignedPlanes || []).map((uid) => state?.fleet?.find((plane) => plane.uid === uid)).filter(Boolean);
  if (planes.length === 0) return false;
  return planes.every((plane) => plane.range >= operatingDistance && routePlanePerformance(draft, plane, state).compatible);
}

function endpointField(endpoint) {
  if (endpoint === 'from') return 'fromAlternateAirportId';
  if (endpoint === 'to') return 'toAlternateAirportId';
  return null;
}

function resolveRoute(state, routeOrUid) {
  if (routeOrUid && typeof routeOrUid === 'object') return routeOrUid;
  const numericUid = Number(routeOrUid);
  return (state?.routes || []).find((route) => route.uid === numericUid) || null;
}
