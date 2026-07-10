import { AIRPORT_MIGRATION_OVERRIDES } from '../data/airportOverrides.js';
import { routePlanePerformance } from './airportPerformance.js';
import {
  airportDisplayCode,
  getAirport,
  getAirportByIdent,
  getDefaultAirportIdForYear,
  isAirportActive,
} from './airports.js';
import { addAirportRelation, airportRelation } from './airportManagement.js';
import { routeOperatingDistance } from './economy.js';
import { getCity } from './helpers.js';
import { routeOpenCost, updateRouteMetrics } from './routes.js';

export const AIRPORT_RELOCATION_STATUSES = Object.freeze([
  'pending',
  'relocated',
  'continued',
  'closed',
]);

export function createAirportRelocationState() {
  return {
    airportRelocations: [],
    airportRelocationIdCounter: 1,
  };
}

export function normalizeAirportRelocationState(state) {
  if (!state || typeof state !== 'object') return state;
  const usedIds = new Set();
  const usedTransitions = new Set();
  let nextId = Math.max(1, Number(state.airportRelocationIdCounter) || 1);
  state.airportRelocations = (Array.isArray(state.airportRelocations) ? state.airportRelocations : []).flatMap((record) => {
    if (!record || typeof record !== 'object') return [];
    const fromAirport = getAirport(record.fromAirportId);
    const toAirport = getAirport(record.toAirportId);
    if (!fromAirport || !toAirport || fromAirport.id === toAirport.id) return [];
    let id = String(record.id || '');
    if (!/^airport-relocation-\d+$/.test(id) || usedIds.has(id)) {
      while (usedIds.has(`airport-relocation-${nextId}`)) nextId++;
      id = `airport-relocation-${nextId++}`;
    }
    usedIds.add(id);
    const numericId = Number(id.match(/(\d+)$/)?.[1]);
    if (Number.isInteger(numericId)) nextId = Math.max(nextId, numericId + 1);
    const transitionId = String(record.transitionId || `legacy:${id}`);
    if (usedTransitions.has(transitionId)) return [];
    usedTransitions.add(transitionId);
    return [{
      id,
      transitionId,
      cityId: getCity(record.cityId) ? record.cityId : fromAirport.cityId,
      fromAirportId: fromAirport.id,
      toAirportId: toAirport.id,
      triggerYear: integerOr(record.triggerYear, Number(state.year) || 1960),
      mandatory: Boolean(record.mandatory),
      status: AIRPORT_RELOCATION_STATUSES.includes(record.status) ? record.status : 'pending',
      affectedRouteUids: uniquePositiveIntegers(record.affectedRouteUids),
      migrationCost: nonNegativeMoney(record.migrationCost),
      sourceRefs: Array.isArray(record.sourceRefs) ? record.sourceRefs.filter((value) => typeof value === 'string') : [],
      resolvedTurn: record.resolvedTurn === null || record.resolvedTurn === undefined
        ? null
        : integerOr(record.resolvedTurn, null),
    }];
  });
  state.airportRelocationIdCounter = nextId;
  return state;
}

