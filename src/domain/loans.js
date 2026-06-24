export const RED_PACKET_AMOUNT = 1000;

export function maxLoanAmount(state) {
  return Math.max(0, state.routes.length * 15 + state.fleet.length * 10 - (state.loan || 0));
}

export function loanInterest(state) {
  return (state.loan || 0) * (state.loanRate || 0);
}

export function takeLoan(state, amount) {
  const safeAmount = Number(amount);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) return { ok: false, message: '贷款金额无效' };
  if (safeAmount > maxLoanAmount(state)) return { ok: false, message: '超过可贷额度' };
  const fee = safeAmount * 0.05;
  state.cash += safeAmount - fee;
  state.loan = (state.loan || 0) + safeAmount;
  return { ok: true, amount: safeAmount, fee };
}

export function repayLoan(state, amount) {
  const safeAmount = Number(amount);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) return { ok: false, message: '还款金额无效' };
  if ((state.loan || 0) <= 0) return { ok: false, message: '没有需要偿还的贷款' };
  if (state.cash <= 0) return { ok: false, message: '现金不足，无法还款' };
  const repay = Math.min(safeAmount, state.loan || 0, state.cash);
  if (repay <= 0) return { ok: false, message: '现金不足，无法还款' };
  state.cash -= repay;
  state.loan = (state.loan || 0) - repay;
  if (state.loan < 0.0001) state.loan = 0;
  return { ok: true, amount: repay };
}

export function claimRedPacket(state) {
  if (state.redPacketClaimed) return { ok: false, message: '红包已领取' };
  state.cash += RED_PACKET_AMOUNT;
  state.redPacketClaimed = true;
  return { ok: true, amount: RED_PACKET_AMOUNT };
}
