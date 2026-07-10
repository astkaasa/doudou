import { getCityMarketState } from '../data/cityEraData.js';
import {
  EMERGENCY_LOAN_CAP_RATIO,
  EMERGENCY_LOAN_RATE_MULT,
  SUB_ACQUIRE_MAX_FACTOR,
  SUB_ACQUIRE_MIN_FACTOR,
  SUB_AI_DILUTE_RATE,
  SUB_AIRPORT_PROFIT_SHARE,
  SUB_AIRPORT_SELLBACK_RATE,
  SUB_AIRPORT_VALUE_FLOOR,
  SUB_BASE_APPRECIATION,
  SUB_CITY_WEIGHT_BIZ,
  SUB_CITY_WEIGHT_POP,
  SUB_CITY_WEIGHT_TOUR,
  SUB_DUTYFREE_BRAND_BONUS,
  SUB_FEE_RATE,
  SUB_LANDING_DISCOUNT,
  SUB_LOSS_PENALTY,
  SUB_MEGA_BOOST_MULT,
  SUB_MEGA_BOOST_MULT_S,
  SUB_MEGA_SPILLOVER_MULT,
  SUB_MEGA_VALUE_BOOST,
  SUB_NO_ROUTE_PENALTY,
  SUB_PROFIT_BOOST,
  SUB_ROUTE_LF_BONUS,
  SUB_ROUTE_PRESENCE_BONUS,
  SUB_TYPES,
  SUB_VALUE_FLOOR_RATIO,
  SUBSIDIARY_TYPE_ORDER,
} from '../data/subsidiaries.js';
import { isBase } from './bases.js';
import {
  getAirportInvestment,
  getAirportInvestmentTargets,
  getAirportLandingDiscount,
  normalizeAirportInvestmentFields,
} from './airportManagement.js';
import { airportServesCity, getDefaultAirportIdForYear, isAirportActive } from './airports.js';
import { MEGA_EVENT_SPILLOVER } from './constants.js';
import { clamp, getCity } from './helpers.js';
import { syncStaffToNeeded } from './operations.js';
import { randomSource } from './random.js';
import { calcPortfolioValue, sellStock } from './stocks.js';

const FORCE_PLANE_SELL_AGE_FACTOR = 0.04;

export { SUB_TYPES, SUBSIDIARY_TYPE_ORDER };

export function createSubsidiaryState() {
  return {
    subsidiaries: {},
    _subReturnThisTurn: 0,
    _subMaintThisTurn: 0,
    _subValueChangeThisTurn: 0,
    _acquirePriceSeed: 0,
  };
}

export function normalizeSubsidiaryState(state) {
  if (!state) return state;
  if (!isPlainObject(state.subsidiaries)) state.subsidiaries = {};
  const normalized = {};
  Object.entries(state.subsidiaries).forEach(([cityId, entries]) => {
    const city = getCity(cityId);
    if (!city || !Array.isArray(entries)) return;
    const seenTypes = new Set();
    entries.forEach((entry) => {
      if (!isPlainObject(entry) || !SUB_TYPES[entry.type]) return;
      const fallbackCost = calcSubOpenCost(entry.type, cityId);
      const openCost = positiveNumber(entry.openCost) ? Number(entry.openCost) : fallbackCost;
      const currentValue = positiveNumber(entry.currentValue) ? Number(entry.currentValue) : openCost;
      const normalizedEntry = {
        type: entry.type,
        openCost,
        currentValue,
        source: normalizeSource(entry.source, entry.type),
        quarterAcquired: Number.isFinite(Number(entry.quarterAcquired)) ? Math.floor(Number(entry.quarterAcquired)) : Number(state.turnsPlayed) || 0,
        cityLevelAtAcquire: Number.isFinite(Number(entry.cityLevelAtAcquire)) ? Number(entry.cityLevelAtAcquire) : city.level,
        isNew: Boolean(entry.isNew),
      };
      if (entry.type === 'airport') {
        normalizedEntry.airportId = entry.airportId;
        normalizedEntry.migratedFromCity = entry.migratedFromCity;
        normalizedEntry.migratedFromAirportId = entry.migratedFromAirportId
          && airportServesCity(entry.migratedFromAirportId, cityId)
          ? entry.migratedFromAirportId
          : null;
        normalizedEntry.landingDiscount = entry.landingDiscount;
        normalizedEntry.upgrades = entry.upgrades;
        normalizeAirportInvestmentFields(normalizedEntry, cityId, state.year);
      }
      const uniqueKey = entry.type === 'airport' ? `airport:${normalizedEntry.airportId}` : entry.type;
      if (seenTypes.has(uniqueKey)) return;
      seenTypes.add(uniqueKey);
      if (!normalized[cityId]) normalized[cityId] = [];
      normalized[cityId].push(normalizedEntry);
    });
  });
  state.subsidiaries = normalized;
  if (!isPlainObject(state.ai)) {
    (Array.isArray(state.ai) ? state.ai : []).forEach((ai) => normalizeAiSubsidiaries(ai));
  }
  state._subReturnThisTurn = finiteNumber(state._subReturnThisTurn);
  state._subMaintThisTurn = finiteNumber(state._subMaintThisTurn);
  state._subValueChangeThisTurn = finiteNumber(state._subValueChangeThisTurn);
  state._acquirePriceSeed = Number.isFinite(Number(state._acquirePriceSeed)) ? Math.floor(Number(state._acquirePriceSeed)) : 0;
  return state;
}

