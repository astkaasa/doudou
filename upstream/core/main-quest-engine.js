// ===== core/main-quest-engine.js — 主线任务引擎 =====
// 检查四维度达标 → 阶段晋级 → 通关判定
// 在 advanceTurn() 末尾调用 updateMainQuest()

// ===== 分部覆盖辅助函数 =====

function countBranchSubRegions() {
  const subs = new Set();
  const hq = CITY_MAP[G.hq];
  if (hq) subs.add(hq.subRegion);
  G.branches.forEach(cityId => {
    const city = CITY_MAP[cityId];
    if (city) subs.add(city.subRegion);
  });
  return subs.size;
}

function countBranchRegions() {
  const regs = new Set();
  const hq = CITY_MAP[G.hq];
  if (hq) regs.add(hq.region);
  G.branches.forEach(cityId => {
    const city = CITY_MAP[cityId];
    if (city) regs.add(city.region);
  });
  return regs.size;
}

// ===== 获取当前阶段目标（考虑时代差异） =====

function getCurrentStageTargets() {
  if (!G || !G.mainQuest) return null;
  const stageData = MAIN_QUEST_STAGES.find(s => s.stage === G.mainQuest.currentStage);
  if (!stageData) return null;
  const era = G.era;
  const eraNum = parseInt(era.replace('era', ''));
  const eraKey = 'era' + eraNum;

  const cashTarget = stageData.targets.cash[eraKey] || stageData.targets.cash.era2;
  const routesTarget = stageData.targets.routes[eraKey] || stageData.targets.routes.era2;
  const branchTarget = stageData.targets.branch.min;
  const profitTarget = stageData.targets.profit.consecutive;

  const branchCurrent = stageData.targets.branch.type === 'subRegion'
    ? countBranchSubRegions()
    : countBranchRegions();
  const branchType = stageData.targets.branch.type;

  return {
    stage: stageData.stage,
    title: stageData.title,
    subtitle: stageData.subtitle,
    icon: stageData.icon,
    dimensions: {
      cash:   { current: Math.max(0, typeof calcCompanyValue === 'function' ? calcCompanyValue().totalNetWorth : G.cash), target: cashTarget },
      routes: { current: G.routes.length, target: routesTarget },
      branch: { current: branchCurrent, target: branchTarget, type: branchType },
      profit: { current: G.consecutiveProfit || 0, target: profitTarget }
    }
  };
}

// ===== 检查四维度是否全部达标 =====

function checkMainQuestProgress() {
  const targets = getCurrentStageTargets();
  if (!targets) return { allMet: false, dimensions: {}, stage: 0, title: '' };
  const dims = targets.dimensions;
  const result = {
    stage: targets.stage,
    title: targets.title,
    subtitle: targets.subtitle,
    icon: targets.icon,
    allMet: true,
    dimensions: {},
    metCount: 0
  };
  for (const [key, dim] of Object.entries(dims)) {
    const met = dim.current >= dim.target;
    result.dimensions[key] = { ...dim, met };
    if (met) result.metCount++;
    if (!met) result.allMet = false;
  }
  return result;
}

// ===== 计算通关评级 =====

function calcVictoryGrade(turns) {
  for (const g of VICTORY_GRADES) {
    if (turns <= g.maxTurns) return g;
  }
  return VICTORY_GRADES[VICTORY_GRADES.length - 1];
}

// ===== 更新主线进度（在 advanceTurn 末尾调用） =====

function updateMainQuest() {
  if (!G || G.gameOver) return;
  if (!G.mainQuest) return;
  if (G.mainQuest.victoryGrade) return;  // 已通关，不再检查

  const progress = checkMainQuestProgress();

  if (progress.allMet) {
    if (G.mainQuest.currentStage === 3) {
      // 通关！
      const grade = calcVictoryGrade(G.turnsPlayed);
      G.mainQuest.victoryGrade = grade.grade;
      G.mainQuest.victoryTurn = G.turnsPlayed;
      G.mainQuest.stageCompleted.push(3);
      emit('mainquest:victory', {
        grade: grade.grade,
        gradeTitle: grade.title,
        gradeColor: grade.color,
        turnsPlayed: G.turnsPlayed,
        dimensions: progress.dimensions,
        cash: G.cash,
        routes: G.routes.length,
        totalProfit: G.totalProfit
      });
    } else {
      // 阶段晋级
      const prevStage = G.mainQuest.currentStage;
      G.mainQuest.stageCompleted.push(prevStage);
      G.mainQuest.currentStage++;
      const nextStageData = MAIN_QUEST_STAGES.find(s => s.stage === G.mainQuest.currentStage);
      emit('mainquest:stage_complete', {
        stage: prevStage,
        nextStage: G.mainQuest.currentStage,
        title: progress.title,
        subtitle: progress.subtitle,
        nextTitle: nextStageData ? nextStageData.title : ''
      });
    }
  }
}

// ===== 获取统计信息供UI使用 =====

function getMainQuestStats() {
  if (!G || !G.mainQuest) return null;
  const progress = checkMainQuestProgress();
  return {
    currentStage: G.mainQuest.currentStage,
    stageCompleted: G.mainQuest.stageCompleted,
    victoryGrade: G.mainQuest.victoryGrade,
    victoryTurn: G.mainQuest.victoryTurn,
    progress: progress
  };
}
