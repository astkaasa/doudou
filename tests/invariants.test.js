import { describe, expect, it } from 'vitest';

import { ERAS } from '../src/data/eras.js';
import { availablePlaneTemplates, buyPlane } from '../src/domain/fleet.js';
import { advanceTurnState } from '../src/domain/turn.js';
import { assertGameState, validateGameState, validateStaticData } from '../src/domain/invariants.js';
import { openRoute } from '../src/domain/routes.js';
import { initState, seedInitialFleet } from '../src/domain/state.js';

describe('static data invariants', () => {
  it('keeps cross-file identifiers and numeric data valid', () => {
    expect(validateStaticData()).toEqual([]);
  });
});

describe('game state invariants', () => {
  it.each(ERAS.map((era) => [era.id]))('creates a valid initialized state for %s', (eraId) => {
    const state = initState('beijing', eraId);
    seedInitialFleet(state);

    expect(validateGameState(state)).toEqual([]);
    expect(assertGameState(state)).toBe(state);
  });

  it('remains valid through repeated quarter advancement', () => {
    const state = initState('beijing', 'era3');
    seedInitialFleet(state);

    for (let turn = 0; turn < 24; turn++) {
      advanceTurnState(state);
      expect(validateGameState(state)).toEqual([]);
    }
  });

  it('remains valid after normal fleet and route mutations', () => {
    const state = initState('beijing', 'era3', { seed: 'invariant-actions' });
    seedInitialFleet(state);
    const template = availablePlaneTemplates(state)[0];

    expect(buyPlane(state, template.id, false).ok).toBe(true);
    expect(openRoute(state, 'beijing', 'shanghai', state.fleet[0].uid, 800).ok).toBe(true);
    expect(validateGameState(state)).toEqual([]);
  });

  it('reports route, fleet, base, and numeric corruption together', () => {
    const state = initState('beijing', 'era3');
    seedInitialFleet(state);
    state.cash = Number.NaN;
    state.branches = ['missing-city'];
    state.routes = [{
      from: 'missing-city',
      to: 'beijing',
      price: 0,
      serviceMultiplier: 0,
      assignedPlanes: [999],
    }];

    const issues = validateGameState(state);

    expect(issues).toEqual(expect.arrayContaining([
      'state.cash must be finite',
      'state.branches[0] references unknown city missing-city',
      'state.routes[0].from references unknown city missing-city',
      'state.routes[0].price must be a positive finite number',
      'state.routes[0].assignedPlanes[0] references missing fleet uid 999',
    ]));
    expect(() => assertGameState(state)).toThrow(/Invalid game state/);
  });
});
