import { describe, expect, it } from 'vitest';

import { addCostModifier, addDemandModifier, addSuspensionModifier, advanceActiveModifiers, effectiveFrequency, routeCostMultiplier, routeDemandMultiplier, routeMatchesScope } from '../src/domain/modifiers.js';
import { initState } from '../src/domain/state.js';

const route = { from: 'beijing', to: 'tokyo', frequency: 1 };

describe('active modifiers', () => {
  it('matches route scopes directionlessly', () => {
    expect(routeMatchesScope(route, { kind: 'cityIds', cityIds: ['tokyo'] })).toBe(true);
    expect(routeMatchesScope(route, { kind: 'connectsCitySets', setA: ['tokyo'], setB: ['beijing'] })).toBe(true);
    expect(routeMatchesScope(route, { kind: 'region', regions: ['asia'] })).toBe(true);
    expect(routeMatchesScope(route, { kind: 'routeKeys', routeKeys: ['beijing-tokyo'] })).toBe(true);
  });

  it('combines demand and cost modifiers while suspending frequency', () => {
    const state = initState('beijing', 'era3');
    const first = addDemandModifier(state, 'demand one', { kind: 'all' }, 0.9, 2);
    const second = addDemandModifier(state, 'demand two', { kind: 'cityIds', cityIds: ['tokyo'] }, 1.2, 2);
    addCostModifier(state, 'cost one', { kind: 'all' }, 1.1, 2);
    addSuspensionModifier(state, 'suspend', { kind: 'cityIds', cityIds: ['tokyo'] }, 1);

    expect(first.id).toBe('modifier-1');
    expect(second.id).toBe('modifier-2');
    expect(state.modifierIdCounter).toBe(5);
    expect(routeDemandMultiplier(state, route)).toBeCloseTo(1.08);
    expect(routeCostMultiplier(state, route)).toBeCloseTo(1.1);
    expect(effectiveFrequency(state, route)).toBe(0);

    advanceActiveModifiers(state);
    expect(effectiveFrequency(state, route)).toBe(1);
    expect(routeDemandMultiplier(state, route)).toBeCloseTo(1.08);

    advanceActiveModifiers(state);
    expect(state.activeModifiers).toHaveLength(0);
  });

  it('keeps zero multipliers explicit instead of defaulting them away', () => {
    const state = initState('beijing', 'era3');
    addDemandModifier(state, 'hard demand stop', { kind: 'all' }, 0, 1);

    expect(routeDemandMultiplier(state, route)).toBe(0);
  });
});
