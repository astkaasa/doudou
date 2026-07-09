import { describe, expect, it } from 'vitest';

import { calcVictoryGrade, checkMainQuestProgress, updateMainQuest } from '../src/domain/mainQuest.js';
import { initState } from '../src/domain/state.js';

function addRoutePlaceholders(state, count) {
  state.routes = Array.from({ length: count }, (_, index) => ({
    from: 'beijing',
    to: index % 2 ? 'tokyo' : 'shanghai',
    revenue: 0,
    cost: 0,
    profit: 0,
  }));
}

describe('main quest progression', () => {
  it('uses era-specific first-stage targets and region coverage', () => {
    const state = initState('beijing', 'era3');
    addRoutePlaceholders(state, 12);
    state.cash = 800;
    state.branches = ['london'];
    state.consecutiveProfit = 4;

    const progress = checkMainQuestProgress(state);

    expect(progress.allMet).toBe(true);
    expect(progress.dimensions.cash.target).toBe(800);
    expect(progress.dimensions.routes.target).toBe(12);
    expect(progress.dimensions.branch).toMatchObject({ current: 2, target: 2, type: 'region', met: true });
  });

  it('uses company value instead of cash for the wealth dimension', () => {
    const state = initState('beijing', 'era2');
    state.cash = 100;
    state.portfolio = {};
    state.fleet = [{ uid: 1, buyPrice: 300, age: 0, isLease: false, delivering: false }];
    state.subsidiaries = {
      beijing: [{ type: 'shuttle', openCost: 60, currentValue: 120, source: 'open', quarterAcquired: 0, cityLevelAtAcquire: 3, isNew: false }],
    };

    const progress = checkMainQuestProgress(state);

    expect(progress.dimensions.cash.current).toBeCloseTo(520);
    expect(progress.dimensions.cash.met).toBe(true);
  });

  it('advances to the next stage once all dimensions are met', () => {
    const state = initState('beijing', 'era2');
    addRoutePlaceholders(state, 10);
    state.cash = 500;
    state.branches = ['london'];
    state.consecutiveProfit = 4;

    const update = updateMainQuest(state);

    expect(update).toMatchObject({
      type: 'stage_complete',
      stage: 1,
      nextStage: 2,
      title: '新手启航',
      nextTitle: '纵横航线',
    });
    expect(state.mainQuest).toMatchObject({ currentStage: 2, stageCompleted: [1] });
  });

  it('records victory and grade after the final stage', () => {
    const state = initState('beijing', 'era2');
    state.mainQuest.currentStage = 3;
    state.turnsPlayed = 40;
    state.cash = 5000;
    addRoutePlaceholders(state, 70);
    state.branches = ['london', 'cairo', 'newyork', 'rio', 'sydney'];
    state.consecutiveProfit = 12;
    state.totalProfit = 1234;

    const update = updateMainQuest(state);

    expect(update).toMatchObject({
      type: 'victory',
      grade: 'S',
      gradeTitle: '苍穹领航者',
      routes: 70,
      totalProfit: 1234,
    });
    expect(state.mainQuest).toMatchObject({ victoryGrade: 'S', victoryTurn: 40, stageCompleted: [3] });
    expect(updateMainQuest(state)).toBeNull();
  });

  it('calculates lower victory grades for slower completions', () => {
    expect(calcVictoryGrade(41).grade).toBe('A');
    expect(calcVictoryGrade(56).grade).toBe('B');
    expect(calcVictoryGrade(71).grade).toBe('C');
  });
});
