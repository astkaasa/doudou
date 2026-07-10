import { performance } from 'node:perf_hooks';

import { analyzeFleetPlan } from '../src/domain/fleetPlanning.js';
import { assertGameState } from '../src/domain/invariants.js';
import { analyzeRouteDiagnostics } from '../src/domain/routeDiagnostics.js';
import { serializeGameState } from '../src/domain/save.js';
import { advanceTurnState } from '../src/domain/turn.js';
import { previewNextQuarter } from '../src/domain/turnPreview.js';
import { createLongGameFixture } from '../src/simulation/longGame.js';

const json = process.argv.includes('--json');
const strict = process.argv.includes('--strict');
const startedAt = performance.now();
const fixture = createLongGameFixture();
const generationMs = performance.now() - startedAt;
const serialized = JSON.stringify(serializeGameState(fixture.state));

const managementDurations = [];
let managementSnapshot = null;
for (let index = 0; index < 10; index += 1) {
  const managementStartedAt = performance.now();
  const routeDiagnostics = analyzeRouteDiagnostics(fixture.state);
  const fleetPlan = analyzeFleetPlan(fixture.state);
  const turnPreview = previewNextQuarter(fixture.state);
  managementDurations.push(performance.now() - managementStartedAt);
  managementSnapshot ||= {
    routeDiagnostics: routeDiagnostics.counts,
    fleetPlan: fleetPlan.summary,
    nextQuarter: {
      period: `${turnPreview.nextPeriod.year} Q${turnPreview.nextPeriod.quarter}`,
      attentionCount: turnPreview.attentionCount,
      knownChangeCount: turnPreview.knownChangeCount,
      staticProfit: round(turnPreview.financials.profit),
    },
  };
}
if (JSON.stringify(serializeGameState(fixture.state)) !== serialized) {
  throw new Error('Management previews mutated the long-game fixture');
}

const turnDurations = [];
for (let index = 0; index < 10; index += 1) {
  const state = structuredClone(fixture.state);
  const turnStartedAt = performance.now();
  const report = advanceTurnState(state);
  turnDurations.push(performance.now() - turnStartedAt);
  if (!report) throw new Error('Long-game fixture could not advance a quarter');
  assertGameState(state);
}

const output = {
  config: fixture.config,
  summary: fixture.summary,
  result: {
    survived: fixture.result.survived,
    victoryTurn: fixture.result.victoryTurn,
    companyValue: fixture.result.companyValue,
  },
  management: managementSnapshot,
  performance: {
    generationMs: round(generationMs),
    serializedBytes: Buffer.byteLength(serialized),
    advanceTurnMedianMs: round(median(turnDurations)),
    advanceTurnMaxMs: round(Math.max(...turnDurations)),
    managementPreviewMedianMs: round(median(managementDurations)),
    managementPreviewMaxMs: round(Math.max(...managementDurations)),
  },
};

if (strict) assertAcceptance(output);

if (json) console.log(JSON.stringify(output, null, 2));
else {
  console.table([{ ...output.summary, ...output.performance }]);
  console.log(`Survived: ${output.result.survived ? 'yes' : 'no'} · victory turn: ${output.result.victoryTurn || '-'} · company value: ${output.result.companyValue.toFixed(1)}M`);
  if (strict) console.log('long-game acceptance: passed');
}

function assertAcceptance(result) {
  const failures = [];
  if (result.summary.turnsPlayed !== 200) failures.push(`expected 200 turns, got ${result.summary.turnsPlayed}`);
  if (result.summary.routes < 60 || result.summary.routes > 90) failures.push(`route density ${result.summary.routes} outside 60-90`);
  if (result.summary.fleet < 80 || result.summary.fleet > 120) failures.push(`fleet density ${result.summary.fleet} outside 80-120`);
  if (result.summary.branches < 6) failures.push(`branch density ${result.summary.branches} below 6`);
  if (!result.result.survived) failures.push('fixture did not survive 200 turns');
  if (result.performance.serializedBytes > 1_000_000) failures.push(`serialized state ${result.performance.serializedBytes} bytes exceeds 1 MB`);
  if (result.performance.advanceTurnMaxMs > 1_000) failures.push(`quarter advance ${result.performance.advanceTurnMaxMs}ms exceeds 1000ms`);
  if (result.performance.managementPreviewMaxMs > 1_000) failures.push(`management preview ${result.performance.managementPreviewMaxMs}ms exceeds 1000ms`);
  if (failures.length > 0) throw new Error(`Long-game acceptance failed:\n- ${failures.join('\n- ')}`);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
