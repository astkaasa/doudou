import { countBoughtPlanes, countLeasedPlanes } from './fleet.js';
import { getCity } from './helpers.js';

export function createFinancialReportSnapshot(state) {
  const routes = Array.isArray(state.routes) ? state.routes : [];
  const fleet = Array.isArray(state.fleet) ? state.fleet : [];
  const deliveredThisTurn = Array.isArray(state.deliveredThisTurn) ? state.deliveredThisTurn : [];
  const safeState = { ...state, routes, fleet };

  return {
    cash: state.cash,
    loan: state.loan || 0,
    routeCount: routes.length,
    fleetCount: fleet.length,
    boughtCount: countBoughtPlanes(safeState),
    leasedCount: countLeasedPlanes(safeState),
    brand: state.brand,
    oilPrice: state.oilPrice,
    deliveredThisTurn: deliveredThisTurn.map((plane) => ({ ...plane })),
    routes: routes.map((route) => ({
      fromName: getCity(route.from)?.name || route.from,
      toName: getCity(route.to)?.name || route.to,
      profit: route.profit,
      loadFactor: route.loadFactor,
    })),
  };
}
