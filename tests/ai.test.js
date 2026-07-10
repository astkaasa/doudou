import { describe, expect, it } from 'vitest';

import { countCompetitorsAI } from '../src/domain/ai.js';
import { initState } from '../src/domain/state.js';

describe('AI competition', () => {
  it('counts player and rival routes while excluding the current AI', () => {
    const state = initState('beijing', 'era2');
    const [current, rival] = state.ai;
    state.routes = [{ from: 'beijing', to: 'shanghai' }];
    current.routes = [{ from: 'shanghai', to: 'beijing' }];
    rival.routes = [{ from: 'beijing', to: 'shanghai' }];

    expect(countCompetitorsAI(state, 'beijing', 'shanghai', current)).toBe(2);
  });
});
