// ===== data/stocks.js — 股票数据库 =====

const STOCKS = [
  // ──────────── 金融板块（2只） ────────────
  {
    id: 'lan_royal_bank',
    code: 'LMBK',
    name: '兰姆皇家银行',
    sector: 'finance',
    basePrice: 88,
    beta: 0.7,
    dividendYield: 0.010,
    eraStart: { 1: 88, 2: 108, 3: 128, 4: 88 }
  },
  {
    id: 'miow_insurance',
    code: 'MIOW',
    name: '茂仁保险',
    sector: 'finance',
    basePrice: 42,
    beta: 0.9,
    dividendYield: 0.008,
    eraStart: { 1: 42, 2: 63, 3: 94.5, 4: 42 }
  },

  // ──────────── 能源板块（2只） ────────────
  {
    id: 'wood_oil',
    code: 'WOIL',
    name: '伍德石油',
    sector: 'energy',
    basePrice: 60,
    beta: 1.2,
    dividendYield: 0.008,
    eraStart: { 1: 60, 2: 75, 3: 100, 4: 60 }
  },
  {
    id: 'huangu_energy',
    code: 'HWGU',
    name: '黄古能源',
    sector: 'energy',
    basePrice: 70,
    beta: 1.1,
    dividendYield: 0.005,
    eraStart: { 1: 70, 2: 85, 3: 95, 4: 70 }
  },

  // ──────────── 文化板块（2只） ────────────
  {
    id: 'wuer_media',
    code: 'WAPC',
    name: '吾爱传媒',
    sector: 'culture',
    basePrice: 52,
    beta: 1.3,
    dividendYield: 0.004,
    eraStart: { 1: 52, 2: 52, 3: 52, 4: 52 }
  },
  {
    id: 'bruz_culture_travel',
    code: 'BRUZ',
    name: '布鲁文旅',
    sector: 'culture',
    basePrice: 66,
    beta: 1.1,
    dividendYield: 0.006,
    eraStart: { 1: 66, 2: 77, 3: 88, 4: 66 }
  },

  // ──────────── 旅游板块（2只） ────────────
  {
    id: 'guos_travel',
    code: 'GSTRA',
    name: '果石旅业',
    sector: 'tourism',
    basePrice: 80,
    beta: 1.4,
    dividendYield: 0.006,
    eraStart: { 1: 80, 2: 100, 3: 120, 4: 80 }
  },
  {
    id: 'aji_hotels',
    code: 'AJHT',
    name: '阿基酒店',
    sector: 'tourism',
    basePrice: 105,
    beta: 1.2,
    dividendYield: 0.007,
    eraStart: { 1: 105, 2: 95, 3: 115, 4: 105 }
  },

  // ──────────── 科技板块（2只，时代相关） ────────────
  {
    id: 'hhyy_tech',
    code: 'HYTH',
    name: '虎游科技',
    sector: 'tech',
    basePrice: 80,
    beta: 1.5,
    dividendYield: 0.002,
    eraStart: { 1: null, 2: 80, 3: 160, 4: null }
  },
  {
    id: 'qw_eco',
    code: 'QWAK',
    name: '青旺环保',
    sector: 'tech',
    basePrice: 123,
    beta: 1.6,
    dividendYield: 0.003,
    eraStart: { 1: null, 2: null, 3: 123, 4: null }
  }
];

// 板块索引
const STOCK_SECTORS = {
  finance: { name: '金融', color: '#3b82f6' },
  energy:  { name: '能源', color: '#f59e0b' },
  culture: { name: '文化', color: '#a855f7' },
  tourism: { name: '旅游', color: '#14b8a6' },
  tech:    { name: '科技', color: '#22c55e' }
};

// 新闻-板块冲击映射（集中定义，不散布在各条新闻中）
const NEWS_SECTOR_IMPACT = {
  // 灾害类 - 按灾害类型映射
  disaster_typhoon:  { tourism: -0.12, culture: -0.04 },
  disaster_volcano:  { tourism: -0.15, culture: -0.06 },
  disaster_snow:     { tourism: -0.08, culture: -0.03 },
  disaster_heatwave: { tourism: -0.06, energy: +0.05 },
  disaster_flood:    { tourism: -0.10, culture: -0.03 },
  disaster_earthquake:{ tourism: -0.10, culture: -0.04 },
  disaster_storm:    { tourism: -0.08, culture: -0.02 },
  disaster_fire:     { tourism: -0.05, energy: +0.03 },
  // 时政类
  politics_open:     { tourism: +0.08, culture: +0.04, finance: +0.03 },
  politics_tension:  { tourism: -0.05, culture: -0.03, energy: +0.04 },
  // 财经类
  economy_boom:      { finance: +0.06, tech: +0.04, culture: +0.02 },
  economy_recession: { finance: -0.08, tech: -0.05, tourism: -0.04 },
  // 文化类
  culture_event:     { culture: +0.08, tourism: +0.04 },
  // 广告类
  ads_airline:       { tourism: +0.03, culture: +0.02 },
};

// O(1) 查找表
const STOCK_MAP = {};
STOCKS.forEach(s => STOCK_MAP[s.id] = s);
