import { baseDemand, calcLoadFactor, routeCost, routeOperatingDistance, routeRevenue, routeSeatCapacity, suggestedPrice } from '../domain/economy.js';
import { airportDisplayCode, airportFeeMultiplier, getDefaultAirportIdForYear, getPlayableAirportsForCity } from '../domain/airports.js';
import { routePlanePerformance } from '../domain/airportPerformance.js';
import { airportCapacitySnapshot } from '../domain/airportCapacity.js';
import { availablePlaneTemplates } from '../domain/fleet.js';
import { byId, cityDist, clamp, fmt, fmtPct, getCity } from '../domain/helpers.js';
import { availablePlanes, routeOpenCost } from '../domain/routes.js';
import { escapeAttr, escapeHtml } from './html.js';
import { renderMarketCard } from './market.js';
import { showModal, showRouteModal } from './modal.js';

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
  let html = `<div class="route-modal-body"><h2>开通航线</h2><div class="route-preview">
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
    </div><div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">取消</button><button class="btn btn-success" id="confirm-open-route" type="button" data-action="confirm-open-route" data-from="${escapeAttr(from)}" data-to="${escapeAttr(to)}"${canAfford ? '' : ' disabled'}>确认开通</button></div>`;
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
  return getPlayableAirportsForCity(cityId, { year: state.year, quarter: state.quarter })
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

function renderPricePresetButtons(action, basePrice) {
  const buttons = [-50, -25, 0, 25, 50]
    .map((pct) => `<button class="btn btn-secondary btn-sm route-preset-btn" type="button" data-action="${escapeAttr(action)}" data-base-price="${basePrice}" data-pct="${pct}">${pct > 0 ? '+' : ''}${pct}%</button>`)
    .join('');
  return `<div class="route-preset-row"><span class="route-preset-label">快捷:</span>${buttons}</div>`;
}
