import { CITIES } from '../data/cities.js';
import { routePlanePerformance } from './airportPerformance.js';
import {
  airportDisplayCode,
  airportServesCity,
  allAirports,
  getAirport,
  getDefaultAirportIdForYear,
  isAirportActive,
  isAirportGameplayAvailable,
} from './airports.js';
import { addAirportRelation, normalizeAirportManagementState } from './airportManagement.js';
import { routeOperatingDistance, suggestedPrice } from './economy.js';
import { getCity, routeKey } from './helpers.js';
import { availablePlanes, openRoute, routeOpenCost } from './routes.js';

export const AIRPORT_CONTRACT_STATUSES = Object.freeze([
  'offered',
  'active',
  'completed',
  'breached',
  'expired',
]);

const MAX_OFFERS = 3;
const HISTORY_LIMIT = 12;

export function normalizeAirportContractState(state) {
  normalizeAirportManagementState(state);
  const usedIds = new Set();
  let nextCounter = Math.max(1, Number(state.airportContractIdCounter) || 1);
  state.airportContracts = (state.airportContracts || []).flatMap((contract) => {
    if (!contract || typeof contract !== 'object') return [];
    const airport = getAirport(contract.airportId);
    const cityId = airportServesCity(airport, contract.cityId) ? contract.cityId : airport?.cityId;
    if (!airport || !getCity(cityId) || !getCity(contract.originCityId) || cityId === contract.originCityId) return [];
    let id = String(contract.id || '');
    if (!/^airport-contract-\d+$/.test(id) || usedIds.has(id)) {
      while (usedIds.has(`airport-contract-${nextCounter}`)) nextCounter++;
      id = `airport-contract-${nextCounter++}`;
    }
    usedIds.add(id);
    const numericId = Number(id.match(/(\d+)$/)?.[1]);
    if (Number.isInteger(numericId)) nextCounter = Math.max(nextCounter, numericId + 1);
    const status = AIRPORT_CONTRACT_STATUSES.includes(contract.status) ? contract.status : 'expired';
    const durationQuarters = clampInteger(contract.durationQuarters, 2, 12, 4);
    return [{
      id,
      status,
      airportId: airport.id,
      cityId,
      originCityId: contract.originCityId,
      offerPeriod: typeof contract.offerPeriod === 'string' ? contract.offerPeriod : null,
      durationQuarters,
      remainingQuarters: clampInteger(contract.remainingQuarters, 0, durationQuarters, durationQuarters),
      requiredMetQuarters: clampInteger(contract.requiredMetQuarters, 1, durationQuarters, Math.max(1, durationQuarters - 1)),
      metQuarters: clampInteger(contract.metQuarters, 0, durationQuarters, 0),
      missedQuarters: clampInteger(contract.missedQuarters, 0, durationQuarters, 0),
      minLoadFactor: clampNumber(contract.minLoadFactor, 0.2, 0.9, 0.45),
      minServiceMultiplier: clampNumber(contract.minServiceMultiplier, 0.5, 4, 1),
      upfrontSubsidy: nonNegativeMoney(contract.upfrontSubsidy),
      quarterlyGuarantee: nonNegativeMoney(contract.quarterlyGuarantee),
      completionBonus: nonNegativeMoney(contract.completionBonus),
      landingDiscount: clampNumber(contract.landingDiscount, 0, 0.6, 0.3),
      routeUid: Number.isInteger(Number(contract.routeUid)) ? Number(contract.routeUid) : null,
      acceptedTurn: contract.acceptedTurn !== null && contract.acceptedTurn !== undefined && Number.isInteger(Number(contract.acceptedTurn))
        ? Number(contract.acceptedTurn)
        : null,
      resolvedTurn: contract.resolvedTurn !== null && contract.resolvedTurn !== undefined && Number.isInteger(Number(contract.resolvedTurn))
        ? Number(contract.resolvedTurn)
        : null,
      lastQuarterMet: Boolean(contract.lastQuarterMet),
    }];
  });
  state.airportContractIdCounter = nextCounter;
  const activeIds = new Set(state.airportContracts.filter((contract) => contract.status === 'active').map((contract) => contract.id));
  (state.routes || []).forEach((route) => {
    if (route.airportContractId && !activeIds.has(route.airportContractId)) delete route.airportContractId;
  });
  return state;
}

