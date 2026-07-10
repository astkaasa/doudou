import { CITIES } from '../data/cities.js';
import { ERAS } from '../data/eras.js';
import { calcLoadFactor, routeCost, routeRevenue, suggestedPrice } from '../domain/economy.js';
import { availablePlaneTemplates, buyPlane, quotePlaneAcquisition } from '../domain/fleet.js';
import { cityDist, getCity, routeKey } from '../domain/helpers.js';
import { assertGameState } from '../domain/invariants.js';
import { maxLoanAmount, repayLoan, takeLoan } from '../domain/loans.js';
import { getMainQuestStats } from '../domain/mainQuest.js';
import { setOpsTier, signBonusContract, signRecruitContract } from '../domain/operations.js';
import { availablePlanes, adjustRoutePrice, changeRoutePlane, closeRoute, countCompetitors, openRoute, routeOpenCost, updateRouteMetrics } from '../domain/routes.js';
import { initState, seedInitialFleet } from '../domain/state.js';
import { buyStock, getActiveStocks } from '../domain/stocks.js';
import { applyAngelInvestment, pickAngelInvestmentAmount } from '../domain/angelInvestment.js';
import { branchCost, openBranch } from '../domain/bases.js';
import { calcCompanyValue, calcSubOpenCost, getAvailableSubTypes, getAllSubsidiaries, openSubsidiary } from '../domain/subsidiaries.js';
import { advanceTurnState } from '../domain/turn.js';

export const REGIONAL_HQ_IDS = Object.freeze(['beijing', 'dubai', 'london', 'newyork', 'sydney']);

export const BALANCE_POLICIES = Object.freeze({
  conservative: Object.freeze({
    id: 'conservative',
    label: '稳健经营',
    trait: '豆',
    reserveCash: 35,
    emergencyCash: 5,
    routeLimit: 8,
    routeGrowthInterval: 8,
    maxRoutesPerTurn: 1,
    minRouteProfit: 0.15,
    closeAfterLosses: 5,
    priceFactors: [0.9, 1, 1.1],
    branchLimit: 1,
    branchInterval: 24,
    lease: false,
    loanShare: 0,
    recruit: 'standard',
    bonus: 'mid',
    tiers: { serviceTier: 'mid', maintTier: 'high', adTier: 'low' },
    invest: false,
  }),
  balanced: Object.freeze({
    id: 'balanced',
    label: '均衡扩张',
    trait: '机',
    reserveCash: 22,
    emergencyCash: 3,
    routeLimit: 16,
    routeGrowthInterval: 5,
    maxRoutesPerTurn: 1,
    minRouteProfit: 0,
    closeAfterLosses: 4,
    priceFactors: [0.85, 0.95, 1.05, 1.15],
    branchLimit: 3,
    branchInterval: 16,
    lease: true,
    loanShare: 0.35,
    recruit: 'standard',
    bonus: 'mid',
    tiers: { serviceTier: 'mid', maintTier: 'mid', adTier: 'mid' },
    invest: false,
  }),
  aggressive: Object.freeze({
    id: 'aggressive',
    label: '激进扩张',
    trait: '辣',
    reserveCash: 8,
    emergencyCash: 0,
    routeLimit: 90,
    routeGrowthInterval: 1,
    maxRoutesPerTurn: 2,
    minRouteProfit: -0.2,
    closeAfterLosses: 6,
    priceFactors: [0.8, 0.9, 1, 1.1],
    branchLimit: 9,
    branchInterval: 8,
    lease: true,
    loanShare: 0.7,
    recruit: 'expand',
    bonus: 'high',
    tiers: { serviceTier: 'high', maintTier: 'mid', adTier: 'high' },
    pursueRegions: true,
    invest: false,
  }),
  diversified: Object.freeze({
    id: 'diversified',
    label: '多元投资',
    trait: '机',
    reserveCash: 30,
    emergencyCash: 4,
    routeLimit: 12,
    routeGrowthInterval: 6,
    maxRoutesPerTurn: 1,
    minRouteProfit: 0,
    closeAfterLosses: 4,
    priceFactors: [0.85, 0.95, 1.05, 1.15],
    branchLimit: 2,
    branchInterval: 18,
    lease: false,
    loanShare: 0.25,
    recruit: 'standard',
    bonus: 'mid',
    tiers: { serviceTier: 'high', maintTier: 'mid', adTier: 'mid' },
    invest: true,
  }),
});

