import { describe, expect, it } from 'vitest';

import { availablePlaneTemplates, buyPlane, returnLease, sellPlane } from '../src/domain/fleet.js';
import { initState } from '../src/domain/state.js';

describe('fleet operations', () => {
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
});
