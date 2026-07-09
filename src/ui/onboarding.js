import { byId } from '../domain/helpers.js';
import { escapeHtml } from './html.js';
import { showModal } from './modal.js';

const ONBOARDING_DISMISSED_KEY = 'doudou.onboardingDismissed';
const ONBOARDING_DONE_KEY = 'skyline_onboard_done';
const NORMAL_STEP_COUNT = 5;
const BRANCH_STEP_INDEX = -1;
const NORMAL_DISMISS_MS = 5000;

const ONBOARD_STEPS = [
  {
    id: 'welcome',
    stepIdx: 0,
    title: '欢迎启航',
    target: '#btn-buy-plane',
    spotlight: true,
    body: (state) => {
      const eraTip = {
        era1: ' 起步资金有限，优先选择短途航线控制成本。',
        era3: ' 资金充裕，可尝试窄体加宽体机队组合。',
        era4: ' 注意油价波动和时代变迁。',
      }[state.era] || '';
      return '点击「购买飞机」扩充机队，然后从总部或分部城市开通第一条航线。' + eraTip;
    },
    trigger: (state) => state.turnsPlayed === 0 && state.routes.length === 0,
  },
  {
    id: 'first-route',
    stepIdx: 1,
    title: '开拓航路',
    target: '#map-container',
    spotlight: true,
    body: '已拥有飞机。现在先点击总部，再点击另一个城市来开通航线。',
    trigger: (state) => readyFleetCount(state) > 0 && state.routes.length === 0,
  },
  {
    id: 'advance-turn',
    stepIdx: 2,
    title: '推进时间',
    target: '#advance-btn',
    spotlight: true,
    body: '航线已就绪。点击右下角「推进回合」开始运营，查看首季财报。',
    trigger: (state) => state.routes.length > 0 && state.turnsPlayed === 0,
  },
  {
    id: 'first-report',
    stepIdx: 3,
    title: '看懂财报',
    target: null,
    spotlight: false,
    body: '首季财报即将弹出。关注利润行：绿色代表盈利，红色代表亏损；收入看客座率，支出看燃油、运营和贷款。',
    trigger: (state) => state.turnsPlayed === 1 && !state._onboardReportShown,
  },
  {
    id: 'main-quest',
    stepIdx: 4,
    title: '苍穹之路',
    target: '#hud-main-quest-btn',
    spotlight: true,
    body: '点击顶部「苍穹之路」查看主线目标。四个维度全部达标后会进入下一阶段。',
    trigger: (state) => state.turnsPlayed >= 2 && !state._mainQuestOnboardShown && !state.mainQuest?.victoryGrade,
  },
  {
    id: 'branches',
    stepIdx: BRANCH_STEP_INDEX,
    priority: 1,
    title: '分部扩展',
    body: '航线只能从总部或分部起飞。现金充足时，可以用「分部管理」扩展基地网络。',
    trigger: (state) => state.turnsPlayed >= 3
      && (state.branches || []).length === 0
      && (state.branchesConstructing || []).length === 0
      && state.routes.length >= 2
      && state.cash >= 30,
  },
  {
    id: 'route-tip',
    stepIdx: BRANCH_STEP_INDEX,
    priority: 1,
    title: '航线小贴士',
    body: '开航线分两步：先点击起飞城市，再点击目的地城市。起飞城市必须是总部或分部。',
    trigger: (state) => state.turnsPlayed >= 3 && state.routes.length === 0 && readyFleetCount(state) > 0,
  },
  {
    id: 'low-cash',
    stepIdx: BRANCH_STEP_INDEX,
    priority: 1,
    title: '资金告急',
    body: '资金不足时可以考虑银行贷款。借款能加速扩张，但每季度会增加利息压力。',
    trigger: (state) => state.cash < 20 && state.turnsPlayed >= 1 && (state.loan || 0) === 0,
  },
];

