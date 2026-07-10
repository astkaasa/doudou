import { routeOperatingDistance, suggestedPrice } from '../domain/economy.js';
import { airportDisplayCode, getAirport } from '../domain/airports.js';
import { routePlanePerformance } from '../domain/airportPerformance.js';
import { airportCapacitySnapshot, routeHubDemandMultiplier } from '../domain/airportCapacity.js';
import { byId, clamp, fmt, fmtPct, getCity } from '../domain/helpers.js';
import { availablePlanes, findRoute } from '../domain/routes.js';
import { getRouteAlternateOptions, routeAlternateSummary } from '../domain/airportResilience.js';
import { escapeAttr, escapeHtml } from './html.js';
import { renderModalRoot, showModal } from './modal.js';

let routeListSort = { key: 'profit', dir: 'desc' };
let routeListPage = 0;
let routeListPageSize = 10;

export {
  setRoutePricePreset,
  showRouteCreateModal,
  updatePricePreview,
} from './routeCreationModal.js';

export function showRouteList(state, options = {}) {
  if (options.reset) {
    routeListSort = { key: 'profit', dir: 'desc' };
    routeListPage = 0;
    routeListPageSize = 10;
  }
  if (options.page !== undefined) routeListPage = Number(options.page) || 0;
  if (options.pageSize !== undefined) {
    routeListPageSize = Number(options.pageSize) || 10;
    routeListPage = 0;
  }
  if (state.routes.length === 0) {
    showModal('<h2>航线管理</h2><p class="modal-empty modal-empty-compact">尚未开通航线。</p><div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">关闭</button></div>');
    return;
  }
  const rows = buildRouteRows(state);
  sortRouteRows(rows);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / routeListPageSize));
  routeListPage = clamp(routeListPage, 0, totalPages - 1);
  const pageRows = rows.slice(routeListPage * routeListPageSize, routeListPage * routeListPageSize + routeListPageSize);
  const cols = [
    { key: 'from', icon: '🛫', label: '起飞城市' },
    { key: 'to', icon: '🛬', label: '到达城市' },
    { key: 'dist', icon: '📏', label: '航线距离' },
    { key: 'planesPlain', icon: '✈', label: '执飞机型' },
    { key: 'priceCoeff', icon: '💰', label: '票价系数' },
    { key: 'lf', icon: '👥', label: '客座率' },
    { key: 'profit', icon: '📈', label: '收益' },
  ];
  let html = `<h2>航线管理</h2><div class="route-table-wrap"><table class="route-table"><caption class="sr-only">航线经营数据</caption><thead><tr>`;
  cols.forEach((col) => {
    const sorted = routeListSort.key === col.key;
    const cls = sorted ? (routeListSort.dir === 'asc' ? 'sorted-asc' : 'sorted-desc') : '';
    const ariaSort = sorted ? (routeListSort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    const indicator = sorted ? `<span class="route-sort-indicator" aria-hidden="true">${routeListSort.dir === 'asc' ? '▲' : '▼'}</span>` : '';
    html += `<th class="${cls}" aria-sort="${ariaSort}"><button class="route-sort-btn" type="button" data-action="route-list-sort" data-sort-key="${escapeAttr(col.key)}" title="按${escapeAttr(col.label)}排序">${escapeHtml(col.icon)} <span class="route-sort-label">${escapeHtml(col.label)}</span>${indicator}</button></th>`;
  });
  html += '<th class="no-sort" title="操作">操作</th></tr></thead><tbody>';
  pageRows.forEach((row) => {
    html += renderRouteRow(row);
  });
  html += `</tbody></table></div><div class="route-card-list">${pageRows.map(renderRouteCard).join('')}</div>${renderPagination(totalPages)}<div class="modal-actions route-list-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">关闭</button></div>`;
  renderModalRoot(`<div class="modal-overlay" data-action="modal-backdrop"><div class="modal route-list-modal modal-relative">${html}</div></div>`);
}

export function toggleRouteListSort(key) {
  if (routeListSort.key === key) routeListSort.dir = routeListSort.dir === 'asc' ? 'desc' : 'asc';
  else routeListSort = { key, dir: 'asc' };
  routeListPage = 0;
}

