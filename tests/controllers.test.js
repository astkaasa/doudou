import { describe, expect, it, vi } from 'vitest';

import { createFinanceController } from '../src/app/financeController.js';
import { createNetworkController } from '../src/app/networkController.js';
import { createTurnController } from '../src/app/turnController.js';

describe('application controllers', () => {
  it('owns the complete finance and investment action surface', () => {
    const controller = createFinanceController({
      getState: () => null,
      uiState: {},
      renderGame: vi.fn(),
      updateMilestones: vi.fn(),
    });

    expect(Object.keys(controller.clickActions).sort()).toEqual([
      'buy-stock',
      'confirm-loan',
      'confirm-sub-open',
      'confirm-sub-sell',
      'execute-sub-open',
      'execute-sub-sell',
      'open-company-value',
      'open-loan-modal',
      'open-stock-market',
      'open-subsidiary-overview',
      'repay-loan',
      'select-stock',
      'sell-stock',
      'take-loan',
    ]);
  });

  it('owns quarter progression, operations, and report actions', () => {
    const controller = createTurnController({
      getState: () => null,
      uiState: {},
      renderGame: vi.fn(),
      updateMilestones: vi.fn(),
      closeModal: vi.fn(),
    });

    expect(Object.keys(controller.clickActions).sort()).toEqual([
      'advance-contract-guide',
      'advance-turn',
      'apply-angel-rescue',
      'close-delivery-popup',
      'confirm-advance-without-routes',
      'delivery-backdrop',
      'lock-angel-slot',
      'open-contract-from-panel',
      'open-operations-panel',
      'select-contract-option',
      'set-ops-tier',
      'show-delivery-popup',
      'show-newspaper',
      'show-report',
      'sign-contract',
      'start-angel-slot',
      'toggle-contract',
    ]);
  });

  it('owns map, fleet, branch, and route actions', () => {
    const controller = createNetworkController({
      getState: () => null,
      uiState: {},
      renderGame: vi.fn(),
      renderMapOnly: vi.fn(),
      setBottomHint: vi.fn(),
      scrollPanelToTop: vi.fn(),
      updateMilestones: vi.fn(),
      closeModal: vi.fn(),
    });

    expect(Object.keys(controller.clickActions).sort()).toEqual([
      'buy-plane',
      'cancel-branch-select',
      'change-route-plane',
      'city-click',
      'close-branch',
      'close-route',
      'confirm-branch',
      'confirm-close-branch',
      'confirm-close-route',
      'confirm-open-route',
      'confirm-price-adjust',
      'confirm-resume-route',
      'confirm-suspend-route',
      'focus-hq',
      'map-empty',
      'open-branch-modal',
      'open-buy-plane-modal',
      'open-fleet-panel',
      'open-route-change-plane',
      'open-route-detail',
      'open-route-from-warning',
      'open-route-list',
      'open-route-modal',
      'open-route-price-adjust',
      'return-lease',
      'return-route-list',
      'route-list-page',
      'route-list-page-size',
      'route-list-sort',
      'sell-plane',
      'set-adjust-price-preset',
      'set-map-zoom',
      'set-route-price-preset',
      'start-branch-select',
      'toggle-route-suspend',
    ]);
    expect(Object.keys(controller.inputActions).sort()).toEqual([
      'adjust-price-preview',
      'plane-purchase-quantity',
      'route-price-preview',
    ]);
  });
});
