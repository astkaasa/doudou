import { MEGA_EVENTS } from '../data/megaEvents.js';
import {
  MEGA_EVENT_DECAY_LENGTH,
  MEGA_EVENT_PRE_ANNOUNCE,
  MEGA_EVENT_REMOTE_SPILLOVER,
  MEGA_EVENT_SPILLOVER,
} from './constants.js';
import { getCity } from './helpers.js';
import { addMegaEventDemandModifier, MODIFIER_MODES, removeMegaEventDemandModifiers } from './modifiers.js';

export function megaEventBoostCurve(quartersFromEvent) {
  if (quartersFromEvent <= -5) return 0;
  if (quartersFromEvent === -4) return 0.1;
  if (quartersFromEvent === -3) return 0.25;
  if (quartersFromEvent === -2) return 0.5;
  if (quartersFromEvent === -1) return 0.8;
  if (quartersFromEvent === 0) return 1;
  if (quartersFromEvent === 1) return 0.6;
  if (quartersFromEvent === 2) return 0.3;
  if (quartersFromEvent === 3) return 0.1;
  return 0;
}

export function quartersFromMegaEvent(state, eventDef) {
  return (state.year - eventDef.year) * 4 + (state.quarter - eventDef.quarter);
}

export function activeMegaEventsForPeriod(state) {
  return MEGA_EVENTS
    .map((eventDef) => {
      const quartersFromEvent = quartersFromMegaEvent(state, eventDef);
      const inWindow = quartersFromEvent >= -MEGA_EVENT_PRE_ANNOUNCE
        && quartersFromEvent <= MEGA_EVENT_DECAY_LENGTH;
      const currentBoost = eventDef.maxBoost * megaEventBoostCurve(quartersFromEvent);
      const hostCity = getCity(eventDef.cityId);
      if (!inWindow || currentBoost <= 0 || !hostCity) return null;
      return {
        id: eventDef.id,
        type: eventDef.type,
        cityId: eventDef.cityId,
        cityName: hostCity.name,
        region: hostCity.region,
        name: eventDef.name,
        fullName: eventDef.fullName,
        desc: eventDef.desc,
        maxBoost: eventDef.maxBoost,
        currentBoost,
        stockEffect: eventDef.stockEffect,
        quartersFromEvent,
      };
    })
    .filter(Boolean);
}

export function syncMegaEventState(state) {
  const activeEvents = activeMegaEventsForPeriod(state);
  const existingIds = new Map((state.activeModifiers || [])
    .filter((modifier) => modifier.mode === MODIFIER_MODES.megaEvent && modifier.megaEvent?.id)
    .map((modifier) => [modifier.megaEvent.id, modifier.id]));
  state.activeMegaEvents = activeEvents;
  removeMegaEventDemandModifiers(state);
  activeEvents.forEach((event) => {
    addMegaEventDemandModifier(state, event.name, {
      id: event.id,
      hostCityId: event.cityId,
      hostRegion: event.region,
      boost: event.currentBoost,
      spillover: MEGA_EVENT_SPILLOVER,
      remoteSpillover: MEGA_EVENT_REMOTE_SPILLOVER,
    }, 1, existingIds.get(event.id));
  });
  return activeEvents;
}

export function megaEventNewsFor(event) {
  const typeLabel = event.type === 'olympics_summer' ? '夏奥' : '世博';
  const isExpo = event.type === 'world_expo';
  const q = event.quartersFromEvent;
  let title = '';
  let desc = '';
  let effect = '';

  if (q === -4) {
    title = `${event.name}进入开幕前一年倒计时`;
    desc = `${event.cityName}的场馆、交通和接待设施进入最后一年筹备，国际旅客开始提前规划行程。`;
    effect = `${event.cityName}航线需求开始升温`;
  } else if (q === -2) {
    title = `${event.name}进入倒计时，${event.cityName}航空客流攀升`;
    desc = `筹备工作进入冲刺阶段，各国${isExpo ? '参展方' : '代表团'}陆续安排先遣团队，航空预订量持续走高。`;
    effect = `${event.cityName}航线需求明显上升`;
  } else if (q === -1) {
    title = `${event.name}即将开幕！`;
    desc = `各国代表团和${typeLabel === '夏奥' ? '运动员' : '参展商'}陆续抵达${event.cityName}，航空运力面临巨大考验。`;
    effect = `${event.cityName}航线需求大幅攀升`;
  } else if (q === 0) {
    title = `${event.fullName}隆重开幕！`;
    desc = event.desc;
    effect = `${event.cityName}航线需求达到峰值`;
  } else if (q === 1) {
    title = isExpo ? `${event.name}持续开放` : `${event.name}落幕`;
    desc = isExpo
      ? `展馆持续迎接各国访客，${event.cityName}航空客流仍维持高位。`
      : `盛会画上句号，但会后旅游热度不减。${event.cityName}航空客流仍维持高位。`;
    effect = `${event.cityName}航线需求维持高位`;
  } else if (q === 2) {
    title = isExpo ? `${event.name}进入尾声` : `${event.name}效应延续`;
    desc = isExpo
      ? `闭幕日期临近，${event.cityName}国际参观客流开始从高位回落。`
      : `${event.cityName}游客量仍高于常态，会后效应持续释放。`;
    effect = `${event.cityName}航线需求逐步回落`;
  } else if (q === 3) {
    title = isExpo ? `${event.name}落幕后热度延续` : `${event.name}热度渐退`;
    desc = isExpo
      ? `世博会已经闭幕，${event.cityName}的会后旅游需求仍高于常态。`
      : `${event.cityName}航空需求逐步回归常态水平。`;
    effect = isExpo ? `${event.cityName}航线需求仍有余温` : `${event.cityName}航线需求逐步回归常态`;
  }

  if (!title) return null;
  return {
    category: 'mega_event',
    title,
    desc,
    effect,
    stockEffect: event.stockEffect,
    _megaEventId: event.id,
    _isHeadline: q === 0,
  };
}
