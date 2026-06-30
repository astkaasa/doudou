import { VERSION_LOG } from '../data/version.js';
import { byId } from '../domain/helpers.js';
import { escapeHtml } from './html.js';

const VERSION_SECTIONS = [
  ['new', '新功能', '#fbbf24'],
  ['balance', '平衡调整', '#4ade80'],
  ['fix', '修复', '#93c5fd'],
  ['ui', '界面', '#c084fc'],
];

export function showVersionLog() {
  const current = VERSION_LOG[0];
  if (!current) return;

  const body = VERSION_SECTIONS.map(([key, label, color]) => renderSection(current[key], label, color)).join('');
  byId('modal-root').innerHTML = `<div class="modal-overlay version-log-overlay" data-action="modal-backdrop">
    <div class="modal" style="position:relative">
      <button class="version-log-close" type="button" data-action="close-modal" title="关闭">✕</button>
      <div class="version-log-head">
        <h2>更新日志</h2>
        <span>v${escapeHtml(current.ver)}</span>
      </div>
      <div class="version-log-date">${escapeHtml(current.date)}</div>
      <div class="version-log-body">${body}</div>
      <div class="version-log-footer">
        <button class="btn" type="button" data-action="close-modal">关闭</button>
      </div>
    </div>
  </div>`;
}

function renderSection(items, label, color) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const rows = items
    .map((item) => `<div class="version-log-item" style="--version-section-color:${color}">• ${escapeHtml(item)}</div>`)
    .join('');
  return `<section class="version-log-section">
    <h3 style="color:${color}">${escapeHtml(label)}</h3>
    ${rows}
  </section>`;
}
