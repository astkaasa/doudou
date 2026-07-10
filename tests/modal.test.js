import { afterEach, describe, expect, it, vi } from 'vitest';

import { BANNER_TONES, hideBanner, showBanner, trapModalFocus } from '../src/ui/modal.js';

const originalDocument = globalThis.document;

afterEach(() => {
  if (vi.isFakeTimers()) vi.runOnlyPendingTimers();
  vi.useRealTimers();
  globalThis.document = originalDocument;
});

describe('modal focus management', () => {
  it('wraps focus at both ends of a dialog', () => {
    const first = createFocusable();
    const last = createFocusable();
    const dialog = {
      contains: (element) => element === first || element === last,
      focus: vi.fn(),
      querySelectorAll: () => [first, last],
    };
    const root = { querySelector: () => dialog };
    const documentStub = {
      activeElement: last,
      getElementById: (id) => (id === 'modal-root' ? root : null),
    };
    globalThis.document = documentStub;
    const forward = { key: 'Tab', preventDefault: vi.fn(), shiftKey: false };

    expect(trapModalFocus(forward)).toBe(true);
    expect(forward.preventDefault).toHaveBeenCalledOnce();
    expect(first.focus).toHaveBeenCalledWith({ preventScroll: true });

    documentStub.activeElement = first;
    const backward = { key: 'Tab', preventDefault: vi.fn(), shiftKey: true };
    expect(trapModalFocus(backward)).toBe(true);
    expect(backward.preventDefault).toHaveBeenCalledOnce();
    expect(last.focus).toHaveBeenCalledWith({ preventScroll: true });
  });
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

  it('dismisses an active banner and cancels its stale timer', () => {
    vi.useFakeTimers();
    const banner = createBanner();
    globalThis.document = documentWithBanner(banner);

    showBanner('即将打开弹窗', BANNER_TONES.info);
    hideBanner();

    expect(banner.hidden).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(banner.hidden).toBe(true);
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

function createFocusable() {
  return {
    closest: () => null,
    disabled: false,
    focus: vi.fn(),
    hidden: false,
  };
}
