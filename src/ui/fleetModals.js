import { LEASE_TERM_QUARTERS, availablePlaneTemplates, countBoughtPlanes, countLeasedPlanes, maxLeasedPlanes, quotePlaneAcquisition } from '../domain/fleet.js';
import { analyzeFleetPlan, matchesFleetPlanFilter, normalizeFleetPlanFilter } from '../domain/fleetPlanning.js';
import { fmt, getCity } from '../domain/helpers.js';
import { escapeAttr, escapeHtml } from './html.js';
import { showModal } from './modal.js';

let fleetListFilter = 'all';
let fleetListPage = 0;
const selectedFleetUids = new Set();
const FLEET_LIST_PAGE_SIZE = 20;

const FLEET_FILTER_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'renewal', label: '8季内更新' },
  { key: 'assigned', label: '已分配' },
  { key: 'idle', label: '空闲' },
  { key: 'delivering', label: '交付中' },
  { key: 'leased', label: '租赁' },
];

export function showBuyPlaneModal(state) {
  const boughtCount = countBoughtPlanes(state);
  const leasedCount = countLeasedPlanes(state);
  const leaseMax = maxLeasedPlanes(state);
  const planes = availablePlaneTemplates(state);
  const groups = groupPlanesByMaker(planes);
  const defaultOpenGroup = Math.max(0, groups.findIndex((group) => groupHasAffordablePlane(group.planes, state)));
  let html = `<div class="plane-market-head">
    <div><h2>飞机市场</h2><p>购买机型需 2 季交付；租赁立即可用，但首期包含机价 10% 手续费。</p></div>
    <div class="plane-market-cash"><span>可用资金</span><strong>${fmt(state.cash)}</strong></div>
  </div>
  <div class="plane-market-summary">
    <span>自有 <strong>${boughtCount}</strong> 架</span>
    <span>租赁 <strong>${leasedCount}/${leaseMax}</strong> 架</span>
    <span>租期上限 <strong>${LEASE_TERM_QUARTERS} 季</strong></span>
  </div>
  <div id="plane-list">`;
  if (groups.length === 0) {
    html += '<p class="plane-market-empty">当前年份没有可购买机型。</p>';
  }
  groups.forEach(({ maker, planes: makerPlanes }, index) => {
    const shouldOpen = index === defaultOpenGroup;
    html += `<details class="plane-maker-group"${shouldOpen ? ' open' : ''}><summary><span>${escapeHtml(maker)}</span><small>${makerPlanes.length}</small></summary>`;
    makerPlanes.forEach((p) => {
      html += renderPlanePurchaseCard(state, p, maker);
    });
    html += '</details>';
  });
  html += '</div><div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">关闭</button></div>';
  showModal(html, { wide: true });
}

export function updatePlanePurchaseOptions(state, planeId) {
  const input = document.getElementById(`buy-qty-${planeId}`);
  const count = input ? Number(input.value) : 1;
  [false, true].forEach((isLease) => {
    const quote = quotePlaneAcquisition(state, planeId, isLease, count);
    const button = document.querySelector(`[data-action="buy-plane"][data-plane-id="${planeId}"][data-lease="${isLease}"]`);
    if (!button || !quote.template) return;
    button.disabled = !quote.ok;
    button.title = quote.ok ? acquisitionTitle(quote) : quote.message;
    button.textContent = acquisitionButtonLabel(quote);
  });
}

