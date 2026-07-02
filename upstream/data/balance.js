// ===== BALANCE CONSTANTS =====
// Centralized game balance parameters — single source of truth for tuning

// --- Route & Demand (v2.0: economics engine overhaul) ---
const POP_SCALE            = 5;     // 人口→需求基数缩放
const HUB_FACTOR           = 0.12;  // 每级枢纽加成
const BIZ_DEMAND_WEIGHT    = 0.8;   // 商务需求权重
const TOUR_DEMAND_WEIGHT   = 0.3;   // 旅游需求权重
const DIST_PREMIUM_LONG    = 1.4;   // >8000km: 洲际航线需求加成
const DIST_PREMIUM_MID     = 1.2;   // >4000km: 远程航线需求加成
const DIST_SHORT_PENALTY   = 0.85;  // <2000km: 短途高铁竞争
const CROSS_REGION_BONUS   = 1.1;   // 跨区域: 不同市场连接加成
const YIELD_INTERCONT_LONG = 1.50;  // >8000km跨区域: 真洲际收益系数 [待测试]
const YIELD_INTERCONT_MID  = 1.35;  // >4500km跨区域: 跨洲远程收益系数 [待测试]
const YIELD_INTERCONT_SHORT= 1.15;  // >3000km跨区域: 跨洲中途收益系数 [待测试]
const YIELD_CROSS_SUB_LONG = 1.12;  // >3000km跨子区域: 同区跨经济圈长途收益系数 [待测试]
const SEASON_MODIFIERS     = [0.85, 0.9, 1.0, 0.95]; // Q1-Q4

// --- Pricing & Load Factor ---
const PRICE_ELASTICITY      = -0.8;
const BRAND_EFFECT_FACTOR   = 0.06;
const COMP_EFFECT_FACTOR    = 0.3;
const SUGGESTED_PRICE_PER_KM = 0.10;
const SUGGESTED_PRICE_BASE   = 80;
const ROUTE_REVENUE_DIVISOR  = 28000;  // 频率分层后新除数（原1500）

// --- Route Opening Cost ---
const ROUTE_OPEN_COST_BASE = 1;

// --- Cost per Route ---
const MAINT_AGING        = 0.04;   // per year of age
const CREW_PER_180       = 0.20;   // crew cost per 180-seat equivalent
const LANDING_PER_LEVEL  = 0.15;   // landing fee per city-level point
const LANDING_BASE       = 0.3;    // base landing fee (always applied)
const LANDING_DIST_REF   = 3000;   // distance reference for landing fee scaling
const CATERING_PER_FLIGHT = 0.03;  // 每航班餐食成本（配合频率因子），替代 CATERING_PER_PLANE
const FREQ_COST_SCALE    = 0.3;   // 频率成本折扣系数：高频航班起降/餐食享受批量折扣
const TRAIT_FUEL_DISCOUNT  = 0.9;  // 豆 trait: 10% fuel discount
const TRAIT_MAINT_DISCOUNT = 0.9;  // 机 trait: 10% maint discount

// --- Overhead & Bankruptcy ---
const OVERHEAD_PER_FLEET  = 0.20;
const OVERHEAD_BASE       = 1.2;
const BANKRUPTCY_THRESHOLD = -5;

// --- Brand ---
const BRAND_PROFIT_GAIN = 0.05;
const BRAND_LOSS_DROP   = 0.02;

// --- Fleet ---
const LEASE_FEE_RATIO     = 0.1;   // 10% of buyPrice as lease fee
const LEASE_LIMIT_RATIO   = 0.5;   // max leased = bought × this
const MAX_LEASE_TURNS     = 40;    // 10 years = 40 quarters
const PLANE_DELIVER_TURNS = 2;
const PLANE_MAX_AGE       = 25;
const PLANE_SELL_AGE_FACTOR = 0.04; // value = buyPrice * max(0.15, 1 - age * this)

// --- Branch ---
const BRANCH_BASE_COST  = 50;
const BRANCH_COST_GROWTH = 2;
const BRANCH_MAX         = 10;
const BRANCH_CONSTRUCT_TURNS = 1;

// --- Loan ---
const LOAN_RATE       = 0.02;   // quarterly
const LOAN_FEE_RATIO  = 0.05;   // 5% origination fee

// --- Trait: 辣豆基金 ---
const TRAIT_FUND_RATIO = 0.025; // 辣豆基金：基于资金2.5%产生收入

// ===== STOCK MARKET (v2.5: rebalanced — 强内在随机 + 弱新闻主导 + 非对称下行风险) =====
const STOCK_MAX_CHANGE = 0.20;             // 单季度最大涨跌幅 ±20%
const STOCK_MEAN_REVERT_THRESHOLD = 0.30;  // 偏离均值30%触发回归 [待测试] (was 0.50)
const STOCK_MEAN_REVERT_RATE = 0.05;       // 回归速率5%/季度 [待测试] (was 0.02)
const STOCK_NOISE_RANGE = 0.05;            // 内在随机噪声范围 ±5%×beta [待测试]
const STOCK_MARKET_SENTIMENT = 0.02;       // 市场情绪范围 ±2% [待测试] (was ±3%)
const STOCK_NEWS_IMPACT_SCALE = 0.5;       // 新闻板块冲击衰减系数 [待测试]
const STOCK_RANDOM_CRASH_CHANCE = 0.15;    // 每季度随机板块崩盘概率15% [待测试]
const STOCK_RANDOM_CRASH_MIN = 0.03;       // 随机崩盘最小幅度3% [待测试]
const STOCK_RANDOM_CRASH_MAX = 0.08;       // 随机崩盘最大幅度8% [待测试]
const STOCK_OVERVAL_THRESHOLD = 0.50;      // 高估值阈值：偏离回归目标50% [待测试]
const STOCK_OVERVAL_PENALTY_RATE = 0.10;   // 高估值惩罚率：超出部分×10% [待测试]
const STOCK_TRADE_FEE = 0.01;             // 交易手续费1%（买入/卖出双向收取）
const STOCK_MIN_TRADE = 1;                // 最小交易1M
const STOCK_MAX_HOLDING = 100;            // 单只股票持仓上限100M
const STOCK_SECTOR_SHOCK_OIL = 0.08;      // 油价冲击系数
const STOCK_SECTOR_SHOCK_DISASTER = 0.12; // 灾害冲击系数
const STOCK_SECTOR_SHOCK_NEWS = 0.05;     // 普通新闻冲击（保留兼容）

// --- Angel Investment Rescue (天使投资救助) ---
const ANGEL_INVEST_MIN      = 50;    // 救助最低金额 (M)
const ANGEL_INVEST_MAX      = 100;   // 救助最高金额 (M)
const ANGEL_INVEST_STEP     = 5;     // 金额档位步长 (M): 50,55,60,...,100

// --- Mega Events (盛事系统) ---
const MEGA_EVENT_SPILLOVER        = 0.30;  // 同区域城市溢出系数 [待测试]
const MEGA_EVENT_REMOTE_SPILLOVER = 0.15;  // 跨区域枢纽溢出系数 [待测试]
const MEGA_EVENT_PRE_ANNOUNCE     = 4;     // 提前N个季度开始预报
const MEGA_EVENT_DECAY_LENGTH     = 3;     // 会后持续影响N个季度
const DISASTER_BOTH_CITIES        = 0.1;   // 双端灾害LF系数（原硬归零→0.1） [待测试]
const DISASTER_ONE_CITY           = 0.3;   // 单端灾害LF系数（原硬归零→0.3） [待测试]
