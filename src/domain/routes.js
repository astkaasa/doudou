import { calcLoadFactor, routeCost, routeRevenue, suggestedPrice } from './economy.js';
import { isBase } from './bases.js';
import { cityDist, getCity, routeKey } from './helpers.js';

export function availablePlanes(state) {
  const assigned = new Set();
  state.routes.forEach((r) => (r.assignedPlanes || []).forEach((p) => assigned.add(p)));
  return state.fleet.filter((f) => !assigned.has(f.uid) && !f.delivering);
}

export function countCompetitors(state, from, to) {
  const key = routeKey(from, to);
  let count = 0;
  state.ai.forEach((ai) => {
    if (ai.routes.find((r) => routeKey(r.from, r.to) === key)) count++;
  });
  return count;
}

export function updateRouteMetrics(state) {
  state.routes.forEach((route) => {
    const competitors = countCompetitors(state, route.from, route.to);
    route.loadFactor = calcLoadFactor(state, route, route.price, state.brand, competitors);
    const rev = routeRevenue(state, route);
    const cost = routeCost(state, route);
    route.revenue = rev.total;
    route.cost = cost.total;
    route.profit = rev.total - cost.total;
  });
}

export function openRoute(state, from, to, planeUid, price) {
  if (!state || !from || !to || from === to) return false;
  const cityA = getCity(from);
  const cityB = getCity(to);
  if (!cityA || !cityB) return false;
  if (!isBase(state, from)) return false;
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || !Number.isInteger(parsedPrice) || parsedPrice <= 0) return false;
  const key = routeKey(from, to);
  if (state.routes.find((r) => routeKey(r.from, r.to) === key)) return false;
  const plane = availablePlanes(state).find((p) => p.uid === planeUid);
  if (!plane) return false;
  if (plane.range < cityDist(cityA, cityB)) return false;
  const sp = suggestedPrice(from, to);
  state.routes.push({
    from,
    to,
    price: parsedPrice,
    suggestedPrice: sp,
    frequency: 1,
    assignedPlanes: [planeUid],
    loadFactor: 0,
    profit: 0,
    revenue: 0,
    cost: 0,
  });
  updateRouteMetrics(state);
  return true;
}

export function adjustRoutePrice(state, from, to, price) {
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || !Number.isInteger(parsedPrice) || parsedPrice <= 0) return null;
  const key = routeKey(from, to);
  const route = state.routes.find((r) => routeKey(r.from, r.to) === key);
  if (!route) return null;
  route.price = parsedPrice;
  updateRouteMetrics(state);
  return route;
}

export function closeRoute(state, from, to) {
  const key = routeKey(from, to);
  state.routes = state.routes.filter((r) => routeKey(r.from, r.to) !== key);
  updateRouteMetrics(state);
}
