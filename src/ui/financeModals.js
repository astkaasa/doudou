import { fmt, fmtPct } from '../domain/helpers.js';
import { loanInterest, maxLoanAmount, RED_PACKET_AMOUNT } from '../domain/loans.js';
import { showModal } from './modal.js';

export function showLoanModal(state) {
  const loanInfo = (state.loan || 0) > 0
    ? `<div class="loan-info"><div class="loan-row"><span style="color:#7ba3cc">当前贷款</span><span style="color:#f87171;font-weight:700">${fmt(state.loan)}</span></div><div class="loan-row"><span style="color:#7ba3cc">季度利息</span><span style="color:#f87171">${fmt(loanInterest(state))}</span></div><div class="loan-row"><span style="color:#7ba3cc">年利率</span><span>${fmtPct((state.loanRate || 0) * 400)}</span></div></div>`
    : '<div style="color:#556;font-size:13px;padding:8px">暂无贷款</div>';
  const maxLoan = maxLoanAmount(state);
  const redPacketHtml = state.redPacketClaimed
    ? '<div style="background:#33415520;border:1px dashed #556;border-radius:8px;padding:12px;margin:12px 0;text-align:center"><div style="font-size:14px;color:#556">🧧 辣豆红包已领取</div></div>'
    : `<div style="background:linear-gradient(135deg,#dc262620,#ef444420);border:2px solid #dc2626;border-radius:12px;padding:16px;margin:12px 0;text-align:center">
      <div style="font-size:28px;margin-bottom:6px">🧧</div>
      <div style="font-size:16px;font-weight:700;color:#f87171">辣豆红包</div>
      <div style="font-size:12px;color:#7ba3cc;margin:6px 0">一次性领取 ${fmt(RED_PACKET_AMOUNT)} 无息无手续费资金援助</div>
      <button class="btn btn-danger" data-action="confirm-red-packet" style="margin-top:8px;padding:8px 28px;font-size:14px">🧧 领取红包</button>
    </div>`;
  let html = `<h2>银行贷款</h2>${redPacketHtml}<p style="color:#7ba3cc;font-size:13px;margin-bottom:12px">贷款可快速获取资金扩张，但每季度需支付利息。贷款额度与航线和机队规模挂钩。申请贷款需支付贷款额度5%的手续费。</p>${loanInfo}`;
  if (maxLoan > 0) {
    html += '<h3>申请贷款</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">';
    let hasLoanOption = false;
    [10, 20, 50, 100].forEach((amount) => {
      if (amount <= maxLoan) {
        hasLoanOption = true;
        html += `<button class="btn btn-warning btn-sm" data-action="confirm-loan" data-amount="${amount}">$${amount}M</button>`;
      }
    });
    if (!hasLoanOption) {
      const cappedAmount = Number(maxLoan.toFixed(2));
      html += `<button class="btn btn-warning btn-sm" data-action="confirm-loan" data-amount="${cappedAmount}">贷满 ${fmt(cappedAmount)}</button>`;
    }
    html += `</div><div style="font-size:11px;color:#556">可贷额度: $${maxLoan.toFixed(0)}M · 季利率 ${fmtPct((state.loanRate || 0) * 100)} · 手续费 5%</div>`;
  } else if ((state.loan || 0) <= 0) {
    html += '<div style="font-size:13px;color:#556">需先开通航线或购买飞机以获取信用额度</div>';
  }
  if ((state.loan || 0) > 0) {
    html += '<h3>还款</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">';
    const repayable = Math.min(state.loan || 0, state.cash);
    let hasRepayOption = false;
    [5, 10, 20].forEach((amount) => {
      if (amount <= state.loan && amount <= state.cash) {
        hasRepayOption = true;
        html += `<button class="btn btn-success btn-sm" data-action="repay-loan" data-amount="${amount}">还 $${amount}M</button>`;
      }
    });
    if (state.cash >= state.loan) {
      hasRepayOption = true;
      html += `<button class="btn btn-success btn-sm" data-action="repay-loan" data-amount="${state.loan}">全部还清 ${fmt(state.loan)}</button>`;
    } else if (!hasRepayOption && repayable > 0) {
      html += `<button class="btn btn-success btn-sm" data-action="repay-loan" data-amount="${repayable}">尽力还款 ${fmt(repayable)}</button>`;
    } else if (repayable <= 0) {
      html += '<span style="font-size:12px;color:#f87171">现金不足，暂时无法还款</span>';
    }
    html += '</div>';
  }
  html += '<div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="close-modal">关闭</button></div>';
  showModal(html);
}

export function showLoanConfirm(state, amount) {
  const fee = amount * 0.05;
  const quarterlyInterest = amount * (state.loanRate || 0);
  const annualRate = fmtPct((state.loanRate || 0) * 400);
  showModal(`<h2>确认贷款</h2><div class="loan-info">
    <div class="loan-row"><span style="color:#7ba3cc">贷款金额</span><span style="font-weight:700">$${amount}M</span></div>
    <div class="loan-row"><span style="color:#7ba3cc">手续费 (5%)</span><span style="color:#f87171;font-weight:700">-${fmt(fee)}</span></div>
    <div class="loan-row"><span style="color:#7ba3cc">实际到账</span><span style="color:#4ade80;font-weight:700">${fmt(amount - fee)}</span></div>
    <div class="loan-row"><span style="color:#7ba3cc">季度利息</span><span>-${fmt(quarterlyInterest)}</span></div>
    <div class="loan-row"><span style="color:#7ba3cc">年利率</span><span>${annualRate}</span></div>
  </div><div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end"><button class="btn" style="background:#334155;color:#e0e8f0" data-action="open-loan-modal">取消</button><button class="btn btn-warning" data-action="take-loan" data-amount="${amount}">确认贷款</button></div>`);
}

export function showRedPacketConfirm() {
  showModal(`<h2>🧧 领取辣豆红包</h2>
    <div style="background:linear-gradient(135deg,#dc262620,#ef444420);border:2px solid #dc262660;border-radius:12px;padding:20px;text-align:center;margin:12px 0">
      <div style="font-size:48px;margin-bottom:8px">🧧</div>
      <div style="font-size:22px;font-weight:900;color:#f87171">${fmt(RED_PACKET_AMOUNT)}</div>
      <div style="font-size:13px;color:#7ba3cc;margin-top:4px">无利息 · 无手续费 · 一次性领取</div>
    </div>
    <div style="background:#fbbf2420;border:1px solid #fbbf2460;border-radius:8px;padding:12px;margin:12px 0;text-align:center">
      <div style="font-size:14px;color:#fbbf24;font-weight:700">红包只能领取一次，请慎重考虑。</div>
      <div style="font-size:12px;color:#7ba3cc;margin-top:4px">确认后将立即到账，此操作不可撤销。</div>
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:center">
      <button class="btn" style="background:#334155;color:#e0e8f0;padding:8px 24px" data-action="open-loan-modal">再想想</button>
      <button class="btn btn-danger" data-action="claim-red-packet" style="padding:8px 24px;font-size:14px">🧧 确认领取</button>
    </div>`);
}
