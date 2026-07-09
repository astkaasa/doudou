import { clamp } from './helpers.js';
import { randomSource } from './random.js';

export const STAFF_PER_ROUTE = 0.03;
export const STAFF_PER_PLANE = 0.05;
export const STAFF_PER_BRANCH = 0.1;
export const STAFF_HQ_BASE = 0.05;
export const STAFF_RECRUIT_COST = 0.5;
export const STAFF_NATURAL_FILL_RATE = 0.3;
export const STAFF_NATURAL_FILL_TARGET = 0.75;
export const STAFF_RETIRE_RATE = 0.01;
export const RECRUIT_TARGET_EXPAND = 1.25;
export const RECRUIT_TARGET_STANDARD = 1.05;

export const BONUS_COST_HIGH = 2.0;
export const BONUS_COST_MID = 1.0;
export const BONUS_COST_LOW = 0.2;
export const BONUS_MORALE_HIGH = 30;
export const BONUS_MORALE_MID = 15;
export const BONUS_MORALE_LOW = 5;

export const SERVICE_COST_PER_ROUTE = 0.15;
export const MAINT_BUDGET_PER_PLANE = 0.10;
export const AD_COST_PER_ROUTE = 0.10;
export const AD_COST_PER_BRANCH = 0.3;

export const FAULT_BASE_CHANCE = 0.03;
export const FAULT_AGE_FACTOR = 0.05;

export const SERVICE_MULTIPLIER = { low: 0.90, mid: 1.00, high: 1.10 };
export const MAINT_FAULT_MULT = { low: 1.8, mid: 1.0, high: 0.4 };
export const AD_MULTIPLIER = { low: 0.97, mid: 1.00, high: 1.06 };
export const BUDGET_COST_MULT = { low: 0.3, mid: 1.0, high: 2.5 };
export const AD_COST_MULT = { low: 0.3, mid: 1.0, high: 2.5 };

const VALID_TIERS = new Set(['low', 'mid', 'high']);
const BONUS_TIERS = {
  high: { key: 'high', label: '丰厚', unitCost: BONUS_COST_HIGH, morale: BONUS_MORALE_HIGH },
  mid: { key: 'mid', label: '标准', unitCost: BONUS_COST_MID, morale: BONUS_MORALE_MID },
  low: { key: 'low', label: '象征性', unitCost: BONUS_COST_LOW, morale: BONUS_MORALE_LOW },
};

export function calcStaffNeeded(state) {
  const routes = Array.isArray(state?.routes) ? state.routes.length : 0;
  const fleet = Array.isArray(state?.fleet) ? state.fleet.length : 0;
  const branches = Array.isArray(state?.branches) ? state.branches.length : 0;
  return roundStaff(routes * STAFF_PER_ROUTE + fleet * STAFF_PER_PLANE + branches * STAFF_PER_BRANCH + STAFF_HQ_BASE);
}

export function calcOpsEfficiency(state) {
  const staffNeeded = calcStaffNeeded(state);
  if (staffNeeded <= 0) return 1;
  const staffCount = Math.max(0, Number(state?.staffCount) || 0);
  const morale = clamp(Number(state?.staffMorale) || 0, 0, 100);
  return clamp((staffCount / staffNeeded) * (morale / 60), 0.3, 1.5);
}

export function calcOpsBudgetCost(state) {
  const routes = Array.isArray(state?.routes) ? state.routes.length : 0;
  const fleet = Array.isArray(state?.fleet) ? state.fleet.length : 0;
  const branches = Array.isArray(state?.branches) ? state.branches.length : 0;
  const serviceTier = normalizeTier(state?.serviceTier);
  const maintTier = normalizeTier(state?.maintTier);
  const adTier = normalizeTier(state?.adTier);
  const serviceCost = routes * SERVICE_COST_PER_ROUTE * BUDGET_COST_MULT[serviceTier];
  const maintDiscount = state?.playerTrait === '机' ? 0.9 : 1;
  const maintCost = fleet * MAINT_BUDGET_PER_PLANE * BUDGET_COST_MULT[maintTier] * maintDiscount;
  const adCost = (routes * AD_COST_PER_ROUTE + branches * AD_COST_PER_BRANCH) * AD_COST_MULT[adTier];
  return { serviceCost, maintCost, adCost, total: serviceCost + maintCost + adCost };
}