export function getAirportOpportunityPool(state) {
  const existingRoutes = new Set((state?.routes || []).map((route) => routeKey(route.from, route.to)));
  const bases = [state?.hq, ...(state?.branches || [])].filter((cityId) => getCity(cityId));
  if (bases.length === 0) return [];
  const cityById = new Map(CITIES.map((city) => [city.id, city]));
  const candidates = [];
  allAirports().forEach((airport) => {
    if (!isOpportunityAirport(airport, state?.year, state?.quarter)) return;
    const cityIds = (airport.servedCityIds || [airport.cityId]).filter((cityId) => cityById.has(cityId));
    cityIds.forEach((cityId) => {
      const city = cityById.get(cityId);
      bases.forEach((originCityId) => {
        if (originCityId === cityId || existingRoutes.has(routeKey(originCityId, cityId))) return;
        const route = {
          from: originCityId,
          to: cityId,
          fromAirportId: getDefaultAirportIdForYear(originCityId, state?.year),
          toAirportId: airport.id,
          serviceMultiplier: 1,
        };
        const distance = routeOperatingDistance(route);
        if (!Number.isFinite(distance) || distance < 80 || distance > 12000) return;
        candidates.push({
          airport,
          airportId: airport.id,
          cityId,
          originCityId,
          distance,
          score: opportunityScore(city, airport, distance, state),
        });
      });
    });
  });
  return candidates.sort((a, b) => b.score - a.score
    || a.distance - b.distance
    || a.airportId.localeCompare(b.airportId));
}

export function refreshAirportContractOffers(state) {
  normalizeAirportContractState(state);
  const period = contractPeriodKey(state);
  if (state.airportContractOfferPeriod === period
    && state.airportContracts.some((contract) => contract.status === 'offered' && contract.offerPeriod === period)) {
    return getAirportContractOffers(state);
  }
  state.airportContracts.forEach((contract) => {
    if (contract.status === 'offered') {
      contract.status = 'expired';
      contract.resolvedTurn = Number(state.turnsPlayed) || 0;
    }
  });
  const activeAirportIds = new Set(state.airportContracts
    .filter((contract) => contract.status === 'active')
    .map((contract) => contract.airportId));
  const activeCityPairs = new Set(state.airportContracts
    .filter((contract) => contract.status === 'active')
    .map((contract) => routeKey(contract.originCityId, contract.cityId)));
  const selected = [];
  const seenAirports = new Set();
  const seenPairs = new Set();
  const rotation = hashString(`${period}|${state.hq}|${state.turnsPlayed}`);
  const pool = getAirportOpportunityPool(state)
    .map((item) => ({ ...item, rotatedScore: item.score + ((hashString(`${rotation}|${item.airportId}|${item.originCityId}`) % 31) - 15) }))
    .sort((a, b) => b.rotatedScore - a.rotatedScore || b.score - a.score);
  const firstCompatible = pool.find((opportunity) => opportunityHasCompatiblePlane(state, opportunity));
  const orderedPool = firstCompatible
    ? [firstCompatible, ...pool.filter((opportunity) => opportunity !== firstCompatible)]
    : pool;
  for (const opportunity of orderedPool) {
    const pair = routeKey(opportunity.originCityId, opportunity.cityId);
    if (activeAirportIds.has(opportunity.airportId) || activeCityPairs.has(pair)) continue;
    if (seenAirports.has(opportunity.airportId) || seenPairs.has(pair)) continue;
    selected.push(createOffer(state, opportunity, period));
    seenAirports.add(opportunity.airportId);
    seenPairs.add(pair);
    if (selected.length >= MAX_OFFERS) break;
  }
  state.airportContracts.push(...selected);
  state.airportContractOfferPeriod = period;
  pruneContractHistory(state);
  return selected;
}

function opportunityHasCompatiblePlane(state, opportunity) {
  const route = {
    from: opportunity.originCityId,
    to: opportunity.cityId,
    fromAirportId: getDefaultAirportIdForYear(opportunity.originCityId, state.year),
    toAirportId: opportunity.airportId,
  };
  const distance = routeOperatingDistance(route);
  return availablePlanes(state).some((plane) => plane.range >= distance
    && routePlanePerformance(route, plane, state).compatible);
}

export function getAirportContractOffers(state) {
  return (state?.airportContracts || []).filter((contract) => contract.status === 'offered');
}

export function getActiveAirportContracts(state) {
  return (state?.airportContracts || []).filter((contract) => contract.status === 'active');
}

export function compatibleContractPlanes(state, contractOrId) {
  const contract = resolveContract(state, contractOrId);
  if (!contract || contract.status !== 'offered') return [];
  const route = contractRouteDraft(contract, state);
  const distance = routeOperatingDistance(route);
  return availablePlanes(state).filter((plane) => plane.range >= distance
    && routePlanePerformance(route, plane, state).compatible);
}