export function normalizeAiSubsidiaries(ai) {
  if (!ai) return ai;
  if (!isPlainObject(ai.subsidiaries)) ai.subsidiaries = {};
  const normalized = {};
  Object.entries(ai.subsidiaries).forEach(([cityId, entries]) => {
    if (!getCity(cityId) || !Array.isArray(entries)) return;
    const seenTypes = new Set();
    entries.forEach((entry) => {
      if (!isPlainObject(entry) || !SUB_TYPES[entry.type] || seenTypes.has(entry.type)) return;
      seenTypes.add(entry.type);
      if (!normalized[cityId]) normalized[cityId] = [];
      normalized[cityId].push({
        type: entry.type,
        openCost: finiteNumber(entry.openCost),
        currentValue: finiteNumber(entry.currentValue),
        source: 'ai',
        quarterAcquired: Number.isFinite(Number(entry.quarterAcquired)) ? Math.floor(Number(entry.quarterAcquired)) : 0,
        cityLevelAtAcquire: Number.isFinite(Number(entry.cityLevelAtAcquire)) ? Number(entry.cityLevelAtAcquire) : getCity(cityId).level,
      });
    });
  });
  ai.subsidiaries = normalized;
  return ai;
}

export function calcSubOpenCost(type, cityId) {
  const cfg = SUB_TYPES[type];
  const city = getCity(cityId);
  if (!cfg || !city) return Infinity;
  return type === 'airport' ? cfg.costBase * city.level * city.level : cfg.costBase * city.level;
}

export function getAcquirePrice(state, type, cityId) {
  const baseCost = calcSubOpenCost(type, cityId);
  if (!Number.isFinite(baseCost)) return Infinity;
  const seed = Number(state?._acquirePriceSeed) || 0;
  const combined = seed * 31 + hashString(cityId) * 17 + hashString(type);
  const raw = Math.sin(combined) * 10000;
  const rand = ((raw % 1) + 1) % 1;
  const factor = SUB_ACQUIRE_MIN_FACTOR + rand * (SUB_ACQUIRE_MAX_FACTOR - SUB_ACQUIRE_MIN_FACTOR);
  return Math.round(baseCost * factor * 10) / 10;
}

export function getAvailableSubTypes(state, cityId) {
  normalizeSubsidiaryState(state);
  const city = getCity(cityId);
  if (!city) return [];
  const existing = new Set(getCitySubTypes(state, cityId));
  const market = getCityMarketState(state, cityId);
  return SUBSIDIARY_TYPE_ORDER.filter((type) => {
    if (type === 'airport') {
      if (getAirportInvestmentTargets(state, cityId).length === 0) return false;
    } else if (existing.has(type)) return false;
    const cfg = SUB_TYPES[type];
    if (city.level < cfg.minLevel) return false;
    if (market.tour < cfg.minTour) return false;
    if (market.biz < cfg.minBiz) return false;
    if (cfg.requiresBase && !isBase(state, cityId)) return false;
    return true;
  });
}

