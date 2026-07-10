import { NEWS_POOL } from '../data/news.js';
import { PLANES } from '../data/planes.js';
import { clamp, fmtPct, getCity } from './helpers.js';
import { megaEventNewsFor, syncMegaEventState } from './megaEvents.js';
import { addAirportDisruptionModifier, addCostModifier, addDemandModifier, addDisasterDemandModifier, addSuspensionModifier, advanceActiveModifiers, selectRouteKeys } from './modifiers.js';
import { nextRandom, randomBetween, randomInt } from './random.js';
import { updateStockPrices } from './stocks.js';

export function generateEvents(state) {
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
  const numNews = randomInt(state, 2, 4);
  const newsPool = eligibleNewsPool(state.year, state.quarter);
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
    const item = { category: cat, title: news.title, desc: news.desc, effect: news.effect, stockEffect: news.stockEffect || null };
    state.newsItems.push(item);
    try {
      news.effectFn?.({
        state,
        getCity,
        clamp,
        addCostModifier,
        addAirportDisruptionModifier,
        addDemandModifier,
        addDisasterDemandModifier,
        addSuspensionModifier,
        selectRouteKeys,
        random: () => nextRandom(state),
      });
    } catch {
      // News effects should not break turn progression.
    }
    state.events.push({ type: cat, text: news.title, severity: cat === 'disaster' ? 'high' : cat === 'economy' ? 'medium' : 'low' });
  }
  const enteringMarket = PLANES.filter((plane) => plane.serviceStart === state.year);
  const leavingMarket = PLANES.filter((plane) => plane.serviceEnd === state.year);
  if (enteringMarket.length > 0) {
    const fictional = enteringMarket.filter((plane) => plane.fictional);
    const historical = enteringMarket.filter((plane) => !plane.fictional);
    const descriptions = [];
    if (historical.length > 0) descriptions.push(`${historical.map((plane) => plane.name).join('、')}加入采购目录`);
    if (fictional.length > 0) descriptions.push(`${fictional.map((plane) => plane.name).join('、')}作为架空科技线机型开放采购`);
    state.newsItems.push({
      category: 'aviation',
      title: fictional.length === enteringMarket.length ? '架空机型进入采购市场' : '新机型进入采购市场',
      desc: `${descriptions.join('；')}。`,
      effect: '',
      stockEffect: { tech: 0.04, finance: 0.02 },
    });
  } else if (leavingMarket.length > 0) {
    state.newsItems.push({
      category: 'aviation',
      title: '部分机型停止接受新订单',
      desc: `${leavingMarket.map((plane) => plane.name).join('、')}退出新机采购目录，现有机队仍可继续运营。`,
      effect: '',
      stockEffect: { tourism: -0.01 },
    });
  }
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
