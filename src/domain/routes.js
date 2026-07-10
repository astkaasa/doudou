import { calcLoadFactor, getRouteAssignedPlanes, routeCost, routeOperatingDistance, routeRevenue, suggestedPrice } from './economy.js';
import { airportServesCity, getDefaultAirportIdForYear, isAirportActive, normalizeAirportIdForCity, operatingDistanceForRoute } from './airports.js';
import { routePlanePerformance } from './airportPerformance.js';
import { normalizeRouteAlternateState } from './airportResilience.js';
import { routeOpeningCapacityMultiplier } from './airportCapacity.js';
import { isBase } from './bases.js';
import { cityDist, getCity, routeKey } from './helpers.js';
import { syncStaffToNeeded } from './operations.js';

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
  const fleetByUid = new Map(state.fleet.map((plane) => [plane.uid, plane]));
  state.routes.forEach((route) => {
    if (route.suspended) {
      route.loadFactor = 0;
      route.revenue = 0;
      route.cost = 0;
      route.profit = 0;
      return;
    }
    const competitors = countCompetitors(state, route.from, route.to);
    const assignedPlanes = getRouteAssignedPlanes(state, route, fleetByUid);
    route.loadFactor = calcLoadFactor(state, route, route.price, state.brand, competitors, assignedPlanes);
    const rev = routeRevenue(state, route, assignedPlanes);
    const cost = routeCost(state, route, assignedPlanes);
    route.revenue = rev.total;
    route.cost = cost.total;
    route.profit = rev.total - cost.total;
  });
}

export function routeOpenCost(from, to, options = {}) {
  const cityA = getCity(from);
  const cityB = getCity(to);
  if (!cityA || !cityB) return Infinity;
  const avgLevel = (cityA.level + cityB.level) / 2;
  const d = cityDist(cityA, cityB);
  const distFactor = d > 8000 ? 2 : d > 3000 ? 1.5 : 1;
  const baseCost = Math.round(avgLevel * distFactor);
  if (!options.state || !options.route || !options.plane) return baseCost;
  return Math.round(baseCost * routeOpeningCapacityMultiplier(options.state, options.route, options.plane) * 10) / 10;
}

export function openRoute(state, from, to, planeUid, price, airportSelection = {}) {
  if (!state || !from || !to || from === to) return routeFailure('航线城市无效');
  const cityA = getCity(from);
  const cityB = getCity(to);
  if (!cityA || !cityB) return routeFailure('城市不存在');
  if (!isBase(state, from)) return routeFailure('起飞城市必须是总部或分部');
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || !Number.isInteger(parsedPrice) || parsedPrice <= 0) return routeFailure('票价必须是有效的正整数');
  const key = routeKey(from, to);
  if (state.routes.find((r) => routeKey(r.from, r.to) === key)) return routeFailure('航线已开通');
  if (airportSelection.fromAirportId && !airportServesCity(airportSelection.fromAirportId, from)) {
    return routeFailure('起飞机场不服务该城市');
  }
  if (airportSelection.toAirportId && !airportServesCity(airportSelection.toAirportId, to)) {
    return routeFailure('到达机场不服务该城市');
  }
  const sp = suggestedPrice(from, to);
  const fromAirportId = normalizeAirportIdForCity(
    airportSelection.fromAirportId || getDefaultAirportIdForYear(from, state.year),
    from,
    { year: state.year },
  );
  const toAirportId = normalizeAirportIdForCity(
    airportSelection.toAirportId || getDefaultAirportIdForYear(to, state.year),
    to,
    { year: state.year },
  );
  if (!isAirportActive(fromAirportId, state.year) || !isAirportActive(toAirportId, state.year)) {
    return routeFailure('所选机场当前不可用');
  }
  const plane = availablePlanes(state).find((p) => p.uid === planeUid);
  if (!plane) return routeFailure('飞机不可用');
  const routeDraft = { from, to, fromAirportId, toAirportId };
  const operatingDistance = operatingDistanceForRoute(routeDraft);
  if (!Number.isFinite(operatingDistance) || plane.range < operatingDistance) return routeFailure('航程不足，无法执飞该航线');
  const performance = routePlanePerformance(routeDraft, plane, state);
  if (!performance.compatible) return routeFailure(`机场条件不适配：${performance.reasons.join('、')}`);
  const openCost = routeOpenCost(from, to, { state, route: routeDraft, plane });
  if (state.cash < openCost) return routeFailure(`资金不足，需要 ${openCost.toFixed(1)}M`);
  state.cash -= openCost;
  const route = {
    uid: state.routeIdCounter++,
    from,
    to,
    fromAirportId,
    toAirportId,
    fromAlternateAirportId: null,
    toAlternateAirportId: null,
    price: parsedPrice,
    suggestedPrice: sp,
    serviceMultiplier: 1,
    assignedPlanes: [planeUid],
    loadFactor: 0,
    profit: 0,
    revenue: 0,
    cost: 0,
    isNew: true,
    suspended: false,
    _reopened: false,
  };
  state.routes.push(route);
  syncStaffToNeeded(state, 0.85);
  updateRouteMetrics(state);
  return { ok: true, route, cost: openCost, operatingDistance, performance };
}

