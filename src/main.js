import './styles/app.css';

import { actionNames, createDelegatedActionHandler } from './app/actionDispatcher.js';
import { createFinanceController } from './app/financeController.js';
import { ERAS } from './data/eras.js';
import { normalizePlayerTrait } from './data/playerTraits.js';
import { closeBranch as closeBranchDomain, isBase, isBranchConstructing, openBranch } from './domain/bases.js';
import { applyAngelInvestment } from './domain/angelInvestment.js';
import { DEFAULT_COMPANY_NAME } from './domain/constants.js';
import { buyPlane, returnLease, sellPlane } from './domain/fleet.js';
import { byId, cityDist, fmt, getCity, routeKey } from './domain/helpers.js';
import { checkMilestones } from './domain/milestones.js';
import { loadGameState, saveGameState } from './domain/save.js';
import { createSetupState, initState, seedInitialFleet } from './domain/state.js';
import {
  adjustRoutePrice,
  changeRoutePlane,
  closeRoute as closeRouteDomain,
  countCompetitors,
  findRoute,
  openRoute,
  resumeRoute,
  suspendRoute,
  updateRouteMetrics,
} from './domain/routes.js';
import { advanceTurnState } from './domain/turn.js';
import { hasPendingContracts, setOpsTier, signBonusContract, signRecruitContract } from './domain/operations.js';
import { updateHUD } from './ui/hud.js';
import { closeModalRoot, showBanner, showModal } from './ui/modal.js';
import { closeMainQuestOverlay, continueFromVictory, showMainQuestPanel, showMainQuestStageNotification, showMainQuestVictory, showVictoryEnding } from './ui/mainQuest.js';
import { showMilestoneList, showMilestoneNotification } from './ui/milestones.js';
import {
  clearSignedContract,
  focusContractFromPanel,
  getContractSelection,
  markContractSigned,
  restoreContractState,
  selectContractOption,
  showAdvanceContractGuide,
  showOperationsPanel,
  spawnPendingContracts,
  toggleContract,
} from './ui/operations.js';
import { showVersionLog } from './ui/versionLog.js';
import { describeRouteSelection, focusMapOnCity, initMapDrag, renderMap, setMapZoom } from './ui/map.js';
import { showRouteCreateInfo as renderRouteCreateInfo, hideRouteCreateInfo, renderPanel, renderRouteCityPicker } from './ui/panel.js';
import { applySeasonTheme } from './ui/season.js';
import { removeBranchBanner, showBranchBanner, showSelectedBranch } from './ui/branches.js';
import {
  acknowledgeOnboarding,
  checkFirstTimePopups,
  closeFirstTimePopup,
  completeOnboardingStep,
  dismissOnboarding,
  resetBranchDismiss,
  resetOnboarding,
  showHelpPanel,
  updateOnboarding,
} from './ui/onboarding.js';
import {
  closeDeliveryPopup,
  showBuyPlaneModal,
  showBranchModal,
  showCloseBranchConfirm,
  showDeliveryPopup,
  showFleetPanel,
  showGameOver,
  showNewspaper,
  showReportAlone,
  setAdjustPricePreset,
  setRoutePricePreset,
  showRouteChangePlaneModal,
  showRouteCloseConfirm,
  showRouteCreateModal,
  showRouteList,
  showRoutePriceAdjust,
  showRouteResumeConfirm,
  showRouteSuspendConfirm,
  toggleRouteListSort,
  updateAdjustedPriceDisplay,
  updatePlanePurchaseOptions,
  showTurnSummary,
  updatePricePreview,
} from './ui/modals.js';
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
  showSelectedHQ,
  showTutorial,
} from './ui/tutorial.js';
import { openTraitCoins, removeTraitOverlay, revealSelectedTrait, showTraitEnvelope } from './ui/traits.js';
import { clearAngelTimers, lockAngelSlot, showAngelInvestment, showAngelSlotPhase } from './ui/angelInvestment.js';

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
  if (uiState.branchSelectMode) cancelBranchSelect();
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

function openRouteModal() {
  if (!G) return;
  G.selectedCity = null;
  setBottomHint('选择起飞基地：可点地图，也可用下方面板列表');
  renderRouteCreateInfo(null, null, renderRouteCityPicker(G));
  renderMapOnly();
  scrollPanelToTop();
}

