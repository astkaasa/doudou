import { getCityMarketState } from '../data/cityEraData.js';
import { ERAS } from '../data/eras.js';
import { cityDist, clamp, getCity } from './helpers.js';
import { airportFeeMultiplier, operatingDistanceForRoute } from './airports.js';
import { routePlaneSeatCapacity } from './airportPerformance.js';
import { routeCapacityCostMultiplier, routeCapacityDemandMultiplier, routeHubDemandMultiplier } from './airportCapacity.js';
import {
  airportCargoRevenueMultiplier,
  airportGroundAccessDemandMultiplier,
  airportMaintenanceCostMultiplier,
  airportRelationshipFeeDiscount,
  getAirportLandingDiscount,
} from './airportManagement.js';
import { YIELD_CROSS_SUB_LONG, YIELD_INTERCONT_LONG, YIELD_INTERCONT_MID, YIELD_INTERCONT_SHORT } from './constants.js';
import { routeCostMultiplier, routeDemandMultiplier, routeServiceMultiplier } from './modifiers.js';
import { operationDemandMultiplier } from './operations.js';
import { getSubLFBonus } from './subsidiaries.js';

export const ROUTE_REVENUE_DIVISOR = 27150;
export const PASSENGER_SERVICE_COST_PER_PAX_1000KM = 0.0012;

const POP_SCALE = 5;
const BIZ_DEMAND_WEIGHT = 0.8;
const TOUR_DEMAND_WEIGHT = 0.3;
const DIST_PREMIUM_LONG = 1.4;
const DIST_PREMIUM_MID = 1.2;
const DIST_SHORT_PENALTY = 0.85;
const CROSS_REGION_BONUS = 1.1;
const LANDING_BASE = 0.2;
const LANDING_PER_LEVEL = 0.10;
const LANDING_DIST_REF = 3000;
const SERVICE_COST_SCALE = 0.3;

export const POPULATION_DEMAND_EXPONENT = 0.65;
export const POPULATION_DEMAND_REFERENCE_M = 10;
export const POPULATION_DEMAND_REFERENCE_SCORE = 5;

export function populationDemandScore(populationM, options = {}) {
  const population = Math.max(0, Number(populationM) || 0);
  const exponent = Number.isFinite(options.exponent) && options.exponent > 0 && options.exponent < 1
    ? options.exponent
    : POPULATION_DEMAND_EXPONENT;
  const referencePopulation = Number.isFinite(options.referencePopulation) && options.referencePopulation > 0
    ? options.referencePopulation
    : POPULATION_DEMAND_REFERENCE_M;
  const referenceScore = Number.isFinite(options.referenceScore) && options.referenceScore > 0
    ? options.referenceScore
    : POPULATION_DEMAND_REFERENCE_SCORE;
  if (population === 0) return 0;
  return referenceScore * Math.pow(population / referencePopulation, exponent);
}

export function populationAviationPropensity(state) {
  if (state?.era === 'era1') return 0.3;
  if (state?.era === 'era2') return 1.6;
  if (state?.era === 'era3') return 1.75;
  if (state?.era === 'era4') {
    const year = Math.max(1960, Math.min(2000, Number(state.year) || 1960));
    return 0.7 + ((year - 1960) / 40) * 1.0;
  }
  return 1;
}

export function baseDemand(cityA, cityB, state = null) {
  const marketA = getCityMarketState(state, cityA.id);
  const marketB = getCityMarketState(state, cityB.id);
  const popBase = (populationDemandScore(marketA.pop) + populationDemandScore(marketB.pop))
    * POP_SCALE
    * populationAviationPropensity(state);
  const marketDepth = (marketA.biz + marketB.biz) * BIZ_DEMAND_WEIGHT
    + (marketA.tour + marketB.tour) * TOUR_DEMAND_WEIGHT;
  const distKm = cityDist(cityA, cityB);
  let distFactor = 1;
  if (distKm > 8000) distFactor = DIST_PREMIUM_LONG;
  else if (distKm > 4000) distFactor = DIST_PREMIUM_MID;
  else if (distKm < 2000) distFactor = DIST_SHORT_PENALTY;
  const regionBonus = cityA.region === cityB.region ? 1 : CROSS_REGION_BONUS;
  return Math.round((popBase + marketDepth) * distFactor * regionBonus);
}

export function seasonModifier(q) {
  return [0.85, 0.9, 1.0, 0.95][q - 1] ?? 1;
}