export function canOpenSubType(state, type, cityId, options = {}) {
  const cfg = SUB_TYPES[type];
  const city = getCity(cityId);
  if (!cfg || !city) return { ok: false, message: '城市或子公司类型不存在' };
  if (city.level < cfg.minLevel) return { ok: false, message: '城市等级不足' };
  const market = getCityMarketState(state, cityId);
  if (market.tour < cfg.minTour) return { ok: false, message: '旅游指数不足' };
  if (market.biz < cfg.minBiz) return { ok: false, message: '商业指数不足' };
  if (cfg.requiresBase && !isBase(state, cityId)) return { ok: false, message: '仅总部或分部城市可投资机场' };
  if (type === 'airport') {
    const airportId = options.airportId || getAirportInvestmentTargets(state, cityId)[0]?.id || getDefaultAirportIdForYear(cityId, state.year);
    if (!airportServesCity(airportId, cityId)) return { ok: false, message: '所选机场不服务该城市' };
    if (!isAirportActive(airportId, state.year)) return { ok: false, message: '所选机场当前不可投资' };
    if (getAirportInvestment(state, airportId)) return { ok: false, message: '该机场已有投资项目' };
  } else if (hasSubType(state, cityId, type)) return { ok: false, message: '该城市已有同类子公司' };
  return { ok: true };
}

export function openSubsidiary(state, type, cityId, options = {}) {
  normalizeSubsidiaryState(state);
  const airportId = type === 'airport'
    ? (options.airportId || getAirportInvestmentTargets(state, cityId)[0]?.id || getDefaultAirportIdForYear(cityId, state.year))
    : null;
  const validation = canOpenSubType(state, type, cityId, { airportId });
  if (!validation.ok) return validation;
  const cost = calcSubOpenCost(type, cityId);
  const fee = Math.round(cost * SUB_FEE_RATE * 10) / 10;
  const totalCost = cost + fee;
  if (state.cash < totalCost) return { ok: false, message: '资金不足' };
  state.cash -= totalCost;
  if (!state.subsidiaries[cityId]) state.subsidiaries[cityId] = [];
  const entry = {
    type,
    openCost: cost,
    currentValue: cost,
    source: type === 'airport' ? 'invest' : 'open',
    quarterAcquired: Number(state.turnsPlayed) || 0,
    cityLevelAtAcquire: getCity(cityId).level,
    isNew: true,
  };
  if (type === 'airport') {
    entry.airportId = airportId;
    entry.migratedFromCity = null;
    entry.landingDiscount = SUB_LANDING_DISCOUNT;
    entry.upgrades = {};
    normalizeAirportInvestmentFields(entry, cityId, state.year);
  }
  state.subsidiaries[cityId].push(entry);
  return { ok: true, type, cityId, airportId, cost, fee, totalCost };
}

export function acquireSubsidiary(state, type, cityId) {
  normalizeSubsidiaryState(state);
  if (type === 'airport') return { ok: false, message: '投资共建项目不可收购' };
  const validation = canOpenSubType(state, type, cityId);
  if (!validation.ok) return validation;
  const baseCost = calcSubOpenCost(type, cityId);
  const cost = getAcquirePrice(state, type, cityId);
  const fee = Math.round(cost * SUB_FEE_RATE * 10) / 10;
  const totalCost = cost + fee;
  if (state.cash < totalCost) return { ok: false, message: '资金不足' };
  state.cash -= totalCost;
  if (!state.subsidiaries[cityId]) state.subsidiaries[cityId] = [];
  state.subsidiaries[cityId].push({
    type,
    openCost: cost,
    currentValue: cost,
    source: 'acquire',
    quarterAcquired: Number(state.turnsPlayed) || 0,
    cityLevelAtAcquire: getCity(cityId).level,
    isNew: true,
  });
  return { ok: true, type, cityId, cost, fee, totalCost, baseCost };
}

