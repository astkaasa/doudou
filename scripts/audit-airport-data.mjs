import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { AIRPORTS, AIRPORT_DATA_VERSION, CITY_AIRPORT_IDS, CITY_AIRPORT_MATCH_AUDIT, DEFAULT_AIRPORT_IDS } from '../src/data/airports.generated.js';
import { CITIES } from '../src/data/cities.js';
import { AIRPORT_ASSIGNMENT_OVERRIDES } from '../src/data/airportOverrides.js';
import { airportServesCity } from '../src/domain/airports.js';

const projectRoot = resolve(import.meta.dirname, '..');
const snapshot = JSON.parse(readFileSync(resolve(projectRoot, 'data-sources/ourairports-selected.json'), 'utf8'));
const errors = [];
const ids = new Set();
const sourceIds = new Set();

for (const airport of AIRPORTS) {
  if (ids.has(airport.id)) errors.push(`duplicate airport id: ${airport.id}`);
  ids.add(airport.id);
  if (airport.source.provider === 'ourairports') {
    if (airport.id !== `oa-${airport.source.sourceId}`) errors.push(`${airport.id}: unstable source-derived id`);
    if (sourceIds.has(airport.source.sourceId)) errors.push(`${airport.id}: duplicate OurAirports source id`);
    sourceIds.add(airport.source.sourceId);
  }
}

for (const city of CITIES) {
  const idsForCity = CITY_AIRPORT_IDS[city.id];
  if (!idsForCity?.includes(`virtual-${city.id}`)) errors.push(`${city.id}: missing abstract airport`);
  if (!airportServesCity(DEFAULT_AIRPORT_IDS[city.id], city.id)) errors.push(`${city.id}: invalid default airport`);
  if (!CITY_AIRPORT_MATCH_AUDIT[city.id]?.candidates?.length) errors.push(`${city.id}: missing match candidates`);
}

for (const ident of Object.keys(AIRPORT_ASSIGNMENT_OVERRIDES)) {
  if (!AIRPORTS.some((airport) => airport.source.ident === ident)) errors.push(`override ${ident}: airport missing from generated data`);
}

if (AIRPORT_DATA_VERSION.snapshotDate !== snapshot.snapshotDate) errors.push('generated airport snapshot date does not match source snapshot');
if (AIRPORT_DATA_VERSION.source.airportsSha256 !== snapshot.source.airportsSha256) errors.push('airports.csv checksum metadata mismatch');
if (AIRPORT_DATA_VERSION.source.runwaysSha256 !== snapshot.source.runwaysSha256) errors.push('runways.csv checksum metadata mismatch');

const confidence = Object.values(CITY_AIRPORT_MATCH_AUDIT)
  .reduce((counts, match) => ({ ...counts, [match.confidence]: (counts[match.confidence] || 0) + 1 }), {});
console.log(`Airports: ${AIRPORTS.length}`);
console.log(`OurAirports facts: ${sourceIds.size}`);
console.log(`Abstract airports: ${AIRPORTS.filter((airport) => airport.source.provider === 'abstract').length}`);
console.log(`Confidence: ${JSON.stringify(confidence)}`);
if (errors.length > 0) {
  errors.forEach((error) => console.error(`ERROR ${error}`));
  process.exitCode = 1;
} else {
  console.log('Airport data audit passed.');
}
