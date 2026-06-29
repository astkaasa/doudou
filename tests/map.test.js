import { afterEach, describe, expect, it } from 'vitest';

import { initState } from '../src/domain/state.js';
import { renderMap } from '../src/ui/map.js';

const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.document = originalDocument;
});

describe('map rendering', () => {
  it('renders player route arcs without runtime reference errors', () => {
    const container = {
      innerHTML: '',
      getBoundingClientRect: () => ({ width: 1000, height: 500 }),
    };
    globalThis.document = {
      getElementById: (id) => (id === 'map-container' ? container : null),
    };
    const state = initState('beijing', 'era1');
    state.hq = 'beijing';
    state.routes.push({
      from: 'beijing',
      to: 'losangeles',
      profit: 12,
      price: 100,
      loadFactor: 0.8,
      revenue: 20,
      cost: 8,
      assignedPlanes: [],
    });

    renderMap(state, { showBoundaries: true, mapStyle: 'classic' });

    expect(container.innerHTML).toContain('route-line-player');
    expect(container.innerHTML).toContain('<path');
  });
});
