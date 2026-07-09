import { describe, expect, it, vi } from 'vitest';

import { createFinanceController } from '../src/app/financeController.js';
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
});
