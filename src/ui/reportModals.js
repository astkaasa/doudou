import { byId, fmt, fmtPct, seasonEmoji, seasonName } from '../domain/helpers.js';
import { loanInterest } from '../domain/loans.js';
import { createFinancialReportSnapshot } from '../domain/report.js';
import { calcNasdouIndex } from '../domain/stocks.js';
import { escapeHtml } from './html.js';
import { showModal } from './modal.js';

function buildNewspaperHtml(state, includeFooter = true, period = null) {
  const reportPeriod = period || { year: state.year, quarter: state.quarter };
  const q = reportPeriod.quarter;
  const seasonTxt = seasonName(q) + seasonEmoji(q);
  const dateStr = reportPeriod.year + '年 第' + q + '季度 · ' + seasonTxt;
  const newsItems = state.newsItems || [];
  let html = `<div class="newspaper">
    <div class="newspaper-header">
      <h2>环球航空报</h2>
      <div class="date">${dateStr}</div>
    </div>
    <div class="newspaper-body">`;
  if (newsItems.length > 0) {
    html += `<div class="newspaper-headline">⚡ ${newsItems[0].title}</div>`;
  }
  const oilChange = state.prevOilPrice > 0 ? ((state.oilPrice - state.prevOilPrice) / state.prevOilPrice * 100) : 0;
  const oilArrow = oilChange > 0.01 ? '↑' : oilChange < -0.01 ? '↓' : '→';
  const oilColor = oilChange > 0.01 ? '#b91c1c' : oilChange < -0.01 ? '#166534' : '#555';
  html += `<div class="newspaper-item" style="background:#ebe6d6;border:1px solid #8b7355;border-radius:4px;padding:10px;margin-bottom:14px">
    <span class="cat economy">行情</span>
    <div class="title">🛢 国际原油行情</div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:13px">
      <span>上季度: $${state.prevOilPrice.toFixed(1)}/桶</span>
      <span>本季度: <strong>$${state.oilPrice.toFixed(1)}/桶</strong></span>
      <span style="color:${oilColor};font-weight:700">${oilArrow} ${oilChange >= 0 ? '+' : ''}${oilChange.toFixed(1)}%</span>
    </div>
    <div style="margin-top:6px;font-size:11px;color:#4a4a3a;line-height:1.4">${Math.abs(oilChange) < 1 ? '原油价格保持平稳，市场供需基本均衡。' : oilChange > 0 ? '地缘政治紧张叠加季节性需求走强，油价上行压力明显。航空业燃油成本面临考验。' : '产油国增产预期增强，油价承压回落。航空业运营成本有望缓解。'}</div>
  </div>`;
  if (state.stocks) {
    const nasdou = calcNasdouIndex(state);
    const nasdouColor = nasdou > 0.001 ? '#b91c1c' : nasdou < -0.001 ? '#166534' : '#555';
    const nasdouArrow = nasdou > 0.001 ? '↑' : nasdou < -0.001 ? '↓' : '→';
    const nasdouSign = nasdou > 0.001 ? '+' : '';
    html += `<div class="newspaper-item" style="background:#ebe6d6;border:1px solid #8b7355;border-radius:4px;padding:10px;margin-bottom:14px">
      <span class="cat stock">行情</span>
      <div class="title">📈 NASDOU 综合指数</div>
      <div style="margin-top:6px;font-size:13px">
        <span style="color:${nasdouColor};font-weight:700">${nasdouArrow} ${nasdouSign}${(nasdou * 100).toFixed(1)}%</span>
      </div>
      <div style="margin-top:6px;font-size:11px;color:#4a4a3a;line-height:1.4">${describeNasdouForPaper(nasdou)}</div>
    </div>`;
  }
  newsItems.forEach((item) => {
    const catName = { politics: '时政', entertainment: '娱乐', culture: '文化', disaster: '灾害', economy: '财经', tech: '科技', sports: '体育', health: '卫生', ads: '广告', aviation: '航空' }[item.category] || '综合';
    const featured = item.category === 'aviation' ? ' style="background:#ebe6d6;border:1px solid #0284c7;border-radius:4px;padding:10px;margin-bottom:14px"' : '';
    html += `<div class="newspaper-item"${featured}>
      <span class="cat ${item.category}">${catName}</span>
      <div class="title">${item.title}</div>
      <div class="desc">${item.desc}</div>
      ${item.effect ? `<div class="effect">→ ${item.effect}</div>` : ''}
    </div>`;
  });
  html += '</div>';
  if (includeFooter) {
    html += `
    <div class="newspaper-footer">
      <button class="btn btn-primary" data-action="close-modal" style="padding:8px 32px">知道了，继续经营</button>
    </div>`;
  }
  html += '</div>';
  return html;
}

export function showNewspaper(state) {
  const html = buildNewspaperHtml(state, true, state?.lastReportData?.period || null);
  byId('modal-root').innerHTML = `<div class="modal-overlay" data-action="modal-backdrop" style="align-items:flex-start;padding-top:40px">${html}</div>`;
  const reread = byId('reread-news-btn');
  if (reread) reread.style.display = '';
}

