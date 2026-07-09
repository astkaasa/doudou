import { AI_PROFILES } from '../data/aiProfiles.js';
import { CITIES, HQ_RECOMMENDED_CITY_IDS } from '../data/cities.js';
import { ERAS } from '../data/eras.js';
import { MEGA_EVENTS } from '../data/megaEvents.js';
import { PLANES } from '../data/planes.js';
import { STOCKS, STOCK_SECTORS } from '../data/stocks.js';
import { routeKey } from './helpers.js';

const CITY_IDS = new Set(CITIES.map((city) => city.id));
const ERA_IDS = new Set(ERAS.map((era) => era.id));
const PLANE_IDS = new Set(PLANES.map((plane) => plane.id));

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
  });
  validateReferences(issues, 'hqRecommendedCityIds', HQ_RECOMMENDED_CITY_IDS, CITY_IDS);

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
  });

  validateUniqueIds(issues, 'planes', PLANES);
  PLANES.forEach((plane, index) => {
    const path = `planes[${index}]`;
    requireText(issues, `${path}.name`, plane.name);
    requireText(issues, `${path}.type`, plane.type);
    ['seats', 'range', 'fuel', 'maint', 'buyPrice', 'leasePrice'].forEach((field) => {
      requirePositive(issues, `${path}.${field}`, plane[field]);
    });
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
    if (!CITY_IDS.has(event.cityId)) issues.push(`${path}.cityId references unknown city ${String(event.cityId)}`);
    requireInteger(issues, `${path}.year`, event.year);
    requireFiniteRange(issues, `${path}.quarter`, event.quarter, 1, 4, true);
    requirePositive(issues, `${path}.maxBoost`, event.maxBoost);
  });

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
  validateRandomState(issues, state.rng);

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
  routes.forEach((route, index) => {
    const path = `state.routes[${index}]`;
    validateRoute(issues, route, path, routeKeys);
    if (route && !isBaseCity(state, route.from)) issues.push(`${path}.from must be the headquarters or an active branch`);
    const assignedPlanes = Array.isArray(route?.assignedPlanes) ? route.assignedPlanes : [];
    assignedPlanes.forEach((uid, planeIndex) => {
      if (!fleetUids.has(uid)) issues.push(`${path}.assignedPlanes[${planeIndex}] references missing fleet uid ${String(uid)}`);
      if (assignedPlaneUids.has(uid)) issues.push(`${path}.assignedPlanes[${planeIndex}] assigns fleet uid ${String(uid)} more than once`);
      assignedPlaneUids.add(uid);
    });
  });

  validateBranchState(issues, state, branches, constructing);
  validateCityStates(issues, state.cityStates);
  validateAiState(issues, aiPlayers);

  return issues;
}

export function assertGameState(state, options) {
  const issues = validateGameState(state, options);
  if (issues.length === 0) return state;
  const error = new Error(`Invalid game state:\n- ${issues.join('\n- ')}`);
  error.code = 'INVALID_GAME_STATE';
  error.issues = issues;
  throw error;
}

function validateRoute(issues, route, path, keys) {
  if (!route || typeof route !== 'object') {
    issues.push(`${path} must be an object`);
    return;
  }
  if (!CITY_IDS.has(route.from)) issues.push(`${path}.from references unknown city ${String(route.from)}`);
  if (!CITY_IDS.has(route.to)) issues.push(`${path}.to references unknown city ${String(route.to)}`);
  if (route.from === route.to) issues.push(`${path} must connect two different cities`);
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
