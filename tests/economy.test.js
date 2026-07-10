import { describe, expect, it } from 'vitest';

import { PLANES } from '../src/data/planes.js';
import { getDefaultAirportId, virtualAirportId } from '../src/domain/airports.js';
import { baseDemand, calcLoadFactor, distanceServiceMultiplier, PASSENGER_SERVICE_COST_PER_PAX_1000KM, populationAviationPropensity, populationDemandScore, ROUTE_REVENUE_DIVISOR, routeCost, routeRevenue, routeSeatCapacity, routeYieldPremium, suggestedPrice } from '../src/domain/economy.js';
import { cityDist, getCity } from '../src/domain/helpers.js';
import { addSuspensionModifier, routeServiceMultiplier } from '../src/domain/modifiers.js';
import { calcOpsBudgetCost } from '../src/domain/operations.js';
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

  it('compresses factual population with a configurable concave market score', () => {
    expect(populationDemandScore(10)).toBeCloseTo(5);
    expect(populationDemandScore(40)).toBeLessThan(populationDemandScore(10) * 4);
    expect(populationDemandScore(10, { exponent: 0.55 })).toBeCloseTo(5);
    expect(populationDemandScore(40, { exponent: 0.55 })).toBeLessThan(populationDemandScore(40));
    expect(populationDemandScore(-1)).toBe(0);
  });

  it('models increasing aviation participation without changing factual population', () => {
    expect(populationAviationPropensity({ era: 'era1', year: 1960 })).toBeCloseTo(0.3);
    expect(populationAviationPropensity({ era: 'era2', year: 1975 })).toBeCloseTo(1.6);
    expect(populationAviationPropensity({ era: 'era3', year: 2000 })).toBeCloseTo(1.75);
    expect(populationAviationPropensity({ era: 'era4', year: 1960 })).toBeCloseTo(0.7);
    expect(populationAviationPropensity({ era: 'era4', year: 1980 })).toBeCloseTo(1.2);
    expect(populationAviationPropensity({ era: 'era4', year: 2000 })).toBeCloseTo(1.7);
  });

  it('keeps load factor bounded and produces revenue/cost totals', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
    const route = {
      from: 'beijing',
      to: 'shanghai',
      price: suggestedPrice('beijing', 'shanghai') * 5,
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
    expect(revenue.rev).toBeCloseTo(pax * route.price / ROUTE_REVENUE_DIVISOR);
  });

  it('scales cabin service cost with carried passengers and distance', () => {
    const state = initState('beijing', 'era3');
    const plane = { ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 };
    state.fleet.push(plane);
    const route = {
      from: 'beijing',
      to: 'shanghai',
      price: suggestedPrice('beijing', 'shanghai'),
      suggestedPrice: suggestedPrice('beijing', 'shanghai'),
      serviceMultiplier: 1,
      assignedPlanes: [1],
      loadFactor: 0.5,
    };
    const distance = cityDist(getCity(route.from), getCity(route.to));
    const passengers = Math.round(plane.seats * route.loadFactor) * distanceServiceMultiplier(distance);

    expect(routeCost(state, route).catering).toBeCloseTo(
      passengers * (distance / 1000) * PASSENGER_SERVICE_COST_PER_PAX_1000KM * 1.35,
    );
  });

  it('applies explicit era cabin-cost calibration', () => {
    const earlyState = initState('beijing', 'era1');
    const epicState = initState('beijing', 'era4');
    const plane = { ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 };
    [earlyState, epicState].forEach((state) => state.fleet.push({ ...plane }));
    const route = {
      from: 'beijing',
      to: 'shanghai',
      price: suggestedPrice('beijing', 'shanghai'),
      suggestedPrice: suggestedPrice('beijing', 'shanghai'),
      serviceMultiplier: 1,
      assignedPlanes: [1],
      loadFactor: 0.5,
    };

    expect(routeCost(earlyState, route).catering).toBeCloseTo(routeCost(epicState, route).catering * 0.1);
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
    expect(revenue.rev).toBeCloseTo(pax * route.price * yieldPremium / ROUTE_REVENUE_DIVISOR);
    expect(revenue.cargoRev).toBeCloseTo(pax * 0.02 * route.price * 0.3 * yieldPremium / ROUTE_REVENUE_DIVISOR);
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

  it('applies fuel trait to route fuel and maintenance trait to operations budget', () => {
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
    expect(baseCost.maint).toBe(0);
    expect(maintCost.maint).toBe(0);
    expect(calcOpsBudgetCost(maintState).maintCost).toBeCloseTo(calcOpsBudgetCost(baseState).maintCost * 0.9);
  });

  it('applies subsidiary load-factor and airport landing-fee bonuses', () => {
    const baseState = initState('beijing', 'era3');
    const subState = initState('beijing', 'era3');
    const plane = { ...PLANES[0], seats: 10000, uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 };
    [baseState, subState].forEach((state) => {
      state.fleet.push({ ...plane });
    });
    subState.subsidiaries = {
      beijing: [
        { type: 'travel', openCost: 210, currentValue: 210, source: 'open', quarterAcquired: 0, cityLevelAtAcquire: 3, isNew: false },
        { type: 'airport', openCost: 2250, currentValue: 2250, source: 'invest', quarterAcquired: 0, cityLevelAtAcquire: 3, isNew: false },
      ],
    };
    const route = {
      from: 'beijing',
      to: 'shanghai',
      price: suggestedPrice('beijing', 'shanghai'),
      suggestedPrice: suggestedPrice('beijing', 'shanghai'),
      serviceMultiplier: 1,
      assignedPlanes: [1],
      loadFactor: 0,
    };

    const baseLf = calcLoadFactor(baseState, route, route.price, baseState.brand, 0);
    const subLf = calcLoadFactor(subState, route, route.price, subState.brand, 0);
    const baseCost = routeCost(baseState, route);
    const subCost = routeCost(subState, route);

    expect(subLf).toBeGreaterThan(baseLf);
    expect(subCost.landing).toBeCloseTo(baseCost.landing * 0.85);
    expect(subCost.total).toBeLessThan(baseCost.total);
  });

  it('applies airport fee tiers exactly once on top of the city landing baseline', () => {
    const state = initState('london', 'era3');
    const plane = { ...PLANES.find((item) => item.id === 'b777'), uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 };
    state.fleet.push(plane);
    const route = {
      from: 'london',
      to: 'newyork',
      price: suggestedPrice('london', 'newyork'),
      suggestedPrice: suggestedPrice('london', 'newyork'),
      serviceMultiplier: 1,
      assignedPlanes: [1],
      loadFactor: 0.5,
    };
    const neutral = routeCost(state, {
      ...route,
      fromAirportId: virtualAirportId('london'),
      toAirportId: virtualAirportId('newyork'),
    });
    const hub = routeCost(state, {
      ...route,
      fromAirportId: getDefaultAirportId('london'),
      toAirportId: getDefaultAirportId('newyork'),
    });

    expect(hub.landing / neutral.landing).toBeGreaterThan(1.18);
    expect(hub.landing / neutral.landing).toBeLessThan(1.22);
  });
});