export function buildFinancialReportHtml(state, rev, cost, profit, period = null, reportInterest = loanInterest(state), snapshot = createFinancialReportSnapshot(state)) {
  const reportPeriod = period || { year: state.year, quarter: state.quarter };
  const color = profit >= 0 ? '#4ade80' : '#f87171';
  const interest = reportInterest;
  const stockDividend = snapshot.stockDividend || 0;
  let html = `<h2>上季财报 — ${reportPeriod.year} Q${reportPeriod.quarter} ${seasonEmoji(reportPeriod.quarter)}${seasonName(reportPeriod.quarter)}</h2>
    <div class="report-section"><div class="report-row"><span>营业收入</span><span style="color:#4ade80">${fmt(rev)}</span></div>${snapshot.traitFund > 0 ? `<div class="report-row"><span>其中辣豆基金</span><span style="color:#4ade80">+${fmt(snapshot.traitFund)}</span></div>` : ''}${stockDividend > 0 ? `<div class="report-row"><span>证券分红(Q4)</span><span style="color:#fbbf24">+${fmt(stockDividend)}</span></div>` : ''}<div class="report-row"><span>运营成本</span><span style="color:#f87171">-${fmt(cost)}</span></div>${interest > 0 ? `<div class="report-row"><span>其中贷款利息</span><span style="color:#f87171">-${fmt(interest)}</span></div>` : ''}<div class="report-total" style="color:${color}">净利润: ${fmt(profit)}</div></div>
    <div class="report-section"><div class="report-row"><span>现金余额</span><span>${fmt(snapshot.cash)}</span></div>${snapshot.loan > 0 ? `<div class="report-row"><span>贷款余额</span><span style="color:#f87171">${fmt(snapshot.loan)}</span></div>` : ''}<div class="report-row"><span>航线数</span><span>${snapshot.routeCount}</span></div><div class="report-row"><span>机队规模</span><span>${snapshot.fleetCount} 架 (购${snapshot.boughtCount} / 租${snapshot.leasedCount})</span></div><div class="report-row"><span>品牌等级</span><span>${'★'.repeat(Math.min(5, Math.floor(snapshot.brand)))}</span></div><div class="report-row"><span>油价</span><span>$${snapshot.oilPrice.toFixed(0)}/桶</span></div></div>`;
  if (snapshot.portfolio && snapshot.portfolio.marketValue > 0) {
    const pnl = snapshot.portfolio.floatingPnL || 0;
    const pnlColor = pnl >= 0 ? '#ef4444' : '#22c55e';
    html += `<h3>投资收益</h3><div class="report-section">
      <div class="report-row"><span>持仓市值</span><span>$${snapshot.portfolio.marketValue.toFixed(1)}M</span></div>
      <div class="report-row"><span>本季浮盈</span><span style="color:${pnlColor}">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(1)}M</span></div>
    </div>`;
  }
  if (snapshot.routes.length > 0) {
    html += '<h3>基地收益</h3><div class="report-section report-base-section">';
    getBaseRouteTotals(snapshot).forEach((base) => {
      const rc = base.profit >= 0 ? '#4ade80' : '#f87171';
      const tag = base.isHQ ? '⌂ 总部' : '⑂ 分部';
      const openAttr = snapshot.routes.length <= 4 && base.routeCount <= 4 ? ' open' : '';
      html += `<details class="report-base"${openAttr}>
        <summary>
          <span><strong>${tag} ${escapeHtml(base.name)}</strong><small>${base.routeCount}线 · 收 ${fmt(base.revenue)} / 成 ${fmt(base.cost)}</small></span>
          <b style="color:${rc}">${fmt(base.profit)}</b>
        </summary>
        <div class="report-route-list">
          ${base.routes.map(renderBaseRouteRow).join('')}
        </div>
      </details>`;
    });
    html += '</div>';
  }
  if (snapshot.deliveredThisTurn.length > 0) {
    html += '<div style="text-align:center;margin:12px 0 0;position:relative;display:inline-block;width:100%"><button class="delivery-mail" type="button" data-action="show-delivery-popup" title="点击查看飞机交付通知">✉️<span>NEW</span></button></div>';
  }
  return html;
}

function describeNasdouForPaper(value) {
  if (value > 0.05) return '市场全面走强，多个板块涨幅显著，投资者信心回升。';
  if (value < -0.05) return '市场明显承压，资金转向避险，多个板块出现回调。';
  if (value > 0.005) return '市场小幅上行，各板块波动温和，整体走势偏暖。';
  if (value < -0.005) return '市场小幅承压，部分板块微跌，投资者观望情绪较浓。';
  return '股市整体平稳，各板块波动不大，市场交投清淡。';
}

