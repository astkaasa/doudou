import { AIRCRAFT_RETIREMENT_AGE_YEARS, LEASE_TERM_QUARTERS } from '../domain/fleet.js';
import { assertGameState } from '../domain/invariants.js';
import { simulateGame } from './balance.js';

export const LONG_GAME_BASELINE = Object.freeze({
  eraId: 'era4',
  policyId: 'aggressive',
  hq: 'london',
  seed: 'long-game-baseline',
  maxTurns: 200,
});

export function createLongGameFixture(options = {}) {
  const config = { ...LONG_GAME_BASELINE, ...options };
  const onTurn = options.onTurn;
  let state = null;
  const result = simulateGame({
    ...config,
    onTurn: (event) => {
      state = event.state;
      onTurn?.(event);
    },
  });
  if (!state) throw new Error('Long-game fixture did not advance a quarter');
  assertGameState(state);
  return {
    config,
    result,
    state,
    summary: summarizeLongGameState(state),
  };
}

export function summarizeLongGameState(state) {
  const routes = Array.isArray(state?.routes) ? state.routes : [];
  const fleet = Array.isArray(state?.fleet) ? state.fleet : [];
  const assignedUids = new Set(routes.flatMap((route) => route.assignedPlanes || []));
  const activeRoutes = routes.filter((route) => !route.suspended);
  const ownedPlanes = fleet.filter((plane) => !plane.isLease);
  const leasedPlanes = fleet.filter((plane) => plane.isLease);
  return {
    period: `${state?.year || 0} Q${state?.quarter || 0}`,
    turnsPlayed: Number(state?.turnsPlayed) || 0,
    routes: routes.length,
    activeRoutes: activeRoutes.length,
    suspendedRoutes: routes.length - activeRoutes.length,
    lossRoutes: activeRoutes.filter((route) => (Number(route.profit) || 0) < 0).length,
    lowLoadRoutes: activeRoutes.filter((route) => (Number(route.loadFactor) || 0) < 0.6).length,
    unassignedRoutes: activeRoutes.filter((route) => (route.assignedPlanes || []).length === 0).length,
    fleet: fleet.length,
    ownedPlanes: ownedPlanes.length,
    leasedPlanes: leasedPlanes.length,
    idlePlanes: fleet.filter((plane) => !plane.delivering && !assignedUids.has(plane.uid)).length,
    deliveringPlanes: fleet.filter((plane) => plane.delivering).length,
    leasesExpiringWithinFourQuarters: leasedPlanes.filter((plane) => (
      (Number(plane.maxLeaseTurns) || LEASE_TERM_QUARTERS) - (Number(plane.leaseTurns) || 0) <= 4
    )).length,
    ownedPlanesRetiringWithinTwoYears: ownedPlanes.filter((plane) => (
      AIRCRAFT_RETIREMENT_AGE_YEARS - (Number(plane.age) || 0) <= 2
    )).length,
    branches: Array.isArray(state?.branches) ? state.branches.length : 0,
    subsidiaries: Object.values(state?.subsidiaries || {}).flat().length,
  };
}
