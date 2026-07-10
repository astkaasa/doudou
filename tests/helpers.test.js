import { describe, expect, it } from 'vitest';

import { routeKey } from '../src/domain/helpers.js';

describe('domain helpers', () => {
  it('creates the same route key in either direction', () => {
    expect(routeKey('beijing', 'shanghai')).toBe('beijing-shanghai');
    expect(routeKey('shanghai', 'beijing')).toBe('beijing-shanghai');
  });
});
