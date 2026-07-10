import { AI_PROFILES } from '../data/aiProfiles.js';
import { AIRPORTS, CITY_AIRPORT_IDS, DEFAULT_AIRPORT_IDS } from '../data/airports.generated.js';
import { CITIES, HQ_RECOMMENDED_CITY_IDS } from '../data/cities.js';
import { ERAS } from '../data/eras.js';
import { MAIN_QUEST_STAGES, VICTORY_GRADES } from '../data/mainQuest.js';
import { MEGA_EVENTS } from '../data/megaEvents.js';
import { NEWS_POOL } from '../data/news.js';
import { PLANES } from '../data/planes.js';
import { STOCKS, STOCK_SECTORS } from '../data/stocks.js';
import { ERA_SETTLEMENT_OUTCOMES, ERA_SETTLEMENT_STATUSES, eraSettlementDeadlineTurns } from './eraSettlement.js';
import { routeKey } from './helpers.js';
import { airportServesCity } from './airports.js';

const CITY_IDS = new Set(CITIES.map((city) => city.id));
const ERA_IDS = new Set(ERAS.map((era) => era.id));
const PLANE_IDS = new Set(PLANES.map((plane) => plane.id));
const AIRPORT_IDS = new Set(AIRPORTS.map((airport) => airport.id));
const AIRPORT_CONTRACT_STATUSES = new Set(['offered', 'active', 'completed', 'breached', 'expired']);
const AIRPORT_RELOCATION_STATUSES = new Set(['pending', 'relocated', 'continued', 'closed']);

