import { describe, expect, it } from 'vitest';

import {
  ROUTE_LOW_LOAD_THRESHOLD,
  analyzeRouteDiagnostics,
  diagnoseRoute,
  matchesRouteDiagnostic,
  normalizeRouteDiagnosticFilter,
} from '../src/domain/routeDiagnostics.js';

function makeState(routes, fleet = [{ uid: 1, delivering: false }]) {
  return { routes, fleet };
}

function matureRoute(overrides = {}) {
  return {
    uid: 1,
    assignedPlanes: [1],
    profit: 2,
    loadFactor: 0.75,
    isNew: false,
    suspended: false,
    ...overrides,
  };
}

describe('route diagnostics', () => {
  it('classifies settled performance, staffing, suspension, and contract states', () => {
    const state = makeState([
      matureRoute({ uid: 1, profit: -2, loadFactor: 0.72, airportContractId: 'contract-1' }),
      matureRoute({ uid: 2, loadFactor: ROUTE_LOW_LOAD_THRESHOLD - 0.01 }),
      matureRoute({ uid: 3, isNew: true, profit: -10, loadFactor: 0.1 }),
      matureRoute({ uid: 4, _reopened: true, profit: -10, loadFactor: 0.1 }),
      matureRoute({ uid: 5, assignedPlanes: [99] }),
      matureRoute({ uid: 6, assignedPlanes: [], suspended: true }),
    ]);

    const analysis = analyzeRouteDiagnostics(state);
    const byUid = new Map(analysis.entries.map((entry) => [entry.route.uid, entry.diagnostics]));

    expect(byUid.get(1)).toMatchObject({ attention: true, loss: true, lowLoad: false, contract: true });
    expect(byUid.get(2)).toMatchObject({ attention: true, loss: false, lowLoad: true });
    expect(byUid.get(3)).toMatchObject({ attention: false, loss: false, lowLoad: false, hasObservedMetrics: false });
    expect(byUid.get(4)).toMatchObject({ attention: false, loss: false, lowLoad: false, hasObservedMetrics: false });
    expect(byUid.get(5)).toMatchObject({ attention: true, unassigned: true, operationalPlaneCount: 0 });
    expect(byUid.get(6)).toMatchObject({ attention: false, unassigned: true, suspended: true });
    expect(analysis.counts).toEqual({
      all: 6,
      attention: 3,
      loss: 1,
      lowLoad: 1,
      unassigned: 2,
      suspended: 1,
      contract: 1,
    });
  });

  it('uses the last settled metrics after an in-quarter route adjustment', () => {
    const route = matureRoute({
      profit: 8,
      loadFactor: 0.88,
      _priceAdjusted: true,
      _lastProfit: -1.5,
      _lastLf: 0.45,
    });

    expect(diagnoseRoute(makeState([route]), route)).toMatchObject({
      attention: true,
      loss: true,
      lowLoad: true,
      profit: -1.5,
      loadFactor: 0.45,
    });
  });

  it('treats missing or delivering aircraft as unavailable without mutating routes', () => {
    const route = matureRoute({ assignedPlanes: [1, 2] });
    const state = makeState([route], [
      { uid: 1, delivering: true },
      { uid: 3, delivering: false },
    ]);

    expect(diagnoseRoute(state, route)).toMatchObject({
      assignedPlaneCount: 2,
      operationalPlaneCount: 0,
      unassigned: true,
      attention: true,
      loss: false,
      lowLoad: false,
    });
    expect(route.assignedPlanes).toEqual([1, 2]);
  });

  it('normalizes unknown filters and matches the derived flags', () => {
    const diagnostics = { attention: true, loss: true, lowLoad: false };

    expect(normalizeRouteDiagnosticFilter('loss')).toBe('loss');
    expect(normalizeRouteDiagnosticFilter('unknown')).toBe('all');
    expect(matchesRouteDiagnostic(diagnostics, 'loss')).toBe(true);
    expect(matchesRouteDiagnostic(diagnostics, 'lowLoad')).toBe(false);
    expect(matchesRouteDiagnostic(diagnostics, 'unknown')).toBe(true);
  });
});
