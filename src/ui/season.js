import { byId, fmtPct, seasonEmoji, seasonName } from '../domain/helpers.js';
import { renderHtml } from './html.js';

export function applySeasonTheme(state) {
  const app = byId('app');
  app.classList.remove('season-q1', 'season-q2', 'season-q3', 'season-q4');
  app.classList.add('season-q' + state.quarter);
  byId('season-badge').textContent = seasonEmoji(state.quarter) + ' ' + seasonName(state.quarter);
  updateOilBadge(state);
}

export function updateOilBadge(state) {
  const ob = byId('oil-badge');
  if (!ob || !state) return;
  const oilChange = state.prevOilPrice > 0 ? ((state.oilPrice - state.prevOilPrice) / state.prevOilPrice * 100) : 0;
  const arrow = oilChange > 0.01 ? '▲' : oilChange < -0.01 ? '▼' : '─';
  const trendClass = oilChange > 0.01 ? 'up' : oilChange < -0.01 ? 'down' : 'flat';
  renderHtml(ob, `🛢 $${state.oilPrice.toFixed(0)} <span class="oil-change ${trendClass}">${arrow}${fmtPct(Math.abs(oilChange))}</span>`);
}
