import { MAIN_QUEST_STAGES, VICTORY_GRADES } from '../data/mainQuest.js';
import { getCity } from './helpers.js';
import { calcCompanyValue } from './subsidiaries.js';

export function createMainQuestState() {
  return {
    currentStage: 1,
    stageCompleted: [],
    victoryGrade: null,
    victoryTurn: null,
  };
}

export function normalizeMainQuestState(state) {
  if (!state.mainQuest || typeof state.mainQuest !== 'object') {
    state.mainQuest = createMainQuestState();
    return state.mainQuest;
  }
  const stage = Number(state.mainQuest.currentStage);
  state.mainQuest.currentStage = Number.isInteger(stage) ? Math.min(3, Math.max(1, stage)) : 1;
  state.mainQuest.stageCompleted = Array.isArray(state.mainQuest.stageCompleted)
    ? [...new Set(state.mainQuest.stageCompleted.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 1 && value <= 3))]
    : [];
  if (!VICTORY_GRADES.some((grade) => grade.grade === state.mainQuest.victoryGrade)) {
    state.mainQuest.victoryGrade = null;
  }
  const victoryTurn = Number(state.mainQuest.victoryTurn);
  state.mainQuest.victoryTurn = Number.isFinite(victoryTurn) && victoryTurn > 0 ? victoryTurn : null;
  return state.mainQuest;
}

export function getCurrentStageTargets(state) {
  const mainQuest = normalizeMainQuestState(state);
  const stageData = MAIN_QUEST_STAGES.find((stage) => stage.stage === mainQuest.currentStage);
  if (!stageData) return null;
  const eraKey = ['era1', 'era2', 'era3', 'era4'].includes(state.era) ? state.era : 'era2';
  const branchType = stageData.targets.branch.type;
  return {
    stage: stageData.stage,
    title: stageData.title,
    subtitle: stageData.subtitle,
    icon: stageData.icon,
    dimensions: {
      cash: { current: Math.max(0, calcCompanyValue(state).totalNetWorth), target: resolveEraTarget(stageData.targets.cash, eraKey) },
      routes: { current: Array.isArray(state.routes) ? state.routes.length : 0, target: resolveEraTarget(stageData.targets.routes, eraKey) },
      branch: { current: branchType === 'subRegion' ? countBaseSubRegions(state) : countBaseRegions(state), target: resolveEraTarget(stageData.targets.branch.min, eraKey), type: branchType },
      profit: { current: Math.max(0, Number(state.consecutiveProfit) || 0), target: resolveEraTarget(stageData.targets.profit.consecutive, eraKey) },
    },
  };
}

export function checkMainQuestProgress(state) {
  const targets = getCurrentStageTargets(state);
  if (!targets) return null;
  const dimensions = {};
  let metCount = 0;
  Object.entries(targets.dimensions).forEach(([key, dimension]) => {
    const met = dimension.current >= dimension.target;
    dimensions[key] = { ...dimension, met };
    if (met) metCount++;
  });
  return {
    stage: targets.stage,
    title: targets.title,
    subtitle: targets.subtitle,
    icon: targets.icon,
    dimensions,
    metCount,
    allMet: metCount === Object.keys(dimensions).length,
  };
}

export function getMainQuestStats(state) {
  const mainQuest = normalizeMainQuestState(state);
  return {
    currentStage: mainQuest.currentStage,
    stageCompleted: [...mainQuest.stageCompleted],
    victoryGrade: mainQuest.victoryGrade,
    victoryTurn: mainQuest.victoryTurn,
    progress: checkMainQuestProgress(state),
  };
}

export function calcVictoryGrade(turnsPlayed, eraId = 'era2') {
  return VICTORY_GRADES.find((grade) => turnsPlayed <= resolveEraTarget(grade.maxTurns, eraId)) || VICTORY_GRADES[VICTORY_GRADES.length - 1];
}

export function updateMainQuest(state) {
  if (!state || state.gameOver) return null;
  const mainQuest = normalizeMainQuestState(state);
  if (mainQuest.victoryGrade) return null;
  const progress = checkMainQuestProgress(state);
  if (!progress?.allMet) return null;

  if (mainQuest.currentStage === 3) {
    const grade = calcVictoryGrade(state.turnsPlayed || 0, state.era);
    mainQuest.victoryGrade = grade.grade;
    mainQuest.victoryTurn = state.turnsPlayed || 0;
    if (!mainQuest.stageCompleted.includes(3)) mainQuest.stageCompleted.push(3);
    return {
      type: 'victory',
      grade: grade.grade,
      gradeTitle: grade.title,
      gradeColor: grade.color,
      turnsPlayed: mainQuest.victoryTurn,
      dimensions: progress.dimensions,
      cash: state.cash,
      routes: Array.isArray(state.routes) ? state.routes.length : 0,
      totalProfit: state.totalProfit || 0,
    };
  }

  const completedStage = mainQuest.currentStage;
  if (!mainQuest.stageCompleted.includes(completedStage)) mainQuest.stageCompleted.push(completedStage);
  mainQuest.currentStage++;
  const nextStage = MAIN_QUEST_STAGES.find((stage) => stage.stage === mainQuest.currentStage);
  return {
    type: 'stage_complete',
    stage: completedStage,
    nextStage: mainQuest.currentStage,
    title: progress.title,
    subtitle: progress.subtitle,
    nextTitle: nextStage?.title || '',
  };
}

function resolveEraTarget(target, eraKey) {
  if (typeof target === 'number') return target;
  return target?.[eraKey] ?? target?.era2 ?? 0;
}

function countBaseRegions(state) {
  return countBaseMarkets(state, 'region');
}

function countBaseSubRegions(state) {
  return countBaseMarkets(state, 'subRegion');
}

function countBaseMarkets(state, key) {
  const values = new Set();
  [state.hq, ...(Array.isArray(state.branches) ? state.branches : [])].forEach((cityId) => {
    const city = getCity(cityId);
    if (city?.[key]) values.add(city[key]);
  });
  return values.size;
}
