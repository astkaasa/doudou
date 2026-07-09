import { describe, expect, it } from 'vitest';

import { initState, seedInitialFleet } from '../src/domain/state.js';
import { checkFirstTimePopups, selectOnboardingStep } from '../src/ui/onboarding.js';

describe('onboarding flow helpers', () => {
  it('keeps regular onboarding ahead of branch hints', () => {
    const state = initState('beijing', 'era1');
    state.turnsPlayed = 1;
    state.cash = 5;
    state.loan = 0;
    state.onboardStep = 2;
    state._onboardReportShown = false;

    const step = selectOnboardingStep(state, {}, { ignoreDismissed: true });

    expect(step.id).toBe('first-report');
  });

  it('starts with route creation because a new company already owns usable planes', () => {
    const state = initState('beijing', 'era1');
    seedInitialFleet(state);

    const step = selectOnboardingStep(state, {}, { ignoreDismissed: true });

    expect(step.id).toBe('first-route');
    expect(step.target).toBe('#btn-open-route');
  });

  it('recommends using an idle starter plane when the first-quarter forecast is negative', () => {
    const state = initState('beijing', 'era1');
    seedInitialFleet(state);
    state.onboardStep = 1;
    state.routes = [{ revenue: 2, cost: 1, assignedPlanes: [state.fleet[0].uid] }];

    const step = selectOnboardingStep(state, {}, { ignoreDismissed: true });

    expect(step.id).toBe('quarter-plan');
    expect(step.target).toBe('#btn-open-route');
  });

  it('uses decimal load factor thresholds for low-load FTP cards', () => {
    const healthy = initState('beijing', 'era3');
    healthy.routes = [{ loadFactor: 0.9 }];
    expect(checkFirstTimePopups(healthy, { render: false }).map((card) => card.id)).not.toContain('low_loadfactor');

    const low = initState('beijing', 'era3');
    low.routes = [{ loadFactor: 0.5 }];
    expect(checkFirstTimePopups(low, { render: false }).map((card) => card.id)).toContain('low_loadfactor');
  });
});
