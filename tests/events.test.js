import { describe, expect, it } from 'vitest';

import { MEGA_EVENTS } from '../src/data/megaEvents.js';
import { NEWS_POOL } from '../src/data/news.js';
import { PLANES } from '../src/data/planes.js';
import { WORLD_CUP_EVENTS } from '../src/data/worldCups.js';
import { aircraftMarketNewsForPeriod } from '../src/domain/aircraftNews.js';
import { airportDisplayCode, getAirport } from '../src/domain/airports.js';
import { advanceTemporaryModifiers, eligibleNewsPool, eligibleNewsPoolForState, generateEvents, isNewsAvailableInPeriod } from '../src/domain/events.js';
import { clamp, getCity } from '../src/domain/helpers.js';
import { megaEventBoostCurve, megaEventNewsFor, syncMegaEventState } from '../src/domain/megaEvents.js';
import { addCostModifier, addDemandModifier, addDisasterDemandModifier, addSuspensionModifier, routeCostMultiplier, routeDemandMultiplier, selectRouteKeys } from '../src/domain/modifiers.js';
import { openRoute, updateRouteMetrics } from '../src/domain/routes.js';
import { initState } from '../src/domain/state.js';

function stateWithRoute(from, to) {
  const state = initState('beijing', 'era3');
  state.fleet.push({ ...PLANES[0], uid: 1, age: 0, isLease: false, leasePrice: 0, delivering: false, deliverIn: 0 });
  openRoute(state, from, to, 1, 120);
  return state;
}