export function acceptAirportContract(state, contractId, planeUid) {
  normalizeAirportContractState(state);
  const contract = resolveContract(state, contractId);
  if (!contract || contract.status !== 'offered') return { ok: false, message: '合同机会已失效' };
  if (!isAirportActive(contract.airportId, state.year)) return { ok: false, message: '目标机场当前不可用' };
  const plane = compatibleContractPlanes(state, contract).find((item) => item.uid === Number(planeUid));
  if (!plane) return { ok: false, message: '请选择可用且适配的飞机' };
  const routeDraft = contractRouteDraft(contract, state);
  state.cash += contract.upfrontSubsidy;
  const result = openRoute(
    state,
    contract.originCityId,
    contract.cityId,
    plane.uid,
    suggestedPrice(contract.originCityId, contract.cityId),
    routeDraft,
  );
  if (!result.ok) {
    state.cash -= contract.upfrontSubsidy;
    return result;
  }
  contract.status = 'active';
  contract.routeUid = result.route.uid;
  contract.acceptedTurn = Number(state.turnsPlayed) || 0;
  contract.remainingQuarters = contract.durationQuarters;
  contract.metQuarters = 0;
  contract.missedQuarters = 0;
  result.route.airportContractId = contract.id;
  addAirportRelation(state, contract.airportId, 2);
  return { ok: true, contract, route: result.route, subsidy: contract.upfrontSubsidy, cost: result.cost };
}

export function settleAirportContracts(state) {
  normalizeAirportContractState(state);
  let income = 0;
  let penalty = 0;
  const completed = [];
  const breached = [];
  getActiveAirportContracts(state).forEach((contract) => {
    const route = (state.routes || []).find((item) => item.uid === contract.routeUid);
    if (!route) {
      penalty += breachContract(state, contract);
      breached.push(contract.id);
      return;
    }
    const met = !route.suspended
      && (Number(route.serviceMultiplier) || 1) >= contract.minServiceMultiplier
      && (Number(route.loadFactor) || 0) >= contract.minLoadFactor;
    contract.lastQuarterMet = met;
    if (met) {
      contract.metQuarters += 1;
      income += contract.quarterlyGuarantee;
      addAirportRelation(state, contract.airportId, 1);
    } else {
      contract.missedQuarters += 1;
    }
    contract.remainingQuarters = Math.max(0, contract.remainingQuarters - 1);
    const canStillComplete = contract.metQuarters + contract.remainingQuarters >= contract.requiredMetQuarters;
    if (!canStillComplete) {
      penalty += breachContract(state, contract);
      breached.push(contract.id);
    } else if (contract.remainingQuarters === 0) {
      contract.status = 'completed';
      contract.resolvedTurn = Number(state.turnsPlayed) || 0;
      delete route.airportContractId;
      income += contract.completionBonus;
      addAirportRelation(state, contract.airportId, 10);
      completed.push(contract.id);
    }
  });
  state._lastAirportContractIncome = roundMoney(income);
  state._lastAirportContractPenalty = roundMoney(penalty);
  pruneContractHistory(state);
  return {
    income: state._lastAirportContractIncome,
    penalty: state._lastAirportContractPenalty,
    net: roundMoney(income - penalty),
    completed,
    breached,
  };
}

export function activeAirportContractLandingDiscount(state, route, airportId) {
  return getActiveAirportContracts(state)
    .filter((contract) => contract.routeUid === route?.uid && contract.airportId === airportId)
    .reduce((maximum, contract) => Math.max(maximum, contract.landingDiscount), 0);
}

export function airportContractSummary(state) {
  const contracts = state?.airportContracts || [];
  return {
    offered: contracts.filter((contract) => contract.status === 'offered').length,
    active: contracts.filter((contract) => contract.status === 'active').length,
    completed: contracts.filter((contract) => contract.status === 'completed').length,
    breached: contracts.filter((contract) => contract.status === 'breached').length,
  };
}

export function describeAirportContract(contract) {
  const airport = getAirport(contract.airportId);
  return `${getCity(contract.originCityId)?.name || contract.originCityId} → ${getCity(contract.cityId)?.name || contract.cityId} ${airportDisplayCode(airport)}`;
}

