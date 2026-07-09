import { describe, expect, it, vi } from 'vitest';

import { createFinanceController } from '../src/app/financeController.js';

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
});
