import './styles/app.css';

import { actionNames, createDelegatedActionHandler } from './app/actionDispatcher.js';
import { createFinanceController } from './app/financeController.js';
import { createNetworkController } from './app/networkController.js';
import { createTurnController } from './app/turnController.js';
import { ERAS } from './data/eras.js';
import { normalizePlayerTrait } from './data/playerTraits.js';
import { DEFAULT_COMPANY_NAME } from './domain/constants.js';
import { byId } from './domain/helpers.js';
import { checkMilestones } from './domain/milestones.js';
import { loadGameState, saveGameState } from './domain/save.js';
import { createSetupState, initState, seedInitialFleet } from './domain/state.js';
import { updateHUD } from './ui/hud.js';
import { closeModalRoot, showBanner, showModal } from './ui/modal.js';
import { closeMainQuestOverlay, continueFromVictory, showMainQuestPanel, showVictoryEnding } from './ui/mainQuest.js';
import { showMilestoneList, showMilestoneNotification } from './ui/milestones.js';
import { restoreContractState, spawnPendingContracts } from './ui/operations.js';
import { showVersionLog } from './ui/versionLog.js';
import { focusMapOnCity, initMapDrag, renderMap } from './ui/map.js';
import { hideRouteCreateInfo, renderPanel } from './ui/panel.js';
import { applySeasonTheme } from './ui/season.js';
import { removeBranchBanner } from './ui/branches.js';
import {
  acknowledgeOnboarding,
  checkFirstTimePopups,
  closeFirstTimePopup,
  completeOnboardingStep,
  dismissOnboarding,
  resetOnboarding,
  showHelpPanel,
  updateOnboarding,
} from './ui/onboarding.js';
import { closeDeliveryPopup } from './ui/modals.js';
import {
  getTutorialCompanyName,
  hideTutorial,
  initTutorial,
  removeHQBanner,
  selectEraCard,
  setTutorialCompanyName,
  showCreditsMenu,
  showEraMenu,
  showHQBanner,
  showMainMenu,
  showSaveMenu,
  showTutorial,
} from './ui/tutorial.js';
import { openTraitCoins, removeTraitOverlay, revealSelectedTrait, showTraitEnvelope } from './ui/traits.js';

const APP_SETTINGS_KEY = 'doudou.appSettings';
const appSettings = loadAppSettings();

let G = null;
const uiState = {
  selectedEra: ERAS[0].id,
  hqSelectMode: false,
  selectedHQ: null,
  branchSelectMode: false,
  selectedBranch: null,
  skipOnboarding: false,
  showBoundaries: appSettings.showBoundaries,
  mapStyle: appSettings.mapStyle,
};

function state() {
  return G;
}

function renderGame() {
  if (!G) return;
  applySeasonTheme(G);
  updateHUD(G);
  renderMap(G, uiState);
  renderPanel(G, uiState);
  updateOnboarding(G, uiState);
  spawnPendingContracts(G);
}

function renderMapOnly() {
  if (G) renderMap(G, uiState);
}

function updateMilestones() {
  if (!G) return;
  const newlyUnlocked = checkMilestones(G);
  updateHUD(G);
  showMilestoneNotification(newlyUnlocked);
}

function setBottomHint(message = '') {
  const hint = byId('bottom-hint');
  if (!hint) return;
  const text = message.trim();
  hint.textContent = text;
  hint.hidden = !text;
}

function scrollPanelToTop() {
  const panel = byId('panel');
  if (panel) panel.scrollTop = 0;
}

function loadAppSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || '{}');
    return {
      showBoundaries: stored.showBoundaries !== false,
      mapStyle: stored.mapStyle === 'terrain' ? 'terrain' : 'classic',
    };
  } catch {
    return { showBoundaries: true, mapStyle: 'classic' };
  }
}

function saveAppSettings() {
  try {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(appSettings));
  } catch {
    // Ignore storage failures; settings still apply in the current session.
  }
}

function showSettings() {
  const checked = appSettings.showBoundaries ? 'checked' : '';
  const classicActive = appSettings.mapStyle === 'terrain' ? '' : ' active';
  const terrainActive = appSettings.mapStyle === 'terrain' ? ' active' : '';
  showModal(`<h2>设置</h2>
    <div class="settings-field">
      <div>
        <strong>地图样式</strong>
        <small>经典适合清晰查看航线，地形使用 Natural Earth II 官方地形底图。</small>
      </div>
      <div class="settings-choice-row">
        <button class="settings-choice${classicActive}" data-action="set-map-style" data-map-style="classic">经典</button>
        <button class="settings-choice${terrainActive}" data-action="set-map-style" data-map-style="terrain">地形</button>
      </div>
    </div>
    <label class="settings-toggle">
      <span>
        <strong>显示国界</strong>
        <small>关闭后地图更简洁，只保留陆地轮廓、城市和航线。</small>
      </span>
      <input type="checkbox" data-action="toggle-map-boundaries" ${checked}>
    </label>
    <div style="margin-top:14px;display:flex;justify-content:flex-end">
      <button class="btn btn-primary" data-action="close-modal">完成</button>
    </div>`);
}

