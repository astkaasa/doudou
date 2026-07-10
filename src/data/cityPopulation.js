import { CITY_POPULATION_ANCHOR_YEARS, CITY_POPULATION_DATA } from './cityPopulationData.generated.js';

const ERA_START_YEARS = {
  era1: 1960,
  era2: 1975,
  era3: 2000,
  era4: 1960,
};

function interpolate(left, right, year) {
  if (left.value <= 0 || right.value <= 0 || left.year === right.year) return left.value;
  const ratio = (year - left.year) / (right.year - left.year);
  return left.value * Math.pow(right.value / left.value, ratio);
}

export function cityPopulationAtYear(cityId, year) {
  const record = CITY_POPULATION_DATA[cityId];
  if (!record) return null;
  const targetYear = Number(year);
  if (!Number.isFinite(targetYear)) return null;
  const points = CITY_POPULATION_ANCHOR_YEARS.map((anchorYear) => ({
    year: anchorYear,
    value: record.populationM[anchorYear],
  })).filter((point) => Number.isFinite(point.value));
  if (points.length === 0) return null;
  if (targetYear <= points[0].year) return points[0].value;
  if (targetYear >= points.at(-1).year) return points.at(-1).value;
  const rightIndex = points.findIndex((point) => point.year >= targetYear);
  if (points[rightIndex].year === targetYear) return points[rightIndex].value;
  return interpolate(points[rightIndex - 1], points[rightIndex], targetYear);
}

export function cityPopulationForEra(cityId, eraId) {
  return cityPopulationAtYear(cityId, ERA_START_YEARS[eraId] ?? ERA_START_YEARS.era1);
}

export function cityPopulationQuarterlyRate(cityId, year, quarter = 1) {
  const currentYear = Number(year) + (Math.max(1, Math.min(4, Number(quarter) || 1)) - 1) / 4;
  const current = cityPopulationAtYear(cityId, currentYear);
  const next = cityPopulationAtYear(cityId, currentYear + 0.25);
  if (!Number.isFinite(current) || !Number.isFinite(next) || current <= 0) return 0;
  return next / current - 1;
}

export function cityPopulation2020(cityId) {
  return cityPopulationAtYear(cityId, 2020);
}