const FTP_CARDS = [
  {
    id: 'ops_panel',
    title: '运营三档',
    body: '服务档影响客座率，维修档影响故障率，广告档影响品牌和需求。高档更强也更贵。',
    trigger: (state) => Boolean(state._opsPanelOpened),
  },
  {
    id: 'fault_first',
    title: '故障来了',
    body: '故障率受机龄、维修档和运营效能影响。严重故障会减少收入，致命事故还会损失飞机。',
    trigger: (state) => (state._faultsThisTurn || []).length > 0,
  },
  {
    id: 'low_loadfactor',
    title: '客座率告急',
    body: '客座率低于 60% 时航线更容易亏损。可通过服务、广告、票价和机型容量调整改善。',
    trigger: (state) => (state.routes || []).some((route) => Number(route.loadFactor) < 0.6),
  },
  {
    id: 'stock_first',
    title: '股市有风险',
    body: '每季股价会受新闻、盛事和市场情绪影响。低买高卖之外，也要注意资金占用。',
    trigger: (state) => Boolean(state._stockPanelOpened),
  },
];

const HELP_MECHANICS = [
  { icon: '🛠', title: '运营效能', formula: '满编率 × 士气/60', range: '30% 到 150%', affects: '客座率、品牌成长、故障风险', tip: '保持满编率和士气在健康区间。' },
  { icon: '💺', title: '客座率', formula: '实际乘客 / 座位容量', range: '0% 到 100%', affects: '航线收入', tip: '低于 60% 时优先检查票价和容量。' },
  { icon: '⚠', title: '故障系统', formula: '基础率 × 机龄 × 维修 × 效能', range: '随机触发', affects: '航线收入、品牌和机队', tip: '老飞机配低维修预算风险最高。' },
  { icon: '⭐', title: '品牌评级', formula: '盈利、广告和事件推动', range: '1 到 10', affects: '需求和票价容忍度', tip: '稳定盈利比短期扩张更能托住品牌。' },
  { icon: '📈', title: '证券市场', formula: '新闻和时代驱动涨跌', range: '板块差异明显', affects: '投资收益和现金占用', tip: '盛事和科技新闻常会影响相关板块。' },
  { icon: '🏦', title: '银行贷款', formula: '余额 × 季度利率', range: '最低借款 $10M', affects: '扩张速度和利息压力', tip: '季度利润能覆盖利息时借贷更稳。' },
];

const HELP_GUIDES = [
  { title: '开通航线', steps: ['购买或租赁可用飞机', '点击总部或分部作为起飞城市', '点击目的地城市', '选择执飞机型和票价', '确认开通并推进季度观察表现'] },
  { title: '建立分部', steps: ['打开分部管理', '选择目标城市', '确认建设费用', '等待施工完成', '从新分部开通更多航线'] },
  { title: '调整运营预算', steps: ['打开运营管理', '比较服务、维修、广告三档成本', '高档提升效果但费用更高', '低档省钱但会增加经营风险'] },
  { title: '股票交易', steps: ['点击底部 NASDOU', '选择目标股票', '使用快捷金额买卖', '结合新闻和盛事判断时机'] },
];

let onboardingDismissed = readFlag(ONBOARDING_DISMISSED_KEY);
let dismissedHints = new Set();
let dismissCooldown = {};
let spotlightActive = false;
let spotlightDimCount = 0;
let ftpQueue = [];
let ftpShowing = false;
let onboardCompleteToastShown = false;

export function acknowledgeOnboarding() {
  const hint = byId('onboard-hint');
  if (!hint) return;
  const stepId = hint.dataset.onboardingStep;
  const stepIdx = hint.dataset.stepIdx;
  const isBranch = hint.dataset.branchHint === 'true';
  if (stepId) dismissedHints.add(isBranch ? `branch:${stepId}` : stepId);
  if (stepIdx !== undefined && stepIdx !== '' && !isBranch) {
    dismissedHints.add(String(stepIdx));
    dismissCooldown[stepIdx] = Date.now() + NORMAL_DISMISS_MS;
  }
  hint.style.display = 'none';
  hint.style.zIndex = '';
  clearSpotlight();
}

