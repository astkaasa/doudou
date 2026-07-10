import { describe, expect, it } from 'vitest';

import { PLANES } from '../src/data/planes.js';
import {
  airportDisplayCode,
  getAirportByIdent,
  getDefaultAirportIdForYear,
  isAirportActive,
} from '../src/domain/airports.js';
import {
  getPendingAirportRelocations,
  previewAirportRelocation,
  resolveAirportRelocation,
  syncAiAirportClosures,
  syncAirportRelocations,
} from '../src/domain/airportRelocations.js';
import { addAirportRelation, airportRelation } from '../src/domain/airportManagement.js';
import { assertGameState } from '../src/domain/invariants.js';
import { openRoute } from '../src/domain/routes.js';
import { initState } from '../src/domain/state.js';
import { advanceTurnState } from '../src/domain/turn.js';

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

describe('historical airport activation and relocation', () => {
  it('selects the verified primary airport for each historical year', () => {
    expect(airportDisplayCode(getDefaultAirportIdForYear('tokyo', 1977))).toBe('HND');
    expect(airportDisplayCode(getDefaultAirportIdForYear('tokyo', 1978))).toBe('NRT');
    expect(airportDisplayCode(getDefaultAirportIdForYear('seoul', 2000))).toBe('GMP');
    expect(airportDisplayCode(getDefaultAirportIdForYear('seoul', 2001))).toBe('ICN');
    expect(airportDisplayCode(getDefaultAirportIdForYear('taipei', 1978))).toBe('TSA');
    expect(airportDisplayCode(getDefaultAirportIdForYear('taipei', 1979))).toBe('TPE');
    expect(airportDisplayCode(getDefaultAirportIdForYear('osaka', 1993))).toBe('ITM');
    expect(airportDisplayCode(getDefaultAirportIdForYear('osaka', 1994))).toBe('KIX');
    expect(airportDisplayCode(getDefaultAirportIdForYear('bangkok', 2005))).toBe('DMK');
    expect(airportDisplayCode(getDefaultAirportIdForYear('bangkok', 2006))).toBe('BKK');
    expect(airportDisplayCode(getDefaultAirportIdForYear('singapore', 1980))).toBe('QPG');
    expect(airportDisplayCode(getDefaultAirportIdForYear('singapore', 1981))).toBe('SIN');
    expect(getDefaultAirportIdForYear('hongkong', 1997)).toBe(getAirportByIdent('KAI-TAK').id);
    expect(getDefaultAirportIdForYear('hongkong', 1998)).toBe(getAirportByIdent('VHHH').id);
    expect(airportDisplayCode(getDefaultAirportIdForYear('shanghai', 1998))).toBe('SHA');
    expect(airportDisplayCode(getDefaultAirportIdForYear('shanghai', 1999))).toBe('PVG');
    expect(airportDisplayCode(getDefaultAirportIdForYear('beijing', 2018))).toBe('PEK');
    expect(isAirportActive(getAirportByIdent('ZBAD'), 2018)).toBe(false);
    expect(isAirportActive(getAirportByIdent('ZBAD'), 2019)).toBe(true);
    expect(airportDisplayCode(getDefaultAirportIdForYear('paris', 1973))).toBe('ORY');
    expect(airportDisplayCode(getDefaultAirportIdForYear('paris', 1974))).toBe('CDG');
    expect(airportDisplayCode(getDefaultAirportIdForYear('dallas', 1973))).toBe('DAL');
    expect(airportDisplayCode(getDefaultAirportIdForYear('dallas', 1974))).toBe('DFW');
    expect(isAirportActive(getAirportByIdent('RJAA'), 1977)).toBe(false);
    expect(isAirportActive(getAirportByIdent('RJAA'), 1978)).toBe(true);
  });

  it('creates one mandatory Kai Tak relocation and preserves route identity and investment value', () => {
    const state = initState('beijing', 'era4');
    state.year = 1997;
    state.cash = 10000;
    state.fleet = [widePlane()];
    state.planeIdCounter = 2;
    const kaiTak = getAirportByIdent('KAI-TAK');
    const chekLapKok = getAirportByIdent('VHHH');
    const opened = openRoute(state, 'beijing', 'hongkong', 1, 400, { toAirportId: kaiTak.id });
    expect(opened.ok).toBe(true);
    const routeUid = opened.route.uid;
    state.subsidiaries = {
      hongkong: [{
        type: 'airport',
        airportId: kaiTak.id,
        openCost: 1000,
        currentValue: 1200,
        source: 'invest',
        landingDiscount: 0.2,
        upgrades: { terminal: 1 },
        upgradeSlots: 3,
        isNew: false,
      }],
    };
    addAirportRelation(state, kaiTak.id, 20);
    state.year = 1998;

    const created = syncAirportRelocations(state);
    const pending = getPendingAirportRelocations(state)[0];

    expect(created).toHaveLength(1);
    expect(pending).toMatchObject({
      transitionId: 'hongkong-cheklapkok-1998',
      fromAirportId: kaiTak.id,
      toAirportId: chekLapKok.id,
      mandatory: true,
      status: 'pending',
    });
    expect(advanceTurnState(state)).toBeNull();
    expect(previewAirportRelocation(state, pending).canRelocate).toBe(true);
    const result = resolveAirportRelocation(state, pending.id, 'relocate');

    expect(result.ok).toBe(true);
    expect(state.routes[0]).toMatchObject({ uid: routeUid, toAirportId: chekLapKok.id });
    expect(state.subsidiaries.hongkong[0]).toMatchObject({
      airportId: chekLapKok.id,
      migratedFromAirportId: kaiTak.id,
      landingDiscount: 0.2,
      upgrades: { terminal: 1 },
    });
    expect(airportRelation(state, chekLapKok.id)).toBe(20);
    expect(syncAirportRelocations(state)).toHaveLength(0);
    expect(state.airportRelocations).toHaveLength(1);
    assertGameState(state);
  });

  it('allows an optional new-hub migration to be explicitly declined once', () => {
    const state = initState('beijing', 'era4');
    state.year = 1977;
    state.cash = 10000;
    state.fleet = [widePlane()];
    const haneda = getAirportByIdent('RJTT');
    expect(openRoute(state, 'beijing', 'tokyo', 1, 300, { toAirportId: haneda.id }).ok).toBe(true);
    state.year = 1978;
    syncAirportRelocations(state);
    const pending = getPendingAirportRelocations(state)[0];

    expect(pending.mandatory).toBe(false);
    expect(previewAirportRelocation(state, pending).canContinue).toBe(true);
    expect(resolveAirportRelocation(state, pending.id, 'continue').ok).toBe(true);
    expect(state.routes[0].toAirportId).toBe(haneda.id);
    expect(syncAirportRelocations(state)).toHaveLength(0);
    expect(state.airportRelocations[0].status).toBe('continued');
  });

  it('automatically relocates compatible AI routes away from a closed historical airport', () => {
    const state = initState('beijing', 'era4');
    state.year = 1998;
    const kaiTak = getAirportByIdent('KAI-TAK');
    const chekLapKok = getAirportByIdent('VHHH');
    const plane = { ...widePlane('ai-wide'), uid: 'ai-wide' };
    state.ai[0].fleet = [plane];
    state.ai[0].routes = [{
      uid: 'ai-route-1',
      from: 'beijing',
      to: 'hongkong',
      fromAirportId: getDefaultAirportIdForYear('beijing', 1998),
      toAirportId: kaiTak.id,
      assignedPlane: plane.uid,
      price: 400,
    }];

    const result = syncAiAirportClosures(state);

    expect(result).toEqual({ relocated: 1, closed: 0 });
    expect(state.ai[0].routes[0]).toMatchObject({
      uid: 'ai-route-1',
      toAirportId: chekLapKok.id,
      assignedPlane: plane.uid,
    });
    expect(syncAiAirportClosures(state)).toEqual({ relocated: 0, closed: 0 });
  });
});