function renderPlanePurchaseCard(state, plane, maker) {
  const buyQuote = quotePlaneAcquisition(state, plane.id, false, 1);
  const leaseQuote = quotePlaneAcquisition(state, plane.id, true, 1);
  return `<article class="plane-purchase-card">
    <div class="plane-purchase-head">
      <div><strong>${escapeHtml(plane.name)}</strong><span>${escapeHtml(planeTypeLabel(plane.type))} · ${escapeHtml(maker)}${plane.fictional ? ' · 架空机型' : ''}</span></div>
      <small>可购 ${plane.serviceStart}-${plane.serviceEnd}</small>
    </div>
    <div class="plane-spec-grid">
      <span><small>座位</small><strong>${plane.seats}</strong></span>
      <span><small>航程</small><strong>${plane.range} km</strong></span>
      <span><small>油耗</small><strong>${plane.fuel}</strong></span>
      <span><small>购价</small><strong>${fmt(plane.buyPrice)}</strong></span>
    </div>
    <div class="plane-acquisition-notes">
      <span><b>购买</b> 2 季后交付</span>
      <span><b>租赁</b> 立即可用，租期 ${LEASE_TERM_QUARTERS} 季，每季 ${fmt(plane.leasePrice)}</span>
    </div>
    <div class="plane-purchase-actions">
      <label for="buy-qty-${escapeAttr(plane.id)}">数量
        <input type="number" min="1" max="10" value="1" id="buy-qty-${escapeAttr(plane.id)}" data-action="plane-purchase-quantity" data-plane-id="${escapeAttr(plane.id)}">
      </label>
      ${renderAcquisitionButton(plane.id, buyQuote)}
      ${renderAcquisitionButton(plane.id, leaseQuote)}
    </div>
  </article>`;
}

function renderAcquisitionButton(planeId, quote) {
  const disabled = quote.ok ? '' : ' disabled';
  const title = quote.ok ? acquisitionTitle(quote) : quote.message;
  const className = quote.isLease ? 'btn-warning' : 'btn-primary';
  return `<button class="btn ${className} btn-sm" type="button" data-action="buy-plane" data-plane-id="${escapeAttr(planeId)}" data-lease="${quote.isLease}" title="${escapeAttr(title)}"${disabled}>${escapeHtml(acquisitionButtonLabel(quote))}</button>`;
}

function acquisitionButtonLabel(quote) {
  const count = quote.count || 1;
  if (quote.isLease) return `租赁 ${count} 架 · 首期 ${fmt(quote.totalCost || 0)}`;
  return `购买 ${count} 架 · ${fmt(quote.totalCost || 0)}`;
}

function acquisitionTitle(quote) {
  if (quote.isLease) return `租期 ${LEASE_TERM_QUARTERS} 季；首期含 ${fmt(quote.leaseFee)} 手续费，此后每季 ${fmt(quote.recurringCost)}`;
  return `预计 ${quote.deliveryTurns} 季后交付，操作后现金 ${fmt(quote.cashAfter)}`;
}

function groupHasAffordablePlane(planes, state) {
  return planes.some((plane) => quotePlaneAcquisition(state, plane.id, false, 1).ok || quotePlaneAcquisition(state, plane.id, true, 1).ok);
}

function groupPlanesByMaker(planes) {
  const groups = new Map();
  planes.forEach((plane) => {
    const maker = planeMaker(plane);
    if (!groups.has(maker)) groups.set(maker, []);
    groups.get(maker).push(plane);
  });
  return [...groups.entries()].map(([maker, makerPlanes]) => ({ maker, planes: makerPlanes }));
}

function planeMaker(plane) {
  if (plane.id.startsWith('b')) return '波音';
  if (plane.id.startsWith('a')) return '空客';
  if (plane.id.startsWith('dc') || plane.id.startsWith('md')) return '麦道';
  if (plane.id.startsWith('il')) return '伊留申';
  if (plane.id.startsWith('tv')) return '图波列夫';
  if (plane.id.startsWith('l')) return '洛克希德';
  return '其他';
}

function planeTypeLabel(type) {
  if (type === 'narrow') return '窄体';
  if (type === 'wide') return '宽体';
  return '超宽体';
}

