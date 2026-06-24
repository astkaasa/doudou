import './styles/app.css';

import { ERAS } from './data/eras.js';
import { buyPlane, sellPlane } from './domain/fleet.js';
import { byId, fmt, fmtPct, getCity, routeKey } from './domain/helpers.js';
import { loadGameState, saveGameState } from './domain/save.js';
import { createSetupState, initState, seedInitialFleet } from './domain/state.js';
import { adjustRoutePrice, closeRoute as closeRouteDomain, countCompetitors, openRoute } from './domain/routes.js';
import { advanceTurnState } from './domain/turn.js';
import { updateHUD } from './ui/hud.js';
import { closeModalRoot, showBanner, showModal } from './ui/modal.js';
import { describeRouteSelection, initMapDrag, renderMap, setMapZoom } from './ui/map.js';
import { showRouteCreateInfo as renderRouteCreateInfo, hideRouteCreateInfo, renderPanel, renderRouteCityPicker } from './ui/panel.js';
import { applySeasonTheme } from './ui/season.js';
import {
  showBuyPlaneModal,
  showFinancialReport,
  showFleetPanel,
  showGameOver,
  showNewspaper,
  showRouteCreateModal,
  showRouteList,
  updatePricePreview,
} from './ui/modals.js';
import {
  hideTutorial,
  initTutorial,
  removeHQBanner,
  selectEraCard,
  showHQBanner,
  showSelectedHQ,
  showTutorial,
} from './ui/tutorial.js';

let G = null;
const uiState = {
  selectedEra: ERAS[0].id,
  hqSelectMode: false,
  selectedHQ: null,
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
}

function renderMapOnly() {
  if (G) renderMap(G, uiState);
}

