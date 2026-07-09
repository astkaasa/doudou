// ===== data/main-quest.js — 主线任务「苍穹之路」数据定义 =====
// 三阶段：新手启航 → 纵横航线 → 苍穹之巅
// 四维度：资金 / 航线数 / 分部覆盖 / 持续盈利
// 各时代目标差异化

// 时代差异映射（era1/era2/era3/era4 对应 4 个时代剧本）
const MAIN_QUEST_STAGES = [
  {
    stage: 1,
    title: '新手启航',
    subtitle: '你的航空公司已起飞',
    icon: '✈',
    targets: {
      cash:   { era1: 300,  era2: 500,  era3: 800,  era4: 500 },
      routes: { era1: 8,    era2: 10,   era3: 12,   era4: 10 },
      branch: { type: 'region', min: 2 },
      profit: { consecutive: 4 }
    }
  },
  {
    stage: 2,
    title: '纵横航线',
    subtitle: '你的航线已纵横天际',
    icon: '🌍',
    targets: {
      cash:   { era1: 1200, era2: 2000, era3: 3000, era4: 2000 },
      routes: { era1: 30,   era2: 40,   era3: 45,   era4: 40 },
      branch: { type: 'region', min: 3 },
      profit: { consecutive: 8 }
    }
  },
  {
    stage: 3,
    title: '苍穹之巅',
    subtitle: '航空帝国已成',
    icon: '👑',
    targets: {
      cash:   { era1: 3000, era2: 5000, era3: 8000, era4: 5000 },
      routes: { era1: 50,   era2: 70,   era3: 80,   era4: 70 },
      branch: { type: 'region', min: 6 },  // 全球6大洲全覆盖
      profit: { consecutive: 12 }
    }
  }
];

// 评级阈值（按第三阶段达成时的 turnsPlayed 计算）
const VICTORY_GRADES = [
  { grade: 'S', maxTurns: 40, title: '苍穹领航者', color: '#fbbf24' },
  { grade: 'A', maxTurns: 55, title: '全球战略官', color: '#60a5fa' },
  { grade: 'B', maxTurns: 70, title: '区域总经理', color: '#4ade80' },
  { grade: 'C', maxTurns: Infinity, title: '见习管培生', color: '#94a3b8' }
];

// 维度显示配置
const MAIN_QUEST_DIMS = [
  { key: 'cash',   label: '公司市值', icon: '💰', unit: '$', suffix: 'M' },
  { key: 'routes', label: '航线数',   icon: '✈',  unit: '',  suffix: '条' },
  { key: 'branch', label: '分部覆盖', icon: '🌍', unit: '',  suffix: '' },
  { key: 'profit', label: '持续盈利', icon: '📈', unit: '',  suffix: '季' }
];
