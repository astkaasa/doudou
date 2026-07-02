export const MAIN_QUEST_STAGES = [
  {
    stage: 1,
    title: '新手启航',
    subtitle: '你的航空公司已起飞',
    icon: '✈',
    targets: {
      cash: { era1: 300, era2: 500, era3: 800, era4: 500 },
      routes: { era1: 8, era2: 10, era3: 12, era4: 10 },
      branch: { type: 'region', min: 2 },
      profit: { consecutive: 4 },
    },
  },
  {
    stage: 2,
    title: '纵横航线',
    subtitle: '你的航线已纵横天际',
    icon: '🌍',
    targets: {
      cash: { era1: 1200, era2: 2000, era3: 3000, era4: 2000 },
      routes: { era1: 30, era2: 40, era3: 45, era4: 40 },
      branch: { type: 'region', min: 3 },
      profit: { consecutive: 8 },
    },
  },
  {
    stage: 3,
    title: '苍穹之巅',
    subtitle: '航空帝国已成',
    icon: '👑',
    targets: {
      cash: { era1: 3000, era2: 5000, era3: 8000, era4: 5000 },
      routes: { era1: 50, era2: 70, era3: 80, era4: 70 },
      branch: { type: 'region', min: 6 },
      profit: { consecutive: 12 },
    },
  },
];

export const MAIN_QUEST_DIMS = [
  { key: 'cash', label: '资金', icon: '💰' },
  { key: 'routes', label: '航线数', icon: '✈' },
  { key: 'branch', label: '分部覆盖', icon: '🌍' },
  { key: 'profit', label: '持续盈利', icon: '📈' },
];

export const VICTORY_GRADES = [
  { grade: 'S', maxTurns: 40, title: '苍穹领航者', color: '#fbbf24' },
  { grade: 'A', maxTurns: 55, title: '全球战略官', color: '#60a5fa' },
  { grade: 'B', maxTurns: 70, title: '区域总经理', color: '#4ade80' },
  { grade: 'C', maxTurns: Infinity, title: '见习管培生', color: '#94a3b8' },
];