export function sellSubsidiary(state, cityId, type, airportId = null) {
  normalizeSubsidiaryState(state);
  const list = state.subsidiaries[cityId];
  if (!Array.isArray(list)) return { ok: false, message: '子公司不存在' };
  const index = list.findIndex((sub) => sub.type === type && (type !== 'airport' || !airportId || sub.airportId === airportId));
  if (index < 0) return { ok: false, message: '子公司不存在' };
  const sub = list[index];
  const grossPrice = type === 'airport'
    ? Math.round(sub.currentValue * SUB_AIRPORT_SELLBACK_RATE * 10) / 10
    : Math.round(sub.currentValue * 10) / 10;
  const fee = Math.round(grossPrice * SUB_FEE_RATE * 10) / 10;
  const sellPrice = grossPrice - fee;
  state.cash += sellPrice;
  list.splice(index, 1);
  if (list.length === 0) delete state.subsidiaries[cityId];
  return { ok: true, cityId, type, airportId: sub.airportId || null, sellPrice, fee, originalCost: sub.openCost, profit: sellPrice - sub.openCost };
}

export function updateSubsidiaryValues(state) {
  normalizeSubsidiaryState(state);
  const before = getTotalSubValue(state);
  const totalRouteProfit = (state.routes || []).reduce((sum, route) => sum + (Number(route.profit) || 0), 0);
  const totalRouteRevenue = (state.routes || []).reduce((sum, route) => sum + (Number(route.revenue) || 0), 0);
  const profitRatio = totalRouteRevenue > 0 ? totalRouteProfit / totalRouteRevenue : 0;

  Object.entries(state.subsidiaries).forEach(([cityId, entries]) => {
    entries.forEach((sub) => {
      let delta = SUB_BASE_APPRECIATION;
      if (profitRatio > 0.15) delta += SUB_PROFIT_BOOST;
      else if (profitRatio < 0.05) delta -= SUB_LOSS_PENALTY;

      const hasRouteHere = (state.routes || []).some((route) => route.from === cityId || route.to === cityId);
      delta += hasRouteHere ? SUB_ROUTE_PRESENCE_BONUS : -SUB_NO_ROUTE_PENALTY;

      (state.activeMegaEvents || []).forEach((event) => {
        if (event.cityId === cityId && event.currentBoost > 0) delta += event.currentBoost * SUB_MEGA_VALUE_BOOST;
      });

      const market = getCityMarketState(state, cityId);
      delta += (market.biz - 30) * 0.00002 + (market.tour - 30) * 0.00002;

      const floorRatio = sub.type === 'airport' ? SUB_AIRPORT_VALUE_FLOOR : SUB_VALUE_FLOOR_RATIO;
      sub.currentValue = roundMoney(Math.max(sub.openCost * floorRatio, sub.currentValue * (1 + delta)));
    });
  });
  state._subValueChangeThisTurn = roundMoney(getTotalSubValue(state) - before);
  return state._subValueChangeThisTurn;
}

export function calcSubReturn(state, sub, cityId) {
  normalizeSubsidiaryState(state);
  const cfg = SUB_TYPES[sub?.type];
  if (!cfg) return { gross: 0, maint: 0, net: 0 };
  let gross = sub.currentValue * cfg.baseRate * cityInvestIndex(state, cityId) * megaReturnMultiplier(state, cfg, cityId) * aiCompetitionMultiplier(state, cityId, sub.type);
  const maint = sub.currentValue * cfg.maintRate;
  if (sub.type === 'airport') gross *= SUB_AIRPORT_PROFIT_SHARE;
  const net = gross - maint;
  return { gross, maint, net };
}