export function dismissOnboarding(state = null) {
  onboardingDismissed = true;
  if (state) state.onboardStep = 99;
  setFlag(ONBOARDING_DISMISSED_KEY, '1');
  setFlag(ONBOARDING_DONE_KEY, '1');
  dismissedHints = new Set();
  dismissCooldown = {};
  hideHint();
  clearSpotlight();
  showOnboardCompleteToast();
}

export function resetOnboarding(state = null) {
  onboardingDismissed = false;
  if (state) state.onboardStep = 0;
  dismissedHints = new Set();
  dismissCooldown = {};
  spotlightDimCount = 0;
  onboardCompleteToastShown = false;
  removeFlag(ONBOARDING_DISMISSED_KEY);
  removeFlag(ONBOARDING_DONE_KEY);
  clearSpotlight();
}

export function hasCompletedOnboarding() {
  return readFlag(ONBOARDING_DONE_KEY) || onboardingDismissed;
}

export function resetBranchDismiss() {
  dismissedHints.delete(String(BRANCH_STEP_INDEX));
  dismissedHints = new Set([...dismissedHints].filter((key) => !key.startsWith('branch:')));
}

export function completeOnboardingStep(state, stepIdx) {
  if (!state || state.onboardStep >= 99) return false;
  const previous = Number(state.onboardStep) || 0;
  if (state.onboardStep <= stepIdx) {
    state.onboardStep = stepIdx + 1;
  }
  dismissedHints.delete(String(stepIdx));
  delete dismissCooldown[stepIdx];
  const completed = previous < NORMAL_STEP_COUNT && state.onboardStep >= NORMAL_STEP_COUNT;
  if (completed) {
    setFlag(ONBOARDING_DONE_KEY, '1');
    showOnboardCompleteToast();
  }
  clearSpotlight();
  return state.onboardStep !== previous;
}

export function selectOnboardingStep(state, uiState = {}, options = {}) {
  if (!state || state.gameOver || !state.hq || uiState.hqSelectMode || uiState.branchSelectMode) return null;
  const now = options.now || Date.now();
  const skipNormal = onboardingDismissed || Number(state.onboardStep) >= 99;
  const normalStep = skipNormal ? null : ONBOARD_STEPS.find((step) => !step.priority
    && state.onboardStep <= step.stepIdx
    && step.trigger(state)
    && (options.ignoreDismissed || !isStepDismissed(step, now)));
  const branchStep = ONBOARD_STEPS.find((step) => step.priority === 1
    && step.trigger(state)
    && (options.ignoreDismissed || !isStepDismissed(step, now)));
  return normalStep || branchStep || null;
}

export function updateOnboarding(state, uiState = {}) {
  const hint = byId('onboard-hint');
  if (!hint) return;
  if (!state || state.gameOver || uiState.hqSelectMode || uiState.branchSelectMode) {
    hideHint();
    clearSpotlight();
    return;
  }
  const step = selectOnboardingStep(state, uiState);
  if (!step) {
    hideHint();
    clearSpotlight();
    return;
  }
  const isBranch = step.priority === 1;
  const previousStep = hint.dataset.stepIdx;
  if (!isBranch && previousStep !== undefined && previousStep !== '' && previousStep !== String(step.stepIdx)) {
    spotlightDimCount = Math.min(spotlightDimCount + 1, 2);
  }
  hint.dataset.onboardingStep = step.id;
  hint.dataset.stepIdx = String(step.stepIdx);
  hint.dataset.branchHint = isBranch ? 'true' : 'false';
  hint.style.display = 'block';
  hint.style.borderColor = isBranch ? '#fbbf24' : '#4ade80';
  hint.style.zIndex = !isBranch && step.stepIdx === 3 ? '110' : '';
  setText(hint, '.hint-title', step.title);
  setText(hint, '.hint-body', typeof step.body === 'function' ? step.body(state) : step.body);
  setText(hint, '.hint-step', isBranch ? '小贴士' : '新手引导');
  const skip = hint.querySelector('.hint-skip');
  if (skip) skip.hidden = isBranch;
  if (!isBranch && step.spotlight && step.target) activateSpotlight(step.target);
  else clearSpotlight();
}

