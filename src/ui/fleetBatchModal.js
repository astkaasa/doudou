import { quoteIdleFleetDisposal } from '../domain/fleetBatch.js';
import { fmt } from '../domain/helpers.js';
import { escapeHtml } from './html.js';
import { showModal } from './modal.js';

export function showFleetDisposalPreview(state, planeUids) {
  const quote = quoteIdleFleetDisposal(state, planeUids);
  const previewEntries = quote.entries.slice(0, 12);
  const hiddenCount = Math.max(0, quote.entries.length - previewEntries.length);
  const rejected = quote.rejected.length > 0
    ? `<div class="fleet-batch-rejected"><strong>${quote.rejected.length} 架已不可处置</strong><span>${quote.rejected.map(rejectedLabel).join('、')}</span></div>`
    : '';
  const leaseWarning = quote.leaseLimitExceededAfter
    ? `<div class="fleet-batch-warning"><strong>租赁比例将高于新购上限</strong><span>处置后自有 ${quote.ownedAfter} 架、租赁 ${quote.leasedAfter} 架，新租赁上限为 ${quote.leaseLimitAfter} 架；现有租赁不受影响，但补充租赁前需恢复比例。</span></div>`
    : '';
  const entries = previewEntries.map((entry) => `<div class="fleet-batch-entry"><span>${escapeHtml(entry.plane.name)}${entry.plane.isLease ? ' <b>R</b>' : ''}</span><strong>${entry.action === 'sell' ? `出售 · +${fmt(entry.saleProceeds)}` : `退租 · 每季省 ${fmt(entry.quarterlyLeaseSavings)}`}</strong></div>`).join('');

  showModal(`<div class="fleet-batch-modal">
    <h2>批量处置确认</h2>
    <div class="fleet-batch-impact">
      <span><small>处置飞机</small><strong>${quote.entries.length} 架</strong></span>
      <span><small>航线影响</small><strong class="positive">${quote.affectedRouteCount} 条</strong></span>
      <span><small>出售收入</small><strong class="positive">+${fmt(quote.saleProceeds)}</strong></span>
      <span><small>季度节省</small><strong class="positive">${fmt(quote.quarterlyLeaseSavings)}</strong></span>
    </div>
    <div class="fleet-batch-entry-list">${entries}${hiddenCount > 0 ? `<div class="fleet-batch-more">另有 ${hiddenCount} 架</div>` : ''}</div>
    ${leaseWarning}${rejected}
    <p class="fleet-batch-note">执行前会再次校验所有飞机；只要一架已被分配、进入交付或不存在，本批次就不会执行。</p>
    <div class="modal-actions"><button class="btn btn-secondary" type="button" data-action="return-fleet-panel">返回</button><button class="btn btn-danger" type="button" data-action="confirm-fleet-batch-disposal"${quote.ok ? '' : ' disabled'}>确认处置 ${quote.entries.length} 架</button></div>
  </div>`);
}

function rejectedLabel(entry) {
  const name = entry.plane?.name || `#${entry.uid}`;
  const reason = entry.code === 'assigned' ? '已分配' : entry.code === 'delivering' ? '交付中' : '不存在';
  return `${escapeHtml(name)}（${reason}）`;
}
