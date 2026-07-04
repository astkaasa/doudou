import { afterEach, describe, expect, it, vi } from 'vitest';

import { PLANES } from '../src/data/planes.js';
import { suggestedPrice } from '../src/domain/economy.js';
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

  it('includes overhead, lease cost, and operations budget in turn financials', () => {
    const state = initState('beijing', 'era3');
    state.routes.push({ revenue: 2, cost: 0.75 });
    state.fleet.push({ isLease: false, leasePrice: 0 });
    state.fleet.push({ isLease: true, leasePrice: 1.5 });

    const result = calculateTurnFinancials(state);
    expect(result.totalRev).toBe(2);
    expect(result.opsCost).toBeCloseTo(0.45);
    expect(result.totalCost).toBeCloseTo(4.3);
    expect(result.profit).toBeCloseTo(-2.3);
  });

  it('includes loan interest in turn financials', () => {
    const state = initState('beijing', 'era3');
    state.routes.push({ revenue: 5, cost: 1 });
    state.loan = 100;
    state.loanRate = 0.02;

    const result = calculateTurnFinancials(state);

    expect(result.interest).toBeCloseTo(2);
    expect(result.totalCost).toBeCloseTo(4.45);
    expect(result.profit).toBeCloseTo(0.55);
  });

  it('adds spicy bean trait fund to quarterly revenue', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const state = initState('beijing', 'era3');
    state.ai = [];
    state.playerTrait = '辣';

    const report = advanceTurnState(state);

    expect(report.traitFund).toBe(3);
    expect(state._lastTraitFund).toBe(3);
    expect(state.turnRevenue).toBe(3);
    expect(state.history[0].traitFund).toBe(3);
  });

  it('settles stock dividends in Q4 profit without inflating operating revenue', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const state = initState('beijing', 'era3');
    state.ai = [];
    state.fleet = [];
    state.routes = [];
    state.quarter = 4;

    const report = advanceTurnState(state);

    expect(report.stockDividend).toBe(0.2);
    expect(report.rev).toBe(0);
    expect(report.cost).toBeCloseTo(1.2);
    expect(report.profit).toBeCloseTo(-1.0);
    expect(state._lastStockDividend).toBe(0.2);
    expect(state.turnProfit).toBeCloseTo(-1.0);
    expect(state.history[0].stockDividend).toBe(0.2);
  });

  it('schedules contract cards after Q3 and Q4 settlements', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const state = initState('beijing', 'era3');
    state.ai = [];
    state.quarter = 2;

    advanceTurnState(state);
    expect(state.quarter).toBe(3);
    expect(state._pendingRecruit).toBe(true);
    expect(state._pendingBonus).toBe(false);

    state._pendingRecruit = false;
    advanceTurnState(state);
    expect(state.quarter).toBe(4);
    expect(state._pendingBonus).toBe(true);
  });

  it('does not turn spicy bean trait fund into a debt penalty', () => {
    const state = initState('beijing', 'era3');
    state.ai = [];
    state.cash = -1;
    state.playerTrait = '辣';

    const report = advanceTurnState(state);

    expect(report.traitFund).toBe(0);
    expect(state._lastTraitFund).toBe(0);
    expect(state.history[0].traitFund).toBe(0);
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

  it('emits main quest stage updates after profitable quarterly settlement', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const state = initState('beijing', 'era1');
    const plane = { ...PLANES.find((item) => item.id === 'b777'), uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 };
    const price = suggestedPrice('beijing', 'shanghai');
    state.ai = [];
    state.cash = 300;
    state.branches = ['london'];
    state.fleet = [plane];
    state.consecutiveProfit = 3;
    state.routes = Array.from({ length: 8 }, () => ({
      from: 'beijing',
      to: 'shanghai',
      price,
      suggestedPrice: price,
      serviceMultiplier: 1,
      assignedPlanes: [1],
      loadFactor: 0,
    }));

    const report = advanceTurnState(state);

    expect(report.mainQuestUpdate).toMatchObject({
      type: 'stage_complete',
      stage: 1,
      nextStage: 2,
    });
    expect(state.mainQuest.currentStage).toBe(2);
  });

  it('triggers one-time angel rescue before bankruptcy game over', () => {
    const state = initState('beijing', 'era3');
    state.ai = [];
    state.cash = -5;
    state.fleet = [];
    state.routes = [];

    const firstReport = advanceTurnState(state);
    expect(firstReport.angelRescue).toBe(true);
    expect(firstReport.gameOver).toBe(false);
    expect(state.bankruptRescued).toBe(true);
    expect(state.gameOver).toBe(false);

    state.cash = -5;
    const secondReport = advanceTurnState(state);
    expect(secondReport.angelRescue).toBe(false);
    expect(secondReport.gameOver).toBe(true);
    expect(state.gameOver).toBe(true);
  });
});
