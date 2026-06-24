import { PLANES } from '../data/planes.js';
import { baseDemand, calcLoadFactor, routeCost, routeRevenue, suggestedPrice } from '../domain/economy.js';
import { byId, cityDist, fmt, fmtPct, getCity, seasonEmoji, seasonName } from '../domain/helpers.js';
import { availablePlanes } from '../domain/routes.js';
import { showModal, showRouteModal } from './modal.js';

export function showNewspaper(state) {
  const q = state.quarter;
  const seasonTxt = seasonName(q) + seasonEmoji(q);
  const dateStr = state.year + '年 第' + q + '季度 · ' + seasonTxt;
  let html = `<div class="newspaper">
    <div class="newspaper-header">
      <h2>环球航空报</h2>
      <div class="date">${dateStr}</div>
    </div>
    <div class="newspaper-body">`;
  if (state.newsItems.length > 0) {
    html += `<div class="newspaper-headline">⚡ ${state.newsItems[0].title}</div>`;
  }
  const oilChange = state.prevOilPrice > 0 ? ((state.oilPrice - state.prevOilPrice) / state.prevOilPrice * 100) : 0;
  const oilArrow = oilChange > 0.01 ? '↑' : oilChange < -0.01 ? '↓' : '→';
  const oilColor = oilChange > 0.01 ? '#b91c1c' : oilChange < -0.01 ? '#166534' : '#555';
  html += `<div class="newspaper-item" style="background:#ebe6d6;border:1px solid #8b7355;border-radius:4px;padding:10px;margin-bottom:14px">
    <span class="cat economy">行情</span>
    <div class="title">🛢 国际原油行情</div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:13px">
      <span>上季度: $${state.prevOilPrice.toFixed(1)}/桶</span>
      <span>本季度: <strong>$${state.oilPrice.toFixed(1)}/桶</strong></span>
      <span style="color:${oilColor};font-weight:700">${oilArrow} ${oilChange >= 0 ? '+' : ''}${oilChange.toFixed(1)}%</span>
    </div>
    <div style="margin-top:6px;font-size:11px;color:#4a4a3a;line-height:1.4">${Math.abs(oilChange) < 1 ? '原油价格保持平稳，市场供需基本均衡。' : oilChange > 0 ? '地缘政治紧张叠加季节性需求走强，油价上行压力明显。航空业燃油成本面临考验。' : '产油国增产预期增强，油价承压回落。航空业运营成本有望缓解。'}</div>
  </div>`;
  state.newsItems.forEach((item) => {
    const catName = { politics: '时政', entertainment: '娱乐', disaster: '灾害', economy: '财经', tech: '科技', sports: '体育', health: '卫生' }[item.category] || '综合';
    html += `<div class="newspaper-item">
      <span class="cat ${item.category}">${catName}</span>
      <div class="title">${item.title}</div>
      <div class="desc">${item.desc}</div>
      <div class="effect">→ ${item.effect}</div>
    </div>`;
  });
  html += `</div>
    <div class="newspaper-footer">
      <button class="btn btn-primary" data-action="close-modal" style="padding:8px 32px">知道了，继续经营</button>
    </div>
  </div>`;
  byId('modal-root').innerHTML = `<div class="modal-overlay" data-action="modal-backdrop" style="align-items:flex-start;padding-top:40px">${html}</div>`;
}

