import { baseDemand, calcLoadFactor, routeCost, routeRevenue, suggestedPrice } from '../domain/economy.js';
import { availablePlaneTemplates } from '../domain/fleet.js';
import { byId, cityDist, clamp, fmt, fmtPct, getCity } from '../domain/helpers.js';
import { availablePlanes, findRoute, routeOpenCost } from '../domain/routes.js';
import { escapeAttr, escapeHtml } from './html.js';
import { renderMarketCard } from './market.js';
import { renderModalRoot, showModal, showRouteModal } from './modal.js';

let routeListSort = { key: 'profit', dir: 'desc' };
let routeListPage = 0;
let routeListPageSize = 10;

export function showRouteCreateModal(state, from, to, competitors) {
  const a = getCity(from);
  const b = getCity(to);
  if (!a || !b) return false;
  const distance = cityDist(a, b);
  const sp = suggestedPrice(from, to);
  const openCost = routeOpenCost(from, to);
  const canAfford = state.cash >= openCost;
  const avail = availablePlanes(state).filter((p) => p.range >= distance);
  if (avail.length === 0) {
    const longRange = availablePlaneTemplates(state).find((p) => p.range >= distance);
    const hint = longRange ? `如 ${longRange.name}` : '当前时代暂无航程足够的机型';
    showModal(`<h2>无法开通航线</h2><p>航程 ${Math.round(distance)} km，没有航程足够的可用飞机。</p><p>请先购买航程足够的飞机，${hint}。</p><button class="btn btn-primary" data-action="close-modal">确定</button>`);
    return false;
  }
  const demand = baseDemand(a, b, state);
  let html = `<h2>开通航线</h2><div class="route-preview">
    <div style="font-size:24px;font-weight:700;margin-bottom:10px;text-align:center">${a.name} ✈ ${b.name}</div>
    <div class="route-market-strip">${renderMarketCard(state, a)}${renderMarketCard(state, b)}</div>
    <div class="r-field"><span class="r-label">起飞城市</span><span class="r-val">${a.name}</span></div>
    <div class="r-field"><span class="r-label">到达城市</span><span class="r-val">${b.name}</span></div>
    <div class="r-field"><span class="r-label">距离</span><span class="r-val">${Math.round(distance)} km</span></div>
    <div class="r-field"><span class="r-label">基础需求</span><span class="r-val">${demand} 人/季</span></div>
    <div class="r-field"><span class="r-label">竞争航线</span><span class="r-val">${competitors} 条</span></div>
    <div class="r-field"><span class="r-label">建议票价</span><span class="r-val">$${sp}</span></div>
    <div class="r-field route-open-cost${canAfford ? '' : ' unaffordable'}"><span class="r-label">开通费用</span><span class="r-val">${fmt(openCost)}</span></div>
    ${canAfford ? '' : '<div class="route-cost-warning">资金不足，无法开通此航线</div>'}
  </div><h3>分配飞机</h3><select id="route-plane" data-action="route-price-preview" style="width:100%;padding:8px;background:#0a1628;color:#e0e8f0;border:1px solid #1e3a5f;border-radius:4px;font-size:13px"${canAfford ? '' : ' disabled'}>`;
  avail.forEach((p) => {
    html += `<option value="${p.uid}">${escapeHtml(p.name)}${p.isLease ? ' [R]' : ''} (${p.seats}座, 航程${p.range}km)</option>`;
  });
  html += `</select><h3>票价设置</h3><input type="range" id="route-price" min="${Math.round(sp * 0.5)}" max="${Math.round(sp * 1.5)}" value="${sp}" class="price-slider" data-action="route-price-preview" data-from="${from}" data-to="${to}" data-competitors="${competitors}"><div class="route-forecast-grid">
      <span><small>当前票价</small><strong id="price-val">$${sp}</strong></span>
      <span><small>预估客座率</small><strong id="price-est-load">--</strong></span>
      <span><small>预估季度利润</small><strong id="price-est-profit">--</strong></span>
      <span><small>开通后现金</small><strong class="${state.cash - openCost >= 0 ? 'positive' : 'negative'}">${fmt(state.cash - openCost)}</strong></span>
    </div>
    <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap"><span style="font-size:11px;color:#7ba3cc;line-height:26px;margin-right:2px">快捷:</span>${[-50, -25, 0, 25, 50].map((pct) => `<button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" data-action="set-route-price-preset" data-base-price="${sp}" data-pct="${pct}">${pct > 0 ? '+' : ''}${pct}%</button>`).join('')}</div>
    <div style="margin-top:16px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0;margin-right:8px" data-action="close-modal">取消</button><button class="btn btn-success" data-action="confirm-open-route" data-from="${from}" data-to="${to}"${canAfford ? '' : ' disabled'}>确认开通</button></div>`;
  showRouteModal(html);
  setTimeout(() => updatePricePreview(state), 100);
  return true;
}

export function updatePricePreview(state) {
  const slider = byId('route-price');
  const select = byId('route-plane');
  if (!slider || !select) return;
  const price = Number(slider.value);
  if (!Number.isFinite(price) || price <= 0) return;
  const priceLabel = byId('price-val');
  if (priceLabel) priceLabel.textContent = '$' + price;
  const planeUid = parseInt(select.value, 10);
  if (!state.fleet.some((f) => f.uid === planeUid)) return;
  const from = slider.dataset.from;
  const to = slider.dataset.to;
  if (!from || !to) return;
  const route = {
    from,
    to,
    price,
    suggestedPrice: suggestedPrice(from, to),
    serviceMultiplier: 1,
    assignedPlanes: [planeUid],
    loadFactor: 0,
  };
  const competitors = parseInt(slider.dataset.competitors || '0', 10);
  route.loadFactor = calcLoadFactor(state, route, price, state.brand, competitors);
  const revenue = routeRevenue(state, route);
  const cost = routeCost(state, route);
  const profit = revenue.total - cost.total;
  const loadLabel = byId('price-est-load');
  const profitLabel = byId('price-est-profit');
  if (loadLabel) {
    loadLabel.textContent = fmtPct(route.loadFactor * 100);
    loadLabel.className = route.loadFactor >= 0.7 ? 'positive' : route.loadFactor >= 0.5 ? 'warning' : 'negative';
  }
  if (profitLabel) {
    profitLabel.textContent = `${profit >= 0 ? '+' : ''}${fmt(profit)}`;
    profitLabel.className = profit >= 0 ? 'positive' : 'negative';
  }
}

export function setRoutePricePreset(basePrice, pct) {
  const slider = byId('route-price');
  if (!slider) return;
  const price = Math.round(basePrice * (1 + pct / 100));
  slider.value = clamp(price, Number(slider.min), Number(slider.max));
  slider.dispatchEvent(new Event('input', { bubbles: true }));
}

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
    showModal(`<h2>航线管理</h2><p style="color:#556">尚未开通航线。</p><div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="close-modal">关闭</button></div>`);
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
  let html = `<h2>航线管理</h2><div class="route-table-wrap"><table class="route-table"><thead><tr>`;
  cols.forEach((col) => {
    const cls = routeListSort.key === col.key ? (routeListSort.dir === 'asc' ? 'sorted-asc' : 'sorted-desc') : '';
    html += `<th class="${cls}" data-action="route-list-sort" data-sort-key="${col.key}" title="${col.label}">${col.icon} <span style="font-size:10px">${col.label}</span></th>`;
  });
  html += '<th class="no-sort" title="操作">操作</th></tr></thead><tbody>';
  pageRows.forEach((row) => {
    html += renderRouteRow(row);
  });
  html += `</tbody></table></div><div class="route-card-list">${pageRows.map(renderRouteCard).join('')}</div>${renderPagination(totalPages)}<div style="margin-top:8px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="close-modal">关闭</button></div>`;
  renderModalRoot(`<div class="modal-overlay" data-action="modal-backdrop"><div class="modal route-list-modal" style="position:relative">${html}</div></div>`);
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
  const presets = [-50, -25, 0, 25, 50].map((pct) => `<button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" data-action="set-adjust-price-preset" data-base-price="${sp}" data-pct="${pct}">${pct > 0 ? '+' : ''}${pct}%</button>`).join('');
  showModal(`<h2>调价 - ${a.name} → ${b.name}</h2>
    <div style="display:flex;justify-content:space-between;margin:10px 0;font-size:14px"><span style="color:#7ba3cc">基础票价</span><span>$${sp}</span></div>
    <div style="display:flex;justify-content:space-between;margin:6px 0;font-size:14px"><span style="color:#7ba3cc">当前票价</span><span style="font-weight:700">$${route.price} (${currentPct >= 0 ? '+' : ''}${currentPct}%)</span></div>
    <input type="range" id="adj-price-slider" min="${Math.round(sp * 0.5)}" max="${Math.round(sp * 1.5)}" value="${route.price}" class="price-slider" data-action="adjust-price-preview">
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#556;margin-top:2px"><span>$${Math.round(sp * 0.5)}</span><span id="adj-price-val">$${route.price}</span><span>$${Math.round(sp * 1.5)}</span></div>
    <div style="display:flex;gap:4px;margin-top:10px;flex-wrap:wrap"><span style="font-size:11px;color:#7ba3cc;line-height:26px;margin-right:2px">快捷:</span>${presets}</div>
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" style="background:#334155;color:#e0e8f0" data-action="return-route-list">取消</button>
      <button class="btn btn-success" data-action="confirm-price-adjust" data-from="${escapeAttr(route.from)}" data-to="${escapeAttr(route.to)}">确认调价</button>
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
    <p style="font-size:15px;margin:10px 0">确定停飞 <strong>${a.name} → ${b.name}</strong> 航线？</p>
    <p style="color:#d97706;font-size:13px">停飞后客座率和收入归零，但执飞飞机仍处于占用状态。</p>
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" style="background:#334155;color:#e0e8f0" data-action="return-route-list">取消</button>
      <button class="btn btn-danger" data-action="confirm-suspend-route" data-from="${escapeAttr(route.from)}" data-to="${escapeAttr(route.to)}">确认停飞</button>
    </div>`);
}

