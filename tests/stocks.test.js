import { describe, expect, it } from 'vitest';

import { initState } from '../src/domain/state.js';
import {
  buyStock,
  calcPortfolioValue,
  sellStock,
  updateStockPrices,
} from '../src/domain/stocks.js';

describe('stock market domain', () => {
  it('initializes active stocks and the starter WAPC holding for a new game', () => {
    const state = initState('beijing', 'era3');

    expect(state.stocks.lan_royal_bank.price).toBe(128);
    expect(state.stocks.hhyy_tech.price).toBe(160);
    expect(state.stocks.qw_eco.price).toBe(123);
    expect(state.portfolio.wuer_media).toEqual({ shares: 1, avgCost: 52 });
  });

  it('applies sector news shocks while intrinsic random noise is neutral', () => {
    const state = initState('beijing', 'era3');
    state.newsItems = [{ stockEffect: { finance: 0.10 } }];

    updateStockPrices(state, () => 0.5);

    expect(state.stocks.lan_royal_bank.price).toBe(134.4);
    expect(state.stocks.miow_insurance.price).toBe(99.23);
    expect(state.stockEvents).toEqual([{ sector: 'finance', impact: 0.05 }]);
  });

  it('buys and sells stocks with fees and average cost tracking', () => {
    const state = initState('beijing', 'era3');
    state.cash = 200;

    const buy = buyStock(state, 'wuer_media', 1);
    expect(buy.ok).toBe(true);
    expect(buy.totalCost).toBeCloseTo(52.52);
    expect(state.cash).toBeCloseTo(147.48);
    expect(state.portfolio.wuer_media).toEqual({ shares: 2, avgCost: 52 });

    const sell = sellStock(state, 'wuer_media', 1);
    expect(sell.ok).toBe(true);
    expect(sell.netRevenue).toBeCloseTo(51.48);
    expect(state.cash).toBeCloseTo(198.96);
    expect(state.portfolio.wuer_media).toEqual({ shares: 1, avgCost: 52 });
  });

  it('rejects trades that exceed cash or holding limits', () => {
    const state = initState('beijing', 'era3');
    state.cash = 1;

    expect(buyStock(state, 'lan_royal_bank', 1)).toMatchObject({ ok: false, message: '资金不足' });
    expect(sellStock(state, 'wuer_media', 2)).toMatchObject({ ok: false, message: '持仓不足' });

    state.cash = 100000;
    expect(buyStock(state, 'wuer_media', 100)).toMatchObject({ ok: false, message: '持仓不能超过100M' });
  });

  it('reports portfolio market value and floating profit', () => {
    const state = initState('beijing', 'era3');
    state.stocks.wuer_media.price = 60;

    expect(calcPortfolioValue(state)).toEqual({
      marketValue: 60,
      totalCost: 52,
      floatingPnL: 8,
    });
  });
});
