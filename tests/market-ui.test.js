import { describe, expect, it } from 'vitest';

import { initState } from '../src/domain/state.js';
import { cityMarketSummary, formatMarketLine, marketScore } from '../src/ui/market.js';

describe('market UI summaries', () => {
  it('formats current city market data as display-only heat and trend', () => {
    const state = initState('beijing', 'era3');
    state.cityStates.beijing = { pop: 12, biz: 80, tour: 60 };

    const summary = cityMarketSummary(state, 'beijing');

    expect(summary.score).toBe(marketScore(state.cityStates.beijing));
    expect(summary.levelLabel).toBe('核心市场');
    expect(summary.trend).toBeGreaterThanOrEqual(0);
    expect(formatMarketLine(state, 'beijing')).toMatch(/^热度 \d+/);
  });
});