function openRouteCreateModal(from, to) {
  const a = getCity(from);
  const b = getCity(to);
  if (!isBase(G, from)) {
    showModal(`<h2>无法开通航线</h2><p style="color:#f87171">起飞城市必须是总部或分部。${a.name}不是你的基地。</p><p style="color:#7ba3cc;font-size:13px">可以在快捷操作中点击「开设分部」扩展基地网络。</p><button class="btn btn-primary" data-action="close-modal">确定</button>`);
    return;
  }
  const existing = G.routes.find((r) => routeKey(r.from, r.to) === routeKey(from, to));
  if (existing) {
    showModal(`<h2>航线已开通</h2><p>${a.name} → ${b.name} 已在运营中。</p><button class="btn btn-primary" data-action="close-modal">确定</button>`);
    return;
  }
  showRouteCreateModal(G, from, to, countCompetitors(G, from, to));
}

function confirmOpenRoute(from, to) {
  const select = byId('route-plane');
  const slider = byId('route-price');
  if (!select || !slider) return;
  const planeUid = parseInt(select.value, 10);
  const price = parseInt(slider.value, 10);
  const result = openRoute(G, from, to, planeUid, price);
  if (!result.ok) {
    showBanner(result.message, '#dc2626');
    return;
  }
  renderGame();
  closeModal();
  hideRouteCreateInfo();
  showBanner(`航线开通：${getCity(from).name} → ${getCity(to).name}  开通费用 ${fmt(result.cost)}`, '#16a34a');
  completeOnboardingStep(G, G.routes.length > 1 ? 1 : 0);
  updateOnboarding(G, uiState);
  updateMilestones();
}

function startBranchSelect() {
  if (!G) return;
  closeModalRoot();
  uiState.branchSelectMode = true;
  uiState.selectedBranch = null;
  G.selectedCity = null;
  byId('app').classList.add('branch-selecting');
  showBranchBanner(G);
  renderMapOnly();
  updateOnboarding(G, uiState);
  setBottomHint('点击地图上的城市选择分部');
}

function cancelBranchSelect() {
  uiState.branchSelectMode = false;
  uiState.selectedBranch = null;
  byId('app').classList.remove('branch-selecting');
  removeBranchBanner();
  renderMapOnly();
  updateOnboarding(G, uiState);
  if (G) setBottomHint();
}

function confirmBranchFromMap() {
  if (!G || !uiState.selectedBranch) {
    showBanner('请先选择分部城市', '#d97706');
    return;
  }
  const cityId = uiState.selectedBranch;
  const result = openBranch(G, cityId);
  if (!result.ok) {
    showBanner(result.message, '#dc2626');
    return;
  }
  cancelBranchSelect();
  renderGame();
  showBanner(`分部建设：${getCity(cityId).name}（花费 ${fmt(result.cost)}，${result.constructIn}季度后完工）`, '#fbbf24');
  updateMilestones();
}

function closeBranch(cityId) {
  const result = closeBranchDomain(G, cityId);
  if (!result.ok) {
    showBanner(result.message, '#dc2626');
    return;
  }
  renderGame();
  closeModalRoot();
  showBanner(`已关闭分部：${getCity(cityId).name}`, '#dc2626');
}

function onMapEmptyClick() {
  if (!G || G.gameOver) return;
  if (uiState.branchSelectMode) return;
  if (G.selectedCity) {
    G.selectedCity = null;
    renderMapOnly();
    setBottomHint('选择起飞基地：可点地图，也可用下方面板列表');
    renderRouteCreateInfo(null, null, renderRouteCityPicker(G));
  }
}

function onCityClick(cityId) {
  if (!G) return;
  if (uiState.hqSelectMode) {
    uiState.selectedHQ = cityId;
    renderMapOnly();
    renderPanel(G, uiState);
    const cityName = getCity(cityId).name;
    showSelectedHQ(cityName);
    setBottomHint(`已选择 ${cityName}，点击确认开始`);
    return;
  }
  if (uiState.branchSelectMode) {
    const city = getCity(cityId);
    if (isBase(G, cityId)) {
      showBanner(city.name + ' 已是基地，无法重复开设', '#d97706');
      return;
    }
    if (isBranchConstructing(G, cityId)) {
      showBanner(city.name + ' 分部正在建设中', '#d97706');
      return;
    }
    uiState.selectedBranch = cityId;
    renderMapOnly();
    showSelectedBranch(city.name);
    return;
  }
  if (G.gameOver) return;
  if (!G.selectedCity) {
    G.selectedCity = cityId;
    renderMapOnly();
    const fromIsBase = isBase(G, cityId);
    setBottomHint(fromIsBase
      ? '已选择 ' + getCity(cityId).name + '，继续选择到达城市'
      : getCity(cityId).name + ' 非基地，选择到达城市可查看距离');
    renderRouteCreateInfo(getCity(cityId), null, `${describeRouteSelection(getCity(cityId), null, { fromIsBase })}${renderRouteCityPicker(G, cityId)}`);
  } else if (G.selectedCity === cityId) {
    G.selectedCity = null;
    renderMapOnly();
    setBottomHint('选择起飞基地：可点地图，也可用下方面板列表');
    renderRouteCreateInfo(null, null, renderRouteCityPicker(G));
  } else {
    const from = G.selectedCity;
    const fromIsBase = isBase(G, from);
    G.selectedCity = null;
    renderRouteCreateInfo(getCity(from), getCity(cityId), describeRouteSelection(getCity(from), getCity(cityId), { fromIsBase }));
    if (!fromIsBase) {
      const d = Math.round(cityDist(getCity(from), getCity(cityId)));
      setBottomHint(`${getCity(from).name} → ${getCity(cityId).name} 距离 ${d}km（需从总部或分部起飞才能开通航线）`);
      renderMapOnly();
      return;
    }
    openRouteCreateModal(from, cityId);
  }
}