export function showRouteResumeConfirm(state, from, to) {
  const route = findRoute(state, from, to);
  if (!route) return;
  const a = getCity(route.from);
  const b = getCity(route.to);
  showModal(`<h2>复飞航线</h2>
    <p style="font-size:15px;margin:10px 0">确定复飞 <strong>${a.name} → ${b.name}</strong> 航线？</p>
    <p style="color:#16a34a;font-size:13px">复飞后航线将在下季度恢复运营并产生收益。</p>
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" style="background:#334155;color:#e0e8f0" data-action="return-route-list">取消</button>
      <button class="btn btn-success" data-action="confirm-resume-route" data-from="${escapeAttr(route.from)}" data-to="${escapeAttr(route.to)}">确认复飞</button>
    </div>`);
}

export function showRouteCloseConfirm(state, from, to) {
  const route = findRoute(state, from, to);
  if (!route) return;
  const a = getCity(route.from);
  const b = getCity(route.to);
  showModal(`<h2>关闭航线</h2>
    <p style="font-size:15px;margin:10px 0">确定关闭 <strong>${a.name} → ${b.name}</strong> 航线？</p>
    <p style="color:#f87171;font-size:13px">关闭后该航线将失去收益，飞机将变为空闲可用状态。</p>
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" style="background:#334155;color:#e0e8f0" data-action="return-route-list">取消</button>
      <button class="btn btn-danger" data-action="close-route" data-from="${escapeAttr(route.from)}" data-to="${escapeAttr(route.to)}">确认关闭</button>
    </div>`);
}

