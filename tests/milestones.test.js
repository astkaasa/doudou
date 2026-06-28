import { describe, expect, it } from 'vitest';

import { MILESTONES } from '../src/data/milestones.js';
import { checkMilestones, getMilestoneStats, normalizeMilestoneState } from '../src/domain/milestones.js';
import { initState } from '../src/domain/state.js';

describe('milestones', () => {
  it('unlocks matching milestones only once', () => {
    const state = initState('beijing', 'era3');
    state.routes.push({ from: 'beijing', to: 'shanghai' });

    const first = checkMilestones(state);
    const second = checkMilestones(state);

    expect(first.map((milestone) => milestone.id)).toContain('first_route');
    expect(second).toEqual([]);
    expect(state.milestones.first_route).toBe(true);
  });

  it('reports total and category progress', () => {
    const state = initState('beijing', 'era3');
    state.milestones = { first_route: true, first_branch: true };

    const stats = getMilestoneStats(state);

    expect(stats.total).toBe(MILESTONES.length);
    expect(stats.unlocked).toBe(2);
    expect(stats.categories['航线'].unlocked).toBe(1);
    expect(stats.categories['分部'].unlocked).toBe(1);
  });

  it('drops unknown or false milestone ids during normalization', () => {
    const state = initState('beijing', 'era3');
    state.milestones = { first_route: true, routes_5: false, missing: true };

    normalizeMilestoneState(state);

    expect(state.milestones).toEqual({ first_route: true });
  });
});