function buySelectedPlane(target) {
  const qtyInput = byId('buy-qty-' + target.dataset.planeId);
  const count = qtyInput ? parseInt(qtyInput.value, 10) : 1;
  const result = buyPlane(G, target.dataset.planeId, target.dataset.lease === 'true', count);
  if (!result.ok) {
    showBanner(result.message, '#dc2626');
    return;
  }
  closeModal();
  updateHUD(G);
  renderPanel(G, uiState);
  showBanner(`${target.dataset.lease === 'true' ? '租赁' : '购买'} ${result.planes.length}架 ${result.plane.name}`, target.dataset.lease === 'true' ? '#d97706' : '#2563eb');
  updateOnboarding(G);
  updateMilestones();
}

function sellSelectedPlane(target) {
  const sold = sellPlane(G, parseInt(target.dataset.uid, 10));
  if (!sold) return;
  updateHUD(G);
  renderPanel(G, uiState);
  closeModal();
  showBanner(`出售 ${sold.plane.name}，获得 ${fmt(sold.sellPrice)}`, '#d97706');
  updateMilestones();
}

function returnSelectedLease(target) {
  const returned = returnLease(G, parseInt(target.dataset.uid, 10));
  if (!returned) return;
  updateHUD(G);
  renderPanel(G, uiState);
  closeModal();
  showBanner(`退租 ${returned.plane.name}`, '#d97706');
}

function adjustPrice(from, to, price) {
  const route = adjustRoutePrice(G, from, to, price);
  if (!route) return;
  renderGame();
  showRouteList(G);
  showBanner(`${getCity(route.from).name}→${getCity(route.to).name} 票价调整为 $${route.price}`, '#2563eb');
}

function closeRoute(target) {
  closeRouteDomain(G, target.dataset.from, target.dataset.to);
  renderGame();
  showRouteList(G);
}

function toggleRouteSuspend(target) {
  const route = findRoute(G, target.dataset.from, target.dataset.to);
  if (!route) return;
  if (route.suspended) showRouteResumeConfirm(G, route.from, route.to);
  else showRouteSuspendConfirm(G, route.from, route.to);
}

function confirmSuspendRoute(target) {
  const result = suspendRoute(G, target.dataset.from, target.dataset.to);
  if (!result.ok) {
    showBanner(result.message, '#d97706');
    showRouteList(G);
    return;
  }
  renderGame();
  showBanner(`航线已停飞：${getCity(result.route.from).name} → ${getCity(result.route.to).name}`, '#d97706');
  showRouteList(G);
}

function confirmResumeRoute(target) {
  const result = resumeRoute(G, target.dataset.from, target.dataset.to);
  if (!result.ok) {
    showBanner(result.message, '#d97706');
    showRouteList(G);
    return;
  }
  renderGame();
  showBanner(`航线已复飞：${getCity(result.route.from).name} → ${getCity(result.route.to).name}`, '#16a34a');
  showRouteList(G);
}

function changeSelectedRoutePlane(target) {
  const result = changeRoutePlane(G, target.dataset.from, target.dataset.to, target.dataset.uid);
  if (!result.ok) {
    showBanner(result.message, '#dc2626');
    showRouteList(G);
    return;
  }
  renderGame();
  showBanner(`${getCity(result.route.from).name}→${getCity(result.route.to).name} 已更换执飞机型`, '#d97706');
  showRouteList(G);
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
  if (!G) return;
  const result = applyAngelInvestment(G, Number(target.dataset.amount));
  if (!result.ok) {
    showBanner(result.message, '#b91c1c');
    return;
  }
  clearAngelTimers();
  closeModalRoot();
  renderGame();
  showBanner(`辣豆基金注资 ${fmt(result.amount)}，重振旗鼓`, '#d97706');
}

