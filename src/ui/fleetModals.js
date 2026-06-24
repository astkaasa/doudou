import { availablePlaneTemplates, countBoughtPlanes, countLeasedPlanes, maxLeasedPlanes } from '../domain/fleet.js';
import { fmt, getCity } from '../domain/helpers.js';
import { showModal } from './modal.js';

export function showBuyPlaneModal(state) {
  const boughtCount = countBoughtPlanes(state);
  const leasedCount = countLeasedPlanes(state);
  const leaseMax = maxLeasedPlanes(state);
  const canLease = boughtCount >= 1 && leasedCount < leaseMax;
  const leaseTip = boughtCount < 1
    ? '<div style="background:#dc262620;border:1px solid #dc262660;border-radius:6px;padding:8px;margin-bottom:10px;font-size:12px;color:#f87171">租赁限制：需先购买至少1架飞机后才能租赁</div>'
    : `<div style="background:#16a34a20;border:1px solid #16a34a60;border-radius:6px;padding:8px;margin-bottom:10px;font-size:12px;color:#4ade80">租赁信息：已购${boughtCount}架 · 已租${leasedCount}架 · 剩余可租${Math.max(0, leaseMax - leasedCount)}架 · 租期最长10年</div>`;
  const planes = availablePlaneTemplates(state);
  const groups = groupPlanesByMaker(planes);
  let html = `<h2>购买飞机</h2>${leaseTip}<div id="plane-list">`;
  if (groups.length === 0) {
    html += '<p style="color:#556">当前年份没有可购买机型。</p>';
  }
  groups.forEach(({ maker, planes: makerPlanes }, index) => {
    const shouldOpen = groupHasAffordablePlane(makerPlanes, state, canLease) || (index === 0 && !groups.some((group) => groupHasAffordablePlane(group.planes, state, canLease)));
    html += `<details class="plane-maker-group"${shouldOpen ? ' open' : ''}><summary><span>${maker}</span><small>${makerPlanes.length}</small></summary>`;
    makerPlanes.forEach((p) => {
      html += `<div class="fleet-item" style="flex-direction:column;align-items:flex-start;gap:4px"><div style="display:flex;justify-content:space-between;width:100%"><span class="name">${p.name}</span><span style="color:#7ba3cc;font-size:12px">${planeTypeLabel(p.type)} · ${maker}</span></div><div style="display:flex;gap:12px;font-size:12px;color:#556;width:100%;flex-wrap:wrap"><span>${p.seats}座</span><span>航程${p.range}km</span><span>油耗${p.fuel}</span><span>服役${p.serviceStart}-${p.serviceEnd}</span></div><div style="display:flex;gap:6px;margin-top:4px;width:100%;justify-content:space-between;align-items:center;flex-wrap:wrap"><div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap"><span style="font-size:11px;color:#7ba3cc">数量</span><input type="number" min="1" max="10" value="1" id="buy-qty-${p.id}" style="width:46px;padding:2px 4px;background:#0a1628;color:#e0e8f0;border:1px solid #1e3a5f;border-radius:3px;font-size:12px;text-align:center"><button class="btn btn-primary btn-sm" data-action="buy-plane" data-plane-id="${p.id}" data-lease="false">购买 ${fmt(p.buyPrice)}/架</button><button class="btn btn-warning btn-sm" data-action="buy-plane" data-plane-id="${p.id}" data-lease="true"${canLease ? '' : ' disabled'}>租赁 ${fmt(p.leasePrice)}/季 +10%手续费</button></div><span style="font-size:12px;color:#556">资金: ${fmt(state.cash)}</span></div></div>`;
    });
    html += '</details>';
  });
  html += '</div><div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="close-modal">关闭</button></div>';
  showModal(html);
}

function groupHasAffordablePlane(planes, state, canLease) {
  return planes.some((plane) => {
    const leaseCost = plane.leasePrice + plane.buyPrice * 0.1;
    return state.cash >= plane.buyPrice || (canLease && state.cash >= leaseCost);
  });
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
    html += '<p style="color:#556">尚未拥有飞机，请先购买。</p>';
  } else {
    state.fleet.forEach((p) => {
      const assignedRoute = state.routes.find((r) => r.assignedPlanes.includes(p.uid));
      const status = p.delivering ? `交付中 (${p.deliverIn}回合)` : assignedRoute ? `${getCity(assignedRoute.from).name}→${getCity(assignedRoute.to).name}` : '空闲';
      const statusColor = p.delivering ? '#fbbf24' : assignedRoute ? '#4ade80' : '#556';
      const leaseTag = p.isLease ? `<span class="lease-badge">R</span><span style="color:#d97706;font-size:10px;margin-left:4px">租${p.leaseTurns || 0}/${p.maxLeaseTurns || 40}季</span>` : '';
      const action = p.isLease ? 'return-lease' : 'sell-plane';
      const actionLabel = p.isLease ? '退租' : '出售';
      html += `<div class="fleet-item"><div><span class="name">${p.name}</span>${leaseTag}<span style="color:#556;font-size:11px;margin-left:6px">机龄${p.age.toFixed(1)}年</span></div><div style="text-align:right"><span class="status" style="color:${statusColor}">${status}</span>${!p.delivering && !assignedRoute ? `<button class="btn btn-danger btn-sm" style="margin-left:6px" data-action="${action}" data-uid="${p.uid}">${actionLabel}</button>` : ''}</div></div>`;
    });
  }
  html += '<div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="close-modal">关闭</button></div>';
  showModal(html);
}
