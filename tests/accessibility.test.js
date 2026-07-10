import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('static accessibility contracts', () => {
  it('gives every static button an explicit type', () => {
    const html = read('index.html');
    expect(html.match(/<button(?![^>]*\btype=)/g) || []).toEqual([]);
  });

  it('gives every rendered template button an explicit type', () => {
    listJavaScriptFiles(path.join(ROOT, 'src')).forEach((file) => {
      const relative = path.relative(ROOT, file);
      expect(read(relative).match(/<button(?![^>]*\btype=)/g) || [], relative).toEqual([]);
    });
  });

  it('keeps static actions on native controls', () => {
    const html = read('index.html');
    expect(html.match(/<(?:div|span)[^>]*\bdata-action=/g) || []).toEqual([]);
  });

  it('labels global icon-only controls', () => {
    const html = read('index.html');
    ['focus-hq-btn', 'settings-btn', 'help-btn'].forEach((id) => {
      expect(html, id).toMatch(new RegExp(`<button[^>]*id="${id}"[^>]*aria-label="[^"]+"`));
    });
  });
});

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function listJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listJavaScriptFiles(fullPath) : entry.name.endsWith('.js') ? [fullPath] : [];
  });
}
