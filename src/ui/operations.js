import {
  calcOpsBudgetCost,
  calcOpsEfficiency,
  calcStaffNeeded,
  getBonusOptions,
  getRecruitOptions,
  hasPendingContracts,
  moraleStars,
  pendingContractLabels,
} from '../domain/operations.js';
import { byId, fmt } from '../domain/helpers.js';
import { escapeHtml } from './html.js';
import { showModal } from './modal.js';

let contractCards = {};
let guideVisible = false;
let highlightedContract = null;

export function showOperationsPanel(state) {
  refreshOpsNumbers(state);
  const budget = calcOpsBudgetCost(state);
  const fillRate = state.staffNeeded > 0 ? state.staffCount / state.staffNeeded : 1;
  const opsPct = state.opsEfficiency > 0 ? `${(state.opsEfficiency * 100).toFixed(0)}%` : '--';
  const fillPct = `${(fillRate * 100).toFixed(0)}%`;
  const staffDisplay = Math.round((state.staffCount || 0) * 1000).toLocaleString();
  const needDisplay = Math.round((state.staffNeeded || 0) * 1000).toLocaleString();

  let html = `<h2>运营管理</h2>
    <div class="ops-section">
      <div class="ops-section-title">员工</div>
      <div class="ops-row"><span>在编</span><strong>${staffDisplay}人</strong></div>
      <div class="ops-row"><span>运营需求</span><strong>${needDisplay}人</strong></div>
      <div class="ops-row"><span>满编率</span><strong class="${fillRate >= 0.8 ? 'positive' : fillRate >= 0.6 ? 'warning' : 'negative'}">${fillPct}</strong></div>
      <div class="ops-row"><span>士气</span><strong class="warning">${moraleStars(state.staffMorale)}</strong></div>
      <div class="ops-row"><span>运营效能</span><strong class="${state.opsEfficiency >= 1 ? 'positive' : state.opsEfficiency >= 0.7 ? 'warning' : 'negative'}">${opsPct}</strong></div>
    </div>
    ${renderBudgetSection('服务预算', 'serviceTier', state.serviceTier, { low: '经济', mid: '标准', high: '豪华' }, budget.serviceCost)}
    ${renderBudgetSection('维修预算', 'maintTier', state.maintTier, { low: '基础', mid: '标准', high: '深度' }, budget.maintCost)}
    ${renderBudgetSection('广告预算', 'adTier', state.adTier, { low: '口碑', mid: '标准', high: '饱和' }, budget.adCost)}`;

  if (state.accidentPenalty < 0) {
    html += `<div class="ops-section ops-warning-section">
      <div class="ops-row"><span>事故后效</span><strong class="negative">全局客座率 ${(state.accidentPenalty * 100).toFixed(0)}% · 剩余${state.accidentPenaltyTurns}季</strong></div>
    </div>`;
  }

  html += `<div class="ops-total"><span>本季运营预算合计</span><strong>${fmt(budget.total)}</strong></div>`;

  if (hasPendingContracts(state)) {
    html += `<div class="ops-section ops-contract-section">
      <div class="ops-section-title">待签署合同</div>
      <p>${pendingContractLabels(state).join('、')}尚待签署</p>
      <div class="ops-contract-actions">
        ${state._pendingRecruit ? '<button class="btn btn-warning btn-sm" data-action="open-contract-from-panel" data-contract-type="recruit">签署招聘</button>' : ''}
        ${state._pendingBonus ? '<button class="btn btn-warning btn-sm" data-action="open-contract-from-panel" data-contract-type="bonus">签署奖金</button>' : ''}
      </div>
    </div>`;
  }

  html += '<div style="margin-top:16px;text-align:center"><button class="btn btn-primary" data-action="close-modal" style="padding:8px 32px">关闭</button></div>';
  showModal(`<div class="ops-modal">${html}</div>`);
}

