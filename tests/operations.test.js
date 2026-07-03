import { describe, expect, it } from 'vitest';

import { PLANES } from '../src/data/planes.js';
import {
  calcOpsBudgetCost,
  calcOpsEfficiency,
  calcStaffNeeded,
  finishQuarterOperations,
  getRecruitOptions,
  prepareQuarterOperations,
  settleOperationalFaultLosses,
  signBonusContract,
  signRecruitContract,
  syncStaffToNeeded,
} from '../src/domain/operations.js';
import { initState } from '../src/domain/state.js';

describe('operations management', () => {
  it('calculates staff demand and syncs expansion staffing without overfilling', () => {
    const state = initState('beijing', 'era3');
    state.fleet.push({ ...PLANES[0], uid: 1, delivering: false });
    state.routes.push({ from: 'beijing', to: 'shanghai' });
    state.branches.push('tokyo');

    expect(calcStaffNeeded(state)).toBeCloseTo(0.23);

    state.staffCount = 0.05;
    const added = syncStaffToNeeded(state, 0.85);

    expect(added).toBeCloseTo(0.146);
    expect(state.staffCount).toBeCloseTo(0.196);
    expect(state.staffNeeded).toBeCloseTo(0.23);
  });

  it('turns staffing and morale into bounded operations efficiency', () => {
    const state = initState('beijing', 'era3');
    state.staffCount = 1.2;
    state.staffMorale = 80;

    expect(calcOpsEfficiency(state)).toBeCloseTo(1.5);

    state.staffCount = 0.001;
    state.staffMorale = 20;
    expect(calcOpsEfficiency(state)).toBe(0.3);
  });

  it('calculates budget costs and keeps the maintenance trait attached to maintenance budget', () => {
    const state = initState('beijing', 'era3');
    state.routes = [{}, {}];
    state.fleet = [{}, {}, {}];
    state.branches = ['tokyo'];
    state.serviceTier = 'high';
    state.maintTier = 'low';
    state.adTier = 'mid';

    const base = calcOpsBudgetCost(state);
    state.playerTrait = '机';
    const discounted = calcOpsBudgetCost(state);

    expect(base.serviceCost).toBeCloseTo(0.75);
    expect(base.maintCost).toBeCloseTo(0.09);
    expect(base.adCost).toBeCloseTo(0.5);
    expect(discounted.maintCost).toBeCloseTo(base.maintCost * 0.9);
  });

  it('signs recruitment and bonus contracts as immediate cash actions', () => {
    const state = initState('beijing', 'era3');
    state.cash = 100;
    state.routes = Array.from({ length: 5 }, () => ({}));
    state.staffCount = 0.1;
    state.staffMorale = 40;
    state._pendingRecruit = true;
    state._pendingBonus = true;

    const options = getRecruitOptions(state);
    expect(options.find((option) => option.key === 'standard').qty).toBeCloseTo(0.11);

    const recruit = signRecruitContract(state, 'standard');
    expect(recruit.qty).toBeCloseTo(0.11);
    expect(state.cash).toBeCloseTo(99.945);
    expect(state._pendingRecruit).toBe(false);

    const bonus = signBonusContract(state, 'high');
    expect(bonus.morale).toBe(30);
    expect(state.staffMorale).toBe(70);
    expect(state._pendingBonus).toBe(false);
    expect(state.cash).toBeLessThan(99.945);
  });

  it('rolls operational faults, applies revenue loss, and expires accident penalties', () => {
    const state = initState('beijing', 'era3');
    state.fleet = [{ ...PLANES[0], uid: 1, name: 'DC-6', age: 10, delivering: false }];
    state.routes = [{ from: 'beijing', to: 'shanghai', assignedPlanes: [1], revenue: 10 }];
    state.staffNeeded = 0.1;
    state.staffCount = 0.1;
    state.staffMorale = 60;
    state.maintTier = 'mid';
    const rolls = [0, 0.2];

    prepareQuarterOperations(state, () => rolls.shift() ?? 0.5);
    const loss = settleOperationalFaultLosses(state);

    expect(state._faultsThisTurn).toEqual([expect.objectContaining({ severity: 'major', lossPct: 0.5 })]);
    expect(loss).toBeCloseTo(5);
    expect(state.accidentPenalty).toBeCloseTo(-0.05);
    expect(state.accidentPenaltyTurns).toBe(2);

    finishQuarterOperations(state);
    expect(state.accidentPenaltyTurns).toBe(1);
  });
});
