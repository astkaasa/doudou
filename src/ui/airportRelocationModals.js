import {
  describeAirportRelocation,
  getPendingAirportRelocations,
  previewAirportRelocation,
} from '../domain/airportRelocations.js';
import { airportDisplayCode, getAirport } from '../domain/airports.js';
import { fmt, getCity } from '../domain/helpers.js';
import { escapeAttr, escapeHtml } from './html.js';
import { showModal } from './modal.js';

export function showAirportRelocationModal(state, relocation = getPendingAirportRelocations(state)[0]) {
  if (!relocation) return false;
  const preview = previewAirportRelocation(state, relocation);
  if (!preview.ok) return false;
  const fromAirport = getAirport(relocation.fromAirportId);
  const toAirport = getAirport(relocation.toAirportId);
  const insufficient = state.cash < preview.migrationCost;
  const incompatible = preview.incompatibleRouteUids.length > 0;
  const relocateDisabled = insufficient || incompatible;
  const routeRows = preview.routes.length > 0
    ? preview.routes.map((route) => `<li>${escapeHtml(getCity(route.from)?.name || route.from)} ${escapeHtml(airportDisplayCode(route.fromAirportId))} → ${escapeHtml(getCity(route.to)?.name || route.to)} ${escapeHtml(airportDisplayCode(route.toAirportId))}${preview.incompatibleRouteUids.includes(route.uid) ? '<strong>机型不适配</strong>' : ''}</li>`).join('')
    : '<li>无受影响航线，仅迁移机场投资</li>';
  showModal(`<div class="airport-relocation-modal">
    <div class="airport-relocation-kicker">机场历史迁移 · ${relocation.triggerYear}</div>
    <h2>${escapeHtml(getCity(relocation.cityId)?.name || relocation.cityId)}机场调整</h2>
    <div class="airport-relocation-path">
      <div><strong>${escapeHtml(airportDisplayCode(fromAirport))}</strong><span>${escapeHtml(fromAirport?.name || relocation.fromAirportId)}</span><small>${relocation.mandatory ? '停止民航运营' : '原机场仍可继续'}</small></div>
      <b>→</b>
      <div><strong>${escapeHtml(airportDisplayCode(toAirport))}</strong><span>${escapeHtml(toAirport?.name || relocation.toAirportId)}</span><small>新机场方案</small></div>
    </div>
    <p class="airport-relocation-note">${relocation.mandatory ? '旧机场已不再可用于本游戏的民航运营；推进季度前必须迁移或关闭受影响航线。' : '新枢纽已经启用。可提前迁入、保留旧机场运营，或关闭相关航线。该选择只会出现一次。'}</p>
    <ul class="airport-relocation-routes">${routeRows}</ul>
    <div class="airport-relocation-finance"><span>迁移费用</span><strong class="${insufficient ? 'negative' : 'warning'}">${fmt(preview.migrationCost)}</strong><small>迁移保留航线 uid、历史指标、机场投资折扣和已选升级。</small></div>
    ${incompatible ? '<div class="airport-relocation-warning">至少一条航线的当前机型无法适配新机场；可先关闭受影响航线。</div>' : ''}
    ${insufficient ? '<div class="airport-relocation-warning">资金不足，无法整体迁移；仍可选择关闭航线。</div>' : ''}
    <div class="modal-actions airport-relocation-actions">
      ${preview.canContinue ? `<button class="btn btn-secondary" type="button" data-action="resolve-airport-relocation" data-relocation-id="${escapeAttr(relocation.id)}" data-resolution="continue">留在旧机场</button>` : ''}
      <button class="btn btn-danger" type="button" data-action="resolve-airport-relocation" data-relocation-id="${escapeAttr(relocation.id)}" data-resolution="close">关闭受影响航线</button>
      <button class="btn btn-primary" type="button" data-action="resolve-airport-relocation" data-relocation-id="${escapeAttr(relocation.id)}" data-resolution="relocate"${relocateDisabled ? ' disabled' : ''}>迁入新机场 ${fmt(preview.migrationCost)}</button>
    </div>
    <span class="sr-only">${escapeHtml(describeAirportRelocation(relocation))}</span>
  </div>`);
  return true;
}