export function showFleetPanel(state, options = {}) {
  let focusSelector = options.focusSelector || null;
  if (options.reset) {
    fleetListFilter = 'all';
    fleetListPage = 0;
    selectedFleetUids.clear();
  }
  if (options.filter !== undefined) {
    fleetListFilter = normalizeFleetPlanFilter(options.filter);
    fleetListPage = 0;
    focusSelector = `[data-fleet-filter="${fleetListFilter}"]`;
  }
  if (options.page !== undefined) {
    fleetListPage = Math.max(0, Number(options.page) || 0);
  }

  const { plan, entries, totalPages, pageEntries } = fleetView(state);
  removeInvalidFleetSelections(plan.entries);

  let html = `<div class="fleet-panel"><div class="fleet-panel-head"><div><h2>机队管理</h2><p>自有 ${plan.summary.owned} 架 · 租赁 ${plan.summary.leased} 架 · 共 ${plan.summary.total} 架</p></div><button class="btn btn-primary btn-sm" type="button" data-action="open-buy-plane-modal">补充运力</button></div>`;
  if (state.fleet.length === 0) {
    html += '<p class="modal-empty modal-empty-compact">尚未拥有飞机，请先购买。</p>';
  } else {
    html += renderFleetPlanSummary(plan.summary);
    html += renderFleetFilters(plan.counts, entries.length);
    if (pageEntries.some((entry) => entry.idle) || selectedFleetUids.size > 0) html += renderFleetBatchBar(pageEntries);
    html += pageEntries.length > 0
      ? `<div class="fleet-list">${pageEntries.map((entry) => renderFleetItem(entry)).join('')}</div>${renderFleetPagination(totalPages)}`
      : '<div class="fleet-filter-empty" role="status">当前筛选没有匹配飞机。</div>';
  }
  html += '<div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">关闭</button></div></div>';
  showModal(html, { wide: true, focusSelector });
}

function renderFleetPlanSummary(summary) {
  return `<div class="fleet-plan-summary" aria-label="机队更新计划">
    <span class="${summary.dueNextQuarter > 0 ? 'risk' : ''}"><small>下季离场</small><strong>${summary.dueNextQuarter} 架</strong></span>
    <span class="${summary.dueWithinFourQuarters > 0 ? 'warning' : ''}"><small>4季内离场</small><strong>${summary.dueWithinFourQuarters} 架</strong></span>
    <span><small>4季替代需求</small><strong>${summary.affectedRoutesWithinFourQuarters} 线 · ${summary.replacementSeatsWithinFourQuarters} 座</strong></span>
    <span class="positive"><small>2季内交付</small><strong>${summary.deliveriesWithinTwoQuarters} 架 · ${summary.seatsDeliveringWithinTwoQuarters} 座</strong></span>
  </div>`;
}

function renderFleetFilters(counts, filteredTotal) {
  const buttons = FLEET_FILTER_OPTIONS.map((filter) => {
    const active = fleetListFilter === filter.key;
    return `<button class="fleet-filter-btn${active ? ' active' : ''}" type="button" data-action="fleet-list-filter" data-fleet-filter="${escapeAttr(filter.key)}" aria-pressed="${active}"><span>${escapeHtml(filter.label)}</span><b>${counts[filter.key] || 0}</b></button>`;
  }).join('');
  const total = counts.all || 0;
  const result = filteredTotal === total ? `${total} 架` : `${filteredTotal} / ${total} 架`;
  return `<div class="fleet-filter-toolbar"><div class="fleet-filter-group" role="group" aria-label="机队筛选">${buttons}</div><span class="fleet-filter-result" aria-live="polite">${result}</span></div>`;
}

