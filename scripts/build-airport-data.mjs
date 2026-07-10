import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CITIES } from '../src/data/cities.js';
import {
  AIRPORT_ASSIGNMENT_OVERRIDES,
  AIRPORT_HISTORY_OVERRIDES,
  CITY_AIRPORT_MATCH_ALIASES,
  HISTORIC_AIRPORTS,
} from '../src/data/airportOverrides.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const sourceFile = resolve(projectRoot, 'data-sources/ourairports-selected.json');
const outputFile = resolve(projectRoot, 'src/data/airports.generated.js');
const auditFile = resolve(projectRoot, 'docs/airport-data-audit.md');
const cityPopulationSourceFile = resolve(projectRoot, 'data-sources/city-population-wup-2025.json');
const DEFAULT_AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const DEFAULT_RUNWAYS_URL = 'https://davidmegginson.github.io/ourairports-data/runways.csv';
const SOURCE_SNAPSHOT_DATE = '2026-07-09';
const MAX_CANDIDATES = 8;
const AIRPORT_TYPES = new Set(['large_airport', 'medium_airport', 'small_airport', 'closed_airport']);
const HARD_SURFACE_RE = /(ASP|CON|PEM|BIT|BRI|PAV|TAR)/i;

const options = parseArgs(process.argv.slice(2));
if (options.download) await downloadSources(options);
if (options.airports && options.runways) buildSourceSnapshot(options);
generateArtifacts(options);

function parseArgs(args) {
  const parsed = { write: false, download: false };
  for (let index = 0; index < args.length; index++) {
    const [key, inlineValue] = args[index].split('=', 2);
    const value = inlineValue ?? args[index + 1];
    if (key === '--write' || key === '--download') {
      parsed[key.slice(2)] = true;
      continue;
    }
    if (key === '--airports') parsed.airports = resolve(value);
    else if (key === '--runways') parsed.runways = resolve(value);
    else if (key === '--source') parsed.source = resolve(value);
    else if (key.startsWith('--')) throw new Error(`Unknown option: ${key}`);
    else continue;
    if (inlineValue === undefined) index++;
  }
  return parsed;
}

async function downloadSources(parsed) {
  const tempRoot = resolve(process.env.TMPDIR || '/tmp');
  const airportsPath = resolve(tempRoot, 'doudou-ourairports-airports.csv');
  const runwaysPath = resolve(tempRoot, 'doudou-ourairports-runways.csv');
  await Promise.all([
    downloadFile(DEFAULT_AIRPORTS_URL, airportsPath),
    downloadFile(DEFAULT_RUNWAYS_URL, runwaysPath),
  ]);
  parsed.airports = airportsPath;
  parsed.runways = runwaysPath;
}

async function downloadFile(url, path) {
  const response = await fetch(url, { headers: { 'user-agent': 'doudou-airport-data-sync/1' } });
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  writeFileSync(path, bytes);
  console.log(`Downloaded ${url} -> ${path}`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index++;
      } else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  const [headers, ...data] = rows;
  return data.filter((item) => item.length > 1).map((item) => Object.fromEntries(headers.map((header, index) => [header, item[index] ?? ''])));
}

