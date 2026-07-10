import { afterEach, describe, expect, it, vi } from 'vitest';

import { BANNER_TONES, showBanner } from '../src/ui/modal.js';

const originalDocument = globalThis.document;

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  globalThis.document = originalDocument;
});

describe('event banner', () => {
  it('renders validated semantic tones and hides after three seconds', () => {
    vi.useFakeTimers();
    const banner = createBanner();
    globalThis.document = documentWithBanner(banner);

    showBanner('保存成功', BANNER_TONES.success);

    expect(banner.textContent).toBe('保存成功');
    expect(banner.className).toBe('event-banner event-banner-success');
    expect(banner.hidden).toBe(false);

    vi.advanceTimersByTime(3000);
    expect(banner.hidden).toBe(true);
  });

  it('keeps a newer banner visible for its full duration', () => {
    vi.useFakeTimers();
    const banner = createBanner();
    globalThis.document = documentWithBanner(banner);

    showBanner('第一条', BANNER_TONES.info);
    vi.advanceTimersByTime(2000);
    showBanner('第二条', BANNER_TONES.warning);
    vi.advanceTimersByTime(1000);

    expect(banner.textContent).toBe('第二条');
    expect(banner.hidden).toBe(false);

    vi.advanceTimersByTime(2000);
    expect(banner.hidden).toBe(true);
  });

  it('falls back to the info tone for unknown values', () => {
    vi.useFakeTimers();
    const banner = createBanner();
    globalThis.document = documentWithBanner(banner);

    showBanner('普通消息', 'not-a-tone');

    expect(banner.className).toBe('event-banner event-banner-info');
    vi.advanceTimersByTime(3000);
  });
});

function createBanner() {
  return { className: '', hidden: true, textContent: '' };
}

function documentWithBanner(banner) {
  return {
    getElementById: (id) => (id === 'event-banner' ? banner : null),
  };
}
