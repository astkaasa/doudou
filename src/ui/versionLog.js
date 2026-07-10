import { VERSION_LOG } from '../data/version.js';
import { escapeHtml } from './html.js';
import { renderModalRoot } from './modal.js';

const VERSION_SECTIONS = [
  ['new', '新功能'],
  ['balance', '平衡调整'],
  ['fix', '修复'],
  ['ui', '界面'],
];

export function showVersionLog() {
  const current = VERSION_LOG[0];
  if (!current) return;

  const body = VERSION_LOG.map(renderVersionEntry).join('');
  renderModalRoot(`<div class="modal-overlay version-log-overlay" data-action="modal-backdrop">
    <div class="modal version-log-modal modal-relative">
      <button class="version-log-close" type="button" data-action="close-modal" title="关闭">✕</button>
      <div class="version-log-head">
        <h2>更新日志</h2>
        <span>v${escapeHtml(current.ver)}</span>
      </div>
      <div class="version-log-body">${body}</div>
      <div class="version-log-footer">
        <button class="btn" type="button" data-action="close-modal">关闭</button>
      </div>
    </div>
  </div>`);
}

function renderVersionEntry(entry) {
  const body = VERSION_SECTIONS.map(([key, label]) => renderSection(entry[key], key, label)).join('');
  return `<article class="version-log-entry">
    <div class="version-log-entry-head">
      <strong>v${escapeHtml(entry.ver)}</strong>
      <span>${escapeHtml(entry.date)}</span>
    </div>
    ${body}
  </article>`;
}

function renderSection(items, key, label) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const rows = items
    .map((item) => `<div class="version-log-item">• ${escapeHtml(item)}</div>`)
    .join('');
  return `<section class="version-log-section version-log-section-${key}">
    <h3>${escapeHtml(label)}</h3>
    ${rows}
  </section>`;
}
