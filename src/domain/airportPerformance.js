import { getAirport } from './airports.js';
import { airportRunwayMultiplier } from './airportManagement.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function planeAirportPerformance(plane, airportOrId, state = null) {
  const airport = typeof airportOrId === 'string' ? getAirport(airportOrId) : airportOrId;
  if (!plane || !airport) return { compatible: false, factor: 0, reasons: ['机场或机型不存在'] };
  if (airport.source?.provider === 'abstract') return { compatible: true, factor: 1, reasons: [] };
  const requirements = plane.airportPerformance || {};
  const runwayM = (Number(airport.factual?.maxRunwayM) || 0) * airportRunwayMultiplier(state, airport.id);
  const minRunwayM = Number(requirements.minRunwayM) || 0;
  const infrastructureTier = Number(airport.gameplay?.infrastructureTier) || 1;
  const requiredInfrastructureTier = Number(requirements.requiredInfrastructureTier) || 1;
  const reasons = [];

  if (runwayM <= 0) return { compatible: false, factor: 0, reasons: ['缺少可用跑道'] };
  const runwayRatio = minRunwayM > 0 ? runwayM / minRunwayM : 1;
  if (runwayRatio < 0.65) return { compatible: false, factor: 0, reasons: [`跑道仅 ${runwayM}m`] };
  let factor = runwayRatio >= 1 ? 1 : 0.65 + ((runwayRatio - 0.65) / 0.35) * 0.35;
  if (runwayRatio < 1) reasons.push(`短跑道减载 ${runwayM}m/${minRunwayM}m`);

  if (requirements.hardSurfaceRequired && !airport.factual?.hardSurface) {
    if (plane.type === 'superjumbo') return { compatible: false, factor: 0, reasons: ['大型机需要硬化跑道'] };
    factor *= 0.75;
    reasons.push('非硬化跑道减载');
  }

  const infrastructureGap = requiredInfrastructureTier - infrastructureTier;
  if (infrastructureGap >= 3) return { compatible: false, factor: 0, reasons: ['机场设施等级不足'] };
  if (infrastructureGap > 0) {
    factor *= Math.pow(0.85, infrastructureGap);
    reasons.push(`设施等级 ${infrastructureTier}/${requiredInfrastructureTier}`);
  }

  const elevationFt = Math.max(0, Number(airport.factual?.elevationFt) || 0);
  if (elevationFt > 2500) {
    const resilience = clamp(Number(requirements.hotHighPerformance) || 0.7, 0.4, 1);
    const elevationPenalty = clamp(((elevationFt - 2500) / 12000) * (1.2 - resilience), 0, 0.5);
    factor *= 1 - elevationPenalty;
    if (elevationPenalty >= 0.03) reasons.push(`高原减载 ${Math.round(elevationFt)}ft`);
  }

  factor = clamp(factor, 0.35, 1);
  return { compatible: true, factor, reasons };
}

export function routePlanePerformance(route, plane, state = null) {
  const from = planeAirportPerformance(plane, route?.fromAirportId, state);
  const to = planeAirportPerformance(plane, route?.toAirportId, state);
  if (!from.compatible || !to.compatible) {
    return {
      compatible: false,
      factor: 0,
      reasons: [...from.reasons, ...to.reasons],
      from,
      to,
    };
  }
  return {
    compatible: true,
    factor: Math.min(from.factor, to.factor),
    reasons: [...new Set([...from.reasons, ...to.reasons])],
    from,
    to,
  };
}

export function routePlaneSeatCapacity(route, plane, state = null) {
  const performance = routePlanePerformance(route, plane, state);
  return performance.compatible ? Math.max(1, Math.floor(plane.seats * performance.factor)) : 0;
}
