import { branchCost, MAX_BRANCHES, previewCloseBranchImpact } from '../domain/bases.js';
import { fmt, getCity } from '../domain/helpers.js';
import { showModal } from './modal.js';

export function showBranchModal(state) {
  const branches = Array.isArray(state.branches) ? state.branches : [];
  const constructing = Array.isArray(state.branchesConstructing) ? state.branchesConstructing : [];
  const count = branches.length;
  const totalCount = count + constructing.length;
  let html = '<h2>分部管理</h2><p style="color:#7ba3cc;font-size:13px;margin-bottom:12px">在总部以外的城市开设分部，扩展航线网络。航线只能从总部或分部起飞。分部上限10个。</p>';
  if (constructing.length > 0) {
    html += '<h3 style="color:#fbbf24">建设中</h3><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">';
    constructing.forEach((branch) => {
      const city = getCity(branch.cityId);
      if (!city) return;
      html += `<div class="branch-chip branch-chip-building"><span>${city.name}</span><small>施工中，${branch.constructIn}季度后完工</small></div>`;
    });
    html += '</div>';
  }
  if (count > 0) {
    html += '<h3>已有分部</h3><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">';
    branches.forEach((cityId) => {
      const city = getCity(cityId);
      if (!city) return;
      const routesFromBranch = state.routes.filter((route) => route.from === cityId);
      html += `<div class="branch-chip"><span>${city.name}</span><small>${routesFromBranch.length}航线</small><button type="button" data-action="close-branch" data-city-id="${cityId}" title="关闭分部">✕</button></div>`;
    });
    html += '</div>';
  }
  if (state.hq) html += `<div style="font-size:12px;color:#7ba3cc;margin-bottom:10px">总部: ${getCity(state.hq).name}</div>`;
  if (totalCount < MAX_BRANCHES) {
    const nextCost = branchCost(totalCount);
    const canAfford = state.cash >= nextCost;
    html += `<div style="background:#0a1628;border-radius:8px;padding:12px;margin:8px 0">
      <div style="display:flex;justify-content:space-between;font-size:14px"><span style="color:#7ba3cc">第${totalCount + 1}个分部费用</span><span style="font-weight:700;color:${canAfford ? '#4ade80' : '#f87171'}">${fmt(nextCost)}</span></div>
      <div style="font-size:11px;color:#556;margin-top:4px">当前资金: ${fmt(state.cash)}</div>
      <div style="font-size:11px;color:#fbbf24;margin-top:2px">建设需1个季度，完工后才可作为起飞基地。</div>
    </div>`;
    html += canAfford
      ? '<button class="btn btn-primary" data-action="start-branch-select" style="width:100%;padding:10px">在地图上选择分部城市</button>'
      : '<div style="text-align:center;color:#f87171;font-size:13px;padding:8px">资金不足</div>';
  } else {
    html += '<div style="text-align:center;color:#fbbf24;font-size:13px;padding:8px">已达分部上限（10个）</div>';
  }
  html += '<div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="close-modal">关闭</button></div>';
  showModal(html);
}

export function showCloseBranchConfirm(state, cityId) {
  const city = getCity(cityId);
  if (!city) return;
  const { affectedRoutes, affectedPlaneIds } = previewCloseBranchImpact(state, cityId);
  let html = `<h2>确认关闭分部</h2>
    <div style="background:#dc262620;border:1px solid #dc262660;border-radius:8px;padding:12px;margin:12px 0">
      <p style="color:#f87171;font-weight:700;font-size:15px">确定关闭「${city.name}」分部？</p>
      <p style="color:#f87171;font-size:13px;margin-top:6px">此操作不可撤销。</p>
    </div>
    <div style="font-size:13px;color:#e0e8f0">
      <div style="margin-bottom:4px">将关闭从该分部起飞的航线：<span style="color:#f87171;font-weight:700">${affectedRoutes.length} 条</span></div>`;
  if (affectedRoutes.length > 0) {
    html += '<div style="margin:8px 0;padding:8px;background:#0a1628;border-radius:6px">';
    affectedRoutes.forEach((route) => {
      html += `<div style="font-size:12px;color:#7ba3cc">→ ${getCity(route.to)?.name || route.to}</div>`;
    });
    html += '</div>';
  }
  if (affectedPlaneIds.size > 0) {
    html += `<div style="margin-bottom:4px">涉及的飞机将入库变为空闲：<span style="color:#fbbf24;font-weight:700">${affectedPlaneIds.size} 架</span></div>`;
  }
  html += `</div><div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" style="background:#334155;color:#e0e8f0" data-action="open-branch-modal">取消</button>
      <button class="btn btn-danger" data-action="confirm-close-branch" data-city-id="${cityId}">确认关闭</button>
    </div>`;
  showModal(html);
}
