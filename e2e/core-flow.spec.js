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
  await expect(page.getByRole('dialog', { name: '开通航线' })).toBeVisible();
  await page.getByRole('button', { name: '确认开通' }).click();

  await expect(page.getByRole('button', { name: /北京 PEK → 上海 SHA/ })).toBeVisible();
  await expect(page.locator('#hud-routes')).toHaveText('1');

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
