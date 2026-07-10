import { describe, expect, it } from 'vitest';

import { NEWS_POOL } from '../src/data/news.js';
import { PLANES } from '../src/data/planes.js';
import { getAirportByIdent } from '../src/domain/airports.js';
import { addAirportDisruptionModifier, routeCostMultiplier, routeDemandMultiplier } from '../src/domain/modifiers.js';
import {
  getRouteAlternateOptions,
  normalizeRouteAlternateState,
  routeAirportDisruptionProtection,
  setRouteAlternateAirport,
} from '../src/domain/airportResilience.js';
import { changeRoutePlane, openRoute } from '../src/domain/routes.js';
import { initState } from '../src/domain/state.js';

function widePlane(uid = 1) {
  return {
    ...PLANES.find((plane) => plane.id === 'b777'),
    uid,
    age: 0,
    isLease: false,
    leasePrice: 0,
    delivering: false,
    deliverIn: 0,
  };
}

function londonNewYorkState() {
  const state = initState('london', 'era3');
  state.year = 2005;
  state.cash = 10000;
  state.fleet = [widePlane()];
  const opened = openRoute(state, 'london', 'newyork', 1, 700, {
    fromAirportId: getAirportByIdent('EGLL').id,
    toAirportId: getAirportByIdent('KJFK').id,
  });
  expect(opened.ok).toBe(true);
  return { state, route: opened.route };
}

describe('airport alternates and resilience', () => {
  it('offers compatible nearby airports and charges only for an actual change', () => {
    const { state, route } = londonNewYorkState();
    const gatwick = getAirportByIdent('EGKK');
    const options = getRouteAlternateOptions(state, route, 'from');

    expect(options.some((option) => option.airport.id === gatwick.id && option.sameCity)).toBe(true);
    const before = state.cash;
    const selected = setRouteAlternateAirport(state, route.uid, 'from', gatwick.id);
    const repeated = setRouteAlternateAirport(state, route.uid, 'from', gatwick.id);

    expect(selected).toMatchObject({ ok: true, airportId: gatwick.id, cost: 0.5 });
    expect(repeated).toMatchObject({ ok: true, airportId: gatwick.id, cost: 0, unchanged: true });
    expect(state.cash).toBeCloseTo(before - 0.5);
    expect(routeAirportDisruptionProtection(state, route, route.fromAirportId)).toEqual({ alternate: true, resilience: 0 });
  });

  it('combines alternate planning and airport investment to soften disruption losses', () => {
    const { state, route } = londonNewYorkState();
    const heathrowId = route.fromAirportId;
    const gatwickId = getAirportByIdent('EGKK').id;
    addAirportDisruptionModifier(state, 'test disruption', [heathrowId]);

    expect(routeDemandMultiplier(state, route)).toBeCloseTo(0.25);
    expect(routeCostMultiplier(state, route)).toBeCloseTo(1.35);

    expect(setRouteAlternateAirport(state, route.uid, 'from', gatwickId).ok).toBe(true);
    expect(routeDemandMultiplier(state, route)).toBeCloseTo(0.75);
    expect(routeCostMultiplier(state, route)).toBeCloseTo(1.10);

    state.subsidiaries.london = [{
      type: 'airport',
      airportId: heathrowId,
      openCost: 100,
      currentValue: 100,
      source: 'invest',
      landingDiscount: 0.15,
      upgrades: { resilience: 1 },
      upgradeSlots: 3,
      isNew: false,
    }];
    expect(routeDemandMultiplier(state, route)).toBeCloseTo(0.85);
    expect(routeCostMultiplier(state, route)).toBeCloseTo(1.06);
  });

  it('clears invalid or inactive alternates while preserving valid assignments', () => {
    const { state, route } = londonNewYorkState();
    route.fromAlternateAirportId = getAirportByIdent('EGKK').id;
    route.toAlternateAirportId = route.toAirportId;

    normalizeRouteAlternateState(state);

    expect(route.fromAlternateAirportId).toBe(getAirportByIdent('EGKK').id);
    expect(route.toAlternateAirportId).toBeNull();
  });

  it('creates a stable airport-scoped disruption from the newspaper event', () => {
    const { state, route } = londonNewYorkState();
    const event = NEWS_POOL.disaster.find((item) => item.title === '枢纽机场遭遇极端天气中断');

    event.effectFn({ state, addAirportDisruptionModifier, random: () => 0 });

    expect(state.activeModifiers.at(-1)).toMatchObject({
      mode: 'airportDisruption',
      scope: { kind: 'airportIds', airportIds: [route.fromAirportId] },
      turnsRemaining: 1,
    });
  });

  it('clears an alternate that becomes incompatible after an aircraft change', () => {
    const { state, route } = londonNewYorkState();
    const londonCityId = getAirportByIdent('EGLC').id;
    state.fleet.push({
      ...PLANES.find((plane) => plane.id === 'b747-400'),
      uid: 2,
      age: 0,
      isLease: false,
      leasePrice: 0,
      delivering: false,
      deliverIn: 0,
    });
    state.planeIdCounter = 3;
    expect(setRouteAlternateAirport(state, route.uid, 'from', londonCityId).ok).toBe(true);

    expect(changeRoutePlane(state, 'london', 'newyork', 2).ok).toBe(true);

    expect(route.fromAlternateAirportId).toBeNull();
  });
});