export function operationDemandMultiplier(state) {
  const efficiency = positiveNumber(state?.opsEfficiency) ? state.opsEfficiency : calcOpsEfficiency(state);
  const opsEffect = 0.7 + efficiency * 0.3;
  const serviceEffect = SERVICE_MULTIPLIER[normalizeTier(state?.serviceTier)];
  const adEffect = AD_MULTIPLIER[normalizeTier(state?.adTier)];
  const accidentEffect = 1 + Math.min(0, Number(state?.accidentPenalty) || 0);
  return Math.max(0, opsEffect * serviceEffect * adEffect * accidentEffect);
}

export function syncStaffToNeeded(state, fillTarget = 0.85) {
  if (!state) return 0;
  normalizeOperationsState(state);
  state.staffNeeded = calcStaffNeeded(state);
  const targetRate = clamp(Number(fillTarget) || 0, 0, 1);
  const target = Math.min(state.staffNeeded, state.staffNeeded * targetRate);
  const before = state.staffCount;
  if (state.staffCount < target) state.staffCount = roundStaff(target);
  state.opsEfficiency = state.turnsPlayed > 0 ? calcOpsEfficiency(state) : state.opsEfficiency || 0;
  return state.staffCount - before;
}

export function normalizeOperationsState(state) {
  if (!state) return state;
  const staffNeeded = calcStaffNeeded(state);
  state.staffNeeded = staffNeeded;
  if (!Number.isFinite(state.staffCount)) state.staffCount = staffNeeded;
  state.staffCount = roundStaff(Math.max(0, state.staffCount));
  if (!Number.isFinite(state.staffMorale)) state.staffMorale = 40;
  state.staffMorale = clamp(state.staffMorale, 0, 100);
  state.serviceTier = normalizeTier(state.serviceTier);
  state.maintTier = normalizeTier(state.maintTier);
  state.adTier = normalizeTier(state.adTier);
  if (!Number.isFinite(state.opsEfficiency)) state.opsEfficiency = 0;
  state.opsEfficiency = state.opsEfficiency > 0 ? calcOpsEfficiency(state) : 0;
  if (!Number.isFinite(state.accidentPenalty)) state.accidentPenalty = 0;
  state.accidentPenalty = clamp(state.accidentPenalty, -0.3, 0);
  if (!Number.isFinite(state.accidentPenaltyTurns)) state.accidentPenaltyTurns = 0;
  state.accidentPenaltyTurns = Math.max(0, Math.floor(state.accidentPenaltyTurns));
  if (state._pendingOpsModal !== undefined) {
    state._pendingRecruit = state._pendingOpsModal === 'recruit';
    state._pendingBonus = state._pendingOpsModal === 'bonus';
    delete state._pendingOpsModal;
  }
  state._pendingRecruit = Boolean(state._pendingRecruit);
  state._pendingBonus = Boolean(state._pendingBonus);
  resetOperationalTurnFields(state, { preservePending: true });
  return state;
}

export function resetOperationalTurnFields(state, options = {}) {
  state._retiredThisTurn = 0;
  state._recruitCostThisTurn = options.preservePending ? (Number(state._recruitCostThisTurn) || 0) : 0;
  state._bonusCostThisTurn = options.preservePending ? (Number(state._bonusCostThisTurn) || 0) : 0;
  state._opsCostThisTurn = 0;
  state._faultLossThisTurn = 0;
  state._faultsThisTurn = [];
  return state;
}

export function prepareQuarterOperations(state, random = randomSource(state)) {
  normalizeOperationsState(state);
  resetOperationalTurnFields(state);
  state.staffNeeded = calcStaffNeeded(state);

  if (state.quarter === 1 && state.staffCount > 0) {
    const retired = roundStaff(state.staffCount * STAFF_RETIRE_RATE);
    if (retired > 0) {
      state.staffCount = roundStaff(Math.max(0, state.staffCount - retired));
      state._retiredThisTurn = retired;
    }
  }

  naturallyFillStaff(state);
  adjustMoraleForStaffing(state);
  state.opsEfficiency = calcOpsEfficiency(state);
  state._faultsThisTurn = rollOperationalFaults(state, random);
  state._opsCostThisTurn = calcOpsBudgetCost(state).total;
  return {
    opsCost: state._opsCostThisTurn,
    retired: state._retiredThisTurn,
    faults: state._faultsThisTurn,
  };
}