export function showRoutePriceAdjust(state, from, to) {
  const route = findRoute(state, from, to);
  if (!route) return;
  const a = getCity(route.from);
  const b = getCity(route.to);
  const sp = route.suggestedPrice;
  const currentPct = Math.round((route.price / sp - 1) * 100);
  showModal(`<h2>调价 - ${escapeHtml(a.name)} → ${escapeHtml(b.name)}</h2>
    <div class="route-price-row"><span>基础票价</span><span>$${sp}</span></div>
    <div class="route-price-row"><span>当前票价</span><span class="route-price-current">$${route.price} (${currentPct >= 0 ? '+' : ''}${currentPct}%)</span></div>
    <input type="range" id="adj-price-slider" min="${Math.round(sp * 0.5)}" max="${Math.round(sp * 1.5)}" value="${route.price}" class="price-slider" data-action="adjust-price-preview">
    <div class="route-price-range"><span>$${Math.round(sp * 0.5)}</span><span id="adj-price-val">$${route.price}</span><span>$${Math.round(sp * 1.5)}</span></div>
    ${renderPricePresetButtons('set-adjust-price-preset', sp)}
    <div class="modal-actions">
      <button class="btn btn-secondary" type="button" data-action="return-route-list">取消</button>
      <button class="btn btn-success" type="button" data-action="confirm-price-adjust" data-from="${escapeAttr(route.from)}" data-to="${escapeAttr(route.to)}">确认调价</button>
    </div>`);
}

export function setAdjustPricePreset(basePrice, pct) {
  const slider = byId('adj-price-slider');
  if (!slider) return;
  const price = Math.round(basePrice * (1 + pct / 100));
  slider.value = clamp(price, Number(slider.min), Number(slider.max));
  updateAdjustedPriceDisplay();
}

export function updateAdjustedPriceDisplay() {
  const slider = byId('adj-price-slider');
  const label = byId('adj-price-val');
  if (slider && label) label.textContent = '$' + slider.value;
}

export function showRouteSuspendConfirm(state, from, to) {
  const route = findRoute(state, from, to);
  if (!route) return;
  const a = getCity(route.from);
  const b = getCity(route.to);
  showModal(`<h2>停飞航线</h2>
    <p class="route-confirm-question">确定停飞 <strong>${escapeHtml(a.name)} → ${escapeHtml(b.name)}</strong> 航线？</p>
    <p class="route-confirm-note route-confirm-note-suspend">停飞后客座率和收入归零，但执飞飞机仍处于占用状态。</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" type="button" data-action="return-route-list">取消</button>
      <button class="btn btn-danger" type="button" data-action="confirm-suspend-route" data-from="${escapeAttr(route.from)}" data-to="${escapeAttr(route.to)}">确认停飞</button>
    </div>`);
}

export function showRouteResumeConfirm(state, from, to) {
  const route = findRoute(state, from, to);
  if (!route) return;
  const a = getCity(route.from);
  const b = getCity(route.to);
  showModal(`<h2>复飞航线</h2>
    <p class="route-confirm-question">确定复飞 <strong>${escapeHtml(a.name)} → ${escapeHtml(b.name)}</strong> 航线？</p>
    <p class="route-confirm-note route-confirm-note-resume">复飞后航线将在下季度恢复运营并产生收益。</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" type="button" data-action="return-route-list">取消</button>
      <button class="btn btn-success" type="button" data-action="confirm-resume-route" data-from="${escapeAttr(route.from)}" data-to="${escapeAttr(route.to)}">确认复飞</button>
    </div>`);
}

export function showRouteCloseConfirm(state, from, to) {
  const route = findRoute(state, from, to);
  if (!route) return;
  const a = getCity(route.from);
  const b = getCity(route.to);
  showModal(`<h2>关闭航线</h2>
    <p class="route-confirm-question">确定关闭 <strong>${escapeHtml(a.name)} → ${escapeHtml(b.name)}</strong> 航线？</p>
    <p class="route-confirm-note route-confirm-note-close">关闭后该航线将失去收益，飞机将变为空闲可用状态。</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" type="button" data-action="return-route-list">取消</button>
      <button class="btn btn-danger" type="button" data-action="close-route" data-from="${escapeAttr(route.from)}" data-to="${escapeAttr(route.to)}">确认关闭</button>
    </div>`);
}