export function calcLoadFactor(state, route, price, brand, competitors, assignedPlanes = getRouteAssignedPlanes(state, route)) {
  const cityA = getCity(route.from);
  const cityB = getCity(route.to);
  if (!cityA || !cityB) return 0;
  if (routeServiceMultiplier(state, route) <= 0) return 0;
  const baseDemandVal = baseDemand(cityA, cityB, state)
    * seasonModifier(state.quarter)
    * routeDemandMultiplier(state, route)
    * operationDemandMultiplier(state)
    * routeCapacityDemandMultiplier(state, route)
    * routeHubDemandMultiplier(state, route)
    * routeGroundAccessMultiplier(state, route);
  const refPrice = route.suggestedPrice;
  const priceRatio = price / refPrice;
  const priceEffect = Math.pow(priceRatio, -0.8);
  const brandEffect = 1 + (brand - 1) * 0.06;
  const compEffect = 1 / (1 + competitors * 0.3);
  const subsidiaryEffect = 1 + getSubLFBonus(state, route.from) + getSubLFBonus(state, route.to);
  const totalSeats = routeSeatCapacity(state, route, assignedPlanes);
  if (totalSeats === 0) return 0;
  const lf = (baseDemandVal * priceEffect * brandEffect * compEffect * subsidiaryEffect) / totalSeats;
  return clamp(lf, 0, 1);
}

export function suggestedPrice(from, to) {
  const d = cityDist(getCity(from), getCity(to));
  return Math.round(d * 0.10 + 80);
}

export function distanceServiceMultiplier(distanceKm) {
  if (distanceKm < 2000) return 4;
  if (distanceKm < 4500) return 2.5;
  if (distanceKm < 8000) return 1.5;
  return 1;
}

export function routeYieldPremium(cityA, cityB) {
  if (!cityA || !cityB) return 1;
  const distanceKm = cityDist(cityA, cityB);
  const crossRegion = cityA.region !== cityB.region;
  const crossSubRegion = cityA.subRegion !== cityB.subRegion;
  if (crossRegion && distanceKm > 8000) return YIELD_INTERCONT_LONG;
  if (crossRegion && distanceKm > 4500) return YIELD_INTERCONT_MID;
  if (crossRegion && distanceKm > 3000) return YIELD_INTERCONT_SHORT;
  if (crossSubRegion && distanceKm > 3000) return YIELD_CROSS_SUB_LONG;
  return 1;
}

export function routeRevenue(state, route, assignedPlanes = getRouteAssignedPlanes(state, route)) {
  const cityA = getCity(route.from);
  const cityB = getCity(route.to);
  if (!cityA || !cityB) return { pax: 0, rev: 0, cargoRev: 0, total: 0 };
  const lf = route.loadFactor;
  const totalSeats = routeSeatCapacity(state, route, assignedPlanes);
  const serviceMultiplier = effectiveServiceMultiplier(state, route);
  const yieldPremium = routeYieldPremium(cityA, cityB);
  const pax = Math.round(totalSeats * lf) * serviceMultiplier;
  const rev = pax * route.price * yieldPremium / ROUTE_REVENUE_DIVISOR;
  const cargoRev = pax * 0.02 * route.price * 0.3 * yieldPremium / ROUTE_REVENUE_DIVISOR;
  const adjustedCargoRev = cargoRev * routeCargoMultiplier(state, route);
  return { pax, rev, cargoRev: adjustedCargoRev, total: rev + adjustedCargoRev };
}

