import { describe, expect, it } from 'vitest';

import { growCityStates } from '../src/data/cityEraData.js';
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

  it('initializes and grows era-specific city market state', () => {
    const game = initState('beijing', 'era3');

    expect(game.cash).toBe(150);
    expect(game.cityStates.beijing).toEqual({ pop: 10.5, biz: 68, tour: 47 });

    growCityStates(game, () => 0.5);

    expect(game.cityStates.beijing.pop).toBeGreaterThan(10.5);
    expect(game.cityStates.beijing.biz).toBeGreaterThanOrEqual(68);
    expect(game.cityStates.beijing.tour).toBeGreaterThanOrEqual(47);
  });

  it('does not add removed red packet state to new games', () => {
    const game = initState('beijing', 'era3');

    expect(game.redPacketClaimed).toBeUndefined();
  });

  it('initializes the stock market for new games', () => {
    const game = initState('beijing', 'era3');

    expect(game.stocks.wuer_media).toEqual({ price: 52, prevPrice: 52, history: [52] });
    expect(game.portfolio.wuer_media).toEqual({ shares: 1, avgCost: 52 });
    expect(game.stockEvents).toEqual([]);
    expect(game._lastStockDividend).toBe(0);
  });

  it('initializes onboarding discovery state for new games', () => {
    const game = initState('beijing', 'era3');

    expect(game.ftpShown).toEqual({});
    expect(game.onboardStep).toBe(0);
    expect(game._onboardReportShown).toBe(false);
    expect(game._mainQuestOnboardShown).toBe(false);
  });
});
