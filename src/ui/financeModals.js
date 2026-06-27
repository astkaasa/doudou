import { fmt, fmtPct } from '../domain/helpers.js';
import { loanInterest, maxLoanAmount } from '../domain/loans.js';
import { showModal } from './modal.js';

export function showLoanModal(state) {
  const loanInfo = (state.loan || 0) > 0
    ? `<div class="loan-info"><div class="loan-row"><span style="color:#7ba3cc">当前贷款</span><span style="color:#f87171;font-weight:700">${fmt(state.loan)}</span></div><div class="loan-row"><span style="color:#7ba3cc">季度利息</span><span style="color:#f87171">${fmt(loanInterest(state))}</span></div><div class="loan-row"><span style="color:#7ba3cc">年利率</span><span>${fmtPct((state.loanRate || 0) * 400)}</span></div></div>`
    : '<div style="color:#556;font-size:13px;padding:8px">暂无贷款</div>';
  const maxLoan = maxLoanAmount(state);
  let html = `<h2>银行贷款</h2><p style="color:#7ba3cc;font-size:13px;margin-bottom:12px">贷款可快速获取资金扩张，但每季度需支付利息。贷款额度与航线和机队规模挂钩。申请贷款需支付贷款额度5%的手续费。</p>${loanInfo}`;
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
