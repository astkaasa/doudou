import { performance } from 'node:perf_hooks';

import { assertGameState } from '../src/domain/invariants.js';
import { serializeGameState } from '../src/domain/save.js';
import { advanceTurnState } from '../src/domain/turn.js';
import { createLongGameFixture } from '../src/simulation/longGame.js';

const json = process.argv.includes('--json');
const startedAt = performance.now();
const fixture = createLongGameFixture();
const generationMs = performance.now() - startedAt;
const serialized = JSON.stringify(serializeGameState(fixture.state));

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
  performance: {
    generationMs: round(generationMs),
    serializedBytes: Buffer.byteLength(serialized),
    advanceTurnMedianMs: round(median(turnDurations)),
    advanceTurnMaxMs: round(Math.max(...turnDurations)),
  },
};

if (json) console.log(JSON.stringify(output, null, 2));
else {
  console.table([{ ...output.summary, ...output.performance }]);
  console.log(`Survived: ${output.result.survived ? 'yes' : 'no'} · victory turn: ${output.result.victoryTurn || '-'} · company value: ${output.result.companyValue.toFixed(1)}M`);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