export function settleSubsidiaryQuarter(state) {
  normalizeSubsidiaryState(state);
  updateSubsidiaryValues(state);
  let subReturn = 0;
  let subMaint = 0;
  Object.entries(state.subsidiaries).forEach(([cityId, entries]) => {
    entries.forEach((sub) => {
      if (sub.isNew) return;
      const result = calcSubReturn(state, sub, cityId);
      subReturn += result.gross;
      subMaint += result.maint;
    });
  });
  state._subReturnThisTurn = roundMoney(subReturn);
  state._subMaintThisTurn = roundMoney(subMaint);
  clearNewSubsidiaryFlags(state);
  applyDutyFreeBrandBonus(state);
  state._acquirePriceSeed = (Number(state.turnsPlayed) || 0) + 1;
  return {
    subReturn: state._subReturnThisTurn,
    subMaint: state._subMaintThisTurn,
    subNet: roundMoney(state._subReturnThisTurn - state._subMaintThisTurn),
    subValueChange: state._subValueChangeThisTurn,
  };
}

export function hasSubType(state, cityId, type, airportId = null) {
  normalizeSubsidiaryState(state);
  return Boolean(state.subsidiaries?.[cityId]?.some((sub) => sub.type === type
    && (type !== 'airport' || !airportId || sub.airportId === airportId)));
}

export function getSubLFBonus(state, cityId) {
  return hasSubType(state, cityId, 'travel') ? SUB_ROUTE_LF_BONUS : 0;
}

export function getSubLandingDiscount(state, cityId, airportId = null) {
  normalizeSubsidiaryState(state);
  if (airportId) return getAirportLandingDiscount(state, airportId, cityId);
  return (state.subsidiaries?.[cityId] || [])
    .filter((sub) => sub.type === 'airport')
    .reduce((maximum, sub) => Math.max(maximum, Number(sub.landingDiscount) || SUB_LANDING_DISCOUNT), 0);
}

export function getAllSubsidiaries(state) {
  normalizeSubsidiaryState(state);
  return Object.entries(state.subsidiaries).flatMap(([cityId, entries]) => entries.map((sub) => ({ cityId, ...sub })));
}

export function getTotalSubValue(state) {
  return getAllSubsidiaries(state).reduce((sum, sub) => sum + (Number(sub.currentValue) || 0), 0);
}

export function getCitySubTypes(state, cityId) {
  normalizeSubsidiaryState(state);
  return [...new Set((state.subsidiaries?.[cityId] || []).map((sub) => sub.type))];
}

export function calcCompanyValue(state) {
  normalizeSubsidiaryState(state);
  const cash = finiteNumber(state.cash);
  const fleetValue = (state.fleet || [])
    .filter((plane) => !plane.isLease)
    .reduce((sum, plane) => sum + planeResidualValue(plane), 0);
  const subValue = getTotalSubValue(state);
  const stockValue = calcPortfolioValue(state).marketValue;
  const loanDebt = finiteNumber(state.loan);
  return {
    cash,
    fleetValue,
    subValue,
    stockValue,
    loanDebt,
    totalNetWorth: cash + fleetValue + subValue + stockValue - loanDebt,
  };
}

export function handleBankruptcy(state) {
  if (!state) return { gameOver: true, action: 'invalid' };
  const emergencyLoan = attemptEmergencyLoan(state);
  if (emergencyLoan.ok) return { gameOver: false, action: 'emergencyLoan', ...emergencyLoan };
  const stockSales = forceSellStocks(state);
  if (stockSales.ok) return { gameOver: false, action: 'forceSellStocks', ...stockSales };
  const subSales = forceSellSubsidiaries(state);
  if (subSales.ok) return { gameOver: false, action: 'forceSellSubsidiaries', ...subSales };
  const planeSales = forceSellPlanes(state);
  if (planeSales.ok) return { gameOver: false, action: 'forceSellPlanes', ...planeSales };
  if (!state.bankruptRescued) {
    state.bankruptRescued = true;
    return { gameOver: false, angelRescue: true, action: 'angelRescue' };
  }
  state.gameOver = true;
  return { gameOver: true, action: 'gameOver' };
}

