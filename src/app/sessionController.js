import { normalizePlayerTrait } from '../data/playerTraits.js';
import { hasPendingEraSettlement, hasRetiredEraSettlement } from '../domain/eraSettlement.js';
import { byId } from '../domain/helpers.js';
import { checkMilestones } from '../domain/milestones.js';
import { loadGameState, saveGameState } from '../domain/save.js';
import { createSetupState, initState, seedInitialFleet } from '../domain/state.js';
import { removeBranchBanner } from '../ui/branches.js';
import { showEraRetirement, showEraSettlement } from '../ui/eraSettlement.js';
import { focusMapOnCity } from '../ui/map.js';
import { closeMainQuestOverlay, continueFromVictory, showMainQuestPanel, showVictoryEnding } from '../ui/mainQuest.js';
import { showMilestoneList } from '../ui/milestones.js';
import { BANNER_TONES, closeModalRoot, showBanner } from '../ui/modal.js';
import { closeDeliveryPopup } from '../ui/modals.js';
import {
  acknowledgeOnboarding,
  checkFirstTimePopups,
  closeFirstTimePopup,
  completeOnboardingStep,
  dismissOnboarding,
  resetOnboarding,
  showHelpPanel,
  updateOnboarding,
} from '../ui/onboarding.js';
import { restoreContractState, spawnPendingContracts } from '../ui/operations.js';
import { hideRouteCreateInfo } from '../ui/panel.js';
import {
  getTutorialCompanyName,
  hideTutorial,
  removeHQBanner,
  selectEraCard,
  setTutorialCompanyName,
  showCreditsMenu,
  showEraMenu,
  showHQBanner,
  showMainMenu,
  showSaveMenu,
  showTutorial,
} from '../ui/tutorial.js';
import { openTraitCoins, removeTraitOverlay, revealSelectedTrait, showTraitEnvelope } from '../ui/traits.js';
import { showVersionLog } from '../ui/versionLog.js';

