import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createFinanceController } from '../src/app/financeController.js';
import { createNetworkController } from '../src/app/networkController.js';
import { createSessionController } from '../src/app/sessionController.js';
import { createSettingsController, loadAppSettings } from '../src/app/settingsController.js';
import { createTurnController } from '../src/app/turnController.js';

const ROOT = path.resolve(import.meta.dirname, '..');

function createMemoryStorage(initialValue = null) {
  const values = new Map(initialValue === null ? [] : [['doudou.appSettings', initialValue]]);
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
  };
}

describe('application controllers', () => {
  it('owns the complete finance and investment action surface', () => {
    const controller = createFinanceController({
      getState: () => null,
      uiState: {},
      renderGame: vi.fn(),
      updateMilestones: vi.fn(),
    });

    expect(Object.keys(controller.clickActions).sort()).toEqual([
      'accept-airport-contract',
      'buy-stock',
      'confirm-loan',
      'confirm-sub-open',
      'confirm-sub-sell',
      'execute-sub-open',
      'execute-sub-sell',
      'open-airport-program',
      'open-company-value',
      'open-loan-modal',
      'open-stock-market',
      'open-subsidiary-overview',
      'repay-loan',
      'select-stock',
      'sell-stock',
      'take-loan',
      'upgrade-airport-investment',
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
      'continue-era-sandbox',
      'lock-angel-slot',
      'open-contract-from-panel',
      'open-era-settlement',
      'open-operations-panel',
      'resolve-airport-relocation',
      'retire-era',
      'select-contract-option',
      'set-ops-tier',
      'show-delivery-popup',
      'show-main-quest-victory',
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
      'open-route-alternate',
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
      'set-route-alternate',
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

  it('owns setup, session, modal, and onboarding actions', () => {
    const controller = createSessionController({
      getState: () => null,
      setState: vi.fn(),
      uiState: {},
      renderGame: vi.fn(),
      renderMapOnly: vi.fn(),
      setBottomHint: vi.fn(),
      scrollPanelToTop: vi.fn(),
      cancelBranchSelect: vi.fn(),
    });

    expect(Object.keys(controller.clickActions).sort()).toEqual([
      'acknowledge-onboarding',
      'cancel-hq-select',
      'close-ftp-card',
      'close-modal',
      'confirm-hq-start',
      'confirm-trait',
      'continue-victory-game',
      'dismiss-onboarding',
      'end-victory-game',
      'load-game',
      'modal-backdrop',
      'noop',
      'open-main-quest',
      'open-milestones',
      'open-trait-coins',
      'reload-page',
      'reset-onboarding',
      'save-game',
      'select-era',
      'select-trait-coin',
      'show-credits-menu',
      'show-era-menu',
      'show-main-menu',
      'show-onboarding-help',
      'show-save-menu',
      'show-version-log',
      'switch-help-tab',
      'tutorial-next-step',
    ]);
    expect(Object.keys(controller.inputActions)).toEqual(['company-name-input']);
  });

  it('owns settings actions and normalizes persisted preferences', () => {
    const storage = createMemoryStorage();
    const controller = createSettingsController({
      settings: { showBoundaries: true, mapStyle: 'classic' },
      uiState: {},
      renderMapOnly: vi.fn(),
    }, storage);

    expect(Object.keys(controller.clickActions).sort()).toEqual([
      'set-map-style',
      'show-settings',
      'toggle-map-boundaries',
    ]);
    expect(loadAppSettings(createMemoryStorage('{bad json'))).toEqual({
      showBoundaries: true,
      mapStyle: 'classic',
    });
    expect(loadAppSettings(createMemoryStorage('{"showBoundaries":false,"mapStyle":"terrain"}'))).toEqual({
      showBoundaries: false,
      mapStyle: 'terrain',
    });
  });

  it('does not register an action in more than one controller', () => {
    const app = {
      getState: () => null,
      setState: vi.fn(),
      uiState: {},
      renderGame: vi.fn(),
      renderMapOnly: vi.fn(),
      setBottomHint: vi.fn(),
      scrollPanelToTop: vi.fn(),
      updateMilestones: vi.fn(),
      closeModal: vi.fn(),
      cancelBranchSelect: vi.fn(),
    };
    const controllers = [
      createSessionController(app),
      createSettingsController({ ...app, settings: {} }, createMemoryStorage()),
      createFinanceController(app),
      createTurnController(app),
      createNetworkController(app),
    ];
    const actions = controllers.flatMap((controller) => Object.keys(controller.clickActions));

    expect(new Set(actions).size).toBe(actions.length);
  });

  it('handles every literal action rendered by source templates', () => {
    const app = {
      getState: () => null,
      setState: vi.fn(),
      uiState: {},
      renderGame: vi.fn(),
      renderMapOnly: vi.fn(),
      setBottomHint: vi.fn(),
      scrollPanelToTop: vi.fn(),
      updateMilestones: vi.fn(),
      closeModal: vi.fn(),
      cancelBranchSelect: vi.fn(),
    };
    const controllers = [
      createSessionController(app),
      createSettingsController({ ...app, settings: {} }, createMemoryStorage()),
      createFinanceController(app),
      createTurnController(app),
      createNetworkController(app),
    ];
    const handled = new Set(controllers.flatMap((controller) => [
      ...Object.keys(controller.clickActions || {}),
      ...Object.keys(controller.inputActions || {}),
    ]));
    const sourceFiles = [path.join(ROOT, 'index.html'), ...listSourceFiles(path.join(ROOT, 'src'))];
    const renderedActions = new Set(sourceFiles.flatMap((file) => [
      ...fs.readFileSync(file, 'utf8').matchAll(/data-action=["']([a-z0-9-]+)["']/g),
    ].map((match) => match[1])));

    expect([...renderedActions].filter((action) => !handled.has(action)).sort()).toEqual([]);
  });
});

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}
