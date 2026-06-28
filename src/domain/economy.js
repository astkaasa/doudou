import { getCityMarketState } from '../data/cityEraData.js';
import { cityDist, clamp, getCity } from './helpers.js';
import { effectiveFrequency, routeCostMultiplier, routeDemandMultiplier } from './modifiers.js';

export const ROUTE_REVENUE_DIVISOR = 28000;

const POP_SCALE = 5;
const HUB_FACTOR = 0.12;
const BIZ_DEMAND_WEIGHT = 0.8;
const TOUR_DEMAND_WEIGHT = 0.3;
const DIST_PREMIUM_LONG = 1.4;
const DIST_PREMIUM_MID = 1.2;
const DIST_SHORT_PENALTY = 0.85;
const CROSS_REGION_BONUS = 1.1;
const LANDING_BASE = 0.3;
const LANDING_PER_LEVEL = 0.15;
const LANDING_DIST_REF = 3000;
const CATERING_PER_FLIGHT = 0.03;
const FREQ_COST_SCALE = 0.3;
const MAINT_AGING = 0.04;
const CREW_PER_180 = 0.20;

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
  const baseDemandVal = baseDemand(cityA, cityB, state) * seasonModifier(state.quarter) * routeDemandMultiplier(state, route);
  const refPrice = route.suggestedPrice;
  const priceRatio = price / refPrice;
  const priceEffect = Math.pow(priceRatio, -0.8);
  const brandEffect = 1 + (brand - 1) * 0.06;
  const compEffect = 1 / (1 + competitors * 0.3);
  const totalSeats = routeSeatCapacity(state, route, assignedPlanes);
  if (totalSeats === 0) return 0;
  const lf = (baseDemandVal * priceEffect * brandEffect * compEffect) / totalSeats;
  return clamp(lf, 0, 1);
}

export function suggestedPrice(from, to) {
  const d = cityDist(getCity(from), getCity(to));
  return Math.round(d * 0.10 + 80);
}

export function routeFrequencyFactor(distanceKm) {
  if (distanceKm < 2000) return 4;
  if (distanceKm < 4500) return 2.5;
  if (distanceKm < 8000) return 1.5;
  return 1;
}

export function routeRevenue(state, route, assignedPlanes = getRouteAssignedPlanes(state, route)) {
  const lf = route.loadFactor;
  const totalSeats = routeSeatCapacity(state, route, assignedPlanes);
  const frequency = effectiveRouteFrequency(state, route);
  const pax = Math.round(totalSeats * lf) * frequency;
  const rev = pax * route.price / ROUTE_REVENUE_DIVISOR;
  const cargoRev = pax * 0.02 * route.price * 0.3 / ROUTE_REVENUE_DIVISOR;
  return { pax, rev, cargoRev, total: rev + cargoRev };
}

export function routeCost(state, route, assignedPlanes = getRouteAssignedPlanes(state, route)) {
  const cityA = getCity(route.from);
  const cityB = getCity(route.to);
  const d = cityDist(cityA, cityB);
  const frequency = effectiveRouteFrequency(state, route);
  if (frequency <= 0) return { fuel: 0, maint: 0, crew: 0, landing: 0, catering: 0, total: 0 };
  const frequencyCostScale = 1 + (frequency - 1) * FREQ_COST_SCALE;
  let fuelCost = 0;
  let maintCost = 0;
  let crewCost = 0;
  let landingFee = 0;
  let catering = 0;
  for (const plane of assignedPlanes) {
    const fuelRate = state.playerTrait === '豆' ? plane.fuel * 0.9 : plane.fuel;
    const maintRate = state.playerTrait === '机' ? plane.maint * 0.9 : plane.maint;
    fuelCost += fuelRate * (state.oilPrice / 80) * (d / 5000);
    maintCost += maintRate * (1 + MAINT_AGING * plane.age);
    crewCost += CREW_PER_180 * (plane.seats / 180);
    landingFee += (LANDING_BASE + (cityA.level + cityB.level) * LANDING_PER_LEVEL * Math.sqrt(d / LANDING_DIST_REF)) * frequencyCostScale;
    catering += CATERING_PER_FLIGHT * frequencyCostScale;
  }
  const subtotal = fuelCost + maintCost + crewCost + landingFee + catering;
  const costMultiplier = routeCostMultiplier(state, route);
  return {
    fuel: fuelCost,
    maint: maintCost,
    crew: crewCost,
    landing: landingFee,
    catering,
    total: subtotal * costMultiplier,
  };
}

export function routeSeatCapacity(state, route, assignedPlanes = getRouteAssignedPlanes(state, route)) {
  const routeFrequency = effectiveFrequency(state, route) || 0;
  if (routeFrequency <= 0) return 0;
  return assignedPlanes.reduce((sum, plane) => sum + plane.seats, 0) * routeFrequency;
}

export function getRouteAssignedPlanes(state, route, fleetByUid = new Map(state.fleet.map((plane) => [plane.uid, plane]))) {
  return (route.assignedPlanes || []).map((uid) => fleetByUid.get(uid)).filter(Boolean);
}

function effectiveRouteFrequency(state, route) {
  const cityA = getCity(route.from);
  const cityB = getCity(route.to);
  if (!cityA || !cityB) return 0;
  return routeFrequencyFactor(cityDist(cityA, cityB)) * (effectiveFrequency(state, route) || 0);
}
