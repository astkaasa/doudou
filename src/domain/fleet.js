import { PLANES } from '../data/planes.js';
import { clamp, randInt } from './helpers.js';
import { syncStaffToNeeded } from './operations.js';

export function availablePlaneTemplates(state) {
  if (!state) return PLANES;
  return PLANES.filter((plane) => {
    const start = plane.serviceStart ?? -Infinity;
    const end = plane.serviceEnd ?? Infinity;
    return state.year >= start && state.year <= end;
  });
}

export function countBoughtPlanes(state) {
  return state.fleet.filter((plane) => !plane.isLease).length;
}

export function countLeasedPlanes(state) {
  return state.fleet.filter((plane) => plane.isLease).length;
}

export function maxLeasedPlanes(state) {
  return Math.floor(countBoughtPlanes(state) * 0.5);
}

export function quotePlaneAcquisition(state, planeId, isLease = false, count = 1) {
  const template = PLANES.find((p) => p.id === planeId);
  if (!template) return { ok: false, code: 'not-found', message: '机型不存在' };
  if (!availablePlaneTemplates(state).some((p) => p.id === planeId)) {
    return { ok: false, code: 'unavailable', template, message: `${template.name} 在当前年份不可用（服役期：${template.serviceStart}-${template.serviceEnd}）` };
  }
  const safeCount = clamp(parseInt(count, 10) || 1, 1, 10);
  const leaseFeePerPlane = isLease ? template.buyPrice * 0.1 : 0;
  const unitCost = isLease ? template.leasePrice + leaseFeePerPlane : template.buyPrice;
  const totalCost = unitCost * safeCount;
  const quote = {
    template,
    isLease: Boolean(isLease),
    count: safeCount,
    unitCost,
    totalCost,
    leaseFee: leaseFeePerPlane * safeCount,
    recurringCost: isLease ? template.leasePrice * safeCount : 0,
    deliveryTurns: isLease ? 0 : 2,
    cashAfter: state.cash - totalCost,
  };
  if (isLease) {
    if (countBoughtPlanes(state) < 1) return { ...quote, ok: false, code: 'lease-locked', message: '需先购买至少1架飞机才能租赁' };
    if (countLeasedPlanes(state) + safeCount > maxLeasedPlanes(state)) {
      return { ...quote, ok: false, code: 'lease-limit', message: `租赁飞机数量不能超过购买飞机的50%，当前上限 ${maxLeasedPlanes(state)} 架` };
    }
  }
  if (state.cash < totalCost) return { ...quote, ok: false, code: 'insufficient-cash', message: `资金不足，需要 ${totalCost.toFixed(1)}M` };
  return { ...quote, ok: true, code: 'ok' };
}

export function buyPlane(state, planeId, isLease, count = 1) {
  const quote = quotePlaneAcquisition(state, planeId, isLease, count);
  if (!quote.ok) return quote;
  const { template, count: safeCount, totalCost } = quote;
  state.cash -= totalCost;
  const planes = [];
  for (let i = 0; i < safeCount; i += 1) {
    const plane = {
      uid: state.planeIdCounter++,
      templateId: template.id,
      name: template.name,
      seats: template.seats,
      range: template.range,
      fuel: template.fuel,
      maint: template.maint,
      age: isLease ? randInt(2, 8) : 0,
      buyPrice: template.buyPrice,
      isLease,
      leasePrice: isLease ? template.leasePrice : 0,
      leaseTurns: 0,
      maxLeaseTurns: 40,
      delivering: !isLease,
      deliverIn: isLease ? 0 : 2,
    };
    planes.push(plane);
    state.fleet.push(plane);
  }
  syncStaffToNeeded(state, 0.8);
  return { ...quote, plane: planes[0], planes };
}

export function sellPlane(state, uid) {
  const plane = state.fleet.find((p) => p.uid === uid);
  if (!plane) return null;
  if (plane.isLease) return null;
  const sellPrice = plane.buyPrice * Math.max(0.15, 1 - plane.age * 0.04);
  state.cash += sellPrice;
  state.fleet = state.fleet.filter((p) => p.uid !== uid);
  state.routes.forEach((r) => {
    r.assignedPlanes = r.assignedPlanes.filter((id) => id !== uid);
  });
  syncStaffToNeeded(state, 0);
  return { plane, sellPrice };
}

export function returnLease(state, uid) {
  const plane = state.fleet.find((p) => p.uid === uid && p.isLease);
  if (!plane) return null;
  state.fleet = state.fleet.filter((p) => p.uid !== uid);
  state.routes.forEach((r) => {
    r.assignedPlanes = r.assignedPlanes.filter((id) => id !== uid);
  });
  syncStaffToNeeded(state, 0);
  return { plane };
}

export function advanceFleetAge(state) {
  state.deliveredThisTurn = [];
  state.fleet.forEach((p) => {
    if (p.delivering) {
      p.deliverIn--;
      if (p.deliverIn <= 0) {
        p.delivering = false;
        state.deliveredThisTurn.push({ name: p.name, uid: p.uid });
      }
    }
    if (p.isLease) {
      p.leaseTurns = (p.leaseTurns || 0) + 1;
      if (p.leaseTurns >= (p.maxLeaseTurns || 40)) p._leaseExpired = true;
    }
    p.age += 0.25;
  });
  const activeUids = new Set(state.fleet.filter((p) => p.age < 25 && !p._leaseExpired).map((p) => p.uid));
  state.fleet = state.fleet.filter((p) => activeUids.has(p.uid));
  state.routes.forEach((route) => {
    route.assignedPlanes = route.assignedPlanes.filter((uid) => activeUids.has(uid));
  });
  syncStaffToNeeded(state, 0);
}