export function validateStaticData() {
  const issues = [];

  validateUniqueIds(issues, 'cities', CITIES);
  CITIES.forEach((city, index) => {
    const path = `cities[${index}]`;
    requireText(issues, `${path}.name`, city.name);
    requireFiniteRange(issues, `${path}.lat`, city.lat, -90, 90);
    requireFiniteRange(issues, `${path}.lon`, city.lon, -180, 180);
    requirePositive(issues, `${path}.pop`, city.pop);
    requirePositive(issues, `${path}.level`, city.level);
    requireText(issues, `${path}.region`, city.region);
    requireText(issues, `${path}.subRegion`, city.subRegion);
    requireText(issues, `${path}.networkRegion`, city.networkRegion);
    requireText(issues, `${path}.marketRole`, city.marketRole);
    requirePositive(issues, `${path}.marketTier`, city.marketTier);
    const eventZones = requireArray(issues, `${path}.eventZones`, city.eventZones);
    eventZones.forEach((zone, zoneIndex) => requireText(issues, `${path}.eventZones[${zoneIndex}]`, zone));
  });
  validateReferences(issues, 'hqRecommendedCityIds', HQ_RECOMMENDED_CITY_IDS, CITY_IDS);

  validateUniqueIds(issues, 'airports', AIRPORTS);
  AIRPORTS.forEach((airport, index) => {
    const path = `airports[${index}]`;
    requireText(issues, `${path}.cityId`, airport.cityId);
    requireText(issues, `${path}.name`, airport.name);
    requireFiniteRange(issues, `${path}.lat`, airport.lat, -90, 90);
    requireFiniteRange(issues, `${path}.lon`, airport.lon, -180, 180);
    const servedCityIds = requireArray(issues, `${path}.servedCityIds`, airport.servedCityIds);
    servedCityIds.forEach((cityId, cityIndex) => {
      if (!CITY_IDS.has(cityId)) issues.push(`${path}.servedCityIds[${cityIndex}] references unknown city ${String(cityId)}`);
    });
  });
  CITIES.forEach((city) => {
    const airportIds = CITY_AIRPORT_IDS[city.id];
    if (!Array.isArray(airportIds) || !airportIds.includes(`virtual-${city.id}`)) {
      issues.push(`city ${city.id} must include its abstract airport`);
    }
    (airportIds || []).forEach((airportId) => {
      if (!AIRPORT_IDS.has(airportId)) issues.push(`city ${city.id} references unknown airport ${String(airportId)}`);
      else if (!airportServesCity(airportId, city.id)) issues.push(`airport ${airportId} does not serve city ${city.id}`);
    });
    if (!airportServesCity(DEFAULT_AIRPORT_IDS[city.id], city.id)) {
      issues.push(`default airport for ${city.id} is invalid`);
    }
  });

  validateUniqueIds(issues, 'eras', ERAS);
  ERAS.forEach((era, index) => {
    const path = `eras[${index}]`;
    requireInteger(issues, `${path}.startYear`, era.startYear);
    requireInteger(issues, `${path}.endYear`, era.endYear);
    if (Number.isInteger(era.startYear) && Number.isInteger(era.endYear) && era.endYear <= era.startYear) {
      issues.push(`${path}.endYear must be later than startYear`);
    }
    requirePositive(issues, `${path}.cash`, era.cash);
    requirePositive(issues, `${path}.startOil`, era.startOil);
    requirePositive(issues, `${path}.cabinCostMultiplier`, era.cabinCostMultiplier);
  });

  validateMainQuestData(issues);

  validateUniqueIds(issues, 'planes', PLANES);
  PLANES.forEach((plane, index) => {
    const path = `planes[${index}]`;
    requireText(issues, `${path}.name`, plane.name);
    requireText(issues, `${path}.type`, plane.type);
    if (plane.fictional !== undefined && typeof plane.fictional !== 'boolean') {
      issues.push(`${path}.fictional must be a boolean`);
    }
    ['seats', 'range', 'fuel', 'maint', 'buyPrice', 'leasePrice'].forEach((field) => {
      requirePositive(issues, `${path}.${field}`, plane[field]);
    });
    if (!plane.airportPerformance || typeof plane.airportPerformance !== 'object') {
      issues.push(`${path}.airportPerformance is required`);
    } else {
      requirePositive(issues, `${path}.airportPerformance.minRunwayM`, plane.airportPerformance.minRunwayM);
      requirePositiveInteger(issues, `${path}.airportPerformance.requiredInfrastructureTier`, plane.airportPerformance.requiredInfrastructureTier);
      requireFiniteRange(issues, `${path}.airportPerformance.hotHighPerformance`, plane.airportPerformance.hotHighPerformance, 0, 1);
    }
    requireInteger(issues, `${path}.serviceStart`, plane.serviceStart);
    requireInteger(issues, `${path}.serviceEnd`, plane.serviceEnd);
    if (Number.isInteger(plane.serviceStart) && Number.isInteger(plane.serviceEnd) && plane.serviceEnd < plane.serviceStart) {
      issues.push(`${path}.serviceEnd must not precede serviceStart`);
    }
  });

  validateUniqueValues(issues, 'aiProfiles.name', AI_PROFILES.map((profile) => profile.name));
  AI_PROFILES.forEach((profile, index) => {
    const path = `aiProfiles[${index}]`;
    requireText(issues, `${path}.name`, profile.name);
    requirePositive(issues, `${path}.priceMul`, profile.priceMul);
    requireFiniteRange(issues, `${path}.riskAverse`, profile.riskAverse, 0, 1);
  });

  validateUniqueIds(issues, 'megaEvents', MEGA_EVENTS);
  MEGA_EVENTS.forEach((event, index) => {
    const path = `megaEvents[${index}]`;
    if (!['olympics_summer', 'world_expo', 'world_cup'].includes(event.type)) {
      issues.push(`${path}.type is invalid: ${String(event.type)}`);
    }
    if (!CITY_IDS.has(event.cityId)) issues.push(`${path}.cityId references unknown city ${String(event.cityId)}`);
    requireText(issues, `${path}.name`, event.name);
    requireText(issues, `${path}.fullName`, event.fullName);
    requireText(issues, `${path}.desc`, event.desc);
    requireInteger(issues, `${path}.year`, event.year);
    requireFiniteRange(issues, `${path}.quarter`, event.quarter, 1, 4, true);
    requireFiniteRange(issues, `${path}.maxBoost`, event.maxBoost, 0.01, 1);
  });

  validateNewsData(issues);

  validateUniqueIds(issues, 'stocks', STOCKS);
  validateUniqueValues(issues, 'stocks.code', STOCKS.map((stock) => stock.code));
  STOCKS.forEach((stock, index) => {
    const path = `stocks[${index}]`;
    if (!STOCK_SECTORS[stock.sector]) issues.push(`${path}.sector references unknown sector ${String(stock.sector)}`);
    requirePositive(issues, `${path}.basePrice`, stock.basePrice);
    requirePositive(issues, `${path}.beta`, stock.beta);
    requireFiniteRange(issues, `${path}.dividendYield`, stock.dividendYield, 0, 1);
  });

  return issues;
}

