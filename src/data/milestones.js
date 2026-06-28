export const MILESTONES = [
  { id: 'first_route', category: '航线', level: 1, title: '初次启航', description: '开通第1条航线', notification: '你的航空公司正式起飞了！', check: (state) => state.routes.length >= 1 },
  { id: 'routes_5', category: '航线', level: 2, title: '翱翔天际', description: '拥有5条航线', notification: '航线图越来越像样了。', check: (state) => state.routes.length >= 5 },
  { id: 'routes_10', category: '航线', level: 3, title: '航线帝国', description: '拥有10条航线', notification: '你是个真正的航空人了。', check: (state) => state.routes.length >= 10 },
  { id: 'routes_20', category: '航线', level: 4, title: '全球网络', description: '拥有20条航线', notification: '20条航线织就空中网络。', check: (state) => state.routes.length >= 20 },
  { id: 'routes_50', category: '航线', level: 5, title: 'SPACE X', description: '拥有50条航线', notification: '你的航线比星星还多。', secret: true, check: (state) => state.routes.length >= 50 },

  { id: 'first_profit', category: '经济', level: 1, title: '首次盈利', description: '首次季度利润 > 0', notification: '终于赚到钱了。', check: (state) => state.turnProfit > 0 },
  { id: 'streak_4', category: '经济', level: 2, title: '稳步前行', description: '连续4个季度盈利', notification: '连续四季盈利，经营趋稳。', check: (state) => (state.consecutiveProfit || 0) >= 4 },
  { id: 'profit_100', category: '经济', level: 3, title: '日进豆金', description: '单季利润 >= $100M', notification: '本季利润突破 $100M。', check: (state) => state.turnProfit >= 100 },
  { id: 'profit_500', category: '经济', level: 4, title: '千金一掷', description: '单季利润 >= $500M', notification: '本季利润突破 $500M。', check: (state) => state.turnProfit >= 500 },
  { id: 'profit_1000', category: '经济', level: 5, title: '亿柱擎天', description: '单季利润 >= $1000M', notification: '你已经是天空传奇。', check: (state) => state.turnProfit >= 1000 },

  { id: 'first_wide', category: '机队', level: 1, title: '热狗肠', description: '购买首架宽体客机', notification: '宽体客机入列，双通道时代开启。', check: (state) => state.fleet.some((plane) => plane.type === 'wide' && !plane.isLease) },
  { id: 'first_superjumbo', category: '机队', level: 2, title: '巨无霸', description: '购买首架超宽体客机', notification: '超宽体客机入列。', check: (state) => state.fleet.some((plane) => plane.type === 'superjumbo' && !plane.isLease) },
  { id: 'fleet_10', category: '机队', level: 3, title: '崭露机角', description: '拥有10架购买飞机', notification: '自有机队初具规模。', check: (state) => countBoughtPlanes(state) >= 10 },
  { id: 'fleet_20', category: '机队', level: 4, title: '小有规模', description: '拥有20架购买飞机', notification: '20架飞机组成稳定机队。', check: (state) => countBoughtPlanes(state) >= 20 },
  { id: 'fleet_100', category: '机队', level: 5, title: '百翼齐飞', description: '拥有100架购买飞机', notification: '天空都被你承包了。', secret: true, check: (state) => countBoughtPlanes(state) >= 100 },

  { id: 'first_branch', category: '分部', level: 1, title: '开疆拓土', description: '开设第1个分部', notification: '第一个分部建立了，版图开始扩张。', check: (state) => state.branches.length >= 1 },
  { id: 'branches_3', category: '分部', level: 2, title: '三星拱月', description: '拥有3个分部', notification: '三大分部拱卫总部。', check: (state) => state.branches.length >= 3 },
  { id: 'branches_5', category: '分部', level: 3, title: '四海为家', description: '拥有5个分部', notification: '航空网络正在遍布各地。', check: (state) => state.branches.length >= 5 },
  { id: 'branches_7', category: '分部', level: 4, title: '王下七空', description: '拥有7个分部', notification: '七大分部支撑天空版图。', check: (state) => state.branches.length >= 7 },
  { id: 'branches_10', category: '分部', level: 5, title: '十面威风', description: '拥有10个分部（上限）', notification: '分部满编，版图已达极限。', check: (state) => state.branches.length >= 10 },

  { id: 'cash_500', category: '财富', level: 1, title: '小土豪', description: '现金 >= $500M', notification: '现金储备达到 $500M。', check: (state) => state.cash >= 500 },
  { id: 'cash_1000', category: '财富', level: 2, title: '千金在手', description: '现金 >= $1000M', notification: '现金储备达到 $1B。', check: (state) => state.cash >= 1000 },
  { id: 'cash_2000', category: '财富', level: 3, title: '千千万万', description: '现金 >= $2000M', notification: '现金储备达到 $2B。', check: (state) => state.cash >= 2000 },
  { id: 'cash_4000', category: '财富', level: 4, title: '四十石狮', description: '现金 >= $4000M', notification: '现金储备达到 $4B。', check: (state) => state.cash >= 4000 },
  { id: 'cash_10b', category: '财富', level: 5, title: '亿个目标', description: '现金 >= $10000M', notification: '现金储备突破 $10B。', check: (state) => state.cash >= 10000 },

  { id: 'survive_20', category: '生涯', level: 1, title: '五载光阴', description: '经营20个季度（5年）', notification: '航空路漫漫，而你还在飞。', check: (state) => state.turnsPlayed >= 20 },
  { id: 'survive_40', category: '生涯', level: 2, title: '朝花夕拾', description: '经营40个季度（10年）', notification: '十年航空故事已经写下。', check: (state) => state.turnsPlayed >= 40 },
  { id: 'survive_60', category: '生涯', level: 3, title: '束发及笄', description: '经营60个季度（15年）', notification: '你的航空故事仍在继续。', check: (state) => state.turnsPlayed >= 60 },
  { id: 'survive_76', category: '生涯', level: 4, title: '还有一年', description: '经营接近尾声（76/80季度）', notification: '还有一年就到终点，再飞最后一程。', secret: true, check: (state) => state.turnsPlayed >= 76 },
  { id: 'survive_236', category: '生涯', level: 5, title: '还在玩啊', description: '在沙盒模式中经营236个季度', notification: '你还在玩啊？！', secret: true, check: (state) => state.turnsPlayed >= 236 },
];

export const MILESTONE_CATEGORIES = [
  { id: '航线', icon: 'Map' },
  { id: '经济', icon: 'DollarSign' },
  { id: '机队', icon: 'Plane' },
  { id: '分部', icon: 'Building2' },
  { id: '财富', icon: 'Landmark' },
  { id: '生涯', icon: 'Trophy' },
];

function countBoughtPlanes(state) {
  return state.fleet.filter((plane) => !plane.isLease).length;
}
