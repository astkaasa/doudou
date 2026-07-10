import { describe, expect, it } from 'vitest';

import { buildAcceptanceReport } from '../src/simulation/acceptance.js';

describe('balance acceptance', () => {
  it('separates incomplete matrix coverage from scoped metric failures', () => {
    const report = buildAcceptanceReport([{
      eraId: 'era1',
      policyId: 'aggressive',
      survived: true,
      victoryTurn: 40,
      routeOperatingMargin: 0.5,
      profitMargin: 0.5,
      cashPressureRate: 0,
      nonRouteIncomeShare: 0.2,
      rescues: 1,
      forcedLiquidations: 0,
      endCash: 10000,
    }]);

    expect(report.passed).toBe(false);
    expect(report.coverage).toMatchObject({ complete: false, combinations: 1, expectedCombinations: 80, minimumRuns: 1 });
    expect(report.rows.map((row) => row.eraId)).toEqual(['era1']);
    expect(report.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'era1.routeMargin', passed: false }),
      expect.objectContaining({ id: 'era1.nonRouteIncome', passed: false }),
    ]));
    expect(report.checks.some((check) => check.id.startsWith('era2.'))).toBe(false);
  });
});
