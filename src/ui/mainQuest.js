import { MAIN_QUEST_DIMS, MAIN_QUEST_STAGES, VICTORY_GRADES } from '../data/mainQuest.js';
import { fmt } from '../domain/helpers.js';
import { getMainQuestStats } from '../domain/mainQuest.js';
import { escapeAttr, escapeHtml } from './html.js';
import { showBanner, showModal } from './modal.js';

export function showMainQuestPanel(state) {
  if (!state) return;
  const stats = getMainQuestStats(state);
  const progress = stats.progress;
  if (!progress) return;
  const grade = stats.victoryGrade ? VICTORY_GRADES.find((item) => item.grade === stats.victoryGrade) : null;
  const dimensionRows = MAIN_QUEST_DIMS.map((meta) => renderDimension(progress.dimensions[meta.key], meta)).join('');
  const stages = MAIN_QUEST_STAGES.map((stage) => renderStageDot(stage, stats)).join('');
  const victory = grade ? `<div class="main-quest-victory-card">
      <strong style="color:${escapeAttr(grade.color)}">${escapeHtml(grade.grade)}</strong>
      <span>${escapeHtml(grade.title)}</span>
      <small>第 ${stats.victoryTurn} 季通关</small>
    </div>` : '';
  showModal(`<div class="main-quest-panel">
    <div class="main-quest-head">
      <div class="main-quest-icon">${escapeHtml(progress.icon || '★')}</div>
      <div>
        <h2>${escapeHtml(progress.title || '苍穹之路')}</h2>
        <p>苍穹之路 · 第 ${progress.stage} 阶段</p>
      </div>
    </div>
    ${victory}
    <div class="main-quest-dimensions">${dimensionRows}</div>
    <div class="main-quest-stage-row">${stages}</div>
    <div class="main-quest-actions">
      <button class="btn btn-primary" data-action="close-modal">关闭</button>
    </div>
  </div>`, { wide: false });
}

export function showMainQuestStageNotification(data) {
  const stage = MAIN_QUEST_STAGES.find((item) => item.stage === data.stage);
  const overlay = document.createElement('div');
  overlay.className = 'main-quest-overlay main-quest-notify';
  overlay.innerHTML = `<div class="main-quest-notify-box">
    <div class="main-quest-notify-icon">${escapeHtml(stage?.icon || '★')}</div>
    <h2>${escapeHtml(data.title || '阶段达成')}</h2>
    <p>${escapeHtml(data.subtitle || '')}</p>
    ${data.nextTitle ? `<small>下一阶段：${escapeHtml(data.nextTitle)}</small>` : ''}
    <button class="btn btn-primary" data-action="close-main-quest-overlay">继续</button>
  </div>`;
  document.body.appendChild(overlay);
  window.setTimeout(() => closeMainQuestOverlay(overlay), 5000);
}