export function routeCost(state, route, assignedPlanes = getRouteAssignedPlanes(state, route)) {
  const cityA = getCity(route.from);
  const cityB = getCity(route.to);
  if (!cityA || !cityB) return { fuel: 0, maint: 0, crew: 0, landing: 0, catering: 0, total: 0 };
  const d = routeOperatingDistance(route, cityA, cityB);
  const serviceMultiplier = effectiveServiceMultiplier(state, route);
  if (serviceMultiplier <= 0) return { fuel: 0, maint: 0, crew: 0, landing: 0, catering: 0, total: 0 };
  const serviceCostScale = 1 + (serviceMultiplier - 1) * SERVICE_COST_SCALE;
  let fuelCost = 0;
  let landingFee = 0;
  const airportFeeFactor = Math.sqrt(
    airportFeeMultiplier(route.fromAirportId) * airportFeeMultiplier(route.toAirportId),
  );
  for (const plane of assignedPlanes) {
    const fuelRate = state.playerTrait === '豆' ? plane.fuel * 0.9 : plane.fuel;
    fuelCost += fuelRate * (state.oilPrice / 80) * (d / 5000);
    const landingDiscount = (1 - airportEndpointLandingDiscount(state, route, route.fromAirportId, route.from))
      * (1 - airportEndpointLandingDiscount(state, route, route.toAirportId, route.to));
    landingFee += (LANDING_BASE + (cityA.level + cityB.level) * LANDING_PER_LEVEL * Math.sqrt(d / LANDING_DIST_REF))
      * airportFeeFactor
      * landingDiscount
      * serviceCostScale;
  }
  const totalSeats = routeSeatCapacity(state, route, assignedPlanes);
  const passengers = Math.round(totalSeats * Math.max(0, Number(route.loadFactor) || 0)) * serviceMultiplier;
  const eraCostMultiplier = ERAS.find((era) => era.id === state.era)?.cabinCostMultiplier || 1;
  const catering = passengers * (d / 1000) * PASSENGER_SERVICE_COST_PER_PAX_1000KM * eraCostMultiplier;
  const subtotal = fuelCost + landingFee + catering;
  const airportMaintenanceMultiplier = Math.sqrt(
    airportMaintenanceCostMultiplier(state, route.fromAirportId)
      * airportMaintenanceCostMultiplier(state, route.toAirportId),
  );
  const congestionMultiplier = routeCapacityCostMultiplier(state, route);
  const costMultiplier = routeCostMultiplier(state, route) * airportMaintenanceMultiplier * congestionMultiplier;
  return {
    fuel: fuelCost,
    maint: 0,
    crew: 0,
    landing: landingFee,
    catering,
    total: subtotal * costMultiplier,
  };
}

export function routeSeatCapacity(state, route, assignedPlanes = getRouteAssignedPlanes(state, route)) {
  const hasAirportPair = Boolean(route?.fromAirportId && route?.toAirportId);
  return assignedPlanes.reduce((sum, plane) => sum + (
    hasAirportPair ? routePlaneSeatCapacity(route, plane, state) : plane.seats
  ), 0);
}

export function calcNetworkLoadFactor(state) {
  const routes = Array.isArray(state?.routes) ? state.routes : [];
  const fleet = Array.isArray(state?.fleet) ? state.fleet : [];
  const fleetByUid = new Map(fleet.map((plane) => [plane.uid, plane]));
  const totals = routes.reduce((result, route) => {
    if (route?.suspended) return result;
    const assignedPlanes = getRouteAssignedPlanes(state, route, fleetByUid);
    const capacity = routeSeatCapacity(state, route, assignedPlanes);
    if (!(capacity > 0)) return result;
    result.seats += capacity;
    result.occupied += capacity * clamp(Number(route.loadFactor) || 0, 0, 1);
    return result;
  }, { seats: 0, occupied: 0 });
  return totals.seats > 0 ? totals.occupied / totals.seats : 0;
}

export function getRouteAssignedPlanes(state, route, fleetByUid = new Map(state.fleet.map((plane) => [plane.uid, plane]))) {
  return (route.assignedPlanes || []).map((uid) => fleetByUid.get(uid)).filter(Boolean);
}

function effectiveServiceMultiplier(state, route) {
  const cityA = getCity(route.from);
  const cityB = getCity(route.to);
  if (!cityA || !cityB) return 0;
  return distanceServiceMultiplier(routeOperatingDistance(route, cityA, cityB)) * routeServiceMultiplier(state, route);
}

export function routeOperatingDistance(route, cityA = getCity(route?.from), cityB = getCity(route?.to)) {
  const airportDistance = operatingDistanceForRoute(route);
  return Number.isFinite(airportDistance) ? airportDistance : cityDist(cityA, cityB);
}

function routeGroundAccessMultiplier(state, route) {
  return Math.sqrt(
    airportGroundAccessDemandMultiplier(state, route?.fromAirportId)
      * airportGroundAccessDemandMultiplier(state, route?.toAirportId),
  );
}

function routeCargoMultiplier(state, route) {
  return Math.sqrt(
    airportCargoRevenueMultiplier(state, route?.fromAirportId)
      * airportCargoRevenueMultiplier(state, route?.toAirportId),
  );
}

function airportEndpointLandingDiscount(state, route, airportId, cityId) {
  const investment = getAirportLandingDiscount(state, airportId, cityId);
  const relationship = airportRelationshipFeeDiscount(state, airportId);
  const contract = (state?.airportContracts || [])
    .filter((item) => item.status === 'active' && item.routeUid === route?.uid && item.airportId === airportId)
    .reduce((maximum, item) => Math.max(maximum, Number(item.landingDiscount) || 0), 0);
  return 1 - (1 - investment) * (1 - relationship) * (1 - contract);
}
