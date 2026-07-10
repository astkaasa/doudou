import { describe, expect, it } from 'vitest';

import {
  buildEraSettlementResult,
  continueEraInSandbox,
  eraSettlementDeadlineTurns,
  hasPendingEraSettlement,
  hasRetiredEraSettlement,
  normalizeEraSettlementState,
  retireAtEraEnd,
  settleEraIfDue,
} from '../src/domain/eraSettlement.js';
import { initState } from '../src/domain/state.js';
import { buildEraSettlementHtml } from '../src/ui/eraSettlement.js';

describe('era settlement', () => {
  it('derives the advertised scenario horizon', () => {
    expect(eraSettlementDeadlineTurns(initState('beijing', 'era1'))).toBe(80);
    expect(eraSettlementDeadlineTurns(initState('beijing', 'era4'))).toBe(240);
  });

  it('settles once at the deadline and blocks until the player chooses', () => {
    const state = initState('beijing', 'era2');
    state.turnsPlayed = 79;

    expect(settleEraIfDue(state)).toBeNull();
    state.turnsPlayed = 80;
    const update = settleEraIfDue(state);

    expect(update).toMatchObject({
      type: 'era_settlement',
      eraId: 'era2',
      deadlineTurn: 80,
      outcome: 'foundation',
    });
    expect(hasPendingEraSettlement(state)).toBe(true);
    expect(settleEraIfDue(state)).toBeNull();
  });

  it('supports sandbox continuation or final retirement', () => {
    const sandbox = initState('beijing', 'era3');
    sandbox.turnsPlayed = 80;
    settleEraIfDue(sandbox);

    expect(continueEraInSandbox(sandbox).ok).toBe(true);
    expect(sandbox.eraSettlement.status).toBe('continued');
    expect(sandbox.gameOver).toBe(false);

    const retired = initState('beijing', 'era3');
    retired.turnsPlayed = 80;
    settleEraIfDue(retired);

    expect(retireAtEraEnd(retired).ok).toBe(true);
    expect(retired.eraSettlement.status).toBe('retired');
    expect(hasRetiredEraSettlement(retired)).toBe(true);
    expect(retired.gameOver).toBe(true);
  });

  it('captures main quest victory in the final result', () => {
    const state = initState('beijing', 'era4');
    state.mainQuest = {
      currentStage: 3,
      stageCompleted: [1, 2, 3],
      victoryGrade: 'A',
      victoryTurn: 120,
    };

    expect(buildEraSettlementResult(state)).toMatchObject({
      outcome: 'victory',
      victoryGrade: 'A',
      completedStages: 3,
      baseRegions: 1,
    });
  });

  it('renders a mandatory settlement choice with stable actions', () => {
    const state = initState('beijing', 'era2');
    state.turnsPlayed = 80;
    settleEraIfDue(state);

    const html = buildEraSettlementHtml(state);

    expect(html).toContain('时代航程结算');
    expect(html).toContain('data-action="retire-era"');
    expect(html).toContain('data-action="continue-era-sandbox"');
    expect(html).not.toContain('data-action="modal-backdrop"');
  });

  it('repairs retired and malformed result fields consistently', () => {
    const state = initState('beijing', 'era2');
    state.turnsPlayed = 80;
    state.eraSettlement = {
      status: 'retired',
      settledTurn: 80,
      result: { outcome: 'victory', victoryGrade: 'Z' },
    };

    const settlement = normalizeEraSettlementState(state);

    expect(settlement.result.victoryGrade).toBeNull();
    expect(state.gameOver).toBe(true);
  });
});
