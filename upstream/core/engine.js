// ===== TURN ADVANCE =====
function advanceTurn(){
  if(G.gameOver)return;
  G.deliveredThisTurn=[];
  G.leaseExpiredThisTurn=[];
  // ── 运营管理：本回合临时变量清零 ──
  G._retiredThisTurn=0;
  G._recruitCostThisTurn=0;
  G._bonusCostThisTurn=0;
  G._opsCostThisTurn=0;
  G._faultLossThisTurn=0;
  G._faultsThisTurn=[];

  // ── 飞机龄增长+交付+租约 ──
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

  // ══════════════════════════════════════════
  // v0.6: 运营管理 — 员工/士气/故障/事故后效
  // ══════════════════════════════════════════

  // 1. 更新 staffNeeded（基于当前航线/机队/分部）
  G.staffNeeded = calcStaffNeeded(G);

  // 2. Q1退休（年度自动事件）
  if(G.quarter === 1 && G.staffCount > 0){
    const retired = Math.floor(G.staffCount * STAFF_RETIRE_RATE);
    if(retired > 0){
      G.staffCount = Math.max(0, G.staffCount - retired);
      G._retiredThisTurn = retired;
    }
  }

  // 3. 自然补人
  if(G.staffNeeded > 0){
    const fillTarget = G.staffNeeded * STAFF_NATURAL_FILL_TARGET;
    if(G.staffCount < fillTarget){
      const gap = fillTarget - G.staffCount;
      const fill = gap * STAFF_NATURAL_FILL_RATE;
      G.staffCount += fill;
    }
  }

  // 4. 士气自然变动（基于满编率）
  if(G.staffNeeded > 0){
    const fillRate = G.staffCount / G.staffNeeded;
    if(fillRate < 0.6)       G.staffMorale = clamp(G.staffMorale - 5, 0, 100);
    else if(fillRate < 0.8)  G.staffMorale = clamp(G.staffMorale - 2, 0, 100);
    else if(fillRate > 1.2)  G.staffMorale = clamp(G.staffMorale - 1, 0, 100);
    // 0.8-1.2: 士气不变
  }

  // 5. 计算运营效能
  G.opsEfficiency = calcOpsEfficiency(G);

  // 6. 故障掷骰（每架飞机每季度）
  G._faultsThisTurn = [];
  const faultMult = MAINT_FAULT_MULT[G.maintTier] || 1.0;
  const opsFaultFactor = 1.2 - G.opsEfficiency * 0.2;  // 高效能→低故障
  G.fleet.forEach(plane => {
    if(plane.delivering) return;
    const baseChance = FAULT_BASE_CHANCE * (1 + FAULT_AGE_FACTOR * plane.age) * faultMult * opsFaultFactor;
    if(Math.random() < baseChance){
      // 确定严重度
      const roll = Math.random();
      let severity, lossPct, globalPenalty, penaltyTurns;
      if(roll < 0.10){       // 10% 致命
        severity = 'critical';
        lossPct = 1.0;
        globalPenalty = -0.10;
        penaltyTurns = 4;
      } else if(roll < 0.35){ // 25% 严重
        severity = 'major';
        lossPct = 0.5;
        globalPenalty = -0.05;
        penaltyTurns = 2;
      } else {                // 65% 轻微
        severity = 'minor';
        lossPct = 0.25;
        globalPenalty = 0;
        penaltyTurns = 0;
      }
      G._faultsThisTurn.push({ planeUid: plane.uid, planeName: plane.name, severity, lossPct, globalPenalty, penaltyTurns });
      // 累积事故全局惩罚
      if(globalPenalty < 0){
        G.accidentPenalty = Math.max(G.accidentPenalty + globalPenalty, -0.30); // 下限-30%
        G.accidentPenaltyTurns = Math.max(G.accidentPenaltyTurns, penaltyTurns);
      }
      // 致命事故：损失飞机
      if(severity === 'critical'){
        plane._destroyed = true;
      }
    }
  });
  // 移除被摧毁的飞机
  const destroyedPlanes = G.fleet.filter(p => p._destroyed);
  if(destroyedPlanes.length > 0){
    // 从航线上移除
    destroyedPlanes.forEach(dp => {
      G.routes.forEach(r => {
        r.assignedPlanes = r.assignedPlanes.filter(pid => pid !== dp.uid);
      });
    });
    G.fleet = G.fleet.filter(p => !p._destroyed);
    rebuildFleetMap();
  }

  // 7. 事故后效衰减
  if(G.accidentPenaltyTurns > 0){
    G.accidentPenaltyTurns--;
    if(G.accidentPenaltyTurns <= 0){
      G.accidentPenalty = 0;
    }
  }

  // 8. 运营预算成本
  const opsBudget = calcOpsBudgetCost(G);
  G._opsCostThisTurn = opsBudget.total;

  generateEvents();
  growCities();
  // Save last quarter's metrics before recalculating (for trend display)
  G.routes.forEach(r=>{r._lastLf=r.loadFactor;r._lastProfit=r.profit;});
  updateRouteMetrics();

  // ══════════════════════════════════════════
  // 收入/支出结算
  // ══════════════════════════════════════════
  let totalRev=0,totalCost=0;
  G.routes.forEach(r=>{
    if(!r.suspended){
      totalRev+=r.revenue;
      totalCost+=r.cost;
    }
  });
  const overhead=G.fleet.length*OVERHEAD_PER_FLEET+OVERHEAD_BASE;totalCost+=overhead;
  G.fleet.filter(p=>p.isLease).forEach(p=>{totalCost+=p.leasePrice;});
  if(G.loan>0){const interest=G.loan*G.loanRate;totalCost+=interest;}

  // 运营预算支出（服务+维修+广告）
  totalCost += opsBudget.total;

  // 故障损失（从收入侧扣减）
  let faultLoss = 0;
  G._faultsThisTurn.forEach(f => {
    // 找到该飞机执飞的航线，扣减收入
    const affectedRoutes = G.routes.filter(r => r.assignedPlanes.includes(f.planeUid));
    affectedRoutes.forEach(r => {
      faultLoss += r.revenue * f.lossPct;
    });
  });
  G._faultLossThisTurn = faultLoss;
  totalCost += faultLoss;

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
  if(profit>0){G.brand=clamp(G.brand+BRAND_PROFIT_GAIN*G.opsEfficiency,1,10);G.consecutiveProfit=(G.consecutiveProfit||0)+1;}
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

  // ══════════════════════════════════════════
  // v0.6.3: 合同卡片取代弹窗
  // 季度变更时设置 pending 标志，UI 层浮现合同卡片
  // ══════════════════════════════════════════
  if(G.quarter === 4 && !G.gameOver && !G._pendingRecruit){
    G._pendingRecruit = true;
  }
  if(G.quarter === 1 && !G.gameOver && !G._pendingBonus){
    G._pendingBonus = true;
  }

  // Check milestones after turn advance (profit, survival, etc.)
  updateMilestones();
  // Check main quest progress after milestones
  updateMainQuest();
}
