import { describe, expect, it } from 'vitest';

import { ERAS } from '../src/data/eras.js';
import { createSetupState, initState } from '../src/domain/state.js';

describe('state initialization', () => {
  it('canonicalizes invalid era ids to the fallback era', () => {
    const game = initState('beijing', 'missing-era');
    const setup = createSetupState('豆豆航空', 'missing-era');

    expect(game.era).toBe(ERAS[0].id);
    expect(game.year).toBe(ERAS[0].startYear);
    expect(setup.era).toBe(ERAS[0].id);
    expect(setup.year).toBe(ERAS[0].startYear);
  });
});
