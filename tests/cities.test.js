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
      'guangzhou',
      'shenzhen',
      'kualalumpur',
      'hochiminh',
      'dhaka',
      'bengaluru',
      'doha',
      'jeddah',
      'frankfurt',
      'toronto',
      'panamacity',
      'auckland',
      'brisbane',
      'accra',
    ]));
    expect(CITIES).toHaveLength(123);
    expect(CITIES.every((city) => Number.isFinite(city.lat) && Number.isFinite(city.lon))).toBe(true);
    expect(CITIES.every((city) => !('x' in city) && !('y' in city))).toBe(true);
  });

  it('applies audited names, coordinates, event zones, and market roles', () => {
    const byId = new Map(CITIES.map((city) => [city.id, city]));

    expect(byId.get('astana')).toMatchObject({ lon: 71.446, subRegion: 'central_asia', eventZones: ['central_asia'] });
    expect(byId.get('islamabad')).toMatchObject({ subRegion: 'south_asia', eventZones: ['south_asia'] });
    expect(byId.get('lagos')).toMatchObject({ subRegion: 'west_africa' });
    expect(byId.get('nairobi')).toMatchObject({ subRegion: 'east_africa' });
    expect(byId.get('brunei').name).toBe('斯里巴加湾市');
    expect(byId.get('okinawa').name).toBe('那霸（冲绳）');
    expect(byId.get('rostov').name).toBe('顿河畔罗斯托夫');
    expect(byId.get('hannover').marketRole).toBe('event');
    expect(byId.get('guam').marketRole).toBe('remote');
    expect(byId.get('mecca').marketRole).toBe('special');
    expect(CITIES.every((city) => Number.isInteger(city.marketTier) && city.networkRegion && city.marketRole)).toBe(true);
  });

  it('keeps region realignment from the latest upstream snapshot', () => {
    const byId = new Map(CITIES.map((city) => [city.id, city]));

    expect(byId.get('delhi')).toMatchObject({ region: 'asia', subRegion: 'south_asia' });
    expect(byId.get('dubai')).toMatchObject({ region: 'asia', subRegion: 'mideast' });
    expect(byId.get('cairo')).toMatchObject({ region: 'africa', subRegion: 'north_africa' });
    expect(byId.get('havana')).toMatchObject({ region: 'namerica', subRegion: 'caribbean' });
  });
});
