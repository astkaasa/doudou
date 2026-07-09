// ===== data/subsidiary-data.js — 子公司系统数据定义 =====

// ═══════════════════════════════════════════════════════
// 子公司类型定义
// ═══════════════════════════════════════════════════════

const SUB_TYPES = {
  shuttle: {
    name: '机场大巴', icon: '🚌',
    minLevel: 1, minTour: 0, minBiz: 0,
    costBase: 20,    // × cityLevel (新设成本)
    baseRate: 0.012,  // 1.2%/Q
    maintRate: 0.001, // 0.1%/Q
    special: null
  },
  hotel: {
    name: '空港酒店', icon: '🏨',
    minLevel: 2, minTour: 0, minBiz: 0,
    costBase: 50,
    baseRate: 0.018,  // 1.8%/Q
    maintRate: 0.002,
    special: 'mega_boost'  // 盛事季回报×1.5
  },
  travel: {
    name: '旅行社', icon: '🗺',
    minLevel: 2, minTour: 25, minBiz: 0,
    costBase: 70,
    baseRate: 0.022,  // 2.2%/Q
    maintRate: 0.003,
    special: 'route_lf_boost'  // 同城航线客座率+2%
  },
  dutyfree: {
    name: '免税店', icon: '🛒',
    minLevel: 2, minTour: 0, minBiz: 40,
    costBase: 55,
    baseRate: 0.020,  // 2.0%/Q
    maintRate: 0.002,
    special: 'mega_boost_s'  // 盛事季回报×1.3 + 品牌加成
  },
  airport: {
    name: '机场建设', icon: '✈',
    minLevel: 1, minTour: 0, minBiz: 0,
    costBase: 250,   // × cityLevel² (投资共建)
    baseRate: 0.013,  // 1.3%/Q
    maintRate: 0.005,
    requiresBase: true,
    special: 'landing_discount'  // 同城着陆费-15%
  }
};

// ═══════════════════════════════════════════════════════
// 估值/回报系数
// ═══════════════════════════════════════════════════════

const SUB_BASE_APPRECIATION    = 0.0025;  // 基础季度升值率0.25%（年化1%）[待测试]
const SUB_PROFIT_BOOST         = 0.0010;  // 高利润额外升值+0.10%/Q [待测试]
const SUB_LOSS_PENALTY         = 0.0015;  // 亏损额外贬值-0.15%/Q [待测试]
const SUB_ROUTE_PRESENCE_BONUS = 0.0005;  // 有同城航线+0.05%/Q [待测试]
const SUB_NO_ROUTE_PENALTY     = 0.0005;  // 无同城航线-0.05%/Q [待测试]
const SUB_MEGA_VALUE_BOOST     = 0.003;   // 盛事影响估值系数 [待测试]
const SUB_MEGA_BOOST_MULT      = 1.5;     // 酒店盛事回报倍率 [待测试]
const SUB_MEGA_BOOST_MULT_S    = 1.3;     // 免税店盛事回报倍率 [待测试]
const SUB_MEGA_SPILLOVER_MULT  = 1.2;     // 溢出区回报倍率 [待测试]
const SUB_ROUTE_LF_BONUS       = 0.02;    // 旅行社客座率加成 [待测试]
const SUB_DUTYFREE_BRAND_BONUS = 0.01;    // 免税店品牌加成/Q [待测试]
const SUB_LANDING_DISCOUNT     = 0.15;    // 机场着陆费减免 [待测试]
const SUB_AI_DILUTE_RATE       = 0.10;    // AI竞争稀释 [待测试]
const SUB_VALUE_FLOOR_RATIO    = 0.30;    // 估值下限=成本×30% [待测试]
const SUB_AIRPORT_VALUE_FLOOR  = 0.50;    // 机场估值下限=成本×50% [待测试]
const SUB_AIRPORT_SELLBACK_RATE = 0.60;   // 机场投资共建回购退出价60% [待测试]
const SUB_AIRPORT_PROFIT_SHARE = 0.85;    // 机场合资方分润后玩家得85% [待测试]
const SUB_FEE_RATE             = 0.01;    // 新设/收购/出售手续费1% [待测试]

// ═══════════════════════════════════════════════════════
// 城市投资指数权重
// ═══════════════════════════════════════════════════════

const SUB_CITY_WEIGHT_POP  = 0.4;   // [待测试]
const SUB_CITY_WEIGHT_BIZ  = 0.35;  // [待测试]
const SUB_CITY_WEIGHT_TOUR = 0.25;  // [待测试]

// ═══════════════════════════════════════════════════════
// 收购价格范围
// ═══════════════════════════════════════════════════════

const SUB_ACQUIRE_MIN_FACTOR = 0.70;  // 收购最低=新设价70% [待测试]
const SUB_ACQUIRE_MAX_FACTOR = 1.40;  // 收购最高=新设价140% [待测试]

// ═══════════════════════════════════════════════════════
// 破产清算系数
// ═══════════════════════════════════════════════════════

const EMERGENCY_LOAN_RATE_MULT = 1.5;   // 急救贷款利率×1.5 [待测试]
const EMERGENCY_LOAN_CAP_RATIO = 0.30;  // 急救贷款上限=市值×30% [待测试]
