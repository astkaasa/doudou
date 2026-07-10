import { baseDemand, calcLoadFactor, routeCost, routeOperatingDistance, routeRevenue, routeSeatCapacity, suggestedPrice } from '../domain/economy.js';
import { airportDisplayCode, airportFeeMultiplier, getAirport, getDefaultAirportIdForYear, getPlayableAirportsForCity } from '../domain/airports.js';
import { routePlanePerformance } from '../domain/airportPerformance.js';
import { airportCapacitySnapshot, routeHubDemandMultiplier } from '../domain/airportCapacity.js';
import { availablePlaneTemplates } from '../domain/fleet.js';
import { byId, cityDist, clamp, fmt, fmtPct, getCity } from '../domain/helpers.js';
import { availablePlanes, findRoute, routeOpenCost } from '../domain/routes.js';
import { getRouteAlternateOptions, routeAlternateSummary } from '../domain/airportResilience.js';
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
  const marketDistance = cityDist(a, b);
  const fromAirports = routeAirportOptions(state, from);
  const toAirports = routeAirportOptions(state, to);
  const allAvailable = availablePlanes(state);
  const initialPair = selectInitialAirportPair(
    from,
    to,
    fromAirports,
    toAirports,
    allAvailable,
    state,
    getDefaultAirportIdForYear(from, state.year),
    getDefaultAirportIdForYear(to, state.year),
  );
  const routeDraft = { from, to, ...initialPair };
  const distance = routeOperatingDistance(routeDraft, a, b);
  const sp = suggestedPrice(from, to);
  const avail = allAvailable.filter((plane) => planeCanOperateRoute(state, routeDraft, plane, distance));
  if (avail.length === 0) {
    const longRange = availablePlaneTemplates(state).find((p) => p.range >= distance);
    const hint = longRange ? `如 ${longRange.name}` : '当前时代暂无航程足够的机型';
    showModal(`<h2>无法开通航线</h2><p>当前默认机场组合的运营距离为 ${Math.round(distance)} km，没有航程与机场性能都适配的可用飞机。</p><p>请先购买合适飞机，${escapeHtml(hint)}。</p><button class="btn btn-primary" type="button" data-action="close-modal">确定</button>`);
    return false;
  }
  const initialPlane = avail[0];
  const openCost = routeOpenCost(from, to, { state, route: routeDraft, plane: initialPlane });
  const canAfford = state.cash >= openCost;
  const demand = baseDemand(a, b, state);
  let html = `<h2>开通航线</h2><div class="route-preview">
    <div class="route-title">${escapeHtml(a.name)} ✈ ${escapeHtml(b.name)}</div>
    <div class="route-market-strip">${renderMarketCard(state, a)}${renderMarketCard(state, b)}</div>
    ${renderAirportField('route-from-airport', '起飞机场', fromAirports, initialPair.fromAirportId)}
    ${renderAirportField('route-to-airport', '到达机场', toAirports, initialPair.toAirportId)}
    <div class="r-field"><span class="r-label">市场距离</span><span class="r-val">${Math.round(marketDistance)} km</span></div>
    <div class="r-field"><span class="r-label">运营距离</span><span class="r-val" id="route-operating-distance">${Math.round(distance)} km</span></div>
    <div class="r-field"><span class="r-label">机场费系数</span><span class="r-val" id="route-airport-fee">×${routeAirportFeeFactor(routeDraft).toFixed(2)}</span></div>
    <div class="r-field"><span class="r-label">容量余量</span><span class="r-val route-capacity-value" id="route-capacity-status">${escapeHtml(routeCapacityText(state, routeDraft, initialPlane))}</span></div>
    <div class="r-field"><span class="r-label">基础需求</span><span class="r-val">${demand} 人/季</span></div>
    <div class="r-field"><span class="r-label">竞争航线</span><span class="r-val">${competitors} 条</span></div>
    <div class="r-field"><span class="r-label">建议票价</span><span class="r-val">$${sp}</span></div>
    <div id="route-open-cost-row" class="r-field route-open-cost${canAfford ? '' : ' unaffordable'}"><span class="r-label">开通费用</span><span class="r-val" id="route-open-cost-value">${fmt(openCost)}</span></div>
    <div id="route-cost-warning" class="route-cost-warning"${canAfford ? ' hidden' : ''}>资金不足，无法开通此航线</div>
  </div><h3>分配飞机</h3><select id="route-plane" class="route-plane-select" data-action="route-price-preview"${canAfford ? '' : ' disabled'}>`;
  allAvailable.forEach((plane) => {
    const performance = routePlanePerformance(routeDraft, plane, state);
    const disabled = !planeCanOperateRoute(state, routeDraft, plane, distance);
    const capacity = performance.compatible ? Math.floor(plane.seats * performance.factor) : 0;
    html += `<option value="${escapeAttr(plane.uid)}"${disabled ? ' disabled' : ''}>${escapeHtml(plane.name)}${plane.isLease ? ' [R]' : ''} (${capacity}/${plane.seats}座, 航程${plane.range}km)</option>`;
  });
  html += `</select><p id="airport-performance-note" class="route-airport-performance"></p><h3>票价设置</h3><input type="range" id="route-price" min="${Math.round(sp * 0.5)}" max="${Math.round(sp * 1.5)}" value="${sp}" class="price-slider" data-action="route-price-preview" data-from="${escapeAttr(from)}" data-to="${escapeAttr(to)}" data-competitors="${competitors}"><div class="route-forecast-grid">
      <span><small>当前票价</small><strong id="price-val">$${sp}</strong></span>
      <span><small>预估客座率</small><strong id="price-est-load">--</strong></span>
      <span><small>预估季度利润</small><strong id="price-est-profit">--</strong></span>
      <span><small>有效座位</small><strong id="price-est-capacity">--</strong></span>
      <span><small>开通后现金</small><strong id="route-cash-after" class="${state.cash - openCost >= 0 ? 'positive' : 'negative'}">${fmt(state.cash - openCost)}</strong></span>
    </div>
    ${renderPricePresetButtons('set-route-price-preset', sp)}
    <div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">取消</button><button class="btn btn-success" id="confirm-open-route" type="button" data-action="confirm-open-route" data-from="${escapeAttr(from)}" data-to="${escapeAttr(to)}"${canAfford ? '' : ' disabled'}>确认开通</button></div>`;
  showRouteModal(html);
  setTimeout(() => updatePricePreview(state), 100);
  return true;
}

