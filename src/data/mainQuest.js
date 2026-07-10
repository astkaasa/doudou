export const MAIN_QUEST_STAGES = [
  {
    stage: 1,
    title: '新手启航',
    subtitle: '你的航空公司已起飞',
    icon: '✈',
    targets: {
      cash: { era1: 150, era2: 500, era3: 800, era4: 500 },
      routes: { era1: 8, era2: 10, era3: 12, era4: 10 },
      branch: { type: 'networkRegion', min: { era1: 1, era2: 2, era3: 2, era4: 2 } },
      profit: { consecutive: { era1: 2, era2: 2, era3: 2, era4: 4 } },
    },
  },
  {
    stage: 2,
    title: '纵横航线',
    subtitle: '你的航线已纵横天际',
    icon: '🌍',
    targets: {
      cash: { era1: 250, era2: 1500, era3: 2000, era4: 2000 },
      routes: { era1: 16, era2: 30, era3: 35, era4: 40 },
      branch: { type: 'networkRegion', min: { era1: 2, era2: 4, era3: 4, era4: 3 } },
      profit: { consecutive: { era1: 3, era2: 3, era3: 3, era4: 8 } },
    },
  },
  {
    stage: 3,
    title: '苍穹之巅',
    subtitle: '航空帝国已成',
    icon: '👑',
    targets: {
      cash: { era1: 350, era2: 2500, era3: 3000, era4: 10000 },
      routes: { era1: 24, era2: 45, era3: 52, era4: 80 },
      branch: { type: 'networkRegion', min: { era1: 3, era2: 6, era3: 6, era4: 6 } },
      profit: { consecutive: { era1: 4, era2: 4, era3: 4, era4: 12 } },
    },
  },
];

export const MAIN_QUEST_DIMS = [
  { key: 'cash', label: '公司市值', icon: '💰' },
  { key: 'routes', label: '航线数', icon: '✈' },
  { key: 'branch', label: '网络覆盖', icon: '🌍' },
  { key: 'profit', label: '持续盈利', icon: '📈' },
];

export const VICTORY_GRADES = [
  { grade: 'S', maxTurns: { era1: 52, era2: 48, era3: 44, era4: 144 }, title: '苍穹领航者', color: '#fbbf24' },
  { grade: 'A', maxTurns: { era1: 64, era2: 60, era3: 56, era4: 176 }, title: '全球战略官', color: '#60a5fa' },
  { grade: 'B', maxTurns: { era1: 76, era2: 72, era3: 68, era4: 208 }, title: '区域总经理', color: '#4ade80' },
  { grade: 'C', maxTurns: Infinity, title: '见习管培生', color: '#94a3b8' },
];