export function simulateGame(options = {}) {
  const era = ERAS.find((item) => item.id === (options.eraId || 'era1'));
  if (!era) throw new Error(`Unknown era: ${String(options.eraId)}`);
  const policy = BALANCE_POLICIES[options.policyId || 'balanced'];
  if (!policy) throw new Error(`Unknown balance policy: ${String(options.policyId)}`);
  const hq = options.hq || 'beijing';
  if (!getCity(hq)) throw new Error(`Unknown headquarters: ${String(hq)}`);
  const seed = options.seed ?? `${era.id}|${policy.id}|0`;
  const maxTurns = positiveInteger(options.maxTurns) || (era.endYear - era.startYear) * 4;
  const state = initState(hq, era.id, { seed });
  state.playerTrait = policy.trait;
  state.traitChosen = true;
  state.pendingTraitChoices = null;
  seedInitialFleet(state);

  const context = {
    losses: new Map(),
    actions: createActionCounts(),
    minCash: state.cash,
    maxCash: state.cash,
    profitableTurns: 0,
    totalRevenue: 0,
    totalProfit: 0,
    contributions: createEconomicContributions(),
    rescues: 0,
    forcedLiquidations: 0,
    belowReserveTurns: 0,
    negativeCashTurns: 0,
    peakCash: state.cash,
    maxCashDrawdown: 0,
  };
  assertGameState(state);

  while (!state.gameOver && state.turnsPlayed < maxTurns) {
    settleContracts(state, policy, context.actions);
    applyOperatingPolicy(state, policy);
    manageExistingRoutes(state, policy, context);
    manageEmergencyFinance(state, policy, context.actions);
    expandNetwork(state, policy, context.actions);
    investExcessCash(state, policy, context.actions);
    repayExcessDebt(state, policy, context.actions);

    const report = advanceTurnState(state);
    if (!report) break;
    if (report.angelRescue) {
      const rescue = applyAngelInvestment(state, pickAngelInvestmentAmount(state));
      context.contributions.rescueCapital += rescue.ok ? rescue.amount : 0;
      context.rescues += 1;
    }
    if (report.bankruptcyAction && !report.angelRescue && report.bankruptcyAction.action !== 'gameOver') {
      accumulateBankruptcyContribution(context.contributions, report.bankruptcyAction);
      if (report.bankruptcyAction.action?.startsWith('forceSell')) context.forcedLiquidations += 1;
    }
    accumulateEconomicContributions(context.contributions, report);
    context.minCash = Math.min(context.minCash, state.cash);
    context.maxCash = Math.max(context.maxCash, state.cash);
    context.peakCash = Math.max(context.peakCash, state.cash);
    context.maxCashDrawdown = Math.max(context.maxCashDrawdown, context.peakCash - state.cash);
    if (state.cash < policy.reserveCash) context.belowReserveTurns += 1;
    if (state.cash < 0) context.negativeCashTurns += 1;
    context.totalRevenue += grossInflows(report);
    context.totalProfit += report.profit;
    if (report.profit > 0) context.profitableTurns += 1;
    assertGameState(state);
    options.onTurn?.({ state, report, policy, actions: context.actions });
  }

  return buildSimulationResult(state, era, policy, seed, maxTurns, context);
}

export function simulateBatch(options = {}) {
  const runs = positiveInteger(options.runs) || 1;
  const eras = normalizeSelection(options.eras, ERAS.map((era) => era.id));
  const policies = normalizeSelection(options.policies, Object.keys(BALANCE_POLICIES));
  const hqs = normalizeSelection(options.hqs || options.hq, ['beijing']);
  const results = [];
  eras.forEach((eraId) => {
    policies.forEach((policyId) => {
      hqs.forEach((hq) => {
        for (let run = 0; run < runs; run++) {
          results.push(simulateGame({
            eraId,
            policyId,
            seed: `${options.seedBase || 'balance'}|${eraId}|${policyId}|${hq}|${run}`,
            maxTurns: options.maxTurns,
            hq,
          }));
        }
      });
    });
  });
  return results;
}

