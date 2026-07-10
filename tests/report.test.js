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

  it('keeps a reconcilable cost breakdown and quarterly events for report rereads', () => {
    const state = initState('beijing', 'era3');
    state._lastStockDividend = 0.4;
    state._subReturnThisTurn = 0.8;
    state._subMaintThisTurn = 0.3;
    const report = {
      routeRevenue: 9,
      routeCost: 2,
      overhead: 1.6,
      leaseCost: 1.5,
      interest: 0.4,
      opsCost: 0.5,
      faultLoss: 0,
      airportContractIncome: 1,
      airportContractPenalty: 0.2,
      bankruptcyAction: { action: 'emergencyLoan', amount: 6 },
      branchCompleted: ['shanghai'],
      airportContractsCompleted: ['contract-1'],
      airportContractsBreached: [],
      newAirportRelocations: ['relocation-1'],
      angelInvestmentAmount: 75,
      fleetDepartures: [
        { uid: 3, name: 'A320', reason: 'lease_expired', affectedRouteCount: 1 },
        { uid: 4, name: 'DC-8', reason: 'retired', affectedRouteCount: 2 },
      ],
      milestonesUnlocked: [{ id: 'first_route', title: '初次启航', description: '开通第 1 条航线' }],
      mainQuestUpdate: { type: 'stage_complete', title: '区域航司', nextTitle: '洲际网络' },
    };

    const snapshot = createFinancialReportSnapshot(state, report);
    const html = buildFinancialReportHtml(state, 10, 6.2, 4.7, { year: 2000, quarter: 2 }, 0.4, snapshot);

    expect(snapshot.financialBreakdown).toMatchObject({ routeCost: 2, overhead: 1.6, leaseCost: 1.5 });
    expect(snapshot.quarterEvents).toMatchObject({
      branchCompleted: ['上海'],
      airportContractsCompleted: 1,
      newAirportRelocations: 1,
      angelInvestmentAmount: 75,
      fleetDepartures: [
        { uid: 3, name: 'A320', reason: 'lease_expired', affectedRouteCount: 1 },
        { uid: 4, name: 'DC-8', reason: 'retired', affectedRouteCount: 2 },
      ],
    });
    expect(html).toContain('航空经营收入');
    expect(html).toContain('其中航线直接成本');
    expect(html).toContain('其中机队与总部固定成本');
    expect(html).toContain('其中飞机租赁');
    expect(html).toContain('证券与子公司净收益');
    expect(html).toContain('急救贷款已发放');
    expect(html).toContain('分部完工');
    expect(html).toContain('机场迁移');
    expect(html).toContain('天使救助');
    expect(html).toContain('辣豆基金注资 $75.0M');
    expect(html).toContain('租约到期');
    expect(html).toContain('A320已按合同退租；1 条航线已解除飞机分配');
    expect(html).toContain('机龄退役');
    expect(html).toContain('DC-8已达到 25 年机龄并退役；2 条航线已解除飞机分配');
    expect(html).toContain('里程碑达成');
    expect(html).toContain('下一阶段：洲际网络');
  });
});
