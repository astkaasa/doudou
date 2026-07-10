import { byId, getCity, fmt } from '../domain/helpers.js';
import { acceptAirportContract } from '../domain/airportContracts.js';
import { getAirport } from '../domain/airports.js';
import { AIRPORT_UPGRADES, upgradeAirportInvestment } from '../domain/airportManagement.js';
import { repayLoan, takeLoan } from '../domain/loans.js';
import { updateHUD } from '../ui/hud.js';
import { BANNER_TONES, showBanner } from '../ui/modal.js';
import {
  buyStockFromModal,
  executeSubsidiaryOpen,
  executeSubsidiarySell,
  sellStockFromModal,
  showCompanyValueModal,
  showAirportProgramModal,
  showLoanConfirm,
  showLoanModal,
  showStockMarket,
  showSubsidiaryConfirm,
  showSubsidiaryOverview,
} from '../ui/modals.js';
import { checkFirstTimePopups } from '../ui/onboarding.js';
import { renderPanel } from '../ui/panel.js';

export function createFinanceController(app) {
  const state = () => app.getState();

  function takeSelectedLoan(target) {
    const game = state();
    if (!game) return;
    const result = takeLoan(game, parseFloat(target.dataset.amount));
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.danger);
      return;
    }
    updateHUD(game);
    showLoanModal(game);
    showBanner(`贷款 $${result.amount}M 已到账（手续费 ${fmt(result.fee)}）`, BANNER_TONES.warning);
    app.updateMilestones();
  }

  function repaySelectedLoan(target) {
    const game = state();
    if (!game) return;
    const result = repayLoan(game, parseFloat(target.dataset.amount));
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.danger);
      return;
    }
    updateHUD(game);
    showLoanModal(game);
    showBanner(`还款 ${fmt(result.amount)}`, BANNER_TONES.success);
    app.updateMilestones();
  }

  function buySelectedStock(target) {
    const game = state();
    if (!game) return;
    const result = buyStockFromModal(game, target.dataset.stockId, Number(target.dataset.shares));
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.danger);
      return;
    }
    updateHUD(game);
    renderPanel(game, app.uiState);
    showBanner(`买入 ${result.stock.code} ${target.dataset.shares}M，花费 ${fmt(result.totalCost)}`, BANNER_TONES.success);
  }

  function sellSelectedStock(target) {
    const game = state();
    if (!game) return;
    const result = sellStockFromModal(game, target.dataset.stockId, Number(target.dataset.shares));
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.danger);
      return;
    }
    updateHUD(game);
    renderPanel(game, app.uiState);
    showBanner(`卖出 ${result.stock.code} ${target.dataset.shares}M，到账 ${fmt(result.netRevenue)}`, BANNER_TONES.warning);
  }

  function executeSubOpen(target) {
    const game = state();
    if (!game) return;
    const result = executeSubsidiaryOpen(game, target.dataset.subMode, target.dataset.cityId, target.dataset.subType, target.dataset.airportId);
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.danger);
      return;
    }
    app.renderGame();
    const city = getCity(target.dataset.cityId);
    const action = target.dataset.subMode === 'acquire' ? '收购' : target.dataset.subType === 'airport' ? '投资' : '新设';
    showSubsidiaryOverview(game, target.dataset.cityId);
    showBanner(`${action}完成：${city?.name || target.dataset.cityId}，花费 ${fmt(result.totalCost)}`, BANNER_TONES.success);
    checkFirstTimePopups(game);
    app.updateMilestones();
  }

  function executeSubSell(target) {
    const game = state();
    if (!game) return;
    const result = executeSubsidiarySell(game, target.dataset.cityId, target.dataset.subType, target.dataset.airportId);
    if (!result.ok) {
      showBanner(result.message, BANNER_TONES.danger);
      return;
    }
    app.renderGame();
    const city = getCity(target.dataset.cityId);
    showSubsidiaryOverview(game, target.dataset.cityId);
    showBanner(`已出售：${city?.name || target.dataset.cityId}，到账 ${fmt(result.sellPrice)}`, BANNER_TONES.warning);
    app.updateMilestones();
  }

  return {
    clickActions: {
      'open-loan-modal': () => {
        const game = state();
        if (game) showLoanModal(game);
      },
      'confirm-loan': ({ target }) => {
        const game = state();
        if (game) showLoanConfirm(game, parseFloat(target.dataset.amount));
      },
      'take-loan': ({ target }) => takeSelectedLoan(target),
      'repay-loan': ({ target }) => repaySelectedLoan(target),
      'open-stock-market': () => {
        const game = state();
        if (!game) return;
        game._stockPanelOpened = true;
        showStockMarket(game);
        checkFirstTimePopups(game);
      },
      'select-stock': ({ target }) => {
        const game = state();
        if (game) showStockMarket(game, target.dataset.stockId);
      },
      'buy-stock': ({ target }) => buySelectedStock(target),
      'sell-stock': ({ target }) => sellSelectedStock(target),
      'open-subsidiary-overview': ({ target }) => {
        const game = state();
        if (!game) return;
        game._subPanelOpened = true;
        showSubsidiaryOverview(game, target.dataset.cityId);
        checkFirstTimePopups(game);
      },
      'open-company-value': () => {
        const game = state();
        if (game) showCompanyValueModal(game);
      },
      'open-airport-program': () => {
        const game = state();
        if (game) showAirportProgramModal(game);
      },
      'accept-airport-contract': ({ target }) => {
        const game = state();
        if (!game) return;
        const select = byId(`contract-plane-${target.dataset.contractId}`);
        const result = acceptAirportContract(game, target.dataset.contractId, Number(select?.value));
        if (!result.ok) {
          showAirportProgramModal(game);
          showBanner(result.message, BANNER_TONES.danger);
          return;
        }
        app.renderGame();
        showAirportProgramModal(game);
        showBanner(`已接受机场合同并开通航线，获得补贴 ${fmt(result.subsidy)}`, BANNER_TONES.success);
        app.updateMilestones();
      },
      'confirm-sub-open': ({ target }) => {
        const game = state();
        if (game) showSubsidiaryConfirm(game, target.dataset.subMode, target.dataset.cityId, target.dataset.subType, target.dataset.airportId);
      },
      'confirm-sub-sell': ({ target }) => {
        const game = state();
        if (game) showSubsidiaryConfirm(game, 'sell', target.dataset.cityId, target.dataset.subType, target.dataset.airportId);
      },
      'execute-sub-open': ({ target }) => executeSubOpen(target),
      'execute-sub-sell': ({ target }) => executeSubSell(target),
      'upgrade-airport-investment': ({ target }) => {
        const game = state();
        if (!game) return;
        const result = upgradeAirportInvestment(game, target.dataset.airportId, target.dataset.upgradeId);
        if (!result.ok) {
          showBanner(result.message, BANNER_TONES.danger);
          return;
        }
        app.renderGame();
        showSubsidiaryOverview(game, getAirport(result.airportId)?.cityId || game.hq);
        showBanner(`${getAirport(result.airportId)?.name || result.airportId} 完成${AIRPORT_UPGRADES[result.upgradeId].name}，投入 ${fmt(result.cost)}`, BANNER_TONES.success);
      },
    },
  };
}
