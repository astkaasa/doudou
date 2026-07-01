import { describe, expect, it } from 'vitest';

import { CITIES } from '../src/data/cities.js';

describe('city data', () => {
  it('uses projected lat/lon source data and includes upstream city additions', () => {
    const ids = new Set(CITIES.map((city) => city.id));

    expect([...ids]).toEqual(expect.arrayContaining([
      'hanoi',
      'karachi',
      'amsterdam',
      'lagos',
      'sanfrancisco',
      'osaka',
      'seville',
      'hannover',
      'milan',
      'montreal',
      'rio',
    ]));
    expect(CITIES.every((city) => Number.isFinite(city.lat) && Number.isFinite(city.lon))).toBe(true);
    expect(CITIES.every((city) => !('x' in city) && !('y' in city))).toBe(true);
  });

  it('keeps region realignment from the latest upstream snapshot', () => {
    const byId = new Map(CITIES.map((city) => [city.id, city]));

    expect(byId.get('delhi')).toMatchObject({ region: 'asia', subRegion: 'south_asia' });
    expect(byId.get('dubai')).toMatchObject({ region: 'asia', subRegion: 'mideast' });
    expect(byId.get('cairo')).toMatchObject({ region: 'africa', subRegion: 'north_africa' });
    expect(byId.get('havana')).toMatchObject({ region: 'namerica', subRegion: 'caribbean' });
  });
});
