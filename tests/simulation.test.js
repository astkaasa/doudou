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
});