describe('news event effects', () => {
  it('filters random news by historical availability', () => {
    const findNews = (title) => Object.values(NEWS_POOL).flat().find((item) => item.title === title);
    const euCarbon = findNews('欧盟通过新的航空碳排放法规');
    const firstSupersonicWave = findNews('超音速客机试飞引发全球关注');
    const saf = findNews('可持续航空燃料进入商业试用');
    const vaccineRecovery = findNews('全球疫苗接种率创新高，出行信心恢复');
    const palmBeachRename = findNews('棕榈滩机场启用特朗普国际机场新名');
    const alliance = findNews('航空联盟扩大跨洲联程合作');

    expect(isNewsAvailableInPeriod(euCarbon, 2007, 1)).toBe(false);
    expect(isNewsAvailableInPeriod(euCarbon, 2008, 1)).toBe(true);
    expect(isNewsAvailableInPeriod(firstSupersonicWave, 1968, 1)).toBe(true);
    expect(isNewsAvailableInPeriod(firstSupersonicWave, 1976, 1)).toBe(false);
    expect(isNewsAvailableInPeriod(saf, 2010, 1)).toBe(false);
    expect(isNewsAvailableInPeriod(saf, 2011, 1)).toBe(true);
    expect(isNewsAvailableInPeriod(vaccineRecovery, 2020, 1)).toBe(false);
    expect(isNewsAvailableInPeriod(vaccineRecovery, 2021, 1)).toBe(true);
    expect(isNewsAvailableInPeriod(palmBeachRename, 2026, 2)).toBe(false);
    expect(isNewsAvailableInPeriod(palmBeachRename, 2026, 3)).toBe(true);
    expect(isNewsAvailableInPeriod(palmBeachRename, 2027, 3)).toBe(false);
    expect(isNewsAvailableInPeriod(alliance, 1996, 1)).toBe(false);
    expect(isNewsAvailableInPeriod(alliance, 1997, 1)).toBe(true);

    const titlesIn1960 = Object.values(eligibleNewsPool(1960, 1)).flat().map((item) => item.title);
    expect(titlesIn1960).toContain('新一代航空电子设备投入使用');
    expect(titlesIn1960).toContain('喷气客运网络进入扩张期');
    expect(titlesIn1960).not.toEqual(expect.arrayContaining([
      '欧盟通过新的航空碳排放法规',
      '国际电子竞技总决赛吸引全球观众',
      '可持续航空燃料进入商业试用',
      '某国爆发不明肺炎，航空管制升级',
    ]));
  });

  it('only generates era-eligible random news for an early campaign', () => {
    const sourceByTitle = new Map(Object.values(NEWS_POOL).flat().map((item) => [item.title, item]));
    let checked = 0;

    for (let seed = 0; seed < 64; seed++) {
      const state = initState('beijing', 'era4', { seed: `historical-news-${seed}` });
      state.year = 1960;
      state.quarter = 1;
      generateEvents(state);

      state.newsItems.forEach((item) => {
        const source = sourceByTitle.get(item._randomNewsSourceTitle);
        if (!source) return;
        checked++;
        expect(isNewsAvailableInPeriod(source, state.year, state.quarter)).toBe(true);
      });
    }

    expect(checked).toBeGreaterThan(100);
  });

  it('describes plane availability as a market window and labels fictional aircraft', () => {
    const news = aircraftMarketNewsForPeriod(2008, 1);
    const entry = news.find((item) => item._aircraftMarket === 'entry');
    const exit = news.find((item) => item._aircraftMarket === 'exit');

    expect(entry).toMatchObject({ title: '架空科技线更新采购目录' });
    expect(entry.desc).toContain('B2001SST作为架空科技线方案开放采购');
    expect(entry.desc).toContain('2200 米跑道和 3 级基础设施');
    expect(exit.desc).toContain('A300-600、A310退出新机采购目录');
    expect(exit.desc).toContain('现有机队仍可继续运营和转售');
    expect(aircraftMarketNewsForPeriod(2008, 2)).toEqual([]);
    expect(aircraftMarketNewsForPeriod(2007, 1)
      .find((item) => item._aircraftMarket === 'exit')?.desc || '').not.toContain('A300-600');
  });

  it('filters route-dependent news, guarantees scheduled news, and avoids consecutive repeats', () => {
    const noRouteState = initState('beijing', 'era3', { seed: 'news-applicability' });
    noRouteState.year = 2000;
    noRouteState.quarter = 1;
    const withoutRoutes = Object.values(eligibleNewsPoolForState(noRouteState, { mode: 'random' })).flat().map((item) => item.title);
    expect(withoutRoutes).not.toEqual(expect.arrayContaining([
      '枢纽机场遭遇极端天气中断',
      '枢纽机场启动临时跑道检修',
      '新型流感变种引发区域性恐慌',
    ]));

    const scheduledState = initState('beijing', 'era3', { seed: 'scheduled-news' });
    scheduledState.year = 2026;
    scheduledState.quarter = 3;
    generateEvents(scheduledState);
    expect(scheduledState.newsItems.some((item) => item.title === '棕榈滩机场启用特朗普国际机场新名')).toBe(true);

    const repeatedState = initState('beijing', 'era4', { seed: 'news-repeat-control' });
    repeatedState.year = 1980;
    repeatedState.quarter = 1;
    generateEvents(repeatedState);
    const firstTitles = new Set(repeatedState.newsItems.map((item) => item._randomNewsSourceTitle).filter(Boolean));
    repeatedState.quarter = 2;
    generateEvents(repeatedState);
    const secondTitles = new Set(repeatedState.newsItems.map((item) => item._randomNewsSourceTitle).filter(Boolean));
    expect(firstTitles.size).toBeGreaterThan(0);
    expect(secondTitles.size).toBeGreaterThan(0);
    expect([...secondTitles].filter((title) => firstTitles.has(title))).toEqual([]);

    const fluState = stateWithRoute('beijing', 'shanghai');
    const flu = NEWS_POOL.health.find((item) => item.title === '新型流感变种引发区域性恐慌');
    flu.effectFn({ state: fluState, addDemandModifier, selectRouteKeys, random: () => 0.99 });
    expect(routeDemandMultiplier(fluState, fluState.routes[0])).toBe(0.8);
  });

  it('adds soft disaster demand modifiers for matching event-zone routes', () => {
    const eastAsiaTyphoon = NEWS_POOL.disaster.find((item) => item.title.includes('台风席卷东亚'));
    const outbound = stateWithRoute('beijing', 'tokyo');
    const inbound = stateWithRoute('tokyo', 'beijing');

    eastAsiaTyphoon.effectFn({ state: outbound, getCity, clamp, addDisasterDemandModifier, selectRouteKeys });
    eastAsiaTyphoon.effectFn({ state: inbound, getCity, clamp, addDisasterDemandModifier, selectRouteKeys });

    expect(outbound.activeModifiers[0]).toMatchObject({
      type: 'demand',
      mode: 'disasterDemand',
      turnsRemaining: 1,
      scope: { kind: 'eventZone', eventZones: ['east_asia'] },
    });
    expect(inbound.activeModifiers[0]).toMatchObject({
      type: 'demand',
      mode: 'disasterDemand',
      turnsRemaining: 1,
      scope: { kind: 'eventZone', eventZones: ['east_asia'] },
    });
    expect(routeDemandMultiplier(outbound, outbound.routes[0])).toBeCloseTo(0.1);
  });

  it('applies suspension for one calculated turn and then restores service', () => {
    const state = stateWithRoute('beijing', 'tokyo');
    addSuspensionModifier(state, 'test suspension', { kind: 'cityIds', cityIds: ['tokyo'] }, 1);

    updateRouteMetrics(state);
    expect(state.routes[0].loadFactor).toBe(0);
    expect(state.routes[0].revenue).toBe(0);
    expect(state.routes[0].cost).toBe(0);

    advanceTemporaryModifiers(state);
    updateRouteMetrics(state);
    expect(state.activeModifiers).toHaveLength(0);
    expect(state.routes[0].revenue).toBeGreaterThan(0);
    expect(state.routes[0].cost).toBeGreaterThan(0);
  });

  it('uses demand modifiers instead of silently changing ticket prices for demand news', () => {
    const recession = NEWS_POOL.economy.find((item) => item.title.includes('全球股市暴跌'));
    const state = stateWithRoute('beijing', 'shanghai');
    const originalPrice = state.routes[0].price;

    recession.effectFn({ state, getCity, clamp, addDemandModifier, selectRouteKeys });

    expect(state.routes[0].price).toBe(originalPrice);
    expect(state.activeModifiers[0]).toMatchObject({
      type: 'demand',
      multiplier: 0.85,
      turnsRemaining: 1,
      scope: { kind: 'all' },
    });
  });

  it('keeps stock effects as news metadata separate from route modifiers', () => {
    const recession = NEWS_POOL.economy.find((item) => item.title.includes('全球股市暴跌'));

    expect(recession.stockEffect).toEqual({ finance: -0.08, tech: -0.05, tourism: -0.04 });
  });

  it('targets airport maintenance events by stable airport id', () => {
    const maintenance = NEWS_POOL.economy.find((item) => item.title.includes('枢纽机场启动临时跑道检修'));
    const state = stateWithRoute('beijing', 'shanghai');
    const route = state.routes[0];

    const presentation = maintenance.effectFn({ state, addCostModifier, random: () => 0, getAirport, airportDisplayCode });

    expect(state.activeModifiers[0]).toMatchObject({
      type: 'cost',
      multiplier: 1.12,
      scope: { kind: 'airportIds', airportIds: [route.fromAirportId] },
    });
    expect(routeCostMultiplier(state, route)).toBeCloseTo(1.12);
    expect(routeCostMultiplier(state, {
      ...route,
      fromAirportId: 'virtual-london',
      toAirportId: 'virtual-newyork',
    })).toBe(1);
    expect(presentation.title).toContain(airportDisplayCode(route.fromAirportId));
  });

  it('builds active mega events and news metadata for the current quarter', () => {
    const state = initState('beijing', 'era3');
    state.year = 2000;
    state.quarter = 3;

    const activeEvents = syncMegaEventState(state);
    const sydney = activeEvents.find((event) => event.id === 'oly_s2000');
    const hannover = activeEvents.find((event) => event.id === 'expo_2000');

    expect(sydney).toMatchObject({ cityId: 'sydney', quartersFromEvent: 0, currentBoost: 0.4 });
    expect(hannover).toMatchObject({ cityId: 'hannover', quartersFromEvent: 1, currentBoost: 0.18 });
    expect(state.activeModifiers.filter((modifier) => modifier.mode === 'megaEvent')).toHaveLength(2);
    expect(megaEventNewsFor(sydney)).toMatchObject({
      category: 'mega_event',
      _megaEventId: 'oly_s2000',
      _isHeadline: true,
      desc: sydney.desc,
      stockEffect: { tourism: 0.1, culture: 0.08 },
    });
    expect(megaEventNewsFor(hannover).title).toBe('汉诺威世博会持续开放');
  });

  it('uses preparation wording instead of falsely announcing a host one year before opening', () => {
    const state = initState('beijing', 'era1');
    state.year = 1959;
    state.quarter = 3;
    const activeEvents = syncMegaEventState(state);
    const rome = activeEvents.find((event) => event.id === 'oly_s1960');
    const item = megaEventNewsFor(rome);

    expect(item.title).toBe('罗马奥运会进入开幕前一年倒计时');
    expect(item.desc).not.toContain('获得举办权');
  });

  it('keeps dated mega events in their historical opening quarters', () => {
    const byId = new Map(MEGA_EVENTS.map((event) => [event.id, event]));

    expect(byId.get('oly_s1964')).toMatchObject({ year: 1964, quarter: 4, cityId: 'tokyo' });
    expect(byId.get('oly_s1968')).toMatchObject({ year: 1968, quarter: 4, cityId: 'mexicocity' });
    expect(byId.get('expo_1970')).toMatchObject({ year: 1970, quarter: 1, cityId: 'osaka' });
    expect(byId.get('oly_s1996').desc).not.toContain('回归故土');
  });

  it('maps World Cup finals to dated playable air gateways', () => {
    const byId = new Map(WORLD_CUP_EVENTS.map((event) => [event.id, event]));
    expect(WORLD_CUP_EVENTS).toHaveLength(15);
    expect(byId.get('wc_1962')).toMatchObject({ year: 1962, quarter: 2, cityId: 'santiago' });
    expect(byId.get('wc_1966')).toMatchObject({ year: 1966, quarter: 3, cityId: 'london' });
    expect(byId.get('wc_2002')).toMatchObject({ year: 2002, quarter: 2, cityId: 'tokyo' });
    expect(byId.get('wc_2002').desc).toContain('决赛在横滨举行');

    const state = initState('johannesburg', 'era3');
    state.year = 2010;
    state.quarter = 3;
    const activeEvents = syncMegaEventState(state);
    const worldCup = activeEvents.find((event) => event.id === 'wc_2010');
    expect(worldCup).toMatchObject({ cityId: 'johannesburg', quartersFromEvent: 0, currentBoost: 0.2 });
    expect(megaEventNewsFor(worldCup)).toMatchObject({
      title: '2010年国际足联世界杯迎来巅峰对决！',
      _megaEventType: 'world_cup',
      _isHeadline: true,
    });
    expect(state.activeModifiers.find((modifier) => modifier.megaEvent?.id === 'wc_2010')).toMatchObject({
      megaEvent: { hostCityId: 'johannesburg' },
    });
    expect(megaEventBoostCurve(-4, 'world_cup')).toBe(0.05);
    expect(megaEventBoostCurve(1, 'world_cup')).toBe(0.4);
    expect(megaEventBoostCurve(-4, 'olympics_summer')).toBe(0.1);
  });
});
