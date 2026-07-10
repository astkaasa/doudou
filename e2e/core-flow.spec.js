import { expect, test as base } from '@playwright/test';

const test = base.extend({
  pageErrors: async ({ page }, use) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
    await use(errors);
    expect(errors).toEqual([]);
  },
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('new company completes its first operating quarter', async ({ page, pageErrors }, testInfo) => {
  await startCompany(page);
  await assertStableShell(page);
  if (testInfo.project.name === 'desktop') await assertMapZoomRerenders(page);

  await page.getByRole('button', { name: '开通航线' }).click();
  await selectCity(page, '北京', testInfo.project.name);
  await selectCity(page, '上海', testInfo.project.name);
  const createRouteDialog = page.getByRole('dialog', { name: '开通航线' });
  await expect(createRouteDialog).toBeVisible();
  await assertRouteCreationLayout(createRouteDialog, testInfo.project.name);
  await page.getByRole('button', { name: '确认开通' }).click();

  await expect(page.getByRole('button', { name: /北京 PEK → 上海 SHA/ })).toBeVisible();
  await expect(page.locator('#hud-routes')).toHaveText('1');
  await expect(page.locator('#turn-forecast')).toContainText('季度预估');
  await expect(page.locator('#turn-forecast')).toBeInViewport();
  await expect(page.getByRole('button', { name: /推进回合/ })).toHaveAttribute('title', /静态预估/);

  const routeListButton = page.getByRole('button', { name: '航线管理' });
  await routeListButton.click();
  const routeDialog = page.getByRole('dialog', { name: '航线管理' });
  await expect(routeDialog).toBeVisible();
  if (testInfo.project.name === 'desktop') {
    const routeTable = routeDialog.getByRole('table', { name: '航线经营数据' });
    const profitHeader = routeTable.getByRole('columnheader', { name: /收益/ });
    const profitSort = profitHeader.getByRole('button', { name: /收益/ });
    await expect(profitHeader).toHaveAttribute('aria-sort', 'descending');
    await profitSort.press('Enter');
    await expect(profitHeader).toHaveAttribute('aria-sort', 'ascending');
  } else {
    await expect(routeDialog.getByText('北京 PEK → 上海 SHA', { exact: true })).toBeVisible();
    await expect(routeDialog.getByRole('button', { name: '调价' })).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(routeListButton).toBeFocused();

  const fleetButton = page.getByRole('button', { name: '机队管理' });
  await fleetButton.click();
  const fleetDialog = page.getByRole('dialog', { name: '机队管理' });
  await expect(fleetDialog).toContainText('北京→上海');
  await page.keyboard.press('Escape');
  await expect(fleetButton).toBeFocused();

  const helpButton = page.getByRole('button', { name: '帮助与机制速查' });
  await helpButton.click();
  const helpDialog = page.getByRole('dialog', { name: '帮助' });
  await expect(helpDialog).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '关闭帮助' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('tab', { name: '引导回放' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(helpButton).toBeFocused();

  await page.getByRole('button', { name: /推进回合/ }).click();
  await expect(page.getByRole('dialog', { name: '环球航空报' })).toBeVisible();
  await expect(page.locator('#milestone-toast')).toBeHidden();
  await expect(page.getByText('其中机队与总部固定成本')).toBeVisible();
  await page.getByRole('button', { name: '知道了，继续经营' }).click();
  await expect(page.getByRole('button', { name: '📰 上季报纸' })).toBeVisible();
  await expect(page.getByRole('button', { name: '📊 上季财报' })).toBeVisible();
  await expect(page.locator('#hud-turn')).toHaveText('1960 Q2');

  await assertStableShell(page);
  expect(pageErrors, `${testInfo.project.name} browser errors`).toEqual([]);
});

test('multi-airport route keeps its alternate through save and load', async ({ page, pageErrors }, testInfo) => {
  await startCompany(page, { eraName: /2000-2020 全球时代/, headquarters: '伦敦' });
  await page.getByRole('button', { name: '开通航线' }).click();
  await selectCityFromPicker(page, '伦敦');
  await selectCityFromPicker(page, '巴黎');

  const createDialog = page.getByRole('dialog', { name: '开通航线' });
  await expect(createDialog).toBeVisible();
  const fromAirport = createDialog.getByLabel('起飞机场');
  const toAirport = createDialog.getByLabel('到达机场');
  await expect(fromAirport.locator('option')).toContainText(['LHR', 'LGW', 'LCY']);
  await expect(toAirport.locator('option')).toContainText(['CDG', 'ORY']);
  await selectAirportCode(fromAirport, 'LCY');
  await selectAirportCode(toAirport, 'ORY');
  await expect(createDialog.locator('#airport-performance-note')).toContainText('无需减载');
  await createDialog.getByRole('button', { name: '确认开通' }).click();

  await page.getByRole('button', { name: '航线管理' }).click();
  let routeDialog = page.getByRole('dialog', { name: '航线管理' });
  await expect(routeDialog).toContainText('伦敦 LCY');
  await expect(routeDialog).toContainText('巴黎 ORY');
  const alternateButton = testInfo.project.name === 'desktop'
    ? routeDialog.getByRole('button', { name: '备降与韧性' })
    : routeDialog.getByRole('button', { name: '备降', exact: true });
  await alternateButton.click();

  const alternateDialog = page.getByRole('dialog', { name: '备降与韧性计划' });
  await expect(alternateDialog).toBeVisible();
  await alternateDialog.getByRole('button', { name: /^LHR/ }).click();
  await expect(page.getByRole('dialog', { name: '备降与韧性计划' }).getByText('已设 LHR', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '返回航线管理' }).click();
  routeDialog = page.getByRole('dialog', { name: '航线管理' });
  await expect(routeDialog).toContainText('备降 LHR');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '机场经营' }).click();
  const airportDialog = page.getByRole('dialog', { name: '机场经营' });
  await expect(airportDialog).toContainText('航线开发机会');
  await expect(airportDialog).toContainText('机场资产与容量');
  await airportDialog.getByRole('button', { name: '关闭' }).click();

  await page.getByTitle('保存存档').click();
  await expect(page.getByRole('status')).toContainText('存档保存成功');
  await page.getByTitle('载入存档').click();
  await expect(page.getByRole('status')).toContainText('存档已载入');
  await expect(page.locator('#hud-routes')).toHaveText('1');

  await page.getByRole('button', { name: '航线管理' }).click();
  await expect(page.getByRole('dialog', { name: '航线管理' })).toContainText('备降 LHR');
  await assertStableShell(page);
  expect(pageErrors, `${testInfo.project.name} browser errors`).toEqual([]);
});

test('critical overlays own focus and restore the background', async ({ page, pageErrors }, testInfo) => {
  await page.goto('/');

  await page.evaluate(async () => {
    const { showDeliveryPopup } = await import('/src/ui/reportModals.js');
    showDeliveryPopup({ deliveredThisTurn: [{ name: '测试交付机', uid: 1 }] });
  });
  const deliveryDialog = page.getByRole('dialog', { name: '飞机交付通知' });
  await expect(deliveryDialog).toBeFocused();
  await expect(deliveryDialog).toContainText('测试交付机');
  await assertDialogFitsViewport(deliveryDialog, page);
  expect(await page.locator('#app').evaluate((element) => element.inert)).toBe(true);
  await deliveryDialog.getByRole('button', { name: '继续经营' }).click();
  await expect(deliveryDialog).toBeHidden();

  await page.evaluate(async () => {
    const { showAngelInvestment } = await import('/src/ui/angelInvestment.js');
    showAngelInvestment({ cash: -8 });
  });
  const angelDialog = page.getByRole('dialog', { name: '资金告急' });
  await expect(angelDialog).toBeFocused();
  expect(await page.locator('#app').evaluate((element) => element.inert)).toBe(true);
  await page.evaluate(async () => {
    const [{ clearAngelTimers }, { closeModalRoot }] = await Promise.all([
      import('/src/ui/angelInvestment.js'),
      import('/src/ui/modal.js'),
    ]);
    clearAngelTimers();
    closeModalRoot();
  });

  await page.evaluate(async () => {
    const { showMainQuestVictory } = await import('/src/ui/mainQuest.js');
    const dimension = { current: 1, target: 1, met: true };
    showMainQuestVictory({
      grade: 'A',
      turnsPlayed: 48,
      totalProfit: 500,
      dimensions: {
        cash: dimension,
        routes: dimension,
        branch: { ...dimension, type: 'networkRegion' },
        profit: dimension,
      },
    });
  });
  const victoryDialog = page.getByRole('dialog', { name: '苍穹之巅' });
  await expect(victoryDialog).toBeFocused();
  expect(await page.locator('#app').evaluate((element) => element.inert)).toBe(true);
  await victoryDialog.getByRole('button', { name: '继续经营' }).click();
  await expect(victoryDialog).toBeHidden();
  expect(await page.locator('#app').evaluate((element) => element.inert)).toBe(false);
  expect(pageErrors, `${testInfo.project.name} browser errors`).toEqual([]);
});

test('management workspaces fit the viewport and restore their triggers', async ({ page, pageErrors }, testInfo) => {
  await startCompany(page, { eraName: /2000-2020 全球时代/, headquarters: '伦敦' });
  const labels = ['购买飞机', '运营管理', '银行贷款', '分部管理', '投资管理', '机场经营'];

  for (const label of labels) {
    const trigger = page.getByRole('button', { name: label, exact: true }).first();
    await trigger.click();
    const dialog = page.locator('#modal-root [role="dialog"]').first();
    await expect(dialog).toBeFocused();
    await assertDialogFitsViewport(dialog, page);
    if (label === '购买飞机') {
      await expect(dialog.locator('.plane-maker-group[open]')).toHaveCount(1);
    }
    if (label === '运营管理') {
      await expect(dialog).toContainText('需求 -10%');
      await expect(dialog).toContainText('故障 ×0.4');
      await expect(dialog).toContainText('需求 +6%');
    }
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }

  const investmentTrigger = page.getByRole('button', { name: '投资管理', exact: true }).first();
  await investmentTrigger.click();
  await page.locator('[data-action="confirm-sub-open"]:not([disabled])').first().click();
  const executeInvestment = page.locator('[data-action="execute-sub-open"]');
  await expect(executeInvestment).toBeVisible();
  await executeInvestment.click();
  const investmentDialog = page.getByRole('dialog', { name: '投资管理' });
  await expect(investmentDialog).toBeVisible();
  await expect(investmentDialog).toContainText('子公司');
  await expect(page.locator('[data-action="execute-sub-open"]')).toHaveCount(0);
  await assertBannerOutsideDialog(investmentDialog, page);
  await page.keyboard.press('Escape');
  await expect(investmentTrigger).toBeFocused();

  const stockTrigger = page.getByRole('button', { name: /NASDOU/ });
  await stockTrigger.click();
  const stockDialog = page.getByRole('dialog', { name: 'NASDOU 证券市场' });
  await expect(stockDialog).toBeFocused();
  await assertDialogFitsViewport(stockDialog, page);
  await stockDialog.locator('.stock-row[data-stock-id="wuer_media"]').click();
  await stockDialog.locator('.stock-buy:not([disabled])').first().click();
  await expect(page.getByRole('dialog', { name: 'NASDOU 证券市场' })).toBeVisible();
  await assertBannerOutsideDialog(page.getByRole('dialog', { name: 'NASDOU 证券市场' }), page);
  await page.keyboard.press('Escape');
  await expect(stockTrigger).toBeFocused();
  expect(pageErrors, `${testInfo.project.name} browser errors`).toEqual([]);
});

test('dense long-game management surfaces routes, fleet renewal, and fixed risks', async ({ page, pageErrors }, testInfo) => {
  test.setTimeout(45_000);
  await page.goto('/');
  const fixture = await page.evaluate(async () => {
    const [{ createLongGameFixture }, { analyzeRouteDiagnostics }, { analyzeFleetPlan }, { saveGameState }, { showSaveMenu }] = await Promise.all([
      import('/src/simulation/longGame.js'),
      import('/src/domain/routeDiagnostics.js'),
      import('/src/domain/fleetPlanning.js'),
      import('/src/domain/save.js'),
      import('/src/ui/tutorial.js'),
    ]);
    const { state } = createLongGameFixture();
    state.onboardStep = 99;
    const fleetUids = new Set(state.fleet.filter((plane) => !plane.delivering).map((plane) => plane.uid));
    const candidates = state.routes.filter((route) => (
      !route.suspended
      && !route.isNew
      && (route.assignedPlanes || []).some((uid) => fleetUids.has(uid))
    ));
    Object.assign(candidates[0], { profit: -2.5, loadFactor: 0.72 });
    Object.assign(candidates[1], { profit: 1.2, loadFactor: 0.48 });
    Object.assign(candidates[2], { suspended: true, loadFactor: 0, revenue: 0, cost: 0, profit: 0 });
    const contractRoute = candidates[3];
    const contract = {
      id: 'airport-contract-9999',
      status: 'active',
      airportId: contractRoute.toAirportId,
      cityId: contractRoute.to,
      originCityId: contractRoute.from,
      offerPeriod: `${state.year}-Q${state.quarter}`,
      durationQuarters: 4,
      remainingQuarters: 1,
      requiredMetQuarters: 3,
      metQuarters: 2,
      missedQuarters: 1,
      minLoadFactor: 0.45,
      minServiceMultiplier: 1,
      upfrontSubsidy: 0,
      quarterlyGuarantee: 0.8,
      completionBonus: 1.5,
      landingDiscount: 0.2,
      routeUid: contractRoute.uid,
      acceptedTurn: state.turnsPlayed,
      resolvedTurn: null,
      lastQuarterMet: false,
    };
    state.airportContracts.push(contract);
    state.airportContractIdCounter = 10000;
    contractRoute.airportContractId = contract.id;
    const assignedPlaneUids = new Set(state.routes.flatMap((route) => route.assignedPlanes || []));
    const ownedDeparture = state.fleet.find((plane) => !plane.isLease && assignedPlaneUids.has(plane.uid));
    const leasedDeparture = state.fleet.find((plane) => plane.isLease && assignedPlaneUids.has(plane.uid));
    ownedDeparture.age = 24.75;
    leasedDeparture.leaseTurns = (leasedDeparture.maxLeaseTurns || 40) - 1;
    const deliveryTemplate = state.fleet.find((plane) => !plane.isLease);
    state.fleet.push({
      ...structuredClone(deliveryTemplate),
      uid: state.planeIdCounter++,
      age: 0,
      isLease: false,
      leasePrice: 0,
      leaseTurns: 0,
      maxLeaseTurns: 40,
      delivering: true,
      deliverIn: 1,
    });
    state.fleet.push({
      ...structuredClone(deliveryTemplate),
      uid: state.planeIdCounter++,
      age: 5,
      isLease: false,
      leasePrice: 0,
      leaseTurns: 0,
      maxLeaseTurns: 40,
      delivering: false,
      deliverIn: 0,
    });
    state.fleet.push({
      ...structuredClone(leasedDeparture),
      uid: state.planeIdCounter++,
      age: 5,
      isLease: true,
      leaseTurns: 5,
      maxLeaseTurns: 40,
      delivering: false,
      deliverIn: 0,
    });
    const routeAnalysis = analyzeRouteDiagnostics(state);
    const fleetPlan = analyzeFleetPlan(state);
    saveGameState(state);
    showSaveMenu();
    return { routeCounts: routeAnalysis.counts, fleetCounts: fleetPlan.counts, fleetSummary: fleetPlan.summary };
  });
  const counts = fixture.routeCounts;

  expect(counts.all).toBeGreaterThanOrEqual(60);
  expect(counts.attention).toBeGreaterThanOrEqual(3);
  expect(counts.loss).toBeGreaterThanOrEqual(1);
  expect(counts.lowLoad).toBeGreaterThanOrEqual(1);
  expect(counts.unassigned).toBeGreaterThanOrEqual(1);
  expect(counts.suspended).toBeGreaterThanOrEqual(1);
  expect(counts.contract).toBeGreaterThanOrEqual(1);

  await page.locator('.save-card').click();
  await page.getByRole('button', { name: '航线管理' }).click();
  const dialog = page.getByRole('dialog', { name: '航线管理' });
  await expect(dialog).toBeVisible();
  await assertDialogFitsViewport(dialog, page);
  await expect(dialog.locator('[data-route-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.locator('[data-route-filter="all"]')).toContainText(String(counts.all));
  await dialog.locator('[data-route-filter="attention"]').click();
  await expect(dialog.locator('[data-route-filter="attention"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.locator('[data-route-filter="attention"]')).toBeFocused();
  await expect(dialog.locator('.route-filter-result')).toHaveText(`${counts.attention} / ${counts.all} 条`);

  const expectedPageRows = Math.min(10, counts.attention);
  if (testInfo.project.name === 'desktop') {
    await expect(dialog.locator('.route-table tbody tr')).toHaveCount(expectedPageRows);
    await expect(dialog.locator('.route-table .route-diagnostic-badge').first()).toBeVisible();
  } else {
    await expect(dialog.locator('.route-card')).toHaveCount(expectedPageRows);
    await expect(dialog.locator('.route-card .route-diagnostic-badge').first()).toBeVisible();
    await expect(dialog.locator('.route-card', { hasText: '无飞机' }).first()).toContainText('待配机');
  }
  const filterGeometry = await dialog.evaluate((element) => {
    const toolbar = element.querySelector('.route-filter-toolbar').getBoundingClientRect();
    const contentElement = [...element.querySelectorAll('.route-table-wrap, .route-card-list')]
      .find((candidate) => getComputedStyle(candidate).display !== 'none');
    const content = contentElement.getBoundingClientRect();
    return {
      toolbarBottom: toolbar.bottom,
      contentTop: content.top,
      horizontalOverflow: element.scrollWidth - element.clientWidth,
    };
  });
  expect(filterGeometry.toolbarBottom).toBeLessThanOrEqual(filterGeometry.contentTop + 1);
  expect(filterGeometry.horizontalOverflow).toBeLessThanOrEqual(1);

  if (process.env.ROUTE_VISUAL_QA === '1') {
    await dialog.screenshot({ path: `/tmp/doudou-route-diagnostics-${testInfo.project.name}.png` });
  }

  await page.keyboard.press('Escape');
  const forecastButton = page.locator('#turn-forecast');
  await expect(forecastButton).toBeVisible();
  await expect(forecastButton).toContainText(/季度预估/);
  await forecastButton.click();
  const previewDialog = page.getByRole('dialog', { name: '下一季度预览' });
  await expect(previewDialog).toBeVisible();
  await assertDialogFitsViewport(previewDialog, page);
  await expect(previewDialog).toContainText('已知变动');
  await expect(previewDialog).toContainText('固定期限');
  await expect(previewDialog.locator('.turn-preview-item.risk')).toHaveCount(2);
  await expect(previewDialog.getByRole('button', { name: '查看机队计划' })).toBeVisible();
  if (process.env.ROUTE_VISUAL_QA === '1') {
    await previewDialog.screenshot({ path: `/tmp/doudou-turn-preview-${testInfo.project.name}.png` });
  }

  await previewDialog.getByRole('button', { name: '查看机队计划' }).click();
  const fleetDialog = page.getByRole('dialog', { name: '机队管理' });
  await expect(fleetDialog).toBeVisible();
  await assertDialogFitsViewport(fleetDialog, page);
  await expect(fleetDialog).toContainText(`下季离场${fixture.fleetSummary.dueNextQuarter} 架`);
  await expect(fleetDialog.locator('[data-fleet-filter="all"]')).toContainText(String(fixture.fleetCounts.all));
  await fleetDialog.locator('[data-fleet-filter="renewal"]').click();
  await expect(fleetDialog.locator('[data-fleet-filter="renewal"]')).toBeFocused();
  await expect(fleetDialog.locator('.fleet-filter-result')).toHaveText(`${fixture.fleetCounts.renewal} / ${fixture.fleetCounts.all} 架`);
  await expect(fleetDialog.locator('.fleet-item')).toHaveCount(Math.min(20, fixture.fleetCounts.renewal));
  await expect(fleetDialog.locator('.fleet-lifecycle-warning').first()).toBeVisible();
  if (process.env.ROUTE_VISUAL_QA === '1') {
    await fleetDialog.screenshot({ path: `/tmp/doudou-fleet-plan-${testInfo.project.name}.png` });
  }

  await fleetDialog.locator('[data-fleet-filter="idle"]').click();
  await expect(fleetDialog.locator('.fleet-item')).toHaveCount(2);
  const idleSelections = fleetDialog.locator('[data-action="fleet-batch-selection"]');
  await idleSelections.nth(0).check();
  await idleSelections.nth(1).check();
  await expect(fleetDialog.locator('#fleet-batch-count')).toHaveText('2');
  await fleetDialog.getByRole('button', { name: '处置所选' }).click();
  const disposalDialog = page.getByRole('dialog', { name: '批量处置确认' });
  await expect(disposalDialog).toBeVisible();
  await assertDialogFitsViewport(disposalDialog, page);
  await expect(disposalDialog).toContainText('航线影响0 条');
  await expect(disposalDialog).toContainText('出售收入');
  await expect(disposalDialog).toContainText('季度节省');
  if (process.env.ROUTE_VISUAL_QA === '1') {
    await disposalDialog.screenshot({ path: `/tmp/doudou-fleet-disposal-${testInfo.project.name}.png` });
  }
  await disposalDialog.getByRole('button', { name: '确认处置 2 架' }).click();
  await expect(page.getByRole('dialog', { name: '机队管理' }).locator('[data-fleet-filter="all"]')).toContainText(String(fixture.fleetCounts.all - 2));
  await expect(page.locator('#event-banner')).toContainText('已处置 2 架空闲飞机');
  expect(pageErrors, `${testInfo.project.name} browser errors`).toEqual([]);
});

test('angel rescue returns to a rereadable quarter report', async ({ page, pageErrors }, testInfo) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const [{ initState }, { saveGameState }] = await Promise.all([
      import('/src/domain/state.js'),
      import('/src/domain/save.js'),
    ]);
    const state = initState('beijing', 'era3', { seed: 'angel-report-e2e' });
    state.companyName = '救助流程测试';
    state.cash = -100;
    state.loan = 5000;
    state.fleet = [];
    state.routes = [];
    state.portfolio = {};
    state.subsidiaries = {};
    state.playerTrait = '豆';
    state.traitChosen = true;
    state.onboardStep = 99;
    saveGameState(state);
    const { showSaveMenu } = await import('/src/ui/tutorial.js');
    showSaveMenu();
  });
  await page.locator('.save-card').click();
  await page.getByRole('button', { name: /推进回合/ }).click();
  await page.getByRole('button', { name: '仍然推进' }).click();

  await expect(page.getByRole('dialog', { name: '资金告急' })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始抽取' })).toBeVisible({ timeout: 4_000 });
  await page.getByRole('button', { name: '开始抽取' }).click();
  await page.getByRole('button', { name: '锁定金额' }).click();
  const rescueButton = page.getByRole('button', { name: '重振旗鼓' });
  await expect(rescueButton).toBeVisible({ timeout: 12_000 });
  await rescueButton.click();

  const summary = page.getByRole('dialog', { name: '环球航空报' });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('天使救助');
  await expect(summary).toContainText('辣豆基金注资');
  await summary.getByRole('button', { name: '知道了，继续经营' }).click();
  await page.getByRole('button', { name: '📊 上季财报' }).click();
  await expect(page.getByRole('dialog', { name: /上季财报/ })).toContainText('天使救助');
  expect(pageErrors, `${testInfo.project.name} browser errors`).toEqual([]);
});

async function startCompany(page, options = {}) {
  const eraName = options.eraName || /1960-1980 喷气时代/;
  const headquarters = options.headquarters || '北京';
  await page.goto('/');
  await page.getByRole('button', { name: /开始游戏/ }).click();
  await page.getByRole('button', { name: eraName }).click();
  await page.getByRole('radio', { name: '关闭引导' }).check();
  await page.getByRole('button', { name: '选择总部' }).click();
  await page.getByRole('button', { name: new RegExp(`^${headquarters} ★`) }).first().click();
  await page.getByRole('button', { name: '确认起飞！' }).click();
  await page.getByRole('button', { name: '打开神秘信件' }).click({ force: true });
  await page.getByRole('button', { name: '选择第 1 粒金豆' }).click();
  await page.getByRole('button', { name: /轰~隆隆/ }).click();
  await expect(page.getByRole('button', { name: '开通航线' })).toBeVisible();
  await expect(page.getByRole('button', { name: '机场经营' })).toBeInViewport();
}

async function selectAirportCode(select, code) {
  const value = await select.locator('option', { hasText: code }).first().getAttribute('value');
  expect(value).not.toBeNull();
  await select.selectOption(value);
}

async function selectCityFromPicker(page, cityName) {
  const target = page.locator('.city-picker-btn', { hasText: cityName }).first();
  await expect(target).toBeVisible();
  await target.click();
}

async function selectCity(page, cityName, projectName) {
  const target = page.getByRole('button', { name: `选择${cityName}`, exact: true });
  if (projectName !== 'mobile') {
    await target.click();
    return;
  }
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function assertMapZoomRerenders(page) {
  const map = page.locator('#map-svg');
  const initialViewBox = await map.getAttribute('viewBox');
  await page.locator('#zoom15').click();
  await expect(page.locator('#zoom15')).toHaveClass(/active/);
  await expect(map).not.toHaveAttribute('viewBox', initialViewBox);
  await page.locator('#zoom1').click();
  await expect(page.locator('#zoom1')).toHaveClass(/active/);
}

async function assertStableShell(page) {
  await expect(page.locator('#map-svg')).toBeVisible();
  expect(await page.locator('#map-svg path').count()).toBeGreaterThanOrEqual(9);
  const geometry = await page.evaluate(() => {
    const bottom = document.querySelector('#bottom').getBoundingClientRect();
    const map = document.querySelector('#map-container').getBoundingClientRect();
    return {
      bottomInsideViewport: bottom.left >= -1 && bottom.right <= innerWidth + 1 && bottom.bottom <= innerHeight + 1,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mapArea: map.width * map.height,
    };
  });
  expect(geometry.bottomInsideViewport).toBe(true);
  expect(geometry.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(geometry.mapArea).toBeGreaterThan(40_000);
}

async function assertDialogFitsViewport(dialog, page) {
  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      horizontalOverflow: element.scrollWidth - element.clientWidth,
    };
  });
  const viewport = page.viewportSize();
  expect(geometry.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.top).toBeGreaterThanOrEqual(-1);
  expect(geometry.right).toBeLessThanOrEqual(viewport.width + 1);
  expect(geometry.bottom).toBeLessThanOrEqual(viewport.height + 1);
  expect(geometry.horizontalOverflow).toBeLessThanOrEqual(1);
}

async function assertRouteCreationLayout(dialog, projectName) {
  const geometry = await dialog.evaluate((element) => {
    const body = element.querySelector('.route-modal-body');
    const actions = element.querySelector(':scope > .modal-actions');
    const cards = [...element.querySelectorAll('.route-market-strip .market-card')];
    return {
      bodyBottom: body?.getBoundingClientRect().bottom,
      bodyScrollHeight: body?.scrollHeight,
      bodyClientHeight: body?.clientHeight,
      actionsTop: actions?.getBoundingClientRect().top,
      cardTops: cards.map((card) => card.getBoundingClientRect().top),
    };
  });
  expect(geometry.bodyBottom).toBeLessThanOrEqual(geometry.actionsTop + 1);
  expect(geometry.bodyScrollHeight).toBeGreaterThan(geometry.bodyClientHeight);
  if (projectName === 'mobile') {
    expect(geometry.cardTops).toHaveLength(2);
    expect(Math.abs(geometry.cardTops[0] - geometry.cardTops[1])).toBeLessThanOrEqual(1);
  }
}

async function assertBannerOutsideDialog(dialog, page) {
  const banner = page.locator('#event-banner');
  await expect(banner).toBeVisible();
  const [dialogRect, bannerRect] = await Promise.all([
    dialog.evaluate((element) => element.getBoundingClientRect().toJSON()),
    banner.evaluate((element) => element.getBoundingClientRect().toJSON()),
  ]);
  expect(bannerRect.top).toBeGreaterThanOrEqual(dialogRect.bottom - 1);
}
