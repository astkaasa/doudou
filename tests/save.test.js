import { describe, expect, it } from 'vitest';

import { loadGameState, saveGameState } from '../src/domain/save.js';

function memoryStorage(value) {
  return {
    getItem(key) {
      return key === 'skyline_save' ? value : null;
    },
    setItem() {},
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

  it('adds branch, loan, and lease defaults to older saves', () => {
    const raw = JSON.stringify({
      v: 5,
      g: {
        hq: 'beijing',
        routes: [],
        branches: ['shanghai', 'missing-city', 'shanghai', 'beijing'],
        lastNewspaperHtml: '<p>legacy</p>',
        _lastReportData: { rev: 1 },
        fleet: [{ uid: 1, name: 'A320', isLease: true }],
      },
    });

    const result = loadGameState(memoryStorage(raw));

    expect(result.ok).toBe(true);
    expect(result.state.loan).toBe(0);
    expect(result.state.loanRate).toBe(0.02);
    expect(result.state.branches).toEqual(['shanghai']);
    expect(result.state.lastNewspaperHtml).toBeUndefined();
    expect(result.state._lastReportData).toBeUndefined();
    expect(result.state.lastReportData).toEqual({ rev: 1 });
    expect(result.state.redPacketClaimed).toBe(false);
    expect(result.state.fleet[0]).toMatchObject({
      leaseTurns: 0,
      maxLeaseTurns: 40,
      delivering: false,
      deliverIn: 0,
    });
  });

  it('persists official report data while dropping legacy transient report cache', () => {
    const storage = writableStorage();
    const state = {
      companyName: '豆豆航空',
      year: 2000,
      quarter: 1,
      cash: 100,
      routes: [],
      fleet: [],
      lastReportData: { rev: 2, snapshot: { cash: 100 } },
      _lastReportData: { rev: 1, snapshot: { cash: 100 } },
    };

    saveGameState(state, storage);
    const saved = JSON.parse(storage.getItem('skyline_save'));

    expect(saved.g._lastReportData).toBeUndefined();
    expect(saved.g.lastReportData).toEqual({ rev: 2, snapshot: { cash: 100 } });
  });
});
