function buildFinancialReportHtml(rev,cost,profit,settledYear,settledQuarter){
  const color=profit>=0?'#4ade80':'#f87171';
  let loanInfo='';
  if(G.loan>0)loanInfo=`<div class="report-row"><span>贷款利息</span><span style="color:#f87171">-${fmt(G.loan*G.loanRate)}</span></div>`;
  let traitInfo='';
  if(G.playerTrait==='辣'&&G._lastTraitFund>0)traitInfo=`<div class="report-row"><span>辣豆基金 🪙</span><span style="color:#fbbf24">+${fmt(G._lastTraitFund)}</span></div>`;
  // 标题标注实际结算的季度（上季度），不是当前季度
  const sy=settledYear||G.year, sq=settledQuarter||G.quarter;
  let html=`<h2>上季财报 — ${sy} Q${sq} ${seasonEmoji(sq)}${seasonName(sq)}</h2>`;
  html+=`<div class="report-section"><div class="report-row"><span>航线收入</span><span style="color:#4ade80">${fmt(rev)}</span></div>${traitInfo}<div class="report-row"><span>运营成本</span><span style="color:#f87171">-${fmt(cost)}</span></div>${loanInfo}<div class="report-total" style="color:${color}">净利润: ${fmt(profit)}</div></div>
    <div class="report-section"><div class="report-row"><span>现金余额</span><span>${fmt(G.cash)}</span></div>${G.loan>0?`<div class="report-row"><span>贷款余额</span><span style="color:#f87171">${fmt(G.loan)}</span></div>`:''}<div class="report-row"><span>航线数</span><span>${G.routes.length}</span></div><div class="report-row"><span>机队规模</span><span>${G.fleet.length} 架 (购${countBoughtPlanes()} / 租${countLeasedPlanes()})</span></div><div class="report-row"><span>品牌等级</span><span>${'★'.repeat(Math.min(5,Math.floor(G.brand)))}</span></div><div class="report-row"><span>油价</span><span>$${G.oilPrice.toFixed(0)}/桶</span></div></div>`;
  if(G.routes.length>0){
    html+=`<h3 style="font-size:13px;color:#7ba3cc;margin:8px 0 4px">🛫 航线收益</h3><div class="report-section">`;
    // Group routes by departure base city (HQ or branches)
    const baseCities=[G.hq,...(G.branches||[])];
    const cityRevenue={};
    // Also track non-base city departures
    G.routes.forEach(r=>{
      const fromBase=baseCities.includes(r.from)?r.from:r.to;
      const cityName=getCity(fromBase)?getCity(fromBase).name:fromBase;
      if(!cityRevenue[fromBase])cityRevenue[fromBase]={name:cityName,isHQ:fromBase===G.hq,revenue:0,cost:0,profit:0,routeCount:0};
      cityRevenue[fromBase].revenue+=r.revenue;
      cityRevenue[fromBase].cost+=r.cost;
      cityRevenue[fromBase].profit+=r.profit;
      cityRevenue[fromBase].routeCount++;
    });
    // Sort: HQ first, then by profit descending
    const sorted=Object.values(cityRevenue).sort((a,b)=>(b.isHQ?1:0)-(a.isHQ?1:0)||b.profit-a.profit);
    sorted.forEach(c=>{
      const rc=c.profit>=0?'#4ade80':'#f87171';
      const tag=c.isHQ?'⌂ 总部':'⑂ 分部';
      html+=`<div class="report-row"><span>${tag} ${c.name} (${c.routeCount}线)</span><span style="color:${rc}">${fmt(c.profit)}</span></div>`;
    });
    html+=`</div>`;
  }
  // Delivery notification: aggregate by plane model
  if(G.deliveredThisTurn&&G.deliveredThisTurn.length>0){
    const counts={};
    G.deliveredThisTurn.forEach(p=>{counts[p.name]=(counts[p.name]||0)+1;});
    const names=Object.entries(counts).map(([name,count])=>count>1?`${name} x${count}`:name).join('、');
    html+=`<div style="text-align:center;margin:10px 0 0;padding:8px 12px;background:#16a34a18;border:1px solid #16a34a50;border-radius:8px;font-size:13px"><span style="color:#4ade80;font-weight:600">✈ 交付完成:</span> <span style="color:#e0e8f0">${names}</span></div>`;
  }
  // Lease expiry notification: aggregate by plane model
  if(G.leaseExpiredThisTurn&&G.leaseExpiredThisTurn.length>0){
    const counts={};
    G.leaseExpiredThisTurn.forEach(p=>{counts[p.name]=(counts[p.name]||0)+1;});
    const names=Object.entries(counts).map(([name,count])=>count>1?`${name} x${count}`:name).join('、');
    html+=`<div style="text-align:center;margin:10px 0 0;padding:8px 12px;background:#d9770618;border:1px solid #d9770650;border-radius:8px;font-size:13px"><span style="color:#fbbf24;font-weight:600">📋 租赁到期:</span> <span style="color:#e0e8f0">${names}</span><span style="color:#f87171;font-size:11px;margin-left:6px">已自动退租</span></div>`;
  }
  // Branch completion notification
  if(G._lastBranchCompleted&&G._lastBranchCompleted.length>0){
    const names=G._lastBranchCompleted.map(b=>getCity(b.cityId).name).join('、');
    html+=`<div style="text-align:center;margin:10px 0 0;padding:8px 12px;background:#7c3aed18;border:1px solid #7c3aed50;border-radius:8px;font-size:13px"><span style="color:#a78bfa;font-weight:600">🏗 分部完工:</span> <span style="color:#e0e8f0">${names}</span><span style="color:#4ade80;font-size:11px;margin-left:6px">可开通航线</span></div>`;
  }
  // ── 投资收益分区 ──
  if(G.stocks&&Object.keys(G.portfolio).length>0){
    const pv=calcPortfolioValue();
    const pvlColor=pv.floatingPnL>=0?'#ef4444':'#22c55e';
    const pvlSign=pv.floatingPnL>=0?'+':'';
    const dividend=G._lastStockDividend||0;
    html+=`<h3 style="font-size:13px;color:#7ba3cc;margin:8px 0 4px">📈 投资收益</h3>
      <div class="report-section">
        <div class="report-row"><span>持仓市值</span><span>$${pv.marketValue.toFixed(1)}M</span></div>
        <div class="report-row"><span>本季浮盈</span><span style="color:${pvlColor}">${pvlSign}$${pv.floatingPnL.toFixed(1)}M</span></div>
        ${dividend>0?`<div class="report-row"><span>本季分红(Q4)</span><span style="color:#fbbf24">+$${dividend.toFixed(1)}M</span></div>`:''}
      </div>`;
  }
  return html;
}


