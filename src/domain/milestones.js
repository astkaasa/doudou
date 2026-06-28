import { MILESTONE_CATEGORIES, MILESTONES } from '../data/milestones.js';

export function normalizeMilestoneState(state) {
  if (!state || typeof state !== 'object') return {};
  const knownIds = new Set(MILESTONES.map((milestone) => milestone.id));
  const source = state.milestones && typeof state.milestones === 'object' ? state.milestones : {};
  const normalized = {};
  Object.entries(source).forEach(([id, unlocked]) => {
    if (knownIds.has(id) && unlocked === true) normalized[id] = true;
  });
  state.milestones = normalized;
  return normalized;
}

export function checkMilestones(state) {
  if (!state || state.gameOver) return [];
  normalizeMilestoneState(state);
  const newlyUnlocked = [];
  MILESTONES.forEach((milestone) => {
    if (!state.milestones[milestone.id] && milestone.check(state)) {
      state.milestones[milestone.id] = true;
      newlyUnlocked.push(milestone);
    }
  });
  return newlyUnlocked;
}

export function getMilestoneStats(state) {
  const unlockedState = normalizeMilestoneState(state);
  const categories = {};
  MILESTONE_CATEGORIES.forEach((category) => {
    categories[category.id] = { unlocked: 0, total: 0 };
  });
  MILESTONES.forEach((milestone) => {
    if (!categories[milestone.category]) categories[milestone.category] = { unlocked: 0, total: 0 };
    categories[milestone.category].total++;
    if (unlockedState[milestone.id]) categories[milestone.category].unlocked++;
  });
  const unlocked = Object.values(unlockedState).filter(Boolean).length;
  return { unlocked, total: MILESTONES.length, categories };
}
