import { afterEach, describe, expect, it } from 'vitest';

import { initState } from '../src/domain/state.js';
import { updateNasdouBadge } from '../src/ui/hud.js';
import { updateOilBadge } from '../src/ui/season.js';

const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.document = originalDocument;
});

describe('status badge rendering', () => {
  it('uses semantic oil trend classes', () => {
    const badge = { innerHTML: '' };
    globalThis.document = documentWith({ 'oil-badge': badge });

    updateOilBadge({ oilPrice: 110, prevOilPrice: 100 });
    expect(badge.innerHTML).toContain('oil-change up');

    updateOilBadge({ oilPrice: 90, prevOilPrice: 100 });
    expect(badge.innerHTML).toContain('oil-change down');

    updateOilBadge({ oilPrice: 100, prevOilPrice: 100 });
    expect(badge.innerHTML).toContain('oil-change flat');
    expect(badge.innerHTML).not.toContain('style=');
  });

  it('uses semantic NASDOU trend classes', () => {
    const badge = { hidden: true, innerHTML: '' };
    globalThis.document = documentWith({ 'nasdou-badge': badge });
    const state = initState('beijing', 'era2');

    updateNasdouBadge(state);
    expect(badge.innerHTML).toContain('nasdou-change flat');

    Object.values(state.stocks).forEach((stock) => {
      stock.prevPrice = stock.price;
      stock.price *= 1.1;
    });
    updateNasdouBadge(state);
    expect(badge.hidden).toBe(false);
    expect(badge.innerHTML).toContain('nasdou-change up');
    expect(badge.innerHTML).not.toContain('style=');
  });
});

function documentWith(elements) {
  return {
    getElementById: (id) => elements[id] || null,
  };
}