export function showRouteChangePlaneModal(state, from, to) {
  const route = findRoute(state, from, to);
  if (!route) return;
  const a = getCity(route.from);
  const b = getCity(route.to);
  const distance = cityDist(a, b);
  const currentPlanes = (route.assignedPlanes || []).map((uid) => state.fleet.find((f) => f.uid === uid)).filter(Boolean);
  const currentInfo = currentPlanes.map((plane) => `${plane.name}${plane.isLease ? ' [R]' : ''} (${plane.seats}座)`).join('、') || '无';
  const avail = availablePlanes(state).filter((plane) => plane.range >= distance);
  if (avail.length === 0) {
    showModal(`<h2>更换机型</h2><p style="margin:10px 0">${a.name} → ${b.name}</p><p>当前执飞：${escapeHtml(currentInfo)}</p><p style="color:#f87171;margin-top:8px">没有可用的替代飞机（需航程 ≥ ${Math.round(distance)} km）。</p><div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="return-route-list">返回</button></div>`);
    return;
  }
  let html = `<h2>更换机型</h2>
    <p style="font-size:14px;margin-bottom:8px">${a.name} → ${b.name} <span style="color:#7ba3cc">(航程 ${Math.round(distance)} km)</span></p>
    <p style="font-size:13px;color:#7ba3cc;margin-bottom:10px">当前执飞：${escapeHtml(currentInfo)}</p>
    <h3>选择新飞机</h3><div style="max-height:220px;overflow-y:auto;background:#0a1628;border-radius:6px;padding:4px">`;
  avail.forEach((plane) => {
    html += `<button type="button" data-action="change-route-plane" data-from="${escapeAttr(route.from)}" data-to="${escapeAttr(route.to)}" data-uid="${plane.uid}" style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border:0;border-bottom:1px solid #1a2d48;background:transparent;color:#e0e8f0;cursor:pointer;text-align:left">
      <span><span style="font-weight:600">${escapeHtml(plane.name)}${plane.isLease ? ' <span style="color:#fbbf24;font-size:10px">[R]</span>' : ''}</span><span style="color:#7ba3cc;font-size:12px;margin-left:8px">${plane.seats}座 | 航程${plane.range}km</span></span>
      <span style="color:#4ade80;font-size:12px">选择</span>
    </button>`;
  });
  html += '</div><div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="return-route-list">取消</button></div>';
  showModal(html);
}

