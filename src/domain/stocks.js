import { STOCKS, STOCK_MAP, STOCK_SECTORS } from '../data/stocks.js';
import { clamp, rand } from './helpers.js';

export { STOCKS, STOCK_MAP, STOCK_SECTORS };

export const STOCK_MAX_CHANGE = 0.20;
export const STOCK_MEAN_REVERT_THRESHOLD = 0.30;
export const STOCK_MEAN_REVERT_RATE = 0.05;
export const STOCK_NOISE_RANGE = 0.05;
export const STOCK_MARKET_SENTIMENT = 0.02;
export const STOCK_NEWS_IMPACT_SCALE = 0.5;
export const STOCK_RANDOM_CRASH_CHANCE = 0.15;
export const STOCK_RANDOM_CRASH_MIN = 0.03;
export const STOCK_RANDOM_CRASH_MAX = 0.08;
export const STOCK_OVERVAL_THRESHOLD = 0.50;
export const STOCK_OVERVAL_PENALTY_RATE = 0.10;
export const STOCK_TRADE_FEE = 0.01;
export const STOCK_MIN_TRADE = 1;
export const STOCK_MAX_HOLDING = 100;
export const STOCK_SECTOR_SHOCK_OIL = 0.08;
export const STOCK_SECTOR_SHOCK_DISASTER = 0.12;

const SECTOR_IDS = Object.keys(STOCK_SECTORS);

