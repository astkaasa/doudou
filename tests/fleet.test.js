import { describe, expect, it } from 'vitest';

import { advanceFleetAge, availablePlaneTemplates, buyPlane, quotePlaneAcquisition, returnLease, sellPlane } from '../src/domain/fleet.js';
import { initState } from '../src/domain/state.js';

describe('fleet operations', () => {
  it('quotes purchase delivery and the full upfront lease cost before acquisition', () => {
    const state = initState('beijing', 'era1');
    state.cash = 1000;
    const plane = availablePlaneTemplates(state)[0];
    state.fleet.push({ ...plane, uid: 1, isLease: false });
    state.fleet.push({ ...plane, uid: 2, isLease: false });

    const purchase = quotePlaneAcquisition(state, plane.id, false, 2);
    const lease = quotePlaneAcquisition(state, plane.id, true, 1);

    expect(purchase).toMatchObject({ ok: true, count: 2, deliveryTurns: 2, recurringCost: 0 });
    expect(purchase.totalCost).toBe(plane.buyPrice * 2);
    expect(lease).toMatchObject({ ok: true, count: 1, deliveryTurns: 0, recurringCost: plane.leasePrice });
    expect(lease.leaseFee).toBeCloseTo(plane.buyPrice * 0.1);
    expect(lease.totalCost).toBeCloseTo(plane.leasePrice + plane.buyPrice * 0.1);
  });

  it('returns an actionable quote when cash is insufficient', () => {
    const state = initState('beijing', 'era1');
    state.cash = 0;
    const plane = availablePlaneTemplates(state)[0];

    const quote = quotePlaneAcquisition(state, plane.id, false, 1);

    expect(quote).toMatchObject({ ok: false, code: 'insufficient-cash', cashAfter: -plane.buyPrice });
  });

  it('does not sell leased aircraft as owned assets', () => {
    const state = initState('beijing', 'era3');
    state.cash = 10000;
    const planeId = availablePlaneTemplates(state)[0].id;
    buyPlane(state, planeId, false, 2);
    const leased = buyPlane(state, planeId, true);
    const leasedUid = leased.plane.uid;
    const cashBefore = state.cash;

    expect(sellPlane(state, leasedUid)).toBeNull();
    expect(state.cash).toBe(cashBefore);
    expect(state.fleet.some((plane) => plane.uid === leasedUid)).toBe(true);

    const returned = returnLease(state, leasedUid);
    expect(returned.plane.uid).toBe(leasedUid);
    expect(state.fleet.some((plane) => plane.uid === leasedUid)).toBe(false);
  });

  it('records lease expiry and age retirement before clearing route assignments', () => {
    const state = initState('beijing', 'era3');
    const template = availablePlaneTemplates(state)[0];
    state.fleet = [
      { ...template, uid: 1, name: 'Owned 25', age: 24.75, isLease: false, delivering: false },
      { ...template, uid: 2, name: 'Lease 40', age: 8, isLease: true, leaseTurns: 39, maxLeaseTurns: 40, delivering: false },
      { ...template, uid: 3, name: 'Active', age: 10, isLease: false, delivering: false },
    ];
    state.routes = [{ from: 'beijing', to: 'shanghai', assignedPlanes: [1, 2, 3] }];

    const departures = advanceFleetAge(state);

    expect(departures).toEqual([
      { uid: 1, name: 'Owned 25', reason: 'retired', affectedRouteCount: 1 },
      { uid: 2, name: 'Lease 40', reason: 'lease_expired', affectedRouteCount: 1 },
    ]);
    expect(state.fleet.map((plane) => plane.uid)).toEqual([3]);
    expect(state.routes[0].assignedPlanes).toEqual([3]);
  });
});
