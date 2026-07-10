import { CITIES } from '../data/cities.js';
import { baseDemand, distanceServiceMultiplier, ROUTE_REVENUE_DIVISOR, seasonModifier, suggestedPrice } from './economy.js';
import { availablePlaneTemplates } from './fleet.js';
import { cityDist, clamp, getCity, routeKey } from './helpers.js';
import { randomIntFrom, randomSource } from './random.js';
import { aiSubDecide } from './subsidiaries.js';

export function aiTurn(state, ai, random = randomSource(state)) {
  if (ai.routes.length < 8 && random() < 0.6) {
    let best = null;
    let bestScore = 0;
    const ownRouteKeys = new Set(ai.routes.map((route) => routeKey(route.from, route.to)));
    const competitorCounts = buildCompetitorCounts(state, ai);
    for (let i = 0; i < CITIES.length; i++) {
      for (let j = i + 1; j < CITIES.length; j++) {
        const a = CITIES[i];
        const b = CITIES[j];
        const key = routeKey(a.id, b.id);
        if (ownRouteKeys.has(key)) continue;
        const d = cityDist(a, b);
        const demand = baseDemand(a, b, state);
        const score = demand * (ai.riskAverse > 0.5 ? (a.level + b.level) : 1) / (1 + (competitorCounts.get(key) || 0));
        if (score > bestScore) {
          bestScore = score;
          best = { from: a.id, to: b.id, dist: d };
        }
      }
    }
    if (best && ai.fleet.length > ai.routes.length) {
      const suitablePlane = ai.fleet.find((p) => p.range >= best.dist && !p.assigned);
      if (suitablePlane) {
        const sp = suggestedPrice(best.from, best.to);
        ai.routes.push({
          from: best.from,
          to: best.to,
          price: Math.round(sp * ai.priceMul),
          suggestedPrice: sp,
          serviceMultiplier: 1,
          assignedPlane: suitablePlane.uid,
          loadFactor: 0,
        });
        suitablePlane.assigned = true;
      }
    }
  }
  if (ai.fleet.length < 6 && ai.cash > 60 && random() < 0.4) {
    const planes = availablePlaneTemplates(state);
    const pref = planes.find((p) => p.type === ai.prefType) || planes[0];
    if (!pref) return;
    ai.fleet.push({ uid: ai.name + '_' + ai.fleet.length, ...pref, age: randomIntFrom(random, 0, 5), assigned: false });
    ai.cash -= pref.buyPrice * 0.9;
  }
  let aiRev = 0;
  let aiCost = 0;
  ai.routes.forEach((r) => {
    const cityA = getCity(r.from);
    const cityB = getCity(r.to);
    const d = cityDist(cityA, cityB);
    const demand = baseDemand(cityA, cityB, state) * seasonModifier(state.quarter);
    const plane = ai.fleet.find((p) => p.uid === r.assignedPlane);
    if (!plane) return;
    const serviceMultiplier = distanceServiceMultiplier(d);
    const lf = clamp(demand / plane.seats * Math.pow(r.price / r.suggestedPrice, -0.8), 0, 1);
    r.loadFactor = lf;
    aiRev += plane.seats * lf * r.price * serviceMultiplier / ROUTE_REVENUE_DIVISOR;
    aiCost += plane.fuel * (state.oilPrice / 80) * (d / 5000);
    aiCost += plane.maint * (1 + 0.05 * plane.age);
  });
  ai.cash += aiRev - aiCost;
  aiSubDecide(state, ai, random);
}

export function countCompetitorsAI(state, from, to, self) {
  return buildCompetitorCounts(state, self).get(routeKey(from, to)) || 0;
}

function buildCompetitorCounts(state, self) {
  const counts = new Map();
  addRouteOwner(counts, state.routes);
  state.ai.forEach((ai) => {
    if (ai !== self) addRouteOwner(counts, ai.routes);
  });
  return counts;
}

function addRouteOwner(counts, routes) {
  const keys = new Set(routes.map((route) => routeKey(route.from, route.to)));
  keys.forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
}
