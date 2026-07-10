import { AIRPORTS, CITY_AIRPORT_IDS, DEFAULT_AIRPORT_IDS } from '../data/airports.generated.js';

const AIRPORT_BY_ID = new Map(AIRPORTS.map((airport) => [airport.id, airport]));
const AIRPORT_BY_IDENT = new Map(AIRPORTS.map((airport) => [airport.source?.ident || airport.codes?.ident, airport]).filter(([ident]) => ident));

export function getAirport(airportId) {
  return AIRPORT_BY_ID.get(airportId) || null;
}

export function getAirportByIdent(ident) {
  return AIRPORT_BY_IDENT.get(ident) || null;
}

export function virtualAirportId(cityId) {
  return `virtual-${cityId}`;
}

export function airportServesCity(airportOrId, cityId) {
  const airport = typeof airportOrId === 'string' ? getAirport(airportOrId) : airportOrId;
  return Boolean(airport && (airport.cityId === cityId || airport.servedCityIds?.includes(cityId)));
}

export function isAirportActive(airportOrId, year = null) {
  const airport = typeof airportOrId === 'string' ? getAirport(airportOrId) : airportOrId;
  if (!airport) return false;
  if (year === null || year === undefined || !Number.isFinite(Number(year))) {
    return airport.history?.some((period) => period.active) ?? true;
  }
  const targetYear = Number(year);
  return (airport.history || []).some((period) => period.active
    && targetYear >= (period.fromYear ?? -Infinity)
    && targetYear <= (period.toYear ?? Infinity));
}

export function isAirportGameplayAvailable(airportOrId, year = null, quarter = null) {
  const airport = typeof airportOrId === 'string' ? getAirport(airportOrId) : airportOrId;
  if (!airport) return false;
  const targetYear = Number(year);
  if (!Number.isFinite(targetYear)) return true;
  const targetQuarter = Number.isInteger(Number(quarter))
    ? Math.max(1, Math.min(4, Number(quarter)))
    : 1;
  const fromYear = Number(airport.gameplay?.availableFromYear);
  const fromQuarter = Number.isInteger(Number(airport.gameplay?.availableFromQuarter))
    ? Math.max(1, Math.min(4, Number(airport.gameplay.availableFromQuarter)))
    : 1;
  if (Number.isFinite(fromYear)
    && (targetYear < fromYear || (targetYear === fromYear && targetQuarter < fromQuarter))) return false;
  const toYear = Number(airport.gameplay?.availableToYear);
  const toQuarter = Number.isInteger(Number(airport.gameplay?.availableToQuarter))
    ? Math.max(1, Math.min(4, Number(airport.gameplay.availableToQuarter)))
    : 4;
  return !Number.isFinite(toYear)
    || targetYear < toYear
    || (targetYear === toYear && targetQuarter <= toQuarter);
}

export function getAirportsForCity(cityId, options = {}) {
  const ids = CITY_AIRPORT_IDS[cityId] || [];
  return ids
    .map(getAirport)
    .filter(Boolean)
    .filter((airport) => options.includeAbstract !== false || airport.source.provider !== 'abstract')
    .filter((airport) => options.includeInactive === true || isAirportActive(airport, options.year));
}

export function getPlayableAirportsForCity(cityId, options = {}) {
  const airports = getAirportsForCity(cityId, options)
    .filter((airport) => isAirportGameplayAvailable(airport, options.year, options.quarter));
  const verified = airports.filter((airport) => airport.source.provider !== 'abstract'
    && ['verified', 'high'].includes(airport.audit?.confidence));
  return verified.length > 0
    ? verified
    : airports.filter((airport) => airport.source.provider === 'abstract');
}

export function getDefaultAirportId(cityId) {
  const airportId = DEFAULT_AIRPORT_IDS[cityId];
  return airportServesCity(airportId, cityId) ? airportId : virtualAirportId(cityId);
}

export function getDefaultAirport(cityId) {
  return getAirport(getDefaultAirportId(cityId));
}

export function getDefaultAirportIdForYear(cityId, year) {
  const targetYear = Number(year);
  if (!Number.isFinite(targetYear)) return getDefaultAirportId(cityId);
  const airports = getPlayableAirportsForCity(cityId, { year: targetYear });
  if (airports.length === 0) return virtualAirportId(cityId);
  const currentDefault = getDefaultAirportId(cityId);
  const ranked = [...airports].sort((a, b) => Number(isPrimaryAirportInYear(b, targetYear)) - Number(isPrimaryAirportInYear(a, targetYear))
    || Number(b.id === currentDefault) - Number(a.id === currentDefault)
    || Number(b.gameplay?.role === 'primary_hub') - Number(a.gameplay?.role === 'primary_hub')
    || (b.gameplay?.infrastructureTier || 0) - (a.gameplay?.infrastructureTier || 0));
  return ranked[0]?.id || virtualAirportId(cityId);
}

export function normalizeAirportIdForCity(airportId, cityId, options = {}) {
  if (airportServesCity(airportId, cityId)) return airportId;
  return options.legacyFallback
    ? virtualAirportId(cityId)
    : getDefaultAirportIdForYear(cityId, options.year);
}

export function airportDisplayCode(airportOrId) {
  const airport = typeof airportOrId === 'string' ? getAirport(airportOrId) : airportOrId;
  if (!airport) return '—';
  return airport.gameplay?.displayCode
    || airport.codes?.iata
    || airport.codes?.icao
    || airport.codes?.ident
    || airport.cityId.toUpperCase();
}

export function airportDisplayName(airportOrId) {
  const airport = typeof airportOrId === 'string' ? getAirport(airportOrId) : airportOrId;
  if (!airport) return '未知机场';
  return `${airport.name} (${airportDisplayCode(airport)})`;
}

export function allAirports() {
  return AIRPORTS;
}

export function airportDistanceKm(fromAirportId, toAirportId) {
  const from = getAirport(fromAirportId);
  const to = getAirport(toAirportId);
  if (!from || !to) return Infinity;
  const radians = Math.PI / 180;
  const phi1 = from.lat * radians;
  const phi2 = to.lat * radians;
  const deltaPhi = (to.lat - from.lat) * radians;
  const deltaLambda = (to.lon - from.lon) * radians;
  const value = Math.sin(deltaPhi / 2) ** 2
    + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function operatingDistanceForRoute(route) {
  return airportDistanceKm(route?.fromAirportId, route?.toAirportId);
}

export function airportFeeMultiplier(airportOrId) {
  const airport = typeof airportOrId === 'string' ? getAirport(airportOrId) : airportOrId;
  const tier = Number(airport?.gameplay?.feeTier);
  return Number.isFinite(tier) ? 0.7 + Math.max(1, Math.min(5, tier)) * 0.1 : 1;
}

export function isPrimaryAirportInYear(airportOrId, year) {
  const airport = typeof airportOrId === 'string' ? getAirport(airportOrId) : airportOrId;
  const targetYear = Number(year);
  if (!airport || !Number.isFinite(targetYear)) return false;
  return (airport.history || []).some((period) => period.active && period.primary
    && targetYear >= (period.fromYear ?? -Infinity)
    && targetYear <= (period.toYear ?? Infinity));
}
