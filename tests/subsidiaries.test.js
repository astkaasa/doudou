import { describe, expect, it } from 'vitest';

import {
  acquireSubsidiary,
  calcCompanyValue,
  calcSubOpenCost,
  calcSubReturn,
  getAcquirePrice,
  getAllSubsidiaries,
  getAvailableSubTypes,
  getSubLFBonus,
  getSubLandingDiscount,
  handleBankruptcy,
  normalizeSubsidiaryState,
  openSubsidiary,
  sellSubsidiary,
  settleSubsidiaryQuarter,
} from '../src/domain/subsidiaries.js';
import { initState } from '../src/domain/state.js';

describe('subsidiary domain', () => {
  it('opens, acquires, and prevents duplicate city subsidiaries', () => {
    const state = initState('beijing', 'era3');
    state.cash = 1000;

    const open = openSubsidiary(state, 'shuttle', 'beijing');
    expect(open).toMatchObject({ ok: true, cost: 60, fee: 0.6, totalCost: 60.6 });
    expect(state.cash).toBeCloseTo(939.4);
    expect(state.subsidiaries.beijing[0]).toMatchObject({ type: 'shuttle', source: 'open', isNew: true });
    expect(openSubsidiary(state, 'shuttle', 'beijing')).toMatchObject({ ok: false });

    const acquireCost = getAcquirePrice(state, 'hotel', 'beijing');
    const acquire = acquireSubsidiary(state, 'hotel', 'beijing');
    expect(acquire).toMatchObject({ ok: true, cost: acquireCost, fee: Math.round(acquireCost * 0.01 * 10) / 10 });
    expect(state.subsidiaries.beijing.map((sub) => sub.type)).toEqual(['shuttle', 'hotel']);
    expect(acquireSubsidiary(state, 'airport', 'beijing')).toMatchObject({ ok: false });
  });

  it('filters available types by city market and base requirements', () => {
    const state = initState('beijing', 'era3');

    expect(getAvailableSubTypes(state, 'beijing')).toEqual(['shuttle', 'hotel', 'travel', 'dutyfree', 'airport']);
    expect(getAvailableSubTypes(state, 'shanghai')).toEqual(['shuttle', 'hotel', 'travel', 'dutyfree']);
  });

  it('settles value changes and skips new subsidiaries for one quarter', () => {
    const state = initState('beijing', 'era3');
    state.routes = [{ from: 'beijing', to: 'shanghai', revenue: 100, profit: 20 }];
    state.subsidiaries = {
      beijing: [{ type: 'hotel', openCost: 150, currentValue: 150, source: 'open', quarterAcquired: 0, cityLevelAtAcquire: 3, isNew: true }],
      shanghai: [{ type: 'travel', openCost: 210, currentValue: 210, source: 'open', quarterAcquired: 0, cityLevelAtAcquire: 3, isNew: false }],
    };

    const first = settleSubsidiaryQuarter(state);
    expect(first.subReturn).toBeGreaterThan(0);
    expect(state.subsidiaries.beijing[0].isNew).toBe(false);
    expect(calcSubReturn(state, state.subsidiaries.shanghai[0], 'shanghai').net).toBeGreaterThan(0);

    const second = settleSubsidiaryQuarter(state);
    expect(second.subReturn).toBeGreaterThan(first.subReturn);
    expect(state._subValueChangeThisTurn).not.toBe(0);
  });

  it('applies route load-factor and landing-fee linkage flags', () => {
    const state = initState('beijing', 'era3');
    state.subsidiaries = {
      beijing: [
        { type: 'travel', openCost: 210, currentValue: 210, source: 'open', quarterAcquired: 0, cityLevelAtAcquire: 3, isNew: false },
        { type: 'airport', openCost: 2250, currentValue: 2250, source: 'invest', quarterAcquired: 0, cityLevelAtAcquire: 3, isNew: false },
      ],
    };

    expect(getSubLFBonus(state, 'beijing')).toBeCloseTo(0.02);
    expect(getSubLandingDiscount(state, 'beijing')).toBeCloseTo(0.15);
    expect(getSubLFBonus(state, 'shanghai')).toBe(0);
  });

  it('calculates company value and liquidation order', () => {
    const state = initState('beijing', 'era3');
    state.cash = -20;
    state.loan = 1000;
    state.portfolio = {};
    state.fleet = [{ uid: 1, buyPrice: 100, age: 0, isLease: false, delivering: false }];
    state.subsidiaries = {
      beijing: [{ type: 'shuttle', openCost: 60, currentValue: 80, source: 'open', quarterAcquired: 0, cityLevelAtAcquire: 3, isNew: false }],
    };

    const value = calcCompanyValue(state);
    expect(value.fleetValue).toBeCloseTo(100);
    expect(value.subValue).toBeCloseTo(80);
    expect(value.totalNetWorth).toBeCloseTo(-840);

    const result = handleBankruptcy(state);
    expect(result.action).toBe('forceSellSubsidiaries');
    expect(state.cash).toBeGreaterThan(0);
    expect(getAllSubsidiaries(state)).toHaveLength(0);
  });

  it('normalizes legacy or malformed subsidiary save fields', () => {
    const state = {
      turnsPlayed: 3,
      routes: [],
      fleet: [],
      subsidiaries: {
        beijing: [
          { type: 'shuttle', openCost: 0, currentValue: 'bad', source: 'legacy' },
          { type: 'missing' },
        ],
        missing: [{ type: 'hotel' }],
      },
      ai: [{ subsidiaries: { shanghai: [{ type: 'hotel' }, { type: 'hotel' }] } }],
    };

    normalizeSubsidiaryState(state);

    expect(state.subsidiaries.beijing).toHaveLength(1);
    expect(state.subsidiaries.beijing[0]).toMatchObject({ type: 'shuttle', openCost: calcSubOpenCost('shuttle', 'beijing'), source: 'open', isNew: false });
    expect(state.ai[0].subsidiaries.shanghai).toHaveLength(1);
    expect(state._subReturnThisTurn).toBe(0);
    expect(state._acquirePriceSeed).toBe(0);
  });
});
