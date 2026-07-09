import { aggregateSimulationResults, BALANCE_POLICIES, simulateBatch } from '../src/simulation/balance.js';

const options = parseArgs(process.argv.slice(2));
const startedAt = Date.now();
const results = simulateBatch(options);
const summary = aggregateSimulationResults(results);

if (options.json) {
  console.log(JSON.stringify({ options, durationMs: Date.now() - startedAt, summary, results }, null, 2));
} else {
  console.table(summary.map((row) => ({
    era: row.eraId,
    policy: row.policyId,
    runs: row.runs,
    survival: percent(row.survivalRate),
    victory: percent(row.victoryRate),
    rescue: percent(row.rescueRate),
    turns: fixed(row.avgTurns),
    cash: fixed(row.avgEndCash),
    minCash: fixed(row.avgMinCash),
    value: fixed(row.avgCompanyValue),
    routes: fixed(row.avgRoutes),
    fleet: fixed(row.avgFleet),
    margin: percent(row.avgProfitMargin),
    profitable: percent(row.avgProfitableTurnRate),
    liquidations: fixed(row.avgForcedLiquidations),
  })));
  console.log(`Simulated ${results.length} games in ${((Date.now() - startedAt) / 1000).toFixed(2)}s.`);
}

function parseArgs(args) {
  const options = { runs: 5, seedBase: 'balance-v1' };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    const [key, inlineValue] = arg.split('=', 2);
    const value = inlineValue ?? args[index + 1];
    if (key === '--json') {
      options.json = true;
      continue;
    }
    if (key === '--runs') options.runs = Number(value);
    else if (key === '--turns') options.maxTurns = Number(value);
    else if (key === '--era') options.eras = value;
    else if (key === '--policy') options.policies = value;
    else if (key === '--seed') options.seedBase = value;
    else if (key === '--list-policies') {
      console.log(Object.values(BALANCE_POLICIES).map((policy) => `${policy.id}: ${policy.label}`).join('\n'));
      process.exit(0);
    } else if (key.startsWith('--')) {
      throw new Error(`Unknown option: ${key}`);
    } else {
      continue;
    }
    if (inlineValue === undefined) index += 1;
  }
  return options;
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function fixed(value) {
  return Number(value).toFixed(1);
}
