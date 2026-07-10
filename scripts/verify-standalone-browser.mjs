import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standaloneUrl = pathToFileURL(path.join(rootDir, 'dist', 'standalone.html')).href;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 720 },
  });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('requestfailed', (request) => {
    errors.push(`request: ${request.url()} · ${request.failure()?.errorText || 'failed'}`);
  });

  await page.goto(standaloneUrl);
  await page.getByRole('button', { name: /开始游戏/ }).click();
  await page.getByRole('radio', { name: '新手引导' }).waitFor();

  const unresolvedAssets = await page.locator('script[src],link[rel="stylesheet"][href],img[src]:not([src^="data:"])').count();
  if (unresolvedAssets !== 0) throw new Error(`Standalone rendered ${unresolvedAssets} unresolved external asset element(s)`);
  if (errors.length) throw new Error(`Standalone browser errors:\n${errors.join('\n')}`);

  console.log('standalone browser smoke: passed');
} finally {
  await browser.close();
}
