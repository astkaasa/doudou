import { airportDisplayCode } from '../domain/airports.js';
import { fmt, getCity } from '../domain/helpers.js';
import { previewNextQuarter } from '../domain/turnPreview.js';
import { escapeHtml } from './html.js';
import { showModal } from './modal.js';

export function showTurnPreview(state) {
  const preview = previewNextQuarter(state);
  if (!preview) return;
  const profitClass = preview.financials.profit >= 0 ? 'positive' : 'negative';
  const cashClass = preview.cashAfter >= 0 ? 'positive' : 'negative';
  const attention = preview.attentionCount > 0
    ? `<span class="turn-preview-attention">${preview.attentionCount} 项需关注</span>`
    : '<span class="turn-preview-clear">无确定性风险</span>';
  const movements = [
    ...preview.fleetDepartures.map(renderDeparture),
    ...preview.fleetDeliveries.map(renderDelivery),
    ...preview.branchCompletions.map(renderBranchCompletion),
  ];
  const deadlines = [
    ...preview.contractDeadlines.map(renderContractDeadline),
    ...(preview.staffContract ? [renderStaffContract(preview.staffContract)] : []),
    ...(preview.eraSettlementDue ? [renderEraSettlement()] : []),
  ];

  showModal(`<div class="turn-preview-modal">
    <div class="turn-preview-head"><div><h2>下一季度预览</h2><p>${preview.nextPeriod.year} Q${preview.nextPeriod.quarter}</p></div>${attention}</div>
    <div class="turn-preview-financials">
      <span><small>静态收入</small><strong>${fmt(preview.financials.totalRev)}</strong></span>
      <span><small>静态成本</small><strong>${fmt(preview.financials.totalCost)}</strong></span>
      <span class="${profitClass}"><small>预计利润</small><strong>${preview.financials.profit >= 0 ? '+' : ''}${fmt(preview.financials.profit)}</strong></span>
      <span class="${cashClass}"><small>预计现金</small><strong>${fmt(preview.cashAfter)}</strong></span>
    </div>
    <div class="turn-preview-columns">
      <section><h3>已知变动</h3><div class="turn-preview-list">${movements.length > 0 ? movements.join('') : renderEmpty('没有确定的交付、离场或分部完工。')}</div></section>
      <section><h3>固定期限</h3><div class="turn-preview-list">${deadlines.length > 0 ? deadlines.join('') : renderEmpty('下一季度没有合同或时代期限。')}</div></section>
    </div>
    <p class="turn-preview-note">按当前票价、机型、机场、运营预算和已知生命周期静态计算；不含随机新闻、故障、证券、子公司与合同实际结算。</p>
    <div class="modal-actions">${preview.fleetPlan.summary.dueWithinHorizon > 0 ? '<button class="btn btn-warning" type="button" data-action="open-fleet-panel">查看机队计划</button>' : ''}<button class="btn btn-secondary" type="button" data-action="close-modal">关闭</button></div>
  </div>`, { wide: true });
}

function renderDeparture(entry) {
  const reason = entry.departureReason === 'lease_expired' ? '租约到期' : '机龄退役';
  const route = routeLabel(entry.route);
  const detail = entry.assigned
    ? `影响 ${route}，需替代 ${entry.replacementSeats} 座`
    : '当前没有执飞航线受影响';
  return renderItem(entry.assigned ? 'risk' : 'warning', `${entry.plane.name} · ${reason}`, detail);
}

function renderDelivery(entry) {
  return renderItem('positive', `${entry.plane.name} · 完成交付`, `${Math.max(0, Number(entry.plane.seats) || 0)} 座加入可用机队`);
}

function renderBranchCompletion(branch) {
  const city = getCity(branch.cityId);
  return renderItem('positive', `${city?.name || branch.cityId}分部完工`, '季度开始时转为可用基地');
}

function renderContractDeadline(entry) {
  const airportCode = airportDisplayCode(entry.contract.airportId);
  const title = entry.finalQuarter ? `${airportCode} 合同最后一季` : `${airportCode} 合同履约告警`;
  if (entry.certainBreach) return renderItem('risk', title, '现有进度已无法达到履约季度要求');
  const detail = entry.staticOutcome === 'complete'
    ? `按当前配置可完成 · ${routeLabel(entry.route)}`
    : `按当前配置存在违约风险 · ${routeLabel(entry.route)}`;
  return renderItem(entry.staticOutcome === 'complete' ? 'positive' : 'warning', title, detail);
}

function renderStaffContract(type) {
  return renderItem('info', type === 'recruit' ? '年度招聘待签' : '年终奖金待签', '季度结束后需先处理，再推进下一季度');
}

function renderEraSettlement() {
  return renderItem('info', '时代航程结算', '本季度结束后进入收官或沙箱选择');
}

function renderItem(tone, title, detail) {
  return `<div class="turn-preview-item ${tone}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`;
}

function renderEmpty(text) {
  return `<div class="turn-preview-empty">${escapeHtml(text)}</div>`;
}

function routeLabel(route) {
  if (!route) return '航线已不存在';
  return `${getCity(route.from)?.name || route.from}→${getCity(route.to)?.name || route.to}`;
}
