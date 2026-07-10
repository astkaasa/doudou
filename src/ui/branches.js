import { branchCost } from '../domain/bases.js';
import { byId, fmt } from '../domain/helpers.js';

export function showBranchBanner(state) {
  removeBranchBanner();
  const banner = document.createElement('div');
  banner.id = 'branch-banner';
  const cost = branchCost((state.branches || []).length + (state.branchesConstructing || []).length);
  banner.innerHTML = `
    <div class="branch-title">📍 选择分部城市</div>
    <div class="branch-hint">点击地图上的城市开设分部（费用 ${fmt(cost)}）</div>
    <div id="branch-selected-info" class="branch-selected" hidden>已选择: <span id="branch-selected-name" class="branch-name"></span></div>
    <div class="selection-actions">
      <button class="btn btn-secondary selection-cancel" data-action="cancel-branch-select">← 取消</button>
      <button class="btn btn-success selection-confirm" id="branch-confirm-btn" data-action="confirm-branch" hidden>确认开设</button>
    </div>
  `;
  document.body.appendChild(banner);
}

export function removeBranchBanner() {
  const banner = byId('branch-banner');
  if (banner) banner.remove();
}

export function showSelectedBranch(cityName) {
  const nameEl = byId('branch-selected-name');
  const btnEl = byId('branch-confirm-btn');
  const infoEl = byId('branch-selected-info');
  if (nameEl) nameEl.textContent = cityName;
  if (btnEl) btnEl.hidden = false;
  if (infoEl) infoEl.hidden = false;
}