function closeModal() {
  closeModalRoot();
  if (G && !G.gameOver) {
    if (G.selectedCity) {
      G.selectedCity = null;
      renderMapOnly();
    }
    hideRouteCreateInfo();
    byId('bottom-hint').textContent = '选择两个城市来开通航线';
  }
  if (G && G._pendingReport) {
    const r = G._pendingReport;
    G._pendingReport = null;
    showFinancialReport(G, r.rev, r.cost, r.profit, r.period);
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
    uiState.hqSelectMode = false;
    uiState.selectedHQ = null;
    hideTutorial();
    removeHQBanner();
    renderGame();
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
  const name = byId('company-name').value.trim() || '云际航空';
  G = createSetupState(name, uiState.selectedEra);
  uiState.hqSelectMode = true;
  uiState.selectedHQ = null;
  hideTutorial();
  renderGame();
  showHQBanner();
  byId('bottom-hint').textContent = '点击地图上的城市选择总部';
}

function cancelHQSelect() {
  removeHQBanner();
  uiState.hqSelectMode = false;
  uiState.selectedHQ = null;
  G = null;
  showTutorial();
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
  const name = byId('company-name') ? (byId('company-name').value.trim() || '云际航空') : '云际航空';
  const era = uiState.selectedEra || 'era1';
  G = initState(hq, era);
  G.companyName = name;
  seedInitialFleet(G);
  uiState.hqSelectMode = false;
  uiState.selectedHQ = null;
  removeHQBanner();
  hideTutorial();
  renderGame();
  showBanner('欢迎经营 ' + name + '！(' + G.year + '-' + G.endYear + ') 试试开通第一条航线吧', '#2563eb');
}

function openRouteModal() {
  if (!G) return;
  G.selectedCity = null;
  byId('bottom-hint').textContent = '选择起飞城市：可点地图，也可用下方面板列表';
  renderRouteCreateInfo(null, null, renderRouteCityPicker(G));
  renderMapOnly();
}

function openRouteCreateModal(from, to) {
  const a = getCity(from);
  const b = getCity(to);
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
  const opened = openRoute(G, from, to, planeUid, price);
  if (!opened) return;
  renderGame();
  closeModal();
  hideRouteCreateInfo();
  showBanner('航线开通：' + getCity(from).name + ' → ' + getCity(to).name, '#16a34a');
}

function onMapEmptyClick() {
  if (!G || G.gameOver) return;
  if (G.selectedCity) {
    G.selectedCity = null;
    renderMapOnly();
    byId('bottom-hint').textContent = '选择起飞城市：可点地图，也可用下方面板列表';
    renderRouteCreateInfo(null, null, renderRouteCityPicker(G));
  }
}

function onCityClick(cityId) {
  if (!G) return;
  if (uiState.hqSelectMode) {
    uiState.selectedHQ = cityId;
    renderMapOnly();
    renderPanel(G, uiState);
    showSelectedHQ(getCity(cityId).name);
    return;
  }
  if (G.gameOver) return;
  if (!G.selectedCity) {
    G.selectedCity = cityId;
    renderMapOnly();
    byId('bottom-hint').textContent = '已选择 ' + getCity(cityId).name + '，继续选择到达城市';
    renderRouteCreateInfo(getCity(cityId), null, `${describeRouteSelection(getCity(cityId), null)}${renderRouteCityPicker(G, cityId)}`);
  } else if (G.selectedCity === cityId) {
    G.selectedCity = null;
    renderMapOnly();
    byId('bottom-hint').textContent = '选择起飞城市：可点地图，也可用下方面板列表';
    renderRouteCreateInfo(null, null, renderRouteCityPicker(G));
  } else {
    const from = G.selectedCity;
    G.selectedCity = null;
    renderRouteCreateInfo(getCity(from), getCity(cityId), describeRouteSelection(getCity(from), getCity(cityId)));
    openRouteCreateModal(from, cityId);
  }
}

function buySelectedPlane(target) {
  const result = buyPlane(G, target.dataset.planeId, target.dataset.lease === 'true');
  if (!result.ok) {
    showBanner(result.message, '#dc2626');
    return;
  }
  closeModal();
  updateHUD(G);
  renderPanel(G, uiState);
}

function sellSelectedPlane(target) {
  const sold = sellPlane(G, parseInt(target.dataset.uid, 10));
  if (!sold) return;
  updateHUD(G);
  renderPanel(G, uiState);
  closeModal();
  showBanner(`出售 ${sold.plane.name}，获得 ${fmt(sold.sellPrice)}`, '#d97706');
}

function adjustPrice(target) {
  const route = adjustRoutePrice(G, target.dataset.from, target.dataset.to, target.value);
  if (!route) return;
  const span = target.nextElementSibling;
  if (span) span.textContent = '$' + route.price;
  const row = target.closest('.route-item');
  if (row) {
    const profitEl = row.querySelector('[data-route-profit]');
    if (profitEl) {
      profitEl.textContent = fmt(route.profit);
      profitEl.style.color = route.profit >= 0 ? '#4ade80' : '#f0a0a0';
    }
    const priceEl = row.querySelector('[data-route-price]');
    if (priceEl) priceEl.textContent = '票价$' + route.price;
    const loadEl = row.querySelector('[data-route-load]');
    if (loadEl) loadEl.textContent = '客座率' + fmtPct(route.loadFactor * 100);
    const revenueEl = row.querySelector('[data-route-revenue]');
    if (revenueEl) revenueEl.textContent = '收入' + fmt(route.revenue);
    const costEl = row.querySelector('[data-route-cost]');
    if (costEl) costEl.textContent = '成本' + fmt(route.cost);
  }
  updateHUD(G);
  renderPanel(G, uiState);
}

function closeRoute(target) {
  closeRouteDomain(G, target.dataset.from, target.dataset.to);
  renderGame();
  closeModal();
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
  showNewspaper(G);
  G._pendingReport = report;
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'modal-backdrop' && event.target !== target) return;
  switch (action) {
    case 'save-game':
      saveGame();
      break;
    case 'load-game':
      loadGame();
      break;
    case 'select-era':
      uiState.selectedEra = target.dataset.eraId;
      selectEraCard(uiState.selectedEra);
      break;
    case 'tutorial-next-step':
      tutorialNextStep();
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
    case 'open-fleet-panel':
      if (G) showFleetPanel(G);
      break;
    case 'open-route-list':
    case 'open-route-detail':
      if (G) showRouteList(G);
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
    case 'buy-plane':
      buySelectedPlane(target);
      break;
    case 'sell-plane':
      sellSelectedPlane(target);
      break;
    case 'close-route':
      closeRoute(target);
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
    case 'route-price-preview':
      updatePricePreview(G);
      break;
    case 'adjust-price':
      adjustPrice(target);
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
