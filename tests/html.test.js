import { describe, expect, it } from 'vitest';

import { escapeAttr, escapeHtml, renderHtml } from '../src/ui/html.js';

describe('HTML rendering boundary', () => {
  it('escapes text and attribute values', () => {
    expect(escapeHtml('<script>"x" & y</script>')).toBe('&lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;');
    expect(escapeAttr("'quoted'")).toBe('&#39;quoted&#39;');
  });

  it('owns DOM markup writes and handles absent targets', () => {
    const target = { innerHTML: '' };

    expect(renderHtml(target, '<strong>ready</strong>')).toBe(target);
    expect(target.innerHTML).toBe('<strong>ready</strong>');
    expect(renderHtml(target, null)).toBe(target);
    expect(target.innerHTML).toBe('');
    expect(renderHtml(null, '<b>ignored</b>')).toBeNull();
  });
});