export function showRouteChangePlaneModal(state, from, to) {
  const route = findRoute(state, from, to);
  if (!route) return;
  const a = getCity(route.from);
  const b = getCity(route.to);
  const distance = routeOperatingDistance(route, a, b);
  const currentPlanes = (route.assignedPlanes || []).map((uid) => state.fleet.find((f) => f.uid === uid)).filter(Boolean);
  const currentInfo = currentPlanes.map((plane) => `${plane.name}${plane.isLease ? ' [R]' : ''} (${Math.floor(plane.seats * routePlanePerformance(route, plane, state).factor)}/${plane.seats}座)`).join('、') || '无';
  const avail = availablePlanes(state).filter((plane) => planeCanOperateRoute(state, route, plane, distance));
  if (avail.length === 0) {
    showModal(`<h2>更换机型</h2><p class="route-change-route-plain">${escapeHtml(a.name)} → ${escapeHtml(b.name)}</p><p>当前执飞：${escapeHtml(currentInfo)}</p><p class="route-change-warning">没有可用的替代飞机（需航程 ≥ ${Math.round(distance)} km）。</p><div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="return-route-list">返回</button></div>`);
    return;
  }
  let html = `<h2>更换机型</h2>
    <p class="route-change-route">${escapeHtml(a.name)} → ${escapeHtml(b.name)} <span class="route-change-distance">(航程 ${Math.round(distance)} km)</span></p>
    <p class="route-change-current">当前执飞：${escapeHtml(currentInfo)}</p>
    <h3>选择新飞机</h3><div class="route-plane-list">`;
  avail.forEach((plane) => {
    const performance = routePlanePerformance(route, plane, state);
    const capacity = Math.floor(plane.seats * performance.factor);
    const note = performance.reasons.length > 0 ? ` · ${performance.reasons.join('；')}` : '';
    html += `<button class="route-plane-option" type="button" data-action="change-route-plane" data-from="${escapeAttr(route.from)}" data-to="${escapeAttr(route.to)}" data-uid="${escapeAttr(plane.uid)}">
      <span class="route-plane-option-main"><span class="route-plane-option-name">${escapeHtml(plane.name)}${plane.isLease ? ' <span class="route-plane-lease">[R]</span>' : ''}</span><span class="route-plane-option-meta">有效 ${capacity}/${plane.seats}座 | 航程${plane.range}km${escapeHtml(note)}</span></span>
      <span class="route-plane-option-action">选择</span>
    </button>`;
  });
  html += '</div><div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="return-route-list">取消</button></div>';
  showModal(html);
}

export function showRouteAlternateModal(state, routeUid) {
  const route = state.routes.find((item) => item.uid === Number(routeUid));
  if (!route) return;
  const summary = routeAlternateSummary(route);
  const sections = ['from', 'to'].map((endpoint) => {
    const primaryId = endpoint === 'from' ? route.fromAirportId : route.toAirportId;
    const primary = getAirport(primaryId);
    const current = endpoint === 'from' ? summary.from : summary.to;
    const options = getRouteAlternateOptions(state, route, endpoint);
    return `<section class="route-alternate-section">
      <div class="route-alternate-head"><div><strong>${endpoint === 'from' ? '起飞机场' : '到达机场'} ${escapeHtml(airportDisplayCode(primary))}</strong><span>${escapeHtml(primary?.name || primaryId)}</span></div><b>${current ? `已设 ${escapeHtml(airportDisplayCode(current))}` : '未设置'}</b></div>
      <div class="route-alternate-options">
        ${options.length > 0 ? options.map((option) => `<button class="route-alternate-option${current?.id === option.airport.id ? ' selected' : ''}" type="button" data-action="set-route-alternate" data-route-uid="${escapeAttr(route.uid)}" data-endpoint="${escapeAttr(endpoint)}" data-airport-id="${escapeAttr(option.airport.id)}"><strong>${escapeHtml(airportDisplayCode(option.airport))}</strong><span>${escapeHtml(option.airport.name)}</span><small>${option.sameCity ? '同城' : `距主机场 ${Math.round(option.distanceFromPrimary)}km`} · 跑道 ${option.airport.factual.maxRunwayM}m</small></button>`).join('') : '<div class="route-alternate-empty">当前机型和年代下没有可用备降机场。</div>'}
        ${current ? `<button class="route-alternate-clear" type="button" data-action="set-route-alternate" data-route-uid="${escapeAttr(route.uid)}" data-endpoint="${escapeAttr(endpoint)}" data-airport-id="">清除该端备降</button>` : ''}
      </div>
    </section>`;
  }).join('');
  showModal(`<div class="route-alternate-modal"><h2>备降与韧性计划</h2><p>为 ${escapeHtml(getCity(route.from)?.name || route.from)} → ${escapeHtml(getCity(route.to)?.name || route.to)} 的两端机场预先指定备降点。每次新增方案收取 0.5M 规划费；机场中断时可显著保留需求并降低额外成本。</p>${sections}<div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="return-route-list">返回航线管理</button></div></div>`);
}

