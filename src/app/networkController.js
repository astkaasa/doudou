import { closeBranch as closeBranchDomain, isBase, isBranchConstructing, openBranch } from '../domain/bases.js';
import { buyPlane, returnLease, sellPlane } from '../domain/fleet.js';
import { byId, cityDist, fmt, getCity, routeKey } from '../domain/helpers.js';
import {
  adjustRoutePrice,
  changeRoutePlane,
  closeRoute as closeRouteDomain,
  countCompetitors,
  findRoute,
  openRoute,
  resumeRoute,
  suspendRoute,
} from '../domain/routes.js';
import { removeBranchBanner, showBranchBanner, showSelectedBranch } from '../ui/branches.js';
import { updateHUD } from '../ui/hud.js';
import { describeRouteSelection, focusMapOnCity, setMapZoom } from '../ui/map.js';
import { BANNER_TONES, closeModalRoot, showBanner, showModal } from '../ui/modal.js';
import {
  showBranchModal,
  showBuyPlaneModal,
  showCloseBranchConfirm,
  showFleetPanel,
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
  updatePricePreview,
} from '../ui/modals.js';
import { completeOnboardingStep, updateOnboarding } from '../ui/onboarding.js';
import { showRouteCreateInfo, renderPanel, renderRouteCityPicker } from '../ui/panel.js';
import { showSelectedHQ } from '../ui/tutorial.js';

