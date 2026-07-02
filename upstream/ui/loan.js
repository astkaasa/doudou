// ===== LOAN SYSTEM =====
function openLoanModal(){
  const loanInfo=G.loan>0?`<div class="loan-info"><div class="loan-row"><span style="color:#7ba3cc">当前贷款</span><span style="color:#f87171;font-weight:700">${fmt(G.loan)}</span></div><div class="loan-row"><span style="color:#7ba3cc">季度利息</span><span style="color:#f87171">${fmt(G.loan*G.loanRate)}</span></div><div class="loan-row"><span style="color:#7ba3cc">年利率</span><span>${fmtPct(G.loanRate*400)}</span></div></div>`:'<div style="color:#556;font-size:13px;padding:8px">暂无贷款</div>';
  const maxLoan=Math.max(0,G.routes.length*15+G.fleet.length*10-G.loan);
  // Red packet section
  const rpClaimed=G.redPacketClaimed||false;
  let redPacketHtml='';
  if(!rpClaimed){
    redPacketHtml=`<div style="background:linear-gradient(135deg,#dc262620,#ef444420);border:2px solid #dc2626;border-radius:12px;padding:16px;margin:12px 0;text-align:center">
      <div style="font-size:28px;margin-bottom:6px">🧧</div>
      <div style="font-size:16px;font-weight:700;color:#f87171">辣豆红包</div>
      <div style="font-size:12px;color:#7ba3cc;margin:6px 0">一次性领取 $1000M 无息无手续费资金援助</div>
      <button class="btn btn-danger" onclick="confirmClaimRedPacket()" style="margin-top:8px;padding:8px 28px;font-size:14px">🧧 领取红包</button>
    </div>`;
  } else {
    redPacketHtml=`<div style="background:#33415520;border:1px dashed #556;border-radius:8px;padding:12px;margin:12px 0;text-align:center">
      <div style="font-size:14px;color:#556">🧧 辣豆红包已领取</div>
    </div>`;
  }
  let html=`<h2>银行贷款</h2><p style="color:#7ba3cc;font-size:13px;margin-bottom:12px">贷款可快速获取资金扩张，但每季度需支付利息。贷款额度与航线和机队规模挂钩。申请贷款需支付贷款额度5%的手续费。</p>${loanInfo}`;
  if(maxLoan>0){
    html+=`<h3>申请贷款</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">`;
    [10,20,50,100].forEach(amt=>{
      if(amt<=maxLoan){
        const fee=(amt*0.05).toFixed(1);
        html+=`<button class="btn btn-warning btn-sm" onclick="confirmLoan(${amt})">$${amt}M</button>`;
      }
    });
    html+=`</div><div style="font-size:11px;color:#556">可贷额度: $${maxLoan.toFixed(0)}M · 季利率 ${fmtPct(G.loanRate*100)} · 手续费 5%</div>`;
  }else if(G.loan<=0){
    html+=`<div style="font-size:13px;color:#556">需先开通航线或购买飞机以获取信用额度</div>`;
  }
  if(G.loan>0){
    html+=`<h3>还款</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">`;
    [5,10,20].forEach(amt=>{
      if(amt<=G.loan&&amt<=G.cash){
        html+=`<button class="btn btn-success btn-sm" onclick="repayLoan(${amt})">还 $${amt}M</button>`;
      }
    });
    if(G.cash>=G.loan){
      html+=`<button class="btn btn-success btn-sm" onclick="repayLoan(${G.loan})">全部还清 ${fmt(G.loan)}</button>`;
    }
    html+=`</div>`;
  }
  html+=redPacketHtml;
  html+=`<div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" onclick="closeModal()">关闭</button></div>`;
  showModal(html);
}
function confirmLoan(amount){
  const fee=amount*0.05;
  const quarterlyInterest=(amount*G.loanRate).toFixed(2);
  const annualRate=fmtPct(G.loanRate*400);
  let html=`<h2>确认贷款</h2><div class="loan-info">
    <div class="loan-row"><span style="color:#7ba3cc">贷款金额</span><span style="font-weight:700">$${amount}M</span></div>
    <div class="loan-row"><span style="color:#7ba3cc">手续费 (5%)</span><span style="color:#f87171;font-weight:700">-$${fee.toFixed(1)}M</span></div>
    <div class="loan-row"><span style="color:#7ba3cc">实际到账</span><span style="color:#4ade80;font-weight:700">$${(amount-fee).toFixed(1)}M</span></div>
    <div class="loan-row"><span style="color:#7ba3cc">季度利息</span><span>-$${quarterlyInterest}M</span></div>
    <div class="loan-row"><span style="color:#7ba3cc">年利率</span><span>${annualRate}</span></div>
  </div><div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end"><button class="btn" style="background:#334155;color:#e0e8f0" onclick="openLoanModal()">取消</button><button class="btn btn-warning" onclick="takeLoan(${amount})">确认贷款</button></div>`;
  showModal(html);
}
function takeLoan(amount){
  const fee=amount*0.05;
  G.cash+=(amount-fee);G.loan+=amount;
  updateHUD();openLoanModal();
  showBanner(`贷款 $${amount}M 已到账（手续费 $${fee.toFixed(1)}M）`,'#b45309');
  updateMilestones();
}
function confirmClaimRedPacket(){
  let html=`<h2>🧧 领取辣豆红包</h2>
    <div style="background:linear-gradient(135deg,#dc262620,#ef444420);border:2px solid #dc262660;border-radius:12px;padding:20px;text-align:center;margin:12px 0">
      <div style="font-size:48px;margin-bottom:8px">🧧</div>
      <div style="font-size:22px;font-weight:900;color:#f87171">$1000M</div>
      <div style="font-size:13px;color:#7ba3cc;margin-top:4px">无利息 · 无手续费 · 一次性领取</div>
    </div>
    <div style="background:#fbbf2420;border:1px solid #fbbf2460;border-radius:8px;padding:12px;margin:12px 0;text-align:center">
      <div style="font-size:14px;color:#fbbf24;font-weight:700">⚠️ 只能领取1次，可能影响正常游戏体验，请慎重考虑！</div>
      <div style="font-size:12px;color:#7ba3cc;margin-top:4px">确认后将立即到账 $1000M，此操作不可撤销。</div>
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:center">
      <button class="btn" style="background:#334155;color:#e0e8f0;padding:8px 24px" onclick="openLoanModal()">再想想</button>
      <button class="btn btn-danger" onclick="claimRedPacket()" style="padding:8px 24px;font-size:14px">🧧 确认领取</button>
    </div>`;
  showModal(html);
}
function claimRedPacket(){
  G.cash+=1000;
  G.redPacketClaimed=true;
  updateHUD();
  showBanner('🧧 辣豆红包 $1000M 已到账！','#dc2626');
  openLoanModal();
  updateMilestones();
}
function repayLoan(amount){
  const repay=Math.min(amount,G.loan,G.cash);
  G.cash-=repay;G.loan-=repay;
  updateHUD();openLoanModal();
  showBanner(`还款 $${repay}M`,'#16a34a');
}