export function aiSubDecide(state, ai, random = randomSource(state)) {
  normalizeAiSubsidiaries(ai);
  if (!state || !ai || (Number(state.turnsPlayed) || 0) % 4 !== 0) return false;
  if (!Array.isArray(ai.routes) || ai.routes.length === 0) return false;
  const aiSubCount = Object.values(ai.subsidiaries || {}).flat().length;
  if (aiSubCount >= ai.routes.length) return false;
  if (random() > 0.30) return false;
  const servedCities = [...new Set(ai.routes.flatMap((route) => [route.from, route.to]))].filter((cityId) => getCity(cityId));
  if (servedCities.length === 0) return false;
  const targetCity = servedCities[Math.floor(random() * servedCities.length)];
  const city = getCity(targetCity);
  if (!city || city.level < 2) return false;
  const typePool = ai.riskAverse > 0.6
    ? ['shuttle', 'hotel']
    : ai.riskAverse < 0.4
      ? ['dutyfree', 'travel']
      : ['shuttle', 'hotel', 'travel', 'dutyfree'];
  const existingTypes = new Set((ai.subsidiaries[targetCity] || []).map((sub) => sub.type));
  const available = typePool.filter((type) => !existingTypes.has(type) && canAiUseSubType(state, type, targetCity));
  if (available.length === 0) return false;
  const type = available[Math.floor(random() * available.length)];
  if (!ai.subsidiaries[targetCity]) ai.subsidiaries[targetCity] = [];
  ai.subsidiaries[targetCity].push({
    type,
    openCost: 0,
    currentValue: 0,
    source: 'ai',
    quarterAcquired: Number(state.turnsPlayed) || 0,
    cityLevelAtAcquire: city.level,
  });
  return true;
}

function attemptEmergencyLoan(state) {
  const cv = calcCompanyValue(state);
  const maxEmergencyLoan = Math.max(0, cv.totalNetWorth * EMERGENCY_LOAN_CAP_RATIO - (Number(state.loan) || 0));
  if (maxEmergencyLoan <= 0) return { ok: false };
  const deficit = Math.abs(Math.min(0, Number(state.cash) || 0));
  const amount = Math.min(deficit + 5, maxEmergencyLoan);
  if (amount <= 0) return { ok: false };
  state.loan = (Number(state.loan) || 0) + amount;
  state.cash = (Number(state.cash) || 0) + amount;
  state.loanRate = (Number(state.loanRate) || 0.02) * EMERGENCY_LOAN_RATE_MULT;
  return { ok: state.cash >= 0, amount };
}

function forceSellStocks(state) {
  if (!isPlainObject(state.portfolio) || Object.keys(state.portfolio).length === 0) return { ok: false };
  const holdings = Object.entries(state.portfolio)
    .map(([stockId, holding]) => ({
      stockId,
      shares: Math.max(0, Math.round(Number(holding?.shares) || 0)),
      value: (Number(holding?.shares) || 0) * (Number(state.stocks?.[stockId]?.price) || 0),
    }))
    .filter((holding) => holding.shares > 0)
    .sort((a, b) => b.value - a.value);
  let sold = 0;
  holdings.forEach((holding) => {
    if (state.cash >= 0) return;
    const result = sellStock(state, holding.stockId, holding.shares);
    if (result.ok) sold += result.netRevenue;
  });
  return { ok: state.cash >= 0 && sold > 0, amount: sold };
}

function forceSellSubsidiaries(state) {
  const entries = getAllSubsidiaries(state)
    .map((sub) => ({ cityId: sub.cityId, type: sub.type, airportId: sub.airportId || null, value: Number(sub.currentValue) || 0 }))
    .sort((a, b) => b.value - a.value);
  let sold = 0;
  entries.forEach((entry) => {
    if (state.cash >= 0) return;
    const result = sellSubsidiary(state, entry.cityId, entry.type, entry.airportId);
    if (result.ok) sold += result.sellPrice;
  });
  return { ok: state.cash >= 0 && sold > 0, amount: sold };
}