function validateNewsData(issues) {
  const titles = [];
  Object.entries(NEWS_POOL).forEach(([category, items]) => {
    requireArray(issues, `news.${category}`, items).forEach((item, index) => {
      const path = `news.${category}[${index}]`;
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        issues.push(`${path} must be an object`);
        return;
      }
      requireText(issues, `${path}.title`, item.title);
      requireText(issues, `${path}.desc`, item.desc);
      requireText(issues, `${path}.effect`, item.effect);
      titles.push(item.title);

      if (item.startYear !== undefined) requireInteger(issues, `${path}.startYear`, item.startYear);
      if (item.endYear !== undefined) requireInteger(issues, `${path}.endYear`, item.endYear);
      ['scheduled', 'requiresRoutes', 'requiresAirportRoutes'].forEach((field) => {
        if (item[field] !== undefined && typeof item[field] !== 'boolean') {
          issues.push(`${path}.${field} must be a boolean`);
        }
      });
      if (Number.isInteger(item.startYear) && Number.isInteger(item.endYear) && item.endYear < item.startYear) {
        issues.push(`${path}.endYear must not precede startYear`);
      }
      if (item.years !== undefined) {
        const years = requireArray(issues, `${path}.years`, item.years);
        if (years.length === 0) issues.push(`${path}.years must not be empty`);
        validateUniqueValues(issues, `${path}.years`, years);
        years.forEach((year, yearIndex) => requireInteger(issues, `${path}.years[${yearIndex}]`, year));
      }
      if (item.quarters !== undefined) {
        const quarters = requireArray(issues, `${path}.quarters`, item.quarters);
        if (quarters.length === 0) issues.push(`${path}.quarters must not be empty`);
        validateUniqueValues(issues, `${path}.quarters`, quarters);
        quarters.forEach((quarter, quarterIndex) => {
          requireFiniteRange(issues, `${path}.quarters[${quarterIndex}]`, quarter, 1, 4, true);
        });
      }
    });
  });
  validateUniqueValues(issues, 'news.title', titles);
}

function validateMainQuestData(issues) {
  validateUniqueValues(issues, 'mainQuestStages.stage', MAIN_QUEST_STAGES.map((stage) => stage.stage));
  MAIN_QUEST_STAGES.forEach((stage, index) => {
    const path = `mainQuestStages[${index}]`;
    requirePositiveInteger(issues, `${path}.stage`, stage.stage);
    requireText(issues, `${path}.title`, stage.title);
    requireText(issues, `${path}.targets.branch.type`, stage.targets?.branch?.type);
    if (!['region', 'subRegion', 'networkRegion'].includes(stage.targets?.branch?.type)) {
      issues.push(`${path}.targets.branch.type is invalid`);
    }
    ERAS.forEach((era) => {
      requirePositive(issues, `${path}.targets.cash.${era.id}`, stage.targets?.cash?.[era.id]);
      requirePositiveInteger(issues, `${path}.targets.routes.${era.id}`, stage.targets?.routes?.[era.id]);
      requirePositiveInteger(issues, `${path}.targets.branch.min.${era.id}`, stage.targets?.branch?.min?.[era.id]);
      requirePositiveInteger(issues, `${path}.targets.profit.consecutive.${era.id}`, stage.targets?.profit?.consecutive?.[era.id]);
    });
  });

  validateUniqueValues(issues, 'victoryGrades.grade', VICTORY_GRADES.map((grade) => grade.grade));
  VICTORY_GRADES.forEach((grade, index) => {
    const path = `victoryGrades[${index}]`;
    requireText(issues, `${path}.grade`, grade.grade);
    requireText(issues, `${path}.title`, grade.title);
    if (index === VICTORY_GRADES.length - 1) {
      if (grade.maxTurns !== Infinity) issues.push(`${path}.maxTurns must be Infinity`);
      return;
    }
    ERAS.forEach((era) => requirePositiveInteger(issues, `${path}.maxTurns.${era.id}`, grade.maxTurns?.[era.id]));
  });
}