function getBaseRouteTotals(snapshot) {
  const baseIds = [snapshot.hq, ...(snapshot.branches || [])].filter(Boolean);
  const totals = new Map();
  snapshot.routes.forEach((route) => {
    const baseId = baseIds.includes(route.from) ? route.from : baseIds.includes(route.to) ? route.to : route.from;
    const name = baseId === route.from ? route.fromName : route.toName;
    const current = totals.get(baseId) || {
      name,
      isHQ: baseId === snapshot.hq,
      revenue: 0,
      cost: 0,
      profit: 0,
      routeCount: 0,
      routes: [],
    };
    current.revenue += route.revenue || 0;
    current.cost += route.cost || 0;
    current.profit += route.profit || 0;
    current.routeCount += 1;
    current.routes.push(route);
    totals.set(baseId, current);
  });
  return [...totals.values()]
    .map((base) => ({
      ...base,
      routes: base.routes.sort((a, b) => (b.profit || 0) - (a.profit || 0)),
    }))
    .sort((a, b) => Number(b.isHQ) - Number(a.isHQ) || b.profit - a.profit);
}

function renderBaseRouteRow(route) {
  const profit = route.profit || 0;
  const color = profit >= 0 ? '#4ade80' : '#f87171';
  const status = route.suspended ? '<em>停飞</em>' : '';
  return `<div class="report-route-row">
    <span>${escapeHtml(route.fromName)} → ${escapeHtml(route.toName)} ${status}</span>
    <small>客座率 ${fmtPct((route.loadFactor || 0) * 100)} · 收 ${fmt(route.revenue || 0)} / 成 ${fmt(route.cost || 0)}</small>
    <strong style="color:${color}">${fmt(profit)}</strong>
  </div>`;
}

export function showFinancialReport(state, rev, cost, profit, period = null, interest = loanInterest(state), snapshot = createFinancialReportSnapshot(state)) {
  const html = `${buildFinancialReportHtml(state, rev, cost, profit, period, interest, snapshot)}<div style="margin-top:12px;text-align:center"><button class="btn btn-primary" data-action="close-modal" style="padding:8px 32px">继续经营</button></div>`;
  showModal(`<div class="report-card-standalone">${html}</div>`);
}

export function showTurnSummary(state, report) {
  const snapshot = createFinancialReportSnapshot(state);
  state.lastReportData = { ...report, snapshot };
  const newsHtml = buildNewspaperHtml(state, false, report.period);
  const reportHtml = buildFinancialReportHtml(state, report.rev, report.cost, report.profit, report.period, report.interest, snapshot);
  byId('modal-root').innerHTML = `<div class="modal-overlay" data-action="modal-backdrop"><div class="turn-summary"><div>${newsHtml}</div><div class="report-card">${reportHtml}<div class="report-footer"><button class="btn btn-primary" data-action="close-modal" style="padding:10px 40px;border-radius:8px">知道了，继续经营</button></div></div></div></div>`;
  const newsBtn = byId('reread-news-btn');
  const reportBtn = byId('reread-report-btn');
  if (newsBtn) newsBtn.style.display = '';
  if (reportBtn) reportBtn.style.display = '';
}

export function showReportAlone(state) {
  if (!state?.lastReportData) return;
  const { rev, cost, profit, period, interest, snapshot } = state.lastReportData;
  showFinancialReport(state, rev, cost, profit, period, interest, snapshot);
}

export function showDeliveryPopup(state) {
  const items = state?.lastReportData?.snapshot?.deliveredThisTurn || state.deliveredThisTurn || [];
  if (items.length === 0) return;
  let html = `<div class="delivery-overlay" data-action="delivery-backdrop">
    <div class="delivery-modal">
      <h2 style="font-size:20px;margin-bottom:12px;color:#4ade80">✈ 飞机交付通知</h2>
      <p style="color:#7ba3cc;font-size:13px;margin-bottom:12px">以下飞机已完成交付，可以分配到航线运营。</p>
      <div style="background:#0a1628;border:1px solid #16a34a60;border-radius:8px;padding:12px">`;
  items.forEach((plane) => {
    html += `<div class="report-row"><span style="color:#e0e8f0;font-weight:600">${plane.name}</span><span style="color:#4ade80">✓ 已就绪</span></div>`;
  });
  html += '</div><div style="margin-top:16px;text-align:center"><button class="btn btn-primary" data-action="close-delivery-popup" style="padding:8px 32px">知道了</button></div></div></div>';
  byId('delivery-root').innerHTML = html;
}

export function closeDeliveryPopup() {
  const root = byId('delivery-root');
  if (root) root.innerHTML = '';
}

export function showGameOver(state) {
  byId('modal-root').innerHTML = `<div class="modal-overlay"><div class="modal gameover"><h1>破产了</h1><p>你的航空公司因资金耗尽而倒闭。</p><p>存活了 ${state.turnsPlayed} 个季度</p><p>最高曾拥有 ${state.routes.length} 条航线、${state.fleet.length} 架飞机</p><button class="btn btn-primary" data-action="reload-page" style="margin-top:16px;padding:10px 32px">重新开始</button></div></div>`;
}
