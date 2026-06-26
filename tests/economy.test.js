import { describe, expect, it } from 'vitest';

import { PLANES } from '../src/data/planes.js';
import { baseDemand, calcLoadFactor, routeCost, routeRevenue, suggestedPrice } from '../src/domain/economy.js';
import { cityDist, getCity } from '../src/domain/helpers.js';
import { addSuspensionModifier, effectiveFrequency } from '../src/domain/modifiers.js';
import { initState } from '../src/domain/state.js';

describe('economy model', () => {
  it('calculates stable city distance and suggested ticket price', () => {
    const beijing = getCity('beijing');
    const shanghai = getCity('shanghai');

    expect(Math.round(cityDist(beijing, shanghai))).toBeGreaterThan(1000);
    expect(suggestedPrice('beijing', 'shanghai')).toBeGreaterThan(100);
  });

  it('derives positive demand for major city pairs', () => {
    expect(baseDemand(getCity('beijing'), getCity('shanghai'))).toBeGreaterThan(100);
    expect(baseDemand(getCity('london'), getCity('newyork'))).toBeGreaterThan(10);
  });

  it('keeps load factor bounded and produces revenue/cost totals', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
    const route = {
      from: 'beijing',
      to: 'shanghai',
      price: suggestedPrice('beijing', 'shanghai'),
      suggestedPrice: suggestedPrice('beijing', 'shanghai'),
      frequency: 1,
      assignedPlanes: [1],
      loadFactor: 0,
    };

    route.loadFactor = calcLoadFactor(state, route, route.price, state.brand, 0);
    expect(route.loadFactor).toBeGreaterThanOrEqual(0);
    expect(route.loadFactor).toBeLessThanOrEqual(1);
    expect(routeRevenue(state, route).total).toBeGreaterThan(0);
    expect(routeCost(state, route).total).toBeGreaterThan(0);
  });

  it('treats suspended routes as zero-frequency operations', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
    const route = {
      from: 'beijing',
      to: 'shanghai',
      price: suggestedPrice('beijing', 'shanghai'),
      suggestedPrice: suggestedPrice('beijing', 'shanghai'),
      frequency: 1,
      assignedPlanes: [1],
      loadFactor: 0,
    };
    addSuspensionModifier(state, 'test suspension', { kind: 'cityIds', cityIds: ['shanghai'] }, 1);

    expect(effectiveFrequency(state, route)).toBe(0);
    route.loadFactor = calcLoadFactor(state, route, route.price, state.brand, 0);
    expect(route.loadFactor).toBe(0);
    expect(routeRevenue(state, route).total).toBe(0);
    expect(routeCost(state, route).total).toBe(0);
  });

  it('applies player trait cost reductions to fuel and maintenance', () => {
    const baseState = initState('beijing', 'era3');
    const fuelState = initState('beijing', 'era3');
    const maintState = initState('beijing', 'era3');
    const plane = { ...PLANES[0], uid: 1, age: 3, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 };
    [baseState, fuelState, maintState].forEach((state) => {
      state.fleet.push({ ...plane });
    });
    fuelState.playerTrait = '豆';
    maintState.playerTrait = '机';
    const route = {
      from: 'beijing',
      to: 'shanghai',
      price: suggestedPrice('beijing', 'shanghai'),
      suggestedPrice: suggestedPrice('beijing', 'shanghai'),
      frequency: 1,
      assignedPlanes: [1],
      loadFactor: 0.7,
    };

    const baseCost = routeCost(baseState, route);
    const fuelCost = routeCost(fuelState, route);
    const maintCost = routeCost(maintState, route);

    expect(fuelCost.fuel).toBeCloseTo(baseCost.fuel * 0.9);
    expect(maintCost.maint).toBeCloseTo(baseCost.maint * 0.9);
  });
});
