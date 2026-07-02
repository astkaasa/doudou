import { aiTurn } from './ai.js';
import { growCityStates } from '../data/cityEraData.js';
import { advanceBranchConstruction } from './bases.js';
import { advanceTemporaryModifiers, generateEvents } from './events.js';
import { advanceFleetAge } from './fleet.js';
import { BANKRUPTCY_THRESHOLD, SPICY_TRAIT_FUND_RATIO } from './constants.js';
import { clamp } from './helpers.js';
import { loanInterest } from './loans.js';
import { updateMainQuest } from './mainQuest.js';
import { updateRouteMetrics } from './routes.js';
import { calcStockDividend } from './stocks.js';

export function advanceTurnState(state) {
  if (!state || state.gameOver) return null;
  const period = { year: state.year, quarter: state.quarter };

  const branchCompleted = advanceBranchConstruction(state);
  advanceFleetAge(state);
  growCityStates(state);
  updateRouteMetrics(state);
  const traitFund = rollTraitFund(state);
  const { totalRev, totalCost, profit, interest } = calculateTurnFinancials(state, traitFund);
  const stockDividend = calcStockDividend(state);
  const netProfit = profit + stockDividend;

  state.cash += netProfit;
  state.turnRevenue = totalRev;
  state.turnCost = totalCost;
  state.turnProfit = netProfit;
  state.totalProfit += netProfit;
  state._lastTraitFund = traitFund;
  state._lastStockDividend = stockDividend;
  state.turnsPlayed++;
  if (netProfit > 0) {
    state.brand = clamp(state.brand + 0.05, 1, 10);
    state.consecutiveProfit = (state.consecutiveProfit || 0) + 1;
  } else {
    state.brand = clamp(state.brand - 0.02, 1, 10);
    state.consecutiveProfit = 0;
  }

  advanceCalendar(state);
  const nextPeriod = { year: state.year, quarter: state.quarter };
  advanceTemporaryModifiers(state);
  generateEvents(state);
  state.ai.forEach((ai) => aiTurn(state, ai));

  state.history.push({
    ...period,
    cash: state.cash,
    profit: netProfit,
    rev: totalRev,
    cost: totalCost,
    interest,
    traitFund,
    stockDividend,
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
  if (state.cash < BANKRUPTCY_THRESHOLD) {
    if (!state.bankruptRescued) {
      state.bankruptRescued = true;
      angelRescue = true;
    } else {
      state.gameOver = true;
    }
  }
  const mainQuestUpdate = state.gameOver || angelRescue ? null : updateMainQuest(state);
  return { period, nextPeriod, rev: totalRev, cost: totalCost, profit: netProfit, interest, traitFund, stockDividend, branchCompleted, gameOver: state.gameOver, angelRescue, mainQuestUpdate };
}

export function calculateTurnFinancials(state, extraRevenue = 0) {
  const routeTotals = state.routes.reduce((totals, route) => {
    totals.totalRev += route.revenue;
    totals.totalCost += route.cost;
    return totals;
  }, { totalRev: 0, totalCost: 0 });
  const overhead = state.fleet.length * 0.20 + 1.2;
  const leaseCost = state.fleet
    .filter((plane) => plane.isLease)
    .reduce((sum, plane) => sum + plane.leasePrice, 0);
  const interest = loanInterest(state);
  const totalCost = routeTotals.totalCost + overhead + leaseCost + interest;
  const totalRev = routeTotals.totalRev + extraRevenue;
  return {
    totalRev,
    totalCost,
    profit: totalRev - totalCost,
    interest,
    traitFund: extraRevenue,
  };
}

function rollTraitFund(state) {
  if (state.playerTrait !== '辣') return 0;
  return Math.max(0, Math.floor(state.cash * SPICY_TRAIT_FUND_RATIO));
}

function advanceCalendar(state) {
  state.quarter++;
  if (state.quarter > 4) {
    state.quarter = 1;
    state.year++;
  }
}