function buildRouteRows(state) {
  const fleetByUid = new Map(state.fleet.map((plane) => [plane.uid, plane]));
  return state.routes.flatMap((route) => {
    const a = getCity(route.from);
    const b = getCity(route.to);
    if (!a || !b) return [];
    const distance = routeOperatingDistance(route, a, b);
    const fromCode = airportDisplayCode(route.fromAirportId);
    const toCode = airportDisplayCode(route.toAirportId);
    const routeSuggestedPrice = route.suggestedPrice || suggestedPrice(route.from, route.to);
    const routePrice = Number.isFinite(route.price) ? route.price : routeSuggestedPrice;
    const assignedPlanes = route.assignedPlanes || [];
    const assignedPlaneRecords = assignedPlanes.map((uid) => fleetByUid.get(uid));
    const planeInfo = assignedPlaneRecords.map((plane) => {
      return plane ? `${escapeHtml(plane.name)}${plane.isLease ? '<span class="route-plane-lease"> [R]</span>' : ''}` : '?';
    }).join(', ');
    const planeInfoPlain = assignedPlaneRecords.map((plane) => {
      return plane ? `${plane.name}${plane.isLease ? ' [R]' : ''}` : '?';
    }).join(', ');
    const priceCoeff = (routePrice / routeSuggestedPrice * 100 - 100);
    const capacityText = [route.fromAirportId, route.toAirportId].map((airportId) => {
      const snapshot = airportCapacitySnapshot(state, airportId);
      return `${airportDisplayCode(airportId)} ${snapshot.remaining >= 0 ? snapshot.remaining : `超${Math.abs(snapshot.remaining)}`}`;
    }).join(' · ');
    const hubBonus = Math.max(0, routeHubDemandMultiplier(state, route) - 1);
    const alternates = routeAlternateSummary(route);
    const alternateText = [alternates.from, alternates.to].filter(Boolean).map(airportDisplayCode).join('/');
    const operationalNote = `${capacityText}${hubBonus > 0 ? ` · 枢纽+${fmtPct(hubBonus * 100)}` : ''}${route.airportContractId ? ' · 合同' : ''}${alternateText ? ` · 备降 ${alternateText}` : ''}`;
    return {
      uid: route.uid,
      from: `${a.name} ${fromCode}`,
      to: `${b.name} ${toCode}`,
      dist: Math.round(distance),
      planes: planeInfo,
      planesPlain: planeInfoPlain,
      priceCoeff,
      priceCoeffStr: formatPriceCoeff(priceCoeff),
      lf: route.loadFactor || 0,
      fromId: route.from,
      toId: route.to,
      profit: route.profit || 0,
      isNew: Boolean(route.isNew),
      suspended: Boolean(route.suspended),
      reopened: Boolean(route._reopened),
      priceAdjusted: Boolean(route._priceAdjusted),
      planeChanged: Boolean(route._planeChanged),
      lastLf: route._lastLf || 0,
      lastProfit: route._lastProfit || 0,
      suspendCooldown: route._suspendTurn !== undefined && route._suspendTurn >= state.turnsPlayed,
      resumeCooldown: route._resumedTurn !== undefined && route._resumedTurn >= state.turnsPlayed,
      operationalNote,
    };
  });
}

function sortRouteRows(rows) {
  const direction = routeListSort.dir === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    const av = a[routeListSort.key];
    const bv = b[routeListSort.key];
    return (av > bv ? 1 : av < bv ? -1 : 0) * direction;
  });
}

