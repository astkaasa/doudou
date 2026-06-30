import './styles/app.css';

import { ERAS } from './data/eras.js';
import { normalizePlayerTrait } from './data/playerTraits.js';
import { closeBranch as closeBranchDomain, isBase, isBranchConstructing, openBranch } from './domain/bases.js';
import { DEFAULT_COMPANY_NAME } from './domain/constants.js';
import { buyPlane, returnLease, sellPlane } from './domain/fleet.js';
import { byId, cityDist, fmt, getCity, routeKey } from './domain/helpers.js';
import { repayLoan, takeLoan } from './domain/loans.js';
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
} from './domain/routes.js';
import { advanceTurnState } from './domain/turn.js';
import { updateHUD } from './ui/hud.js';
import { closeModalRoot, showBanner, showModal } from './ui/modal.js';
import { showMilestoneList, showMilestoneNotification } from './ui/milestones.js';
import { showVersionLog } from './ui/versionLog.js';
import { describeRouteSelection, initMapDrag, renderMap, setMapZoom } from './ui/map.js';
import { showRouteCreateInfo as renderRouteCreateInfo, hideRouteCreateInfo, renderPanel, renderRouteCityPicker } from './ui/panel.js';
import { applySeasonTheme } from './ui/season.js';
import { removeBranchBanner, showBranchBanner, showSelectedBranch } from './ui/branches.js';
import { acknowledgeOnboarding, dismissOnboarding, resetOnboarding, updateOnboarding } from './ui/onboarding.js';
import {
  closeDeliveryPopup,
  showBuyPlaneModal,
  showBranchModal,
  showCloseBranchConfirm,
  showDeliveryPopup,
  showFleetPanel,
  showGameOver,
  showLoanConfirm,
  showLoanModal,
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
  showStockMarket,
  toggleRouteListSort,
  updateAdjustedPriceDisplay,
  showTurnSummary,
  updatePricePreview,
  buyStockFromModal,
  sellStockFromModal,
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

const APP_SETTINGS_KEY = 'doudou.appSettings';
const appSettings = loadAppSettings();

let G = null;
const uiState = {
  selectedEra: ERAS[0].id,
  hqSelectMode: false,
  selectedHQ: null,
  branchSelectMode: false,
  selectedBranch: null,
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
  closeModalRoot();
  closeDeliveryPopup();
  if (uiState.branchSelectMode) cancelBranchSelect();
  if (G && !G.gameOver) {
    if (G.selectedCity) {
      G.selectedCity = null;
      renderMapOnly();
    }
    hideRouteCreateInfo();
    setBottomHint();
  }
}

function showOnboardingHelp() {
  showModal(`<h2>新手帮助</h2>
    <div class="loan-info">
      <div class="loan-row"><span>1. 选择总部</span><span>总部/分部决定起飞城市</span></div>
      <div class="loan-row"><span>2. 购买飞机</span><span>看航程、座位和交付时间</span></div>
      <div class="loan-row"><span>3. 开通航线</span><span>从基地出发，预留开航费用并设置票价</span></div>
      <div class="loan-row"><span>4. 推进季度</span><span>看报纸、财报和市场变化</span></div>
      <div class="loan-row"><span>5. 扩张网络</span><span>用分部、租赁和贷款加速成长</span></div>
    </div>
    <p style="color:#7ba3cc;font-size:13px;line-height:1.5;margin-top:10px">移动端可以拖动地图，双指捏合缩放。点击城市可选择总部、分部或航线目的地。</p>
    <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
      <button class="btn" style="background:#334155;color:#e0e8f0" data-action="reset-onboarding">重新开启新手提示</button>
      <button class="btn btn-primary" data-action="close-modal">知道了</button>
    </div>`);
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
    showTraitEnvelope(G);
    showBanner('存档已载入！' + G.companyName + ' - ' + G.year + ' Q' + G.quarter, '#16a34a');
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
  seedInitialFleet(G);
  uiState.hqSelectMode = false;
  uiState.selectedHQ = null;
  byId('app').classList.remove('hq-selecting');
  removeHQBanner();
  hideTutorial();
  byId('app').hidden = false;
  renderGame();
  showTraitEnvelope(G);
  setBottomHint();
}

function openRouteModal() {
  if (!G) return;
  G.selectedCity = null;
  setBottomHint('选择起飞基地：可点地图，也可用下方面板列表');
  renderRouteCreateInfo(null, null, renderRouteCityPicker(G));
  renderMapOnly();
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

function takeSelectedLoan(target) {
  const amount = parseFloat(target.dataset.amount);
  const result = takeLoan(G, amount);
  if (!result.ok) {
    showBanner(result.message, '#dc2626');
    return;
  }
  updateHUD(G);
  showLoanModal(G);
  showBanner(`贷款 $${result.amount}M 已到账（手续费 ${fmt(result.fee)}）`, '#b45309');
  updateMilestones();
}

function repaySelectedLoan(target) {
  const amount = parseFloat(target.dataset.amount);
  const result = repayLoan(G, amount);
  if (!result.ok) {
    showBanner(result.message, '#dc2626');
    return;
  }
  updateHUD(G);
  showLoanModal(G);
  showBanner(`还款 ${fmt(result.amount)}`, '#16a34a');
  updateMilestones();
}

function buySelectedStock(target) {
  const result = buyStockFromModal(G, target.dataset.stockId, Number(target.dataset.shares));
  if (!result.ok) {
    showBanner(result.message, '#b91c1c');
    return;
  }
  updateHUD(G);
  renderPanel(G, uiState);
  showBanner(`买入 ${result.stock.code} ${target.dataset.shares}M，花费 ${fmt(result.totalCost)}`, '#16a34a');
}

function sellSelectedStock(target) {
  const result = sellStockFromModal(G, target.dataset.stockId, Number(target.dataset.shares));
  if (!result.ok) {
    showBanner(result.message, '#b91c1c');
    return;
  }
  updateHUD(G);
  renderPanel(G, uiState);
  showBanner(`卖出 ${result.stock.code} ${target.dataset.shares}M，到账 ${fmt(result.netRevenue)}`, '#d97706');
}

function advanceTurn() {
  if (!G || G.gameOver) return;
  const report = advanceTurnState(G);
  if (!report) return;
  if (G.cash < -5) {
    showGameOver(G);
    return;
  }
  renderGame();
  if (report.branchCompleted.length > 0) {
    showBanner(`分部完工：${report.branchCompleted.map((cityId) => getCity(cityId)?.name || cityId).join('、')}`, '#7c3aed');
  }
  showTurnSummary(G, report);
  updateMilestones();
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'modal-backdrop' && event.target !== target) return;
  if (action === 'delivery-backdrop' && event.target !== target) return;
  switch (action) {
    case 'save-game':
      saveGame();
      break;
    case 'load-game':
      loadGame();
      break;
    case 'show-main-menu':
      showMainMenu(uiState.selectedEra);
      break;
    case 'show-era-menu':
      showEraMenu(uiState.selectedEra);
      break;
    case 'show-save-menu':
      showSaveMenu();
      break;
    case 'show-credits-menu':
      showCreditsMenu();
      break;
    case 'select-era':
      uiState.selectedEra = target.dataset.eraId;
      selectEraCard(uiState.selectedEra);
      break;
    case 'tutorial-next-step':
      tutorialNextStep();
      break;
    case 'show-version-log':
      showVersionLog();
      break;
    case 'cancel-hq-select':
      cancelHQSelect();
      break;
    case 'confirm-hq-start':
      confirmHQAndStart();
      break;
    case 'map-empty':
      onMapEmptyClick();
      break;
    case 'city-click':
      onCityClick(target.dataset.cityId);
      break;
    case 'open-route-modal':
      openRouteModal();
      break;
    case 'open-buy-plane-modal':
      if (G) showBuyPlaneModal(G);
      break;
    case 'open-loan-modal':
      if (G) showLoanModal(G);
      break;
    case 'open-stock-market':
      if (G) showStockMarket(G);
      break;
    case 'select-stock':
      if (G) showStockMarket(G, target.dataset.stockId);
      break;
    case 'buy-stock':
      if (G) buySelectedStock(target);
      break;
    case 'sell-stock':
      if (G) sellSelectedStock(target);
      break;
    case 'open-branch-modal':
      if (G) showBranchModal(G);
      break;
    case 'open-milestones':
      if (G) showMilestoneList(G);
      break;
    case 'start-branch-select':
      startBranchSelect();
      break;
    case 'cancel-branch-select':
      cancelBranchSelect();
      break;
    case 'confirm-branch':
      confirmBranchFromMap();
      break;
    case 'close-branch':
      if (G) showCloseBranchConfirm(G, target.dataset.cityId);
      break;
    case 'confirm-close-branch':
      closeBranch(target.dataset.cityId);
      break;
    case 'open-fleet-panel':
      if (G) showFleetPanel(G);
      break;
    case 'open-route-list':
    case 'open-route-detail':
      if (G) showRouteList(G, { reset: action === 'open-route-list' });
      break;
    case 'return-route-list':
      if (G) showRouteList(G);
      break;
    case 'route-list-sort':
      if (G) {
        toggleRouteListSort(target.dataset.sortKey);
        showRouteList(G);
      }
      break;
    case 'route-list-page':
      if (G) showRouteList(G, { page: target.dataset.page });
      break;
    case 'route-list-page-size':
      if (G) showRouteList(G, { pageSize: target.dataset.pageSize });
      break;
    case 'dismiss-onboarding':
      dismissOnboarding();
      break;
    case 'acknowledge-onboarding':
      acknowledgeOnboarding();
      break;
    case 'show-onboarding-help':
      showOnboardingHelp();
      break;
    case 'show-settings':
      showSettings();
      break;
    case 'set-map-style':
      setMapStyle(target.dataset.mapStyle);
      break;
    case 'toggle-map-boundaries':
      toggleMapBoundaries(target.checked);
      break;
    case 'reset-onboarding':
      resetOnboarding();
      closeModalRoot();
      if (G) renderGame();
      showBanner('新手提示已重新开启', '#16a34a');
      break;
    case 'set-map-zoom':
      setMapZoom(G, parseFloat(target.dataset.zoom));
      renderMapOnly();
      break;
    case 'advance-turn':
      advanceTurn();
      break;
    case 'close-modal':
    case 'modal-backdrop':
      closeModal();
      break;
    case 'confirm-open-route':
      confirmOpenRoute(target.dataset.from, target.dataset.to);
      break;
    case 'set-route-price-preset':
      setRoutePricePreset(Number(target.dataset.basePrice), Number(target.dataset.pct));
      break;
    case 'open-route-price-adjust':
      if (G) showRoutePriceAdjust(G, target.dataset.from, target.dataset.to);
      break;
    case 'set-adjust-price-preset':
      setAdjustPricePreset(Number(target.dataset.basePrice), Number(target.dataset.pct));
      break;
    case 'confirm-price-adjust': {
      const slider = byId('adj-price-slider');
      if (slider) adjustPrice(target.dataset.from, target.dataset.to, slider.value);
      break;
    }
    case 'toggle-route-suspend':
      if (G) toggleRouteSuspend(target);
      break;
    case 'confirm-suspend-route':
      if (G) confirmSuspendRoute(target);
      break;
    case 'confirm-resume-route':
      if (G) confirmResumeRoute(target);
      break;
    case 'confirm-close-route':
      if (G) showRouteCloseConfirm(G, target.dataset.from, target.dataset.to);
      break;
    case 'open-route-change-plane':
      if (G) showRouteChangePlaneModal(G, target.dataset.from, target.dataset.to);
      break;
    case 'change-route-plane':
      if (G) changeSelectedRoutePlane(target);
      break;
    case 'buy-plane':
      buySelectedPlane(target);
      break;
    case 'sell-plane':
      sellSelectedPlane(target);
      break;
    case 'return-lease':
      returnSelectedLease(target);
      break;
    case 'close-route':
      closeRoute(target);
      break;
    case 'open-trait-coins':
      openTraitCoins(G);
      break;
    case 'select-trait-coin':
      revealSelectedTrait(target.dataset.trait, target.dataset.coinIndex);
      break;
    case 'confirm-trait':
      if (G) confirmTrait(target);
      break;
    case 'noop':
      break;
    case 'confirm-loan':
      if (G) showLoanConfirm(G, parseFloat(target.dataset.amount));
      break;
    case 'take-loan':
      takeSelectedLoan(target);
      break;
    case 'repay-loan':
      repaySelectedLoan(target);
      break;
    case 'show-newspaper':
      if (G) showNewspaper(G);
      break;
    case 'show-report':
      if (G) showReportAlone(G);
      break;
    case 'show-delivery-popup':
      if (G) showDeliveryPopup(G);
      break;
    case 'close-delivery-popup':
    case 'delivery-backdrop':
      closeDeliveryPopup();
      break;
    case 'reload-page':
      location.reload();
      break;
    default:
      break;
  }
}

function handleInput(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  switch (target.dataset.action) {
    case 'company-name-input':
      setTutorialCompanyName(target.value);
      break;
    case 'route-price-preview':
      updatePricePreview(G);
      break;
    case 'adjust-price-preview':
      updateAdjustedPriceDisplay();
      break;
    default:
      break;
  }
}

initTutorial(uiState.selectedEra);
initMapDrag(state, () => renderMap(G, uiState));
document.addEventListener('click', handleClick);
document.addEventListener('input', handleInput);
document.addEventListener('change', handleInput);
window.addEventListener('resize', () => {
  if (G) renderMap(G, uiState);
});
