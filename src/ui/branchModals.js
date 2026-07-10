import { branchCost, MAX_BRANCHES, previewCloseBranchImpact } from '../domain/bases.js';
import { fmt, getCity } from '../domain/helpers.js';
import { escapeAttr, escapeHtml } from './html.js';
import { showModal } from './modal.js';

export function showBranchModal(state) {
  const branches = Array.isArray(state.branches) ? state.branches : [];
  const constructing = Array.isArray(state.branchesConstructing) ? state.branchesConstructing : [];
  const count = branches.length;
  const totalCount = count + constructing.length;
  let html = `<h2>分部管理</h2><p class="modal-intro">在总部以外的城市开设分部，扩展航线网络。航线只能从总部或分部起飞。分部上限${MAX_BRANCHES}个。</p>`;
  if (constructing.length > 0) {
    html += '<h3 class="text-warning">建设中</h3><div class="branch-chip-list">';
    constructing.forEach((branch) => {
      const city = getCity(branch.cityId);
      if (!city) return;
      html += `<div class="branch-chip branch-chip-building"><span>${escapeHtml(city.name)}</span><small>施工中，${branch.constructIn}季度后完工</small></div>`;
    });
    html += '</div>';
  }
  if (count > 0) {
    html += '<h3>已有分部</h3><div class="branch-chip-list">';
    branches.forEach((cityId) => {
      const city = getCity(cityId);
      if (!city) return;
      const routesFromBranch = state.routes.filter((route) => route.from === cityId);
      html += `<div class="branch-chip"><span>${escapeHtml(city.name)}</span><small>${routesFromBranch.length}航线</small><button type="button" data-action="close-branch" data-city-id="${escapeAttr(cityId)}" title="关闭分部" aria-label="关闭${escapeAttr(city.name)}分部">✕</button></div>`;
    });
    html += '</div>';
  }
  const hq = getCity(state.hq);
  if (hq) html += `<div class="modal-meta">总部: ${escapeHtml(hq.name)}</div>`;
  if (totalCount < MAX_BRANCHES) {
    const nextCost = branchCost(totalCount);
    const canAfford = state.cash >= nextCost;
    html += `<div class="branch-cost-card">
      <div class="branch-cost-row"><span>第${totalCount + 1}个分部费用</span><strong class="${canAfford ? 'text-positive' : 'text-danger'}">${fmt(nextCost)}</strong></div>
      <div class="branch-cost-caption">当前资金: ${fmt(state.cash)}</div>
      <div class="branch-cost-note">建设需1个季度，完工后才可作为起飞基地。</div>
    </div>`;
    html += canAfford
      ? '<button class="btn btn-primary btn-block" type="button" data-action="start-branch-select">在地图上选择分部城市</button>'
      : '<div class="modal-status text-danger">资金不足</div>';
  } else {
    html += `<div class="modal-status text-warning">已达分部上限（${MAX_BRANCHES}个）</div>`;
  }
  html += '<div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="close-modal">关闭</button></div>';
  showModal(html);
}

export function showCloseBranchConfirm(state, cityId) {
  const city = getCity(cityId);
  if (!city) return;
  const { affectedRoutes, affectedPlaneIds } = previewCloseBranchImpact(state, cityId);
  let html = `<h2>确认关闭分部</h2>
    <div class="danger-callout">
      <p class="danger-callout-title">确定关闭「${escapeHtml(city.name)}」分部？</p>
      <p class="danger-callout-note">此操作不可撤销。</p>
    </div>
    <div class="impact-summary">
      <div class="impact-row">将关闭从该分部起飞的航线：<strong class="text-danger">${affectedRoutes.length} 条</strong></div>`;
  if (affectedRoutes.length > 0) {
    html += '<div class="impact-list">';
    affectedRoutes.forEach((route) => {
      html += `<div class="impact-list-row">→ ${escapeHtml(getCity(route.to)?.name || route.to)}</div>`;
    });
    html += '</div>';
  }
  if (affectedPlaneIds.size > 0) {
    html += `<div class="impact-row">涉及的飞机将入库变为空闲：<strong class="text-warning">${affectedPlaneIds.size} 架</strong></div>`;
  }
  html += `</div><div class="modal-actions">
      <button class="btn btn-secondary" type="button" data-action="open-branch-modal">取消</button>
      <button class="btn btn-danger" type="button" data-action="confirm-close-branch" data-city-id="${escapeAttr(cityId)}">确认关闭</button>
    </div>`;
  showModal(html);
}