function renderFleetItem(entry) {
  const plane = entry.plane;
  const routeLabel = entry.route
    ? `${getCity(entry.route.from)?.name || entry.route.from}→${getCity(entry.route.to)?.name || entry.route.to}`
    : '';
  const status = entry.delivering
    ? `交付中 · ${entry.deliveryInQuarters}季`
    : entry.assigned
      ? `${entry.route.suspended ? '停飞占用 · ' : ''}${routeLabel}`
      : '空闲';
  const statusClass = entry.delivering ? 'status-delivering' : entry.assigned ? 'status-assigned' : 'status-idle';
  const action = plane.isLease ? 'return-lease' : 'sell-plane';
  const actionLabel = plane.isLease ? '退租' : '出售';
  const impact = entry.renewal
    ? entry.route
      ? `影响 ${routeLabel} · 需替代 ${entry.replacementSeats} 座`
      : '当前无航线受影响'
    : entry.delivering
      ? `${Math.max(0, Number(plane.seats) || 0)} 座即将加入机队`
      : '';
  const urgencyClass = entry.departureInQuarters <= 1 ? ' fleet-item-critical' : entry.renewal ? ' fleet-item-renewal' : '';
  const selected = selectedFleetUids.has(plane.uid);
  const selection = entry.idle
    ? `<label class="fleet-select-control" title="选择 ${escapeAttr(plane.name)}"><input type="checkbox" data-action="fleet-batch-selection" data-uid="${escapeAttr(plane.uid)}"${selected ? ' checked' : ''}><span class="sr-only">选择 ${escapeHtml(plane.name)}</span></label>`
    : '';
  return `<article class="fleet-item${urgencyClass}${selected ? ' fleet-item-selected' : ''}" data-plane-uid="${escapeAttr(plane.uid)}">
    <div class="fleet-item-main">
      <div class="fleet-item-title">${selection}<span class="name">${escapeHtml(plane.name)}</span>${plane.isLease ? '<span class="lease-badge">R</span>' : ''}${renderFleetLifecycleMeta(entry)}</div>
      <div class="fleet-item-meta"><span>机龄 ${Math.max(0, Number(plane.age) || 0).toFixed(1)} 年</span><span>${Math.max(0, Number(plane.seats) || 0)} 座</span></div>
    </div>
    <div class="fleet-item-side"><span class="status ${statusClass}">${escapeHtml(status)}</span>${impact ? `<small>${escapeHtml(impact)}</small>` : ''}${entry.idle ? `<button class="btn btn-danger btn-sm" type="button" data-action="${action}" data-uid="${escapeAttr(plane.uid)}">${actionLabel}</button>` : ''}</div>
  </article>`;
}

function renderFleetLifecycleMeta(entry) {
  if (entry.renewal) {
    const timing = entry.departureInQuarters <= 1 ? '下季' : `${entry.departureInQuarters}季后`;
    const reason = entry.departureReason === 'lease_expired' ? '租约到期' : '退役';
    return `<span class="fleet-lifecycle-warning">${timing}${reason}</span>`;
  }
  if (!entry.leased) return '';
  const leaseTurns = Math.max(0, Number(entry.plane.leaseTurns) || 0);
  const maxLeaseTurns = Math.max(1, Number(entry.plane.maxLeaseTurns) || LEASE_TERM_QUARTERS);
  return `<span class="fleet-lease-meta">租 ${leaseTurns}/${maxLeaseTurns} 季</span>`;
}

function renderFleetPagination(totalPages) {
  if (totalPages <= 1) return '';
  return `<div class="fleet-page-info"><span>第 ${fleetListPage + 1}/${totalPages} 页</span><div>
    <button class="btn btn-sm fleet-page-btn" type="button" data-action="fleet-list-page" data-page="0" title="第一页" aria-label="第一页">«</button>
    <button class="btn btn-sm fleet-page-btn" type="button" data-action="fleet-list-page" data-page="${Math.max(0, fleetListPage - 1)}" title="上一页" aria-label="上一页">‹</button>
    <button class="btn btn-sm fleet-page-btn" type="button" data-action="fleet-list-page" data-page="${Math.min(totalPages - 1, fleetListPage + 1)}" title="下一页" aria-label="下一页">›</button>
    <button class="btn btn-sm fleet-page-btn" type="button" data-action="fleet-list-page" data-page="${totalPages - 1}" title="最后一页" aria-label="最后一页">»</button>
  </div></div>`;
}

