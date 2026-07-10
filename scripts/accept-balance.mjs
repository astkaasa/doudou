import { writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';

import { buildAcceptanceReport } from '../src/simulation/acceptance.js';
import { createSimulationJobs, simulateGame } from '../src/simulation/balance.js';

if (isMainThread) await runMain();
else runWorker();

async function runMain() {
  const options = parseArgs(process.argv.slice(2));
  const jobs = createSimulationJobs(options);
  const workerCount = Math.max(1, Math.min(options.workers, jobs.length));
  const chunks = Array.from({ length: workerCount }, () => []);
  jobs.forEach((job, index) => chunks[index % workerCount].push({ index, job }));
  const startedAt = Date.now();
  let completed = 0;
  let nextProgress = 0.1;
  const batches = await Promise.all(chunks.map((chunk) => runWorkerThread(chunk, (count) => {
    completed += count;
    const progress = completed / jobs.length;
    if (!options.json && progress >= nextProgress) {
      console.error(`Balance matrix: ${completed}/${jobs.length} (${Math.round(progress * 100)}%)`);
      nextProgress += 0.1;
    }
  })));
  const results = batches.flat().sort((a, b) => a.index - b.index).map((item) => item.result);
  const report = buildAcceptanceReport(results);
  const output = {
    options: { ...options, workers: workerCount },
    durationMs: Date.now() - startedAt,
    report,
    results,
  };

  if (options.output) await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  if (options.json) console.log(JSON.stringify(output, null, 2));
  else printReport(output);
  if (options.strict && !report.passed) process.exitCode = 1;
}

function runWorker() {
  const results = [];
  let pendingProgress = 0;
  for (const item of workerData.chunk) {
    results.push({ index: item.index, result: simulateGame(item.job) });
    pendingProgress += 1;
    if (pendingProgress >= 5) {
      parentPort.postMessage({ type: 'progress', count: pendingProgress });
      pendingProgress = 0;
    }
  }
  if (pendingProgress > 0) parentPort.postMessage({ type: 'progress', count: pendingProgress });
  parentPort.postMessage({ type: 'complete', results });
}

function runWorkerThread(chunk, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: { chunk } });
    worker.on('message', (message) => {
      if (message.type === 'progress') onProgress(message.count);
      if (message.type === 'complete') resolve(message.results);
    });
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Balance worker exited with code ${code}`));
    });
  });
}

function parseArgs(args) {
  const options = {
    runs: 20,
    seedBase: 'acceptance-v1',
    hqs: 'beijing,dubai,london,newyork,sydney',
    workers: Math.max(1, Math.min(8, availableParallelism() - 1)),
  };
  for (let index = 0; index < args.length; index++) {
    const [key, inlineValue] = args[index].split('=', 2);
    const value = inlineValue ?? args[index + 1];
    if (key === '--json' || key === '--strict') {
      options[key.slice(2)] = true;
      continue;
    }
    if (key === '--runs') options.runs = positiveInteger(value, key);
    else if (key === '--workers') options.workers = positiveInteger(value, key);
    else if (key === '--turns') options.maxTurns = positiveInteger(value, key);
    else if (key === '--era') options.eras = value;
    else if (key === '--policy') options.policies = value;
    else if (key === '--seed') options.seedBase = value;
    else if (key === '--hq') options.hqs = value;
    else if (key === '--output') options.output = value;
    else if (key.startsWith('--')) throw new Error(`Unknown option: ${key}`);
    else continue;
    if (inlineValue === undefined) index += 1;
  }
  return options;
}

function positiveInteger(value, key) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`${key} requires a positive integer`);
  return number;
}

function printReport(output) {
  console.table(output.report.rows.map((row) => ({
    era: row.eraId,
    runs: row.runs,
    survival: percent(row.survival),
    victory: percent(row.victory),
    victoryTurn: fixed(row.victoryTurn),
    routeMargin: percent(row.routeMargin),
    profitMargin: percent(row.profitMargin),
    cashPressure: percent(row.cashPressure),
    nonRoute: percent(row.nonRouteIncome),
    rescue: percent(row.rescueRate),
    liquidations: percent(row.forcedLiquidationRate),
    viablePolicies: row.viablePolicies,
  })));
  const failed = output.report.checks.filter((check) => !check.passed);
  console.log(`Simulated ${output.results.length} games with ${output.options.workers} workers in ${(output.durationMs / 1000).toFixed(2)}s.`);
  const coverage = output.report.coverage;
  console.log(`Matrix coverage: ${coverage.complete ? 'COMPLETE' : 'PARTIAL'} (${coverage.combinations}/${coverage.expectedCombinations} combinations, minimum ${coverage.minimumRuns}/${coverage.requiredRuns} runs)`);
  console.log(output.report.passed ? 'Acceptance: PASS' : `Acceptance: FAIL (${failed.length} metric checks)`);
  failed.forEach((check) => console.log(`- ${check.id}: ${formatValue(check.value)} expected ${formatRange(check.expected)}`));
  if (output.options.output) console.log(`Detailed results: ${output.options.output}`);
}

function percent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '-';
}

function fixed(value) {
  return Number.isFinite(value) ? value.toFixed(1) : '-';
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toFixed(3) : '-';
}

function formatRange([minimum, maximum]) {
  if (minimum === null) return `<= ${maximum}`;
  if (maximum === null) return `>= ${minimum}`;
  return `${minimum}..${maximum}`;
}