export function updatePricePreview(state) {
  const slider = byId('route-price');
  const select = byId('route-plane');
  const fromAirportSelect = byId('route-from-airport');
  const toAirportSelect = byId('route-to-airport');
  if (!slider || !select || !fromAirportSelect || !toAirportSelect) return;
  const price = Number(slider.value);
  if (!Number.isFinite(price) || price <= 0) return;
  const priceLabel = byId('price-val');
  if (priceLabel) priceLabel.textContent = '$' + price;
  const from = slider.dataset.from;
  const to = slider.dataset.to;
  if (!from || !to) return;
  const route = {
    from,
    to,
    fromAirportId: fromAirportSelect.value,
    toAirportId: toAirportSelect.value,
    price,
    suggestedPrice: suggestedPrice(from, to),
    serviceMultiplier: 1,
    assignedPlanes: [],
    loadFactor: 0,
  };
  const distance = routeOperatingDistance(route);
  const distanceLabel = byId('route-operating-distance');
  if (distanceLabel) distanceLabel.textContent = `${Math.round(distance)} km`;
  const feeLabel = byId('route-airport-fee');
  if (feeLabel) feeLabel.textContent = `×${routeAirportFeeFactor(route).toFixed(2)}`;
  const usableOptions = [...select.options].filter((option) => {
    const plane = state.fleet.find((item) => item.uid === Number(option.value));
    if (!plane) return false;
    const performance = routePlanePerformance(route, plane, state);
    option.disabled = !performance.compatible || plane.range < distance;
    const capacity = performance.compatible ? Math.floor(plane.seats * performance.factor) : 0;
    option.textContent = `${plane.name}${plane.isLease ? ' [R]' : ''} (${capacity}/${plane.seats}座, 航程${plane.range}km)`;
    return !option.disabled;
  });
  if (select.selectedOptions[0]?.disabled && usableOptions[0]) select.value = usableOptions[0].value;
  const confirmButton = byId('confirm-open-route');
  if (confirmButton) confirmButton.disabled = usableOptions.length === 0 || state.cash < routeOpenCost(from, to);
  const planeUid = parseInt(select.value, 10);
  const plane = state.fleet.find((item) => item.uid === planeUid);
  const performanceLabel = byId('airport-performance-note');
  if (!plane || usableOptions.length === 0) {
    const reasons = [...new Set([...select.options].flatMap((option) => {
      const candidate = state.fleet.find((item) => item.uid === Number(option.value));
      if (!candidate) return [];
      const performance = routePlanePerformance(route, candidate, state);
      return [
        ...performance.reasons,
        ...(candidate.range < distance ? [`航程不足（需 ${Math.round(distance)}km）`] : []),
      ];
    }))];
    if (performanceLabel) {
      performanceLabel.textContent = reasons.length > 0
        ? `当前机队无法执行：${reasons.join('；')}`
        : '当前机队无法执行所选机场组合';
      performanceLabel.className = 'route-airport-performance negative';
    }
    ['price-est-load', 'price-est-profit', 'price-est-capacity'].forEach((id) => {
      const element = byId(id);
      if (element) {
        element.textContent = '--';
        element.className = '';
      }
    });
    return;
  }
  route.assignedPlanes = [planeUid];
  const openCost = routeOpenCost(from, to, { state, route, plane });
  const openCostValue = byId('route-open-cost-value');
  const openCostRow = byId('route-open-cost-row');
  const costWarning = byId('route-cost-warning');
  const cashAfter = byId('route-cash-after');
  const capacityStatus = byId('route-capacity-status');
  if (openCostValue) openCostValue.textContent = fmt(openCost);
  if (openCostRow) openCostRow.classList.toggle('unaffordable', state.cash < openCost);
  if (costWarning) costWarning.hidden = state.cash >= openCost;
  if (cashAfter) {
    cashAfter.textContent = fmt(state.cash - openCost);
    cashAfter.className = state.cash - openCost >= 0 ? 'positive' : 'negative';
  }
  if (capacityStatus) capacityStatus.textContent = routeCapacityText(state, route, plane);
  if (confirmButton) confirmButton.disabled = usableOptions.length === 0 || state.cash < openCost;
  const competitors = parseInt(slider.dataset.competitors || '0', 10);
  route.loadFactor = calcLoadFactor(state, route, price, state.brand, competitors);
  const revenue = routeRevenue(state, route);
  const cost = routeCost(state, route);
  const profit = revenue.total - cost.total;
  const loadLabel = byId('price-est-load');
  const profitLabel = byId('price-est-profit');
  const capacityLabel = byId('price-est-capacity');
  if (loadLabel) {
    loadLabel.textContent = fmtPct(route.loadFactor * 100);
    loadLabel.className = route.loadFactor >= 0.7 ? 'positive' : route.loadFactor >= 0.5 ? 'warning' : 'negative';
  }
  if (profitLabel) {
    profitLabel.textContent = `${profit >= 0 ? '+' : ''}${fmt(profit)}`;
    profitLabel.className = profit >= 0 ? 'positive' : 'negative';
  }
  if (capacityLabel) capacityLabel.textContent = `${routeSeatCapacity(state, route)} 座`;
  if (performanceLabel) {
    const performance = routePlanePerformance(route, plane, state);
    performanceLabel.className = 'route-airport-performance';
    performanceLabel.textContent = performance.reasons.length > 0
      ? `机场性能：${performance.reasons.join('；')}，有效运力 ${Math.round(performance.factor * 100)}%`
      : '机场性能：无需减载';
  }
}

