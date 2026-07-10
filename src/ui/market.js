import { getCityMarketState, initCityStates } from '../data/cityEraData.js';
import { populationDemandScore } from '../domain/economy.js';
import { escapeAttr, escapeHtml } from './html.js';

const LEVELS = [
  { min: 85, label: '核心市场', className: 'core' },
  { min: 65, label: '强势市场', className: 'strong' },
  { min: 45, label: '成长市场', className: 'growth' },
  { min: 0, label: '小型市场', className: 'small' },
];

const baselineCache = new Map();

export function marketScore(market) {
  const pop = Number.isFinite(market?.pop) ? market.pop : 0;
  const biz = Number.isFinite(market?.biz) ? market.biz : 0;
  const tour = Number.isFinite(market?.tour) ? market.tour : 0;
  return Math.round(Math.max(0, Math.min(100, populationDemandScore(pop) * 4 + biz * 0.55 + tour * 0.35)));
}

export function cityMarketSummary(state, cityId) {
  const current = getCityMarketState(state, cityId);
  const baseline = baselineStatesForEra(state?.era)[cityId] || current;
  const score = marketScore(current);
  const baselineScore = marketScore(baseline);
  const level = LEVELS.find((item) => score >= item.min) || LEVELS[LEVELS.length - 1];
  const trend = score - baselineScore;

  return {
    pop: current.pop,
    biz: current.biz,
    tour: current.tour,
    score,
    trend,
    trendLabel: trend > 0 ? `+${trend}` : String(trend),
    levelLabel: level.label,
    levelClass: level.className,
  };
}

function baselineStatesForEra(eraId = 'era1') {
  const key = eraId || 'era1';
  if (!baselineCache.has(key)) {
    baselineCache.set(key, initCityStates(key));
  }
  return baselineCache.get(key);
}

export function formatMarketLine(state, cityId) {
  const summary = cityMarketSummary(state, cityId);
  const trend = summary.trend === 0 ? '' : ` · ${summary.trendLabel}`;
  return `热度 ${summary.score}${trend}`;
}

export function renderMarketCard(state, city) {
  const summary = cityMarketSummary(state, city.id);
  const title = `${city.name}：人口 ${summary.pop.toFixed(1)}M，商务 ${summary.biz}，旅游 ${summary.tour}`;
  return `<div class="market-card market-card-${summary.levelClass}" title="${escapeAttr(title)}">
    <div class="market-card-head">
      <strong>${escapeHtml(city.name)}</strong>
      <span>${summary.levelLabel}</span>
    </div>
    <div class="market-score"><span>热度</span><strong>${summary.score}</strong><small>${summary.trend === 0 ? '持平' : summary.trendLabel}</small></div>
    <div class="market-bars">
      ${renderMarketBar('人口', Math.min(100, populationDemandScore(summary.pop) * 5), `${summary.pop.toFixed(1)}M`)}
      ${renderMarketBar('商务', summary.biz, summary.biz)}
      ${renderMarketBar('旅游', summary.tour, summary.tour)}
    </div>
  </div>`;
}

function renderMarketBar(label, value, displayValue) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return `<div class="market-bar"><span>${label}</span><progress max="100" value="${pct}" aria-label="${escapeAttr(label)}"></progress><b>${displayValue}</b></div>`;
}
