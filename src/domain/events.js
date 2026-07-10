import { NEWS_POOL } from '../data/news.js';
import { aircraftMarketNewsForPeriod } from './aircraftNews.js';
import { airportDisplayCode, getAirport } from './airports.js';
import { clamp, fmtPct, getCity } from './helpers.js';
import { megaEventNewsFor, syncMegaEventState } from './megaEvents.js';
import { addAirportDisruptionModifier, addCostModifier, addDemandModifier, addDisasterDemandModifier, addSuspensionModifier, advanceActiveModifiers, selectRouteKeys } from './modifiers.js';
import { nextRandom, randomBetween, randomInt } from './random.js';
import { updateStockPrices } from './stocks.js';

export function generateEvents(state) {
  const previousRandomNewsTitles = new Set((state.newsItems || [])
    .map((item) => item?._randomNewsSourceTitle)
    .filter(Boolean));
  state.events = [];
  state.newsItems = [];
  state.prevOilPrice = state.oilPrice;
  const oilChange = randomBetween(state, -0.06, 0.06);
  state.oilPrice = clamp(state.oilPrice * (1 + oilChange), 20, 180);
  if (Math.abs(oilChange) > 0.03) {
    state.events.push({
      type: 'oil',
      text: '油价' + (oilChange > 0 ? '上涨' : '下跌') + ' ' + fmtPct(oilChange * 100),
      severity: Math.abs(oilChange) > 0.05 ? 'high' : 'low',
    });
  }
  const activeMegaEvents = syncMegaEventState(state);
  activeMegaEvents
    .map(megaEventNewsFor)
    .filter(Boolean)
    .forEach((item) => {
      state.newsItems.push(item);
      state.events.push({ type: 'mega_event', text: item.title, severity: item._isHeadline ? 'high' : 'medium' });
    });
  const scheduledPool = eligibleNewsPoolForState(state, { mode: 'scheduled' });
  Object.entries(scheduledPool).forEach(([category, items]) => {
    items.forEach((news) => appendNewsItem(state, category, news, 'scheduled'));
  });
  const numNews = randomInt(state, 2, 4);
  const newsPool = eligibleNewsPoolForState(state, {
    mode: 'random',
    excludeTitles: previousRandomNewsTitles,
  });
  const categories = Object.keys(newsPool);
  const picked = new Set();
  for (let i = 0; i < numNews; i++) {
    if (categories.length === 0) break;
    let cat;
    let news;
    let tries = 0;
    let rejected = false;
    do {
      cat = categories[randomInt(state, 0, categories.length - 1)];
      news = newsPool[cat][randomInt(state, 0, newsPool[cat].length - 1)];
      tries++;
      rejected = picked.has(news.title) || isDisasterProtectedByMegaEvent(state, cat, news);
    } while (rejected && tries < 20);
    if (picked.has(news.title) || isDisasterProtectedByMegaEvent(state, cat, news)) continue;
    picked.add(news.title);
    appendNewsItem(state, cat, news, 'random');
  }
  aircraftMarketNewsForPeriod(state.year, state.quarter).forEach((item) => {
    state.newsItems.push(item);
    state.events.push({ type: 'aviation', text: item.title, severity: 'low' });
  });
  updateStockPrices(state);
}

export function isNewsAvailableInPeriod(news, year, quarter) {
  if (!Number.isInteger(year)) return false;
  if (Number.isInteger(news.startYear) && year < news.startYear) return false;
  if (Number.isInteger(news.endYear) && year > news.endYear) return false;
  if (Array.isArray(news.years) && !news.years.includes(year)) return false;
  if (Array.isArray(news.quarters) && !news.quarters.includes(quarter)) return false;
  return true;
}

export function eligibleNewsPool(year, quarter) {
  return Object.fromEntries(Object.entries(NEWS_POOL)
    .map(([category, items]) => [category, items.filter((item) => isNewsAvailableInPeriod(item, year, quarter))])
    .filter(([, items]) => items.length > 0));
}

export function isNewsApplicableToState(news, state) {
  if (!isNewsAvailableInPeriod(news, state?.year, state?.quarter)) return false;
  const routes = Array.isArray(state?.routes) ? state.routes : [];
  if (news.requiresRoutes && !routes.some((route) => !route.suspended)) return false;
  if (news.requiresAirportRoutes
    && !routes.some((route) => !route.suspended && route.fromAirportId && route.toAirportId)) return false;
  return true;
}

export function eligibleNewsPoolForState(state, options = {}) {
  const mode = options.mode || 'all';
  const excluded = options.excludeTitles instanceof Set
    ? options.excludeTitles
    : new Set(options.excludeTitles || []);
  return Object.fromEntries(Object.entries(NEWS_POOL)
    .map(([category, items]) => [category, items.filter((item) => {
      if (!isNewsApplicableToState(item, state) || excluded.has(item.title)) return false;
      if (mode === 'scheduled') return item.scheduled === true;
      if (mode === 'random') return item.scheduled !== true;
      return true;
    })])
    .filter(([, items]) => items.length > 0));
}

export function advanceTemporaryModifiers(state) {
  advanceActiveModifiers(state);
}

export function advanceTemporaryRouteEffects(state) {
  advanceTemporaryModifiers(state);
}

function isDisasterProtectedByMegaEvent(state, category, news) {
  if (category !== 'disaster') return false;
  const peakEvents = (state.activeMegaEvents || []).filter((event) => event.quartersFromEvent === 0);
  if (peakEvents.length === 0) return false;
  return peakEvents.some((event) => {
    const hostCity = getCity(event.cityId);
    return hostCity && news.eventZone
      && (hostCity.eventZones || [hostCity.subRegion]).includes(news.eventZone);
  });
}

function appendNewsItem(state, category, news, source) {
  const item = {
    category,
    title: news.title,
    desc: news.desc,
    effect: news.effect,
    stockEffect: news.stockEffect || null,
  };
  try {
    const presentation = news.effectFn?.({
      state,
      getCity,
      getAirport,
      airportDisplayCode,
      clamp,
      addCostModifier,
      addAirportDisruptionModifier,
      addDemandModifier,
      addDisasterDemandModifier,
      addSuspensionModifier,
      selectRouteKeys,
      random: () => nextRandom(state),
    });
    if (presentation && typeof presentation === 'object') {
      ['title', 'desc', 'effect'].forEach((field) => {
        if (typeof presentation[field] === 'string' && presentation[field].trim()) item[field] = presentation[field];
      });
    }
  } catch {
    // News effects should not break turn progression.
  }
  if (source === 'random') item._randomNewsSourceTitle = news.title;
  if (source === 'scheduled') item._scheduledNewsSourceTitle = news.title;
  state.newsItems.push(item);
  state.events.push({ type: category, text: item.title, severity: newsSeverity(category) });
}

function newsSeverity(category) {
  if (category === 'disaster') return 'high';
  if (category === 'economy' || category === 'health') return 'medium';
  return 'low';
}