export function createNetworkController(app) {
  const state = () => app.getState();

  function openRouteModal() {
    const game = state();
    if (!game) return;
    game.selectedCity = null;
    app.setBottomHint('选择起飞基地：可点地图，也可用下方面板列表');
    showRouteCreateInfo(null, null, renderRouteCityPicker(game));
    app.renderMapOnly();
    app.scrollPanelToTop();
  }

  function openRouteCreateModal(from, to) {
    const game = state();
    if (!game) return;
    const a = getCity(from);
    const b = getCity(to);
    if (!isBase(game, from)) {
      showModal(`<h2>无法开通航线</h2><p class="text-danger">起飞城市必须是总部或分部。${a.name}不是你的基地。</p><p class="modal-help">可以在快捷操作中点击「开设分部」扩展基地网络。</p><button class="btn btn-primary" type="button" data-action="close-modal">确定</button>`);
      return;
    }
    const existing = game.routes.find((route) => routeKey(route.from, route.to) === routeKey(from, to));
    if (existing) {
      showModal(`<h2>航线已开通</h2><p>${a.name} → ${b.name} 已在运营中。</p><button class="btn btn-primary" type="button" data-action="close-modal">确定</button>`);
      return;
    }
    showRouteCreateModal(game, from, to, countCompetitors(game, from, to));
  }

  function confirmOpenRoute(from, to) {
    const game = state();
    if (!game) return;
    const select = byId('route-plane');
    const slider = byId('route-price');
    if (!select || !slider) return;
    const result = openRoute(game, from, to, parseInt(select.value, 10), parseInt(slider.value, 10));
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.danger);
      return;
    }
    app.renderGame();
    app.closeModal();
    showBanner(`航线开通：${getCity(from).name} → ${getCity(to).name}  开通费用 ${fmt(result.cost)}`, BANNER_TONES.success);
    completeOnboardingStep(game, game.routes.length > 1 ? 1 : 0);
    updateOnboarding(game, app.uiState);
    app.updateMilestones();
  }

  function startBranchSelect() {
    const game = state();
    if (!game) return;
    closeModalRoot();
    app.uiState.branchSelectMode = true;
    app.uiState.selectedBranch = null;
    game.selectedCity = null;
    byId('app').classList.add('branch-selecting');
    showBranchBanner(game);
    app.renderMapOnly();
    updateOnboarding(game, app.uiState);
    app.setBottomHint('点击地图上的城市选择分部');
  }

  function cancelBranchSelect() {
    const game = state();
    app.uiState.branchSelectMode = false;
    app.uiState.selectedBranch = null;
    byId('app').classList.remove('branch-selecting');
    removeBranchBanner();
    app.renderMapOnly();
    updateOnboarding(game, app.uiState);
    if (game) app.setBottomHint();
  }

  function confirmBranchFromMap() {
    const game = state();
    if (!game || !app.uiState.selectedBranch) {
      showBanner('请先选择分部城市', BANNER_TONES.warning);
      return;
    }
    const cityId = app.uiState.selectedBranch;
    const result = openBranch(game, cityId);
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.danger);
      return;
    }
    cancelBranchSelect();
    app.renderGame();
    showBanner(`分部建设：${getCity(cityId).name}（花费 ${fmt(result.cost)}，${result.constructIn}季度后完工）`, BANNER_TONES.warning);
    app.updateMilestones();
  }

  function closeBranch(cityId) {
    const game = state();
    if (!game) return;
    const result = closeBranchDomain(game, cityId);
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.danger);
      return;
    }
    app.renderGame();
    closeModalRoot();
    showBanner(`已关闭分部：${getCity(cityId).name}`, BANNER_TONES.danger);
  }

  function onMapEmptyClick() {
    const game = state();
    if (!game || game.gameOver || app.uiState.branchSelectMode) return;
    if (game.selectedCity) {
      game.selectedCity = null;
      app.renderMapOnly();
      app.setBottomHint('选择起飞基地：可点地图，也可用下方面板列表');
      showRouteCreateInfo(null, null, renderRouteCityPicker(game));
    }
  }

  function onCityClick(cityId) {
    const game = state();
    if (!game) return;
    if (app.uiState.hqSelectMode) {
      app.uiState.selectedHQ = cityId;
      app.renderMapOnly();
      renderPanel(game, app.uiState);
      const cityName = getCity(cityId).name;
      showSelectedHQ(cityName);
      app.setBottomHint(`已选择 ${cityName}，点击确认开始`);
      return;
    }
    if (app.uiState.branchSelectMode) {
      const city = getCity(cityId);
      if (isBase(game, cityId)) {
        showBanner(city.name + ' 已是基地，无法重复开设', BANNER_TONES.warning);
        return;
      }
      if (isBranchConstructing(game, cityId)) {
        showBanner(city.name + ' 分部正在建设中', BANNER_TONES.warning);
        return;
      }
      app.uiState.selectedBranch = cityId;
      app.renderMapOnly();
      showSelectedBranch(city.name);
      return;
    }
    if (game.gameOver) return;
    if (!game.selectedCity) {
      game.selectedCity = cityId;
      app.renderMapOnly();
      const fromIsBase = isBase(game, cityId);
      app.setBottomHint(fromIsBase
        ? '已选择 ' + getCity(cityId).name + '，继续选择到达城市'
        : getCity(cityId).name + ' 非基地，选择到达城市可查看距离');
      showRouteCreateInfo(getCity(cityId), null, `${describeRouteSelection(getCity(cityId), null, { fromIsBase })}${renderRouteCityPicker(game, cityId)}`);
    } else if (game.selectedCity === cityId) {
      game.selectedCity = null;
      app.renderMapOnly();
      app.setBottomHint('选择起飞基地：可点地图，也可用下方面板列表');
      showRouteCreateInfo(null, null, renderRouteCityPicker(game));
    } else {
      const from = game.selectedCity;
      const fromIsBase = isBase(game, from);
      game.selectedCity = null;
      showRouteCreateInfo(getCity(from), getCity(cityId), describeRouteSelection(getCity(from), getCity(cityId), { fromIsBase }));
      if (!fromIsBase) {
        const distance = Math.round(cityDist(getCity(from), getCity(cityId)));
        app.setBottomHint(`${getCity(from).name} → ${getCity(cityId).name} 距离 ${distance}km（需从总部或分部起飞才能开通航线）`);
        app.renderMapOnly();
        return;
      }
      openRouteCreateModal(from, cityId);
    }
  }

  function buySelectedPlane(target) {
    const game = state();
    if (!game) return;
    const qtyInput = byId('buy-qty-' + target.dataset.planeId);
    const count = qtyInput ? parseInt(qtyInput.value, 10) : 1;
    const result = buyPlane(game, target.dataset.planeId, target.dataset.lease === 'true', count);
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.danger);
      return;
    }
    app.closeModal();
    updateHUD(game);
    renderPanel(game, app.uiState);
    showBanner(`${target.dataset.lease === 'true' ? '租赁' : '购买'} ${result.planes.length}架 ${result.plane.name}`, target.dataset.lease === 'true' ? BANNER_TONES.warning : BANNER_TONES.info);
    updateOnboarding(game);
    app.updateMilestones();
  }

  function sellSelectedPlane(target) {
    const game = state();
    if (!game) return;
    const sold = sellPlane(game, parseInt(target.dataset.uid, 10));
    if (!sold) return;
    updateHUD(game);
    renderPanel(game, app.uiState);
    app.closeModal();
    showBanner(`出售 ${sold.plane.name}，获得 ${fmt(sold.sellPrice)}`, BANNER_TONES.warning);
    app.updateMilestones();
  }

  function returnSelectedLease(target) {
    const game = state();
    if (!game) return;
    const returned = returnLease(game, parseInt(target.dataset.uid, 10));
    if (!returned) return;
    updateHUD(game);
    renderPanel(game, app.uiState);
    app.closeModal();
    showBanner(`退租 ${returned.plane.name}`, BANNER_TONES.warning);
  }

  function adjustPrice(from, to, price) {
    const game = state();
    if (!game) return;
    const route = adjustRoutePrice(game, from, to, price);
    if (!route) return;
    app.renderGame();
    showRouteList(game);
    showBanner(`${getCity(route.from).name}→${getCity(route.to).name} 票价调整为 $${route.price}`, BANNER_TONES.info);
  }

  function closeRoute(target) {
    const game = state();
    if (!game) return;
    closeRouteDomain(game, target.dataset.from, target.dataset.to);
    app.renderGame();
    showRouteList(game);
  }

  function toggleRouteSuspend(target) {
    const game = state();
    if (!game) return;
    const route = findRoute(game, target.dataset.from, target.dataset.to);
    if (!route) return;
    if (route.suspended) showRouteResumeConfirm(game, route.from, route.to);
    else showRouteSuspendConfirm(game, route.from, route.to);
  }

  function confirmSuspendRoute(target) {
    const game = state();
    if (!game) return;
    const result = suspendRoute(game, target.dataset.from, target.dataset.to);
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.warning);
      showRouteList(game);
      return;
    }
    app.renderGame();
    showBanner(`航线已停飞：${getCity(result.route.from).name} → ${getCity(result.route.to).name}`, BANNER_TONES.warning);
    showRouteList(game);
  }

  function confirmResumeRoute(target) {
    const game = state();
    if (!game) return;
    const result = resumeRoute(game, target.dataset.from, target.dataset.to);
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.warning);
      showRouteList(game);
      return;
    }
    app.renderGame();
    showBanner(`航线已复飞：${getCity(result.route.from).name} → ${getCity(result.route.to).name}`, BANNER_TONES.success);
    showRouteList(game);
  }

  function changeSelectedRoutePlane(target) {
    const game = state();
    if (!game) return;
    const result = changeRoutePlane(game, target.dataset.from, target.dataset.to, target.dataset.uid);
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.danger);
      showRouteList(game);
      return;
    }
    app.renderGame();
    showBanner(`${getCity(result.route.from).name}→${getCity(result.route.to).name} 已更换执飞机型`, BANNER_TONES.warning);
    showRouteList(game);
  }

  const clickActions = {
    'map-empty': onMapEmptyClick,
    'city-click': ({ target }) => onCityClick(target.dataset.cityId),
    'open-route-modal': openRouteModal,
    'open-route-from-warning': () => {
      app.closeModal();
      openRouteModal();
    },
    'open-buy-plane-modal': () => {
      const game = state();
      if (game) showBuyPlaneModal(game);
    },
    'open-branch-modal': () => {
      const game = state();
      if (game) showBranchModal(game);
    },
    'start-branch-select': startBranchSelect,
    'cancel-branch-select': cancelBranchSelect,
    'confirm-branch': confirmBranchFromMap,
    'close-branch': ({ target }) => {
      const game = state();
      if (game) showCloseBranchConfirm(game, target.dataset.cityId);
    },
    'confirm-close-branch': ({ target }) => closeBranch(target.dataset.cityId),
    'open-fleet-panel': () => {
      const game = state();
      if (game) showFleetPanel(game);
    },
    'open-route-list': ({ action }) => {
      const game = state();
      if (game) showRouteList(game, { reset: action === 'open-route-list' });
    },
    'open-route-detail': ({ action }) => {
      const game = state();
      if (game) showRouteList(game, { reset: action === 'open-route-list' });
    },
    'return-route-list': () => {
      const game = state();
      if (game) showRouteList(game);
    },
    'route-list-sort': ({ target }) => {
      const game = state();
      if (!game) return;
      toggleRouteListSort(target.dataset.sortKey);
      showRouteList(game);
    },
    'route-list-page': ({ target }) => {
      const game = state();
      if (game) showRouteList(game, { page: target.dataset.page });
    },
    'route-list-page-size': ({ target }) => {
      const game = state();
      if (game) showRouteList(game, { pageSize: target.dataset.pageSize });
    },
    'set-map-zoom': ({ target }) => {
      const game = state();
      if (!game) return;
      setMapZoom(game, parseFloat(target.dataset.zoom));
      app.renderMapOnly();
    },
    'focus-hq': () => {
      const game = state();
      if (game?.hq && focusMapOnCity(game, game.hq)) app.renderMapOnly();
    },
    'confirm-open-route': ({ target }) => confirmOpenRoute(target.dataset.from, target.dataset.to),
    'set-route-price-preset': ({ target }) => setRoutePricePreset(Number(target.dataset.basePrice), Number(target.dataset.pct)),
    'open-route-price-adjust': ({ target }) => {
      const game = state();
      if (game) showRoutePriceAdjust(game, target.dataset.from, target.dataset.to);
    },
    'set-adjust-price-preset': ({ target }) => setAdjustPricePreset(Number(target.dataset.basePrice), Number(target.dataset.pct)),
    'confirm-price-adjust': ({ target }) => {
      const slider = byId('adj-price-slider');
      if (slider) adjustPrice(target.dataset.from, target.dataset.to, slider.value);
    },
    'toggle-route-suspend': ({ target }) => toggleRouteSuspend(target),
    'confirm-suspend-route': ({ target }) => confirmSuspendRoute(target),
    'confirm-resume-route': ({ target }) => confirmResumeRoute(target),
    'confirm-close-route': ({ target }) => {
      const game = state();
      if (game) showRouteCloseConfirm(game, target.dataset.from, target.dataset.to);
    },
    'open-route-change-plane': ({ target }) => {
      const game = state();
      if (game) showRouteChangePlaneModal(game, target.dataset.from, target.dataset.to);
    },
    'change-route-plane': ({ target }) => changeSelectedRoutePlane(target),
    'buy-plane': ({ target }) => buySelectedPlane(target),
    'sell-plane': ({ target }) => sellSelectedPlane(target),
    'return-lease': ({ target }) => returnSelectedLease(target),
    'close-route': ({ target }) => closeRoute(target),
  };

  const inputActions = {
    'route-price-preview': () => updatePricePreview(state()),
    'plane-purchase-quantity': ({ target }) => {
      const game = state();
      if (game) updatePlanePurchaseOptions(game, target.dataset.planeId);
    },
    'adjust-price-preview': updateAdjustedPriceDisplay,
  };

  return { clickActions, inputActions, cancelBranchSelect, openRouteModal };
}