export function settleOperationalFaultLosses(state) {
  const faults = Array.isArray(state?._faultsThisTurn) ? state._faultsThisTurn : [];
  let faultLoss = 0;
  faults.forEach((fault) => {
    (state.routes || [])
      .filter((route) => (route.assignedPlanes || []).includes(fault.planeUid))
      .forEach((route) => {
        faultLoss += (Number(route.revenue) || 0) * fault.lossPct;
      });
  });
  state._faultLossThisTurn = faultLoss;
  removeDestroyedPlanes(state, faults);
  return faultLoss;
}

export function finishQuarterOperations(state) {
  if (!state) return;
  if ((state.accidentPenaltyTurns || 0) > 0) {
    state.accidentPenaltyTurns -= 1;
    if (state.accidentPenaltyTurns <= 0) {
      state.accidentPenaltyTurns = 0;
      state.accidentPenalty = 0;
    }
  }
}

export function schedulePendingContracts(state) {
  if (!state || state.gameOver) return;
  if (state.quarter === 3 && !state._pendingRecruit) state._pendingRecruit = true;
  if (state.quarter === 4 && !state._pendingBonus) state._pendingBonus = true;
}

export function hasPendingContracts(state) {
  return Boolean(state?._pendingRecruit || state?._pendingBonus);
}

export function pendingContractLabels(state) {
  const labels = [];
  if (state?._pendingRecruit) labels.push('年度招聘');
  if (state?._pendingBonus) labels.push('年终奖金');
  return labels;
}

export function getRecruitOptions(state) {
  const staffNeeded = calcStaffNeeded(state);
  const staffCount = Math.max(0, Number(state?.staffCount) || 0);
  const fillRate = staffNeeded > 0 ? staffCount / staffNeeded : 1;
  const expandQty = Math.max(0, staffNeeded * RECRUIT_TARGET_EXPAND - staffCount);
  const standardQty = Math.max(0, staffNeeded * RECRUIT_TARGET_STANDARD - staffCount);
  return [
    buildRecruitOption('expand', '扩员', staffCount, expandQty, staffNeeded),
    buildRecruitOption('standard', '标准', staffCount, standardQty, staffNeeded),
    {
      key: 'tight',
      label: '紧缩',
      qty: 0,
      cost: 0,
      fillRate,
      fillPct: Math.round(fillRate * 100),
    },
  ];
}

export function getBonusOptions(state) {
  const staffCount = Math.max(0, Number(state?.staffCount) || 0);
  return Object.values(BONUS_TIERS).map((tier) => ({
    ...tier,
    cost: staffCount * tier.unitCost,
  }));
}

export function signRecruitContract(state, optionKey = 'standard') {
  normalizeOperationsState(state);
  const option = getRecruitOptions(state).find((item) => item.key === optionKey) || getRecruitOptions(state)[1];
  state.staffCount = roundStaff(state.staffCount + option.qty);
  state.cash -= option.cost;
  state._recruitCostThisTurn = option.cost;
  state._pendingRecruit = false;
  state.staffNeeded = calcStaffNeeded(state);
  state.opsEfficiency = calcOpsEfficiency(state);
  return {
    type: 'recruit',
    option: option.key,
    label: option.label,
    qty: option.qty,
    cost: option.cost,
    receiptText: `${option.label} · ${option.qty > 0 ? `+${Math.round(option.qty * 1000)}人` : '未招人'} · ${formatMoney(option.cost)}`,
    message: `招聘完成：${option.qty > 0 ? `+${Math.round(option.qty * 1000)}人` : '紧缩方案'}，费用${formatMoney(option.cost)}`,
  };
}