function renderRouteRow(row) {
  const profitClass = row.profit >= 0 ? 'profit-pos' : 'profit-neg';
  const lastProfitClass = row.lastProfit >= 0 ? 'profit-pos' : 'profit-neg';
  const lfPct = fmtPct(row.lf * 100);
  const lastLfPct = fmtPct(row.lastLf * 100);
  const changed = row.priceAdjusted || row.planeChanged;
  const lfTrend = row.lf > row.lastLf ? '📈' : row.lf < row.lastLf ? '📉' : '📊';
  const profitTrend = row.profit > row.lastProfit ? '📈' : row.profit < row.lastProfit ? '📉' : '📊';
  const reopenedTag = '<span class="route-state-tag route-state-reopened">reopen</span>';
  const newTag = '<span class="route-state-tag route-state-new">new</span>';
  const suspendedBadge = row.suspended ? '<span class="route-suspended-badge">停飞中</span>' : '';
  const lfDisplay = row.suspended ? '0%' : row.reopened ? reopenedTag : row.isNew ? newTag : changed ? `${lastLfPct}<span class="route-trend" title="数据下季度可能变化">${lfTrend}</span>` : lfPct;
  const profitDisplay = row.suspended ? '--' : row.reopened ? reopenedTag : row.isNew ? newTag : changed ? `<span class="${lastProfitClass}">${fmt(row.lastProfit)}</span><span class="route-trend" title="数据下季度可能变化">${profitTrend}</span>` : `<span class="${profitClass}">${fmt(row.profit)}</span>`;
  const changeIcon = changed ? '<span class="route-change-icon" title="本季度调整过票价或机型">🔄</span>' : '';
  const toggleCooldown = row.suspended ? row.resumeCooldown : row.suspendCooldown;
  const toggleLabel = row.suspended ? '复飞' : '停飞';
  const toggleTitle = toggleCooldown ? `需推进1回合后才能${toggleLabel}` : toggleLabel;
  const toggleClass = row.suspended ? 'route-table-action-resume' : 'route-table-action-suspend';
  const toggleIcon = row.suspended ? '▶' : '⏸';
  const suspendButton = `<button class="btn btn-sm route-table-action ${toggleClass}${toggleCooldown ? ' route-action-disabled' : ''}" type="button" data-action="${toggleCooldown ? 'noop' : 'toggle-route-suspend'}" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}" title="${toggleTitle}" aria-label="${toggleTitle}">${toggleIcon}</button>`;
  return `<tr class="${row.suspended ? 'route-row-suspended' : ''}">
    <td>${escapeHtml(row.from)}${suspendedBadge}</td>
    <td>${escapeHtml(row.to)}</td>
    <td>${row.dist}km<small class="route-airport-operational">${escapeHtml(row.operationalNote)}</small></td>
    <td class="route-plane-cell" title="${escapeAttr(row.planesPlain)}">${row.planes}${row.planeChanged ? changeIcon : ''}</td>
    <td>${row.suspended ? '--' : row.priceCoeffStr}${!row.suspended && row.priceAdjusted ? changeIcon : ''}</td>
    <td>${lfDisplay}</td>
    <td>${profitDisplay}</td>
    <td class="route-actions-cell">
      ${row.suspended ? '' : `<button class="btn btn-sm route-table-action route-table-action-price" type="button" data-action="open-route-price-adjust" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}" title="调整票价" aria-label="调整票价">💰</button>
      <button class="btn btn-sm route-table-action route-table-action-plane" type="button" data-action="open-route-change-plane" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}" title="更换机型" aria-label="更换机型">✈</button>`}
      ${suspendButton}
      <button class="btn btn-sm route-table-action route-table-action-alternate" type="button" data-action="open-route-alternate" data-route-uid="${escapeAttr(row.uid)}" title="备降与韧性" aria-label="备降与韧性">🛟</button>
      <button class="btn btn-sm route-table-action route-table-action-close" type="button" data-action="confirm-close-route" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}" title="关闭航线" aria-label="关闭航线">✕</button>
    </td>
  </tr>`;
}

function renderRouteCard(row) {
  const profitClass = row.profit >= 0 ? 'profit-pos' : 'profit-neg';
  const lastProfitClass = row.lastProfit >= 0 ? 'profit-pos' : 'profit-neg';
  const changed = row.priceAdjusted || row.planeChanged;
  const lfTrend = row.lf > row.lastLf ? '📈' : row.lf < row.lastLf ? '📉' : '📊';
  const profitTrend = row.profit > row.lastProfit ? '📈' : row.profit < row.lastProfit ? '📉' : '📊';
  const status = row.suspended ? '停飞中' : row.reopened ? '复飞待观察' : row.isNew ? '新航线' : changed ? '本季已调整' : '运营中';
  const lfDisplay = row.suspended ? '0%' : row.reopened ? 'reopen' : row.isNew ? 'new' : changed ? `${fmtPct(row.lastLf * 100)} ${lfTrend}` : fmtPct(row.lf * 100);
  const profitDisplay = row.suspended ? '--' : row.reopened ? 'reopen' : row.isNew ? 'new' : changed ? `<span class="${lastProfitClass}">${fmt(row.lastProfit)}</span> ${profitTrend}` : `<span class="${profitClass}">${fmt(row.profit)}</span>`;
  const suspendAction = row.suspended ? '复飞' : '停飞';
  const suspendDisabled = row.suspended ? row.resumeCooldown : row.suspendCooldown;
  return `<div class="route-card${row.suspended ? ' route-card-suspended' : ''}">
    <div class="route-card-head">
      <strong>${escapeHtml(row.from)} → ${escapeHtml(row.to)}</strong>
      <span>${status}</span>
    </div>
    <div class="route-card-grid">
      <div><small>距离</small><b>${row.dist}km</b></div>
      <div><small>票价</small><b>${row.suspended ? '--' : row.priceCoeffStr}</b></div>
      <div><small>客座率</small><b>${lfDisplay}</b></div>
      <div><small>收益</small><b>${profitDisplay}</b></div>
    </div>
    <div class="route-card-plane" title="${escapeAttr(row.planesPlain)}">执飞：${row.planes || '无'}</div>
    <div class="route-card-operational">${escapeHtml(row.operationalNote)}</div>
    <div class="route-card-actions">
      ${row.suspended ? '' : `<button class="btn btn-sm" type="button" data-action="open-route-price-adjust" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}">调价</button>
      <button class="btn btn-sm" type="button" data-action="open-route-change-plane" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}">换机</button>`}
      <button class="btn btn-sm" type="button" data-action="${suspendDisabled ? 'noop' : 'toggle-route-suspend'}" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}"${suspendDisabled ? ' disabled' : ''}>${suspendAction}</button>
      <button class="btn btn-sm" type="button" data-action="open-route-alternate" data-route-uid="${escapeAttr(row.uid)}">备降</button>
      <button class="btn btn-danger btn-sm" type="button" data-action="confirm-close-route" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}">关闭</button>
    </div>
  </div>`;
}

function renderPagination(totalPages) {
  return `<div class="route-page-info">
    <div>
      <span>第 ${routeListPage + 1}/${totalPages} 页</span>
      <button class="btn btn-sm route-page-btn route-page-first" type="button" data-action="route-list-page" data-page="0">首</button>
      <button class="btn btn-sm route-page-btn" type="button" data-action="route-list-page" data-page="${Math.max(0, routeListPage - 1)}">‹</button>
      <button class="btn btn-sm route-page-btn" type="button" data-action="route-list-page" data-page="${Math.min(totalPages - 1, routeListPage + 1)}">›</button>
      <button class="btn btn-sm route-page-btn" type="button" data-action="route-list-page" data-page="${totalPages - 1}">末</button>
    </div>
    <div>
      <span>每页</span>
      ${[10, 20].map((size) => `<button class="btn btn-sm route-page-btn route-page-size${routeListPageSize === size ? ' active' : ''}" type="button" data-action="route-list-page-size" data-page-size="${size}">${size}</button>`).join('')}
    </div>
  </div>`;
}

function renderPricePresetButtons(action, basePrice) {
  const buttons = [-50, -25, 0, 25, 50]
    .map((pct) => `<button class="btn btn-secondary btn-sm route-preset-btn" type="button" data-action="${escapeAttr(action)}" data-base-price="${basePrice}" data-pct="${pct}">${pct > 0 ? '+' : ''}${pct}%</button>`)
    .join('');
  return `<div class="route-preset-row"><span class="route-preset-label">快捷:</span>${buttons}</div>`;
}

function formatPriceCoeff(value) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}%`;
  if (rounded === 0) return '0%';
  return `${rounded}%`;
}