export function aggregateSimulationResults(results) {
  const groups = new Map();
  results.forEach((result) => {
    const key = `${result.eraId}|${result.policyId}|${result.hq}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(result);
  });
  return [...groups.values()].map((group) => {
    const first = group[0];
    const victoryTurns = group.map((result) => result.victoryTurn).filter(Number.isFinite);
    return {
      eraId: first.eraId,
      era: first.era,
      policyId: first.policyId,
      policy: first.policy,
      hq: first.hq,
      hqName: first.hqName,
      runs: group.length,
      survivalRate: mean(group.map((result) => Number(result.survived))),
      victoryRate: mean(group.map((result) => Number(Boolean(result.victoryTurn)))),
      avgVictoryTurn: victoryTurns.length > 0 ? mean(victoryTurns) : null,
      rescueRate: mean(group.map((result) => Number(result.rescues > 0))),
      avgTurns: mean(group.map((result) => result.turnsPlayed)),
      avgEndCash: mean(group.map((result) => result.endCash)),
      medianEndCash: median(group.map((result) => result.endCash)),
      avgMinCash: mean(group.map((result) => result.minCash)),
      avgCompanyValue: mean(group.map((result) => result.companyValue)),
      avgRoutes: mean(group.map((result) => result.routes)),
      avgFleet: mean(group.map((result) => result.fleet)),
      avgBaseRegions: mean(group.map((result) => result.baseRegions.length)),
      avgSubsidiaries: mean(group.map((result) => result.subsidiaries)),
      avgLoan: mean(group.map((result) => result.loan)),
      avgLoadFactor: mean(group.map((result) => result.avgLoadFactor)),
      avgProfitMargin: mean(group.map((result) => result.profitMargin)),
      avgRouteOperatingMargin: mean(group.map((result) => result.routeOperatingMargin)),
      avgTraitIncomeShare: mean(group.map((result) => result.traitIncomeShare)),
      avgNonRouteIncomeShare: mean(group.map((result) => result.nonRouteIncomeShare)),
      avgProfitableTurnRate: mean(group.map((result) => result.profitableTurnRate)),
      avgCashPressureRate: mean(group.map((result) => result.cashPressureRate)),
      avgNegativeCashTurnRate: mean(group.map((result) => result.negativeCashTurnRate)),
      avgMaxCashDrawdown: mean(group.map((result) => result.maxCashDrawdown)),
      avgForcedLiquidations: mean(group.map((result) => result.forcedLiquidations)),
      avgLiquidationProceeds: mean(group.map((result) => result.contributions.forcedLiquidationProceeds)),
      avgContributionsPerTurn: aggregateContributions(group),
    };
  });
}

function settleContracts(state, policy, actions) {
  if (state._pendingRecruit) {
    signRecruitContract(state, policy.recruit);
    actions.contracts += 1;
  }
  if (state._pendingBonus) {
    signBonusContract(state, policy.bonus);
    actions.contracts += 1;
  }
}

function applyOperatingPolicy(state, policy) {
  Object.entries(policy.tiers).forEach(([field, tier]) => setOpsTier(state, field, tier));
}

function manageExistingRoutes(state, policy, context) {
  restoreUnservedRoutes(state, context.actions);
  updateRouteMetrics(state);
  state.routes.forEach((route) => {
    const key = routeKey(route.from, route.to);
    const hasPlane = (route.assignedPlanes || []).some((uid) => state.fleet.some((plane) => plane.uid === uid && !plane.delivering));
    const losses = !hasPlane || route.profit < policy.minRouteProfit ? (context.losses.get(key) || 0) + 1 : 0;
    context.losses.set(key, losses);
  });
  if (state.turnsPlayed > 0 && state.turnsPlayed % 4 === 0) {
    state.routes.forEach((route) => {
      const price = bestRoutePrice(state, route, policy.priceFactors);
      if (price !== route.price) {
        adjustRoutePrice(state, route.from, route.to, price);
        context.actions.priceChanges += 1;
      }
    });
  }
  const closable = state.routes
    .filter((route) => (context.losses.get(routeKey(route.from, route.to)) || 0) >= policy.closeAfterLosses)
    .sort((a, b) => a.profit - b.profit);
  if (closable.length > 0 && state.routes.length > 1) {
    const route = closable[0];
    closeRoute(state, route.from, route.to);
    context.losses.delete(routeKey(route.from, route.to));
    context.actions.routesClosed += 1;
  }
}

function manageEmergencyFinance(state, policy, actions) {
  if (policy.loanShare <= 0 || state.cash >= policy.emergencyCash) return;
  const available = maxLoanAmount(state);
  const amount = Math.min(available * policy.loanShare, Math.max(0, policy.reserveCash - state.cash));
  if (amount > 0 && takeLoan(state, amount).ok) actions.loans += 1;
}

function expandNetwork(state, policy, actions) {
  maybeOpenBranch(state, policy, actions);
  const unservedCount = state.routes.filter((route) => (route.assignedPlanes || []).length === 0).length;
  if (unservedCount > 0) {
    const deliveringCount = state.fleet.filter((plane) => plane.delivering).length;
    const requiredRange = Math.min(...state.routes
      .filter((route) => (route.assignedPlanes || []).length === 0)
      .map((route) => cityDist(getCity(route.from), getCity(route.to))));
    const deficit = Math.max(0, unservedCount - deliveringCount);
    if (deficit > 0) acquireExpansionPlane(state, policy, actions, requiredRange, deficit);
    restoreUnservedRoutes(state, actions);
    return;
  }
  const targetRoutes = Math.min(
    policy.routeLimit,
    2 + Math.floor(state.turnsPlayed / policy.routeGrowthInterval) * policy.maxRoutesPerTurn,
  );
  let opened = 0;
  while (state.routes.length < targetRoutes && opened < policy.maxRoutesPerTurn) {
    const candidate = bestRouteCandidate(state, policy);
    if (!candidate) break;
    const result = openRoute(state, candidate.from, candidate.to, candidate.plane.uid, candidate.price);
    if (!result.ok) break;
    actions.routesOpened += 1;
    opened += 1;
  }
  if (state.routes.length >= targetRoutes) return;
  const strategicRange = requiredRangeForUncoveredRegion(state, policy);
  const readyPlanes = availablePlanes(state);
  const futureAvailablePlanes = state.fleet.filter((plane) => plane.delivering || readyPlanes.includes(plane));
  const futureRange = Math.max(0, ...futureAvailablePlanes.map((plane) => plane.range));
  const strategicPlaneAvailable = availablePlaneTemplates(state).some((plane) => plane.range >= strategicRange);
  if (strategicRange > futureRange && strategicPlaneAvailable) {
    acquireExpansionPlane(state, policy, actions, strategicRange, 1);
    return;
  }
  if (readyPlanes.length > 0) return;
  const capacity = availablePlanes(state).length + state.fleet.filter((plane) => plane.delivering).length;
  const requestedCount = Math.max(1, Math.min(policy.maxRoutesPerTurn * 2, targetRoutes - state.routes.length - capacity));
  acquireExpansionPlane(state, policy, actions, 0, requestedCount);
  while (state.routes.length < targetRoutes && opened < policy.maxRoutesPerTurn) {
    const candidate = bestRouteCandidate(state, policy);
    if (!candidate || !openRoute(state, candidate.from, candidate.to, candidate.plane.uid, candidate.price).ok) break;
    actions.routesOpened += 1;
    opened += 1;
  }
}

function maybeOpenBranch(state, policy, actions) {
  const branchCount = state.branches.length + state.branchesConstructing.length;
  if (branchCount >= policy.branchLimit || state.routes.length < 4) return;
  if (state.turnsPlayed === 0 || state.turnsPlayed % policy.branchInterval !== 0) return;
  const cost = branchCost(branchCount);
  if (state.cash - cost < policy.reserveCash) return;
  const baseIds = new Set([state.hq, ...state.branches, ...state.branchesConstructing.map((branch) => branch.cityId)]);
  const coveredRegions = new Set([...baseIds].map(getCity).filter(Boolean).map((city) => city.region));
  const candidate = [...new Set(state.routes.flatMap((route) => [route.from, route.to]))]
    .map(getCity)
    .filter((city) => city && !baseIds.has(city.id))
    .sort((a, b) => {
      const aUncovered = Number(!coveredRegions.has(a.region));
      const bUncovered = Number(!coveredRegions.has(b.region));
      return bUncovered - aUncovered || b.level - a.level || b.pop - a.pop;
    })[0];
  if (candidate && openBranch(state, candidate.id).ok) actions.branchesOpened += 1;
}

function acquireExpansionPlane(state, policy, actions, requiredRange = 0, requestedCount = 1) {
  const templates = availablePlaneTemplates(state).filter((template) => template.range >= requiredRange).sort((a, b) => {
    const aScore = a.buyPrice / Math.max(1, a.seats);
    const bScore = b.buyPrice / Math.max(1, b.seats);
    return aScore - bScore || a.buyPrice - b.buyPrice;
  });
  for (const template of templates) {
    for (let count = Math.min(10, requestedCount); count >= 1; count--) {
      const leaseQuote = policy.lease ? quotePlaneAcquisition(state, template.id, true, count) : null;
      if (leaseQuote?.ok && state.cash - leaseQuote.totalCost >= policy.reserveCash) {
        if (buyPlane(state, template.id, true, count).ok) actions.planesLeased += count;
        return;
      }
      const buyQuote = quotePlaneAcquisition(state, template.id, false, count);
      if (buyQuote.ok && state.cash - buyQuote.totalCost >= policy.reserveCash) {
        if (buyPlane(state, template.id, false, count).ok) actions.planesBought += count;
        return;
      }
    }
  }
}

function restoreUnservedRoutes(state, actions) {
  const unserved = state.routes.filter((route) => (route.assignedPlanes || []).length === 0);
  unserved.forEach((route) => {
    const from = getCity(route.from);
    const to = getCity(route.to);
    if (!from || !to) return;
    const distance = cityDist(from, to);
    const plane = availablePlanes(state)
      .filter((item) => item.range >= distance)
      .sort((a, b) => a.seats - b.seats || a.range - b.range)[0];
    if (plane && changeRoutePlane(state, route.from, route.to, plane.uid).ok) actions.planesReassigned += 1;
  });
}

function requiredRangeForUncoveredRegion(state, policy) {
  if (!policy.pursueRegions) return 0;
  const bases = [state.hq, ...state.branches].map(getCity).filter(Boolean);
  const coveredRegions = new Set(bases.map((city) => city.region));
  const candidates = CITIES.filter((city) => !coveredRegions.has(city.region));
  if (candidates.length === 0) return 0;
  return Math.min(...bases.flatMap((base) => candidates.map((city) => cityDist(base, city))));
}

function bestRouteCandidate(state, policy) {
  const planes = availablePlanes(state);
  if (planes.length === 0) return null;
  const bases = [state.hq, ...state.branches].filter(Boolean);
  const coveredRegions = new Set(bases.map(getCity).filter(Boolean).map((city) => city.region));
  const existing = new Set(state.routes.map((route) => routeKey(route.from, route.to)));
  let best = null;
  bases.forEach((from) => {
    CITIES.forEach((city) => {
      if (city.id === from || existing.has(routeKey(from, city.id))) return;
      const openCost = routeOpenCost(from, city.id);
      if (state.cash - openCost < policy.reserveCash) return;
      planes.forEach((plane) => {
        if (plane.range < cityDist(getCity(from), city)) return;
        const estimate = bestEstimatedRoute(state, from, city.id, plane, policy.priceFactors);
        const strategicRegion = policy.pursueRegions && !coveredRegions.has(city.region);
        const regionExpansionBonus = strategicRegion ? 1000 : 0;
        const score = estimate.profit - openCost / 12 + regionExpansionBonus;
        if (estimate.profit < policy.minRouteProfit && !strategicRegion) return;
        if (!best || score > best.score) best = { ...estimate, from, to: city.id, plane, score };
      });
    });
  });
  return best;
}

function bestRoutePrice(state, route, factors) {
  const planes = state.fleet.filter((plane) => (route.assignedPlanes || []).includes(plane.uid));
  if (planes.length === 0) return route.price;
  return bestEstimatedRoute(state, route.from, route.to, planes[0], factors).price;
}

function bestEstimatedRoute(state, from, to, plane, factors) {
  const basePrice = suggestedPrice(from, to);
  let best = null;
  factors.forEach((factor) => {
    const price = Math.max(1, Math.round(basePrice * factor));
    const route = {
      from,
      to,
      price,
      suggestedPrice: basePrice,
      serviceMultiplier: 1,
      assignedPlanes: [plane.uid],
      suspended: false,
    };
    const assignedPlanes = [plane];
    route.loadFactor = calcLoadFactor(state, route, price, state.brand, countCompetitors(state, from, to), assignedPlanes);
    const revenue = routeRevenue(state, route, assignedPlanes).total;
    const cost = routeCost(state, route, assignedPlanes).total;
    const estimate = { price, loadFactor: route.loadFactor, revenue, cost, profit: revenue - cost };
    if (!best || estimate.profit > best.profit) best = estimate;
  });
  return best;
}

function investExcessCash(state, policy, actions) {
  if (!policy.invest || state.turnsPlayed === 0 || state.turnsPlayed % 4 !== 0) return;
  const cityIds = [...new Set([state.hq, ...state.branches, ...state.routes.flatMap((route) => [route.from, route.to])])];
  const opportunities = cityIds.flatMap((cityId) => getAvailableSubTypes(state, cityId)
    .map((type) => ({ cityId, type, cost: calcSubOpenCost(type, cityId) })))
    .sort((a, b) => a.cost - b.cost);
  const subsidiary = opportunities.find((item) => state.cash - item.cost * 1.01 >= policy.reserveCash * 2);
  if (subsidiary && openSubsidiary(state, subsidiary.type, subsidiary.cityId).ok) {
    actions.subsidiariesOpened += 1;
    return;
  }
  const stock = getActiveStocks(state)
    .filter((item) => state.stocks[item.id])
    .sort((a, b) => b.dividendYield - a.dividendYield)[0];
  if (stock) {
    const price = state.stocks[stock.id].price * 1.01;
    if (state.cash - price >= policy.reserveCash * 2 && buyStock(state, stock.id, 1).ok) actions.stockBuys += 1;
  }
}

function repayExcessDebt(state, policy, actions) {
  if (state.loan <= 0 || state.cash <= policy.reserveCash * 3) return;
  const amount = Math.min(state.loan, state.cash - policy.reserveCash * 2);
  if (amount > 0 && repayLoan(state, amount).ok) actions.repayments += 1;
}

function buildSimulationResult(state, era, policy, seed, maxTurns, context) {
  const turns = state.turnsPlayed || 0;
  const quest = getMainQuestStats(state);
  const contributions = roundObject(context.contributions);
  const routeOperatingCosts = contributions.routeCost
    + contributions.fleetOverhead
    + contributions.leaseCost
    + contributions.loanInterest
    + contributions.operations
    + contributions.faults;
  const nonRouteIncome = contributions.traitFund
    + contributions.stockDividends
    + contributions.subsidiaryReturns;
  const totalInflows = contributions.routeRevenue + nonRouteIncome;
  const avgLoadFactor = state.routes.length > 0
    ? mean(state.routes.map((route) => Number(route.loadFactor) || 0))
    : 0;
  return {
    eraId: era.id,
    era: era.name,
    policyId: policy.id,
    policy: policy.label,
    hq: state.hq,
    hqName: getCity(state.hq)?.name || state.hq,
    seed: String(seed),
    horizonTurns: maxTurns,
    turnsPlayed: turns,
    survived: !state.gameOver && turns >= maxTurns,
    gameOver: state.gameOver,
    victoryTurn: quest.victoryTurn || null,
    questStage: quest.currentStage,
    questStagesCompleted: quest.stageCompleted.length,
    questProgress: quest.progress?.dimensions || null,
    endCash: round(state.cash),
    minCash: round(context.minCash),
    maxCash: round(context.maxCash),
    companyValue: round(calcCompanyValue(state).totalNetWorth),
    totalProfit: round(context.totalProfit),
    profitMargin: context.totalRevenue > 0 ? context.totalProfit / context.totalRevenue : 0,
    routeOperatingMargin: contributions.routeRevenue > 0
      ? (contributions.routeRevenue - routeOperatingCosts) / contributions.routeRevenue
      : 0,
    traitIncomeShare: totalInflows > 0 ? contributions.traitFund / totalInflows : 0,
    nonRouteIncomeShare: totalInflows > 0 ? nonRouteIncome / totalInflows : 0,
    profitableTurnRate: turns > 0 ? context.profitableTurns / turns : 0,
    cashPressureRate: turns > 0 ? context.belowReserveTurns / turns : 0,
    negativeCashTurnRate: turns > 0 ? context.negativeCashTurns / turns : 0,
    maxCashDrawdown: round(context.maxCashDrawdown),
    routes: state.routes.length,
    fleet: state.fleet.length,
    branches: state.branches.length,
    baseRegions: [...new Set([state.hq, ...state.branches].map(getCity).filter(Boolean).map((city) => city.region))],
    routeRegions: [...new Set(state.routes.flatMap((route) => [route.from, route.to]).map(getCity).filter(Boolean).map((city) => city.region))],
    subsidiaries: getAllSubsidiaries(state).length,
    loan: round(state.loan || 0),
    avgLoadFactor,
    rescues: context.rescues,
    forcedLiquidations: context.forcedLiquidations,
    contributions,
    randomDraws: state.rng.draws,
    actions: context.actions,
  };
}

function createActionCounts() {
  return {
    routesOpened: 0,
    routesClosed: 0,
    priceChanges: 0,
    planesBought: 0,
    planesLeased: 0,
    planesReassigned: 0,
    branchesOpened: 0,
    subsidiariesOpened: 0,
    stockBuys: 0,
    loans: 0,
    repayments: 0,
    contracts: 0,
  };
}

function createEconomicContributions() {
  return {
    routeRevenue: 0,
    traitFund: 0,
    stockDividends: 0,
    subsidiaryReturns: 0,
    routeCost: 0,
    fleetOverhead: 0,
    leaseCost: 0,
    loanInterest: 0,
    operations: 0,
    faults: 0,
    subsidiaryMaintenance: 0,
    subsidiaryValueChange: 0,
    emergencyBorrowing: 0,
    forcedLiquidationProceeds: 0,
    rescueCapital: 0,
  };
}

function accumulateEconomicContributions(contributions, report) {
  contributions.routeRevenue += number(report.routeRevenue);
  contributions.traitFund += number(report.traitFund);
  contributions.stockDividends += number(report.stockDividend);
  contributions.subsidiaryReturns += number(report.subReturn);
  contributions.routeCost += number(report.routeCost);
  contributions.fleetOverhead += number(report.overhead);
  contributions.leaseCost += number(report.leaseCost);
  contributions.loanInterest += number(report.interest);
  contributions.operations += number(report.opsCost);
  contributions.faults += number(report.faultLoss);
  contributions.subsidiaryMaintenance += number(report.subMaint);
  contributions.subsidiaryValueChange += number(report.subValueChange);
}

function accumulateBankruptcyContribution(contributions, action) {
  const amount = number(action.amount);
  if (action.action === 'emergencyLoan') contributions.emergencyBorrowing += amount;
  else if (action.action?.startsWith('forceSell')) contributions.forcedLiquidationProceeds += amount;
}

function grossInflows(report) {
  return number(report.routeRevenue)
    + number(report.traitFund)
    + number(report.stockDividend)
    + number(report.subReturn);
}

function aggregateContributions(group) {
  const keys = Object.keys(group[0]?.contributions || {});
  return Object.fromEntries(keys.map((key) => [
    key,
    mean(group.map((result) => result.turnsPlayed > 0 ? number(result.contributions[key]) / result.turnsPlayed : 0)),
  ]));
}

function roundObject(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, round(item)]));
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function normalizeSelection(selection, defaults) {
  if (!selection) return defaults;
  return Array.isArray(selection) ? selection : String(selection).split(',').filter(Boolean);
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function mean(values) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