export function spawnPendingContracts(state) {
  if (!state || state.gameOver) {
    restoreContractState(state);
    return;
  }
  if (state._pendingRecruit && !contractCards.recruit) {
    contractCards.recruit = { expanded: false, selected: 'standard', signing: false, receiptText: '' };
  }
  if (state._pendingBonus && !contractCards.bonus) {
    contractCards.bonus = { expanded: false, selected: 'mid', signing: false, receiptText: '' };
  }
  if (!state._pendingRecruit && contractCards.recruit && !contractCards.recruit.signing) delete contractCards.recruit;
  if (!state._pendingBonus && contractCards.bonus && !contractCards.bonus.signing) delete contractCards.bonus;
  renderContractZone(state);
  updateAdvanceButton(state);
}

export function restoreContractState(state) {
  contractCards = {};
  guideVisible = false;
  highlightedContract = null;
  const zone = byId('contract-zone');
  if (zone) zone.innerHTML = '';
  if (state && !state.gameOver) spawnPendingContracts(state);
  updateAdvanceButton(state);
}

export function renderContractZone(state) {
  const zone = byId('contract-zone');
  if (!zone) return;
  const parts = [];
  if (contractCards.recruit) parts.push(renderContractCard(state, 'recruit'));
  if (contractCards.bonus) parts.push(renderContractCard(state, 'bonus'));
  if (guideVisible && hasPendingContracts(state)) {
    parts.push(`<div class="advance-guide">
      <span>请先签署：${escapeHtml(pendingContractLabels(state).join('、'))}</span>
      <button type="button" data-action="advance-contract-guide">去签署</button>
    </div>`);
  }
  zone.innerHTML = parts.join('');
}

export function updateAdvanceButton(state) {
  const btn = byId('advance-btn');
  if (!btn) return;
  if (hasPendingContracts(state)) {
    btn.textContent = '⚠ 有待签署';
    btn.classList.add('advance-warned');
  } else {
    btn.textContent = '推进回合 ▶';
    btn.classList.remove('advance-warned');
    guideVisible = false;
  }
}

export function showAdvanceContractGuide(state) {
  guideVisible = true;
  renderContractZone(state);
  updateAdvanceButton(state);
}

export function toggleContract(state, type) {
  ensureContractCard(state, type);
  const card = contractCards[type];
  if (!card || card.signing) return;
  card.expanded = !card.expanded;
  renderContractZone(state);
}

export function selectContractOption(state, type, key) {
  ensureContractCard(state, type);
  const card = contractCards[type];
  if (!card || card.signing) return;
  card.selected = key;
  renderContractZone(state);
}

export function getContractSelection(type) {
  return contractCards[type]?.selected || (type === 'bonus' ? 'mid' : 'standard');
}

export function markContractSigned(state, type, result) {
  ensureContractCard(state, type);
  const card = contractCards[type];
  if (!card) return;
  card.signing = true;
  card.expanded = false;
  card.receiptText = result.receiptText;
  guideVisible = false;
  renderContractZone(state);
  updateAdvanceButton(state);
}

export function clearSignedContract(state, type) {
  delete contractCards[type];
  if (type === 'recruit' && state?._pendingBonus) {
    ensureContractCard(state, 'bonus');
    if (contractCards.bonus) contractCards.bonus.expanded = true;
  }
  renderContractZone(state);
  updateAdvanceButton(state);
}

export function focusContractFromPanel(state, type) {
  ensureContractCard(state, type);
  const card = contractCards[type];
  if (!card) return;
  card.expanded = true;
  highlightedContract = type;
  guideVisible = false;
  renderContractZone(state);
  updateAdvanceButton(state);
  window.setTimeout(() => {
    highlightedContract = null;
    renderContractZone(state);
  }, 700);
}

function renderBudgetSection(title, field, currentTier, labels, cost) {
  return `<div class="ops-section">
    <div class="ops-section-title">${title}</div>
    <div class="ops-tier-row">
      ${Object.entries(labels).map(([tier, label]) => `<button type="button" class="ops-tier-btn${currentTier === tier ? ' active' : ''}" data-action="set-ops-tier" data-field="${field}" data-tier="${tier}">${label}</button>`).join('')}
    </div>
    <div class="ops-row"><span>本季费用</span><strong class="negative">${fmt(cost)}</strong></div>
  </div>`;
}

