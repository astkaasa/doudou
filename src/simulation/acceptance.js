import { ERAS } from '../data/eras.js';
import { BALANCE_POLICIES, REGIONAL_HQ_IDS } from './balance.js';

export const CAMPAIGN_BANDS = Object.freeze({
  era1: Object.freeze({ survival: [0.70, 0.95], victory: [0.30, 0.65], victoryTurn: [62, 78], routeMargin: [0.15, 0.35], profitMargin: [0.10, 0.30], cashPressure: [0.10, 0.35] }),
  era2: Object.freeze({ survival: [0.80, 0.98], victory: [0.50, 0.85], victoryTurn: [58, 75], routeMargin: [0.15, 0.35], profitMargin: [0.10, 0.30], cashPressure: [0.05, 0.25] }),
  era3: Object.freeze({ survival: [0.95, 1.00], victory: [0.75, 1.00], victoryTurn: [50, 70], routeMargin: [0.20, 0.40], profitMargin: [0.15, 0.35], cashPressure: [0.00, 0.15] }),
  era4: Object.freeze({ survival: [0.60, 0.90], victory: [0.35, 0.70], victoryTurn: [140, 215], routeMargin: [0.15, 0.35], profitMargin: [0.10, 0.30], cashPressure: [0.10, 0.35] }),
});

export function buildAcceptanceReport(results) {
  const eraIds = new Set(results.map((result) => result.eraId));
  const rows = ERAS.filter((era) => eraIds.has(era.id))
    .map((era) => buildEraRow(era, results.filter((result) => result.eraId === era.id)));
  const checks = rows.flatMap((row) => buildEraChecks(row));
  const coverage = buildCoverage(results);
  return {
    passed: coverage.complete && checks.every((check) => check.passed),
    coverage,
    rows,
    checks,
  };
}

function buildEraRow(era, results) {
  const aggressive = results.filter((result) => result.policyId === 'aggressive');
  const successfulVictories = aggressive.map((result) => result.victoryTurn).filter(Number.isFinite);
  const policySurvival = Object.fromEntries(Object.keys(BALANCE_POLICIES).map((policyId) => {
    const policyResults = results.filter((result) => result.policyId === policyId);
    return [policyId, rate(policyResults, (result) => result.survived)];
  }));
  return {
    eraId: era.id,
    runs: results.length,
    survival: rate(results, (result) => result.survived),
    victory: rate(aggressive, (result) => Number.isFinite(result.victoryTurn)),
    victoryTurn: mean(successfulVictories),
    routeMargin: mean(aggressive.map((result) => result.routeOperatingMargin)),
    profitMargin: mean(aggressive.map((result) => result.profitMargin)),
    cashPressure: mean(aggressive.map((result) => result.cashPressureRate)),
    nonRouteIncome: mean(aggressive.map((result) => result.nonRouteIncomeShare)),
    rescueRate: rate(results, (result) => result.rescues > 0),
    forcedLiquidationRate: rate(results, (result) => result.forcedLiquidations > 0),
    medianEndCashRatio: median(results.map((result) => result.endCash)) / era.cash,
    viablePolicies: Object.values(policySurvival).filter((value) => value >= 0.5).length,
    policyIds: [...new Set(results.map((result) => result.policyId))],
    policySurvival,
  };
}

function buildEraChecks(row) {
  const bands = CAMPAIGN_BANDS[row.eraId];
  const checks = [];
  if (row.policyIds.includes('aggressive')) {
    checks.push(
      bandCheck(row, 'victory', bands.victory),
      bandCheck(row, 'victoryTurn', bands.victoryTurn),
      bandCheck(row, 'routeMargin', bands.routeMargin),
      bandCheck(row, 'profitMargin', bands.profitMargin),
      bandCheck(row, 'cashPressure', bands.cashPressure),
      maxCheck(row, 'nonRouteIncome', 0.15),
    );
  }
  if (row.policyIds.length === Object.keys(BALANCE_POLICIES).length) {
    checks.push(
      bandCheck(row, 'survival', bands.survival),
      maxCheck(row, 'medianEndCashRatio', row.eraId === 'era4' ? 100 : 25),
      minCheck(row, 'viablePolicies', 2),
      maxCheck(row, 'rescueRate', row.eraId === 'era4' ? 0.20 : 0.10),
    );
    if (row.eraId === 'era1' || row.eraId === 'era4') checks.push(bandCheck(row, 'forcedLiquidationRate', [0.05, 0.30]));
    if (row.eraId === 'era3') checks.push(maxCheck(row, 'forcedLiquidationRate', 0.10));
  }
  return checks;
}

function buildCoverage(results) {
  const counts = new Map();
  results.forEach((result) => {
    const key = `${result.eraId}|${result.policyId}|${result.hq}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const expected = ERAS.flatMap((era) => Object.keys(BALANCE_POLICIES)
    .flatMap((policyId) => REGIONAL_HQ_IDS.map((hq) => `${era.id}|${policyId}|${hq}`)));
  const missingCombinations = expected.filter((key) => !counts.has(key));
  const minimumRuns = counts.size > 0 ? Math.min(...counts.values()) : 0;
  return {
    complete: missingCombinations.length === 0 && minimumRuns >= 20,
    combinations: counts.size,
    expectedCombinations: expected.length,
    minimumRuns,
    requiredRuns: 20,
    missingCombinations,
  };
}

function bandCheck(row, metric, band) {
  const value = row[metric];
  return {
    id: `${row.eraId}.${metric}`,
    eraId: row.eraId,
    metric,
    value,
    expected: band,
    passed: Number.isFinite(value) && value >= band[0] && value <= band[1],
  };
}

function maxCheck(row, metric, maximum) {
  const value = row[metric];
  return {
    id: `${row.eraId}.${metric}`,
    eraId: row.eraId,
    metric,
    value,
    expected: [null, maximum],
    passed: Number.isFinite(value) && value <= maximum,
  };
}

function minCheck(row, metric, minimum) {
  const value = row[metric];
  return {
    id: `${row.eraId}.${metric}`,
    eraId: row.eraId,
    metric,
    value,
    expected: [minimum, null],
    passed: Number.isFinite(value) && value >= minimum,
  };
}

function rate(values, predicate) {
  return values.length > 0 ? values.reduce((sum, value) => sum + Number(Boolean(predicate(value))), 0) / values.length : null;
}

function mean(values) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}
