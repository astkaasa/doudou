import { NEWS_POOL } from '../data/news.js';
import { PLANES } from '../data/planes.js';
import { clamp, fmtPct, getCity, rand, randInt } from './helpers.js';
import { megaEventNewsFor, syncMegaEventState } from './megaEvents.js';
import { addCostModifier, addDemandModifier, addDisasterDemandModifier, addSuspensionModifier, advanceActiveModifiers, selectRouteKeys } from './modifiers.js';
import { updateStockPrices } from './stocks.js';

export function generateEvents(state) {
  state.events = [];
  state.newsItems = [];
  state.prevOilPrice = state.oilPrice;
  const oilChange = rand(-0.06, 0.06);
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
  const numNews = randInt(2, 4);
  const categories = Object.keys(NEWS_POOL);
  const picked = new Set();
  for (let i = 0; i < numNews; i++) {
    let cat;
    let news;
    let tries = 0;
    let rejected = false;
    do {
      cat = categories[randInt(0, categories.length - 1)];
      news = NEWS_POOL[cat][randInt(0, NEWS_POOL[cat].length - 1)];
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
        addDemandModifier,
        addDisasterDemandModifier,
        addSuspensionModifier,
        selectRouteKeys,
      });
    } catch {
      // News effects should not break turn progression.
    }
    state.events.push({ type: cat, text: news.title, severity: cat === 'disaster' ? 'high' : cat === 'economy' ? 'medium' : 'low' });
  }
  const newService = PLANES.filter((plane) => plane.serviceStart === state.year);
  const retiring = PLANES.filter((plane) => plane.serviceEnd === state.year);
  if (newService.length > 0) {
    state.newsItems.push({
      category: 'aviation',
      title: '新一代客机投入商业运营',
      desc: `${newService.map((plane) => plane.name).join('、')}正式投入商业服务，多家航空公司已下达订单。`,
      effect: '',
      stockEffect: { tech: 0.04, finance: 0.02 },
    });
  } else if (retiring.length > 0) {
    state.newsItems.push({
      category: 'aviation',
      title: '经典机型正式退役',
      desc: `${retiring.map((plane) => plane.name).join('、')}结束商业飞行生涯，正式退出航线运营。`,
      effect: '',
      stockEffect: { tourism: -0.01 },
    });
  }
  updateStockPrices(state);
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
    return hostCity && news.subRegion && hostCity.subRegion === news.subRegion;
  });
}