function toggleMapBoundaries(checked) {
  appSettings.showBoundaries = checked;
  uiState.showBoundaries = checked;
  saveAppSettings();
  renderMapOnly();
}

function setMapStyle(style) {
  appSettings.mapStyle = style === 'terrain' ? 'terrain' : 'classic';
  uiState.mapStyle = appSettings.mapStyle;
  saveAppSettings();
  renderMapOnly();
  showSettings();
}

function closeModal() {
  const wasTurnSummary = Boolean(document.querySelector('[data-turn-summary="true"]'));
  closeModalRoot();
  closeDeliveryPopup();
  if (wasTurnSummary && G && !G._onboardReportShown) {
    G._onboardReportShown = true;
    completeOnboardingStep(G, 3);
  }
  if (uiState.branchSelectMode) networkController.cancelBranchSelect();
  if (G && !G.gameOver) {
    if (G.selectedCity) {
      G.selectedCity = null;
      renderMapOnly();
    }
    hideRouteCreateInfo();
    setBottomHint();
    if (wasTurnSummary) spawnPendingContracts(G);
    updateOnboarding(G, uiState);
    checkFirstTimePopups(G);
  }
}

function saveGame() {
  if (!G) {
    showBanner('游戏尚未开始，无法存档', '#dc2626');
    return;
  }
  try {
    saveGameState(G);
    showBanner('存档保存成功！(' + G.year + ' Q' + G.quarter + ')', '#16a34a');
  } catch (e) {
    showBanner('存档失败：' + e.message, '#dc2626');
  }
}

function loadGame() {
  try {
    const result = loadGameState();
    if (!result.ok) {
      showBanner(result.message, '#d97706');
      return;
    }
    G = result.state;
    checkMilestones(G);
    uiState.hqSelectMode = false;
    uiState.selectedHQ = null;
    uiState.branchSelectMode = false;
    uiState.selectedBranch = null;
    hideTutorial();
    removeHQBanner();
    removeBranchBanner();
    removeTraitOverlay();
    byId('app').hidden = false;
    renderGame();
    scrollPanelToTop();
    restoreContractState(G);
    showTraitEnvelope(G);
    const loadMessage = result.recoveredFromBackup
      ? '主存档损坏，已从上一份备份恢复：'
      : '存档已载入！';
    showBanner(loadMessage + G.companyName + ' - ' + G.year + ' Q' + G.quarter, result.recoveredFromBackup ? '#d97706' : '#16a34a');
  } catch (e) {
    showBanner('读档失败：' + e.message, '#dc2626');
  }
}

function tutorialNextStep() {
  if (!uiState.selectedEra) {
    showBanner('请先选择时代剧本', '#d97706');
    return;
  }
  const name = getTutorialCompanyName();
  const offRadio = document.querySelector('input[name="onboard-mode"][value="off"]');
  uiState.skipOnboarding = Boolean(offRadio?.checked);
  G = createSetupState(name, uiState.selectedEra);
  uiState.hqSelectMode = true;
  uiState.selectedHQ = null;
  byId('app').classList.add('hq-selecting');
  hideTutorial();
  renderGame();
  showHQBanner();
  setBottomHint('点击地图上的城市选择总部');
}

function cancelHQSelect() {
  removeHQBanner();
  uiState.hqSelectMode = false;
  uiState.selectedHQ = null;
  byId('app').classList.remove('hq-selecting');
  G = null;
  showTutorial();
  showEraMenu(uiState.selectedEra);
}

function confirmHQAndStart() {
  if (!uiState.selectedHQ) {
    showBanner('请先选择总部城市', '#d97706');
    return;
  }
  startGame();
}

function startGame() {
  const hq = uiState.selectedHQ || 'beijing';
  const name = getTutorialCompanyName();
  const era = uiState.selectedEra || 'era1';
  G = initState(hq, era);
  G.companyName = name;
  if (uiState.skipOnboarding) G.onboardStep = 99;
  seedInitialFleet(G);
  focusMapOnCity(G, hq);
  uiState.hqSelectMode = false;
  uiState.selectedHQ = null;
  byId('app').classList.remove('hq-selecting');
  removeHQBanner();
  hideTutorial();
  byId('app').hidden = false;
  renderGame();
  scrollPanelToTop();
  restoreContractState(G);
  showTraitEnvelope(G);
  if (byId('trait-overlay')) {
    const hint = byId('onboard-hint');
    if (hint) hint.style.display = 'none';
  }
  setBottomHint();
}

