import { byId, fmt, fmtPct, seasonEmoji, seasonName } from '../domain/helpers.js';
import { loanInterest } from '../domain/loans.js';
import { createFinancialReportSnapshot } from '../domain/report.js';
import { calcNasdouIndex } from '../domain/stocks.js';
import { escapeHtml, renderHtml } from './html.js';
import { renderModalRoot, showModal } from './modal.js';

const NEWSPAPER_CATEGORY_LABELS = {
  politics: '时政',
  entertainment: '娱乐',
  culture: '文化',
  disaster: '灾害',
  economy: '财经',
  tech: '科技',
  sports: '体育',
  health: '卫生',
  ads: '广告',
  aviation: '航空',
  mega_event: '盛事',
};

function buildNewspaperHtml(state, includeFooter = true, period = null) {
  const reportPeriod = period || { year: state.year, quarter: state.quarter };
  const q = reportPeriod.quarter;
  const seasonTxt = seasonName(q) + seasonEmoji(q);
  const dateStr = reportPeriod.year + '年 第' + q + '季度 · ' + seasonTxt;
  const newsItems = state.newsItems || [];
  let html = `<div class="newspaper">
    <div class="newspaper-header">
      <h2>环球航空报</h2>
      <div class="date">${escapeHtml(dateStr)}</div>
    </div>
    <div class="newspaper-body">`;
  const headline = pickNewspaperHeadline(state, newsItems);
  if (headline) {
    html += `<div class="newspaper-headline">${headline.category === 'mega_event' ? '🏆' : '⚡'} ${escapeHtml(headline.title)}</div>`;
  }
  const oilChange = state.prevOilPrice > 0 ? ((state.oilPrice - state.prevOilPrice) / state.prevOilPrice * 100) : 0;
  const oilArrow = oilChange > 0.01 ? '↑' : oilChange < -0.01 ? '↓' : '→';
  const oilClass = paperChangeClass(oilChange, 0.01);
  html += `<div class="newspaper-item newspaper-market">
    <span class="cat economy">行情</span>
    <div class="title">🛢 国际原油行情</div>
    <div class="paper-market-row">
      <span>上季度: $${state.prevOilPrice.toFixed(1)}/桶</span>
      <span>本季度: <strong>$${state.oilPrice.toFixed(1)}/桶</strong></span>
      <span class="paper-market-change ${oilClass}">${oilArrow} ${oilChange >= 0 ? '+' : ''}${oilChange.toFixed(1)}%</span>
    </div>
    <div class="paper-market-explainer">${Math.abs(oilChange) < 1 ? '原油价格保持平稳，市场供需基本均衡。' : oilChange > 0 ? '地缘政治紧张叠加季节性需求走强，油价上行压力明显。航空业燃油成本面临考验。' : '产油国增产预期增强，油价承压回落。航空业运营成本有望缓解。'}</div>
  </div>`;
  if (state.stocks) {
    const nasdou = calcNasdouIndex(state);
    const nasdouClass = paperChangeClass(nasdou, 0.001);
    const nasdouArrow = nasdou > 0.001 ? '↑' : nasdou < -0.001 ? '↓' : '→';
    const nasdouSign = nasdou > 0.001 ? '+' : '';
    html += `<div class="newspaper-item newspaper-market">
      <span class="cat stock">行情</span>
      <div class="title">📈 NASDOU 综合指数</div>
      <div class="paper-market-row">
        <span class="paper-market-change ${nasdouClass}">${nasdouArrow} ${nasdouSign}${(nasdou * 100).toFixed(1)}%</span>
      </div>
      <div class="paper-market-explainer">${describeNasdouForPaper(nasdou)}</div>
    </div>`;
  }
  newsItems.forEach((item) => {
    const category = Object.hasOwn(NEWSPAPER_CATEGORY_LABELS, item.category) ? item.category : 'general';
    const catName = NEWSPAPER_CATEGORY_LABELS[category] || '综合';
    const featuredClass = category === 'aviation'
      ? ' newspaper-feature-aviation'
      : category === 'mega_event'
        ? ' newspaper-feature-mega'
        : '';
    html += `<div class="newspaper-item${featuredClass}">
      <span class="cat ${category}">${catName}</span>
      <div class="title">${category === 'mega_event' ? '🏆 ' : ''}${escapeHtml(item.title)}</div>
      <div class="desc">${escapeHtml(item.desc)}</div>
      ${item.effect ? `<div class="effect">→ ${escapeHtml(item.effect)}</div>` : ''}
    </div>`;
  });
  html += '</div>';
  if (includeFooter) {
    html += `
    <div class="newspaper-footer">
      <button class="btn btn-primary btn-dialog-primary" data-action="close-modal">知道了，继续经营</button>
    </div>`;
  }
  html += '</div>';
  return html;
}

