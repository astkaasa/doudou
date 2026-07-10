import { describe, expect, it } from 'vitest';

import { CITIES } from '../src/data/cities.js';
import { growCityStates, initCityStates } from '../src/data/cityEraData.js';
import { cityPopulationAtYear, cityPopulationQuarterlyRate } from '../src/data/cityPopulation.js';
import { CITY_POPULATION_DATA } from '../src/data/cityPopulationData.generated.js';
import { initState } from '../src/domain/state.js';

describe('audited city population data', () => {
  it('covers every city with stable source metadata and required anchors', () => {
    expect(Object.keys(CITY_POPULATION_DATA)).toHaveLength(CITIES.length);
    CITIES.forEach((city) => {
      const record = CITY_POPULATION_DATA[city.id];
      expect(record.sourceId).toBeDefined();
      [1960, 1975, 2000, 2020].forEach((year) => expect(record.populationM[year]).toBeGreaterThan(0));
      expect(city.pop).toBe(Math.round(record.populationM[2020] * 1000));
    });
  });

  it('uses exact WUP anchors and explicitly marks derived backcasts', () => {
    expect(cityPopulationAtYear('beijing', 1960)).toBe(4.1013);
    expect(cityPopulationAtYear('beijing', 1975)).toBe(5.155);
    expect(cityPopulationAtYear('beijing', 2000)).toBe(9.6354);
    expect(CITY_POPULATION_DATA.atlanta.qualityByYear[1960]).toBe('derived-backcast');
    expect(CITY_POPULATION_DATA.atlanta.qualityByYear[2000]).toBe('source');
    expect(CITY_POPULATION_DATA.guam.sourceKey).toBe('world-bank-population-total');
  });

  it('initializes each campaign from its historical population year', () => {
    expect(initCityStates('era1').beijing.pop).toBe(4.1013);
    expect(initCityStates('era2').beijing.pop).toBe(5.155);
    expect(initCityStates('era3').beijing.pop).toBe(9.6354);
    expect(initCityStates('era4').beijing.pop).toBe(4.1013);
  });

  it('grows or contracts city population along its own historical series', () => {
    expect(cityPopulationQuarterlyRate('beijing', 2000, 1)).toBeGreaterThan(0);
    expect(cityPopulationQuarterlyRate('caracas', 2000, 1)).toBeLessThan(0);

    const growing = initState('beijing', 'era3');
    const contracting = initState('caracas', 'era3');
    const beijingStart = growing.cityStates.beijing.pop;
    const caracasStart = contracting.cityStates.caracas.pop;
    growCityStates(growing, () => 0.5);
    growCityStates(contracting, () => 0.5);
    expect(growing.cityStates.beijing.pop).toBeGreaterThan(beijingStart);
    expect(contracting.cityStates.caracas.pop).toBeLessThan(caracasStart);
  });
});
