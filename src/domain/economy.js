import { getCityMarketState } from '../data/cityEraData.js';
import { ERAS } from '../data/eras.js';
import { cityDist, clamp, getCity } from './helpers.js';
import { YIELD_CROSS_SUB_LONG, YIELD_INTERCONT_LONG, YIELD_INTERCONT_MID, YIELD_INTERCONT_SHORT } from './constants.js';
import { routeCostMultiplier, routeDemandMultiplier, routeServiceMultiplier } from './modifiers.js';
import { operationDemandMultiplier } from './operations.js';
import { getSubLandingDiscount, getSubLFBonus } from './subsidiaries.js';

export const ROUTE_REVENUE_DIVISOR = 28000;
export const PASSENGER_SERVICE_COST_PER_PAX_1000KM = 0.0012;

const POP_SCALE = 5;
const HUB_FACTOR = 0.12;
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

export function baseDemand(cityA, cityB, state = null) {
  const marketA = getCityMarketState(state, cityA.id);
  const marketB = getCityMarketState(state, cityB.id);
  const popBase = (marketA.pop + marketB.pop) * POP_SCALE;
  const marketDepth = (marketA.biz + marketB.biz) * BIZ_DEMAND_WEIGHT
    + (marketA.tour + marketB.tour) * TOUR_DEMAND_WEIGHT;
  const hubBonus = 1 + Math.max(cityA.level, cityB.level) * HUB_FACTOR;
  const distKm = cityDist(cityA, cityB);
  let distFactor = 1;
  if (distKm > 8000) distFactor = DIST_PREMIUM_LONG;
  else if (distKm > 4000) distFactor = DIST_PREMIUM_MID;
  else if (distKm < 2000) distFactor = DIST_SHORT_PENALTY;
  const regionBonus = cityA.region === cityB.region ? 1 : CROSS_REGION_BONUS;
  return Math.round((popBase + marketDepth) * hubBonus * distFactor * regionBonus);
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
    * operationDemandMultiplier(state);
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
  return { pax, rev, cargoRev, total: rev + cargoRev };
}

export function routeCost(state, route, assignedPlanes = getRouteAssignedPlanes(state, route)) {
  const cityA = getCity(route.from);
  const cityB = getCity(route.to);
  if (!cityA || !cityB) return { fuel: 0, maint: 0, crew: 0, landing: 0, catering: 0, total: 0 };
  const d = cityDist(cityA, cityB);
  const serviceMultiplier = effectiveServiceMultiplier(state, route);
  if (serviceMultiplier <= 0) return { fuel: 0, maint: 0, crew: 0, landing: 0, catering: 0, total: 0 };
  const serviceCostScale = 1 + (serviceMultiplier - 1) * SERVICE_COST_SCALE;
  let fuelCost = 0;
  let landingFee = 0;
  for (const plane of assignedPlanes) {
    const fuelRate = state.playerTrait === '豆' ? plane.fuel * 0.9 : plane.fuel;
    fuelCost += fuelRate * (state.oilPrice / 80) * (d / 5000);
    const landingDiscount = (1 - getSubLandingDiscount(state, route.from)) * (1 - getSubLandingDiscount(state, route.to));
    landingFee += (LANDING_BASE + (cityA.level + cityB.level) * LANDING_PER_LEVEL * Math.sqrt(d / LANDING_DIST_REF)) * landingDiscount * serviceCostScale;
  }
  const totalSeats = routeSeatCapacity(state, route, assignedPlanes);
  const passengers = Math.round(totalSeats * Math.max(0, Number(route.loadFactor) || 0)) * serviceMultiplier;
  const eraCostMultiplier = ERAS.find((era) => era.id === state.era)?.cabinCostMultiplier || 1;
  const catering = passengers * (d / 1000) * PASSENGER_SERVICE_COST_PER_PAX_1000KM * eraCostMultiplier;
  const subtotal = fuelCost + landingFee + catering;
  const costMultiplier = routeCostMultiplier(state, route);
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
  return assignedPlanes.reduce((sum, plane) => sum + plane.seats, 0);
}

export function getRouteAssignedPlanes(state, route, fleetByUid = new Map(state.fleet.map((plane) => [plane.uid, plane]))) {
  return (route.assignedPlanes || []).map((uid) => fleetByUid.get(uid)).filter(Boolean);
}

function effectiveServiceMultiplier(state, route) {
  const cityA = getCity(route.from);
  const cityB = getCity(route.to);
  if (!cityA || !cityB) return 0;
  return distanceServiceMultiplier(cityDist(cityA, cityB)) * routeServiceMultiplier(state, route);
}
