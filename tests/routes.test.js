import { describe, expect, it } from 'vitest';

import { PLANES } from '../src/data/planes.js';
import { buyPlane } from '../src/domain/fleet.js';
import { availablePlanes, closeRoute, countCompetitors, openRoute, updateRouteMetrics } from '../src/domain/routes.js';
import { initState } from '../src/domain/state.js';

describe('route and fleet operations', () => {
  it('opens, updates, and closes a player route', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });

    expect(availablePlanes(state)).toHaveLength(1);
    expect(openRoute(state, 'beijing', 'shanghai', 1, 120)).toBe(true);
    expect(openRoute(state, 'shanghai', 'beijing', 1, 120)).toBe(false);
    expect(openRoute(state, 'beijing', 'tokyo', 999, 120)).toBe(false);
    expect(availablePlanes(state)).toHaveLength(0);

    updateRouteMetrics(state);
    expect(state.routes[0].revenue).toBeGreaterThanOrEqual(0);
    expect(state.routes[0].cost).toBeGreaterThan(0);

    closeRoute(state, 'beijing', 'shanghai');
    expect(state.routes).toHaveLength(0);
  });

  it('rejects routes when the selected plane cannot fly the distance', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0, range: 800 });

    expect(openRoute(state, 'beijing', 'shanghai', 1, 120)).toBe(false);
    expect(state.routes).toHaveLength(0);
  });

  it('counts AI competitors on the same city pair', () => {
    const state = initState('beijing', 'era3');
    state.ai[0].routes.push({ from: 'beijing', to: 'tokyo' });
    state.ai[1].routes.push({ from: 'tokyo', to: 'beijing' });

    expect(countCompetitors(state, 'beijing', 'tokyo')).toBe(2);
  });

  it('rejects plane purchases when funds are insufficient', () => {
    const state = initState('beijing', 'era1');
    state.cash = 0;

    const result = buyPlane(state, 'a380', false);
    expect(result.ok).toBe(false);
    expect(state.fleet).toHaveLength(0);
  });
});
