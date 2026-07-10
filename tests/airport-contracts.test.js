import { describe, expect, it } from 'vitest';

import {
  acceptAirportContract,
  compatibleContractPlanes,
  getAirportOpportunityPool,
  refreshAirportContractOffers,
  settleAirportContracts,
} from '../src/domain/airportContracts.js';
import { airportServesCity, getAirportByIdent } from '../src/domain/airports.js';
import { airportRelation } from '../src/domain/airportManagement.js';
import { assertGameState } from '../src/domain/invariants.js';
import { closeRoute } from '../src/domain/routes.js';
import { initState, seedInitialFleet } from '../src/domain/state.js';

function contractState() {
  const state = initState('beijing', 'era3', { seed: 'airport-contract-test' });
  seedInitialFleet(state);
  return state;
}

function viableOffer(state) {
  const offers = refreshAirportContractOffers(state);
  return offers.find((offer) => compatibleContractPlanes(state, offer).length > 0);
}

describe('airport route-development contracts', () => {
  it('builds a broad but audited regional opportunity pool', () => {
    const state = contractState();
    const pool = getAirportOpportunityPool(state);

    expect(pool.length).toBeGreaterThan(100);
    expect(pool.every((item) => item.airport.source.provider === 'ourairports')).toBe(true);
    expect(pool.every((item) => item.airport.factual.maxRunwayM >= 900)).toBe(true);
  });

  it('adds the renamed Palm Beach airport to opportunities from 2026 Q3', () => {
    const state = initState('newyork', 'era3', { seed: 'palm-beach-rename' });
    const trumpAirport = getAirportByIdent('KPBI');
    state.year = 2026;
    state.quarter = 2;

    expect(getAirportOpportunityPool(state).some((item) => item.airportId === trumpAirport.id)).toBe(false);
    state.quarter = 3;
    expect(getAirportOpportunityPool(state).some((item) => item.airportId === trumpAirport.id)).toBe(true);
  });

  it('accepts an actionable offer and completes it through quarterly targets', () => {
    const state = contractState();
    const offer = viableOffer(state);
    const plane = compatibleContractPlanes(state, offer)[0];

    const accepted = acceptAirportContract(state, offer.id, plane.uid);

    expect(accepted.ok).toBe(true);
    expect(accepted.route.airportContractId).toBe(offer.id);
    expect(airportServesCity(accepted.route.toAirportId, offer.cityId)).toBe(true);
    expect(accepted.route.toAirportId).toBe(offer.airportId);
    for (let quarter = 0; quarter < offer.durationQuarters; quarter++) {
      accepted.route.loadFactor = 0.8;
      settleAirportContracts(state);
    }
    const completed = state.airportContracts.find((contract) => contract.id === offer.id);
    expect(completed.status).toBe('completed');
    expect(completed.metQuarters).toBe(offer.durationQuarters);
    expect(airportRelation(state, offer.airportId)).toBeGreaterThanOrEqual(10);
    expect(accepted.route.airportContractId).toBeUndefined();
    assertGameState(state);
  });

  it('recovers part of the subsidy and lowers relations after a closed-route breach', () => {
    const state = contractState();
    const offer = viableOffer(state);
    const plane = compatibleContractPlanes(state, offer)[0];
    const accepted = acceptAirportContract(state, offer.id, plane.uid);
    closeRoute(state, accepted.route.from, accepted.route.to);

    const settlement = settleAirportContracts(state);
    const breached = state.airportContracts.find((contract) => contract.id === offer.id);

    expect(breached.status).toBe('breached');
    expect(settlement.penalty).toBeCloseTo(offer.upfrontSubsidy * 0.5);
    expect(airportRelation(state, offer.airportId)).toBeLessThan(0);
    assertGameState(state);
  });
});
