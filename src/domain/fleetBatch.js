import {
  countBoughtPlanes,
  countLeasedPlanes,
  maxLeasedPlanes,
  planeSellPrice,
  returnLease,
  sellPlane,
} from './fleet.js';

export function quoteIdleFleetDisposal(state, planeUids) {
  const requestedUids = normalizePlaneUids(planeUids);
  const fleetByUid = new Map((Array.isArray(state?.fleet) ? state.fleet : []).map((plane) => [plane.uid, plane]));
  const assignedUids = new Set((Array.isArray(state?.routes) ? state.routes : [])
    .flatMap((route) => Array.isArray(route.assignedPlanes) ? route.assignedPlanes : []));
  const entries = [];
  const rejected = [];

  requestedUids.forEach((uid) => {
    const plane = fleetByUid.get(uid);
    if (!plane) {
      rejected.push({ uid, code: 'missing', plane: null });
      return;
    }
    if (plane.delivering) {
      rejected.push({ uid, code: 'delivering', plane });
      return;
    }
    if (assignedUids.has(uid)) {
      rejected.push({ uid, code: 'assigned', plane });
      return;
    }
    entries.push({
      uid,
      plane,
      action: plane.isLease ? 'return_lease' : 'sell',
      saleProceeds: planeSellPrice(plane),
      quarterlyLeaseSavings: plane.isLease ? Math.max(0, Number(plane.leasePrice) || 0) : 0,
    });
  });

  const ownedCount = entries.filter((entry) => entry.action === 'sell').length;
  const leasedCount = entries.filter((entry) => entry.action === 'return_lease').length;
  const saleProceeds = entries.reduce((sum, entry) => sum + entry.saleProceeds, 0);
  const quarterlyLeaseSavings = entries.reduce((sum, entry) => sum + entry.quarterlyLeaseSavings, 0);
  const ownedAfter = countBoughtPlanes(state) - ownedCount;
  const leasedAfter = countLeasedPlanes(state) - leasedCount;
  const leaseLimitBefore = maxLeasedPlanes(state);
  const leaseLimitAfter = Math.floor(Math.max(0, ownedAfter) * 0.5);

  return {
    ok: entries.length > 0 && rejected.length === 0,
    requestedUids,
    entries,
    rejected,
    ownedCount,
    leasedCount,
    saleProceeds,
    quarterlyLeaseSavings,
    cashAfter: (Number(state?.cash) || 0) + saleProceeds,
    affectedRouteCount: 0,
    ownedAfter,
    leasedAfter,
    leaseLimitBefore,
    leaseLimitAfter,
    leaseLimitExceededAfter: leasedAfter > leaseLimitAfter,
  };
}

export function disposeIdleFleet(state, planeUids) {
  const quote = quoteIdleFleetDisposal(state, planeUids);
  if (!quote.ok) return { ...quote, disposed: [] };
  const disposed = quote.entries.map((entry) => (
    entry.action === 'sell' ? sellPlane(state, entry.uid) : returnLease(state, entry.uid)
  ));
  return { ...quote, ok: disposed.every(Boolean), disposed };
}

function normalizePlaneUids(planeUids) {
  const values = Array.isArray(planeUids) ? planeUids : [];
  return [...new Set(values.map(Number).filter((uid) => Number.isInteger(uid) && uid > 0))];
}
