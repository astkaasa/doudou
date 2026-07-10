import { describe, expect, it } from 'vitest';

import { AIRPORTS, AIRPORT_DATA_VERSION, CITY_AIRPORT_IDS, DEFAULT_AIRPORT_IDS } from '../src/data/airports.generated.js';
import { CITIES } from '../src/data/cities.js';
import { airportDisplayCode, airportServesCity, getAirport, getAirportByIdent, getAirportsForCity, getDefaultAirportId, getPlayableAirportsForCity, normalizeAirportIdForCity, virtualAirportId } from '../src/domain/airports.js';

describe('generated airport data', () => {
  it('pins the OurAirports snapshot and uses stable source ids', () => {
    expect(AIRPORT_DATA_VERSION.snapshotDate).toBe('2026-07-09');
    expect(AIRPORT_DATA_VERSION.source.airportsSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(AIRPORT_DATA_VERSION.source.runwaysSha256).toMatch(/^[a-f0-9]{64}$/);
    const realAirports = AIRPORTS.filter((airport) => airport.source.provider === 'ourairports');
    expect(realAirports.length).toBeGreaterThan(800);
    expect(new Set(AIRPORTS.map((airport) => airport.id)).size).toBe(AIRPORTS.length);
    realAirports.forEach((airport) => expect(airport.id).toBe(`oa-${airport.source.sourceId}`));
  });

  it('gives every city a neutral abstract fallback and a valid default', () => {
    CITIES.forEach((city) => {
      const virtualId = virtualAirportId(city.id);
      expect(CITY_AIRPORT_IDS[city.id]).toContain(virtualId);
      expect(getAirport(virtualId)).toMatchObject({ cityId: city.id, source: { provider: 'abstract' } });
      expect(airportServesCity(getDefaultAirportId(city.id), city.id)).toBe(true);
      expect(getAirportsForCity(city.id, { includeAbstract: false }).length).toBeGreaterThan(0);
    });
  });

  it('contains reviewed multi-airport vertical slices', () => {
    const expectedCodes = {
      london: ['LHR', 'LGW', 'LCY'],
      tokyo: ['HND', 'NRT'],
      newyork: ['JFK', 'EWR', 'LGA'],
      beijing: ['PEK', 'PKX'],
      shanghai: ['PVG', 'SHA'],
    };
    Object.entries(expectedCodes).forEach(([cityId, codes]) => {
      const actual = getAirportsForCity(cityId).map(airportDisplayCode);
      expect(actual).toEqual(expect.arrayContaining(codes));
    });
    expect(airportDisplayCode(DEFAULT_AIRPORT_IDS.london)).toBe('LHR');
    expect(airportDisplayCode(DEFAULT_AIRPORT_IDS.tokyo)).toBe('HND');
    expect(airportDisplayCode(DEFAULT_AIRPORT_IDS.newyork)).toBe('JFK');
  });

  it('only exposes reviewed matches to normal route creation', () => {
    expect(getPlayableAirportsForCity('london').map(airportDisplayCode)).toEqual(['LTN', 'LGW', 'LCY', 'LHR', 'STN']);
    expect(getPlayableAirportsForCity('tokyo').map(airportDisplayCode)).toEqual(['NRT', 'HND']);
    expect(getPlayableAirportsForCity('seville').map(airportDisplayCode)).toEqual(['SVQ']);
    expect(getPlayableAirportsForCity('seville').some((airport) => airport.source.provider === 'abstract')).toBe(false);
  });

  it('opens the renamed Palm Beach airport to the Miami market in 2026 Q3', () => {
    const trumpAirport = getAirportByIdent('KPBI');

    expect(trumpAirport).toMatchObject({
      cityId: 'miami',
      name: 'President Donald J Trump International Airport',
      codes: { iata: 'PBI', icao: 'KDJT' },
      audit: { confidence: 'verified' },
    });
    expect(trumpAirport.audit.sourceRefs).toContain('https://www.pbia.org/about/history/');
    expect(airportDisplayCode(trumpAirport)).toBe('DJT');
    expect(getPlayableAirportsForCity('miami', { year: 2026, quarter: 2 })).not.toContain(trumpAirport);
    expect(getPlayableAirportsForCity('miami', { year: 2026, quarter: 3 })).toContain(trumpAirport);
  });

  it('supports explicitly shared special-service airports without broad overlap', () => {
    const jeddah = getAirport(DEFAULT_AIRPORT_IDS.jeddah);
    expect(airportDisplayCode(jeddah)).toBe('JED');
    expect(jeddah.servedCityIds).toEqual(['jeddah', 'mecca']);
    expect(DEFAULT_AIRPORT_IDS.mecca).toBe(jeddah.id);
    expect(airportServesCity(jeddah, 'mecca')).toBe(true);
    expect(normalizeAirportIdForCity('missing', 'mecca', { legacyFallback: true })).toBe('virtual-mecca');
  });
});