function renderContractCard(state, type) {
  const card = contractCards[type];
  const isRecruit = type === 'recruit';
  const title = isRecruit ? '年度招聘' : '年终奖金';
  const className = [
    'contract-card',
    card.signing ? 'contract-signed' : card.expanded ? 'contract-expanded' : 'contract-folded',
    highlightedContract === type ? 'contract-highlight' : '',
  ].filter(Boolean).join(' ');

  if (card.signing) {
    return `<div class="${className}" id="contract-card-${type}">
      <div class="contract-header-static">
        <span class="contract-title">${title}</span>
        <span class="contract-badge signed">已签署 ✓</span>
      </div>
      <div class="contract-receipt-text">${escapeHtml(card.receiptText || '已签署')}</div>
    </div>`;
  }

  return `<div class="${className}" id="contract-card-${type}">
    <button type="button" class="contract-header-btn" data-action="toggle-contract" data-contract-type="${type}">
      <span class="contract-title">${title}</span>
      ${card.expanded ? `<span class="contract-quarter">${state.year} Q${state.quarter}</span>` : '<span class="contract-badge unsigned">未签署</span><span class="dot-pulse"></span>'}
      <span class="contract-arrow">${card.expanded ? '▲' : '▼'}</span>
    </button>
    ${card.expanded ? `<div class="contract-body">${isRecruit ? renderRecruitBody(state, card) : renderBonusBody(state, card)}</div>` : ''}
  </div>`;
}

function renderRecruitBody(state, card) {
  refreshOpsNumbers(state);
  const fillRate = state.staffNeeded > 0 ? state.staffCount / state.staffNeeded : 1;
  const options = getRecruitOptions(state);
  return `<div class="contract-info">
      <span>在编 ${Math.round(state.staffCount * 1000).toLocaleString()}人</span>
      <span>需求 ${Math.round(state.staffNeeded * 1000).toLocaleString()}人</span>
      <span>满编 ${(fillRate * 100).toFixed(0)}%</span>
    </div>
    <div class="contract-options">
      ${options.map((option) => renderContractOption('recruit', option, card.selected)).join('')}
    </div>
    <button class="contract-sign-btn" type="button" data-action="sign-contract" data-contract-type="recruit">签署合同 ✓</button>`;
}

function renderBonusBody(state, card) {
  const options = getBonusOptions(state);
  return `<div class="contract-info">
      <span>士气 ${moraleStars(state.staffMorale)}</span>
      <span>在编 ${Math.round((state.staffCount || 0) * 1000).toLocaleString()}人</span>
    </div>
    <div class="contract-options">
      ${options.map((option) => renderContractOption('bonus', option, card.selected)).join('')}
    </div>
    <button class="contract-sign-btn" type="button" data-action="sign-contract" data-contract-type="bonus">签署合同 ✓</button>`;
}

function renderContractOption(type, option, selected) {
  const active = selected === option.key ? ' selected' : '';
  const desc = type === 'recruit' ? `满编 ${option.fillPct}%` : `士气 +${option.morale}`;
  const qty = type === 'recruit' && option.qty > 0 ? `<div class="opt-qty">+${Math.round(option.qty * 1000)}人</div>` : '';
  return `<button type="button" class="contract-option${active}" data-action="select-contract-option" data-contract-type="${type}" data-option="${option.key}">
    <span class="opt-name">${escapeHtml(option.label)}</span>
    <span class="opt-desc">${desc}</span>
    <span class="opt-cost ${option.cost > 0 ? 'negative' : ''}">${option.cost > 0 ? fmt(option.cost) : '$0M'}</span>
    ${qty}
  </button>`;
}

function ensureContractCard(state, type) {
  if (!state) return;
  if (type === 'recruit' && state._pendingRecruit && !contractCards.recruit) {
    contractCards.recruit = { expanded: false, selected: 'standard', signing: false, receiptText: '' };
  }
  if (type === 'bonus' && state._pendingBonus && !contractCards.bonus) {
    contractCards.bonus = { expanded: false, selected: 'mid', signing: false, receiptText: '' };
  }
}

function refreshOpsNumbers(state) {
  state.staffNeeded = calcStaffNeeded(state);
  if (state.turnsPlayed > 0 || state.opsEfficiency > 0) state.opsEfficiency = calcOpsEfficiency(state);
}
