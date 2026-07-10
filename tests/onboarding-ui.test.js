import { afterEach, describe, expect, it } from 'vitest';

import { initState, seedInitialFleet } from '../src/domain/state.js';
import { acknowledgeOnboarding, resetOnboarding, updateOnboarding } from '../src/ui/onboarding.js';

const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.document = originalDocument;
});

describe('onboarding UI state', () => {
  it('uses hidden and state classes for hints and spotlight dimming', () => {
    const hint = createHint();
    const target = { classList: createClassList() };
    const body = { classList: createClassList() };
    globalThis.document = {
      body,
      getElementById: (id) => (id === 'onboard-hint' ? hint : null),
      querySelector: (selector) => (selector === '#btn-open-route' ? target : null),
      querySelectorAll: (selector) => (
        selector === '.spotlight-target-pulse' && target.classList.contains('spotlight-target-pulse') ? [target] : []
      ),
    };
    const state = initState('beijing', 'era1');
    seedInitialFleet(state);
    resetOnboarding(state);

    updateOnboarding(state, {});

    expect(hint.hidden).toBe(false);
    expect(hint.dataset.onboardingStep).toBe('first-route');
    expect(body.classList.contains('spotlight-active')).toBe(true);
    expect(body.classList.contains('spotlight-dim-soft')).toBe(true);
    expect(target.classList.contains('spotlight-target-pulse')).toBe(true);

    acknowledgeOnboarding();

    expect(hint.hidden).toBe(true);
    expect(body.classList.contains('spotlight-active')).toBe(false);
    expect(target.classList.contains('spotlight-target-pulse')).toBe(false);
  });
});

function createHint() {
  const children = new Map([
    ['.hint-title', { textContent: '' }],
    ['.hint-body', { textContent: '' }],
    ['.hint-step', { textContent: '' }],
    ['.hint-skip', { hidden: false }],
  ]);
  return {
    classList: createClassList(),
    dataset: {},
    hidden: true,
    querySelector: (selector) => children.get(selector) || null,
  };
}

function createClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    contains: (name) => values.has(name),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle: (name, force) => {
      const enabled = force === undefined ? !values.has(name) : Boolean(force);
      if (enabled) values.add(name);
      else values.delete(name);
      return enabled;
    },
  };
}
