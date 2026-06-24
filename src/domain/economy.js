import { baseDemandFactors } from './tuning.js';
import { cityDist, clamp, getCity } from './helpers.js';
import { effectiveFrequency, routeCostMultiplier, routeDemandMultiplier } from './modifiers.js';

export function baseDemand(cityA, cityB) {
  const popFactor = Math.sqrt(cityA.pop * cityB.pop) / baseDemandFactors.populationDivisor;
  const levelBonus = (cityA.level + cityB.level) * baseDemandFactors.levelMultiplier;
  const regionPenalty = cityA.region === cityB.region ? 1 : baseDemandFactors.crossRegionPenalty;
  const distKm = cityDist(cityA, cityB);
  const distFactor = distKm > 8000 ? 0.6 : distKm > 4000 ? 0.8 : 1;
  return Math.round(popFactor * levelBonus * regionPenalty * distFactor);
}

export function seasonModifier(q) {
  return [0.85, 0.9, 1.0, 0.95][q - 1] ?? 1;
}

export function calcLoadFactor(state, route, price, brand, competitors) {
  const cityA = getCity(route.from);
  const cityB = getCity(route.to);
  const baseDemandVal = baseDemand(cityA, cityB) * seasonModifier(state.quarter) * routeDemandMultiplier(state, route);
  const refPrice = route.suggestedPrice;
  const priceRatio = price / refPrice;
  const priceEffect = Math.pow(priceRatio, -0.8);
  const brandEffect = 1 + (brand - 1) * 0.05;
  const compEffect = 1 / (1 + competitors * 0.3);
  const totalSeats = routeSeatCapacity(state, route);
  if (totalSeats === 0) return 0;
  const lf = (baseDemandVal * priceEffect * brandEffect * compEffect) / totalSeats;
  return clamp(lf, 0, 1);
}

export function suggestedPrice(from, to) {
  const d = cityDist(getCity(from), getCity(to));
  return Math.round(d * 0.06 + 50);
}

export function routeRevenue(state, route) {
  const lf = route.loadFactor;
  const totalSeats = routeSeatCapacity(state, route);
  const pax = Math.round(totalSeats * lf);
  const rev = pax * route.price / 1000;
  const cargoRev = pax * 0.02 * route.price * 0.3 / 1000;
  return { pax, rev, cargoRev, total: rev + cargoRev };
}

export function routeCost(state, route) {
  const cityA = getCity(route.from);
  const cityB = getCity(route.to);
  const d = cityDist(cityA, cityB);
  const frequency = effectiveFrequency(state, route);
  const assignedPlanes = routeAssignedPlanes(state, route);
  let fuelCost = 0;
  let maintCost = 0;
  let crewCost = 0;
  for (const plane of assignedPlanes) {
    fuelCost += plane.fuel * (state.oilPrice / 80) * (d / 5000) * frequency;
    maintCost += plane.maint * (1 + 0.05 * plane.age) * frequency;
    crewCost += 0.02 * (plane.seats / 180) * frequency;
  }
  const landingFee = (cityA.level + cityB.level) * 0.05 * frequency;
  const catering = assignedPlanes.length * 0.01 * frequency;
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

export function routeSeatCapacity(state, route) {
  return routeAssignedPlanes(state, route).reduce((sum, plane) => sum + plane.seats, 0) * effectiveFrequency(state, route);
}

function routeAssignedPlanes(state, route) {
  const fleetByUid = new Map(state.fleet.map((plane) => [plane.uid, plane]));
  return (route.assignedPlanes || []).map((uid) => fleetByUid.get(uid)).filter(Boolean);
}
