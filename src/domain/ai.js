import { CITIES } from '../data/cities.js';
import { baseDemand, distanceServiceMultiplier, ROUTE_REVENUE_DIVISOR, seasonModifier, suggestedPrice } from './economy.js';
import { availablePlaneTemplates } from './fleet.js';
import { cityDist, clamp, getCity, randInt, routeKey } from './helpers.js';
import { aiSubDecide } from './subsidiaries.js';

export function aiTurn(state, ai) {
  if (ai.routes.length < 8 && Math.random() < 0.6) {
    let best = null;
    let bestScore = 0;
    for (let i = 0; i < CITIES.length; i++) {
      for (let j = i + 1; j < CITIES.length; j++) {
        const a = CITIES[i];
        const b = CITIES[j];
        const key = routeKey(a.id, b.id);
        if (ai.routes.find((r) => routeKey(r.from, r.to) === key)) continue;
        const d = cityDist(a, b);
        const demand = baseDemand(a, b, state);
        const score = demand * (ai.riskAverse > 0.5 ? (a.level + b.level) : 1) / (1 + countCompetitorsAI(state, a.id, b.id, ai));
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
  if (ai.fleet.length < 6 && ai.cash > 60 && Math.random() < 0.4) {
    const planes = availablePlaneTemplates(state);
    const pref = planes.find((p) => p.type === ai.prefType) || planes[0];
    if (!pref) return;
    ai.fleet.push({ uid: ai.name + '_' + ai.fleet.length, ...pref, age: randInt(0, 5), assigned: false });
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
  aiSubDecide(state, ai);
}

export function countCompetitorsAI(state, from, to, self) {
  const key = routeKey(from, to);
  let c = 0;
  if (state.routes.find((r) => routeKey(r.from, r.to) === key)) c++;
  state.ai.forEach((ai) => {
    if (ai !== self && ai.routes.find((r) => routeKey(r.from, r.to) === key)) c++;
  });
  return c;
}
