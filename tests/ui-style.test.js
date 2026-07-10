import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const INLINE_STYLE_BUDGET = {
  'src/ui/map.js': 1,
};
const STYLE_MUTATION_BUDGET = {
  'src/app/sessionController.js': 1,
  'src/ui/angelInvestment.js': 2,
  'src/ui/map.js': 16,
  'src/ui/modal.js': 3,
  'src/ui/onboarding.js': 10,
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

  it('does not increase direct DOM style mutation debt', () => {
    const files = listJavaScriptFiles(path.join(ROOT, 'src'));
    files.forEach((file) => {
      const relative = path.relative(ROOT, file);
      expect(countStyleMutations(relative), relative).toBeLessThanOrEqual(STYLE_MUTATION_BUDGET[relative] || 0);
    });
  });
});

function countInlineStyles(relativePath) {
  return (fs.readFileSync(path.join(ROOT, relativePath), 'utf8').match(/\sstyle="/g) || []).length;
}

function countStyleMutations(relativePath) {
  return (fs.readFileSync(path.join(ROOT, relativePath), 'utf8').match(/\.style\./g) || []).length;
}

function listJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listJavaScriptFiles(fullPath) : entry.name.endsWith('.js') ? [fullPath] : [];
  });
}