function advanceTurn(force = false) {
  if (!G || G.gameOver) return;
  if (hasPendingContracts(G)) {
    showAdvanceContractGuide(G);
    return;
  }
  if (!force && G.turnsPlayed === 0 && G.routes.length === 0) {
    const readyPlanes = G.fleet.filter((plane) => !plane.delivering).length;
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
  const report = advanceTurnState(G);
  if (!report) return;
  if (report.angelRescue) {
    renderGame();
    showAngelInvestment(G);
    return;
  }
  if (report.gameOver) {
    showGameOver(G);
    return;
  }
  renderGame();
  showBankruptcyAction(report);
  resetBranchDismiss();
  if (G.turnsPlayed === 1) {
    completeOnboardingStep(G, 2);
    updateOnboarding(G, uiState);
  }
  if (report.branchCompleted.length > 0) {
    showBanner(`分部完工：${report.branchCompleted.map((cityId) => getCity(cityId)?.name || cityId).join('、')}`, '#7c3aed');
  }
  const showQuarterSummary = () => {
    showTurnSummary(G, report);
    checkFirstTimePopups(G);
  };
  const isReportOnboarding = G.turnsPlayed === 1 && !G._onboardReportShown && G.onboardStep <= 3 && G.onboardStep < 99;
  if (isReportOnboarding) window.setTimeout(showQuarterSummary, 400);
  else showQuarterSummary();
  updateMilestones();
  if (report.mainQuestUpdate?.type === 'stage_complete') {
    showMainQuestStageNotification(report.mainQuestUpdate);
  } else if (report.mainQuestUpdate?.type === 'victory') {
    showMainQuestVictory(report.mainQuestUpdate);
  }
}

function updateOpsTier(target) {
  if (!G) return;
  if (!setOpsTier(G, target.dataset.field, target.dataset.tier)) return;
  updateRouteMetrics(G);
  renderGame();
  showOperationsPanel(G);
}

function signContract(target) {
  if (!G) return;
  const type = target.dataset.contractType;
  const selected = getContractSelection(type);
  const result = type === 'bonus'
    ? signBonusContract(G, selected)
    : signRecruitContract(G, selected);
  markContractSigned(G, type, result);
  renderGame();
  showBanner(result.message, type === 'bonus' ? '#d97706' : '#2563eb');
  window.setTimeout(() => {
    clearSignedContract(G, type);
    renderGame();
  }, 2500);
}

function focusNextPendingContract() {
  if (!G) return;
  const type = G._pendingRecruit ? 'recruit' : G._pendingBonus ? 'bonus' : null;
  if (type) focusContractFromPanel(G, type);
}

const financeController = createFinanceController({
  getState: state,
  uiState,
  renderGame,
  updateMilestones,
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
  'start-angel-slot': () => {
    if (G) showAngelSlotPhase(G);
  },
  'lock-angel-slot': lockAngelSlot,
  'apply-angel-rescue': ({ target }) => applyAngelRescue(target),
  'cancel-hq-select': cancelHQSelect,
  'confirm-hq-start': confirmHQAndStart,
  'map-empty': onMapEmptyClick,
  'city-click': ({ target }) => onCityClick(target.dataset.cityId),
  'open-route-modal': openRouteModal,
  'open-route-from-warning': () => {
    closeModal();
    openRouteModal();
  },
  'open-buy-plane-modal': () => {
    if (G) showBuyPlaneModal(G);
  },
  'open-operations-panel': () => {
    if (!G) return;
    showOperationsPanel(G);
    G._opsPanelOpened = true;
    checkFirstTimePopups(G);
  },
  'set-ops-tier': ({ target }) => updateOpsTier(target),
  'toggle-contract': ({ target }) => {
    if (G) toggleContract(G, target.dataset.contractType);
  },
  'select-contract-option': ({ target }) => {
    if (G) selectContractOption(G, target.dataset.contractType, target.dataset.option);
  },
  'sign-contract': ({ target }) => signContract(target),
  'open-contract-from-panel': ({ target }) => {
    closeModalRoot();
    if (G) focusContractFromPanel(G, target.dataset.contractType);
  },
  'advance-contract-guide': focusNextPendingContract,
  'open-main-quest': () => {
    if (!G) return;
    G._mainQuestOnboardShown = true;
    completeOnboardingStep(G, 4);
    showMainQuestPanel(G);
    updateOnboarding(G, uiState);
  },
  'open-branch-modal': () => {
    if (G) showBranchModal(G);
  },
  'open-milestones': () => {
    if (G) showMilestoneList(G);
  },
  'start-branch-select': startBranchSelect,
  'cancel-branch-select': cancelBranchSelect,
  'confirm-branch': confirmBranchFromMap,
  'close-branch': ({ target }) => {
    if (G) showCloseBranchConfirm(G, target.dataset.cityId);
  },
  'confirm-close-branch': ({ target }) => closeBranch(target.dataset.cityId),
  'open-fleet-panel': () => {
    if (G) showFleetPanel(G);
  },
  'open-route-list': ({ action }) => {
    if (G) showRouteList(G, { reset: action === 'open-route-list' });
  },
  'open-route-detail': ({ action }) => {
    if (G) showRouteList(G, { reset: action === 'open-route-list' });
  },
  'return-route-list': () => {
    if (G) showRouteList(G);
  },
  'route-list-sort': ({ target }) => {
    if (!G) return;
    toggleRouteListSort(target.dataset.sortKey);
    showRouteList(G);
  },
  'route-list-page': ({ target }) => {
    if (G) showRouteList(G, { page: target.dataset.page });
  },
  'route-list-page-size': ({ target }) => {
    if (G) showRouteList(G, { pageSize: target.dataset.pageSize });
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
  'set-map-zoom': ({ target }) => {
    setMapZoom(G, parseFloat(target.dataset.zoom));
    renderMapOnly();
  },
  'focus-hq': () => {
    if (G?.hq && focusMapOnCity(G, G.hq)) renderMapOnly();
  },
  'advance-turn': () => advanceTurn(),
  'confirm-advance-without-routes': () => {
    closeModal();
    advanceTurn(true);
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
  'confirm-open-route': ({ target }) => confirmOpenRoute(target.dataset.from, target.dataset.to),
  'set-route-price-preset': ({ target }) => setRoutePricePreset(Number(target.dataset.basePrice), Number(target.dataset.pct)),
  'open-route-price-adjust': ({ target }) => {
    if (G) showRoutePriceAdjust(G, target.dataset.from, target.dataset.to);
  },
  'set-adjust-price-preset': ({ target }) => setAdjustPricePreset(Number(target.dataset.basePrice), Number(target.dataset.pct)),
  'confirm-price-adjust': ({ target }) => {
    const slider = byId('adj-price-slider');
    if (slider) adjustPrice(target.dataset.from, target.dataset.to, slider.value);
  },
  'toggle-route-suspend': ({ target }) => {
    if (G) toggleRouteSuspend(target);
  },
  'confirm-suspend-route': ({ target }) => {
    if (G) confirmSuspendRoute(target);
  },
  'confirm-resume-route': ({ target }) => {
    if (G) confirmResumeRoute(target);
  },
  'confirm-close-route': ({ target }) => {
    if (G) showRouteCloseConfirm(G, target.dataset.from, target.dataset.to);
  },
  'open-route-change-plane': ({ target }) => {
    if (G) showRouteChangePlaneModal(G, target.dataset.from, target.dataset.to);
  },
  'change-route-plane': ({ target }) => {
    if (G) changeSelectedRoutePlane(target);
  },
  'buy-plane': ({ target }) => buySelectedPlane(target),
  'sell-plane': ({ target }) => sellSelectedPlane(target),
  'return-lease': ({ target }) => returnSelectedLease(target),
  'close-route': ({ target }) => closeRoute(target),
  'open-trait-coins': () => openTraitCoins(G),
  'select-trait-coin': ({ target }) => revealSelectedTrait(target.dataset.trait, target.dataset.coinIndex),
  'confirm-trait': ({ target }) => {
    if (G) confirmTrait(target);
  },
  noop: () => {},
  'show-newspaper': () => {
    if (G) showNewspaper(G);
  },
  'show-report': () => {
    if (G) showReportAlone(G);
  },
  'show-delivery-popup': () => {
    if (G) showDeliveryPopup(G);
  },
  'close-delivery-popup': closeDeliveryPopup,
  'delivery-backdrop': closeDeliveryPopup,
  'reload-page': () => location.reload(),
};

const clickActions = {
  ...coreClickActions,
  ...financeController.clickActions,
};

const inputActions = {
  'company-name-input': ({ target }) => setTutorialCompanyName(target.value),
  'route-price-preview': () => updatePricePreview(G),
  'plane-purchase-quantity': ({ target }) => {
    if (G) updatePlanePurchaseOptions(G, target.dataset.planeId);
  },
  'adjust-price-preview': updateAdjustedPriceDisplay,
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
