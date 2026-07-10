export const ROUTE_LOW_LOAD_THRESHOLD = 0.6;

export const ROUTE_DIAGNOSTIC_FILTERS = Object.freeze([
  'all',
  'attention',
  'loss',
  'lowLoad',
  'unassigned',
  'suspended',
  'contract',
]);

export function normalizeRouteDiagnosticFilter(filter) {
  return ROUTE_DIAGNOSTIC_FILTERS.includes(filter) ? filter : 'all';
}

export function diagnoseRoute(state, route, fleetByUid = buildFleetIndex(state)) {
  const assignedPlaneIds = Array.isArray(route?.assignedPlanes) ? route.assignedPlanes : [];
  const operationalPlaneCount = assignedPlaneIds.reduce((count, uid) => {
    const plane = fleetByUid.get(uid);
    return count + (plane && !plane.delivering ? 1 : 0);
  }, 0);
  const suspended = Boolean(route?.suspended);
  const unassigned = operationalPlaneCount === 0;
  const hasObservedMetrics = !route?.isNew && !route?._reopened;
  const canDiagnosePerformance = hasObservedMetrics && !suspended && !unassigned;
  const profit = diagnosticMetric(route, 'profit', '_lastProfit');
  const loadFactor = diagnosticMetric(route, 'loadFactor', '_lastLf');
  const loss = canDiagnosePerformance && profit < 0;
  const lowLoad = canDiagnosePerformance && loadFactor < ROUTE_LOW_LOAD_THRESHOLD;

  return {
    attention: !suspended && (loss || lowLoad || unassigned),
    loss,
    lowLoad,
    unassigned,
    suspended,
    contract: Boolean(route?.airportContractId),
    hasObservedMetrics,
    assignedPlaneCount: assignedPlaneIds.length,
    operationalPlaneCount,
    profit,
    loadFactor,
  };
}

export function analyzeRouteDiagnostics(state) {
  const fleetByUid = buildFleetIndex(state);
  const entries = (Array.isArray(state?.routes) ? state.routes : []).map((route) => ({
    route,
    diagnostics: diagnoseRoute(state, route, fleetByUid),
  }));
  const counts = Object.fromEntries(ROUTE_DIAGNOSTIC_FILTERS.map((filter) => [
    filter,
    filter === 'all'
      ? entries.length
      : entries.filter((entry) => entry.diagnostics[filter]).length,
  ]));
  return { entries, counts };
}

export function matchesRouteDiagnostic(diagnostics, filter) {
  const normalized = normalizeRouteDiagnosticFilter(filter);
  return normalized === 'all' || Boolean(diagnostics?.[normalized]);
}

function buildFleetIndex(state) {
  return new Map((Array.isArray(state?.fleet) ? state.fleet : []).map((plane) => [plane.uid, plane]));
}

function diagnosticMetric(route, currentKey, previousKey) {
  const changedThisQuarter = Boolean(route?._priceAdjusted || route?._planeChanged);
  const previous = finiteNumber(route?.[previousKey]);
  if (changedThisQuarter && previous !== null) return previous;
  return finiteNumber(route?.[currentKey]) ?? 0;
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