export function eraNumber(eraId) {
  const match = String(eraId || '').match(/\d+/);
  const value = match ? Number(match[0]) : 1;
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function getActiveStocks(stateOrEra) {
  const era = typeof stateOrEra === 'string' ? stateOrEra : stateOrEra?.era;
  const eraNum = eraNumber(era);
  return STOCKS.filter((stock) => stock.eraStart[eraNum] !== null && stock.eraStart[eraNum] !== undefined);
}

export function initStockState(eraId, { includeStarterHolding = true } = {}) {
  const stocks = {};
  const portfolio = {};
  const eraNum = eraNumber(eraId);

  getActiveStocks(eraId).forEach((stock) => {
    const startPrice = stock.eraStart[eraNum];
    stocks[stock.id] = {
      price: startPrice,
      prevPrice: startPrice,
      history: [startPrice],
    };
  });

  if (includeStarterHolding && stocks.wuer_media) {
    portfolio.wuer_media = { shares: 1, avgCost: stocks.wuer_media.price };
  }

  return { stocks, portfolio, stockEvents: [] };
}

export function normalizeStockState(state) {
  const fresh = initStockState(state.era, { includeStarterHolding: false });
  const activeIds = new Set(Object.keys(fresh.stocks));
  const nextStocks = {};
  const sourceStocks = isPlainObject(state.stocks) ? state.stocks : {};

  Object.entries(fresh.stocks).forEach(([stockId, fallback]) => {
    const source = isPlainObject(sourceStocks[stockId]) ? sourceStocks[stockId] : {};
    const price = positiveNumber(source.price) ? Number(source.price) : fallback.price;
    const prevPrice = positiveNumber(source.prevPrice) ? Number(source.prevPrice) : price;
    const history = Array.isArray(source.history)
      ? source.history.map(Number).filter((value) => Number.isFinite(value) && value > 0).slice(-8)
      : [];
    nextStocks[stockId] = {
      price,
      prevPrice,
      history: history.length > 0 ? history : [price],
    };
  });

  const nextPortfolio = {};
  const sourcePortfolio = isPlainObject(state.portfolio) ? state.portfolio : {};
  Object.entries(sourcePortfolio).forEach(([stockId, holding]) => {
    if (!activeIds.has(stockId) || !isPlainObject(holding)) return;
    const shares = Math.min(STOCK_MAX_HOLDING, Math.max(0, Math.round(Number(holding.shares) || 0)));
    if (shares < STOCK_MIN_TRADE) return;
    const avgCost = positiveNumber(holding.avgCost) ? Number(holding.avgCost) : nextStocks[stockId].price;
    nextPortfolio[stockId] = { shares, avgCost };
  });

  state.stocks = nextStocks;
  state.portfolio = nextPortfolio;
  if (!Array.isArray(state.stockEvents)) state.stockEvents = [];
  else state.stockEvents = state.stockEvents
    .filter((event) => event && SECTOR_IDS.includes(event.sector) && Number.isFinite(Number(event.impact)))
    .map((event) => ({ sector: event.sector, impact: Number(event.impact) }));
  if (!Number.isFinite(Number(state._lastStockDividend))) state._lastStockDividend = 0;
  else state._lastStockDividend = Number(state._lastStockDividend);
}

export function updateStockPrices(state) {
  normalizeStockState(state);
  const sectorShock = Object.fromEntries(SECTOR_IDS.map((sector) => [sector, 0]));

  if (state.prevOilPrice > 0) {
    const oilChangeRatio = (state.oilPrice - state.prevOilPrice) / state.prevOilPrice;
    if (Math.abs(oilChangeRatio) > 0.03) {
      sectorShock.energy += oilChangeRatio * STOCK_SECTOR_SHOCK_OIL;
      sectorShock.tourism -= oilChangeRatio * STOCK_SECTOR_SHOCK_OIL * 0.5;
    }
  }

  (state.newsItems || []).forEach((item) => {
    if (!isPlainObject(item.stockEffect)) return;
    Object.entries(item.stockEffect).forEach(([sector, impact]) => {
      if (!Object.prototype.hasOwnProperty.call(sectorShock, sector)) return;
      const value = Number(impact);
      if (Number.isFinite(value)) sectorShock[sector] += value * STOCK_NEWS_IMPACT_SCALE;
    });
  });

  (state.activeModifiers || []).forEach((modifier) => {
    if (modifier.type !== 'suspension') return;
    sectorShock.tourism -= STOCK_SECTOR_SHOCK_DISASTER * 0.5;
    sectorShock.culture -= STOCK_SECTOR_SHOCK_DISASTER * 0.2;
  });

  if (state.quarter === 3) {
    sectorShock.tourism += 0.03;
    sectorShock.culture += 0.02;
  }

  if (Math.random() < STOCK_RANDOM_CRASH_CHANCE) {
    const crashSector = SECTOR_IDS[Math.floor(Math.random() * SECTOR_IDS.length)];
    sectorShock[crashSector] -= rand(STOCK_RANDOM_CRASH_MIN, STOCK_RANDOM_CRASH_MAX);
  }

  const marketSentiment = rand(-STOCK_MARKET_SENTIMENT, STOCK_MARKET_SENTIMENT);
  const eraNum = eraNumber(state.era);

  getActiveStocks(state).forEach((stock) => {
    const stockState = state.stocks[stock.id];
    if (!stockState) return;
    stockState.prevPrice = stockState.price;

    const noise = rand(-STOCK_NOISE_RANGE, STOCK_NOISE_RANGE) * stock.beta;
    const revertTarget = stock.eraStart[eraNum] || stock.basePrice;
    const deviation = (stockState.price - revertTarget) / revertTarget;
    const meanRevert = Math.abs(deviation) > STOCK_MEAN_REVERT_THRESHOLD
      ? -Math.sign(deviation) * STOCK_MEAN_REVERT_RATE
      : 0;
    const overvalPenalty = deviation > STOCK_OVERVAL_THRESHOLD
      ? -(deviation - STOCK_OVERVAL_THRESHOLD) * STOCK_OVERVAL_PENALTY_RATE
      : 0;

    const totalChange = marketSentiment * stock.beta
      + (sectorShock[stock.sector] || 0)
      + noise
      + meanRevert
      + overvalPenalty;
    const clampedChange = clamp(totalChange, -STOCK_MAX_CHANGE, STOCK_MAX_CHANGE);
    stockState.price = Math.round(Math.max(1, stockState.price * (1 + clampedChange)) * 100) / 100;
    stockState.history.push(stockState.price);
    if (stockState.history.length > 8) stockState.history.shift();
  });

  state.stockEvents = Object.entries(sectorShock)
    .filter(([, impact]) => Math.abs(impact) > 0.02)
    .map(([sector, impact]) => ({ sector, impact }));

  return sectorShock;
}

export function buyStock(state, stockId, shares) {
  normalizeStockState(state);
  const amount = Math.round(Number(shares));
  if (amount < STOCK_MIN_TRADE) return { ok: false, message: '最小交易1M' };

  const stockDef = STOCK_MAP[stockId];
  if (!stockDef) return { ok: false, message: '股票不存在' };

  const stockState = state.stocks[stockId];
  if (!stockState) return { ok: false, message: '该时代此股票不可交易' };

  const currentHolding = state.portfolio[stockId]?.shares || 0;
  if (currentHolding + amount > STOCK_MAX_HOLDING) {
    return { ok: false, message: `持仓不能超过${STOCK_MAX_HOLDING}M` };
  }

  const cost = stockState.price * amount;
  const fee = cost * STOCK_TRADE_FEE;
  const totalCost = cost + fee;
  if (state.cash < totalCost) return { ok: false, message: '资金不足' };

  state.cash -= totalCost;
  if (!state.portfolio[stockId]) state.portfolio[stockId] = { shares: 0, avgCost: 0 };
  const holding = state.portfolio[stockId];
  const totalShares = holding.shares + amount;
  holding.avgCost = (holding.shares * holding.avgCost + amount * stockState.price) / totalShares;
  holding.shares = totalShares;

  return { ok: true, stock: stockDef, cost, fee, totalCost, shares: holding.shares };
}

export function sellStock(state, stockId, shares) {
  normalizeStockState(state);
  const amount = Math.round(Number(shares));
  if (amount < STOCK_MIN_TRADE) return { ok: false, message: '最小交易1M' };

  const stockDef = STOCK_MAP[stockId];
  if (!stockDef) return { ok: false, message: '股票不存在' };

  const stockState = state.stocks[stockId];
  if (!stockState) return { ok: false, message: '该时代此股票不可交易' };

  const holding = state.portfolio[stockId];
  if (!holding || holding.shares < amount) return { ok: false, message: '持仓不足' };

  const revenue = stockState.price * amount;
  const fee = revenue * STOCK_TRADE_FEE;
  const netRevenue = revenue - fee;
  state.cash += netRevenue;
  holding.shares -= amount;
  if (holding.shares <= 0) delete state.portfolio[stockId];

  return { ok: true, stock: stockDef, revenue, fee, netRevenue, shares: state.portfolio[stockId]?.shares || 0 };
}

export function calcStockDividend(state) {
  if (state.quarter !== 4) return 0;
  normalizeStockState(state);
  const dividend = Object.entries(state.portfolio).reduce((sum, [stockId, holding]) => {
    const stockState = state.stocks[stockId];
    const stockDef = STOCK_MAP[stockId];
    if (!stockState || !stockDef) return sum;
    return sum + holding.shares * stockState.price * stockDef.dividendYield;
  }, 0);
  return Math.round(dividend * 10) / 10;
}

export function calcNasdouIndex(state) {
  if (!state?.stocks) return 0;
  const changes = Object.values(state.stocks)
    .filter((stockState) => stockState?.prevPrice > 0)
    .map((stockState) => (stockState.price - stockState.prevPrice) / stockState.prevPrice);
  if (changes.length === 0) return 0;
  return changes.reduce((sum, value) => sum + value, 0) / changes.length;
}

export function calcPortfolioValue(state) {
  normalizeStockState(state);
  return Object.entries(state.portfolio).reduce((totals, [stockId, holding]) => {
    const stockState = state.stocks[stockId];
    if (!stockState) return totals;
    totals.marketValue += holding.shares * stockState.price;
    totals.totalCost += holding.shares * holding.avgCost;
    totals.floatingPnL = totals.marketValue - totals.totalCost;
    return totals;
  }, { marketValue: 0, totalCost: 0, floatingPnL: 0 });
}

export function getPortfolioCount(state) {
  return Object.values(state?.portfolio || {}).filter((holding) => holding.shares > 0).length;
}

function positiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}