export function validateGameState(state, options = {}) {
  const issues = [];
  const allowSetup = options.allowSetup === true;
  if (!state || typeof state !== 'object' || Array.isArray(state)) return ['state must be an object'];

  if (!ERA_IDS.has(state.era)) issues.push(`state.era references unknown era ${String(state.era)}`);
  if (state.hq === null && !allowSetup) issues.push('state.hq is required after setup');
  if (state.hq !== null && !CITY_IDS.has(state.hq)) issues.push(`state.hq references unknown city ${String(state.hq)}`);
  requireFinite(issues, 'state.cash', state.cash);
  requireInteger(issues, 'state.year', state.year);
  requireInteger(issues, 'state.endYear', state.endYear);
  requireFiniteRange(issues, 'state.quarter', state.quarter, 1, 4, true);
  requirePositive(issues, 'state.oilPrice', state.oilPrice);
  requireFiniteRange(issues, 'state.brand', state.brand, 1, 10);
  requireNonNegativeInteger(issues, 'state.turnsPlayed', state.turnsPlayed);
  requirePositiveInteger(issues, 'state.planeIdCounter', state.planeIdCounter);
  requirePositiveInteger(issues, 'state.routeIdCounter', state.routeIdCounter);
  validateRandomState(issues, state.rng);
  validateEraSettlementState(issues, state);

  const fleet = requireArray(issues, 'state.fleet', state.fleet);
  const routes = requireArray(issues, 'state.routes', state.routes);
  const aiPlayers = requireArray(issues, 'state.ai', state.ai);
  const branches = requireArray(issues, 'state.branches', state.branches);
  const constructing = requireArray(issues, 'state.branchesConstructing', state.branchesConstructing);

  const fleetUids = new Set();
  let maxNumericUid = 0;
  fleet.forEach((plane, index) => {
    const path = `state.fleet[${index}]`;
    if (!plane || typeof plane !== 'object') {
      issues.push(`${path} must be an object`);
      return;
    }
    if (plane.uid === undefined || plane.uid === null || plane.uid === '') issues.push(`${path}.uid is required`);
    else if (fleetUids.has(plane.uid)) issues.push(`${path}.uid duplicates ${String(plane.uid)}`);
    else fleetUids.add(plane.uid);
    if (Number.isInteger(plane.uid)) maxNumericUid = Math.max(maxNumericUid, plane.uid);
    const templateId = plane.templateId || plane.id;
    if (!PLANE_IDS.has(templateId)) issues.push(`${path}.templateId references unknown plane ${String(templateId)}`);
    requireNonNegative(issues, `${path}.age`, plane.age);
    if (plane.delivering) requirePositiveInteger(issues, `${path}.deliverIn`, plane.deliverIn);
  });
  if (Number.isInteger(state.planeIdCounter) && state.planeIdCounter <= maxNumericUid) {
    issues.push('state.planeIdCounter must be greater than every numeric fleet uid');
  }

  const assignedPlaneUids = new Set();
  const routeKeys = new Set();
  const routeUids = new Set();
  let maxRouteUid = 0;
  routes.forEach((route, index) => {
    const path = `state.routes[${index}]`;
    validateRoute(issues, route, path, routeKeys, routeUids);
    if (Number.isInteger(route?.uid)) maxRouteUid = Math.max(maxRouteUid, route.uid);
    if (route && !isBaseCity(state, route.from)) issues.push(`${path}.from must be the headquarters or an active branch`);
    const assignedPlanes = Array.isArray(route?.assignedPlanes) ? route.assignedPlanes : [];
    assignedPlanes.forEach((uid, planeIndex) => {
      if (!fleetUids.has(uid)) issues.push(`${path}.assignedPlanes[${planeIndex}] references missing fleet uid ${String(uid)}`);
      if (assignedPlaneUids.has(uid)) issues.push(`${path}.assignedPlanes[${planeIndex}] assigns fleet uid ${String(uid)} more than once`);
      assignedPlaneUids.add(uid);
    });
  });
  if (Number.isInteger(state.routeIdCounter) && state.routeIdCounter <= maxRouteUid) {
    issues.push('state.routeIdCounter must be greater than every route uid');
  }

  validateBranchState(issues, state, branches, constructing);
  validateCityStates(issues, state.cityStates);
  validateAiState(issues, aiPlayers);
  validateAirportManagementState(issues, state);

  return issues;
}

