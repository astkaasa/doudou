import { describe, expect, it } from 'vitest';

import { loadGameState } from '../src/domain/save.js';

function memoryStorage(value) {
  return {
    getItem(key) {
      return key === 'skyline_save' ? value : null;
    },
    setItem() {},
  };
}

describe('save migration', () => {
  it('migrates legacy route fields to active modifiers', () => {
    const raw = JSON.stringify({
      v: 5,
      g: {
        routes: [{
          from: 'beijing',
          to: 'tokyo',
          suspendedTurns: 1,
          demandMultiplier: 0.8,
          demandModifierTurns: 2,
          costMultiplier: 1.2,
          costModifierTurns: 3,
        }],
      },
    });

    const result = loadGameState(memoryStorage(raw));

    expect(result.ok).toBe(true);
    expect(result.state.routes[0].suspendedTurns).toBeUndefined();
    expect(result.state.routes[0].demandMultiplier).toBeUndefined();
    expect(result.state.routes[0].costMultiplier).toBeUndefined();
    expect(result.state.activeModifiers).toHaveLength(3);
    expect(result.state.activeModifiers.map((m) => m.type).sort()).toEqual(['cost', 'demand', 'suspension']);
    expect(result.state.activeModifiers.every((m) => m.scope.routeKeys[0] === 'beijing-tokyo')).toBe(true);
    expect(result.state.activeModifiers.map((m) => m.id)).toEqual(['modifier-1', 'modifier-2', 'modifier-3']);
    expect(result.state.modifierIdCounter).toBe(4);
  });
});