export function showMainQuestVictory(data) {
  const overlay = document.createElement('div');
  overlay.className = 'main-quest-overlay main-quest-victory';
  const grade = VICTORY_GRADES.find((item) => item.grade === data.grade) || VICTORY_GRADES[VICTORY_GRADES.length - 1];
  overlay.innerHTML = `<div class="main-quest-victory-box">
    <h2>苍穹之巅</h2>
    <p>航空帝国已成</p>
    <div class="main-quest-victory-dims">${MAIN_QUEST_DIMS.map((meta) => renderVictoryDimension(data.dimensions?.[meta.key], meta)).join('')}</div>
    <div class="main-quest-grade" style="color:${escapeAttr(grade.color)}">${escapeHtml(grade.grade)}</div>
    <strong>${escapeHtml(grade.title)}</strong>
    <small>经营 ${Number(data.turnsPlayed) || 0} 季达成通关 · 累计利润 ${fmt(data.totalProfit || 0)}</small>
    <div class="main-quest-victory-actions">
      <button class="btn btn-primary" data-action="end-victory-game">庆功收官</button>
      <button class="btn" data-action="continue-victory-game">继续经营</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

export function closeMainQuestOverlay(overlay = null) {
  const target = overlay || document.querySelector('.main-quest-overlay');
  if (!target) return;
  target.classList.add('closing');
  window.setTimeout(() => target.remove(), 180);
}

export function showVictoryEnding(state) {
  const grade = VICTORY_GRADES.find((item) => item.grade === state?.mainQuest?.victoryGrade) || VICTORY_GRADES[VICTORY_GRADES.length - 1];
  showModal(`<div class="gameover">
    <h1 style="color:#fbbf24">苍穹之巅</h1>
    <div class="main-quest-grade" style="color:${escapeAttr(grade.color)}">${escapeHtml(grade.grade)}</div>
    <p style="color:#fbbf24;font-weight:800">${escapeHtml(grade.title)}</p>
    <p>你的航空帝国已然建成。</p>
    <p>经营了 ${Number(state.turnsPlayed) || 0} 个季度</p>
    <p>最终资金：${fmt(state.cash || 0)} · 累计利润：${fmt(state.totalProfit || 0)}</p>
    <p>拥有 ${(state.routes || []).length} 条航线 · ${(state.fleet || []).length} 架飞机</p>
    <button class="btn btn-primary" data-action="reload-page" style="margin-top:16px;padding:10px 32px">重新开始</button>
  </div>`);
}

export function continueFromVictory() {
  closeMainQuestOverlay();
  showBanner('沙箱模式 · 继续经营', '#4ade80');
}

function renderDimension(dimension, meta) {
  if (!dimension) return '';
  const pct = dimension.target > 0 ? Math.min(100, dimension.current / dimension.target * 100) : 0;
  return `<div class="main-quest-dim ${dimension.met ? 'met' : ''}">
    <div class="main-quest-dim-head">
      <strong>${escapeHtml(meta.icon)} ${escapeHtml(meta.label)}</strong>
      <span>${dimension.met ? '已达标' : '未达标'}</span>
    </div>
    <div class="main-quest-dim-values">
      <b>${formatDimensionValue(dimension, meta.key)}</b>
      <small>/ ${formatDimensionTarget(dimension, meta.key)}</small>
    </div>
    <div class="main-quest-progress"><i style="width:${pct.toFixed(1)}%"></i></div>
  </div>`;
}

function renderStageDot(stage, stats) {
  const done = stats.stageCompleted.includes(stage.stage);
  const active = stats.currentStage === stage.stage && !stats.victoryGrade;
  return `<span class="main-quest-stage ${done ? 'done' : ''} ${active ? 'active' : ''}" title="${escapeAttr(stage.title)}">${stage.stage}</span>`;
}

function renderVictoryDimension(dimension, meta) {
  if (!dimension) return '';
  return `<div class="main-quest-victory-dim">
    <span>${escapeHtml(meta.icon)} ${escapeHtml(meta.label)}</span>
    <strong>${formatDimensionValue(dimension, meta.key)} / ${formatDimensionTarget(dimension, meta.key)}</strong>
  </div>`;
}

function formatDimensionValue(dimension, key) {
  if (key === 'cash') return fmt(dimension.current);
  if (key === 'routes') return `${dimension.current}条`;
  if (key === 'branch') return dimension.type === 'region' ? `${dimension.current} 大洲` : `${dimension.current}个子区域`;
  if (key === 'profit') return `${dimension.current}季`;
  return String(dimension.current);
}

function formatDimensionTarget(dimension, key) {
  if (key === 'cash') return fmt(dimension.target);
  if (key === 'routes') return `${dimension.target}条`;
  if (key === 'branch') return dimension.type === 'region' ? `${dimension.target} 大洲` : `${dimension.target}个子区域`;
  if (key === 'profit') return `${dimension.target}季`;
  return String(dimension.target);
}