function validateAirportManagementState(issues, state) {
  if (!state.airportRelations || typeof state.airportRelations !== 'object' || Array.isArray(state.airportRelations)) {
    issues.push('state.airportRelations must be an object');
  } else {
    Object.entries(state.airportRelations).forEach(([airportId, relation]) => {
      if (!AIRPORT_IDS.has(airportId)) issues.push(`state.airportRelations references unknown airport ${airportId}`);
      requireFiniteRange(issues, `state.airportRelations.${airportId}`, relation, -100, 100, true);
    });
  }

  const contracts = requireArray(issues, 'state.airportContracts', state.airportContracts);
  const contractIds = new Set();
  contracts.forEach((contract, index) => {
    const path = `state.airportContracts[${index}]`;
    if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
      issues.push(`${path} must be an object`);
      return;
    }
    requireText(issues, `${path}.id`, contract.id);
    if (contractIds.has(contract.id)) issues.push(`${path}.id duplicates ${String(contract.id)}`);
    contractIds.add(contract.id);
    if (!AIRPORT_CONTRACT_STATUSES.has(contract.status)) issues.push(`${path}.status is invalid`);
    if (!airportServesCity(contract.airportId, contract.cityId)) issues.push(`${path}.airportId does not serve ${String(contract.cityId)}`);
    if (!CITY_IDS.has(contract.originCityId)) issues.push(`${path}.originCityId references unknown city ${String(contract.originCityId)}`);
    requireNonNegativeInteger(issues, `${path}.remainingQuarters`, contract.remainingQuarters);
    requireNonNegativeInteger(issues, `${path}.metQuarters`, contract.metQuarters);
    requireNonNegativeInteger(issues, `${path}.missedQuarters`, contract.missedQuarters);
  });
  requirePositiveInteger(issues, 'state.airportContractIdCounter', state.airportContractIdCounter);

  const relocations = requireArray(issues, 'state.airportRelocations', state.airportRelocations);
  const relocationIds = new Set();
  relocations.forEach((record, index) => {
    const path = `state.airportRelocations[${index}]`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      issues.push(`${path} must be an object`);
      return;
    }
    requireText(issues, `${path}.id`, record.id);
    if (relocationIds.has(record.id)) issues.push(`${path}.id duplicates ${String(record.id)}`);
    relocationIds.add(record.id);
    if (!AIRPORT_RELOCATION_STATUSES.has(record.status)) issues.push(`${path}.status is invalid`);
    if (!AIRPORT_IDS.has(record.fromAirportId)) issues.push(`${path}.fromAirportId references unknown airport`);
    if (!AIRPORT_IDS.has(record.toAirportId)) issues.push(`${path}.toAirportId references unknown airport`);
    if (!CITY_IDS.has(record.cityId)) issues.push(`${path}.cityId references unknown city`);
    requireNonNegative(issues, `${path}.migrationCost`, record.migrationCost);
    requireArray(issues, `${path}.affectedRouteUids`, record.affectedRouteUids)
      .forEach((uid, uidIndex) => requirePositiveInteger(issues, `${path}.affectedRouteUids[${uidIndex}]`, uid));
  });
  requirePositiveInteger(issues, 'state.airportRelocationIdCounter', state.airportRelocationIdCounter);

  Object.entries(state.subsidiaries || {}).forEach(([cityId, entries]) => {
    (entries || []).filter((entry) => entry?.type === 'airport').forEach((entry, index) => {
      const path = `state.subsidiaries.${cityId}[${index}]`;
      if (!airportServesCity(entry.airportId, cityId)) issues.push(`${path}.airportId does not serve ${cityId}`);
      const upgrades = entry.upgrades && typeof entry.upgrades === 'object' && !Array.isArray(entry.upgrades)
        ? Object.values(entry.upgrades).filter((value) => Number(value) > 0).length
        : 0;
      if (upgrades > 3) issues.push(`${path}.upgrades exceeds three slots`);
    });
  });
}