function renderFleetBatchBar(pageEntries) {
  const selectableOnPage = pageEntries.filter((entry) => entry.idle).length;
  return `<div class="fleet-batch-bar">
    <span><b id="fleet-batch-count">${selectedFleetUids.size}</b> 架已选</span>
    <div>
      <button class="btn btn-sm btn-secondary" type="button" data-action="fleet-select-page"${selectableOnPage > 0 ? '' : ' disabled'}>选择本页空闲</button>
      <button class="btn btn-sm btn-secondary" type="button" data-action="fleet-clear-selection"${selectedFleetUids.size > 0 ? '' : ' disabled'}>清除</button>
      <button class="btn btn-sm btn-warning" id="fleet-batch-preview" type="button" data-action="open-fleet-batch-preview"${selectedFleetUids.size > 0 ? '' : ' disabled'}>处置所选</button>
    </div>
  </div>`;
}

export function setFleetBatchSelection(state, uid, selected) {
  const entry = analyzeFleetPlan(state).entries.find((item) => item.plane.uid === Number(uid));
  if (!entry?.idle) return false;
  if (selected) selectedFleetUids.add(entry.plane.uid);
  else selectedFleetUids.delete(entry.plane.uid);
  return true;
}

export function selectVisibleIdleFleet(state) {
  fleetView(state).pageEntries.filter((entry) => entry.idle).forEach((entry) => selectedFleetUids.add(entry.plane.uid));
  return getSelectedFleetUids();
}

export function clearFleetBatchSelection() {
  selectedFleetUids.clear();
}

export function getSelectedFleetUids() {
  return [...selectedFleetUids];
}

export function updateFleetBatchSelectionUI(state) {
  removeInvalidFleetSelections(analyzeFleetPlan(state).entries);
  const count = document.getElementById('fleet-batch-count');
  const preview = document.getElementById('fleet-batch-preview');
  const clear = document.querySelector('[data-action="fleet-clear-selection"]');
  if (count) count.textContent = String(selectedFleetUids.size);
  if (preview) preview.disabled = selectedFleetUids.size === 0;
  if (clear) clear.disabled = selectedFleetUids.size === 0;
  document.querySelectorAll('.fleet-item[data-plane-uid]').forEach((item) => {
    const uid = Number(item.dataset.planeUid);
    item.classList.toggle('fleet-item-selected', selectedFleetUids.has(uid));
  });
}

function fleetView(state) {
  const plan = analyzeFleetPlan(state);
  const entries = plan.entries
    .filter((entry) => matchesFleetPlanFilter(entry, fleetListFilter))
    .sort(compareFleetPlanEntries);
  const totalPages = Math.max(1, Math.ceil(entries.length / FLEET_LIST_PAGE_SIZE));
  fleetListPage = Math.min(fleetListPage, totalPages - 1);
  const pageEntries = entries.slice(
    fleetListPage * FLEET_LIST_PAGE_SIZE,
    fleetListPage * FLEET_LIST_PAGE_SIZE + FLEET_LIST_PAGE_SIZE,
  );
  return { plan, entries, totalPages, pageEntries };
}

function removeInvalidFleetSelections(entries) {
  const idleUids = new Set(entries.filter((entry) => entry.idle).map((entry) => entry.plane.uid));
  [...selectedFleetUids].forEach((uid) => {
    if (!idleUids.has(uid)) selectedFleetUids.delete(uid);
  });
}

function compareFleetPlanEntries(a, b) {
  const aDeparture = a.renewal ? a.departureInQuarters : Number.POSITIVE_INFINITY;
  const bDeparture = b.renewal ? b.departureInQuarters : Number.POSITIVE_INFINITY;
  if (aDeparture !== bDeparture) return aDeparture - bDeparture;
  const aDelivery = a.deliveryInQuarters ?? Number.POSITIVE_INFINITY;
  const bDelivery = b.deliveryInQuarters ?? Number.POSITIVE_INFINITY;
  if (aDelivery !== bDelivery) return aDelivery - bDelivery;
  if (a.assigned !== b.assigned) return a.assigned ? -1 : 1;
  return String(a.plane.name).localeCompare(String(b.plane.name), 'zh-CN') || a.plane.uid - b.plane.uid;
}
