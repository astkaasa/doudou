import { AIRCRAFT_RETIREMENT_AGE_YEARS, LEASE_TERM_QUARTERS, availablePlaneTemplates, countBoughtPlanes, countLeasedPlanes, maxLeasedPlanes, quotePlaneAcquisition } from '../domain/fleet.js';
import { fmt, getCity } from '../domain/helpers.js';
import { escapeAttr, escapeHtml } from './html.js';
import { showModal } from './modal.js';

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
    <span>租期上限 <strong>40 季</strong></span>
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

export function showFleetPanel(state) {
  let html = '<h2>机队管理</h2>';
  if (state.fleet.length === 0) {
    html += '<p class="modal-empty modal-empty-compact">尚未拥有飞机，请先购买。</p>';
  } else {
    const routeByPlaneUid = new Map();
    state.routes.forEach((route) => {
      (route.assignedPlanes || []).forEach((uid) => {
        if (!routeByPlaneUid.has(uid)) routeByPlaneUid.set(uid, route);
      });
    });
    state.fleet.forEach((p) => {
      const assignedRoute = routeByPlaneUid.get(p.uid);
      const status = p.delivering ? `交付中 (${p.deliverIn}回合)` : assignedRoute ? `${getCity(assignedRoute.from).name}→${getCity(assignedRoute.to).name}` : '空闲';
      const statusClass = p.delivering ? 'status-delivering' : assignedRoute ? 'status-assigned' : 'status-idle';
      const lifecycleMeta = fleetLifecycleMeta(p);
      const action = p.isLease ? 'return-lease' : 'sell-plane';
      const actionLabel = p.isLease ? '退租' : '出售';
      html += `<div class="fleet-item"><div class="fleet-item-main"><span class="name">${escapeHtml(p.name)}</span>${lifecycleMeta}<span class="fleet-age">机龄${p.age.toFixed(1)}年</span></div><div class="fleet-item-side"><span class="status ${statusClass}">${escapeHtml(status)}</span>${!p.delivering && !assignedRoute ? `<button class="btn btn-danger btn-sm" type="button" data-action="${action}" data-uid="${escapeAttr(p.uid)}">${actionLabel}</button>` : ''}</div></div>`;
    });
  }
  html += '<div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">关闭</button></div>';
  showModal(html);
}

function fleetLifecycleMeta(plane) {
  if (plane.isLease) {
    const leaseTurns = Math.max(0, Number(plane.leaseTurns) || 0);
    const maxLeaseTurns = Math.max(1, Number(plane.maxLeaseTurns) || LEASE_TERM_QUARTERS);
    const remainingTurns = Math.max(0, maxLeaseTurns - leaseTurns);
    const warningClass = remainingTurns <= 4 ? ' fleet-lifecycle-warning' : '';
    const label = remainingTurns <= 4 ? `剩余${remainingTurns}季` : `租${leaseTurns}/${maxLeaseTurns}季`;
    return `<span class="lease-badge">R</span><span class="fleet-lease-meta${warningClass}">${label}</span>`;
  }
  const age = Math.max(0, Number(plane.age) || 0);
  if (age < AIRCRAFT_RETIREMENT_AGE_YEARS - 2) return '';
  return `<span class="fleet-lifecycle-warning">距退役${Math.max(0, AIRCRAFT_RETIREMENT_AGE_YEARS - age).toFixed(1)}年</span>`;
}
