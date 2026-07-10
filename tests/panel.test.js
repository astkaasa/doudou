import { afterEach, describe, expect, it } from 'vitest';

import { initState } from '../src/domain/state.js';
import { renderPanel, renderRouteCityPicker } from '../src/ui/panel.js';

const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.document = originalDocument;
});

describe('management panel rendering', () => {
  it('uses semantic styles and escapes persisted status labels', () => {
    const elements = {
      'market-info': { innerHTML: '' },
      'route-summary': { innerHTML: '' },
    };
    globalThis.document = {
      getElementById: (id) => elements[id] || null,
    };
    const state = initState('beijing', 'era1');
    state.ai[0].name = '<img src=x onerror=alert(1)>';
    state.activeModifiers = [{
      source: '<script>bad()</script>',
      type: 'demand',
      multiplier: 1.1,
      turnsRemaining: 1,
    }];

    renderPanel(state, { hqSelectMode: false });

    expect(elements['route-summary'].innerHTML).toContain('panel-empty');
    expect(elements['market-info'].innerHTML).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(elements['market-info'].innerHTML).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    expect(elements['market-info'].innerHTML).not.toContain('style=');
  });

  it('renders route summaries as keyboard-operable buttons', () => {
    const elements = {
      'market-info': { innerHTML: '' },
      'route-summary': { innerHTML: '' },
    };
    globalThis.document = {
      getElementById: (id) => elements[id] || null,
    };
    const state = initState('beijing', 'era1');
    state.routes = [{
      assignedPlanes: [],
      from: 'beijing',
      loadFactor: 0.75,
      price: 120,
      profit: 2,
      to: 'shanghai',
    }];

    renderPanel(state, { hqSelectMode: false });

    expect(elements['route-summary'].innerHTML).toContain('<button class="route-item" type="button"');
    expect(elements['route-summary'].innerHTML).toContain('data-action="open-route-detail"');
  });

  it('shows reviewed airport choices for the selected route city', () => {
    const state = initState('beijing', 'era3');
    state.year = 2000;

    const historicalHtml = renderRouteCityPicker(state, 'beijing');
    state.year = 2020;
    const currentHtml = renderRouteCityPicker(state, 'beijing');

    expect(historicalHtml).toContain('可用机场');
    expect(historicalHtml).toContain('PEK');
    expect(historicalHtml).not.toContain('PKX');
    expect(currentHtml).toContain('PEK');
    expect(currentHtml).toContain('PKX');
    expect(currentHtml).not.toContain('CN-0006');
  });
});