function pickNewspaperHeadline(state, newsItems) {
  const megaItems = newsItems.filter((item) => item.category === 'mega_event');
  const peakMega = megaItems.find((item) => item._isHeadline);
  if (peakMega) return peakMega;
  if (megaItems.length > 0) {
    return megaItems.reduce((best, item) => {
      const bestEvent = (state.activeMegaEvents || []).find((event) => event.id === best._megaEventId);
      const itemEvent = (state.activeMegaEvents || []).find((event) => event.id === item._megaEventId);
      return (itemEvent?.currentBoost || 0) > (bestEvent?.currentBoost || 0) ? item : best;
    }, megaItems[0]);
  }
  return newsItems.find((item) => item.category !== 'ads') || newsItems[0] || null;
}

export function showNewspaper(state) {
  const html = buildNewspaperHtml(state, true, state?.lastReportData?.newsPeriod || state?.lastReportData?.nextPeriod || state?.lastReportData?.period || null);
  renderModalRoot(`<div class="modal-overlay newspaper-overlay" data-action="modal-backdrop">${html}</div>`);
  const reread = byId('reread-news-btn');
  if (reread) reread.hidden = false;
}

export function buildFinancialReportHtml(state, rev, cost, profit, period = null, reportInterest = loanInterest(state), snapshot = createFinancialReportSnapshot(state)) {
  const reportPeriod = period || { year: state.year, quarter: state.quarter };
  const profitClass = valueClass(profit);
  const opsClass = snapshot.opsEfficiency >= 1 ? 'positive' : snapshot.opsEfficiency >= 0.7 ? 'warning' : 'negative';
  const interest = reportInterest;
  const stockDividend = snapshot.stockDividend || 0;
  let html = `<h2>上季财报 — ${reportPeriod.year} Q${reportPeriod.quarter} ${seasonEmoji(reportPeriod.quarter)}${seasonName(reportPeriod.quarter)}</h2>
    <div class="report-section">
      <div class="report-row"><span>营业收入</span><span class="positive">${fmt(rev)}</span></div>
      ${snapshot.traitFund > 0 ? `<div class="report-row"><span>其中辣豆基金</span><span class="positive">+${fmt(snapshot.traitFund)}</span></div>` : ''}
      ${stockDividend > 0 ? `<div class="report-row"><span>证券分红(Q4)</span><span class="warning">+${fmt(stockDividend)}</span></div>` : ''}
      <div class="report-row"><span>运营成本</span><span class="negative">-${fmt(cost)}</span></div>
      ${snapshot.opsCost > 0 ? `<div class="report-row"><span>其中运营预算</span><span class="negative">-${fmt(snapshot.opsCost)}</span></div>` : ''}
      ${snapshot.faultLoss > 0 ? `<div class="report-row"><span>其中故障损失</span><span class="negative">-${fmt(snapshot.faultLoss)}</span></div>` : ''}
      ${interest > 0 ? `<div class="report-row"><span>其中贷款利息</span><span class="negative">-${fmt(interest)}</span></div>` : ''}
      <div class="report-total ${profitClass}">净利润: ${fmt(profit)}</div>
    </div>
    <div class="report-section">
      <div class="report-row"><span>现金余额</span><span>${fmt(snapshot.cash)}</span></div>
      ${snapshot.loan > 0 ? `<div class="report-row"><span>贷款余额</span><span class="negative">${fmt(snapshot.loan)}</span></div>` : ''}
      <div class="report-row"><span>航线数</span><span>${snapshot.routeCount}</span></div>
      <div class="report-row"><span>机队规模</span><span>${snapshot.fleetCount} 架 (购${snapshot.boughtCount} / 租${snapshot.leasedCount})</span></div>
      <div class="report-row"><span>运营效能</span><span class="${opsClass}">${snapshot.opsEfficiency > 0 ? `${(snapshot.opsEfficiency * 100).toFixed(0)}%` : '--'}</span></div>
      <div class="report-row"><span>品牌等级</span><span>${'★'.repeat(Math.min(5, Math.floor(snapshot.brand)))}</span></div>
      <div class="report-row"><span>油价</span><span>$${snapshot.oilPrice.toFixed(0)}/桶</span></div>
    </div>`;
  if (snapshot.portfolio && snapshot.portfolio.marketValue > 0) {
    const pnl = snapshot.portfolio.floatingPnL || 0;
    const pnlClass = pnl >= 0 ? 'report-market-up' : 'report-market-down';
    html += `<h3>投资收益</h3><div class="report-section">
      <div class="report-row"><span>持仓市值</span><span>$${snapshot.portfolio.marketValue.toFixed(1)}M</span></div>
      <div class="report-row"><span>本季浮盈</span><span class="${pnlClass}">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(1)}M</span></div>
    </div>`;
  }
  if (snapshot.subsidiaries?.count > 0) {
    const subNetClass = valueClass(snapshot.subsidiaries.net);
    html += `<h3>子公司</h3><div class="report-section">
      <div class="report-row"><span>子公司数量</span><span>${snapshot.subsidiaries.count}</span></div>
      <div class="report-row"><span>子公司总值</span><span>${fmt(snapshot.subsidiaries.totalValue)}</span></div>
      <div class="report-row"><span>回报收入</span><span class="positive">+${fmt(snapshot.subsidiaries.return)}</span></div>
      <div class="report-row"><span>维护支出</span><span class="negative">-${fmt(snapshot.subsidiaries.maint)}</span></div>
      <div class="report-total ${subNetClass}">子公司净收益: ${snapshot.subsidiaries.net >= 0 ? '+' : ''}${fmt(snapshot.subsidiaries.net)}</div>
    </div>`;
  }
  if (snapshot.companyValue) {
    const netWorthClass = valueClass(snapshot.companyValue.totalNetWorth);
    html += `<h3>公司市值</h3><div class="report-section">
      <div class="report-row"><span>净资产 <button class="report-link-btn" type="button" data-action="open-company-value">详情</button></span><span class="report-net-worth ${netWorthClass}">${fmt(snapshot.companyValue.totalNetWorth)}</span></div>
    </div>`;
  }
  if (snapshot.routes.length > 0) {
    html += '<h3>基地收益</h3><div class="report-section report-base-section">';
    getBaseRouteTotals(snapshot).forEach((base) => {
      const baseProfitClass = valueClass(base.profit);
      const tag = base.isHQ ? '📍 总部' : '🏬 分部';
      const openAttr = snapshot.routes.length <= 4 && base.routeCount <= 4 ? ' open' : '';
      html += `<details class="report-base"${openAttr}>
        <summary>
          <span><strong>${tag} ${escapeHtml(base.name)}</strong><small>${base.routeCount}线 · 收 ${fmt(base.revenue)} / 成 ${fmt(base.cost)}</small></span>
          <b class="${baseProfitClass}">${fmt(base.profit)}</b>
        </summary>
        <div class="report-route-list">
          ${base.routes.map(renderBaseRouteRow).join('')}
        </div>
      </details>`;
    });
    html += '</div>';
  }
  if (snapshot.deliveredThisTurn.length > 0) {
    html += '<div class="report-delivery-trigger"><button class="delivery-mail" type="button" data-action="show-delivery-popup" title="点击查看飞机交付通知">✉️<span>NEW</span></button></div>';
  }
  if (snapshot.retiredThisTurn > 0) {
    html += `<div class="report-notice"><strong>员工退休</strong><span>本季退休 ${Math.round(snapshot.retiredThisTurn * 1000)} 人</span></div>`;
  }
  if (snapshot.faults.length > 0) {
    const severityMap = { minor: '轻微', major: '严重', critical: '致命' };
    snapshot.faults.forEach((fault) => {
      html += `<div class="report-notice report-fault-${fault.severity}"><strong>${severityMap[fault.severity] || '未知'}故障</strong><span>${escapeHtml(fault.planeName || '飞机')} 收入-${((fault.lossPct || 0) * 100).toFixed(0)}%${fault.severity === 'critical' ? ' · 飞机损失' : ''}</span></div>`;
    });
  }
  return html;
}

