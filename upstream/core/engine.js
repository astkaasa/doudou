// ===== TURN ADVANCE =====
function advanceTurn(){
  if(G.gameOver)return;
  G.deliveredThisTurn=[];
  G.leaseExpiredThisTurn=[];
  G.fleet.forEach(p=>{
    if(p.delivering){p.deliverIn--;if(p.deliverIn<=0){p.delivering=false;G.deliveredThisTurn.push({name:p.name,uid:p.uid});}}
    p.age+=0.25;
    if(p.isLease){p.leaseTurns++;if(p.leaseTurns>=p.maxLeaseTurns){p._leaseExpired=true;G.leaseExpiredThisTurn.push({name:p.name,uid:p.uid});}}
  });
  G.fleet=G.fleet.filter(p=>{
    if(p._leaseExpired)return false;
    if(p.age>=PLANE_MAX_AGE)return false;
    return true;
  });
  rebuildFleetMap();
  // Branch construction countdown
  const branchCompleted=[];
  if(G.branchesConstructing&&G.branchesConstructing.length>0){
    G.branchesConstructing.forEach(b=>{b.constructIn--;if(b.constructIn<=0){branchCompleted.push(b);}});
    G.branchesConstructing=G.branchesConstructing.filter(b=>b.constructIn>0);
    branchCompleted.forEach(b=>{
      if(!G.branches.includes(b.cityId)){G.branches.push(b.cityId);}
    });
  }
  generateEvents();
  growCities();
  // Save last quarter's metrics before recalculating (for trend display)
  G.routes.forEach(r=>{r._lastLf=r.loadFactor;r._lastProfit=r.profit;});
  updateRouteMetrics();
  let totalRev=0,totalCost=0;
  G.routes.forEach(r=>{if(!r.suspended){totalRev+=r.revenue;totalCost+=r.cost;}});
  const overhead=G.fleet.length*OVERHEAD_PER_FLEET+OVERHEAD_BASE;totalCost+=overhead;
  G.fleet.filter(p=>p.isLease).forEach(p=>{totalCost+=p.leasePrice;});
  if(G.loan>0){const interest=G.loan*G.loanRate;totalCost+=interest;}
  let traitFund=0;
  if(G.playerTrait==='辣'){traitFund=Math.floor(G.cash*TRAIT_FUND_RATIO);}
  const profit=totalRev-totalCost+traitFund;G.cash+=profit;
  // ── Q4 股票分红结算 ──
  let stockDividend=0;
  if(G.quarter===4){stockDividend=calcDividend();if(stockDividend>0){G.cash+=stockDividend;}}
  G.turnRevenue=totalRev;G.turnCost=totalCost;G.turnProfit=profit+stockDividend;G.totalProfit+=profit+stockDividend;G.turnsPlayed++;
  if(traitFund>0)G._lastTraitFund=traitFund; else G._lastTraitFund=0;
  G._lastStockDividend=stockDividend;
  G._lastBranchCompleted=branchCompleted.length>0?branchCompleted:[];
  if(profit>0){G.brand=clamp(G.brand+BRAND_PROFIT_GAIN,1,10);G.consecutiveProfit=(G.consecutiveProfit||0)+1;}
  else{G.brand=clamp(G.brand-BRAND_LOSS_DROP,1,10);G.consecutiveProfit=0;}
  if(G.disasterRegions){
    G.disasterRegions.forEach(d=>d.turns--);
    G.disasterRegions=G.disasterRegions.filter(d=>d.turns>0);
  }
  G.ai.forEach(ai=>aiTurn(ai));

  const settledYear=G.year, settledQuarter=G.quarter;
  G.quarter++;if(G.quarter>4){G.quarter=1;G.year++;}
  G.routes.forEach(r=>{r.isNew=false;r._priceAdjusted=false;r._planeChanged=false;r._reopened=false;});
  if(G.year===G.endYear-1&&G.quarter===4){
    emit('turn:warning',{endYear:G.endYear});
  }
  if(G.year>G.endYear){
    G.gameOver=true;
    const era=ERAS.find(e=>e.id===G.era);
    emit('game:over',{reason:'era_end',eraName:era?era.name:'本时代',turnsPlayed:G.turnsPlayed,cash:G.cash,totalProfit:G.totalProfit,routes:G.routes.length,fleet:G.fleet.length});
    return;
  }
  G.history.push({year:settledYear,quarter:settledQuarter,cash:G.cash,profit,rev:totalRev,cost:totalCost,routes:G.routes.length,fleet:G.fleet.length});
  G.routes.forEach(r=>{/* frequency is always 1 now */});
  if(G.cash<BANKRUPTCY_THRESHOLD){
    // 首次破产：触发辣豆基金天使投资救助
    if(!G.bankruptRescued){
      G.bankruptRescued=true;
      emit('game:angel',{turnsPlayed:G.turnsPlayed,routes:G.routes.length,fleet:G.fleet.length});
      return;
    }
    G.gameOver=true;
    emit('game:over',{reason:'bankrupt',turnsPlayed:G.turnsPlayed,routes:G.routes.length,fleet:G.fleet.length});
    return;
  }
  emit('turn:advanced',{year:settledYear,quarter:settledQuarter,revenue:totalRev,cost:totalCost,profit,traitFund,branchCompleted});
  // Check milestones after turn advance (profit, survival, etc.)
  updateMilestones();
  // Check main quest progress after milestones
  updateMainQuest();
}
