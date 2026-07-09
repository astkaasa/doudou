import { ANGEL_INVEST_MAX, ANGEL_INVEST_MIN, ANGEL_INVEST_STEP } from './constants.js';
import { randomInt } from './random.js';

export function angelInvestmentAmounts() {
  const amounts = [];
  for (let amount = ANGEL_INVEST_MIN; amount <= ANGEL_INVEST_MAX; amount += ANGEL_INVEST_STEP) {
    amounts.push(amount);
  }
  return amounts;
}

export function pickAngelInvestmentAmount(state) {
  const amounts = angelInvestmentAmounts();
  return amounts[randomInt(state, 0, amounts.length - 1)];
}

export function applyAngelInvestment(state, amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < ANGEL_INVEST_MIN || numericAmount > ANGEL_INVEST_MAX) {
    return { ok: false, message: '天使投资金额无效' };
  }
  state.cash = numericAmount;
  return { ok: true, amount: numericAmount };
}