function routeAirportOptions(state, cityId) {
  const defaultId = getDefaultAirportIdForYear(cityId, state.year);
  return getPlayableAirportsForCity(cityId, { year: state.year })
    .sort((a, b) => Number(b.id === defaultId) - Number(a.id === defaultId)
      || Number(a.source.provider === 'abstract') - Number(b.source.provider === 'abstract')
      || (b.gameplay.capacityTier || 0) - (a.gameplay.capacityTier || 0));
}

function selectedAirportId(airports, preferredId) {
  return airports.some((airport) => airport.id === preferredId) ? preferredId : airports[0]?.id;
}

function renderAirportOptions(airports, selectedId) {
  return airports.map((airport) => {
    const code = airportDisplayCode(airport);
    const runway = airport.source.provider === 'abstract'
      ? '兼容机场'
      : `跑道${airport.factual.maxRunwayM || '—'}m · 费${airport.gameplay.feeTier}`;
    return `<option value="${escapeAttr(airport.id)}"${airport.id === selectedId ? ' selected' : ''}>${escapeHtml(code)} · ${escapeHtml(airport.name)} · ${escapeHtml(runway)}</option>`;
  }).join('');
}

function renderAirportField(id, label, airports, selectedId) {
  if (airports.length === 1) {
    const airport = airports[0];
    const runway = airport.source.provider === 'abstract'
      ? '兼容机场'
      : `${airport.factual.maxRunwayM || '—'}m 跑道 · 费${airport.gameplay.feeTier}`;
    return `<div class="r-field"><span class="r-label">${escapeHtml(label)}</span><input id="${escapeAttr(id)}" type="hidden" value="${escapeAttr(airport.id)}"><span class="r-val route-airport-static">${escapeHtml(airportDisplayCode(airport))} · ${escapeHtml(airport.name)}<small>${escapeHtml(runway)}</small></span></div>`;
  }
  return `<div class="r-field route-airport-field"><label class="r-label" for="${escapeAttr(id)}">${escapeHtml(label)}</label><select id="${escapeAttr(id)}" class="route-airport-select" data-action="route-price-preview">${renderAirportOptions(airports, selectedId)}</select></div>`;
}

