import { describe, expect, it } from 'vitest';

import { PLANES } from '../src/data/planes.js';
import { baseDemand, calcLoadFactor, distanceServiceMultiplier, routeCost, routeRevenue, routeSeatCapacity, routeYieldPremium, suggestedPrice } from '../src/domain/economy.js';
import { cityDist, getCity } from '../src/domain/helpers.js';
import { addSuspensionModifier, routeServiceMultiplier } from '../src/domain/modifiers.js';
import { initState } from '../src/domain/state.js';

describe('economy model', () => {
  it('calculates stable city distance and suggested ticket price', () => {
    const beijing = getCity('beijing');
    const shanghai = getCity('shanghai');

    expect(Math.round(cityDist(beijing, shanghai))).toBeGreaterThan(1000);
    expect(suggestedPrice('beijing', 'shanghai')).toBe(Math.round(cityDist(beijing, shanghai) * 0.10 + 80));
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
      serviceMultiplier: 1,
      assignedPlanes: [1],
      loadFactor: 0,
    };

    route.loadFactor = calcLoadFactor(state, route, route.price, state.brand, 0);
    expect(route.loadFactor).toBeGreaterThanOrEqual(0);
    expect(route.loadFactor).toBeLessThanOrEqual(1);
    expect(routeRevenue(state, route).total).toBeGreaterThan(0);
    expect(routeCost(state, route).total).toBeGreaterThan(0);
  });

  it('applies distance-based service multiplier to passenger revenue', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
    const route = {
      from: 'beijing',
      to: 'shanghai',
      price: suggestedPrice('beijing', 'shanghai'),
      suggestedPrice: suggestedPrice('beijing', 'shanghai'),
      serviceMultiplier: 1,
      assignedPlanes: [1],
      loadFactor: 0.5,
    };
    const serviceMultiplier = distanceServiceMultiplier(cityDist(getCity(route.from), getCity(route.to)));
    const pax = Math.round(PLANES[0].seats * route.loadFactor) * serviceMultiplier;

    const revenue = routeRevenue(state, route);

    expect(serviceMultiplier).toBe(4);
    expect(revenue.pax).toBe(pax);
    expect(revenue.rev).toBeCloseTo(pax * route.price / 28000);
  });

  it('adds yield premiums for cross-region and cross-subregion long routes', () => {
    expect(routeYieldPremium(getCity('newyork'), getCity('london'))).toBeCloseTo(1.35);
    expect(routeYieldPremium(getCity('newyork'), getCity('losangeles'))).toBeCloseTo(1.12);
    expect(routeYieldPremium(getCity('beijing'), getCity('shanghai'))).toBe(1);
  });

  it('applies the yield premium to passenger and cargo revenue', () => {
    const state = initState('newyork', 'era3');
    const plane = { ...PLANES.find((item) => item.id === 'b777'), uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 };
    state.fleet.push(plane);
    const route = {
      from: 'newyork',
      to: 'london',
      price: suggestedPrice('newyork', 'london'),
      suggestedPrice: suggestedPrice('newyork', 'london'),
      serviceMultiplier: 1,
      assignedPlanes: [1],
      loadFactor: 0.5,
    };

    const revenue = routeRevenue(state, route);
    const serviceMultiplier = distanceServiceMultiplier(cityDist(getCity(route.from), getCity(route.to)));
    const pax = Math.round(plane.seats * route.loadFactor) * serviceMultiplier;
    const yieldPremium = routeYieldPremium(getCity(route.from), getCity(route.to));

    expect(revenue.pax).toBe(pax);
    expect(revenue.rev).toBeCloseTo(pax * route.price * yieldPremium / 28000);
    expect(revenue.cargoRev).toBeCloseTo(pax * 0.02 * route.price * 0.3 * yieldPremium / 28000);
  });

  it('keeps route service multiplier out of seat capacity and applies it once as service volume', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
    const route = {
      from: 'beijing',
      to: 'shanghai',
      price: suggestedPrice('beijing', 'shanghai'),
      suggestedPrice: suggestedPrice('beijing', 'shanghai'),
      serviceMultiplier: 2,
      assignedPlanes: [1],
      loadFactor: 0.5,
    };
    const distanceMultiplier = distanceServiceMultiplier(cityDist(getCity(route.from), getCity(route.to)));
    const expectedPax = Math.round(PLANES[0].seats * route.loadFactor) * distanceMultiplier * route.serviceMultiplier;

    expect(routeSeatCapacity(state, route)).toBe(PLANES[0].seats);
    expect(routeRevenue(state, route).pax).toBe(expectedPax);
  });

  it('treats suspended routes as zero-service operations', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
    const route = {
      from: 'beijing',
      to: 'shanghai',
      price: suggestedPrice('beijing', 'shanghai'),
      suggestedPrice: suggestedPrice('beijing', 'shanghai'),
      serviceMultiplier: 1,
      assignedPlanes: [1],
      loadFactor: 0,
    };
    addSuspensionModifier(state, 'test suspension', { kind: 'cityIds', cityIds: ['shanghai'] }, 1);

    expect(routeServiceMultiplier(state, route)).toBe(0);
    route.loadFactor = calcLoadFactor(state, route, route.price, state.brand, 0);
    expect(route.loadFactor).toBe(0);
    expect(routeRevenue(state, route).total).toBe(0);
    expect(routeCost(state, route).total).toBe(0);
  });

  it('returns zero metrics for routes with missing cities', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
    const route = {
      from: 'beijing',
      to: 'missing-city',
      price: 100,
      suggestedPrice: 100,
      serviceMultiplier: 1,
      assignedPlanes: [1],
      loadFactor: 0.5,
    };

    expect(calcLoadFactor(state, route, route.price, state.brand, 0)).toBe(0);
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
      serviceMultiplier: 1,
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
