import terrainMapUrl from '../assets/natural-earth-2-50m.jpg';
import { CREDITS } from '../data/credits.js';
import { ERAS } from '../data/eras.js';
import { PLAYER_TRAITS } from '../data/playerTraits.js';
import { GAME_VERSION, VERSION_LOG } from '../data/version.js';
import { DEFAULT_COMPANY_NAME } from '../domain/constants.js';
import { byId, fmt } from '../domain/helpers.js';
import { getSaveSummaries } from '../domain/save.js';
import { escapeAttr, escapeHtml } from './html.js';
import { hasCompletedOnboarding } from './onboarding.js';

let companyNameDraft = DEFAULT_COMPANY_NAME;
let creditsScrollTimer = null;
let creditsScrollFrame = null;

export function initTutorial(selectedEra) {
  const menuMap = byId('menu-map-bg');
  if (menuMap) menuMap.style.backgroundImage = `url("${terrainMapUrl}")`;
  showMainMenu(selectedEra);
}

export function showMainMenu() {
  showTutorial();
  stopCreditsScroll();
  const box = byId('menu-box');
  if (!box) return;
  const hasSave = hasStoredSave();
  box.innerHTML = `
    <div class="menu-panel">
      <button class="menu-btn menu-btn-start" type="button" data-action="show-era-menu">
        <span class="menu-btn-title">开始游戏</span>
        <span class="menu-btn-desc">选择时代，创建新的航空公司</span>
      </button>
      <button class="menu-btn menu-btn-continue" type="button" data-action="show-save-menu"${hasSave ? '' : ' disabled'}>
        <span class="menu-btn-title">继续游戏</span>
        <span class="menu-btn-desc">${hasSave ? '读取最近保存的经营进度' : '暂无可读取的存档'}</span>
      </button>
      <button class="menu-btn menu-btn-credits" type="button" data-action="show-credits-menu">
        <span class="menu-btn-title">制作人员</span>
        <span class="menu-btn-desc">查看贡献者、灵感来源和特别感谢</span>
      </button>
      ${renderVersionBadge()}
    </div>
  `;
}

export function showEraMenu(selectedEra) {
  showTutorial();
  stopCreditsScroll();
  const box = byId('menu-box');
  if (!box) return;
  const onboardDone = hasCompletedOnboarding();
  box.innerHTML = `
    <button class="menu-back-btn" type="button" data-action="show-main-menu">← 主菜单</button>
    <div class="menu-section-title">选择时代</div>
    <div class="era-select" id="era-select">
      ${ERAS.map((era) => renderEraCard(era, era.id === selectedEra)).join('')}
    </div>
    <label class="company-name-field" for="company-name">
      <span>航空公司名称</span>
      <input type="text" id="company-name" value="${escapeAttr(companyNameDraft)}" placeholder="输入公司名称" maxlength="20" data-action="company-name-input">
    </label>
    <div class="onboard-mode-row" role="radiogroup" aria-label="新手引导设置">
      <label><input type="radio" name="onboard-mode" value="on" ${onboardDone ? '' : 'checked'}> 新手引导</label>
      <label><input type="radio" name="onboard-mode" value="off" ${onboardDone ? 'checked' : ''}> 关闭引导</label>
    </div>
    <button class="btn btn-success menu-confirm-btn" type="button" data-action="tutorial-next-step" id="era-next-btn">选择总部</button>
    ${renderVersionBadge()}
  `;
}

export function showSaveMenu() {
  showTutorial();
  stopCreditsScroll();
  const box = byId('menu-box');
  if (!box) return;
  const saves = getSaveSummaries();
  box.innerHTML = `
    <button class="menu-back-btn" type="button" data-action="show-main-menu">← 主菜单</button>
    <div class="menu-section-title">继续游戏</div>
    <div class="save-list">
      ${saves.length ? saves.map(renderSaveCard).join('') : '<div class="save-empty">没有找到可读取的存档。</div>'}
    </div>
    ${renderVersionBadge()}
  `;
}

export function showCreditsMenu() {
  showTutorial();
  const box = byId('menu-box');
  if (!box) return;
  box.innerHTML = `
    <button class="menu-back-btn" type="button" data-action="show-main-menu">← 主菜单</button>
    <div class="menu-section-title">制作人员</div>
    <div class="credits-scroll" id="credits-scroll">
      <section class="credits-section credits-thanks">
        <h3>特别感谢</h3>
        <p>感谢每一位试玩、反馈、翻译和提出建议的朋友。</p>
      </section>
      <section class="credits-section">
        <h3>贡献者</h3>
        <div class="credits-grid">
          ${CREDITS.contributors.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}
        </div>
      </section>
      <section class="credits-section">
        <h3>灵感来源</h3>
        ${CREDITS.inspirations.map(renderInspiration).join('')}
      </section>
      <section class="credits-section">
        <h3>金豆特质</h3>
        <div class="credits-traits">
          ${Object.values(PLAYER_TRAITS).map(renderTraitCredit).join('')}
        </div>
      </section>
      <section class="credits-section credits-thanks">
        <h3>远航</h3>
        <p>愿你的航线穿过风暴、油价和竞争，最终抵达新的天空。</p>
      </section>
    </div>
    ${renderVersionBadge()}
  `;
  startCreditsScroll();
}

