import { describe, expect, it } from 'vitest';

import { repayLoan } from '../src/domain/loans.js';
import { initState } from '../src/domain/state.js';

describe('loan operations', () => {
  it('rejects repayments when there is no cash to pay', () => {
    const state = initState('beijing', 'era3');
    state.loan = 10;
    state.cash = 0;

    const result = repayLoan(state, 5);

    expect(result.ok).toBe(false);
    expect(state.loan).toBe(10);
    expect(state.cash).toBe(0);
  });

  it('allows partial repayments up to available cash', () => {
    const state = initState('beijing', 'era3');
    state.loan = 10;
    state.cash = 3;

    const result = repayLoan(state, 10);

    expect(result.ok).toBe(true);
    expect(result.amount).toBe(3);
    expect(state.loan).toBe(7);
    expect(state.cash).toBe(0);
  });
});
