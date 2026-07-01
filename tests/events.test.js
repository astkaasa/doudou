import { describe, expect, it } from 'vitest';

import { NEWS_POOL } from '../src/data/news.js';
import { PLANES } from '../src/data/planes.js';
import { advanceTemporaryModifiers } from '../src/domain/events.js';
import { clamp, getCity } from '../src/domain/helpers.js';
import { megaEventNewsFor, syncMegaEventState } from '../src/domain/megaEvents.js';
import { addDemandModifier, addDisasterDemandModifier, addSuspensionModifier, routeDemandMultiplier, selectRouteKeys } from '../src/domain/modifiers.js';
import { openRoute, updateRouteMetrics } from '../src/domain/routes.js';
import { initState } from '../src/domain/state.js';

function stateWithRoute(from, to) {
  const state = initState('beijing', 'era3');
  state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
  openRoute(state, from, to, 1, 120);
  return state;
}

describe('news event effects', () => {
  it('adds soft disaster demand modifiers for matching sub-region routes', () => {
    const eastAsiaTyphoon = NEWS_POOL.disaster.find((item) => item.title.includes('台风席卷东亚'));
    const outbound = stateWithRoute('beijing', 'tokyo');
    const inbound = stateWithRoute('tokyo', 'beijing');

    eastAsiaTyphoon.effectFn({ state: outbound, getCity, clamp, addDisasterDemandModifier, selectRouteKeys });
    eastAsiaTyphoon.effectFn({ state: inbound, getCity, clamp, addDisasterDemandModifier, selectRouteKeys });

    expect(outbound.activeModifiers[0]).toMatchObject({
      type: 'demand',
      mode: 'disasterDemand',
      turnsRemaining: 1,
      scope: { kind: 'subRegion', subRegions: ['east_asia'] },
    });
    expect(inbound.activeModifiers[0]).toMatchObject({
      type: 'demand',
      mode: 'disasterDemand',
      turnsRemaining: 1,
      scope: { kind: 'subRegion', subRegions: ['east_asia'] },
    });
    expect(routeDemandMultiplier(outbound, outbound.routes[0])).toBeCloseTo(0.1);
  });

  it('applies suspension for one calculated turn and then restores service', () => {
    const state = stateWithRoute('beijing', 'tokyo');
    addSuspensionModifier(state, 'test suspension', { kind: 'cityIds', cityIds: ['tokyo'] }, 1);

    updateRouteMetrics(state);
    expect(state.routes[0].loadFactor).toBe(0);
    expect(state.routes[0].revenue).toBe(0);
    expect(state.routes[0].cost).toBe(0);

    advanceTemporaryModifiers(state);
    updateRouteMetrics(state);
    expect(state.activeModifiers).toHaveLength(0);
    expect(state.routes[0].revenue).toBeGreaterThan(0);
    expect(state.routes[0].cost).toBeGreaterThan(0);
  });

  it('uses demand modifiers instead of silently changing ticket prices for demand news', () => {
    const recession = NEWS_POOL.economy.find((item) => item.title.includes('全球股市暴跌'));
    const state = stateWithRoute('beijing', 'shanghai');
    const originalPrice = state.routes[0].price;

    recession.effectFn({ state, getCity, clamp, addDemandModifier, selectRouteKeys });

    expect(state.routes[0].price).toBe(originalPrice);
    expect(state.activeModifiers[0]).toMatchObject({
      type: 'demand',
      multiplier: 0.85,
      turnsRemaining: 1,
      scope: { kind: 'all' },
    });
  });

  it('keeps stock effects as news metadata separate from route modifiers', () => {
    const recession = NEWS_POOL.economy.find((item) => item.title.includes('全球股市暴跌'));

    expect(recession.stockEffect).toEqual({ finance: -0.08, tech: -0.05, tourism: -0.04 });
  });

  it('builds active mega events and news metadata for the current quarter', () => {
    const state = initState('beijing', 'era3');
    state.year = 2000;
    state.quarter = 3;

    const activeEvents = syncMegaEventState(state);
    const sydney = activeEvents.find((event) => event.id === 'oly_s2000');
    const hannover = activeEvents.find((event) => event.id === 'expo_2000');

    expect(sydney).toMatchObject({ cityId: 'sydney', quartersFromEvent: 0, currentBoost: 0.4 });
    expect(hannover).toMatchObject({ cityId: 'hannover', quartersFromEvent: 1, currentBoost: 0.18 });
    expect(state.activeModifiers.filter((modifier) => modifier.mode === 'megaEvent')).toHaveLength(2);
    expect(megaEventNewsFor(sydney)).toMatchObject({
      category: 'mega_event',
      _megaEventId: 'oly_s2000',
      _isHeadline: true,
      stockEffect: { tourism: 0.1, culture: 0.08 },
    });
  });
});
