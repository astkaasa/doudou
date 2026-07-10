import { advanceBranchConstruction } from './bases.js';
import { eraSettlementDeadlineTurns } from './eraSettlement.js';
import { advanceFleetAge } from './fleet.js';
import { analyzeFleetPlan } from './fleetPlanning.js';
import { updateRouteMetrics } from './routes.js';
import { estimateTurnFinancials } from './turn.js';

export function previewNextQuarter(state) {
  if (!state) return null;
  const fleetPlan = analyzeFleetPlan(state);
  const fleetDepartures = fleetPlan.entries.filter((entry) => entry.departureInQuarters <= 1);
  const fleetDeliveries = fleetPlan.entries.filter((entry) => entry.deliveryInQuarters !== null && entry.deliveryInQuarters <= 1);
  const branchCompletions = (Array.isArray(state.branchesConstructing) ? state.branchesConstructing : [])
    .filter((branch) => (Number(branch.constructIn) || 0) <= 1);
  const nextPeriod = followingPeriod(state.year, state.quarter);

  const projectedState = structuredClone(state);
  advanceBranchConstruction(projectedState);
  advanceFleetAge(projectedState);
  updateRouteMetrics(projectedState);
  const financials = estimateTurnFinancials(projectedState);
  const contractDeadlines = previewContractDeadlines(state, projectedState);
  const staffContract = nextPeriod.quarter === 3
    ? 'recruit'
    : nextPeriod.quarter === 4
      ? 'bonus'
      : null;
  const deadline = eraSettlementDeadlineTurns(state);
  const eraSettlementDue = state.eraSettlement?.status === 'active'
    && deadline !== null
    && (Number(state.turnsPlayed) || 0) + 1 >= deadline;
  const affectedDepartureCount = fleetDepartures.filter((entry) => entry.assigned).length;
  const contractRisks = contractDeadlines.filter((entry) => entry.staticOutcome === 'breach').length;
  const cashAfter = (Number(state.cash) || 0) + financials.profit;

  return {
    nextPeriod,
    financials,
    cashAfter,
    fleetPlan,
    fleetDepartures,
    fleetDeliveries,
    branchCompletions,
    contractDeadlines,
    staffContract,
    eraSettlementDue,
    attentionCount: affectedDepartureCount + contractRisks + (cashAfter < 0 ? 1 : 0),
    knownChangeCount: fleetDepartures.length
      + fleetDeliveries.length
      + branchCompletions.length
      + contractDeadlines.length
      + (staffContract ? 1 : 0)
      + (eraSettlementDue ? 1 : 0),
  };
}

function previewContractDeadlines(state, projectedState) {
  const routes = Array.isArray(state.routes) ? state.routes : [];
  const projectedRoutes = Array.isArray(projectedState.routes) ? projectedState.routes : [];
  return (Array.isArray(state.airportContracts) ? state.airportContracts : [])
    .filter((contract) => contract?.status === 'active')
    .flatMap((contract) => {
      const route = routes.find((item) => item.uid === contract.routeUid) || null;
      const projectedRoute = projectedRoutes.find((item) => item.uid === contract.routeUid) || null;
      const remainingQuarters = Math.max(0, Number(contract.remainingQuarters) || 0);
      const metQuarters = Math.max(0, Number(contract.metQuarters) || 0);
      const requiredMetQuarters = Math.max(1, Number(contract.requiredMetQuarters) || 1);
      const impossible = !route || metQuarters + remainingQuarters < requiredMetQuarters;
      const finalQuarter = remainingQuarters <= 1;
      if (!impossible && !finalQuarter) return [];
      const staticallyMeets = Boolean(projectedRoute)
        && !projectedRoute.suspended
        && (Number(projectedRoute.serviceMultiplier) || 1) >= (Number(contract.minServiceMultiplier) || 1)
        && (Number(projectedRoute.loadFactor) || 0) >= (Number(contract.minLoadFactor) || 0);
      const projectedMetQuarters = metQuarters + (staticallyMeets ? 1 : 0);
      return [{
        contract,
        route,
        finalQuarter,
        staticallyMeets,
        certainBreach: impossible,
        staticOutcome: impossible
          ? 'breach'
          : finalQuarter
            ? projectedMetQuarters >= requiredMetQuarters ? 'complete' : 'breach'
            : 'active',
      }];
    });
}

function followingPeriod(year, quarter) {
  const currentYear = Number(year) || 0;
  const currentQuarter = Number(quarter) || 1;
  return currentQuarter >= 4
    ? { year: currentYear + 1, quarter: 1 }
    : { year: currentYear, quarter: currentQuarter + 1 };
}
