const UINT32_RANGE = 0x100000000;
const MULBERRY_INCREMENT = 0x6d2b79f5;

export function createRandomState(seed = createEntropySeed()) {
  const normalizedSeed = normalizeSeed(seed);
  return { seed: normalizedSeed, state: normalizedSeed, draws: 0 };
}

export function normalizeRandomState(value, fallbackSeed = 0) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return createRandomState(fallbackSeed);
  const seed = normalizeUint32(value.seed, normalizeSeed(fallbackSeed));
  const state = normalizeUint32(value.state, seed);
  const draws = Number.isInteger(value.draws) && value.draws >= 0 ? value.draws : 0;
  return { seed, state, draws };
}

export function legacyRandomSeed(state) {
  return hashSeed([
    state?.companyName,
    state?.era,
    state?.hq,
    state?.year,
    state?.quarter,
    state?.turnsPlayed,
    state?.cash,
  ].join('|'));
}

export function nextRandom(gameState) {
  if (!gameState || typeof gameState !== 'object') throw new TypeError('A game state is required for random draws');
  if (!isValidRandomState(gameState.rng)) {
    gameState.rng = normalizeRandomState(gameState.rng, legacyRandomSeed(gameState));
  }
  const rng = gameState.rng;
  rng.state = (rng.state + MULBERRY_INCREMENT) >>> 0;
  let value = rng.state;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  rng.draws += 1;
  return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
}

export function randomSource(gameState) {
  return () => nextRandom(gameState);
}

export function randomBetween(gameState, min, max) {
  return min + nextRandom(gameState) * (max - min);
}

export function randomInt(gameState, min, max) {
  return Math.floor(randomBetween(gameState, min, max + 1));
}

export function randomIntFrom(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function randomBetweenFrom(random, min, max) {
  return min + random() * (max - min);
}

export function hashSeed(value) {
  const text = String(value ?? '');
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function createEntropySeed() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoApi.getRandomValues(values);
    return values[0];
  }
  const highResolutionTime = globalThis.performance?.now?.() ?? 0;
  return hashSeed(`${Date.now()}|${highResolutionTime}`);
}

function normalizeSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return Math.trunc(seed) >>> 0;
  return hashSeed(seed);
}

function normalizeUint32(value, fallback) {
  return Number.isInteger(value) && value >= 0 && value < UINT32_RANGE ? value : fallback;
}

function isValidRandomState(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Number.isInteger(value.seed)
    && value.seed >= 0
    && value.seed < UINT32_RANGE
    && Number.isInteger(value.state)
    && value.state >= 0
    && value.state < UINT32_RANGE
    && Number.isInteger(value.draws)
    && value.draws >= 0;
}
