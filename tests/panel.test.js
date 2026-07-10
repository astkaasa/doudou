import { afterEach, describe, expect, it } from 'vitest';

import { initState } from '../src/domain/state.js';
import { renderPanel } from '../src/ui/panel.js';

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
});
