import { byId, fmtPct, seasonEmoji, seasonName } from '../domain/helpers.js';

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
  const changeColor = oilChange > 0.01 ? '#f87171' : oilChange < -0.01 ? '#4ade80' : '#7ba3cc';
  ob.innerHTML = `🛢 $${state.oilPrice.toFixed(0)} <span style="color:${changeColor};font-size:10px">${arrow}${fmtPct(Math.abs(oilChange))}</span>`;
}
