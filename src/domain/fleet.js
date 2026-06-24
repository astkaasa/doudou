import { PLANES } from '../data/planes.js';
import { randInt } from './helpers.js';

export function buyPlane(state, planeId, isLease) {
  const template = PLANES.find((p) => p.id === planeId);
  if (!template) return { ok: false, message: '机型不存在' };
  const cost = isLease ? template.leasePrice : template.buyPrice;
  if (state.cash < cost) return { ok: false, message: '资金不足！' };
  state.cash -= cost;
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
    delivering: !isLease,
    deliverIn: isLease ? 0 : 2,
  };
  state.fleet.push(plane);
  return { ok: true, plane };
}

export function sellPlane(state, uid) {
  const plane = state.fleet.find((p) => p.uid === uid);
  if (!plane) return null;
  const sellPrice = plane.buyPrice * Math.max(0.1, 1 - plane.age * 0.06);
  state.cash += sellPrice;
  state.fleet = state.fleet.filter((p) => p.uid !== uid);
  state.routes.forEach((r) => {
    r.assignedPlanes = r.assignedPlanes.filter((id) => id !== uid);
  });
  return { plane, sellPrice };
}

export function advanceFleetAge(state) {
  state.fleet.forEach((p) => {
    if (p.delivering) {
      p.deliverIn--;
      if (p.deliverIn <= 0) p.delivering = false;
    }
    p.age += 0.25;
  });
  state.fleet = state.fleet.filter((p) => p.age < 25);
}