export function syncAirportRelocations(state) {
  normalizeAirportRelocationState(state);
  syncAiAirportClosures(state);
  const knownTransitions = new Set(state.airportRelocations.map((record) => record.transitionId));
  const mappedInactiveAirportIds = new Set();
  const created = [];
  AIRPORT_MIGRATION_OVERRIDES.forEach((transition) => {
    if ((Number(state.year) || 0) < transition.year) return;
    const fromAirport = getAirportByIdent(transition.fromIdent);
    const toAirport = getAirportByIdent(transition.toIdent);
    if (!fromAirport || !toAirport) return;
    mappedInactiveAirportIds.add(fromAirport.id);
    if (knownTransitions.has(transition.id)) return;
    const affectedRoutes = routesUsingAirport(state, fromAirport.id, transition.cityId);
    const hasInvestment = hasAirportInvestment(state, fromAirport.id);
    if (affectedRoutes.length === 0 && !hasInvestment) return;
    const record = createRelocationRecord(state, {
      transitionId: transition.id,
      cityId: transition.cityId,
      fromAirportId: fromAirport.id,
      toAirportId: toAirport.id,
      triggerYear: transition.year,
      mandatory: transition.mandatory || !isAirportActive(fromAirport, state.year),
      sourceRefs: transition.sourceRefs,
      affectedRoutes,
    });
    state.airportRelocations.push(record);
    knownTransitions.add(transition.id);
    created.push(record);
  });

  const inactiveGroups = new Map();
  (state.routes || []).forEach((route) => {
    [
      { airportId: route.fromAirportId, cityId: route.from },
      { airportId: route.toAirportId, cityId: route.to },
    ].forEach(({ airportId, cityId }) => {
      if (!getAirport(airportId) || isAirportActive(airportId, state.year)) return;
      const transitionId = `closure:${airportId}:${state.year}`;
      if (!inactiveGroups.has(transitionId)) inactiveGroups.set(transitionId, { transitionId, airportId, cityId, routes: [] });
      inactiveGroups.get(transitionId).routes.push(route);
    });
  });
  inactiveGroups.forEach((group) => {
    if (knownTransitions.has(group.transitionId) || mappedInactiveAirportIds.has(group.airportId)) return;
    const replacementId = getDefaultAirportIdForYear(group.cityId, state.year);
    if (!getAirport(replacementId) || replacementId === group.airportId) return;
    const record = createRelocationRecord(state, {
      transitionId: group.transitionId,
      cityId: group.cityId,
      fromAirportId: group.airportId,
      toAirportId: replacementId,
      triggerYear: state.year,
      mandatory: true,
      sourceRefs: [],
      affectedRoutes: group.routes,
    });
    state.airportRelocations.push(record);
    knownTransitions.add(group.transitionId);
    created.push(record);
  });
  return created;
}

export function syncAiAirportClosures(state) {
  const result = { relocated: 0, closed: 0 };
  (state?.ai || []).forEach((ai) => {
    ai.routes = (ai.routes || []).flatMap((route) => {
      const draft = { ...route };
      let changed = false;
      [
        { airportField: 'fromAirportId', cityField: 'from' },
        { airportField: 'toAirportId', cityField: 'to' },
      ].forEach(({ airportField, cityField }) => {
        const current = getAirport(draft[airportField]);
        if (current && isAirportActive(current, state.year)) return;
        const replacementId = getDefaultAirportIdForYear(draft[cityField], state.year);
        if (!getAirport(replacementId) || !isAirportActive(replacementId, state.year)) return;
        draft[airportField] = replacementId;
        changed = true;
      });
      if (!changed) return [route];
      if (!isAirportActive(draft.fromAirportId, state.year) || !isAirportActive(draft.toAirportId, state.year)) {
        result.closed += 1;
        return [];
      }
      const plane = (ai.fleet || []).find((item) => item.uid === draft.assignedPlane);
      const distance = routeOperatingDistance(draft);
      if (!plane || plane.range < distance || !routePlanePerformance(draft, plane, state).compatible) {
        result.closed += 1;
        return [];
      }
      result.relocated += 1;
      return [draft];
    });
  });
  return result;
}

export function getPendingAirportRelocations(state) {
  return (state?.airportRelocations || []).filter((record) => record.status === 'pending');
}

export function hasPendingAirportRelocation(state) {
  return getPendingAirportRelocations(state).length > 0;
}

export function previewAirportRelocation(state, relocationOrId) {
  const relocation = resolveRelocation(state, relocationOrId);
  if (!relocation) return { ok: false, message: '机场迁移事项不存在' };
  const routes = routesForRelocation(state, relocation);
  const incompatibleRouteUids = routes.filter((route) => !routeCompatibleAfterRelocation(state, route, relocation)).map((route) => route.uid);
  return {
    ok: true,
    relocation,
    routes,
    migrationCost: calculateMigrationCost(routes),
    incompatibleRouteUids,
    canRelocate: incompatibleRouteUids.length === 0 && state.cash >= calculateMigrationCost(routes),
    canContinue: !relocation.mandatory && isAirportActive(relocation.fromAirportId, state.year),
  };
}