export function assertGameState(state, options) {
  const issues = validateGameState(state, options);
  if (issues.length === 0) return state;
  const error = new Error(`Invalid game state:\n- ${issues.join('\n- ')}`);
  error.code = 'INVALID_GAME_STATE';
  error.issues = issues;
  throw error;
}

function validateRoute(issues, route, path, keys, uids) {
  if (!route || typeof route !== 'object') {
    issues.push(`${path} must be an object`);
    return;
  }
  if (!CITY_IDS.has(route.from)) issues.push(`${path}.from references unknown city ${String(route.from)}`);
  if (!CITY_IDS.has(route.to)) issues.push(`${path}.to references unknown city ${String(route.to)}`);
  if (route.from === route.to) issues.push(`${path} must connect two different cities`);
  requirePositiveInteger(issues, `${path}.uid`, route.uid);
  if (uids.has(route.uid)) issues.push(`${path}.uid duplicates ${String(route.uid)}`);
  uids.add(route.uid);
  if (!airportServesCity(route.fromAirportId, route.from)) issues.push(`${path}.fromAirportId does not serve ${String(route.from)}`);
  if (!airportServesCity(route.toAirportId, route.to)) issues.push(`${path}.toAirportId does not serve ${String(route.to)}`);
  if (route.fromAlternateAirportId !== null && route.fromAlternateAirportId !== undefined) {
    if (!AIRPORT_IDS.has(route.fromAlternateAirportId)) issues.push(`${path}.fromAlternateAirportId references unknown airport`);
    if (route.fromAlternateAirportId === route.fromAirportId) issues.push(`${path}.fromAlternateAirportId duplicates the primary airport`);
  }
  if (route.toAlternateAirportId !== null && route.toAlternateAirportId !== undefined) {
    if (!AIRPORT_IDS.has(route.toAlternateAirportId)) issues.push(`${path}.toAlternateAirportId references unknown airport`);
    if (route.toAlternateAirportId === route.toAirportId) issues.push(`${path}.toAlternateAirportId duplicates the primary airport`);
  }
  if (CITY_IDS.has(route.from) && CITY_IDS.has(route.to)) {
    const key = routeKey(route.from, route.to);
    if (keys.has(key)) issues.push(`${path} duplicates route ${key}`);
    keys.add(key);
  }
  requirePositive(issues, `${path}.price`, route.price);
  requirePositive(issues, `${path}.serviceMultiplier`, route.serviceMultiplier);
  requireArray(issues, `${path}.assignedPlanes`, route.assignedPlanes);
}