function confirmTrait(target) {
  const trait = normalizePlayerTrait(target.dataset.trait);
  const isPendingChoice = !Array.isArray(G.pendingTraitChoices) || G.pendingTraitChoices.includes(trait);
  if (!trait || !isPendingChoice) {
    showBanner('特质选择无效，请重新选择', '#dc2626');
    showTraitEnvelope(G);
    return;
  }
  G.playerTrait = trait;
  G.traitChosen = true;
  G.pendingTraitChoices = null;
  removeTraitOverlay();
  renderGame();
  showBanner('欢迎经营 ' + G.companyName + '！(' + G.year + '-' + G.endYear + ') 试试开通第一条航线吧', '#2563eb');
}

const financeController = createFinanceController({
  getState: state,
  uiState,
  renderGame,
  updateMilestones,
});
const turnController = createTurnController({
  getState: state,
  uiState,
  renderGame,
  updateMilestones,
  closeModal,
});
const networkController = createNetworkController({
  getState: state,
  uiState,
  renderGame,
  renderMapOnly,
  setBottomHint,
  scrollPanelToTop,
  updateMilestones,
  closeModal,
});

const coreClickActions = {
  'save-game': saveGame,
  'load-game': loadGame,
  'show-main-menu': () => showMainMenu(uiState.selectedEra),
  'show-era-menu': () => showEraMenu(uiState.selectedEra),
  'show-save-menu': showSaveMenu,
  'show-credits-menu': showCreditsMenu,
  'select-era': ({ target }) => {
    uiState.selectedEra = target.dataset.eraId;
    selectEraCard(uiState.selectedEra);
  },
  'tutorial-next-step': tutorialNextStep,
  'show-version-log': showVersionLog,
  'cancel-hq-select': cancelHQSelect,
  'confirm-hq-start': confirmHQAndStart,
  'open-main-quest': () => {
    if (!G) return;
    G._mainQuestOnboardShown = true;
    completeOnboardingStep(G, 4);
    showMainQuestPanel(G);
    updateOnboarding(G, uiState);
  },
  'open-milestones': () => {
    if (G) showMilestoneList(G);
  },
  'dismiss-onboarding': () => {
    dismissOnboarding(G);
    updateOnboarding(G, uiState);
  },
  'acknowledge-onboarding': acknowledgeOnboarding,
  'show-onboarding-help': () => showHelpPanel(G),
  'switch-help-tab': ({ target }) => showHelpPanel(G, target.dataset.helpTab),
  'close-ftp-card': closeFirstTimePopup,
  'show-settings': showSettings,
  'set-map-style': ({ target }) => setMapStyle(target.dataset.mapStyle),
  'toggle-map-boundaries': ({ target }) => toggleMapBoundaries(target.checked),
  'reset-onboarding': () => {
    resetOnboarding(G);
    closeModalRoot();
    if (G) renderGame();
    showBanner('新手提示已重新开启', '#16a34a');
  },
  'close-modal': closeModal,
  'modal-backdrop': closeModal,
  'close-main-quest-overlay': ({ target }) => closeMainQuestOverlay(target.closest('.main-quest-overlay')),
  'continue-victory-game': continueFromVictory,
  'end-victory-game': ({ target }) => {
    if (!G) return;
    G.gameOver = true;
    closeMainQuestOverlay(target.closest('.main-quest-overlay'));
    renderGame();
    showVictoryEnding(G);
  },
  'open-trait-coins': () => openTraitCoins(G),
  'select-trait-coin': ({ target }) => revealSelectedTrait(target.dataset.trait, target.dataset.coinIndex),
  'confirm-trait': ({ target }) => {
    if (G) confirmTrait(target);
  },
  noop: () => {},
  'reload-page': () => location.reload(),
};

const clickActions = {
  ...coreClickActions,
  ...financeController.clickActions,
  ...turnController.clickActions,
  ...networkController.clickActions,
};

const coreInputActions = {
  'company-name-input': ({ target }) => setTutorialCompanyName(target.value),
};
const inputActions = {
  ...coreInputActions,
  ...networkController.inputActions,
};

const knownActions = actionNames(clickActions, inputActions);
const handleClick = createDelegatedActionHandler(clickActions, {
  knownActions,
  selfOnlyActions: ['modal-backdrop', 'delivery-backdrop'],
});
const handleInput = createDelegatedActionHandler(inputActions, { knownActions });

function handleKeydown(event) {
  if (event.key !== 'Escape') return;
  const root = byId('modal-root');
  if (!root?.querySelector('[data-action="modal-backdrop"]')) return;
  event.preventDefault();
  closeModal();
}

initTutorial(uiState.selectedEra);
initMapDrag(state, () => renderMap(G, uiState));
document.addEventListener('click', handleClick);
document.addEventListener('input', handleInput);
document.addEventListener('change', handleInput);
document.addEventListener('keydown', handleKeydown);
window.addEventListener('resize', () => {
  if (G) renderMap(G, uiState);
});