export function resolveAirportRelocation(state, relocationId, action) {
  normalizeAirportRelocationState(state);
  const relocation = resolveRelocation(state, relocationId);
  if (!relocation || relocation.status !== 'pending') return { ok: false, message: '机场迁移事项已处理或不存在' };
  const preview = previewAirportRelocation(state, relocation);
  if (action === 'continue') {
    if (!preview.canContinue) return { ok: false, message: '旧机场已关闭，不能继续运营' };
    relocation.status = 'continued';
    relocation.resolvedTurn = Number(state.turnsPlayed) || 0;
    return { ok: true, action, relocation, routes: preview.routes };
  }
  if (action === 'close') {
    const routeUids = new Set(preview.routes.map((route) => route.uid));
    state.routes = (state.routes || []).filter((route) => !routeUids.has(route.uid));
    transferAirportInvestment(state, relocation.fromAirportId, relocation.toAirportId);
    terminateRelocatedContracts(state, relocation.fromAirportId, routeUids);
    relocation.status = 'closed';
    relocation.resolvedTurn = Number(state.turnsPlayed) || 0;
    updateRouteMetrics(state);
    return { ok: true, action, relocation, routes: preview.routes, cost: 0 };
  }
  if (action !== 'relocate') return { ok: false, message: '未知的机场迁移操作' };
  if (preview.incompatibleRouteUids.length > 0) {
    return { ok: false, message: '现有机型无法适配新机场，请先选择关闭受影响航线', incompatibleRouteUids: preview.incompatibleRouteUids };
  }
  if (state.cash < preview.migrationCost) return { ok: false, message: `资金不足，需要 ${preview.migrationCost.toFixed(1)}M` };
  state.cash -= preview.migrationCost;
  const routeUids = new Set(preview.routes.map((route) => route.uid));
  preview.routes.forEach((route) => {
    if (route.fromAirportId === relocation.fromAirportId && route.from === relocation.cityId) route.fromAirportId = relocation.toAirportId;
    if (route.toAirportId === relocation.fromAirportId && route.to === relocation.cityId) route.toAirportId = relocation.toAirportId;
    if (route.fromAlternateAirportId === relocation.fromAirportId || route.fromAlternateAirportId === route.fromAirportId) route.fromAlternateAirportId = null;
    if (route.toAlternateAirportId === relocation.fromAirportId || route.toAlternateAirportId === route.toAirportId) route.toAlternateAirportId = null;
  });
  transferAirportInvestment(state, relocation.fromAirportId, relocation.toAirportId);
  terminateRelocatedContracts(state, relocation.fromAirportId, routeUids);
  relocation.status = 'relocated';
  relocation.migrationCost = preview.migrationCost;
  relocation.resolvedTurn = Number(state.turnsPlayed) || 0;
  updateRouteMetrics(state);
  return { ok: true, action, relocation, routes: preview.routes, cost: preview.migrationCost };
}

export function describeAirportRelocation(record) {
  const from = getAirport(record.fromAirportId);
  const to = getAirport(record.toAirportId);
  return `${getCity(record.cityId)?.name || record.cityId}：${from?.name || record.fromAirportId} (${airportDisplayCode(from)}) → ${to?.name || record.toAirportId} (${airportDisplayCode(to)})`;
}

function createRelocationRecord(state, input) {
  const routes = [...new Map(input.affectedRoutes.map((route) => [route.uid, route])).values()];
  return {
    id: `airport-relocation-${state.airportRelocationIdCounter++}`,
    transitionId: input.transitionId,
    cityId: input.cityId,
    fromAirportId: input.fromAirportId,
    toAirportId: input.toAirportId,
    triggerYear: input.triggerYear,
    mandatory: Boolean(input.mandatory),
    status: 'pending',
    affectedRouteUids: routes.map((route) => route.uid),
    migrationCost: calculateMigrationCost(routes),
    sourceRefs: input.sourceRefs || [],
    resolvedTurn: null,
  };
}

function routesUsingAirport(state, airportId, cityId) {
  return (state.routes || []).filter((route) => (route.fromAirportId === airportId && route.from === cityId)
    || (route.toAirportId === airportId && route.to === cityId));
}