export function createSessionController(app) {
  const state = () => app.getState();

  function closeModal() {
    const game = state();
    const wasTurnSummary = Boolean(document.querySelector('[data-turn-summary="true"]'));
    closeModalRoot();
    closeDeliveryPopup();
    if (wasTurnSummary && game && !game._onboardReportShown) {
      game._onboardReportShown = true;
      completeOnboardingStep(game, 3);
    }
    if (app.uiState.branchSelectMode) app.cancelBranchSelect();
    if (game && !game.gameOver) {
      if (game.selectedCity) {
        game.selectedCity = null;
        app.renderMapOnly();
      }
      hideRouteCreateInfo();
      app.setBottomHint();
      if (wasTurnSummary) spawnPendingContracts(game);
      updateOnboarding(game, app.uiState);
      checkFirstTimePopups(game);
    }
  }

  function saveGame() {
    const game = state();
    if (!game) {
      showBanner('游戏尚未开始，无法存档', BANNER_TONES.danger);
      return;
    }
    try {
      saveGameState(game);
      showBanner('存档保存成功！(' + game.year + ' Q' + game.quarter + ')', BANNER_TONES.success);
    } catch (error) {
      showBanner('存档失败：' + error.message, BANNER_TONES.danger);
    }
  }

  function loadGame() {
    try {
      const result = loadGameState();
      if (!result.ok) {
        showBanner(result.message, BANNER_TONES.warning);
        return;
      }
      const game = result.state;
      app.setState(game);
      checkMilestones(game);
      app.uiState.hqSelectMode = false;
      app.uiState.selectedHQ = null;
      app.uiState.branchSelectMode = false;
      app.uiState.selectedBranch = null;
      hideTutorial();
      removeHQBanner();
      removeBranchBanner();
      removeTraitOverlay();
      byId('app').hidden = false;
      app.renderGame();
      app.scrollPanelToTop();
      restoreContractState(game);
      if (hasRetiredEraSettlement(game)) showEraRetirement(game);
      else if (hasPendingEraSettlement(game)) showEraSettlement(game);
      else showTraitEnvelope(game);
      const loadMessage = result.recoveredFromBackup
        ? '主存档损坏，已从上一份备份恢复：'
        : '存档已载入！';
      showBanner(loadMessage + game.companyName + ' - ' + game.year + ' Q' + game.quarter, result.recoveredFromBackup ? BANNER_TONES.warning : BANNER_TONES.success);
    } catch (error) {
      showBanner('读档失败：' + error.message, BANNER_TONES.danger);
    }
  }

  function tutorialNextStep() {
    if (!app.uiState.selectedEra) {
      showBanner('请先选择时代剧本', BANNER_TONES.warning);
      return;
    }
    const name = getTutorialCompanyName();
    const offRadio = document.querySelector('input[name="onboard-mode"][value="off"]');
    app.uiState.skipOnboarding = Boolean(offRadio?.checked);
    app.setState(createSetupState(name, app.uiState.selectedEra));
    app.uiState.hqSelectMode = true;
    app.uiState.selectedHQ = null;
    byId('app').classList.add('hq-selecting');
    hideTutorial();
    app.renderGame();
    showHQBanner();
    app.setBottomHint('点击地图上的城市选择总部');
  }

  function cancelHQSelect() {
    removeHQBanner();
    app.uiState.hqSelectMode = false;
    app.uiState.selectedHQ = null;
    byId('app').classList.remove('hq-selecting');
    app.setState(null);
    showTutorial();
    showEraMenu(app.uiState.selectedEra);
  }

  function startGame() {
    const hq = app.uiState.selectedHQ || 'beijing';
    const name = getTutorialCompanyName();
    const era = app.uiState.selectedEra || 'era1';
    const game = initState(hq, era);
    game.companyName = name;
    if (app.uiState.skipOnboarding) game.onboardStep = 99;
    seedInitialFleet(game);
    focusMapOnCity(game, hq);
    app.setState(game);
    app.uiState.hqSelectMode = false;
    app.uiState.selectedHQ = null;
    byId('app').classList.remove('hq-selecting');
    removeHQBanner();
    hideTutorial();
    byId('app').hidden = false;
    app.renderGame();
    app.scrollPanelToTop();
    restoreContractState(game);
    showTraitEnvelope(game);
    if (byId('trait-overlay')) {
      const hint = byId('onboard-hint');
      if (hint) hint.hidden = true;
    }
    app.setBottomHint();
  }

  function confirmHQAndStart() {
    if (!app.uiState.selectedHQ) {
      showBanner('请先选择总部城市', BANNER_TONES.warning);
      return;
    }
    startGame();
  }

  function confirmTrait(target) {
    const game = state();
    if (!game) return;
    const trait = normalizePlayerTrait(target.dataset.trait);
    const isPendingChoice = !Array.isArray(game.pendingTraitChoices) || game.pendingTraitChoices.includes(trait);
    if (!trait || !isPendingChoice) {
      showBanner('特质选择无效，请重新选择', BANNER_TONES.danger);
      showTraitEnvelope(game);
      return;
    }
    game.playerTrait = trait;
    game.traitChosen = true;
    game.pendingTraitChoices = null;
    removeTraitOverlay();
    app.renderGame();
    showBanner('欢迎经营 ' + game.companyName + '！(' + game.year + '-' + game.endYear + ') 试试开通第一条航线吧', BANNER_TONES.info);
  }

  const clickActions = {
    'save-game': saveGame,
    'load-game': loadGame,
    'show-main-menu': () => showMainMenu(app.uiState.selectedEra),
    'show-era-menu': () => showEraMenu(app.uiState.selectedEra),
    'show-save-menu': showSaveMenu,
    'show-credits-menu': showCreditsMenu,
    'select-era': ({ target }) => {
      app.uiState.selectedEra = target.dataset.eraId;
      selectEraCard(app.uiState.selectedEra);
    },
    'tutorial-next-step': tutorialNextStep,
    'show-version-log': showVersionLog,
    'cancel-hq-select': cancelHQSelect,
    'confirm-hq-start': confirmHQAndStart,
    'open-main-quest': () => {
      const game = state();
      if (!game) return;
      game._mainQuestOnboardShown = true;
      completeOnboardingStep(game, 4);
      showMainQuestPanel(game);
      updateOnboarding(game, app.uiState);
    },
    'open-milestones': () => {
      const game = state();
      if (game) showMilestoneList(game);
    },
    'dismiss-onboarding': () => {
      const game = state();
      dismissOnboarding(game);
      updateOnboarding(game, app.uiState);
    },
    'acknowledge-onboarding': acknowledgeOnboarding,
    'show-onboarding-help': () => showHelpPanel(state()),
    'switch-help-tab': ({ target }) => showHelpPanel(state(), target.dataset.helpTab),
    'close-ftp-card': closeFirstTimePopup,
    'reset-onboarding': () => {
      const game = state();
      resetOnboarding(game);
      closeModalRoot();
      if (game) app.renderGame();
      showBanner('新手提示已重新开启', BANNER_TONES.success);
    },
    'close-modal': closeModal,
    'modal-backdrop': closeModal,
    'close-main-quest-overlay': ({ target }) => closeMainQuestOverlay(target.closest('.main-quest-overlay')),
    'continue-victory-game': continueFromVictory,
    'end-victory-game': ({ target }) => {
      const game = state();
      if (!game) return;
      game.gameOver = true;
      closeMainQuestOverlay(target.closest('.main-quest-overlay'));
      app.renderGame();
      showVictoryEnding(game);
    },
    'open-trait-coins': () => openTraitCoins(state()),
    'select-trait-coin': ({ target }) => revealSelectedTrait(target.dataset.trait, target.dataset.coinIndex),
    'confirm-trait': ({ target }) => confirmTrait(target),
    noop: () => {},
    'reload-page': () => location.reload(),
  };

  return {
    clickActions,
    inputActions: {
      'company-name-input': ({ target }) => setTutorialCompanyName(target.value),
    },
    closeModal,
  };
}
