import { branchCost } from '../domain/bases.js';
import { byId, fmt } from '../domain/helpers.js';

export function showBranchBanner(state) {
  removeBranchBanner();
  const banner = document.createElement('div');
  banner.id = 'branch-banner';
  const cost = branchCost((state.branches || []).length);
  banner.innerHTML = `
    <div class="branch-title">📍 选择分部城市</div>
    <div class="branch-hint">点击地图上的城市开设分部（费用 ${fmt(cost)}）</div>
    <div id="branch-selected-info" class="branch-selected" style="display:none">已选择: <span id="branch-selected-name" class="branch-name"></span></div>
    <div style="margin-top:14px;display:flex;gap:10px;justify-content:center">
      <button class="btn" style="background:#334155;color:#e0e8f0;padding:8px 20px" data-action="cancel-branch-select">← 取消</button>
      <button class="btn btn-success" id="branch-confirm-btn" style="padding:8px 32px;display:none" data-action="confirm-branch">确认开设</button>
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
  if (btnEl) btnEl.style.display = '';
  if (infoEl) infoEl.style.display = '';
}
