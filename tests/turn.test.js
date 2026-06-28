import { afterEach, describe, expect, it, vi } from 'vitest';

import { advanceTurnState, calculateTurnFinancials } from '../src/domain/turn.js';
import { initState } from '../src/domain/state.js';
import { openBranch } from '../src/domain/bases.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('turn progression', () => {
  it('returns the completed period while advancing the visible calendar', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const state = initState('beijing', 'era3');
    state.ai = [];

    const report = advanceTurnState(state);

    expect(report.period).toEqual({ year: 2000, quarter: 1 });
    expect(report.nextPeriod).toEqual({ year: 2000, quarter: 2 });
    expect(state.year).toBe(2000);
    expect(state.quarter).toBe(2);
    expect(state.history[0]).toMatchObject({ year: 2000, quarter: 1 });
  });

  it('includes overhead and lease cost in turn financials', () => {
    const state = initState('beijing', 'era3');
    state.routes.push({ revenue: 2, cost: 0.75 });
    state.fleet.push({ isLease: false, leasePrice: 0 });
    state.fleet.push({ isLease: true, leasePrice: 1.5 });

    const result = calculateTurnFinancials(state);
    expect(result.totalRev).toBe(2);
    expect(result.totalCost).toBeCloseTo(3.85);
    expect(result.profit).toBeCloseTo(-1.85);
  });

  it('includes loan interest in turn financials', () => {
    const state = initState('beijing', 'era3');
    state.routes.push({ revenue: 5, cost: 1 });
    state.loan = 100;
    state.loanRate = 0.02;

    const result = calculateTurnFinancials(state);

    expect(result.interest).toBeCloseTo(2);
    expect(result.totalCost).toBeCloseTo(4.2);
    expect(result.profit).toBeCloseTo(0.8);
  });

  it('adds spicy bean trait fund to quarterly revenue', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = initState('beijing', 'era3');
    state.ai = [];
    state.playerTrait = '辣';

    const report = advanceTurnState(state);

    expect(report.traitFund).toBe(15);
    expect(state._lastTraitFund).toBe(15);
    expect(state.turnRevenue).toBe(15);
    expect(state.history[0].traitFund).toBe(15);
  });

  it('completes branch construction when advancing a quarter', () => {
    const state = initState('beijing', 'era3');
    state.ai = [];
    state.cash = 100;
    openBranch(state, 'shanghai');

    const report = advanceTurnState(state);

    expect(report.branchCompleted).toEqual(['shanghai']);
    expect(state.branches).toEqual(['shanghai']);
    expect(state.branchesConstructing).toEqual([]);
    expect(state.history[0].branchCompleted).toEqual(['shanghai']);
  });
});
