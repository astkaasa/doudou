import { describe, expect, it } from 'vitest';

import { createRandomState, nextRandom } from '../src/domain/random.js';
import { loadGameState, SAVE_VERSION, saveGameState, serializeGameState } from '../src/domain/save.js';
import { initState, seedInitialFleet } from '../src/domain/state.js';
import { advanceTurnState } from '../src/domain/turn.js';

describe('deterministic game randomness', () => {
  it('produces the same sequence for the same seed', () => {
    const first = { rng: createRandomState('repeatable') };
    const second = { rng: createRandomState('repeatable') };

    const firstDraws = Array.from({ length: 8 }, () => nextRandom(first));
    const secondDraws = Array.from({ length: 8 }, () => nextRandom(second));

    expect(firstDraws).toEqual(secondDraws);
    expect(first.rng).toEqual(second.rng);
    expect(first.rng.draws).toBe(8);
  });

  it('keeps full quarter progression identical across seeded games', () => {
    const first = initializedGame('quarter-sequence');
    const second = initializedGame('quarter-sequence');

    for (let turn = 0; turn < 16; turn++) {
      advanceTurnState(first);
      advanceTurnState(second);
    }

    expect(serializeGameState(first)).toEqual(serializeGameState(second));
    expect(first.rng.draws).toBeGreaterThan(0);
  });

  it('continues the same random sequence after save and load', () => {
    const storage = writableStorage();
    const uninterrupted = initializedGame(20260710);
    for (let turn = 0; turn < 4; turn++) advanceTurnState(uninterrupted);
    saveGameState(uninterrupted, storage);
    const resumed = loadGameState(storage).state;

    for (let turn = 0; turn < 12; turn++) {
      advanceTurnState(uninterrupted);
      advanceTurnState(resumed);
    }

    expect(serializeGameState(resumed)).toEqual(serializeGameState(uninterrupted));
  });

  it('derives a stable RNG state when migrating a v12 save', () => {
    const raw = JSON.stringify({
      v: 12,
      g: { companyName: '旧航空', era: 'era2', hq: 'shanghai', year: 1980, quarter: 2, turnsPlayed: 20, routes: [], fleet: [] },
    });

    const first = loadGameState(readOnlyStorage(raw));
    const second = loadGameState(readOnlyStorage(raw));

    expect(first).toMatchObject({ ok: true, version: SAVE_VERSION, migratedFrom: 12 });
    expect(first.state.rng).toEqual(second.state.rng);
  });
});

function initializedGame(seed) {
  const state = initState('beijing', 'era3', { seed });
  seedInitialFleet(state);
  return state;
}

function readOnlyStorage(value) {
  return {
    getItem(key) {
      return key === 'skyline_save' ? value : null;
    },
  };
}

function writableStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}
