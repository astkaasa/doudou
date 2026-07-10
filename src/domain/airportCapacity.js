import { airportCapacityUpgradeBonus } from './airportManagement.js';
import { getAirport, operatingDistanceForRoute } from './airports.js';
import { cityDist, getCity } from './helpers.js';
import { routeServiceMultiplier } from './modifiers.js';

export const AIRPORT_CAPACITY_BY_TIER = Object.freeze({
  1: 12,
  2: 20,
  3: 32,
  4: 48,
  5: 72,
});

const AI_CAPACITY_WEIGHT = 0.5;

export function airportCapacityPoints(state, airportId) {
  const airport = getAirport(airportId);
  if (!airport) return 0;
  const tier = clamp(Math.round(Number(airport.gameplay?.capacityTier) || 3), 1, 5);
  return AIRPORT_CAPACITY_BY_TIER[tier] + airportCapacityUpgradeBonus(state, airportId);
}

export function routeCapacityUnits(state, route, airportId, options = {}) {
  if (!route || !airportId || (route.fromAirportId !== airportId && route.toAirportId !== airportId)) return 0;
  if (route.suspended || routeServiceMultiplier(state, route) <= 0) return 0;
  const distance = operatingDistanceForRoute(route);
  const marketDistance = cityDist(getCity(route.from), getCity(route.to));
  const frequency = capacityFrequencyFactor(Number.isFinite(distance) ? distance : marketDistance);
  const fleet = options.fleet || state?.fleet || [];
  const assignedIds = options.ai
    ? [route.assignedPlane].filter(Boolean)
    : (route.assignedPlanes || []);
  const planes = assignedIds.map((uid) => fleet.find((plane) => plane.uid === uid)).filter(Boolean);
  const planeScale = planes.length > 0
    ? planes.reduce((sum, plane) => sum + capacityPlaneScale(plane), 0)
    : 1;
  return roundCapacity(frequency * planeScale * Math.max(0.5, Number(route.serviceMultiplier) || 1));
}

export function airportCapacityUsage(state, airportId, options = {}) {
  const excludeRouteUid = options.excludeRouteUid;
  const playerUsed = (state?.routes || [])
    .filter((route) => route.uid !== excludeRouteUid)
    .reduce((sum, route) => sum + routeCapacityUnits(state, route, airportId), 0);
  const aiUsedRaw = options.includeAI === false ? 0 : (state?.ai || []).reduce((total, ai) => total + (ai.routes || [])
    .filter((route) => route.uid !== excludeRouteUid)
    .reduce((sum, route) => sum + routeCapacityUnits(state, route, airportId, { fleet: ai.fleet || [], ai: true }), 0), 0);
  return {
    playerUsed: roundCapacity(playerUsed),
    aiUsed: roundCapacity(aiUsedRaw * AI_CAPACITY_WEIGHT),
    total: roundCapacity(playerUsed + aiUsedRaw * AI_CAPACITY_WEIGHT),
  };
}

export function airportCapacitySnapshot(state, airportId, options = {}) {
  const capacity = airportCapacityPoints(state, airportId);
  const usage = airportCapacityUsage(state, airportId, options);
  let projectedUsed = usage.total;
  if (options.additionalRoute) {
    const alreadyCounted = (state?.routes || []).some((route) => route === options.additionalRoute
      || (route.uid !== undefined && route.uid === options.additionalRoute.uid));
    if (!alreadyCounted) {
      projectedUsed += routeCapacityUnitsForPlane(state, options.additionalRoute, airportId, options.plane);
    }
  }
  projectedUsed = roundCapacity(projectedUsed);
  const utilization = capacity > 0 ? projectedUsed / capacity : 1;
  const overloadRatio = capacity > 0 ? Math.max(0, projectedUsed - capacity) / capacity : 1;
  return {
    airportId,
    capacity,
    playerUsed: usage.playerUsed,
    aiUsed: usage.aiUsed,
    used: projectedUsed,
    remaining: roundCapacity(capacity - projectedUsed),
    utilization,
    overloadRatio,
    congested: overloadRatio > 0,
  };
}

export function routeCapacitySnapshots(state, route, options = {}) {
  return [route?.fromAirportId, route?.toAirportId]
    .filter(Boolean)
    .map((airportId) => airportCapacitySnapshot(state, airportId, {
      additionalRoute: options.projected ? route : null,
      plane: options.plane,
    }));
}

export function routeCapacityCostMultiplier(state, route) {
  const snapshots = routeCapacitySnapshots(state, route);
  if (snapshots.length === 0) return 1;
  const product = snapshots.reduce((value, snapshot) => value * (
    1 + Math.min(0.35, snapshot.overloadRatio * 0.25)
  ), 1);
  return Math.pow(product, 1 / snapshots.length);
}

export function routeCapacityDemandMultiplier(state, route) {
  const snapshots = routeCapacitySnapshots(state, route);
  if (snapshots.length === 0) return 1;
  const worst = Math.max(0, ...snapshots.map((snapshot) => snapshot.overloadRatio));
  return 1 - Math.min(0.12, worst * 0.08);
}

export function routeOpeningCapacityMultiplier(state, route, plane) {
  const snapshots = routeCapacitySnapshots(state, route, { projected: true, plane });
  const worst = Math.max(0, ...snapshots.map((snapshot) => snapshot.overloadRatio));
  return 1 + Math.min(0.5, worst * 0.35);
}

export function routeHubDemandMultiplier(state, route) {
  const endpointBonuses = [route?.fromAirportId, route?.toAirportId].filter(Boolean).map((airportId) => {
    const routes = (state?.routes || []).filter((item) => !item.suspended
      && (item.fromAirportId === airportId || item.toAirportId === airportId));
    if (routes.length < 3) return 0;
    const regions = new Set(routes.map((item) => {
      const otherCityId = item.fromAirportId === airportId ? item.to : item.from;
      return getCity(otherCityId)?.networkRegion || getCity(otherCityId)?.region;
    }).filter(Boolean));
    if (regions.size < 2) return 0;
    const snapshot = airportCapacitySnapshot(state, airportId);
    const headroom = clamp((1.05 - snapshot.utilization) / 0.55, 0, 1);
    const rawBonus = (routes.length - 2) * 0.015 + (regions.size - 1) * 0.02;
    return Math.min(0.12, rawBonus) * headroom;
  });
  return 1 + Math.min(0.12, Math.max(0, ...endpointBonuses));
}

function routeCapacityUnitsForPlane(state, route, airportId, plane) {
  if (!plane) return routeCapacityUnits(state, route, airportId);
  const distance = operatingDistanceForRoute(route);
  const marketDistance = cityDist(getCity(route.from), getCity(route.to));
  const frequency = capacityFrequencyFactor(Number.isFinite(distance) ? distance : marketDistance);
  return roundCapacity(frequency * capacityPlaneScale(plane) * Math.max(0.5, Number(route.serviceMultiplier) || 1));
}

function capacityFrequencyFactor(distanceKm) {
  if (distanceKm < 2000) return 3;
  if (distanceKm < 4500) return 2;
  if (distanceKm < 8000) return 1.25;
  return 1;
}

function capacityPlaneScale(plane) {
  if (plane?.type === 'superjumbo') return 2;
  if (plane?.type === 'wide') return 1.5;
  return 1;
}

function roundCapacity(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
