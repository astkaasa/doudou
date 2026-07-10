import { describe, expect, it } from 'vitest';

import { PLANES } from '../src/data/planes.js';
import { disposeIdleFleet, quoteIdleFleetDisposal } from '../src/domain/fleetBatch.js';
import { planeSellPrice } from '../src/domain/fleet.js';
import { initState } from '../src/domain/state.js';

function makePlane(uid, overrides = {}) {
  return {
    ...PLANES.find((plane) => plane.id === 'a320'),
    uid,
    age: 5,
    isLease: false,
    leasePrice: 0,
    leaseTurns: 0,
    maxLeaseTurns: 40,
    delivering: false,
    deliverIn: 0,
    ...overrides,
  };
}

describe('idle fleet batch disposal', () => {
  it('quotes exact sale income, lease savings, and the resulting lease limit', () => {
    const state = initState('beijing', 'era3');
    state.cash = 100;
    state.fleet = [
      makePlane(1),
      makePlane(2),
      makePlane(3, { isLease: true, leasePrice: 1.5 }),
    ];

    const quote = quoteIdleFleetDisposal(state, [1, 3, 3]);

    expect(quote).toMatchObject({
      ok: true,
      requestedUids: [1, 3],
      ownedCount: 1,
      leasedCount: 1,
      quarterlyLeaseSavings: 1.5,
      affectedRouteCount: 0,
      ownedAfter: 1,
      leasedAfter: 0,
      leaseLimitBefore: 1,
      leaseLimitAfter: 0,
      leaseLimitExceededAfter: false,
    });
    expect(quote.saleProceeds).toBe(planeSellPrice(state.fleet[0]));
    expect(quote.cashAfter).toBe(state.cash + quote.saleProceeds);
    expect(state.fleet).toHaveLength(3);
  });

  it('rejects the whole batch when any selected aircraft is assigned, delivering, or missing', () => {
    const state = initState('beijing', 'era3');
    state.fleet = [makePlane(1), makePlane(2, { delivering: true, deliverIn: 1 }), makePlane(3)];
    state.routes = [{ uid: 1, assignedPlanes: [1] }];
    const before = structuredClone(state);

    const result = disposeIdleFleet(state, [1, 2, 3, 999]);

    expect(result.ok).toBe(false);
    expect(result.rejected.map((entry) => entry.code)).toEqual(['assigned', 'delivering', 'missing']);
    expect(result.entries.map((entry) => entry.uid)).toEqual([3]);
    expect(result.disposed).toEqual([]);
    expect(state).toEqual(before);
  });

  it('revalidates selection at execution and disposes a valid mixed batch atomically', () => {
    const state = initState('beijing', 'era3');
    state.cash = 50;
    state.fleet = [
      makePlane(1),
      makePlane(2, { isLease: true, leasePrice: 2 }),
    ];
    const quote = quoteIdleFleetDisposal(state, [1, 2]);

    const result = disposeIdleFleet(state, [1, 2]);

    expect(quote.ok).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.disposed).toHaveLength(2);
    expect(state.fleet).toEqual([]);
    expect(state.cash).toBe(50 + quote.saleProceeds);
  });

  it('surfaces a post-disposal lease ratio warning without hiding the exact impact', () => {
    const state = initState('beijing', 'era3');
    state.fleet = [
      makePlane(1),
      makePlane(2),
      makePlane(3, { isLease: true, leasePrice: 1 }),
    ];

    const quote = quoteIdleFleetDisposal(state, [1]);

    expect(quote).toMatchObject({
      ok: true,
      ownedAfter: 1,
      leasedAfter: 1,
      leaseLimitAfter: 0,
      leaseLimitExceededAfter: true,
    });
  });
});
