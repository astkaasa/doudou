import { describe, expect, it } from 'vitest';

import { DEFAULT_AIRPORT_IDS } from '../src/data/airports.generated.js';
import { PLANES } from '../src/data/planes.js';
import { airportDistanceKm, airportDisplayCode, getAirportsForCity } from '../src/domain/airports.js';
import { planeAirportPerformance, routePlanePerformance } from '../src/domain/airportPerformance.js';
import { routeOperatingDistance, routeSeatCapacity } from '../src/domain/economy.js';
import { openRoute } from '../src/domain/routes.js';
import { initState } from '../src/domain/state.js';

function airportByCode(cityId, code) {
  return getAirportsForCity(cityId, { includeInactive: true })
    .find((airport) => airportDisplayCode(airport) === code);
}

describe('airport operating performance', () => {
  it('uses airport coordinates for operating distance while retaining city endpoints', () => {
    const route = {
      from: 'london',
      to: 'newyork',
      fromAirportId: DEFAULT_AIRPORT_IDS.london,
      toAirportId: DEFAULT_AIRPORT_IDS.newyork,
    };
    expect(routeOperatingDistance(route)).toBeCloseTo(
      airportDistanceKm(route.fromAirportId, route.toAirportId),
    );
    expect(routeOperatingDistance(route)).toBeGreaterThan(5000);
  });

  it('reduces payload at high-altitude airports and rejects clearly unsafe runway combinations', () => {
    const wide = PLANES.find((plane) => plane.id === 'b777');
    const superjumbo = PLANES.find((plane) => plane.id === 'b747-400');
    const lhasa = airportByCode('lhasa', 'LXA');
    const londonCity = airportByCode('london', 'LCY');

    const lhasaPerformance = planeAirportPerformance(wide, lhasa);
    expect(lhasaPerformance.compatible).toBe(true);
    expect(lhasaPerformance.factor).toBeLessThan(1);
    expect(lhasaPerformance.reasons.join(' ')).toContain('高原');
    expect(planeAirportPerformance(superjumbo, londonCity)).toMatchObject({ compatible: false, factor: 0 });
  });

  it('applies the limiting endpoint factor to effective route seats', () => {
    const plane = PLANES.find((item) => item.id === 'b777');
    const route = {
      from: 'lhasa',
      to: 'beijing',
      fromAirportId: DEFAULT_AIRPORT_IDS.lhasa,
      toAirportId: DEFAULT_AIRPORT_IDS.beijing,
      assignedPlanes: [1],
    };
    const fleetPlane = { ...plane, uid: 1 };
    const performance = routePlanePerformance(route, fleetPlane);

    expect(performance.compatible).toBe(true);
    expect(routeSeatCapacity({ fleet: [fleetPlane] }, route)).toBe(Math.floor(plane.seats * performance.factor));
    expect(routeSeatCapacity({ fleet: [fleetPlane] }, route)).toBeLessThan(plane.seats);
  });

  it('rejects a selected airport that the assigned aircraft cannot safely use', () => {
    const state = initState('london', 'era3');
    const plane = { ...PLANES.find((item) => item.id === 'b747-400'), uid: 1, delivering: false, deliverIn: 0 };
    state.fleet.push(plane);
    const londonCity = airportByCode('london', 'LCY');

    const result = openRoute(state, 'london', 'paris', 1, 500, {
      fromAirportId: londonCity.id,
      toAirportId: DEFAULT_AIRPORT_IDS.paris,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('机场条件不适配');
    expect(state.routes).toHaveLength(0);
  });
});
