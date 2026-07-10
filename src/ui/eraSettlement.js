import { fmt } from '../domain/helpers.js';
import { escapeHtml } from './html.js';
import { renderModalRoot } from './modal.js';

const OUTCOME_COPY = Object.freeze({
  victory: { title: '苍穹之路已完成', detail: '你在时代落幕前建成了完整的航空帝国。' },
  final_stage: { title: '距离巅峰一步之遥', detail: '全球网络已经成形，最后一阶段仍等待完成。' },
  expansion: { title: '区域网络已成形', detail: '公司跨过了起步期，但距离全球航空集团仍有航程。' },
  foundation: { title: '航程仍待续写', detail: '公司完成了时代航程，主线经营目标尚未充分展开。' },
});

export function showEraSettlement(state) {
  const html = buildEraSettlementHtml(state);
  if (!html) return false;
  renderModalRoot(html);
  return true;
}

export function buildEraSettlementHtml(state) {
  const settlement = state?.eraSettlement;
  const result = settlement?.result;
  if (settlement?.status !== 'pending' || !result) return '';
  const copy = OUTCOME_COPY[result.outcome] || OUTCOME_COPY.foundation;
  const grade = result.victoryGrade
    ? `<div class="era-settlement-grade" aria-label="通关评级 ${escapeHtml(result.victoryGrade)}">${escapeHtml(result.victoryGrade)}</div>`
    : '';
  return `<div class="modal-overlay">
    <div class="modal era-settlement-modal">
      <div class="era-settlement-kicker">${result.startYear}-${result.endYear} · ${result.deadlineTurn} 季</div>
      <h1>时代航程结算</h1>
      ${grade}
      <h2>${escapeHtml(copy.title)}</h2>
      <p class="era-settlement-detail">${escapeHtml(copy.detail)}</p>
      <div class="era-settlement-stages" aria-label="苍穹之路完成 ${result.completedStages} 个阶段">
        ${renderStageProgress(result.completedStages)}
      </div>
      <div class="era-settlement-stats">
        ${renderStat('公司市值', fmt(result.companyValue))}
        ${renderStat('航线', `${result.routes} 条`)}
        ${renderStat('机队', `${result.fleet} 架`)}
        ${renderStat('基地覆盖', `${result.baseRegions} 大洲`)}
      </div>
      <div class="era-settlement-finance">
        <span>最终现金 <strong>${fmt(result.cash)}</strong></span>
        <span>累计利润 <strong>${fmt(result.totalProfit)}</strong></span>
      </div>
      <div class="era-settlement-actions">
        <button class="btn btn-primary" type="button" data-action="retire-era">时代收官</button>
        <button class="btn btn-secondary" type="button" data-action="continue-era-sandbox">进入沙箱</button>
      </div>
    </div>
  </div>`;
}

export function showEraRetirement(state) {
  const result = state?.eraSettlement?.result;
  if (!result) return;
  const copy = OUTCOME_COPY[result.outcome] || OUTCOME_COPY.foundation;
  renderModalRoot(`<div class="modal-overlay">
    <div class="modal era-retirement">
      <div class="era-settlement-kicker">${result.startYear}-${result.endYear}</div>
      <h1>时代落幕</h1>
      <h2>${escapeHtml(copy.title)}</h2>
      <p>${escapeHtml(state.companyName || '')} 完成了 ${result.deadlineTurn} 个季度的经营。</p>
      <p>公司市值 ${fmt(result.companyValue)} · 累计利润 ${fmt(result.totalProfit)}</p>
      <p>拥有 ${result.routes} 条航线 · ${result.fleet} 架飞机 · 覆盖 ${result.baseRegions} 大洲</p>
      <button class="btn btn-primary" type="button" data-action="reload-page">重新开始</button>
    </div>
  </div>`);
}

function renderStageProgress(completedStages) {
  return [1, 2, 3].map((stage) => `<span class="${stage <= completedStages ? 'completed' : ''}">${stage}</span>`).join('');
}

function renderStat(label, value) {
  return `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`;
}