export function adjustRoutePrice(state, from, to, price) {
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || !Number.isInteger(parsedPrice) || parsedPrice <= 0) return null;
  const key = routeKey(from, to);
  const route = state.routes.find((r) => routeKey(r.from, r.to) === key);
  if (!route) return null;
  route._lastLf = route.loadFactor || 0;
  route._lastProfit = route.profit || 0;
  route.price = parsedPrice;
  route._priceAdjusted = true;
  updateRouteMetrics(state);
  return route;
}

export function closeRoute(state, from, to) {
  const key = routeKey(from, to);
  state.routes = state.routes.filter((r) => routeKey(r.from, r.to) !== key);
  syncStaffToNeeded(state, 0);
  updateRouteMetrics(state);
}

export function suspendRoute(state, from, to) {
  const route = findRoute(state, from, to);
  if (!route) return { ok: false, message: '航线不存在' };
  if (route.suspended) return { ok: false, message: '航线已停飞' };
  if (route._resumedTurn !== undefined && route._resumedTurn >= state.turnsPlayed) {
    return { ok: false, message: '复飞后需推进1个回合才能再次停飞' };
  }
  route.suspended = true;
  route._suspendTurn = state.turnsPlayed;
  route._priceAdjusted = false;
  route._planeChanged = false;
  updateRouteMetrics(state);
  return { ok: true, route };
}

export function resumeRoute(state, from, to) {
  const route = findRoute(state, from, to);
  if (!route) return { ok: false, message: '航线不存在' };
  if (!route.suspended) return { ok: false, message: '航线未停飞' };
  if (route._suspendTurn !== undefined && route._suspendTurn >= state.turnsPlayed) {
    return { ok: false, message: '停飞后需推进1个回合才能复飞' };
  }
  route.suspended = false;
  route._resumedTurn = state.turnsPlayed;
  route._reopened = true;
  route._lastLf = 0;
  route._lastProfit = 0;
  updateRouteMetrics(state);
  return { ok: true, route };
}

export function changeRoutePlane(state, from, to, newUid) {
  const route = findRoute(state, from, to);
  if (!route) return { ok: false, message: '航线不存在' };
  const parsedUid = parseInt(newUid, 10);
  if (!Array.isArray(route.assignedPlanes)) route.assignedPlanes = [];
  if (route.assignedPlanes.includes(parsedUid)) return { ok: false, message: '该飞机已在此航线执飞' };
  const plane = availablePlanes(state).find((p) => p.uid === parsedUid);
  if (!plane) return { ok: false, message: '该飞机不可用' };
  if (plane.range < routeOperatingDistance(route)) return { ok: false, message: '航程不足，无法执飞该航线' };
  const performance = routePlanePerformance(route, plane, state);
  if (!performance.compatible) return { ok: false, message: `机场条件不适配：${performance.reasons.join('、')}` };
  route._lastLf = route.loadFactor || 0;
  route._lastProfit = route.profit || 0;
  route.assignedPlanes = [parsedUid];
  normalizeRouteAlternateState(state);
  route._planeChanged = true;
  updateRouteMetrics(state);
  return { ok: true, route, plane };
}

export function findRoute(state, from, to) {
  const key = routeKey(from, to);
  return state.routes.find((route) => routeKey(route.from, route.to) === key) || null;
}

function routeFailure(message) {
  return { ok: false, message };
}