export function setTutorialCompanyName(value) {
  companyNameDraft = String(value || '').trimStart().slice(0, 20);
}

export function getTutorialCompanyName() {
  return companyNameDraft.trim() || DEFAULT_COMPANY_NAME;
}

export function selectEraCard(eraId) {
  const eraSel = byId('era-select');
  if (!eraSel) return;
  eraSel.querySelectorAll('.era-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.eraId === eraId);
  });
}

export function hideTutorial() {
  stopCreditsScroll();
  const tutorial = byId('tutorial');
  if (tutorial) tutorial.style.display = 'none';
  const app = byId('app');
  if (app) app.hidden = false;
}

export function showTutorial() {
  const tutorial = byId('tutorial');
  if (tutorial) tutorial.style.display = '';
  const app = byId('app');
  if (app) app.hidden = true;
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

function renderEraCard(era, selected) {
  return `<button class="era-card${selected ? ' selected' : ''}" type="button" data-action="select-era" data-era-id="${escapeAttr(era.id)}">
    <span class="era-name">${escapeHtml(era.name)}</span>
    <span class="era-desc">${escapeHtml(era.desc)}</span>
    <span class="era-detail">${escapeHtml(era.detail)}</span>
    ${era.difficulty ? `<span class="era-difficulty" style="--era-difficulty-color:${escapeAttr(era.diffColor || '#7ba3cc')}">${escapeHtml(era.difficulty)}</span>` : ''}
  </button>`;
}

function renderSaveCard(save, index) {
  const time = save.ts ? new Date(save.ts).toLocaleString('zh-CN', { hour12: false }) : '未知时间';
  const company = save.company || DEFAULT_COMPANY_NAME;
  const year = save.year ? `${save.year} Q${save.quarter || 1}` : '未知季度';
  return `<button class="save-card" type="button" data-action="load-game" data-save-index="${index}">
    <span class="save-card-head">
      <strong>${escapeHtml(company)}</strong>
      <small>${escapeHtml(time)}</small>
    </span>
    <span class="save-card-meta">
      <span>${escapeHtml(year)}</span>
      <span>${fmt(Number(save.cash) || 0)}</span>
      <span>${Number(save.routes) || 0} 航线</span>
      <span>${Number(save.fleet) || 0} 机队</span>
    </span>
  </button>`;
}

function renderInspiration(item) {
  return `<article class="credits-inspiration">
    <strong>${escapeHtml(item.name)}</strong>
    <small>${escapeHtml(item.platform)} · ${escapeHtml(item.year)}</small>
    <p>${escapeHtml(item.desc)}</p>
  </article>`;
}

function renderTraitCredit(trait) {
  return `<div class="credits-trait" style="--trait-color:${escapeAttr(trait.color)}">
    <span>${escapeHtml(trait.symbol)}</span>
    <strong>${escapeHtml(trait.name)}</strong>
    <small>${escapeHtml(trait.desc)}</small>
  </div>`;
}

function renderVersionBadge() {
  const latest = VERSION_LOG[0];
  const date = latest ? latest.date : '';
  return `<button class="ver-badge" type="button" data-action="show-version-log">
    Version: <span id="ver-num">v${escapeHtml(GAME_VERSION)}</span>${date ? ` · ${escapeHtml(date)}` : ''} 📋
  </button>`;
}

function hasStoredSave() {
  return getSaveSummaries().length > 0;
}

function startCreditsScroll() {
  stopCreditsScroll();
  const scroller = byId('credits-scroll');
  if (!scroller) return;
  creditsScrollTimer = window.setTimeout(() => {
    creditsScrollFrame = window.setInterval(() => {
      if (!scroller.isConnected) {
        stopCreditsScroll();
        return;
      }
      scroller.scrollTop += 1;
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
        scroller.scrollTop = 0;
      }
    }, 60);
  }, 1200);
}

function stopCreditsScroll() {
  if (creditsScrollTimer) {
    window.clearTimeout(creditsScrollTimer);
    creditsScrollTimer = null;
  }
  if (creditsScrollFrame) {
    window.clearInterval(creditsScrollFrame);
    creditsScrollFrame = null;
  }
}
