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

  it('adds branch, construction, milestone, loan, and lease defaults to older saves', () => {
    const raw = JSON.stringify({
      v: 5,
      g: {
        hq: 'beijing',
        branches: ['shanghai', 'missing-city', 'shanghai', 'beijing'],
        branchesConstructing: [{ cityId: 'tokyo', constructIn: 2 }, { cityId: 'missing-city', constructIn: 1 }, { cityId: 'shanghai', constructIn: 1 }],
        milestones: { first_route: true, missing: true, routes_5: false },
        lastNewspaperHtml: '<p>legacy</p>',
        _lastReportData: { rev: 1 },
        fleet: [{ uid: 1, name: 'A320', isLease: true }],
        playerTrait: '豆',
        pendingTraitChoices: ['辣', 'bad', '机'],
        routes: [{ from: 'beijing', to: 'shanghai', frequency: 2 }],
      },
    });

    const result = loadGameState(memoryStorage(raw));

    expect(result.ok).toBe(true);
    expect(result.state.loan).toBe(0);
    expect(result.state.loanRate).toBe(0.02);
    expect(result.state.branches).toEqual(['shanghai']);
    expect(result.state.branchesConstructing).toEqual([{ cityId: 'tokyo', constructIn: 2 }]);
    expect(result.state.cityStates.beijing).toEqual({ pop: 5.5, biz: 30, tour: 22 });
    expect(result.state.milestones).toEqual({ first_route: true });
    expect(result.state.mainQuest).toEqual({
      currentStage: 1,
      stageCompleted: [],
      victoryGrade: null,
      victoryTurn: null,
    });
    expect(result.state.lastNewspaperHtml).toBeUndefined();
    expect(result.state._lastReportData).toBeUndefined();
    expect(result.state.lastReportData).toEqual({ rev: 1 });
    expect(result.state.redPacketClaimed).toBe(false);
    expect(result.state.playerTrait).toBe('豆');
    expect(result.state.traitChosen).toBe(true);
    expect(result.state.pendingTraitChoices).toBeNull();
    expect(result.state.routes[0]).toMatchObject({ assignedPlanes: [], suspended: false, isNew: false, serviceMultiplier: 2 });
    expect(result.state.routes[0].frequency).toBeUndefined();
    expect(result.state.routes[0].suggestedPrice).toBeGreaterThan(0);
    expect(result.state.routes[0].price).toBe(result.state.routes[0].suggestedPrice);
    expect(result.state.fleet[0]).toMatchObject({
      leaseTurns: 0,
      maxLeaseTurns: 40,
      delivering: false,
      deliverIn: 0,
    });
  });

  it('keeps only complete valid pending trait choices in older saves', () => {
    const validRaw = JSON.stringify({
      v: 6,
      g: {
        hq: 'beijing',
        routes: [],
        fleet: [],
        pendingTraitChoices: ['辣', '机', '豆'],
      },
    });
    const invalidRaw = JSON.stringify({
      v: 6,
      g: {
        hq: 'beijing',
        routes: [],
        fleet: [],
        pendingTraitChoices: ['辣', 'bad'],
      },
    });

    expect(loadGameState(memoryStorage(validRaw)).state.pendingTraitChoices).toEqual(['辣', '机', '豆']);
    expect(loadGameState(memoryStorage(invalidRaw)).state.pendingTraitChoices).toBeNull();
  });

  it('adds normalized stock state to older saves without granting starter holdings', () => {
    const raw = JSON.stringify({
      v: 8,
      g: {
        era: 'era3',
        routes: [],
        fleet: [],
        stocks: {
          lan_royal_bank: { price: 130, prevPrice: 128, history: [128, 130] },
        },
        portfolio: {
          lan_royal_bank: { shares: 200, avgCost: 120 },
          missing_stock: { shares: 1, avgCost: 1 },
        },
      },
    });

    const result = loadGameState(memoryStorage(raw));

    expect(result.ok).toBe(true);
    expect(result.state.stocks.lan_royal_bank).toEqual({ price: 130, prevPrice: 128, history: [128, 130] });
    expect(result.state.stocks.qw_eco).toEqual({ price: 123, prevPrice: 123, history: [123] });
    expect(result.state.portfolio).toEqual({ lan_royal_bank: { shares: 100, avgCost: 120 } });
    expect(result.state.stockEvents).toEqual([]);
    expect(result.state._lastStockDividend).toBe(0);
  });

  it('normalizes main quest state from older or malformed saves', () => {
    const raw = JSON.stringify({
      v: 9,
      g: {
        routes: [],
        fleet: [],
        mainQuest: {
          currentStage: 99,
          stageCompleted: [1, 1, 4, '2'],
          victoryGrade: 'Z',
          victoryTurn: -1,
        },
      },
    });

    const result = loadGameState(memoryStorage(raw));

    expect(result.ok).toBe(true);
    expect(result.state.mainQuest).toEqual({
      currentStage: 3,
      stageCompleted: [1, 2],
      victoryGrade: null,
      victoryTurn: null,
    });
  });

  it('initializes missing stock prices for old saves with an empty portfolio', () => {
    const raw = JSON.stringify({
      v: 8,
      g: {
        era: 'era2',
        routes: [],
        fleet: [],
      },
    });

    const result = loadGameState(memoryStorage(raw));

    expect(result.ok).toBe(true);
    expect(result.state.stocks.wuer_media.price).toBe(52);
    expect(result.state.stocks.hhyy_tech.price).toBe(80);
    expect(result.state.stocks.qw_eco).toBeUndefined();
    expect(result.state.portfolio).toEqual({});
  });

  it('adds new city markets and rebuilds active mega events for old saves', () => {
    const raw = JSON.stringify({
      v: 8,
      g: {
        era: 'era3',
        year: 2000,
        quarter: 3,
        routes: [],
        fleet: [],
        cityStates: {
          beijing: { pop: 10.5, biz: 68, tour: 47 },
        },
      },
    });

    const result = loadGameState(memoryStorage(raw));

    expect(result.ok).toBe(true);
    expect(result.state.cityStates.rio).toEqual({ pop: 6.7, biz: 35, tour: 55 });
    expect(result.state.cityStates.hannover).toEqual({ pop: 0.5, biz: 38, tour: 15 });
    expect(result.state.activeMegaEvents.map((event) => event.id)).toEqual(expect.arrayContaining(['oly_s2000', 'expo_2000']));
    expect(result.state.activeModifiers.filter((modifier) => modifier.mode === 'megaEvent')).toHaveLength(2);
    expect(result.state.bankruptRescued).toBe(false);
    expect(result.state.staffNeeded).toBeGreaterThan(0);
    expect(result.state.staffCount).toBeGreaterThan(0);
    expect(result.state.staffMorale).toBe(40);
    expect(result.state.serviceTier).toBe('mid');
    expect(result.state.maintTier).toBe('mid');
    expect(result.state.adTier).toBe('mid');
    expect(result.state._pendingRecruit).toBe(false);
    expect(result.state._pendingBonus).toBe(false);
  });

  it('migrates legacy pending operations modal into contract flags', () => {
    const raw = JSON.stringify({
      v: 9,
      g: {
        routes: [],
        fleet: [],
        _pendingOpsModal: 'bonus',
      },
    });

    const result = loadGameState(memoryStorage(raw));

    expect(result.ok).toBe(true);
    expect(result.state._pendingOpsModal).toBeUndefined();
    expect(result.state._pendingRecruit).toBe(false);
    expect(result.state._pendingBonus).toBe(true);
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

  it('persists milestone progress', () => {
    const storage = writableStorage();
    const state = {
      companyName: '豆豆航空',
      year: 2000,
      quarter: 1,
      cash: 100,
      routes: [],
      fleet: [],
      milestones: { first_route: true },
    };

    saveGameState(state, storage);
    const result = loadGameState(storage);

    expect(result.ok).toBe(true);
    expect(result.state.milestones).toEqual({ first_route: true });
  });
});
