import { byId } from '../domain/helpers.js';
import { renderHtml } from './html.js';

const MODAL_BACKGROUND_IDS = ['app', 'contract-zone', 'delivery-root', 'onboard-hint', 'tutorial'];
const VALID_BANNER_TONES = new Set(['accent', 'danger', 'info', 'success', 'warning']);

export const BANNER_TONES = Object.freeze({
  accent: 'accent',
  danger: 'danger',
  info: 'info',
  success: 'success',
  warning: 'warning',
});

let modalReturnFocus = null;
let modalBackgroundState = [];
let bannerHideTimer = null;

export function showModal(html, options = {}) {
  const widthClass = options.wide ? ' modal-wide' : '';
  renderModalRoot(`<div class="modal-overlay" data-action="modal-backdrop"><div class="modal modal-relative${widthClass}" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`);
}

export function showRouteModal(html) {
  renderModalRoot(`<div class="modal-overlay route-overlay" data-action="modal-backdrop"><div class="modal route-modal modal-relative" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`);
}

export function renderModalRoot(html) {
  const root = byId('modal-root');
  if (!root) return;
  if (!root.hasChildNodes()) modalReturnFocus = document.activeElement;
  renderHtml(root, html);
  lockModalBackground();
  const dialog = root.querySelector('[role="dialog"], .modal, .turn-summary, .newspaper');
  if (!dialog) return;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('tabindex', '-1');
  const heading = dialog.querySelector('h1, h2');
  if (heading) {
    if (!heading.id) heading.id = 'modal-title';
    dialog.setAttribute('aria-labelledby', heading.id);
  }
  queueMicrotask(() => {
    if (!dialog.isConnected) return;
    dialog.focus({ preventScroll: true });
  });
}

export function closeModalRoot() {
  const root = byId('modal-root');
  renderHtml(root, '');
  unlockModalBackground();
  const returnTarget = modalReturnFocus;
  modalReturnFocus = null;
  queueMicrotask(() => {
    if (returnTarget?.isConnected && !returnTarget.inert) returnTarget.focus({ preventScroll: true });
  });
}

export function showBanner(text, tone = BANNER_TONES.info) {
  const b = byId('event-banner');
  if (!b) return;
  const normalizedTone = VALID_BANNER_TONES.has(tone) ? tone : BANNER_TONES.info;
  b.textContent = text;
  b.className = `event-banner event-banner-${normalizedTone}`;
  b.hidden = false;
  if (bannerHideTimer) clearTimeout(bannerHideTimer);
  bannerHideTimer = setTimeout(() => {
    b.hidden = true;
    bannerHideTimer = null;
  }, 3000);
}

function lockModalBackground() {
  if (modalBackgroundState.length > 0) return;
  modalBackgroundState = MODAL_BACKGROUND_IDS
    .map((id) => byId(id))
    .filter(Boolean)
    .map((element) => ({
      element,
      inert: Boolean(element.inert),
      ariaHidden: element.getAttribute('aria-hidden'),
    }));
  modalBackgroundState.forEach(({ element }) => {
    element.inert = true;
    element.setAttribute('aria-hidden', 'true');
  });
  document.body.classList.add('modal-open');
}

function unlockModalBackground() {
  modalBackgroundState.forEach(({ element, inert, ariaHidden }) => {
    element.inert = inert;
    if (ariaHidden === null) element.removeAttribute('aria-hidden');
    else element.setAttribute('aria-hidden', ariaHidden);
  });
  modalBackgroundState = [];
  document.body.classList.remove('modal-open');
}