function selectInitialAirportPair(from, to, fromAirports, toAirports, planes, state, preferredFrom, preferredTo) {
  const preferredPair = {
    fromAirportId: selectedAirportId(fromAirports, preferredFrom),
    toAirportId: selectedAirportId(toAirports, preferredTo),
  };
  const pairs = [preferredPair];
  fromAirports.forEach((fromAirport) => {
    toAirports.forEach((toAirport) => {
      if (fromAirport.id === preferredPair.fromAirportId && toAirport.id === preferredPair.toAirportId) return;
      pairs.push({ fromAirportId: fromAirport.id, toAirportId: toAirport.id });
    });
  });
  return pairs.find((pair) => {
    const route = { from, to, ...pair };
    const distance = routeOperatingDistance(route);
    return planes.some((plane) => planeCanOperateRoute(state, route, plane, distance));
  }) || preferredPair;
}

function routeAirportFeeFactor(route) {
  return Math.sqrt(airportFeeMultiplier(route.fromAirportId) * airportFeeMultiplier(route.toAirportId));
}

function routeCapacityText(state, route, plane) {
  return [route.fromAirportId, route.toAirportId].map((airportId) => {
    const snapshot = airportCapacitySnapshot(state, airportId, { additionalRoute: route, plane });
    const remaining = Math.floor(snapshot.remaining * 10) / 10;
    return `${airportDisplayCode(airportId)} ${remaining >= 0 ? remaining : `超${Math.abs(remaining)}`}/${snapshot.capacity}`;
  }).join(' · ');
}

function planeCanOperateRoute(state, route, plane, distance = routeOperatingDistance(route)) {
  return plane.range >= distance && routePlanePerformance(route, plane, state).compatible;
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