function validateBranchState(issues, state, branches, constructing) {
  validateUniqueValues(issues, 'state.branches', branches);
  branches.forEach((cityId, index) => {
    if (!CITY_IDS.has(cityId)) issues.push(`state.branches[${index}] references unknown city ${String(cityId)}`);
    if (cityId === state.hq) issues.push(`state.branches[${index}] duplicates the headquarters`);
  });
  const constructingIds = [];
  constructing.forEach((branch, index) => {
    const path = `state.branchesConstructing[${index}]`;
    if (!branch || typeof branch !== 'object') {
      issues.push(`${path} must be an object`);
      return;
    }
    constructingIds.push(branch.cityId);
    if (!CITY_IDS.has(branch.cityId)) issues.push(`${path}.cityId references unknown city ${String(branch.cityId)}`);
    if (branch.cityId === state.hq || branches.includes(branch.cityId)) issues.push(`${path}.cityId is already an active base`);
    requirePositiveInteger(issues, `${path}.constructIn`, branch.constructIn);
  });
  validateUniqueValues(issues, 'state.branchesConstructing.cityId', constructingIds);
}

function validateCityStates(issues, cityStates) {
  if (!cityStates || typeof cityStates !== 'object' || Array.isArray(cityStates)) {
    issues.push('state.cityStates must be an object');
    return;
  }
  CITIES.forEach((city) => {
    const market = cityStates[city.id];
    if (!market || typeof market !== 'object') {
      issues.push(`state.cityStates.${city.id} is required`);
      return;
    }
    ['pop', 'biz', 'tour'].forEach((field) => requireNonNegative(issues, `state.cityStates.${city.id}.${field}`, market[field]));
  });
}

function validateAiState(issues, aiPlayers) {
  validateUniqueValues(issues, 'state.ai.name', aiPlayers.map((ai) => ai?.name));
  aiPlayers.forEach((ai, index) => {
    const path = `state.ai[${index}]`;
    if (!ai || typeof ai !== 'object') {
      issues.push(`${path} must be an object`);
      return;
    }
    requireText(issues, `${path}.name`, ai.name);
    requireFinite(issues, `${path}.cash`, ai.cash);
    const fleet = requireArray(issues, `${path}.fleet`, ai.fleet);
    const routes = requireArray(issues, `${path}.routes`, ai.routes);
    const fleetUids = new Set(fleet.map((plane) => plane?.uid));
    validateUniqueValues(issues, `${path}.fleet.uid`, fleet.map((plane) => plane?.uid));
    const routeKeys = new Set();
    routes.forEach((route, routeIndex) => {
      const routePath = `${path}.routes[${routeIndex}]`;
      if (!route || typeof route !== 'object') {
        issues.push(`${routePath} must be an object`);
        return;
      }
      if (!CITY_IDS.has(route.from) || !CITY_IDS.has(route.to) || route.from === route.to) {
        issues.push(`${routePath} has invalid endpoints`);
      } else {
        const key = routeKey(route.from, route.to);
        if (routeKeys.has(key)) issues.push(`${routePath} duplicates route ${key}`);
        routeKeys.add(key);
      }
      if (!fleetUids.has(route.assignedPlane)) issues.push(`${routePath}.assignedPlane references missing AI fleet uid ${String(route.assignedPlane)}`);
      if (!airportServesCity(route.fromAirportId, route.from)) issues.push(`${routePath}.fromAirportId does not serve ${String(route.from)}`);
      if (!airportServesCity(route.toAirportId, route.to)) issues.push(`${routePath}.toAirportId does not serve ${String(route.to)}`);
    });
  });
}

function validateRandomState(issues, rng) {
  if (!rng || typeof rng !== 'object' || Array.isArray(rng)) {
    issues.push('state.rng must be an object');
    return;
  }
  ['seed', 'state'].forEach((field) => {
    const value = rng[field];
    if (!Number.isInteger(value) || value < 0 || value >= 0x100000000) {
      issues.push(`state.rng.${field} must be an unsigned 32-bit integer`);
    }
  });
  requireNonNegativeInteger(issues, 'state.rng.draws', rng.draws);
}

