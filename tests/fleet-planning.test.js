import { describe, expect, it } from 'vitest';

import { PLANES } from '../src/data/planes.js';
import { getDefaultAirportId } from '../src/domain/airports.js';
import {
  analyzeFleetPlan,
  matchesFleetPlanFilter,
  normalizeFleetPlanFilter,
  planeLifecycleSchedule,
} from '../src/domain/fleetPlanning.js';
import { initState } from '../src/domain/state.js';

function makePlane(uid, overrides = {}) {
  return {
    ...PLANES.find((plane) => plane.id === 'a320'),
    uid,
    age: 4,
    isLease: false,
    leasePrice: 0,
    leaseTurns: 0,
    maxLeaseTurns: 40,
    delivering: false,
    deliverIn: 0,
    ...overrides,
  };
}

function makeRoute(uid, from, to, planeUid) {
  return {
    uid,
    from,
    to,
    fromAirportId: getDefaultAirportId(from),
    toAirportId: getDefaultAirportId(to),
    assignedPlanes: [planeUid],
    suspended: false,
  };
}

describe('fleet renewal planning', () => {
  it('calculates lease and retirement departure quarters using fleet settlement rules', () => {
    expect(planeLifecycleSchedule(makePlane(1, { age: 24 }))).toMatchObject({
      departureInQuarters: 4,
      departureReason: 'retired',
    });
    expect(planeLifecycleSchedule(makePlane(2, {
      age: 10,
      isLease: true,
      leaseTurns: 38,
      maxLeaseTurns: 40,
    }))).toMatchObject({
      departureInQuarters: 2,
      departureReason: 'lease_expired',
    });
    expect(planeLifecycleSchedule(makePlane(3, {
      age: 24.75,
      isLease: true,
      leaseTurns: 30,
      maxLeaseTurns: 40,
    }))).toMatchObject({
      departureInQuarters: 1,
      departureReason: 'retired',
    });
  });

  it('summarizes replacement seats, affected routes, deliveries, and fleet filters', () => {
    const state = initState('beijing', 'era3');
    state.fleet = [
      makePlane(1, { age: 24.75 }),
      makePlane(2, { isLease: true, leaseTurns: 39, maxLeaseTurns: 40 }),
      makePlane(3, { delivering: true, deliverIn: 2 }),
      makePlane(4, { age: 23 }),
    ];
    state.routes = [
      makeRoute(1, 'beijing', 'shanghai', 1),
      makeRoute(2, 'beijing', 'tokyo', 2),
    ];

    const plan = analyzeFleetPlan(state);

    expect(plan.counts).toEqual({
      all: 4,
      renewal: 3,
      assigned: 2,
      idle: 1,
      delivering: 1,
      leased: 1,
    });
    expect(plan.summary).toMatchObject({
      total: 4,
      owned: 3,
      leased: 1,
      assigned: 2,
      idle: 1,
      delivering: 1,
      dueNextQuarter: 2,
      dueWithinFourQuarters: 2,
      dueWithinHorizon: 3,
      affectedRoutesWithinFourQuarters: 2,
      deliveriesWithinTwoQuarters: 1,
    });
    expect(plan.summary.replacementSeatsWithinFourQuarters).toBeGreaterThan(0);
    expect(plan.summary.seatsDeliveringWithinTwoQuarters).toBe(state.fleet[2].seats);
    expect(matchesFleetPlanFilter(plan.entries[0], 'renewal')).toBe(true);
    expect(normalizeFleetPlanFilter('missing')).toBe('all');
  });
});
