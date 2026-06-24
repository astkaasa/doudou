import { aiTurn } from './ai.js';
import { advanceTemporaryModifiers, generateEvents } from './events.js';
import { advanceFleetAge } from './fleet.js';
import { clamp } from './helpers.js';
import { updateRouteMetrics } from './routes.js';

export function advanceTurnState(state) {
  if (!state || state.gameOver) return null;
  const period = { year: state.year, quarter: state.quarter };

  advanceFleetAge(state);
  updateRouteMetrics(state);
  const { totalRev, totalCost, profit } = calculateTurnFinancials(state);

  state.cash += profit;
  state.turnRevenue = totalRev;
  state.turnCost = totalCost;
  state.turnProfit = profit;
  state.totalProfit += profit;
  state.turnsPlayed++;
  state.brand = clamp(state.brand + (profit > 0 ? 0.05 : -0.02), 1, 10);

  advanceTemporaryModifiers(state);
  generateEvents(state);
  state.ai.forEach((ai) => aiTurn(state, ai));
  advanceCalendar(state);

  state.history.push({
    ...period,
    cash: state.cash,
    profit,
    rev: totalRev,
    cost: totalCost,
    routes: state.routes.length,
    fleet: state.fleet.length,
  });

  if (state.cash < -5) state.gameOver = true;
  return { period, rev: totalRev, cost: totalCost, profit, gameOver: state.gameOver };
}

export function calculateTurnFinancials(state) {
  const routeTotals = state.routes.reduce((totals, route) => {
    totals.totalRev += route.revenue;
    totals.totalCost += route.cost;
    return totals;
  }, { totalRev: 0, totalCost: 0 });
  const overhead = state.fleet.length * 0.05 + 0.5;
  const leaseCost = state.fleet
    .filter((plane) => plane.isLease)
    .reduce((sum, plane) => sum + plane.leasePrice, 0);
  const totalCost = routeTotals.totalCost + overhead + leaseCost;
  return {
    totalRev: routeTotals.totalRev,
    totalCost,
    profit: routeTotals.totalRev - totalCost,
  };
}

function advanceCalendar(state) {
  state.quarter++;
  if (state.quarter > 4) {
    state.quarter = 1;
    state.year++;
  }
}
