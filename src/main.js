import './styles/app.css';

import { actionNames, createDelegatedActionHandler } from './app/actionDispatcher.js';
import { createFinanceController } from './app/financeController.js';
import { createNetworkController } from './app/networkController.js';
import { createSessionController } from './app/sessionController.js';
import { createSettingsController, loadAppSettings } from './app/settingsController.js';
import { createTurnController } from './app/turnController.js';
import { ERAS } from './data/eras.js';
import { byId } from './domain/helpers.js';
import { checkMilestones } from './domain/milestones.js';
import { updateHUD } from './ui/hud.js';
import { showMilestoneNotification } from './ui/milestones.js';
import { initMapDrag, renderMap } from './ui/map.js';
import { trapModalFocus } from './ui/modal.js';
import { spawnPendingContracts } from './ui/operations.js';
import { renderPanel } from './ui/panel.js';
import { applySeasonTheme } from './ui/season.js';
import { updateOnboarding } from './ui/onboarding.js';
import { initTutorial } from './ui/tutorial.js';

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

function updateMilestones(options = {}) {
  if (!G) return [];
  const newlyUnlocked = checkMilestones(G);
  updateHUD(G);
  if (options.notify !== false) showMilestoneNotification(newlyUnlocked);
  return newlyUnlocked;
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

let networkController;
const sessionController = createSessionController({
  getState: state,
  setState: (nextState) => {
    G = nextState;
  },
  uiState,
  renderGame,
  renderMapOnly,
  setBottomHint,
  scrollPanelToTop,
  cancelBranchSelect: () => networkController.cancelBranchSelect(),
});
const settingsController = createSettingsController({
  settings: appSettings,
  uiState,
  renderMapOnly,
});
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
  closeModal: sessionController.closeModal,
});
networkController = createNetworkController({
  getState: state,
  uiState,
  renderGame,
  renderMapOnly,
  setBottomHint,
  scrollPanelToTop,
  updateMilestones,
  closeModal: sessionController.closeModal,
});

const clickActions = {
  ...sessionController.clickActions,
  ...settingsController.clickActions,
  ...financeController.clickActions,
  ...turnController.clickActions,
  ...networkController.clickActions,
};

const inputActions = {
  ...sessionController.inputActions,
  ...networkController.inputActions,
};

const knownActions = actionNames(clickActions, inputActions);
const handleClick = createDelegatedActionHandler(clickActions, {
  knownActions,
  selfOnlyActions: ['modal-backdrop'],
});
const handleInput = createDelegatedActionHandler(inputActions, { knownActions });

function handleKeydown(event) {
  if (trapModalFocus(event)) return;
  if (event.key !== 'Escape') return;
  const root = byId('modal-root');
  if (!root?.querySelector('[data-action="modal-backdrop"]')) return;
  event.preventDefault();
  sessionController.closeModal();
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