function routesForRelocation(state, relocation) {
  const current = routesUsingAirport(state, relocation.fromAirportId, relocation.cityId);
  const savedIds = new Set(relocation.affectedRouteUids || []);
  return [...new Map([...current, ...(state.routes || []).filter((route) => savedIds.has(route.uid))].map((route) => [route.uid, route])).values()]
    .filter((route) => route.fromAirportId === relocation.fromAirportId || route.toAirportId === relocation.fromAirportId);
}

function routeCompatibleAfterRelocation(state, route, relocation) {
  const draft = {
    ...route,
    fromAirportId: route.fromAirportId === relocation.fromAirportId ? relocation.toAirportId : route.fromAirportId,
    toAirportId: route.toAirportId === relocation.fromAirportId ? relocation.toAirportId : route.toAirportId,
  };
  const distance = routeOperatingDistance(draft);
  const planes = (route.assignedPlanes || []).map((uid) => state.fleet.find((plane) => plane.uid === uid)).filter(Boolean);
  return planes.length > 0 && planes.every((plane) => plane.range >= distance && routePlanePerformance(draft, plane, state).compatible);
}

function calculateMigrationCost(routes) {
  return roundMoney(routes.reduce((sum, route) => sum + Math.max(1, routeOpenCost(route.from, route.to) * 0.4), 0));
}

function hasAirportInvestment(state, airportId) {
  return Object.values(state.subsidiaries || {}).some((entries) => (entries || []).some((entry) => entry.type === 'airport' && entry.airportId === airportId));
}

function transferAirportInvestment(state, fromAirportId, toAirportId) {
  Object.values(state.subsidiaries || {}).forEach((entries) => {
    if (!Array.isArray(entries)) return;
    const sources = entries.filter((entry) => entry.type === 'airport' && entry.airportId === fromAirportId);
    sources.forEach((entry) => {
      const existing = entries.find((item) => item !== entry && item.type === 'airport' && item.airportId === toAirportId);
      if (existing) {
        existing.openCost = roundMoney((Number(existing.openCost) || 0) + (Number(entry.openCost) || 0));
        existing.currentValue = roundMoney((Number(existing.currentValue) || 0) + (Number(entry.currentValue) || 0));
        existing.landingDiscount = Math.max(0.15, Number(existing.landingDiscount) || 0, Number(entry.landingDiscount) || 0);
        existing.migratedFromAirportId = fromAirportId;
        const upgradeIds = [...new Set([...Object.keys(existing.upgrades || {}), ...Object.keys(entry.upgrades || {})])].slice(0, 3);
        existing.upgrades = Object.fromEntries(upgradeIds.map((upgradeId) => [upgradeId, 1]));
        entries.splice(entries.indexOf(entry), 1);
      } else {
        entry.migratedFromAirportId = fromAirportId;
        entry.airportId = toAirportId;
        entry.landingDiscount = Math.max(0.15, Number(entry.landingDiscount) || 0);
      }
    });
  });
  const relation = airportRelation(state, fromAirportId);
  if (relation !== 0) {
    addAirportRelation(state, toAirportId, relation);
    delete state.airportRelations[fromAirportId];
  }
}

function terminateRelocatedContracts(state, fromAirportId, routeUids) {
  (state.airportContracts || []).forEach((contract) => {
    if (contract.status !== 'active' || contract.airportId !== fromAirportId || !routeUids.has(contract.routeUid)) return;
    contract.status = 'expired';
    contract.resolvedTurn = Number(state.turnsPlayed) || 0;
  });
  (state.routes || []).forEach((route) => {
    if (routeUids.has(route.uid)) delete route.airportContractId;
  });
}

function resolveRelocation(state, relocationOrId) {
  if (relocationOrId && typeof relocationOrId === 'object') return relocationOrId;
  return (state?.airportRelocations || []).find((record) => record.id === relocationOrId) || null;
}

function uniquePositiveIntegers(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(Number).filter((value) => Number.isInteger(value) && value > 0))];
}

function integerOr(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function nonNegativeMoney(value) {
  return roundMoney(Math.max(0, Number(value) || 0));
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
