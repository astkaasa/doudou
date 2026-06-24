import { getCity } from './helpers.js';

export const MAX_BRANCHES = 10;

export function isHQ(state, cityId) {
  return Boolean(state && state.hq === cityId);
}

export function isBranch(state, cityId) {
  return Boolean(state && (state.branches || []).includes(cityId));
}

export function isBase(state, cityId) {
  return isHQ(state, cityId) || isBranch(state, cityId);
}

export function branchCost(branchCount) {
  return 50 * Math.pow(2, branchCount);
}

export function openBranch(state, cityId) {
  if (!state) return { ok: false, message: '游戏状态无效' };
  if (!getCity(cityId)) return { ok: false, message: '城市不存在' };
  if (!state.branches) state.branches = [];
  if (isBase(state, cityId)) return { ok: false, message: '该城市已经是基地' };
  if (state.branches.length >= MAX_BRANCHES) return { ok: false, message: `分部数量最多 ${MAX_BRANCHES} 个` };
  const cost = branchCost(state.branches.length);
  if (state.cash < cost) return { ok: false, message: `资金不足，需要 ${cost.toFixed(1)}M` };
  state.cash -= cost;
  state.branches.push(cityId);
  return { ok: true, cost };
}

export function closeBranch(state, cityId) {
  if (!isBranch(state, cityId)) return { ok: false, message: '分部不存在' };
  const { affectedRoutes, affectedPlaneIds } = previewCloseBranchImpact(state, cityId);
  state.routes = state.routes.filter((route) => route.from !== cityId);
  state.branches = state.branches.filter((id) => id !== cityId);
  return { ok: true, affectedRoutes, affectedPlaneIds };
}

export function previewCloseBranchImpact(state, cityId) {
  const routes = Array.isArray(state?.routes) ? state.routes : [];
  const affectedRoutes = routes.filter((route) => route.from === cityId);
  const affectedPlaneIds = new Set(affectedRoutes.flatMap((route) => route.assignedPlanes || []));
  return { affectedRoutes, affectedPlaneIds };
}
