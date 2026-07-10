import { describe, expect, it } from 'vitest';

import { AIRPORTS } from '../src/data/airports.generated.js';
import { PLANES } from '../src/data/planes.js';
import {
  airportCapacityPoints,
  airportCapacitySnapshot,
  routeCapacityCostMultiplier,
  routeCapacityDemandMultiplier,
  routeHubDemandMultiplier,
  routeOpeningCapacityMultiplier,
} from '../src/domain/airportCapacity.js';
import { planeAirportPerformance } from '../src/domain/airportPerformance.js';
import { airportDisplayCode, getAirport, getDefaultAirportId } from '../src/domain/airports.js';
import { upgradeAirportInvestment } from '../src/domain/airportManagement.js';
import { calcLoadFactor, routeCost, routeRevenue, suggestedPrice } from '../src/domain/economy.js';
import { normalizeSubsidiaryState } from '../src/domain/subsidiaries.js';
import { initState } from '../src/domain/state.js';

function fleetPlane(uid, overrides = {}) {
  return {
    ...PLANES.find((plane) => plane.id === 'b737-200'),
    uid,
    age: 0,
    isLease: false,
    delivering: false,
    deliverIn: 0,
    ...overrides,
  };
}

describe('airport capacity and hub operations', () => {
  it('adds terminal capacity through a slot-limited airport investment upgrade', () => {
    const airport = AIRPORTS.find((item) => item.source.provider === 'ourairports' && item.gameplay.capacityTier === 1);
    const state = initState(airport.cityId, 'era3');
    state.cash = 1000;
    state.subsidiaries = {
      [airport.cityId]: [{
        type: 'airport',
        airportId: airport.id,
        openCost: 100,
        currentValue: 100,
        source: 'invest',
        isNew: false,
      }],
    };
    normalizeSubsidiaryState(state);

    expect(airportCapacityPoints(state, airport.id)).toBe(12);
    expect(upgradeAirportInvestment(state, airport.id, 'terminal')).toMatchObject({ ok: true, cost: 18 });
    expect(airportCapacityPoints(state, airport.id)).toBe(20);
    expect(upgradeAirportInvestment(state, airport.id, 'terminal').ok).toBe(false);
  });

  it('turns overload into graduated cost, demand, and opening pressure', () => {
    const airport = AIRPORTS.find((item) => item.source.provider === 'ourairports' && item.gameplay.capacityTier === 1);
    const state = initState(airport.cityId, 'era3');
    const destinations = ['beijing', 'tokyo', 'dubai', 'london'].filter((cityId) => cityId !== airport.cityId);
    state.fleet = destinations.map((_, index) => fleetPlane(index + 1));
    state.routes = destinations.map((to, index) => ({
      uid: index + 1,
      from: airport.cityId,
      to,
      fromAirportId: airport.id,
      toAirportId: getDefaultAirportId(to),
      assignedPlanes: [index + 1],
      serviceMultiplier: 4,
      suspended: false,
    }));

    const snapshot = airportCapacitySnapshot(state, airport.id);
    expect(snapshot.used).toBeGreaterThan(snapshot.capacity);
    expect(snapshot.congested).toBe(true);
    expect(routeCapacityCostMultiplier(state, state.routes[0])).toBeGreaterThan(1);
    expect(routeCapacityDemandMultiplier(state, state.routes[0])).toBeLessThan(1);
    expect(routeOpeningCapacityMultiplier(state, {
      ...state.routes[0],
      uid: 99,
      to: 'sydney',
      toAirportId: getDefaultAirportId('sydney'),
    }, state.fleet[0])).toBeGreaterThan(1);
  });

  it('rewards a diverse hub only while capacity headroom remains', () => {
    const state = initState('london', 'era3');
    const lhr = getDefaultAirportId('london');
    const destinations = ['newyork', 'tokyo', 'dubai'];
    state.fleet = destinations.map((_, index) => fleetPlane(index + 1, { range: 15000 }));
    state.routes = destinations.map((to, index) => ({
      uid: index + 1,
      from: 'london',
      to,
      fromAirportId: lhr,
      toAirportId: getDefaultAirportId(to),
      assignedPlanes: [index + 1],
      serviceMultiplier: 1,
      suspended: false,
    }));

    const multiplier = routeHubDemandMultiplier(state, state.routes[0]);
    expect(multiplier).toBeGreaterThan(1);
    expect(multiplier).toBeLessThanOrEqual(1.12);
  });

  it('lets a runway upgrade reduce an existing short-runway penalty', () => {
    const lcy = AIRPORTS.find((airport) => airportDisplayCode(airport) === 'LCY');
    const wide = fleetPlane(1, { ...PLANES.find((plane) => plane.id === 'b777') });
    const state = initState('london', 'era3');
    state.cash = 10000;
    state.subsidiaries = {
      london: [{
        type: 'airport',
        airportId: lcy.id,
        openCost: 1000,
        currentValue: 1000,
        source: 'invest',
        isNew: false,
      }],
    };
    normalizeSubsidiaryState(state);
    const before = planeAirportPerformance(wide, getAirport(lcy.id), state);

    expect(upgradeAirportInvestment(state, lcy.id, 'runway').ok).toBe(true);
    const after = planeAirportPerformance(wide, getAirport(lcy.id), state);

    expect(before.compatible).toBe(true);
    expect(after.factor).toBeGreaterThan(before.factor);
  });

  it('applies distinct cargo, access, and maintenance upgrade effects within three slots', () => {
    const state = initState('london', 'era3');
    const lhr = getDefaultAirportId('london');
    const plane = fleetPlane(1, { ...PLANES.find((item) => item.id === 'b777') });
    state.cash = 10000;
    state.fleet = [plane];
    state.subsidiaries = {
      london: [{
        type: 'airport',
        airportId: lhr,
        openCost: 1000,
        currentValue: 1000,
        source: 'invest',
        isNew: false,
      }],
    };
    normalizeSubsidiaryState(state);
    const route = {
      uid: 1,
      from: 'london',
      to: 'newyork',
      fromAirportId: lhr,
      toAirportId: getDefaultAirportId('newyork'),
      price: suggestedPrice('london', 'newyork'),
      suggestedPrice: suggestedPrice('london', 'newyork'),
      serviceMultiplier: 1,
      assignedPlanes: [1],
      loadFactor: 0.5,
      suspended: false,
    };

    const baseCargo = routeRevenue(state, route).cargoRev;
    expect(upgradeAirportInvestment(state, lhr, 'cargo').ok).toBe(true);
    expect(routeRevenue(state, route).cargoRev).toBeGreaterThan(baseCargo);

    const baseLoad = calcLoadFactor(state, route, route.price, state.brand, 0);
    expect(upgradeAirportInvestment(state, lhr, 'ground_access').ok).toBe(true);
    expect(calcLoadFactor(state, route, route.price, state.brand, 0)).toBeGreaterThan(baseLoad);

    const baseCost = routeCost(state, route).total;
    expect(upgradeAirportInvestment(state, lhr, 'maintenance').ok).toBe(true);
    expect(routeCost(state, route).total).toBeLessThan(baseCost);
    expect(upgradeAirportInvestment(state, lhr, 'runway')).toMatchObject({ ok: false, message: '机场升级槽位已用完' });
  });
});