function validateEraSettlementState(issues, state) {
  const settlement = state.eraSettlement;
  if (!settlement || typeof settlement !== 'object' || Array.isArray(settlement)) {
    issues.push('state.eraSettlement must be an object');
    return;
  }
  if (!ERA_SETTLEMENT_STATUSES.includes(settlement.status)) {
    issues.push(`state.eraSettlement.status is invalid: ${String(settlement.status)}`);
    return;
  }
  if (settlement.status === 'active') {
    if (settlement.settledTurn !== null) issues.push('state.eraSettlement.settledTurn must be null while active');
    if (settlement.result !== null) issues.push('state.eraSettlement.result must be null while active');
    return;
  }

  requirePositiveInteger(issues, 'state.eraSettlement.settledTurn', settlement.settledTurn);
  const deadline = eraSettlementDeadlineTurns(state);
  if (deadline !== null && settlement.settledTurn < deadline) {
    issues.push('state.eraSettlement.settledTurn must not precede the era deadline');
  }
  const result = settlement.result;
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    issues.push('state.eraSettlement.result must be an object after settlement');
    return;
  }
  if (!ERA_SETTLEMENT_OUTCOMES.includes(result.outcome)) {
    issues.push(`state.eraSettlement.result.outcome is invalid: ${String(result.outcome)}`);
  }
  requirePositiveInteger(issues, 'state.eraSettlement.result.deadlineTurn', result.deadlineTurn);
  ['companyValue', 'cash', 'totalProfit'].forEach((field) => {
    requireFinite(issues, `state.eraSettlement.result.${field}`, result[field]);
  });
  ['completedStages', 'routes', 'fleet', 'baseRegions'].forEach((field) => {
    requireNonNegativeInteger(issues, `state.eraSettlement.result.${field}`, result[field]);
  });
  if (settlement.status === 'retired' && state.gameOver !== true) {
    issues.push('state.gameOver must be true after era retirement');
  }
}

function isBaseCity(state, cityId) {
  return state.hq === cityId || (Array.isArray(state.branches) && state.branches.includes(cityId));
}

function validateUniqueIds(issues, label, values) {
  validateUniqueValues(issues, `${label}.id`, values.map((value) => value?.id));
  values.forEach((value, index) => requireText(issues, `${label}[${index}].id`, value?.id));
}

function validateReferences(issues, label, values, validValues) {
  validateUniqueValues(issues, label, values);
  values.forEach((value, index) => {
    if (!validValues.has(value)) issues.push(`${label}[${index}] references unknown value ${String(value)}`);
  });
}

function validateUniqueValues(issues, label, values) {
  const seen = new Set();
  values.forEach((value, index) => {
    if (seen.has(value)) issues.push(`${label}[${index}] duplicates ${String(value)}`);
    seen.add(value);
  });
}

function requireArray(issues, path, value) {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }
  return value;
}

function requireText(issues, path, value) {
  if (typeof value !== 'string' || value.trim() === '') issues.push(`${path} must be non-empty text`);
}

function requireFinite(issues, path, value) {
  if (!Number.isFinite(value)) issues.push(`${path} must be finite`);
}

function requireNonNegative(issues, path, value) {
  if (!Number.isFinite(value) || value < 0) issues.push(`${path} must be a non-negative finite number`);
}

function requirePositive(issues, path, value) {
  if (!Number.isFinite(value) || value <= 0) issues.push(`${path} must be a positive finite number`);
}

function requireInteger(issues, path, value) {
  if (!Number.isInteger(value)) issues.push(`${path} must be an integer`);
}

function requireNonNegativeInteger(issues, path, value) {
  if (!Number.isInteger(value) || value < 0) issues.push(`${path} must be a non-negative integer`);
}

function requirePositiveInteger(issues, path, value) {
  if (!Number.isInteger(value) || value <= 0) issues.push(`${path} must be a positive integer`);
}

function requireFiniteRange(issues, path, value, min, max, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    issues.push(`${path} must be ${integer ? 'an integer' : 'a finite number'} between ${min} and ${max}`);
  }
}
