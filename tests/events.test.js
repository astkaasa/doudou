import { describe, expect, it } from 'vitest';

import { NEWS_POOL } from '../src/data/news.js';
import { PLANES } from '../src/data/planes.js';
import { advanceTemporaryModifiers } from '../src/domain/events.js';
import { clamp, getCity } from '../src/domain/helpers.js';
import { addDemandModifier, addSuspensionModifier, selectRouteKeys } from '../src/domain/modifiers.js';
import { openRoute, updateRouteMetrics } from '../src/domain/routes.js';
import { initState } from '../src/domain/state.js';

function stateWithRoute(from, to) {
  const state = initState('beijing', 'era3');
  state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
  openRoute(state, from, to, 1, 120);
  return state;
}

describe('news event effects', () => {
  it('suspends matching sub-region routes regardless of direction', () => {
    const eastAsiaTyphoon = NEWS_POOL.disaster.find((item) => item.title.includes('台风席卷东亚'));
    const outbound = stateWithRoute('beijing', 'tokyo');
    const inbound = stateWithRoute('tokyo', 'beijing');

    eastAsiaTyphoon.effectFn({ state: outbound, getCity, clamp, addSuspensionModifier, selectRouteKeys });
    eastAsiaTyphoon.effectFn({ state: inbound, getCity, clamp, addSuspensionModifier, selectRouteKeys });

    expect(outbound.activeModifiers[0]).toMatchObject({
      type: 'suspension',
      turnsRemaining: 1,
      scope: { kind: 'subRegion', subRegions: ['east_asia'] },
    });
    expect(inbound.activeModifiers[0]).toMatchObject({
      type: 'suspension',
      turnsRemaining: 1,
      scope: { kind: 'subRegion', subRegions: ['east_asia'] },
    });
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
});