function sourceChecksum(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function optionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildRunwayFacts(path) {
  const facts = new Map();
  for (const row of parseCsv(readFileSync(path, 'utf8'))) {
    if (row.closed === '1') continue;
    const airportIdent = row.airport_ident;
    const lengthFt = optionalNumber(row.length_ft) || 0;
    const current = facts.get(airportIdent) || {
      maxRunwayFt: 0,
      maxRunwayM: 0,
      hardSurface: false,
      lighted: false,
      openRunwayCount: 0,
      runways: [],
    };
    current.maxRunwayFt = Math.max(current.maxRunwayFt, lengthFt);
    current.maxRunwayM = Math.round(current.maxRunwayFt * 0.3048);
    current.hardSurface ||= HARD_SURFACE_RE.test(row.surface || '');
    current.lighted ||= row.lighted === '1';
    current.openRunwayCount++;
    current.runways.push({
      sourceId: Number(row.id),
      lengthM: lengthFt > 0 ? Math.round(lengthFt * 0.3048) : null,
      widthM: optionalNumber(row.width_ft) ? Math.round(Number(row.width_ft) * 0.3048) : null,
      surface: row.surface || null,
      lighted: row.lighted === '1',
      lowEnd: row.le_ident || null,
      highEnd: row.he_ident || null,
    });
    facts.set(airportIdent, current);
  }
  facts.forEach((fact) => fact.runways.sort((a, b) => (b.lengthM || 0) - (a.lengthM || 0)));
  return facts;
}

function buildAirportRecords(path, runwayFacts) {
  return parseCsv(readFileSync(path, 'utf8'))
    .filter((row) => AIRPORT_TYPES.has(row.type))
    .map((row) => ({
      sourceId: Number(row.id),
      ident: row.ident,
      type: row.type,
      name: row.name,
      lat: Number(row.latitude_deg),
      lon: Number(row.longitude_deg),
      elevationFt: optionalNumber(row.elevation_ft),
      continent: row.continent || null,
      isoCountry: row.iso_country || null,
      isoRegion: row.iso_region || null,
      municipality: row.municipality || null,
      scheduledService: row.scheduled_service === 'yes',
      codes: {
        iata: row.iata_code || null,
        icao: row.icao_code || null,
        gps: row.gps_code || null,
        local: row.local_code || null,
      },
      keywords: row.keywords || null,
      runway: runwayFacts.get(row.ident) || {
        maxRunwayFt: 0,
        maxRunwayM: 0,
        hardSurface: false,
        lighted: false,
        openRunwayCount: 0,
        runways: [],
      },
    }))
    .filter((airport) => Number.isFinite(airport.sourceId) && Number.isFinite(airport.lat) && Number.isFinite(airport.lon));
}

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function distanceKm(aLat, aLon, bLat, bLon) {
  const radians = Math.PI / 180;
  const phi1 = aLat * radians;
  const phi2 = bLat * radians;
  const deltaPhi = (bLat - aLat) * radians;
  const deltaLambda = (bLon - aLon) * radians;
  const value = Math.sin(deltaPhi / 2) ** 2
    + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function cityAliases(city, populationSource) {
  const record = populationSource.records?.[city.id];
  return [...new Set([
    city.id,
    record?.sourceName,
    ...(CITY_AIRPORT_MATCH_ALIASES[city.id] || []),
  ].map(normalize).filter((value) => value.length >= 3))];
}

function airportNameMatch(airport, aliases) {
  const name = normalize(airport.name);
  const municipality = normalize(airport.municipality);
  const keywords = normalize(airport.keywords);
  let score = 0;
  aliases.forEach((alias) => {
    if (municipality === alias) score = Math.max(score, 28);
    else if (municipality.includes(alias) || alias.includes(municipality) && municipality.length >= 4) score = Math.max(score, 18);
    if (name.includes(alias)) score = Math.max(score, 24);
    if (keywords.includes(alias)) score = Math.max(score, 12);
  });
  return score;
}

function scoreAirport(city, airport, aliases) {
  const distance = distanceKm(city.lat, city.lon, airport.lat, airport.lon);
  const nameMatch = airportNameMatch(airport, aliases);
  const typeScore = { large_airport: 55, medium_airport: 32, small_airport: 8, closed_airport: -35 }[airport.type] || 0;
  const runwayScore = airport.runway.maxRunwayM >= 3000 ? 15
    : airport.runway.maxRunwayM >= 2200 ? 11
      : airport.runway.maxRunwayM >= 1500 ? 6 : 0;
  const score = typeScore
    + (airport.scheduledService ? 25 : 0)
    + (airport.codes.iata ? 10 : 0)
    + (airport.codes.icao ? 5 : 0)
    + runwayScore
    + (airport.runway.hardSurface ? 4 : 0)
    + (airport.runway.lighted ? 3 : 0)
    + nameMatch
    - distance * 0.32;
  return { score: Number(score.toFixed(2)), distanceKm: Number(distance.toFixed(1)), nameMatch };
}

function canBeCandidate(city, airport, match) {
  const forced = AIRPORT_ASSIGNMENT_OVERRIDES[airport.ident]?.cityId === city.id;
  if (forced) return true;
  if (airport.type === 'closed_airport') return match.distanceKm <= 90 && match.nameMatch > 0;
  if (airport.type === 'small_airport') return match.distanceKm <= (city.marketRole === 'remote' ? 140 : 80);
  return match.distanceKm <= (city.marketRole === 'remote' ? 300 : 220);
}

function confidenceFor(primary, second, override) {
  if (override?.confidence === 'verified') return 'verified';
  if (!primary) return 'low';
  const margin = primary.score - (second?.score ?? 0);
  if (primary.score >= 65 && (primary.nameMatch >= 12 || primary.distanceKm <= 50) && margin >= -5) return 'high';
  if (primary.score >= 35) return 'medium';
  return 'low';
}

function buildSourceSnapshot(parsed) {
  const populationSource = JSON.parse(readFileSync(cityPopulationSourceFile, 'utf8'));
  const runwayFacts = buildRunwayFacts(parsed.runways);
  const airports = buildAirportRecords(parsed.airports, runwayFacts);
  const airportByIdent = new Map(airports.map((airport) => [airport.ident, airport]));
  const selectedAirports = new Map();
  const cityMatches = {};

  for (const city of CITIES) {
    const aliases = cityAliases(city, populationSource);
    const ranked = airports
      .map((airport) => ({ airport, ...scoreAirport(city, airport, aliases) }))
      .filter((match) => canBeCandidate(city, match.airport, match))
      .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
    const forced = Object.entries(AIRPORT_ASSIGNMENT_OVERRIDES)
      .filter(([, override]) => override.cityId === city.id)
      .map(([ident]) => ident);
    const candidateIdents = [...new Set([...forced, ...ranked.slice(0, MAX_CANDIDATES).map((match) => match.airport.ident)])];
    const candidates = candidateIdents.map((ident) => {
      const rankedMatch = ranked.find((match) => match.airport.ident === ident);
      const airport = airportByIdent.get(ident);
      if (!airport) throw new Error(`Airport override ${ident} was not found in OurAirports`);
      const match = rankedMatch || { ...scoreAirport(city, airport, aliases), airport };
      selectedAirports.set(ident, airport);
      return {
        ident,
        sourceId: airport.sourceId,
        score: match.score,
        distanceKm: match.distanceKm,
        nameMatch: match.nameMatch,
      };
    }).sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
    const primaryOverride = Object.entries(AIRPORT_ASSIGNMENT_OVERRIDES)
      .find(([, override]) => override.cityId === city.id && override.primary)?.[0];
    const automaticPrimary = candidates.find((candidate) => airportByIdent.get(candidate.ident).type !== 'closed_airport') || null;
    const selectedPrimaryIdent = primaryOverride || automaticPrimary?.ident || null;
    const selectedPrimary = candidates.find((candidate) => candidate.ident === selectedPrimaryIdent) || automaticPrimary;
    const second = candidates.find((candidate) => candidate.ident !== selectedPrimary?.ident);
    const confidence = confidenceFor(selectedPrimary, second, AIRPORT_ASSIGNMENT_OVERRIDES[selectedPrimary?.ident]);
    const warnings = [];
    if (confidence === 'low') warnings.push('no reliable real-airport default; use abstract airport');
    if (confidence === 'medium') warnings.push('automatic match requires review; abstract airport remains default');
    if (selectedPrimary?.distanceKm > 120) warnings.push(`primary candidate is ${selectedPrimary.distanceKm} km from city centre`);
    cityMatches[city.id] = {
      aliases,
      automaticPrimaryIdent: automaticPrimary?.ident || null,
      selectedPrimaryIdent,
      confidence,
      scoreMargin: selectedPrimary ? Number((selectedPrimary.score - (second?.score ?? 0)).toFixed(2)) : null,
      warnings,
      candidates,
    };
  }

  const snapshot = {
    schemaVersion: 1,
    snapshotDate: SOURCE_SNAPSHOT_DATE,
    generatedAt: new Date().toISOString(),
    source: {
      provider: 'ourairports',
      terms: 'Public Domain; no guarantee of accuracy or fitness for use',
      airportsUrl: DEFAULT_AIRPORTS_URL,
      runwaysUrl: DEFAULT_RUNWAYS_URL,
      airportsSha256: sourceChecksum(parsed.airports),
      runwaysSha256: sourceChecksum(parsed.runways),
    },
    airports: Object.fromEntries([...selectedAirports.entries()].sort(([a], [b]) => a.localeCompare(b))),
    cityMatches,
  };

  if (parsed.write) {
    mkdirSync(dirname(sourceFile), { recursive: true });
    writeFileSync(sourceFile, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.log(`Wrote ${sourceFile}`);
  } else {
    console.log(`Built source snapshot in memory (${selectedAirports.size} airports); pass --write to save`);
  }
  parsed.sourceData = snapshot;
}

function deriveGameplay(airport, match, primary) {
  const override = AIRPORT_ASSIGNMENT_OVERRIDES[airport.ident]?.gameplay;
  if (override) return override;
  const large = airport.type === 'large_airport';
  const medium = airport.type === 'medium_airport';
  const infrastructureTier = airport.runway.maxRunwayM >= 3200 && airport.runway.hardSurface ? 5
    : airport.runway.maxRunwayM >= 2400 && airport.runway.hardSurface ? 4
      : airport.runway.maxRunwayM >= 1600 ? 3 : airport.runway.maxRunwayM > 0 ? 2 : 1;
  return {
    role: primary ? (large ? 'primary_hub' : medium ? 'regional' : 'remote')
      : large || medium ? 'secondary' : 'regional',
    feeTier: large ? (primary ? 5 : 4) : medium ? 3 : 1,
    capacityTier: large ? 5 : medium ? 3 : 1,
    accessTier: match.distanceKm <= 15 ? 5 : match.distanceKm <= 35 ? 4 : match.distanceKm <= 70 ? 3 : 2,
    infrastructureTier,
  };
}

function abstractAirport(city) {
  return {
    id: `virtual-${city.id}`,
    cityId: city.id,
    servedCityIds: [city.id],
    name: `${city.name}城市机场`,
    lat: city.lat,
    lon: city.lon,
    source: { provider: 'abstract' },
    codes: { iata: null, icao: null, ident: null },
    factual: {
      type: 'abstract_airport',
      elevationFt: 0,
      scheduledService: true,
      maxRunwayM: 3000,
      hardSurface: true,
      lighted: true,
      openRunwayCount: 1,
      runways: [],
    },
    history: [{ fromYear: 1960, toYear: null, active: true, sourceRefs: [] }],
    gameplay: { role: 'abstract', feeTier: 3, capacityTier: 3, accessTier: 3, infrastructureTier: 3 },
    audit: { confidence: 'fallback', matchScore: null, distanceKm: 0, sourceRefs: [] },
  };
}

function airportHistory(ident, fallbackActive) {
  const override = AIRPORT_HISTORY_OVERRIDES[ident];
  if (Array.isArray(override) && override.length > 0) return override.map((period) => ({ ...period }));
  return [{ fromYear: 1960, toYear: null, active: fallbackActive, primary: false, sourceRefs: [] }];
}

function generateArtifacts(parsed) {
  const snapshot = parsed.sourceData || JSON.parse(readFileSync(parsed.source || sourceFile, 'utf8'));
  const airportByIdent = new Map(Object.entries(snapshot.airports));
  const candidatesByIdent = new Map();
  for (const city of CITIES) {
    for (const candidate of snapshot.cityMatches[city.id].candidates) {
      if (!candidatesByIdent.has(candidate.ident)) candidatesByIdent.set(candidate.ident, []);
      candidatesByIdent.get(candidate.ident).push({ cityId: city.id, candidate });
    }
  }

  const realAirports = [];
  for (const [ident, owners] of candidatesByIdent) {
    const sourceAirport = airportByIdent.get(ident);
    if (!sourceAirport) continue;
    const override = AIRPORT_ASSIGNMENT_OVERRIDES[ident];
    const canonicalOwner = owners.find((owner) => owner.cityId === override?.cityId)
      || [...owners].sort((a, b) => a.candidate.distanceKm - b.candidate.distanceKm)[0];
    const canonicalCityId = override?.cityId || canonicalOwner.cityId;
    const servedCityIds = [...new Set(override?.servedCityIds || [canonicalCityId])];
    const primary = snapshot.cityMatches[canonicalCityId]?.selectedPrimaryIdent === ident;
    realAirports.push({
      id: `oa-${sourceAirport.sourceId}`,
      cityId: canonicalCityId,
      servedCityIds,
      name: sourceAirport.name,
      lat: sourceAirport.lat,
      lon: sourceAirport.lon,
      source: {
        provider: 'ourairports',
        sourceId: sourceAirport.sourceId,
        ident: sourceAirport.ident,
        snapshot: snapshot.snapshotDate,
      },
      codes: {
        iata: sourceAirport.codes.iata,
        icao: sourceAirport.codes.icao,
        ident: sourceAirport.ident,
      },
      factual: {
        type: sourceAirport.type,
        elevationFt: sourceAirport.elevationFt,
        scheduledService: sourceAirport.scheduledService,
        maxRunwayM: sourceAirport.runway.maxRunwayM,
        hardSurface: sourceAirport.runway.hardSurface,
        lighted: sourceAirport.runway.lighted,
        openRunwayCount: sourceAirport.runway.openRunwayCount,
        runways: sourceAirport.runway.runways,
      },
      history: airportHistory(ident, sourceAirport.type !== 'closed_airport'),
      gameplay: deriveGameplay(sourceAirport, canonicalOwner.candidate, primary),
      audit: {
        confidence: override?.confidence || (primary ? snapshot.cityMatches[canonicalCityId]?.confidence : 'candidate'),
        matchScore: canonicalOwner.candidate.score,
        distanceKm: canonicalOwner.candidate.distanceKm,
        sourceRefs: override?.sourceRefs || [],
      },
    });
  }

  const virtualAirports = CITIES.map(abstractAirport);
  const historicAirports = HISTORIC_AIRPORTS.map((airport) => structuredClone(airport));
  const uniqueAirports = [...virtualAirports, ...realAirports, ...historicAirports].sort((a, b) => a.id.localeCompare(b.id));
  const cityAirportIds = Object.fromEntries(CITIES.map((city) => [city.id, [`virtual-${city.id}`]]));
  [...realAirports, ...historicAirports].forEach((airport) => {
    airport.servedCityIds.forEach((cityId) => {
      if (cityAirportIds[cityId]) cityAirportIds[cityId].push(airport.id);
    });
  });
  Object.values(cityAirportIds).forEach((ids) => ids.splice(1, ids.length - 1, ...ids.slice(1).sort()));

  const realByIdent = new Map(realAirports.map((airport) => [airport.source.ident, airport]));
  const defaultAirportIds = Object.fromEntries(CITIES.map((city) => {
    const match = snapshot.cityMatches[city.id];
    const selected = realByIdent.get(match.selectedPrimaryIdent);
    const canUseRealDefault = ['verified', 'high'].includes(match.confidence)
      && selected?.servedCityIds.includes(city.id);
    return [city.id, canUseRealDefault ? selected.id : `virtual-${city.id}`];
  }));
  const generatedHeader = `// This file is generated by scripts/build-airport-data.mjs. Do not edit manually.\n`
    + `// Source: OurAirports ${snapshot.snapshotDate}; Public Domain, without warranty.\n\n`;
  const generated = `${generatedHeader}`
    + `export const AIRPORT_DATA_VERSION = ${JSON.stringify({ schemaVersion: 2, sourceSchemaVersion: snapshot.schemaVersion, snapshotDate: snapshot.snapshotDate, source: snapshot.source }, null, 2)};\n\n`
    + `export const AIRPORTS = ${JSON.stringify(uniqueAirports, null, 2)};\n\n`
    + `export const CITY_AIRPORT_IDS = ${JSON.stringify(cityAirportIds, null, 2)};\n\n`
    + `export const DEFAULT_AIRPORT_IDS = ${JSON.stringify(defaultAirportIds, null, 2)};\n\n`
    + `export const CITY_AIRPORT_MATCH_AUDIT = ${JSON.stringify(snapshot.cityMatches, null, 2)};\n`;

  if (parsed.write || !parsed.airports) {
    writeFileSync(outputFile, generated);
    writeFileSync(auditFile, buildAuditReport(snapshot, defaultAirportIds));
    console.log(`Wrote ${outputFile}`);
    console.log(`Wrote ${auditFile}`);
  } else {
    console.log(`Generated ${uniqueAirports.length} airports in memory; pass --write to save`);
  }
  console.log(`Airports: ${uniqueAirports.length} (${CITIES.length} abstract)`);
}

function buildAuditReport(snapshot, defaultAirportIds) {
  const counts = { verified: 0, high: 0, medium: 0, low: 0 };
  Object.values(snapshot.cityMatches).forEach((match) => counts[match.confidence]++);
  const rows = CITIES.map((city) => {
    const match = snapshot.cityMatches[city.id];
    const primary = snapshot.airports[match.selectedPrimaryIdent];
    const code = primary?.codes?.iata || primary?.codes?.icao || primary?.ident || '—';
    const warning = match.warnings.length > 0 ? match.warnings.join('; ') : '—';
    return `| ${city.id} | ${city.name} | ${primary?.name || '—'} | ${code} | ${match.candidates.find((candidate) => candidate.ident === match.selectedPrimaryIdent)?.distanceKm ?? '—'} | ${match.confidence} | ${defaultAirportIds[city.id]} | ${warning} |`;
  });
  return `# 机场数据匹配审计\n\n`
    + `快照日期：${snapshot.snapshotDate}\n\n`
    + `- 城市：${CITIES.length}\n`
    + `- 精简真实机场：${Object.keys(snapshot.airports).length}\n`
    + `- 置信度：verified ${counts.verified}，high ${counts.high}，medium ${counts.medium}，low ${counts.low}\n`
    + `- 每座城市均生成一个稳定的 \`virtual-{cityId}\` 抽象机场；medium/low 匹配默认使用抽象机场。\n\n`
    + `| cityId | 城市 | 首选真实机场 | 代码 | 距市中心 km | 置信度 | 当前默认 | 警告 |\n`
    + `| --- | --- | --- | --- | ---: | --- | --- | --- |\n`
    + `${rows.join('\n')}\n`;
}