export function showRouteCreateModal(state, from, to, competitors) {
  const a = getCity(from);
  const b = getCity(to);
  const distance = cityDist(a, b);
  const sp = suggestedPrice(from, to);
  const avail = availablePlanes(state).filter((p) => p.range >= distance);
  if (avail.length === 0) {
    showModal(`<h2>无法开通航线</h2><p>航程 ${Math.round(distance)} km，没有航程足够的可用飞机。</p><p>请先购买航程足够的飞机（如 ${distance > 8000 ? 'B787/A350' : 'A320/B737'}）。</p><button class="btn btn-primary" data-action="close-modal">确定</button>`);
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
  if (!slider) return;
  const price = parseInt(slider.value, 10);
  byId('price-val').textContent = '$' + price;
  const select = byId('route-plane');
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

export function showBuyPlaneModal(state) {
  let html = '<h2>购买飞机</h2><div id="plane-list">';
  PLANES.forEach((p) => {
    html += `<div class="fleet-item" style="flex-direction:column;align-items:flex-start;gap:4px"><div style="display:flex;justify-content:space-between;width:100%"><span class="name">${p.name}</span><span style="color:#7ba3cc;font-size:12px">${p.type === 'narrow' ? '窄体' : p.type === 'wide' ? '宽体' : '超大型'}</span></div><div style="display:flex;gap:12px;font-size:12px;color:#556;width:100%"><span>${p.seats}座</span><span>航程${p.range}km</span><span>油耗${p.fuel}</span></div><div style="display:flex;gap:6px;margin-top:4px;width:100%;justify-content:space-between;align-items:center"><div><button class="btn btn-primary btn-sm" data-action="buy-plane" data-plane-id="${p.id}" data-lease="false">购买 ${fmt(p.buyPrice)}</button><button class="btn btn-warning btn-sm" data-action="buy-plane" data-plane-id="${p.id}" data-lease="true">租赁 ${fmt(p.leasePrice)}/季</button></div><span style="font-size:12px;color:#556">资金: ${fmt(state.cash)}</span></div></div>`;
  });
  html += '</div><div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="close-modal">关闭</button></div>';
  showModal(html);
}

export function showFleetPanel(state) {
  let html = '<h2>机队管理</h2>';
  if (state.fleet.length === 0) {
    html += '<p style="color:#556">尚未拥有飞机，请先购买。</p>';
  } else {
    state.fleet.forEach((p) => {
      const assignedRoute = state.routes.find((r) => r.assignedPlanes.includes(p.uid));
      const status = p.delivering ? `交付中 (${p.deliverIn}回合)` : assignedRoute ? `${getCity(assignedRoute.from).name}→${getCity(assignedRoute.to).name}` : '空闲';
      const statusColor = p.delivering ? '#fbbf24' : assignedRoute ? '#4ade80' : '#556';
      html += `<div class="fleet-item"><div><span class="name">${p.name}</span><span style="color:#556;font-size:11px;margin-left:6px">机龄${p.age.toFixed(1)}年</span></div><div style="text-align:right"><span class="status" style="color:${statusColor}">${status}</span>${!p.delivering && !assignedRoute ? `<button class="btn btn-danger btn-sm" style="margin-left:6px" data-action="sell-plane" data-uid="${p.uid}">出售</button>` : ''}</div></div>`;
    });
  }
  html += '<div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="close-modal">关闭</button></div>';
  showModal(html);
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
      html += `<div class="route-item" style="cursor:default"><div style="display:flex;justify-content:space-between;font-weight:600"><span>${a.name} → ${b.name}</span><span data-route-profit style="color:${color}">${fmt(r.profit)}</span></div><div style="display:flex;gap:12px;font-size:11px;color:#556;margin-top:4px"><span data-route-price>票价$${r.price}</span><span data-route-load>客座率${fmtPct(r.loadFactor * 100)}</span><span data-route-revenue>收入${fmt(r.revenue)}</span><span data-route-cost>成本${fmt(r.cost)}</span></div><div style="margin-top:6px;display:flex;gap:4px;align-items:center"><span style="font-size:11px;color:#556">调价:</span><input type="range" min="${Math.round(r.suggestedPrice * 0.4)}" max="${Math.round(r.suggestedPrice * 2)}" value="${r.price}" style="width:120px" data-action="adjust-price" data-from="${r.from}" data-to="${r.to}"><span style="font-size:12px;min-width:40px" id="ap-${r.from}-${r.to}">$${r.price}</span></div><div style="margin-top:4px"><button class="btn btn-danger btn-sm" data-action="close-route" data-from="${r.from}" data-to="${r.to}">关闭航线</button></div></div>`;
    });
  }
  html += '<div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="close-modal">关闭</button></div>';
  showModal(html);
}

export function showFinancialReport(state, rev, cost, profit, period = null) {
  const reportPeriod = period || { year: state.year, quarter: state.quarter };
  const color = profit >= 0 ? '#4ade80' : '#f87171';
  let html = `<h2>财报 — ${reportPeriod.year} Q${reportPeriod.quarter} ${seasonEmoji(reportPeriod.quarter)}${seasonName(reportPeriod.quarter)}</h2>
    <div class="report-section"><div class="report-row"><span>航线收入</span><span style="color:#4ade80">${fmt(rev)}</span></div><div class="report-row"><span>运营成本</span><span style="color:#f87171">-${fmt(cost)}</span></div><div class="report-total" style="color:${color}">净利润: ${fmt(profit)}</div></div>
    <div class="report-section"><div class="report-row"><span>现金余额</span><span>${fmt(state.cash)}</span></div><div class="report-row"><span>航线数</span><span>${state.routes.length}</span></div><div class="report-row"><span>机队规模</span><span>${state.fleet.length} 架</span></div><div class="report-row"><span>品牌等级</span><span>${'★'.repeat(Math.min(5, Math.floor(state.brand)))}</span></div><div class="report-row"><span>油价</span><span>$${state.oilPrice.toFixed(0)}/桶</span></div></div>`;
  if (state.routes.length > 0) {
    html += '<h3>航线明细</h3><div class="report-section">';
    state.routes.forEach((r) => {
      const a = getCity(r.from);
      const b = getCity(r.to);
      const rc = r.profit >= 0 ? '#4ade80' : '#f87171';
      html += `<div class="report-row"><span>${a.name}→${b.name}</span><span style="color:${rc}">${fmt(r.profit)} (LF ${fmtPct(r.loadFactor * 100)})</span></div>`;
    });
    html += '</div>';
  }
  html += '<div style="margin-top:12px;text-align:center"><button class="btn btn-primary" data-action="close-modal" style="padding:8px 32px">继续经营</button></div>';
  showModal(html);
}

export function showGameOver(state) {
  byId('modal-root').innerHTML = `<div class="modal-overlay"><div class="modal gameover"><h1>破产了</h1><p>你的航空公司因资金耗尽而倒闭。</p><p>存活了 ${state.turnsPlayed} 个季度</p><p>最高曾拥有 ${state.routes.length} 条航线、${state.fleet.length} 架飞机</p><button class="btn btn-primary" data-action="reload-page" style="margin-top:16px;padding:10px 32px">重新开始</button></div></div>`;
}
