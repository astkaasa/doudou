import { describe, expect, it } from 'vitest';

import { aggregateSimulationResults, BALANCE_POLICIES, simulateBatch, simulateGame } from '../src/simulation/balance.js';

describe('balance simulation', () => {
  it('is deterministic for a fixed era, policy, and seed', () => {
    const options = { eraId: 'era2', policyId: 'balanced', seed: 'simulation-test', maxTurns: 16 };

    expect(simulateGame(options)).toEqual(simulateGame(options));
  });

  it('runs every era and policy through state validation', () => {
    const results = simulateBatch({ runs: 1, maxTurns: 4, seedBase: 'matrix-test' });

    expect(results).toHaveLength(4 * Object.keys(BALANCE_POLICIES).length);
    expect(new Set(results.map((result) => result.eraId))).toEqual(new Set(['era1', 'era2', 'era3', 'era4']));
    expect(new Set(results.map((result) => result.policyId))).toEqual(new Set(Object.keys(BALANCE_POLICIES)));
    expect(results.every((result) => result.turnsPlayed > 0)).toBe(true);
  });

  it('aggregates comparable outcome metrics by era and policy', () => {
    const results = simulateBatch({ runs: 2, eras: ['era3'], policies: ['conservative'], maxTurns: 4, seedBase: 'aggregate-test' });

    expect(aggregateSimulationResults(results)).toEqual([
      expect.objectContaining({
        eraId: 'era3',
        policyId: 'conservative',
        runs: 2,
        survivalRate: expect.any(Number),
        avgEndCash: expect.any(Number),
        avgProfitMargin: expect.any(Number),
      }),
    ]);
  });

  it('reports per-system contributions and cash pressure', () => {
    const result = simulateGame({ eraId: 'era2', policyId: 'aggressive', seed: 'metrics', maxTurns: 12 });

    expect(result.contributions.routeRevenue).toBeGreaterThan(0);
    expect(result.contributions.routeCost).toBeGreaterThan(0);
    expect(result.contributions.fleetOverhead).toBeGreaterThan(0);
    expect(result.contributions.operations).toBeGreaterThan(0);
    expect(result.contributions.traitFund).toBeGreaterThan(0);
    expect(result.routeOperatingMargin).toBeTypeOf('number');
    expect(result.nonRouteIncomeShare).toBeGreaterThan(0);
    expect(result.cashPressureRate).toBeGreaterThanOrEqual(0);
    expect(result.cashPressureRate).toBeLessThanOrEqual(1);
  });

  it('runs and aggregates headquarters independently', () => {
    const results = simulateBatch({
      eras: 'era1',
      policies: 'conservative',
      hqs: 'beijing,london',
      runs: 2,
      maxTurns: 2,
      seedBase: 'regional',
    });
    const summary = aggregateSimulationResults(results);

    expect(results).toHaveLength(4);
    expect(new Set(results.map((result) => result.hq))).toEqual(new Set(['beijing', 'london']));
    expect(summary.map((row) => row.hq).sort()).toEqual(['beijing', 'london']);
    expect(summary.every((row) => row.avgContributionsPerTurn.fleetOverhead > 0)).toBe(true);
  });

  it('rejects unknown headquarters explicitly', () => {
    expect(() => simulateGame({ hq: 'missing-city', maxTurns: 1 })).toThrow('Unknown headquarters');
  });

  it('continues automatically when a diagnostic horizon exceeds the era', () => {
    const result = simulateGame({
      eraId: 'era1',
      policyId: 'conservative',
      seed: 'post-era-diagnostic',
      maxTurns: 82,
    });

    expect(result.turnsPlayed).toBe(82);
    expect(result.eraSettlementStatus).toBe('continued');
    expect(result.eraSettlementOutcome).toBeTypeOf('string');
  });
});
