import { byId } from '../domain/helpers.js';

export function showModal(html, options = {}) {
  const widthStyle = options.wide ? 'position:relative;max-width:960px;width:min(960px,95vw)' : 'position:relative';
  byId('modal-root').innerHTML = `<div class="modal-overlay" data-action="modal-backdrop"><div class="modal" style="${widthStyle}">${html}</div></div>`;
}

export function showRouteModal(html) {
  byId('modal-root').innerHTML = `<div class="modal-overlay route-overlay" data-action="modal-backdrop"><div class="modal route-modal" style="position:relative">${html}</div></div>`;
}

export function closeModalRoot() {
  byId('modal-root').innerHTML = '';
}

export function showBanner(text, color) {
  const b = byId('event-banner');
  b.textContent = text;
  b.style.background = color || '#2563eb';
  b.style.display = 'block';
  setTimeout(() => {
    b.style.display = 'none';
  }, 3000);
}