export function signBonusContract(state, tierKey = 'mid') {
  normalizeOperationsState(state);
  const tier = BONUS_TIERS[tierKey] || BONUS_TIERS.mid;
  const cost = state.staffCount * tier.unitCost;
  state.staffMorale = clamp(state.staffMorale + tier.morale, 0, 100);
  state.cash -= cost;
  state._bonusCostThisTurn = cost;
  state._pendingBonus = false;
  state.opsEfficiency = calcOpsEfficiency(state);
  return {
    type: 'bonus',
    option: tier.key,
    label: tier.label,
    morale: tier.morale,
    cost,
    receiptText: `${tier.label} · 士气+${tier.morale} · ${formatMoney(cost)}`,
    message: `年终奖金已发放：士气+${tier.morale}，费用${formatMoney(cost)}`,
  };
}

export function setOpsTier(state, field, tier) {
  if (!['serviceTier', 'maintTier', 'adTier'].includes(field)) return false;
  state[field] = normalizeTier(tier);
  return true;
}

export function moraleStars(morale) {
  const full = Math.floor(clamp(Number(morale) || 0, 0, 100) / 20);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function naturallyFillStaff(state) {
  if (state.staffNeeded <= 0) return;
  const fillTarget = state.staffNeeded * STAFF_NATURAL_FILL_TARGET;
  if (state.staffCount >= fillTarget) return;
  const fill = (fillTarget - state.staffCount) * STAFF_NATURAL_FILL_RATE;
  state.staffCount = roundStaff(state.staffCount + fill);
}

function adjustMoraleForStaffing(state) {
  if (state.staffNeeded <= 0) return;
  const fillRate = state.staffCount / state.staffNeeded;
  if (fillRate < 0.6) state.staffMorale = clamp(state.staffMorale - 5, 0, 100);
  else if (fillRate < 0.8) state.staffMorale = clamp(state.staffMorale - 2, 0, 100);
  else if (fillRate > 1.2) state.staffMorale = clamp(state.staffMorale - 1, 0, 100);
}

function rollOperationalFaults(state, random) {
  const faults = [];
  const faultMult = MAINT_FAULT_MULT[normalizeTier(state.maintTier)];
  const opsFaultFactor = 1.2 - (state.opsEfficiency || 1) * 0.2;
  (state.fleet || []).forEach((plane) => {
    if (plane.delivering) return;
    const chance = FAULT_BASE_CHANCE * (1 + FAULT_AGE_FACTOR * (Number(plane.age) || 0)) * faultMult * opsFaultFactor;
    if (random() >= chance) return;
    const severityRoll = random();
    const severity = severityRoll < 0.10 ? 'critical' : severityRoll < 0.35 ? 'major' : 'minor';
    const details = faultSeverityDetails(severity);
    faults.push({
      planeUid: plane.uid,
      planeName: plane.name,
      severity,
      ...details,
    });
    if (details.globalPenalty < 0) {
      state.accidentPenalty = Math.max((state.accidentPenalty || 0) + details.globalPenalty, -0.3);
      state.accidentPenaltyTurns = Math.max(state.accidentPenaltyTurns || 0, details.penaltyTurns);
    }
  });
  return faults;
}

function faultSeverityDetails(severity) {
  if (severity === 'critical') return { lossPct: 1.0, globalPenalty: -0.10, penaltyTurns: 4 };
  if (severity === 'major') return { lossPct: 0.5, globalPenalty: -0.05, penaltyTurns: 2 };
  return { lossPct: 0.25, globalPenalty: 0, penaltyTurns: 0 };
}

function removeDestroyedPlanes(state, faults) {
  const destroyedUids = new Set(faults.filter((fault) => fault.severity === 'critical').map((fault) => fault.planeUid));
  if (destroyedUids.size === 0) return;
  state.fleet = (state.fleet || []).filter((plane) => !destroyedUids.has(plane.uid));
  (state.routes || []).forEach((route) => {
    route.assignedPlanes = (route.assignedPlanes || []).filter((uid) => !destroyedUids.has(uid));
  });
}

function buildRecruitOption(key, label, staffCount, qty, staffNeeded) {
  const fillRate = staffNeeded > 0 ? (staffCount + qty) / staffNeeded : 1;
  return {
    key,
    label,
    qty,
    cost: qty * STAFF_RECRUIT_COST,
    fillRate,
    fillPct: Math.round(fillRate * 100),
  };
}

function normalizeTier(tier) {
  return VALID_TIERS.has(tier) ? tier : 'mid';
}

function roundStaff(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function positiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function formatMoney(value) {
  return `$${(Number(value) || 0).toFixed(1)}M`;
}
