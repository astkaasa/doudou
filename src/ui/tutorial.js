import { ERAS } from '../data/eras.js';
import { GAME_VERSION } from '../data/version.js';
import { byId } from '../domain/helpers.js';

export function initTutorial(selectedEra) {
  const eraSel = byId('era-select');
  eraSel.innerHTML = '';
  ERAS.forEach((era) => {
    const card = document.createElement('div');
    card.className = 'era-card' + (era.id === selectedEra ? ' selected' : '');
    card.dataset.action = 'select-era';
    card.dataset.eraId = era.id;
    card.innerHTML = `<div class="era-name">${era.name}</div><div class="era-desc">${era.desc}</div><div class="era-detail">${era.detail}</div>`;
    eraSel.appendChild(card);
  });
  const versionNumber = byId('ver-num');
  if (versionNumber) versionNumber.textContent = `v${GAME_VERSION}`;
}

export function selectEraCard(eraId) {
  const eraSel = byId('era-select');
  eraSel.querySelectorAll('.era-card').forEach((c) => c.classList.remove('selected'));
  const card = eraSel.querySelector(`[data-era-id="${eraId}"]`);
  if (card) card.classList.add('selected');
}

export function hideTutorial() {
  byId('tutorial').style.display = 'none';
}

export function showTutorial() {
  byId('tutorial').style.display = '';
}

export function showHQBanner() {
  const old = byId('hq-banner');
  if (old) old.remove();
  const banner = document.createElement('div');
  banner.id = 'hq-banner';
  banner.innerHTML = `
    <div class="hq-title">📍 选择总部城市</div>
    <div class="hq-hint">点击左侧地图上的城市选择你的航空公司总部</div>
    <div id="hq-selected-info" class="hq-selected" style="display:none">已选择: <span id="hq-selected-name" class="hq-name"></span></div>
    <div style="margin-top:14px;display:flex;gap:10px;justify-content:center">
      <button class="btn" style="background:#334155;color:#e0e8f0;padding:8px 20px" data-action="cancel-hq-select">← 返回</button>
      <button class="btn btn-success" id="hq-confirm-btn" style="padding:8px 32px;display:none" data-action="confirm-hq-start">确认起飞！</button>
    </div>
  `;
  document.body.appendChild(banner);
}

export function removeHQBanner() {
  const banner = byId('hq-banner');
  if (banner) banner.remove();
}

export function showSelectedHQ(cityName) {
  const nameEl = byId('hq-selected-name');
  const btnEl = byId('hq-confirm-btn');
  const infoEl = byId('hq-selected-info');
  if (nameEl) nameEl.textContent = cityName;
  if (btnEl) btnEl.style.display = '';
  if (infoEl) infoEl.style.display = '';
}
