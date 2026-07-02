import { byId } from '../domain/helpers.js';

const ONBOARDING_DISMISSED_KEY = 'doudou.onboardingDismissed';

const ONBOARD_STEPS = [
  {
    id: 'welcome',
    title: '欢迎启航',
    body: '试试点击「购买飞机」扩充机队，然后在地图上点击总部或分部作为起飞城市来开通航线。',
    trigger: (state) => state.turnsPlayed === 0 && state.routes.length === 0,
  },
  {
    id: 'first-route',
    title: '开拓航路',
    body: '已拥有飞机！现在在地图上先点击总部，再点击另一个城市来开通航线。',
    trigger: (state) => state.fleet.filter((plane) => !plane.delivering).length > 0 && state.routes.length === 0,
  },
  {
    id: 'advance-turn',
    title: '推进时间',
    body: '航线已就绪！点击右下角「推进回合」按钮开始运营，查看首季财报。',
    trigger: (state) => state.routes.length > 0 && state.turnsPlayed === 0,
  },
  {
    id: 'branches',
    title: '开设分部',
    body: '航线只能从总部起飞。点击「开设分部」扩展基地网络，在更多城市设立分部即可从那里出发。',
    trigger: (state) => state.turnsPlayed >= 1 && (state.branches || []).length === 0 && state.routes.length >= 2,
  },
  {
    id: 'growth',
    title: '继续成长',
    body: '试试购买更多飞机、开设分部扩展基地，或使用「银行贷款」加速扩张。',
    trigger: (state) => state.turnsPlayed >= 2 && state.turnsPlayed <= 4,
  },
  {
    id: 'main-quest',
    title: '苍穹之路',
    body: '点击顶部「苍穹之路」查看主线目标。四个维度全部达标后会进入下一阶段。',
    trigger: (state) => state.turnsPlayed >= 3 && !state.mainQuest?.victoryGrade,
  },
];

let onboardingDismissed = readOnboardingDismissed();
let acknowledgedSteps = new Set();
let snoozedStateKey = null;

export function acknowledgeOnboarding() {
  const hint = byId('onboard-hint');
  if (!hint) return;
  const stepId = hint.dataset.onboardingStep;
  if (stepId) {
    acknowledgedSteps.add(stepId);
  }
  snoozedStateKey = hint.dataset.onboardingState || null;
  hint.style.display = 'none';
}

export function dismissOnboarding() {
  onboardingDismissed = true;
  try {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, '1');
  } catch {
    // Ignore storage failures; the current session still dismisses the hint.
  }
  const hint = byId('onboard-hint');
  if (hint) hint.style.display = 'none';
}

export function resetOnboarding() {
  onboardingDismissed = false;
  acknowledgedSteps = new Set();
  snoozedStateKey = null;
  try {
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
  } catch {
    // Ignore storage failures; the current session still resets the hint.
  }
}

export function updateOnboarding(state, uiState = {}) {
  const hint = byId('onboard-hint');
  if (!hint) return;
  if (onboardingDismissed || !state || state.gameOver || !state.hq || uiState.hqSelectMode || uiState.branchSelectMode) {
    hint.style.display = 'none';
    return;
  }
  const stateKey = onboardingStateKey(state);
  if (snoozedStateKey === stateKey) {
    hint.style.display = 'none';
    return;
  }
  const step = ONBOARD_STEPS.find((item) => !acknowledgedSteps.has(item.id) && item.trigger(state));
  if (!step) {
    hint.style.display = 'none';
    return;
  }
  hint.dataset.onboardingStep = step.id;
  hint.dataset.onboardingState = stateKey;
  hint.style.display = 'block';
  hint.querySelector('.hint-title').textContent = step.title;
  hint.querySelector('.hint-body').textContent = step.body;
  hint.querySelector('.hint-step').textContent = '新手引导';
}

function readOnboardingDismissed() {
  try {
    return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function onboardingStateKey(state) {
  const readyFleet = state.fleet.filter((plane) => !plane.delivering).length;
  return [
    state.turnsPlayed,
    state.routes.length,
    state.fleet.length,
    readyFleet,
    (state.branches || []).length,
    state.cash < 0 ? 'debt' : 'cash',
  ].join(':');
}
