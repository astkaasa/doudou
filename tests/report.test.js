import { describe, expect, it } from 'vitest';

import { createFinancialReportSnapshot } from '../src/domain/report.js';
import { initState } from '../src/domain/state.js';
import { buildFinancialReportHtml } from '../src/ui/reportModals.js';

describe('financial report snapshots', () => {
  it('captures report state so reread reports do not drift with later mutations', () => {
    const state = initState('beijing', 'era3');
    state.cash = 123;
    state.loan = 45;
    state.routes.push({ from: 'beijing', to: 'shanghai', revenue: 9, cost: 2, profit: 7, loadFactor: 0.8 });
    state.fleet.push({ isLease: false }, { isLease: true });
    state.deliveredThisTurn = [{ name: 'A320', uid: 1 }];

    const snapshot = createFinancialReportSnapshot(state);

    state.cash = 999;
    state.loan = 0;
    state.routes.push({ from: 'beijing', to: 'tokyo', profit: 9, loadFactor: 0.9 });
    state.fleet = [];
    state.deliveredThisTurn = [];

    expect(snapshot).toMatchObject({
      cash: 123,
      loan: 45,
      routeCount: 1,
      fleetCount: 2,
      boughtCount: 1,
      leasedCount: 1,
    });
    expect(snapshot.routes).toEqual([{
      from: 'beijing',
      to: 'shanghai',
      fromName: '北京',
      toName: '上海',
      revenue: 9,
      cost: 2,
      profit: 7,
      loadFactor: 0.8,
      suspended: false,
    }]);
    expect(snapshot.deliveredThisTurn).toEqual([{ name: 'A320', uid: 1 }]);
  });

  it('renders expandable base route details in the financial report', () => {
    const state = initState('beijing', 'era3');
    state.routes.push({ from: 'beijing', to: 'shanghai', revenue: 9, cost: 2, profit: 7, loadFactor: 0.8 });

    const html = buildFinancialReportHtml(state, 9, 2, 7, null, 0);

    expect(html).toContain('<details class="report-base"');
    expect(html).toContain('📍 总部 北京');
    expect(html).toContain('北京 → 上海');
    expect(html).toContain('客座率 80.0%');
    expect(html).toContain('收 $9.0M / 成 $2.0M');
    expect(html).toContain('<strong class="positive">$7.0M</strong>');
    expect(html).not.toContain(' style=');
  });

  it('captures and renders stock portfolio values in report snapshots', () => {
    const state = initState('beijing', 'era3');
    state.stocks.wuer_media.price = 60;
    state._lastStockDividend = 0.2;

    const snapshot = createFinancialReportSnapshot(state);
    const html = buildFinancialReportHtml(state, 0, 1.2, -1, { year: 2000, quarter: 4 }, 0, snapshot);

    expect(snapshot.stockDividend).toBe(0.2);
    expect(snapshot.portfolio).toEqual({ marketValue: 60, totalCost: 52, floatingPnL: 8 });
    expect(html).toContain('证券分红(Q4)');
    expect(html).toContain('投资收益');
    expect(html).toContain('$60.0M');
    expect(html).toContain('+$8.0M');
    expect(html).toContain('class="report-market-up"');
  });

  it('captures and renders operations report fields', () => {
    const state = initState('beijing', 'era3');
    state.opsEfficiency = 0.82;
    state._opsCostThisTurn = 1.25;
    state._faultLossThisTurn = 2.5;
    state._retiredThisTurn = 0.003;
    state._faultsThisTurn = [{ planeUid: 1, planeName: 'DC-6', severity: 'major', lossPct: 0.5 }];

    const snapshot = createFinancialReportSnapshot(state);
    const html = buildFinancialReportHtml(state, 10, 5, 5, { year: 2000, quarter: 2 }, 0, snapshot);

    expect(snapshot.opsEfficiency).toBe(0.82);
    expect(snapshot.opsCost).toBe(1.25);
    expect(snapshot.faultLoss).toBe(2.5);
    expect(html).toContain('运营效能');
    expect(html).toContain('82%');
    expect(html).toContain('class="warning">82%</span>');
    expect(html).toContain('其中运营预算');
    expect(html).toContain('其中故障损失');
    expect(html).toContain('员工退休');
    expect(html).toContain('严重故障');
  });
});
