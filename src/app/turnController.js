import { applyAngelInvestment } from '../domain/angelInvestment.js';
import { fmt, getCity } from '../domain/helpers.js';
import { hasPendingContracts, setOpsTier, signBonusContract, signRecruitContract } from '../domain/operations.js';
import { updateRouteMetrics } from '../domain/routes.js';
import { advanceTurnState } from '../domain/turn.js';
import { clearAngelTimers, lockAngelSlot, showAngelInvestment, showAngelSlotPhase } from '../ui/angelInvestment.js';
import { showMainQuestStageNotification, showMainQuestVictory } from '../ui/mainQuest.js';
import { closeModalRoot, showBanner, showModal } from '../ui/modal.js';
import {
  closeDeliveryPopup,
  showDeliveryPopup,
  showGameOver,
  showNewspaper,
  showReportAlone,
  showTurnSummary,
} from '../ui/modals.js';
import {
  clearSignedContract,
  focusContractFromPanel,
  getContractSelection,
  markContractSigned,
  selectContractOption,
  showAdvanceContractGuide,
  showOperationsPanel,
  toggleContract,
} from '../ui/operations.js';
import {
  checkFirstTimePopups,
  completeOnboardingStep,
  resetBranchDismiss,
  updateOnboarding,
} from '../ui/onboarding.js';

export function createTurnController(app) {
  const state = () => app.getState();

  function showBankruptcyAction(report) {
    const action = report?.bankruptcyAction;
    if (!action || action.angelRescue || action.gameOver) return;
    const messages = {
      emergencyLoan: `急救贷款已发放：${fmt(action.amount)}`,
      forceSellStocks: `已强制出售证券资产：${fmt(action.amount)}`,
      forceSellSubsidiaries: `已强制出售子公司：${fmt(action.amount)}`,
      forceSellPlanes: `已变卖自有飞机：${fmt(action.amount)}`,
    };
    if (messages[action.action]) showBanner(messages[action.action], '#d97706');
  }

  function applyAngelRescue(target) {
    const game = state();
    if (!game) return;
    const result = applyAngelInvestment(game, Number(target.dataset.amount));
    if (!result.ok) {
      showBanner(result.message, '#b91c1c');
      return;
    }
    clearAngelTimers();
    closeModalRoot();
    app.renderGame();
    showBanner(`辣豆基金注资 ${fmt(result.amount)}，重振旗鼓`, '#d97706');
  }

  function advanceTurn(force = false) {
    const game = state();
    if (!game || game.gameOver) return;
    if (hasPendingContracts(game)) {
      showAdvanceContractGuide(game);
      return;
    }
    if (!force && game.turnsPlayed === 0 && game.routes.length === 0) {
      const readyPlanes = game.fleet.filter((plane) => !plane.delivering).length;
      showModal(`<h2>本季尚未准备好</h2>
        <div class="advance-risk-card">
          <strong>当前没有运营航线</strong>
          <p>推进季度仍会产生机队、人员和运营固定成本。你有 ${readyPlanes} 架可用飞机，可以先开通一条短途航线。</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" type="button" data-action="open-route-from-warning">返回开航线</button>
          <button class="btn btn-secondary" type="button" data-action="confirm-advance-without-routes">仍然推进</button>
        </div>`);
      return;
    }
    const report = advanceTurnState(game);
    if (!report) return;
    if (report.angelRescue) {
      app.renderGame();
      showAngelInvestment(game);
      return;
    }
    if (report.gameOver) {
      showGameOver(game);
      return;
    }
    app.renderGame();
    showBankruptcyAction(report);
    resetBranchDismiss();
    if (game.turnsPlayed === 1) {
      completeOnboardingStep(game, 2);
      updateOnboarding(game, app.uiState);
    }
    if (report.branchCompleted.length > 0) {
      showBanner(`分部完工：${report.branchCompleted.map((cityId) => getCity(cityId)?.name || cityId).join('、')}`, '#7c3aed');
    }
    const showQuarterSummary = () => {
      showTurnSummary(game, report);
      checkFirstTimePopups(game);
    };
    const isReportOnboarding = game.turnsPlayed === 1
      && !game._onboardReportShown
      && game.onboardStep <= 3
      && game.onboardStep < 99;
    if (isReportOnboarding) window.setTimeout(showQuarterSummary, 400);
    else showQuarterSummary();
    app.updateMilestones();
    if (report.mainQuestUpdate?.type === 'stage_complete') {
      showMainQuestStageNotification(report.mainQuestUpdate);
    } else if (report.mainQuestUpdate?.type === 'victory') {
      showMainQuestVictory(report.mainQuestUpdate);
    }
  }

  function updateOpsTier(target) {
    const game = state();
    if (!game || !setOpsTier(game, target.dataset.field, target.dataset.tier)) return;
    updateRouteMetrics(game);
    app.renderGame();
    showOperationsPanel(game);
  }

  function signContract(target) {
    const game = state();
    if (!game) return;
    const type = target.dataset.contractType;
    const selected = getContractSelection(type);
    const result = type === 'bonus'
      ? signBonusContract(game, selected)
      : signRecruitContract(game, selected);
    markContractSigned(game, type, result);
    app.renderGame();
    showBanner(result.message, type === 'bonus' ? '#d97706' : '#2563eb');
    window.setTimeout(() => {
      clearSignedContract(game, type);
      app.renderGame();
    }, 2500);
  }

  function focusNextPendingContract() {
    const game = state();
    if (!game) return;
    const type = game._pendingRecruit ? 'recruit' : game._pendingBonus ? 'bonus' : null;
    if (type) focusContractFromPanel(game, type);
  }

  return {
    clickActions: {
      'start-angel-slot': () => {
        const game = state();
        if (game) showAngelSlotPhase(game);
      },
      'lock-angel-slot': lockAngelSlot,
      'apply-angel-rescue': ({ target }) => applyAngelRescue(target),
      'open-operations-panel': () => {
        const game = state();
        if (!game) return;
        showOperationsPanel(game);
        game._opsPanelOpened = true;
        checkFirstTimePopups(game);
      },
      'set-ops-tier': ({ target }) => updateOpsTier(target),
      'toggle-contract': ({ target }) => {
        const game = state();
        if (game) toggleContract(game, target.dataset.contractType);
      },
      'select-contract-option': ({ target }) => {
        const game = state();
        if (game) selectContractOption(game, target.dataset.contractType, target.dataset.option);
      },
      'sign-contract': ({ target }) => signContract(target),
      'open-contract-from-panel': ({ target }) => {
        closeModalRoot();
        const game = state();
        if (game) focusContractFromPanel(game, target.dataset.contractType);
      },
      'advance-contract-guide': focusNextPendingContract,
      'advance-turn': () => advanceTurn(),
      'confirm-advance-without-routes': () => {
        app.closeModal();
        advanceTurn(true);
      },
      'show-newspaper': () => {
        const game = state();
        if (game) showNewspaper(game);
      },
      'show-report': () => {
        const game = state();
        if (game) showReportAlone(game);
      },
      'show-delivery-popup': () => {
        const game = state();
        if (game) showDeliveryPopup(game);
      },
      'close-delivery-popup': closeDeliveryPopup,
      'delivery-backdrop': closeDeliveryPopup,
    },
  };
}
