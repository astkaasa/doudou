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
const TRAIT_FUND_RATIO = 0.10;  // 辣豆基金：基于资金10%产生收入