function createOffer(state, opportunity, period) {
  const airport = opportunity.airport;
  const city = getCity(opportunity.cityId);
  const remote = ['remote', 'event', 'special'].includes(city?.marketRole) || airport.gameplay?.role === 'remote';
  const durationQuarters = remote ? 6 : 4;
  const guarantee = roundMoney(0.6 + (Number(city?.level) || 1) * 0.28 + (remote ? 0.35 : 0));
  const baseOpenCost = routeOpenCost(opportunity.originCityId, opportunity.cityId);
  return {
    id: `airport-contract-${state.airportContractIdCounter++}`,
    status: 'offered',
    airportId: opportunity.airportId,
    cityId: opportunity.cityId,
    originCityId: opportunity.originCityId,
    offerPeriod: period,
    durationQuarters,
    remainingQuarters: durationQuarters,
    requiredMetQuarters: durationQuarters - 1,
    metQuarters: 0,
    missedQuarters: 0,
    minLoadFactor: remote ? 0.4 : 0.48,
    minServiceMultiplier: 1,
    upfrontSubsidy: roundMoney(baseOpenCost * 0.7 + (remote ? 2 : 1)),
    quarterlyGuarantee: guarantee,
    completionBonus: roundMoney(guarantee * 2),
    landingDiscount: remote ? 0.4 : 0.3,
    routeUid: null,
    acceptedTurn: null,
    resolvedTurn: null,
    lastQuarterMet: false,
  };
}

function isOpportunityAirport(airport, year, quarter) {
  if (!airport || airport.source?.provider !== 'ourairports'
    || !isAirportActive(airport, year)
    || !isAirportGameplayAvailable(airport, year, quarter)) return false;
  if ((Number(airport.factual?.maxRunwayM) || 0) < 900) return false;
  const city = getCity(airport.cityId);
  if (!city) return false;
  const confidence = airport.audit?.confidence;
  const role = airport.gameplay?.role;
  const reviewedSecondary = ['verified', 'high'].includes(confidence)
    && ['secondary', 'regional', 'remote', 'special'].includes(role);
  const opportunityCity = ['remote', 'event', 'special'].includes(city.marketRole)
    && ['verified', 'high'].includes(confidence);
  const nearbyCandidate = confidence === 'candidate'
    && Number(airport.audit?.distanceKm) <= 80
    && (airport.factual?.scheduledService || ['small_airport', 'medium_airport'].includes(airport.factual?.type));
  return reviewedSecondary || opportunityCity || nearbyCandidate;
}

function opportunityScore(city, airport, distance, state) {
  const roleBonus = { remote: 45, special: 38, regional: 30, secondary: 24, primary_hub: 10 }[airport.gameplay?.role] || 0;
  const cityBonus = { remote: 40, event: 32, special: 30, regional: 18, core: 8 }[city.marketRole] || 0;
  const candidateBonus = airport.audit?.confidence === 'candidate' ? 8 : 20;
  const distanceFit = Math.max(0, 24 - Math.abs(distance - 2200) / 250);
  const relationPenalty = Math.max(0, Number(state?.airportRelations?.[airport.id]) || 0) * 0.1;
  return roleBonus + cityBonus + candidateBonus + distanceFit + city.level * 3 - relationPenalty;
}

function contractRouteDraft(contract, state = null) {
  return {
    from: contract.originCityId,
    to: contract.cityId,
    fromAirportId: getDefaultAirportIdForYear(contract.originCityId, state?.year),
    toAirportId: contract.airportId,
    serviceMultiplier: 1,
  };
}

function breachContract(state, contract) {
  contract.status = 'breached';
  contract.resolvedTurn = Number(state.turnsPlayed) || 0;
  addAirportRelation(state, contract.airportId, -15);
  const route = (state.routes || []).find((item) => item.uid === contract.routeUid);
  if (route) delete route.airportContractId;
  return roundMoney(contract.upfrontSubsidy * 0.5);
}

function resolveContract(state, contractOrId) {
  if (contractOrId && typeof contractOrId === 'object') return contractOrId;
  return (state?.airportContracts || []).find((contract) => contract.id === contractOrId) || null;
}

function pruneContractHistory(state) {
  const live = state.airportContracts.filter((contract) => ['offered', 'active'].includes(contract.status));
  const history = state.airportContracts
    .filter((contract) => !['offered', 'active'].includes(contract.status))
    .sort((a, b) => (b.resolvedTurn ?? -1) - (a.resolvedTurn ?? -1))
    .slice(0, HISTORY_LIMIT);
  state.airportContracts = [...live, ...history];
}

function contractPeriodKey(state) {
  return `${Number(state?.year) || 0}-Q${Number(state?.quarter) || 1}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function nonNegativeMoney(value) {
  return roundMoney(Math.max(0, Number(value) || 0));
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
