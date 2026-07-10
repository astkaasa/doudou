import { describe, expect, it } from 'vitest';

import { assertGameState } from '../src/domain/invariants.js';
import { createLongGameFixture, summarizeLongGameState } from '../src/simulation/longGame.js';

describe('long-game fixture', () => {
  it('reaches the target management density through normal domain rules', () => {
    const fixture = createLongGameFixture();

    expect(fixture.summary).toMatchObject({
      turnsPlayed: 200,
      period: '2010 Q1',
    });
    expect(fixture.summary.routes).toBeGreaterThanOrEqual(60);
    expect(fixture.summary.routes).toBeLessThanOrEqual(90);
    expect(fixture.summary.fleet).toBeGreaterThanOrEqual(80);
    expect(fixture.summary.fleet).toBeLessThanOrEqual(120);
    expect(fixture.summary.branches).toBeGreaterThanOrEqual(6);
    expect(() => assertGameState(fixture.state)).not.toThrow();
  }, 15_000);

  it('classifies route and fleet management pressure independently', () => {
    const summary = summarizeLongGameState({
      year: 2005,
      quarter: 3,
      turnsPlayed: 20,
      branches: ['paris'],
      subsidiaries: { paris: [{ type: 'hotel' }] },
      routes: [
        { assignedPlanes: [1], loadFactor: 0.45, profit: -1, suspended: false },
        { assignedPlanes: [2], loadFactor: 0.8, profit: 2, suspended: true },
        { assignedPlanes: [], loadFactor: 0.9, profit: 1, suspended: false },
      ],
      fleet: [
        { uid: 1, isLease: false, age: 24 },
        { uid: 2, isLease: true, leaseTurns: 38, maxLeaseTurns: 40 },
        { uid: 3, isLease: false, age: 4, delivering: false },
        { uid: 4, isLease: false, age: 0, delivering: true },
      ],
    });

    expect(summary).toMatchObject({
      period: '2005 Q3',
      routes: 3,
      activeRoutes: 2,
      suspendedRoutes: 1,
      lossRoutes: 1,
      lowLoadRoutes: 1,
      unassignedRoutes: 1,
      fleet: 4,
      idlePlanes: 1,
      deliveringPlanes: 1,
      leasesExpiringWithinFourQuarters: 1,
      ownedPlanesRetiringWithinTwoYears: 1,
      branches: 1,
      subsidiaries: 1,
    });
  });
});