function forceSellPlanes(state) {
  const sellable = (state.fleet || [])
    .filter((plane) => !plane.delivering && !plane.isLease)
    .map((plane) => ({ plane, sellPrice: planeResidualValue(plane) }))
    .sort((a, b) => b.sellPrice - a.sellPrice);
  let sold = 0;
  sellable.forEach((item) => {
    if (state.cash >= 0) return;
    (state.routes || []).forEach((route) => {
      route.assignedPlanes = (route.assignedPlanes || []).filter((uid) => uid !== item.plane.uid);
    });
    state.cash += item.sellPrice;
    state.fleet = state.fleet.filter((plane) => plane.uid !== item.plane.uid);
    sold += item.sellPrice;
  });
  if (sold > 0) {
    state.routes = (state.routes || []).filter((route) => (route.assignedPlanes || []).length > 0);
    syncStaffToNeeded(state, 0);
  }
  return { ok: state.cash >= 0 && sold > 0, amount: sold };
}

function applyDutyFreeBrandBonus(state) {
  Object.values(state.subsidiaries || {}).forEach((entries) => {
    if (entries.some((sub) => sub.type === 'dutyfree')) {
      state.brand = clamp((Number(state.brand) || 1) + SUB_DUTYFREE_BRAND_BONUS, 1, 10);
    }
  });
}

function clearNewSubsidiaryFlags(state) {
  Object.values(state.subsidiaries || {}).forEach((entries) => {
    entries.forEach((sub) => {
      sub.isNew = false;
    });
  });
}

function cityInvestIndex(state, cityId) {
  const market = getCityMarketState(state, cityId);
  const popNorm = 0.2 + Math.min(market.pop / 30, 1) * 0.8;
  const bizNorm = 0.2 + Math.min(market.biz / 80, 1) * 0.8;
  const tourNorm = 0.2 + Math.min(market.tour / 60, 1) * 0.8;
  return popNorm * SUB_CITY_WEIGHT_POP + bizNorm * SUB_CITY_WEIGHT_BIZ + tourNorm * SUB_CITY_WEIGHT_TOUR;
}

function megaReturnMultiplier(state, cfg, cityId) {
  let multiplier = 1;
  (state.activeMegaEvents || []).forEach((event) => {
    if ((event.currentBoost || 0) <= 0) return;
    if (event.cityId === cityId) {
      if (cfg.special === 'mega_boost') multiplier = Math.max(multiplier, 1 + event.currentBoost * SUB_MEGA_BOOST_MULT);
      else if (cfg.special === 'mega_boost_s') multiplier = Math.max(multiplier, 1 + event.currentBoost * SUB_MEGA_BOOST_MULT_S);
      else multiplier = Math.max(multiplier, 1 + event.currentBoost * 0.8);
      return;
    }
    const hostCity = getCity(event.cityId);
    const city = getCity(cityId);
    if (hostCity && city && hostCity.region === city.region) {
      multiplier = Math.max(multiplier, 1 + event.currentBoost * MEGA_EVENT_SPILLOVER * SUB_MEGA_SPILLOVER_MULT);
    }
  });
  return multiplier;
}

function aiCompetitionMultiplier(state, cityId, type) {
  let count = 0;
  (state.ai || []).forEach((ai) => {
    if ((ai.subsidiaries?.[cityId] || []).some((sub) => sub.type === type)) count++;
  });
  return 1 / (1 + count * SUB_AI_DILUTE_RATE);
}

function canAiUseSubType(state, type, cityId) {
  const cfg = SUB_TYPES[type];
  const city = getCity(cityId);
  if (!cfg || !city || type === 'airport') return false;
  const market = getCityMarketState(state, cityId);
  return city.level >= cfg.minLevel && market.tour >= cfg.minTour && market.biz >= cfg.minBiz;
}

function planeResidualValue(plane) {
  return (Number(plane.buyPrice) || 0) * Math.max(0.15, 1 - (Number(plane.age) || 0) * FORCE_PLANE_SELL_AGE_FACTOR);
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < String(str).length; i += 1) {
    hash = ((hash << 5) - hash) + String(str).charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalizeSource(source, type) {
  if (source === 'open' || source === 'acquire' || source === 'invest') return source;
  return type === 'airport' ? 'invest' : 'open';
}

function positiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function finiteNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}
