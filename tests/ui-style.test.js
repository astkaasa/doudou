import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const INLINE_STYLE_BUDGET = {
  'src/app/networkController.js': 2,
  'src/app/settingsController.js': 3,
  'src/ui/branches.js': 4,
  'src/ui/branchModals.js': 28,
  'src/ui/financeModals.js': 24,
  'src/ui/fleetModals.js': 8,
  'src/ui/hud.js': 1,
  'src/ui/mainQuest.js': 7,
  'src/ui/map.js': 18,
  'src/ui/market.js': 1,
  'src/ui/milestones.js': 2,
  'src/ui/modal.js': 2,
  'src/ui/operations.js': 2,
  'src/ui/panel.js': 9,
  'src/ui/reportModals.js': 41,
  'src/ui/routeModals.js': 74,
  'src/ui/season.js': 1,
  'src/ui/stockModals.js': 2,
  'src/ui/subsidiaryModals.js': 4,
  'src/ui/traits.js': 9,
  'src/ui/tutorial.js': 6,
  'src/ui/versionLog.js': 3,
};

describe('UI style ownership', () => {
  it('keeps static HTML free of inline styles', () => {
    expect(countInlineStyles('index.html')).toBe(0);
  });

  it('does not increase the per-module inline-style debt budget', () => {
    const files = listJavaScriptFiles(path.join(ROOT, 'src'));
    files.forEach((file) => {
      const relative = path.relative(ROOT, file);
      expect(countInlineStyles(relative), relative).toBeLessThanOrEqual(INLINE_STYLE_BUDGET[relative] || 0);
    });
  });
});

function countInlineStyles(relativePath) {
  return (fs.readFileSync(path.join(ROOT, relativePath), 'utf8').match(/style="/g) || []).length;
}

function listJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listJavaScriptFiles(fullPath) : entry.name.endsWith('.js') ? [fullPath] : [];
  });
}
