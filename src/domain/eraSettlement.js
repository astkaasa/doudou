import { ERAS } from '../data/eras.js';
import { VICTORY_GRADES } from '../data/mainQuest.js';
import { getCity } from './helpers.js';
import { getMainQuestStats } from './mainQuest.js';
import { calcCompanyValue } from './subsidiaries.js';

export const ERA_SETTLEMENT_STATUSES = Object.freeze(['active', 'pending', 'continued', 'retired']);
export const ERA_SETTLEMENT_OUTCOMES = Object.freeze(['victory', 'final_stage', 'expansion', 'foundation']);
const VICTORY_GRADE_IDS = new Set(VICTORY_GRADES.map((grade) => grade.grade));

export function createEraSettlementState() {
  return {
    status: 'active',
    settledTurn: null,
    result: null,
  };
}

export function eraSettlementDeadlineTurns(state) {
  const era = ERAS.find((item) => item.id === state?.era);
  return era ? (era.endYear - era.startYear) * 4 : null;
}

export function normalizeEraSettlementState(state) {
  const deadline = eraSettlementDeadlineTurns(state);
  const current = state?.eraSettlement;
  if (!current || typeof current !== 'object' || Array.isArray(current)) {
    state.eraSettlement = createLegacyEraSettlementState(state, deadline);
    return state.eraSettlement;
  }

  const status = ERA_SETTLEMENT_STATUSES.includes(current.status) ? current.status : 'active';
  const settledTurn = positiveInteger(current.settledTurn);
  state.eraSettlement = {
    status,
    settledTurn: status === 'active' ? null : settledTurn || deadline,
    result: status === 'active' ? null : normalizeResult(current.result, state),
  };
  if (status === 'retired') state.gameOver = true;
  return state.eraSettlement;
}

export function settleEraIfDue(state) {
  const settlement = normalizeEraSettlementState(state);
  const deadline = eraSettlementDeadlineTurns(state);
  if (settlement.status !== 'active' || deadline === null || state.turnsPlayed < deadline) return null;

  const result = buildEraSettlementResult(state, deadline);
  state.eraSettlement = {
    status: 'pending',
    settledTurn: state.turnsPlayed,
    result,
  };
  return { type: 'era_settlement', ...result };
}

export function hasPendingEraSettlement(state) {
  return normalizeEraSettlementState(state).status === 'pending';
}

export function hasRetiredEraSettlement(state) {
  return normalizeEraSettlementState(state).status === 'retired';
}

export function continueEraInSandbox(state) {
  const settlement = normalizeEraSettlementState(state);
  if (settlement.status !== 'pending') return { ok: false, message: '当前没有待处理的时代结算' };
  settlement.status = 'continued';
  return { ok: true, settlement };
}

export function retireAtEraEnd(state) {
  const settlement = normalizeEraSettlementState(state);
  if (settlement.status !== 'pending') return { ok: false, message: '当前没有待处理的时代结算' };
  settlement.status = 'retired';
  state.gameOver = true;
  return { ok: true, settlement };
}

export function buildEraSettlementResult(state, deadline = eraSettlementDeadlineTurns(state)) {
  const era = ERAS.find((item) => item.id === state?.era);
  const quest = getMainQuestStats(state);
  const completedStages = quest.stageCompleted.length;
  const baseRegions = new Set([state.hq, ...(state.branches || [])]
    .map(getCity)
    .filter(Boolean)
    .map((city) => city.region));
  return {
    eraId: era?.id || state.era || null,
    eraName: era?.name || '',
    startYear: era?.startYear || null,
    endYear: era?.endYear || state.endYear || null,
    deadlineTurn: deadline,
    outcome: settlementOutcome(quest),
    completedStages,
    currentStage: quest.currentStage,
    victoryGrade: quest.victoryGrade,
    companyValue: round(calcCompanyValue(state).totalNetWorth),
    cash: round(state.cash),
    totalProfit: round(state.totalProfit),
    routes: Array.isArray(state.routes) ? state.routes.length : 0,
    fleet: Array.isArray(state.fleet) ? state.fleet.length : 0,
    baseRegions: baseRegions.size,
  };
}

function createLegacyEraSettlementState(state, deadline) {
  if (deadline !== null && (Number(state.turnsPlayed) || 0) >= deadline) {
    return {
      status: 'continued',
      settledTurn: deadline,
      result: buildEraSettlementResult(state, deadline),
    };
  }
  return createEraSettlementState();
}

function normalizeResult(result, state) {
  const fallback = buildEraSettlementResult(state);
  if (!result || typeof result !== 'object' || Array.isArray(result)) return fallback;
  return {
    ...fallback,
    outcome: ERA_SETTLEMENT_OUTCOMES.includes(result.outcome) ? result.outcome : fallback.outcome,
    completedStages: nonNegativeInteger(result.completedStages, fallback.completedStages),
    currentStage: boundedInteger(result.currentStage, 1, 3, fallback.currentStage),
    victoryGrade: VICTORY_GRADE_IDS.has(result.victoryGrade) ? result.victoryGrade : fallback.victoryGrade,
    companyValue: finiteNumber(result.companyValue, fallback.companyValue),
    cash: finiteNumber(result.cash, fallback.cash),
    totalProfit: finiteNumber(result.totalProfit, fallback.totalProfit),
    routes: nonNegativeInteger(result.routes, fallback.routes),
    fleet: nonNegativeInteger(result.fleet, fallback.fleet),
    baseRegions: nonNegativeInteger(result.baseRegions, fallback.baseRegions),
  };
}

function settlementOutcome(quest) {
  if (quest.victoryGrade) return 'victory';
  if (quest.currentStage >= 3 || quest.stageCompleted.includes(2)) return 'final_stage';
  if (quest.currentStage >= 2 || quest.stageCompleted.includes(1)) return 'expansion';
  return 'foundation';
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function nonNegativeInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function boundedInteger(value, min, max, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
