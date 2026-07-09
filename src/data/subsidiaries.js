export const SUBSIDIARY_TYPES = {
  shuttle: {
    name: '机场大巴',
    icon: '🚌',
    minLevel: 1,
    minTour: 0,
    minBiz: 0,
    costBase: 20,
    baseRate: 0.012,
    maintRate: 0.001,
    special: null,
  },
  hotel: {
    name: '空港酒店',
    icon: '🏨',
    minLevel: 2,
    minTour: 0,
    minBiz: 0,
    costBase: 50,
    baseRate: 0.018,
    maintRate: 0.002,
    special: 'mega_boost',
  },
  travel: {
    name: '旅行社',
    icon: '🗺',
    minLevel: 2,
    minTour: 25,
    minBiz: 0,
    costBase: 70,
    baseRate: 0.022,
    maintRate: 0.003,
    special: 'route_lf_boost',
  },
  dutyfree: {
    name: '免税店',
    icon: '🛒',
    minLevel: 2,
    minTour: 0,
    minBiz: 40,
    costBase: 55,
    baseRate: 0.020,
    maintRate: 0.002,
    special: 'mega_boost_s',
  },
  airport: {
    name: '机场建设',
    icon: '✈',
    minLevel: 1,
    minTour: 0,
    minBiz: 0,
    costBase: 250,
    baseRate: 0.013,
    maintRate: 0.005,
    requiresBase: true,
    special: 'landing_discount',
  },
};

export const SUB_TYPES = SUBSIDIARY_TYPES;
export const SUBSIDIARY_TYPE_ORDER = ['shuttle', 'hotel', 'travel', 'dutyfree', 'airport'];

export const SUB_BASE_APPRECIATION = 0.0025;
export const SUB_PROFIT_BOOST = 0.0010;
export const SUB_LOSS_PENALTY = 0.0015;
export const SUB_ROUTE_PRESENCE_BONUS = 0.0005;
export const SUB_NO_ROUTE_PENALTY = 0.0005;
export const SUB_MEGA_VALUE_BOOST = 0.003;
export const SUB_MEGA_BOOST_MULT = 1.5;
export const SUB_MEGA_BOOST_MULT_S = 1.3;
export const SUB_MEGA_SPILLOVER_MULT = 1.2;
export const SUB_ROUTE_LF_BONUS = 0.02;
export const SUB_DUTYFREE_BRAND_BONUS = 0.01;
export const SUB_LANDING_DISCOUNT = 0.15;
export const SUB_AI_DILUTE_RATE = 0.10;
export const SUB_VALUE_FLOOR_RATIO = 0.30;
export const SUB_AIRPORT_VALUE_FLOOR = 0.50;
export const SUB_AIRPORT_SELLBACK_RATE = 0.60;
export const SUB_AIRPORT_PROFIT_SHARE = 0.85;
export const SUB_FEE_RATE = 0.01;
export const SUB_CITY_WEIGHT_POP = 0.4;
export const SUB_CITY_WEIGHT_BIZ = 0.35;
export const SUB_CITY_WEIGHT_TOUR = 0.25;
export const SUB_ACQUIRE_MIN_FACTOR = 0.70;
export const SUB_ACQUIRE_MAX_FACTOR = 1.40;
export const EMERGENCY_LOAN_RATE_MULT = 1.5;
export const EMERGENCY_LOAN_CAP_RATIO = 0.30;
