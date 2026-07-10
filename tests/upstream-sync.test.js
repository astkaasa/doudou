import { describe, expect, it } from 'vitest';

import {
  discoverResourceReferences,
  extractCssReferences,
  extractJavaScriptReferences,
  snapshotPathForUrl,
} from '../scripts/lib/upstream-resources.mjs';

describe('upstream resource discovery', () => {
  it('discovers HTML assets, srcsets, inline resources, and import maps', () => {
    const result = discoverResourceReferences({
      url: 'https://example.com/game/index.html',
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><base href="./v2/"><base href="/ignored-base/">
        <link rel="stylesheet" href="css/main.css"><link rel="canonical" href="ignored.html">
        <img src="hero.png" srcset="hero@2x.png 2x, data:image/png;base64,AAAA 3x">
        <link rel="preload" as="image" imagesrcset="wide.webp 1200w, narrow.webp 600w">
        <style>.logo{background:url('../logo.svg')}</style>
        <script type="module">import './boot.js'; fetch('./news.json')</script>
        <script type="importmap">{"imports":{"app":"./app.js"}}</script>`,
    });

    expect(result.references).toEqual(expect.arrayContaining([
      'https://example.com/game/v2/css/main.css',
      'https://example.com/game/v2/hero.png',
      'https://example.com/game/v2/hero@2x.png',
      'https://example.com/game/v2/wide.webp',
      'https://example.com/game/v2/narrow.webp',
      'https://example.com/game/logo.svg',
      'https://example.com/game/v2/boot.js',
      'https://example.com/game/v2/news.json',
      'https://example.com/game/v2/app.js',
    ]));
    expect(result.references).not.toContain('https://example.com/game/v2/ignored.html');
  });

  it('extracts CSS imports and URLs without comments or data URLs', () => {
    expect(extractCssReferences(`
      @import "theme.css";
      .hero { background: url('./hero.webp'); }
      /* url('ignored.png') */
      .icon { background: url(data:image/png;base64,AAAA); }
    `)).toEqual(['theme.css', './hero.webp', 'data:image/png;base64,AAAA']);
  });

  it('uses a JavaScript AST for imports and static request APIs', () => {
    const result = extractJavaScriptReferences(`
      import './main.css';
      export { value } from './data.js';
      const worker = new Worker(new URL('./worker.js', import.meta.url));
      fetch('./news.json');
      navigator.serviceWorker.register('./sw.js');
      image.src = './hero.png';
      const ignored = "fetch('./not-a-request.json')";
    `);

    expect(result.warnings).toEqual([]);
    expect(result.references).toEqual(expect.arrayContaining([
      './main.css',
      './data.js',
      './worker.js',
      './news.json',
      './sw.js',
      './hero.png',
    ]));
    expect(result.references).not.toContain('./not-a-request.json');
  });

  it('maps in-scope, outside-base, and query resources safely', () => {
    const entry = 'https://example.com/game/';
    expect(snapshotPathForUrl('https://example.com/game/', entry)).toBe('index.html');
    expect(snapshotPathForUrl('https://example.com/game/js/app.js', entry)).toBe('js/app.js');
    expect(snapshotPathForUrl('https://example.com/shared/logo.svg', entry)).toBe('_origin/shared/logo.svg');
    expect(snapshotPathForUrl('https://example.com/game/data.json?v=2', entry)).toMatch(/^data\.query-[a-f0-9]{12}\.json$/);
  });
});
