import { describe, expect, it } from 'vitest';

import { initState } from '../src/domain/state.js';
import { checkFirstTimePopups, selectOnboardingStep } from '../src/ui/onboarding.js';

describe('onboarding flow helpers', () => {
  it('keeps regular onboarding ahead of branch hints', () => {
    const state = initState('beijing', 'era1');
    state.turnsPlayed = 1;
    state.cash = 5;
    state.loan = 0;
    state.onboardStep = 3;
    state._onboardReportShown = false;

    const step = selectOnboardingStep(state, {}, { ignoreDismissed: true });

    expect(step.id).toBe('first-report');
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