export function checkFirstTimePopups(state, options = {}) {
  if (!state || Number(state.onboardStep) >= 99) return [];
  if (!state.ftpShown || typeof state.ftpShown !== 'object' || Array.isArray(state.ftpShown)) state.ftpShown = {};
  const triggered = [];
  FTP_CARDS.forEach((card) => {
    if (!state.ftpShown[card.id] && card.trigger(state)) {
      state.ftpShown[card.id] = true;
      triggered.push(card);
      ftpQueue.push(card);
    }
  });
  if (options.render !== false && !ftpShowing && ftpQueue.length > 0) showNextFirstTimePopup();
  return triggered;
}

export function closeFirstTimePopup() {
  const overlay = byId('ftp-card-overlay');
  if (overlay) overlay.remove();
  showNextFirstTimePopup();
}

export function showHelpPanel(state, tab = 'mechanics') {
  const activeTab = ['mechanics', 'guides', 'replay'].includes(tab) ? tab : 'mechanics';
  showModal(`<div class="help-panel">
    <div class="help-panel-head">
      <h2>帮助</h2>
      <button class="modal-close" type="button" data-action="close-modal" title="关闭">×</button>
    </div>
    <div class="tabs" id="help-tabs">
      ${renderHelpTab('mechanics', '机制速查', activeTab)}
      ${renderHelpTab('guides', '操作指南', activeTab)}
      ${renderHelpTab('replay', '引导回放', activeTab)}
    </div>
    <div class="help-content">${renderHelpContent(activeTab, state)}</div>
  </div>`, { wide: false });
}

function showNextFirstTimePopup() {
  if (typeof document === 'undefined') return;
  const existing = byId('ftp-card-overlay');
  if (existing) existing.remove();
  if (ftpQueue.length === 0) {
    ftpShowing = false;
    return;
  }
  ftpShowing = true;
  const card = ftpQueue.shift();
  const overlay = document.createElement('div');
  overlay.id = 'ftp-card-overlay';
  overlay.className = 'ftp-card-overlay';
  overlay.innerHTML = `<div class="ftp-card">
    <div class="ftp-card-icon">💡</div>
    <div class="ftp-card-title">${escapeHtml(card.title)}</div>
    <div class="ftp-card-body">${escapeHtml(card.body)}</div>
    <button class="btn btn-primary" type="button" data-action="close-ftp-card">知道了</button>
  </div>`;
  document.body.appendChild(overlay);
}

function renderHelpTab(id, label, activeTab) {
  return `<button class="tab${activeTab === id ? ' active' : ''}" type="button" data-action="switch-help-tab" data-help-tab="${id}">${escapeHtml(label)}</button>`;
}

function renderHelpContent(tab, state) {
  if (tab === 'guides') return renderHelpGuides();
  if (tab === 'replay') return renderHelpReplay(state);
  return renderHelpMechanics();
}

function renderHelpMechanics() {
  return HELP_MECHANICS.map((item) => `<article class="help-mech-card">
    <div class="help-mech-icon">${escapeHtml(item.icon)}</div>
    <h3>${escapeHtml(item.title)}</h3>
    <div class="help-mech-row"><span>公式</span><strong>${escapeHtml(item.formula)}</strong></div>
    <div class="help-mech-row"><span>范围</span><strong>${escapeHtml(item.range)}</strong></div>
    <div class="help-mech-row"><span>影响</span><strong>${escapeHtml(item.affects)}</strong></div>
    <p>${escapeHtml(item.tip)}</p>
  </article>`).join('');
}

