import { routePlaneSeatCapacity } from './airportPerformance.js';
import { AIRCRAFT_RETIREMENT_AGE_YEARS, LEASE_TERM_QUARTERS } from './fleet.js';

export const FLEET_RENEWAL_HORIZON_QUARTERS = 8;
export const FLEET_NEAR_TERM_QUARTERS = 4;

export const FLEET_PLAN_FILTERS = Object.freeze([
  'all',
  'renewal',
  'assigned',
  'idle',
  'delivering',
  'leased',
]);

export function normalizeFleetPlanFilter(filter) {
  return FLEET_PLAN_FILTERS.includes(filter) ? filter : 'all';
}

export function planeLifecycleSchedule(plane) {
  const retirementInQuarters = quartersUntilRetirement(plane);
  const leaseExpiryInQuarters = plane?.isLease ? quartersUntilLeaseExpiry(plane) : null;
  const leaseExpiresFirst = leaseExpiryInQuarters !== null && leaseExpiryInQuarters <= retirementInQuarters;
  return {
    departureInQuarters: leaseExpiresFirst ? leaseExpiryInQuarters : retirementInQuarters,
    departureReason: leaseExpiresFirst ? 'lease_expired' : 'retired',
    retirementInQuarters,
    leaseExpiryInQuarters,
  };
}

export function analyzeFleetPlan(state, options = {}) {
  const horizonQuarters = positiveInteger(options.horizonQuarters, FLEET_RENEWAL_HORIZON_QUARTERS);
  const routes = Array.isArray(state?.routes) ? state.routes : [];
  const routeByPlaneUid = new Map();
  routes.forEach((route) => {
    (Array.isArray(route.assignedPlanes) ? route.assignedPlanes : []).forEach((uid) => {
      if (!routeByPlaneUid.has(uid)) routeByPlaneUid.set(uid, route);
    });
  });

  const entries = (Array.isArray(state?.fleet) ? state.fleet : []).map((plane) => {
    const route = routeByPlaneUid.get(plane.uid) || null;
    const lifecycle = planeLifecycleSchedule(plane);
    const delivering = Boolean(plane.delivering);
    const assigned = Boolean(route);
    const idle = !delivering && !assigned;
    const deliveryInQuarters = delivering
      ? Math.max(1, Math.ceil(Number(plane.deliverIn) || 0))
      : null;
    const replacementSeats = route ? routePlaneSeatCapacity(route, plane, state) : 0;
    return {
      plane,
      route,
      delivering,
      assigned,
      idle,
      leased: Boolean(plane.isLease),
      owned: !plane.isLease,
      renewal: lifecycle.departureInQuarters <= horizonQuarters,
      deliveryInQuarters,
      replacementSeats,
      ...lifecycle,
    };
  });

  const counts = Object.fromEntries(FLEET_PLAN_FILTERS.map((filter) => [
    filter,
    filter === 'all' ? entries.length : entries.filter((entry) => entry[filter]).length,
  ]));
  const dueNextQuarter = entries.filter((entry) => entry.departureInQuarters <= 1);
  const dueWithinFourQuarters = entries.filter((entry) => entry.departureInQuarters <= FLEET_NEAR_TERM_QUARTERS);
  const dueWithinHorizon = entries.filter((entry) => entry.departureInQuarters <= horizonQuarters);
  const incomingWithinTwoQuarters = entries.filter((entry) => (
    entry.deliveryInQuarters !== null && entry.deliveryInQuarters <= 2
  ));

  return {
    entries,
    counts,
    summary: {
      total: entries.length,
      owned: entries.filter((entry) => entry.owned).length,
      leased: entries.filter((entry) => entry.leased).length,
      assigned: entries.filter((entry) => entry.assigned).length,
      idle: entries.filter((entry) => entry.idle).length,
      delivering: entries.filter((entry) => entry.delivering).length,
      dueNextQuarter: dueNextQuarter.length,
      dueWithinFourQuarters: dueWithinFourQuarters.length,
      dueWithinHorizon: dueWithinHorizon.length,
      affectedRoutesWithinFourQuarters: uniqueRouteCount(dueWithinFourQuarters),
      replacementSeatsWithinFourQuarters: sumReplacementSeats(dueWithinFourQuarters),
      affectedRoutesWithinHorizon: uniqueRouteCount(dueWithinHorizon),
      replacementSeatsWithinHorizon: sumReplacementSeats(dueWithinHorizon),
      deliveriesWithinTwoQuarters: incomingWithinTwoQuarters.length,
      seatsDeliveringWithinTwoQuarters: incomingWithinTwoQuarters.reduce((sum, entry) => (
        sum + Math.max(0, Number(entry.plane?.seats) || 0)
      ), 0),
    },
  };
}

export function matchesFleetPlanFilter(entry, filter) {
  const normalized = normalizeFleetPlanFilter(filter);
  return normalized === 'all' || Boolean(entry?.[normalized]);
}

function quartersUntilRetirement(plane) {
  const age = Math.max(0, Number(plane?.age) || 0);
  return Math.max(1, Math.ceil(((AIRCRAFT_RETIREMENT_AGE_YEARS - age) / 0.25) - 1e-9));
}

function quartersUntilLeaseExpiry(plane) {
  const leaseTurns = Math.max(0, Number(plane?.leaseTurns) || 0);
  const maxLeaseTurns = Math.max(1, Number(plane?.maxLeaseTurns) || LEASE_TERM_QUARTERS);
  return Math.max(1, Math.ceil(maxLeaseTurns - leaseTurns));
}

function uniqueRouteCount(entries) {
  return new Set(entries.map((entry) => entry.route).filter(Boolean)).size;
}

function sumReplacementSeats(entries) {
  return entries.reduce((sum, entry) => sum + entry.replacementSeats, 0);
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}
