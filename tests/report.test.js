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
    expect(html).toContain('北京 → 上海');
    expect(html).toContain('客座率 80.0%');
    expect(html).toContain('收 $9.0M / 成 $2.0M');
  });
});