function renderHelpGuides() {
  return HELP_GUIDES.map((guide) => `<article class="help-guide-card">
    <h3>${escapeHtml(guide.title)}</h3>
    ${guide.steps.map((step, index) => `<div class="help-guide-step"><span>${index + 1}</span><p>${escapeHtml(step)}</p></div>`).join('')}
  </article>`).join('');
}

function renderHelpReplay(state) {
  const completed = hasCompletedOnboarding();
  const current = state ? `当前引导进度：${Number(state.onboardStep) >= 99 ? '已跳过' : `第 ${(Number(state.onboardStep) || 0) + 1} 步`}` : '游戏开始后可重播引导。';
  return `<article class="help-replay-card">
    <h3>引导回放</h3>
    <p>${completed ? '你已经完成或跳过新手引导。' : '你还没有完成新手引导。'}${escapeHtml(current)}</p>
    <button class="btn btn-primary" type="button" data-action="reset-onboarding">重播新手引导</button>
  </article>`;
}

function activateSpotlight(selector) {
  clearSpotlight();
  if (typeof document === 'undefined') return;
  const target = document.querySelector(selector);
  if (!target) return;
  spotlightActive = true;
  document.body.classList.add('spotlight-active');
  const opacity = [0.15, 0.35, 0.55][Math.min(spotlightDimCount, 2)];
  document.body.style.setProperty('--spotlight-dim-opacity', String(opacity));
  target.classList.add('spotlight-target-pulse');
}

function clearSpotlight() {
  if (typeof document === 'undefined' || !spotlightActive) return;
  document.body.classList.remove('spotlight-active');
  document.body.style.removeProperty('--spotlight-dim-opacity');
  document.querySelectorAll('.spotlight-target-pulse').forEach((target) => target.classList.remove('spotlight-target-pulse'));
  spotlightActive = false;
}

function hideHint() {
  const hint = byId('onboard-hint');
  if (!hint) return;
  hint.style.display = 'none';
  hint.style.zIndex = '';
}

function setText(root, selector, value) {
  const el = root.querySelector(selector);
  if (el) el.textContent = value;
}

function isStepDismissed(step, now) {
  if (step.priority) return dismissedHints.has(`branch:${step.id}`) || dismissedHints.has(String(step.stepIdx));
  if (!dismissedHints.has(String(step.stepIdx)) && !dismissedHints.has(step.id)) return false;
  if (dismissCooldown[step.stepIdx] && now < dismissCooldown[step.stepIdx]) return true;
  dismissedHints.delete(String(step.stepIdx));
  dismissedHints.delete(step.id);
  delete dismissCooldown[step.stepIdx];
  return false;
}

function readyFleetCount(state) {
  return (state.fleet || []).filter((plane) => !plane.delivering).length;
}

function updateCurrentHintSoon() {
  const hint = byId('onboard-hint');
  if (!hint) return;
  hint.style.display = 'none';
}

function showOnboardCompleteToast() {
  if (onboardCompleteToastShown || typeof document === 'undefined' || byId('onboard-complete-toast')) return;
  onboardCompleteToastShown = true;
  const toast = document.createElement('div');
  toast.id = 'onboard-complete-toast';
  toast.className = 'onboard-complete-toast';
  toast.textContent = '新手引导完成。需要帮助时点击右下角 ?';
  document.body.appendChild(toast);
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => window.setTimeout(fn, 0);
  raf(() => {
    toast.classList.add('visible');
  });
  window.setTimeout(() => {
    toast.classList.remove('visible');
    window.setTimeout(() => toast.remove(), 500);
  }, 2500);
}

function readFlag(key) {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function setFlag(key, value) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    // Storage is optional; current session state still updates.
  }
}

function removeFlag(key) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    // Storage is optional; current session state still updates.
  }
}
