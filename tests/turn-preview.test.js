import { describe, expect, it } from 'vitest';

import { PLANES } from '../src/data/planes.js';
import { eraSettlementDeadlineTurns } from '../src/domain/eraSettlement.js';
import { openRoute, updateRouteMetrics } from '../src/domain/routes.js';
import { initState } from '../src/domain/state.js';
import { previewNextQuarter } from '../src/domain/turnPreview.js';

function makePlane(uid, overrides = {}) {
  return {
    ...PLANES.find((plane) => plane.id === 'a320'),
    uid,
    age: 0,
    isLease: false,
    leasePrice: 0,
    leaseTurns: 0,
    maxLeaseTurns: 40,
    delivering: false,
    deliverIn: 0,
    ...overrides,
  };
}

describe('next-quarter preview', () => {
  it('applies only known fleet and branch changes to a cloned state', () => {
    const state = initState('beijing', 'era1', { seed: 'turn-preview' });
    state.cash = 500;
    state.year = 1979;
    state.quarter = 2;
    state.turnsPlayed = eraSettlementDeadlineTurns(state) - 1;
    state.fleet = [
      makePlane(1, { age: 24.75 }),
      makePlane(2, { delivering: true, deliverIn: 1 }),
    ];
    expect(openRoute(state, 'beijing', 'shanghai', 1, 120).ok).toBe(true);
    state.routes[0].isNew = false;
    state.branchesConstructing = [{ cityId: 'tokyo', constructIn: 1 }];
    updateRouteMetrics(state);
    const route = state.routes[0];
    state.airportContracts = [{
      id: 'airport-contract-1',
      status: 'active',
      airportId: route.toAirportId,
      cityId: route.to,
      originCityId: route.from,
      durationQuarters: 4,
      remainingQuarters: 1,
      requiredMetQuarters: 3,
      metQuarters: 2,
      missedQuarters: 1,
      minLoadFactor: 0.45,
      minServiceMultiplier: 1,
      routeUid: route.uid,
    }];
    const before = structuredClone(state);

    const preview = previewNextQuarter(state);

    expect(preview.nextPeriod).toEqual({ year: 1979, quarter: 3 });
    expect(preview.fleetDepartures).toHaveLength(1);
    expect(preview.fleetDepartures[0]).toMatchObject({ assigned: true, departureReason: 'retired' });
    expect(preview.fleetDeliveries).toHaveLength(1);
    expect(preview.branchCompletions).toEqual([{ cityId: 'tokyo', constructIn: 1 }]);
    expect(preview.contractDeadlines).toHaveLength(1);
    expect(preview.contractDeadlines[0]).toMatchObject({ finalQuarter: true, staticOutcome: 'breach' });
    expect(preview.staffContract).toBe('recruit');
    expect(preview.eraSettlementDue).toBe(true);
    expect(preview.attentionCount).toBe(2);
    expect(preview.knownChangeCount).toBe(6);
    expect(Number.isFinite(preview.financials.profit)).toBe(true);
    expect(state).toEqual(before);
  });

  it('returns a quiet preview when no fixed deadlines or movements are due', () => {
    const state = initState('beijing', 'era4', { seed: 'quiet-preview' });
    state.fleet = [makePlane(1, { age: 2 })];
    state.quarter = 1;

    const preview = previewNextQuarter(state);

    expect(preview.knownChangeCount).toBe(0);
    expect(preview.attentionCount).toBe(0);
    expect(preview.fleetDepartures).toEqual([]);
    expect(preview.contractDeadlines).toEqual([]);
  });

  it('treats a missing contract route as a breach even after enough quarters were met', () => {
    const state = initState('beijing', 'era4', { seed: 'missing-contract-route' });
    state.airportContracts = [{
      id: 'airport-contract-1',
      status: 'active',
      airportId: 'virtual-shanghai',
      cityId: 'shanghai',
      originCityId: 'beijing',
      remainingQuarters: 1,
      requiredMetQuarters: 2,
      metQuarters: 2,
      routeUid: 999,
    }];

    const preview = previewNextQuarter(state);

    expect(preview.contractDeadlines[0]).toMatchObject({
      certainBreach: true,
      staticOutcome: 'breach',
    });
    expect(preview.attentionCount).toBe(1);
  });
});
