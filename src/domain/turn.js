import { aiTurn } from './ai.js';
import { growCityStates } from '../data/cityEraData.js';
import { advanceBranchConstruction } from './bases.js';
import { advanceTemporaryModifiers, generateEvents } from './events.js';
import { advanceFleetAge } from './fleet.js';
import { BANKRUPTCY_THRESHOLD, SPICY_TRAIT_FUND_BASE, SPICY_TRAIT_FUND_REVENUE_RATIO } from './constants.js';
import { hasPendingEraSettlement, settleEraIfDue } from './eraSettlement.js';
import { clamp } from './helpers.js';
import { loanInterest } from './loans.js';
import { updateMainQuest } from './mainQuest.js';
import { calcOpsBudgetCost, finishQuarterOperations, prepareQuarterOperations, schedulePendingContracts, settleOperationalFaultLosses } from './operations.js';
import { updateRouteMetrics } from './routes.js';
import { calcStockDividend } from './stocks.js';
import { handleBankruptcy, settleSubsidiaryQuarter } from './subsidiaries.js';
import { randomSource } from './random.js';

export function advanceTurnState(state) {
  if (!state || state.gameOver || hasPendingEraSettlement(state)) return null;
  const period = { year: state.year, quarter: state.quarter };

  const branchCompleted = advanceBranchConstruction(state);
  advanceFleetAge(state);
  growCityStates(state, randomSource(state));
  prepareQuarterOperations(state);
  updateRouteMetrics(state);
  const faultLoss = settleOperationalFaultLosses(state);
  const traitFund = rollTraitFund(state);
  const financials = calculateTurnFinancials(state, traitFund);
  const { totalRev, totalCost, profit, interest } = financials;
  const stockDividend = calcStockDividend(state);
  const subsidiarySettlement = settleSubsidiaryQuarter(state);
  const netProfit = profit + stockDividend + subsidiarySettlement.subNet;
  finishQuarterOperations(state);

  state.cash += netProfit;
  state.turnRevenue = totalRev;
  state.turnCost = totalCost;
  state.turnProfit = netProfit;
  state.totalProfit += netProfit;
  state._lastTraitFund = traitFund;
  state._lastStockDividend = stockDividend;
  state.turnsPlayed++;
  if (netProfit > 0) {
    state.brand = clamp(state.brand + 0.05 * (state.opsEfficiency || 1), 1, 10);
    state.consecutiveProfit = (state.consecutiveProfit || 0) + 1;
  } else {
    state.brand = clamp(state.brand - 0.02, 1, 10);
    state.consecutiveProfit = 0;
  }

  advanceCalendar(state);
  const nextPeriod = { year: state.year, quarter: state.quarter };
  advanceTemporaryModifiers(state);
  generateEvents(state);
  schedulePendingContracts(state);
  state.ai.forEach((ai) => aiTurn(state, ai));

  state.history.push({
    ...period,
    cash: state.cash,
    profit: netProfit,
    rev: totalRev,
    cost: totalCost,
    routeRevenue: financials.routeRevenue,
    routeCost: financials.routeCost,
    overhead: financials.overhead,
    leaseCost: financials.leaseCost,
    interest,
    traitFund,
    stockDividend,
    subReturn: subsidiarySettlement.subReturn,
    subMaint: subsidiarySettlement.subMaint,
    subNet: subsidiarySettlement.subNet,
    subValueChange: subsidiarySettlement.subValueChange,
    opsCost: state._opsCostThisTurn || 0,
    faultLoss,
    routes: state.routes.length,
    fleet: state.fleet.length,
    branchCompleted,
  });
  state.routes.forEach((route) => {
    route.isNew = false;
    route._priceAdjusted = false;
    route._planeChanged = false;
    route._reopened = false;
  });

  let angelRescue = false;
  let bankruptcyAction = null;
  if (state.cash < BANKRUPTCY_THRESHOLD) {
    bankruptcyAction = handleBankruptcy(state);
    angelRescue = Boolean(bankruptcyAction.angelRescue);
  }
  const mainQuestUpdate = state.gameOver || angelRescue ? null : updateMainQuest(state);
  const eraSettlement = state.gameOver ? null : settleEraIfDue(state);
  return {
    period,
    nextPeriod,
    rev: totalRev,
    cost: totalCost,
    profit: netProfit,
    routeRevenue: financials.routeRevenue,
    routeCost: financials.routeCost,
    overhead: financials.overhead,
    leaseCost: financials.leaseCost,
    interest,
    traitFund,
    stockDividend,
    ...subsidiarySettlement,
    opsCost: state._opsCostThisTurn || 0,
    faultLoss,
    branchCompleted,
    gameOver: state.gameOver,
    angelRescue,
    bankruptcyAction,
    mainQuestUpdate,
    eraSettlement,
  };
}

export function calculateTurnFinancials(state, extraRevenue = 0) {
  return buildTurnFinancials(state, extraRevenue, {
    opsCost: state._opsCostThisTurn || calcOpsBudgetCost(state).total,
    faultLoss: state._faultLossThisTurn || 0,
  });
}

export function estimateTurnFinancials(state) {
  const traitFund = calcSpicyTraitFund(state);
  return buildTurnFinancials(state, traitFund, {
    opsCost: calcOpsBudgetCost(state).total,
    faultLoss: 0,
  });
}

function buildTurnFinancials(state, extraRevenue, options) {
  const routeTotals = state.routes.reduce((totals, route) => {
    totals.totalRev += route.revenue;
    totals.totalCost += route.cost;
    return totals;
  }, { totalRev: 0, totalCost: 0 });
  const overhead = state.fleet.length * 0.20 + 1.2;
  const opsCost = options.opsCost;
  const faultLoss = options.faultLoss;
  const leaseCost = state.fleet
    .filter((plane) => plane.isLease)
    .reduce((sum, plane) => sum + plane.leasePrice, 0);
  const interest = loanInterest(state);
  const totalCost = routeTotals.totalCost + overhead + leaseCost + interest + opsCost + faultLoss;
  const totalRev = routeTotals.totalRev + extraRevenue;
  return {
    totalRev,
    totalCost,
    profit: totalRev - totalCost,
    routeRevenue: routeTotals.totalRev,
    routeCost: routeTotals.totalCost,
    interest,
    traitFund: extraRevenue,
    overhead,
    leaseCost,
    opsCost,
    faultLoss,
  };
}

function rollTraitFund(state) {
  return calcSpicyTraitFund(state);
}

export function calcSpicyTraitFund(state) {
  if (state?.playerTrait !== '辣' || (Number(state.cash) || 0) <= 0) return 0;
  const routeRevenue = (state.routes || []).reduce((sum, route) => sum + Math.max(0, Number(route.revenue) || 0), 0);
  return Math.round((SPICY_TRAIT_FUND_BASE + routeRevenue * SPICY_TRAIT_FUND_REVENUE_RATIO) * 10) / 10;
}

function advanceCalendar(state) {
  state.quarter++;
  if (state.quarter > 4) {
    state.quarter = 1;
    state.year++;
  }
}
