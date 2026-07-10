import { countBoughtPlanes, countLeasedPlanes } from './fleet.js';
import { getCity } from './helpers.js';
import { calcPortfolioValue } from './stocks.js';
import { calcCompanyValue, getAllSubsidiaries, getTotalSubValue } from './subsidiaries.js';

export function createFinancialReportSnapshot(state) {
  const routes = Array.isArray(state.routes) ? state.routes : [];
  const fleet = Array.isArray(state.fleet) ? state.fleet : [];
  const deliveredThisTurn = Array.isArray(state.deliveredThisTurn) ? state.deliveredThisTurn : [];
  const safeState = { ...state, routes, fleet };
  const portfolio = calcPortfolioValue(state);
  const subsidiaries = getAllSubsidiaries(state);
  const companyValue = calcCompanyValue(state);

  return {
    cash: state.cash,
    loan: state.loan || 0,
    hq: state.hq,
    branches: Array.isArray(state.branches) ? [...state.branches] : [],
    routeCount: routes.length,
    fleetCount: fleet.length,
    boughtCount: countBoughtPlanes(safeState),
    leasedCount: countLeasedPlanes(safeState),
    brand: state.brand,
    oilPrice: state.oilPrice,
    traitFund: state._lastTraitFund || 0,
    stockDividend: state._lastStockDividend || 0,
    airportContractIncome: state._lastAirportContractIncome || 0,
    airportContractPenalty: state._lastAirportContractPenalty || 0,
    opsEfficiency: state.opsEfficiency || 0,
    staffCount: state.staffCount || 0,
    staffNeeded: state.staffNeeded || 0,
    staffMorale: state.staffMorale || 0,
    retiredThisTurn: state._retiredThisTurn || 0,
    recruitCost: state._recruitCostThisTurn || 0,
    bonusCost: state._bonusCostThisTurn || 0,
    opsCost: state._opsCostThisTurn || 0,
    faultLoss: state._faultLossThisTurn || 0,
    faults: Array.isArray(state._faultsThisTurn) ? state._faultsThisTurn.map((fault) => ({ ...fault })) : [],
    portfolio,
    subsidiaries: {
      count: subsidiaries.length,
      totalValue: getTotalSubValue(state),
      return: state._subReturnThisTurn || 0,
      maint: state._subMaintThisTurn || 0,
      net: (state._subReturnThisTurn || 0) - (state._subMaintThisTurn || 0),
      valueChange: state._subValueChangeThisTurn || 0,
    },
    companyValue,
    deliveredThisTurn: deliveredThisTurn.map((plane) => ({ ...plane })),
    routes: routes.map((route) => ({
      from: route.from,
      to: route.to,
      fromName: getCity(route.from)?.name || route.from,
      toName: getCity(route.to)?.name || route.to,
      revenue: route.revenue || 0,
      cost: route.cost || 0,
      profit: route.profit,
      loadFactor: route.loadFactor,
      suspended: Boolean(route.suspended),
    })),
  };
}
