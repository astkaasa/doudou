import { baseDemand, calcLoadFactor, routeCost, routeRevenue, suggestedPrice } from '../domain/economy.js';
import { availablePlaneTemplates } from '../domain/fleet.js';
import { byId, cityDist, fmt, fmtPct, getCity } from '../domain/helpers.js';
import { availablePlanes } from '../domain/routes.js';
import { showModal, showRouteModal } from './modal.js';

export function showRouteCreateModal(state, from, to, competitors) {
  const a = getCity(from);
  const b = getCity(to);
  if (!a || !b) return false;
  const distance = cityDist(a, b);
  const sp = suggestedPrice(from, to);
  const avail = availablePlanes(state).filter((p) => p.range >= distance);
  if (avail.length === 0) {
    const longRange = availablePlaneTemplates(state).find((p) => p.range >= distance);
    const hint = longRange ? `如 ${longRange.name}` : '当前时代暂无航程足够的机型';
    showModal(`<h2>无法开通航线</h2><p>航程 ${Math.round(distance)} km，没有航程足够的可用飞机。</p><p>请先购买航程足够的飞机，${hint}。</p><button class="btn btn-primary" data-action="close-modal">确定</button>`);
    return false;
  }
  const demand = baseDemand(a, b);
  let html = `<h2>开通航线</h2><div class="route-preview">
    <div style="font-size:24px;font-weight:700;margin-bottom:10px;text-align:center">${a.name} ✈ ${b.name}</div>
    <div class="r-field"><span class="r-label">起飞城市</span><span class="r-val">${a.name}</span></div>
    <div class="r-field"><span class="r-label">到达城市</span><span class="r-val">${b.name}</span></div>
    <div class="r-field"><span class="r-label">距离</span><span class="r-val">${Math.round(distance)} km</span></div>
    <div class="r-field"><span class="r-label">基础需求</span><span class="r-val">${demand} 人/季</span></div>
    <div class="r-field"><span class="r-label">竞争航线</span><span class="r-val">${competitors} 条</span></div>
    <div class="r-field"><span class="r-label">建议票价</span><span class="r-val">$${sp}</span></div>
  </div><h3>分配飞机</h3><select id="route-plane" data-action="route-price-preview" style="width:100%;padding:8px;background:#0a1628;color:#e0e8f0;border:1px solid #1e3a5f;border-radius:4px;font-size:13px">`;
  avail.forEach((p) => {
    html += `<option value="${p.uid}">${p.name} (${p.seats}座, 航程${p.range}km)</option>`;
  });
  html += `</select><h3>票价设置</h3><input type="range" id="route-price" min="${Math.round(sp * 0.4)}" max="${Math.round(sp * 2)}" value="${sp}" class="price-slider" data-action="route-price-preview" data-from="${from}" data-to="${to}" data-competitors="${competitors}"><div class="price-display"><span id="price-val">$${sp}</span><span id="price-est">预估客座率: --</span></div><div style="margin-top:16px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0;margin-right:8px" data-action="close-modal">取消</button><button class="btn btn-success" data-action="confirm-open-route" data-from="${from}" data-to="${to}">确认开通</button></div>`;
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
  byId('price-val').textContent = '$' + price;
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
    frequency: 1,
    assignedPlanes: [planeUid],
    loadFactor: 0,
  };
  const competitors = parseInt(slider.dataset.competitors || '0', 10);
  route.loadFactor = calcLoadFactor(state, route, price, state.brand, competitors);
  const revenue = routeRevenue(state, route);
  const cost = routeCost(state, route);
  byId('price-est').textContent = `预估客座率: ${fmtPct(route.loadFactor * 100)} | 利润: ${fmt(revenue.total - cost.total)}`;
}

export function showRouteList(state) {
  let html = '<h2>航线详情</h2>';
  if (state.routes.length === 0) {
    html += '<p style="color:#556">尚未开通航线。</p>';
  } else {
    state.routes.forEach((r) => {
      const a = getCity(r.from);
      const b = getCity(r.to);
      const color = r.profit >= 0 ? '#4ade80' : '#f0a0a0';
      const planeInfo = (r.assignedPlanes || []).map((uid) => {
        const plane = state.fleet.find((f) => f.uid === uid);
        return plane ? `${plane.name}${plane.isLease ? ' [R]' : ''}` : '?';
      }).join(', ');
      html += `<div class="route-item" style="cursor:default"><div style="display:flex;justify-content:space-between;font-weight:600"><span>${a.name} → ${b.name}</span><span data-route-profit style="color:${color}">${fmt(r.profit)}</span></div><div style="display:flex;gap:12px;font-size:11px;color:#556;margin-top:4px"><span data-route-price>票价$${r.price}</span><span data-route-load>客座率${fmtPct(r.loadFactor * 100)}</span><span data-route-revenue>收入${fmt(r.revenue)}</span><span data-route-cost>成本${fmt(r.cost)}</span></div><div style="font-size:11px;color:#7ba3cc;margin-top:2px">执飞: ${planeInfo}</div><div style="margin-top:6px;display:flex;gap:4px;align-items:center"><span style="font-size:11px;color:#556">调价:</span><input type="range" min="${Math.round(r.suggestedPrice * 0.4)}" max="${Math.round(r.suggestedPrice * 2)}" value="${r.price}" style="width:120px" data-action="adjust-price" data-from="${r.from}" data-to="${r.to}"><span style="font-size:12px;min-width:40px" id="ap-${r.from}-${r.to}">$${r.price}</span></div><div style="margin-top:4px"><button class="btn btn-danger btn-sm" data-action="close-route" data-from="${r.from}" data-to="${r.to}">关闭航线</button></div></div>`;
    });
  }
  html += '<div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="close-modal">关闭</button></div>';
  showModal(html);
}
