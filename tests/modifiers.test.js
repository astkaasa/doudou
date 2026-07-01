import { describe, expect, it } from 'vitest';

import { addCostModifier, addDemandModifier, addDisasterDemandModifier, addMegaEventDemandModifier, addSuspensionModifier, advanceActiveModifiers, routeCostMultiplier, routeDemandMultiplier, routeMatchesScope, routeServiceMultiplier } from '../src/domain/modifiers.js';
import { initState } from '../src/domain/state.js';

const route = { from: 'beijing', to: 'tokyo', serviceMultiplier: 1 };

describe('active modifiers', () => {
  it('matches route scopes directionlessly', () => {
    expect(routeMatchesScope(route, { kind: 'cityIds', cityIds: ['tokyo'] })).toBe(true);
    expect(routeMatchesScope(route, { kind: 'connectsCitySets', setA: ['tokyo'], setB: ['beijing'] })).toBe(true);
    expect(routeMatchesScope(route, { kind: 'region', regions: ['asia'] })).toBe(true);
    expect(routeMatchesScope(route, { kind: 'subRegion', subRegions: ['east_asia'] })).toBe(true);
    expect(routeMatchesScope(route, { kind: 'routeKeys', routeKeys: ['beijing-tokyo'] })).toBe(true);
  });

  it('combines demand and cost modifiers while suspending service', () => {
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
    expect(routeServiceMultiplier(state, route)).toBe(0);

    advanceActiveModifiers(state);
    expect(routeServiceMultiplier(state, route)).toBe(1);
    expect(routeDemandMultiplier(state, route)).toBeCloseTo(1.08);

    advanceActiveModifiers(state);
    expect(state.activeModifiers).toHaveLength(0);
  });

  it('keeps zero multipliers explicit instead of defaulting them away', () => {
    const state = initState('beijing', 'era3');
    addDemandModifier(state, 'hard demand stop', { kind: 'all' }, 0, 1);

    expect(routeDemandMultiplier(state, route)).toBe(0);
  });

  it('applies soft disaster demand by affected route endpoint count', () => {
    const state = initState('beijing', 'era3');
    addDisasterDemandModifier(state, 'east asia disaster', { kind: 'subRegion', subRegions: ['east_asia'] });

    expect(routeDemandMultiplier(state, { from: 'beijing', to: 'tokyo' })).toBeCloseTo(0.1);
    expect(routeDemandMultiplier(state, { from: 'beijing', to: 'bangkok' })).toBeCloseTo(0.3);
    expect(routeDemandMultiplier(state, { from: 'london', to: 'newyork' })).toBeCloseTo(1);
  });

  it('exempts active mega event hosts from disaster endpoint penalties', () => {
    const state = initState('beijing', 'era3');
    state.activeMegaEvents = [{ cityId: 'beijing', currentBoost: 0.5, quartersFromEvent: 0 }];
    addDisasterDemandModifier(state, 'east asia disaster', { kind: 'subRegion', subRegions: ['east_asia'] });

    expect(routeDemandMultiplier(state, { from: 'beijing', to: 'tokyo' })).toBeCloseTo(0.3);
    expect(routeDemandMultiplier(state, { from: 'beijing', to: 'bangkok' })).toBeCloseTo(1);
  });

  it('applies mega event host, regional spillover, and remote hub demand multipliers', () => {
    const state = initState('beijing', 'era3');
    addMegaEventDemandModifier(state, 'Beijing Olympics', {
      id: 'oly_s2008',
      hostCityId: 'beijing',
      hostRegion: 'asia',
      boost: 0.5,
      spillover: 0.3,
      remoteSpillover: 0.15,
    });

    expect(routeDemandMultiplier(state, { from: 'beijing', to: 'tokyo' })).toBeCloseTo(1.5);
    expect(routeDemandMultiplier(state, { from: 'tokyo', to: 'singapore' })).toBeCloseTo(1.15);
    expect(routeDemandMultiplier(state, { from: 'london', to: 'newyork' })).toBeCloseTo(1.075);
  });
});
