import { describe, expect, it } from 'vitest';

import { PLANES } from '../src/data/planes.js';
import { closeBranch, openBranch, previewCloseBranchImpact } from '../src/domain/bases.js';
import { availablePlaneTemplates, buyPlane } from '../src/domain/fleet.js';
import { adjustRoutePrice, availablePlanes, closeRoute, countCompetitors, openRoute, updateRouteMetrics } from '../src/domain/routes.js';
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

    const result = buyPlane(state, availablePlaneTemplates(state)[0].id, false);
    expect(result.ok).toBe(false);
    expect(state.fleet).toHaveLength(0);
  });

  it('filters purchases by aircraft service years', () => {
    const state = initState('beijing', 'era1');
    state.cash = 500;

    const result = buyPlane(state, 'a320', false);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('当前年份不可用');
    expect(state.fleet).toHaveLength(0);
  });

  it('only allows routes to depart from headquarters or branches', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });

    expect(openRoute(state, 'shanghai', 'tokyo', 1, 120)).toBe(false);

    state.cash = 100;
    expect(openBranch(state, 'shanghai').ok).toBe(true);
    expect(openRoute(state, 'shanghai', 'tokyo', 1, 120)).toBe(true);

    const closed = closeBranch(state, 'shanghai');
    expect(closed.ok).toBe(true);
    expect(state.routes).toHaveLength(0);
    expect(state.branches).toHaveLength(0);
  });

  it('rejects invalid route and branch inputs in the domain layer', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });

    expect(openRoute(state, 'beijing', 'beijing', 1, 120)).toBe(false);
    expect(openRoute(state, 'beijing', 'missing-city', 1, 120)).toBe(false);
    expect(openRoute(state, 'beijing', 'tokyo', 1, Number.NaN)).toBe(false);
    expect(openRoute(state, 'beijing', 'tokyo', 1, '120abc')).toBe(false);
    expect(openRoute(state, 'beijing', 'tokyo', 1, 120.5)).toBe(false);
    expect(openBranch(state, 'missing-city').ok).toBe(false);
  });

  it('rejects invalid route price adjustments without mutating the route', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
    expect(openRoute(state, 'beijing', 'shanghai', 1, 120)).toBe(true);

    expect(adjustRoutePrice(state, 'beijing', 'shanghai', '130abc')).toBeNull();
    expect(adjustRoutePrice(state, 'beijing', 'shanghai', 130.5)).toBeNull();
    expect(state.routes[0].price).toBe(120);
  });

  it('tolerates legacy routes without assigned plane lists when finding available planes', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
    state.routes.push({ from: 'beijing', to: 'shanghai' });

    expect(availablePlanes(state)).toHaveLength(1);
  });

  it('previews branch close impact with the same route scope used by closeBranch', () => {
    const state = initState('beijing', 'era3');
    state.cash = 100;
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
    openBranch(state, 'shanghai');
    openRoute(state, 'shanghai', 'tokyo', 1, 120);

    const preview = previewCloseBranchImpact(state, 'shanghai');
    const closed = closeBranch(state, 'shanghai');

    expect(preview.affectedRoutes).toHaveLength(1);
    expect([...preview.affectedPlaneIds]).toEqual([1]);
    expect(closed.affectedRoutes).toHaveLength(preview.affectedRoutes.length);
    expect([...closed.affectedPlaneIds]).toEqual([...preview.affectedPlaneIds]);
  });
});
