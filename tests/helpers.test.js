import { describe, expect, it } from 'vitest';

import { CITIES } from '../src/data/cities.js';
import { cityDist, getCity, routeKey } from '../src/domain/helpers.js';

describe('domain helpers', () => {
  it('creates the same route key in either direction', () => {
    expect(routeKey('beijing', 'shanghai')).toBe('beijing-shanghai');
    expect(routeKey('shanghai', 'beijing')).toBe('beijing-shanghai');
  });

  it('looks up canonical cities and returns symmetric distances', () => {
    const beijing = CITIES.find((city) => city.id === 'beijing');
    const shanghai = CITIES.find((city) => city.id === 'shanghai');

    expect(getCity('beijing')).toBe(beijing);
    expect(getCity('missing-city')).toBeUndefined();
    expect(cityDist(beijing, shanghai)).toBe(cityDist(shanghai, beijing));
  });
});