function showFinancialReport(rev,cost,profit,settledYear,settledQuarter){
  let html=buildFinancialReportHtml(rev,cost,profit,settledYear,settledQuarter);
  html+=`<div style="margin-top:12px;text-align:center"><button class="btn btn-primary" onclick="closeModal()" style="padding:8px 32px">继续经营</button></div>`;
  $('modal-root').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="position:relative"><div class="report-card-standalone">${html}</div></div></div>`;
}

function showTurnSummary(rev,cost,profit,settledYear,settledQuarter){
  // Store latest report data for re-read (use settled quarter, not current)
  G._lastReportData={rev,cost,profit,year:settledYear,quarter:settledQuarter};
  const newsHtml=buildNewspaperHtml(false,settledYear,settledQuarter);
  const reportHtml=buildFinancialReportHtml(rev,cost,profit,settledYear,settledQuarter);
  const html=`<div class="turn-summary">
    <div>${newsHtml}</div>
    <div class="report-card">${reportHtml}<div class="report-footer"><button class="btn btn-primary" onclick="closeModal()" style="padding:10px 40px;border-radius:8px">知道了，继续经营</button></div></div>
  </div>`;
  $('modal-root').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">${html}</div>`;
  $('reread-news-btn').style.display='';
  $('reread-report-btn').style.display='';
}

function showReportAlone(){
  if(!G||!G._lastReportData)return;
  const {rev,cost,profit,year:sy,quarter:sq}=G._lastReportData;
  const html=buildFinancialReportHtml(rev,cost,profit,sy,sq);
  $('modal-root').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="position:relative"><div class="report-card-standalone">${html}<div style="margin-top:12px;text-align:center"><button class="btn btn-primary" onclick="closeModal()" style="padding:8px 32px">关闭</button></div></div></div></div>`;
}