function paperChangeClass(value, threshold) {
  if (value > threshold) return 'paper-change-up';
  if (value < -threshold) return 'paper-change-down';
  return 'paper-change-flat';
}

function valueClass(value) {
  return value >= 0 ? 'positive' : 'negative';
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
  const profitClass = valueClass(profit);
  const status = route.suspended ? '<em>停飞</em>' : '';
  return `<div class="report-route-row">
    <span>${escapeHtml(route.fromName)} → ${escapeHtml(route.toName)} ${status}</span>
    <small>客座率 ${fmtPct((route.loadFactor || 0) * 100)} · 收 ${fmt(route.revenue || 0)} / 成 ${fmt(route.cost || 0)}</small>
    <strong class="${profitClass}">${fmt(profit)}</strong>
  </div>`;
}

export function showFinancialReport(state, rev, cost, profit, period = null, interest = loanInterest(state), snapshot = createFinancialReportSnapshot(state)) {
  const html = `${buildFinancialReportHtml(state, rev, cost, profit, period, interest, snapshot)}<div class="report-card-actions"><button class="btn btn-primary btn-dialog-primary" data-action="close-modal">继续经营</button></div>`;
  showModal(`<div class="report-card-standalone">${html}</div>`);
}

export function showTurnSummary(state, report) {
  const snapshot = createFinancialReportSnapshot(state);
  const newsPeriod = report.nextPeriod || null;
  state.lastReportData = { ...report, newsPeriod, snapshot };
  const newsHtml = buildNewspaperHtml(state, false, newsPeriod);
  const reportHtml = buildFinancialReportHtml(state, report.rev, report.cost, report.profit, report.period, report.interest, snapshot);
  const isEraSettlement = Boolean(report.eraSettlement);
  const overlayAction = isEraSettlement ? '' : ' data-action="modal-backdrop"';
  const buttonAction = isEraSettlement ? 'open-era-settlement' : 'close-modal';
  const buttonLabel = isEraSettlement ? '查看时代结算' : '知道了，继续经营';
  renderModalRoot(`<div class="modal-overlay"${overlayAction} data-turn-summary="true"><div class="turn-summary"><div>${newsHtml}</div><div class="report-card">${reportHtml}<div class="report-footer"><button class="btn btn-primary turn-summary-action" data-action="${buttonAction}">${buttonLabel}</button></div></div></div></div>`);
  const newsBtn = byId('reread-news-btn');
  const reportBtn = byId('reread-report-btn');
  if (newsBtn) newsBtn.hidden = false;
  if (reportBtn) reportBtn.hidden = false;
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
      <h2 class="delivery-title">✈ 飞机交付通知</h2>
      <p class="delivery-intro">以下飞机已完成交付，可以分配到航线运营。</p>
      <div class="delivery-list">`;
  items.forEach((plane) => {
    html += `<div class="report-row"><span class="delivery-plane-name">${escapeHtml(plane.name)}</span><span class="delivery-ready">✓ 已就绪</span></div>`;
  });
  html += '</div><div class="delivery-actions"><button class="btn btn-primary btn-dialog-primary" data-action="close-delivery-popup">知道了</button></div></div></div>';
  renderHtml(byId('delivery-root'), html);
}

export function closeDeliveryPopup() {
  renderHtml(byId('delivery-root'), '');
}

export function showGameOver(state) {
  renderModalRoot(`<div class="modal-overlay"><div class="modal gameover"><h1>破产了</h1><p>你的航空公司因资金耗尽而倒闭。</p><p>存活了 ${state.turnsPlayed} 个季度</p><p>最高曾拥有 ${state.routes.length} 条航线、${state.fleet.length} 架飞机</p><button class="btn btn-primary gameover-action" data-action="reload-page">重新开始</button></div></div>`);
}