function buildRouteRows(state) {
  return state.routes.flatMap((route) => {
    const a = getCity(route.from);
    const b = getCity(route.to);
    if (!a || !b) return [];
    const distance = cityDist(a, b);
    const routeSuggestedPrice = route.suggestedPrice || suggestedPrice(route.from, route.to);
    const routePrice = Number.isFinite(route.price) ? route.price : routeSuggestedPrice;
    const assignedPlanes = route.assignedPlanes || [];
    const planeInfo = assignedPlanes.map((uid) => {
      const plane = state.fleet.find((f) => f.uid === uid);
      return plane ? `${escapeHtml(plane.name)}${plane.isLease ? '<span style="font-size:12px;color:#fbbf24"> [R]</span>' : ''}` : '?';
    }).join(', ');
    const planeInfoPlain = assignedPlanes.map((uid) => {
      const plane = state.fleet.find((f) => f.uid === uid);
      return plane ? `${plane.name}${plane.isLease ? ' [R]' : ''}` : '?';
    }).join(', ');
    const priceCoeff = (routePrice / routeSuggestedPrice * 100 - 100);
    return {
      from: a.name,
      to: b.name,
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
  const suspendedBadge = row.suspended ? '<span style="color:#f87171;font-size:10px;margin-left:4px;font-weight:700">停飞中</span>' : '';
  const lfDisplay = row.suspended ? '0%' : row.reopened ? '<span style="color:#60a5fa;font-weight:700;font-size:13px">reopen</span>' : row.isNew ? '<span style="color:#fbbf24;font-weight:700;font-size:13px">new</span>' : changed ? `${lastLfPct}<span style="font-size:10px;margin-left:2px" title="数据下季度可能变化">${lfTrend}</span>` : lfPct;
  const profitDisplay = row.suspended ? '--' : row.reopened ? '<span style="color:#60a5fa;font-weight:700;font-size:13px">reopen</span>' : row.isNew ? '<span style="color:#fbbf24;font-weight:700;font-size:13px">new</span>' : changed ? `<span class="${lastProfitClass}">${fmt(row.lastProfit)}</span><span style="font-size:10px;margin-left:2px" title="数据下季度可能变化">${profitTrend}</span>` : `<span class="${profitClass}">${fmt(row.profit)}</span>`;
  const changeIcon = changed ? '<span style="color:#fbbf24;font-size:10px;margin-left:2px" title="本季度调整过票价或机型">🔄</span>' : '';
  const suspendButton = row.suspended
    ? `<button class="btn btn-sm" style="background:${row.resumeCooldown ? '#1e3a5f' : '#16a34a'};color:#fff;padding:2px 6px;font-size:13px${row.resumeCooldown ? ';cursor:not-allowed;opacity:0.4' : ''}" data-action="${row.resumeCooldown ? 'noop' : 'toggle-route-suspend'}" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}" title="${row.resumeCooldown ? '需推进1回合后才能复飞' : '复飞'}">▶</button>`
    : `<button class="btn btn-sm" style="background:${row.suspendCooldown ? '#1e3a5f' : '#6b7280'};color:#fff;padding:2px 6px;font-size:13px${row.suspendCooldown ? ';cursor:not-allowed;opacity:0.4' : ''}" data-action="${row.suspendCooldown ? 'noop' : 'toggle-route-suspend'}" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}" title="${row.suspendCooldown ? '需推进1回合后才能停飞' : '停飞'}">⏸</button>`;
  return `<tr${row.suspended ? ' style="opacity:0.5"' : ''}>
    <td>${escapeHtml(row.from)}${suspendedBadge}</td>
    <td>${escapeHtml(row.to)}</td>
    <td>${row.dist}km</td>
    <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeAttr(row.planesPlain)}">${row.planes}${row.planeChanged ? changeIcon : ''}</td>
    <td>${row.suspended ? '--' : row.priceCoeffStr}${!row.suspended && row.priceAdjusted ? changeIcon : ''}</td>
    <td>${lfDisplay}</td>
    <td>${profitDisplay}</td>
    <td style="white-space:nowrap">
      ${row.suspended ? '' : `<button class="btn btn-sm" style="background:#2563eb;color:#fff;padding:2px 6px;font-size:12px" data-action="open-route-price-adjust" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}" title="调整票价">💰</button>
      <button class="btn btn-sm" style="background:#d97706;color:#fff;padding:2px 6px;font-size:12px" data-action="open-route-change-plane" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}" title="更换机型">✈</button>`}
      ${suspendButton}
      <button class="btn btn-sm" style="background:#dc2626;color:#fff;padding:2px 6px;font-size:12px" data-action="confirm-close-route" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}" title="关闭航线">✕</button>
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
    <div class="route-card-actions">
      ${row.suspended ? '' : `<button class="btn btn-sm" data-action="open-route-price-adjust" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}">调价</button>
      <button class="btn btn-sm" data-action="open-route-change-plane" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}">换机</button>`}
      <button class="btn btn-sm" data-action="${suspendDisabled ? 'noop' : 'toggle-route-suspend'}" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}"${suspendDisabled ? ' disabled' : ''}>${suspendAction}</button>
      <button class="btn btn-danger btn-sm" data-action="confirm-close-route" data-from="${escapeAttr(row.fromId)}" data-to="${escapeAttr(row.toId)}">关闭</button>
    </div>
  </div>`;
}

function renderPagination(totalPages) {
  return `<div class="route-page-info">
    <div>
      <span>第 ${routeListPage + 1}/${totalPages} 页</span>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:1px 8px;font-size:11px;margin-left:6px" data-action="route-list-page" data-page="0">首</button>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:1px 8px;font-size:11px" data-action="route-list-page" data-page="${Math.max(0, routeListPage - 1)}">‹</button>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:1px 8px;font-size:11px" data-action="route-list-page" data-page="${Math.min(totalPages - 1, routeListPage + 1)}">›</button>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:1px 8px;font-size:11px" data-action="route-list-page" data-page="${totalPages - 1}">末</button>
    </div>
    <div>
      <span>每页</span>
      ${[10, 20].map((size) => `<button class="btn btn-sm" style="${routeListPageSize === size ? 'background:#2563eb;color:#fff' : 'background:#334155;color:#e0e8f0'};padding:1px 8px;font-size:11px;margin-left:4px" data-action="route-list-page-size" data-page-size="${size}">${size}</button>`).join('')}
    </div>
  </div>`;
}

function formatPriceCoeff(value) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}%`;
  if (rounded === 0) return '0%';
  return `${rounded}%`;
}
