// ===== data/constants.js — 核心常量与索引表 =====
// 城市数据 → data/cities.js | 飞机数据 → data/planes.js | 新闻事件池 → data/news-pool.js

// ===== AI PROFILES =====
const AI_PROFILES = [
  {name:'稳健航空',color:'#f87171',cssClass:'ai0',prefType:'wide',prefLevel:3,riskAverse:0.8,priceMul:1.15},
  {name:'闪电航空',color:'#fbbf24',cssClass:'ai1',prefType:'narrow',prefLevel:1,riskAverse:0.3,priceMul:0.75},
  {name:'远航航空',color:'#a78bfa',cssClass:'ai2',prefType:'wide',prefLevel:2,riskAverse:0.6,priceMul:1.05},
];

// ===== ERA DATA =====
const ERAS = [
  {id:'era1',name:'1960-1980 喷气时代',desc:'波音707率先跨洋，747巨无霸登场，航空业黄金起飞期',startYear:1960,endYear:1980,startOil:20,cash:50,detail:'窄体为主 · 低油价 · 高增长',difficulty:'挑战',diffColor:'#f87171'},
  {id:'era2',name:'1975-1995 变革时代',desc:'美国航空管制放松，廉价航空崛起，油价危机与复苏交替',startYear:1975,endYear:1995,startOil:45,cash:100,detail:'宽体登场 · 油价波动 · 竞争加剧',difficulty:'标准',diffColor:'#fbbf24'},
  {id:'era3',name:'2000-2020 全球时代',desc:'低成本航空席卷全球，超远程宽体改写航线版图',startYear:2000,endYear:2020,startOil:60,cash:150,detail:'超宽体客机 · 高油价 · 全球互联',difficulty:'简单',diffColor:'#4ade80'},
  {id:'era4',name:'1960-2020 苍穹传奇',desc:'从喷气启蒙到数字航空，六十年完整体验航空业变迁',startYear:1960,endYear:2020,startOil:30,cash:60,detail:'全机型 · 全事件 · 终极挑战',difficulty:'史诗',diffColor:'#c084fc'},
];

// ===== TRAIT INFO =====
const TRAIT_INFO={
  '辣':{name:'辣豆豆',desc:'每季度获得辣豆基金，金额为当前资金的2.5%',color:'#f87171'},
  '机':{name:'呼呼 ✈',desc:'所有执飞飞机维护费降低10%',color:'#60a5fa'},
  '豆':{name:'OIL 🛢',desc:'所有执飞飞机油耗降低10%',color:'#4ade80'}
};

// ===== INDEX MAPS (O(1) lookup by id) =====
const CITY_MAP = {};
CITIES.forEach(c => { CITY_MAP[c.id] = c; });

const PLANE_MAP = {};
PLANES.forEach(p => { PLANE_MAP[p.id] = p; });

// ===== ONBOARD STEPS =====
// 新手引导5步：购机→开航线→推进→看懂财报→苍穹之路
// 每一步都是玩家操作，删除纯阅读步骤"继续成长"
const ONBOARD_STEPS=[
  {title:'欢迎启航',
   body:()=>{const base='试试点击「购买飞机」扩充机队，然后在地图上点击总部或分部作为起飞城市来开通航线。';const eraTip={era1:' 起步资金有限，优先选择短途航线控制成本！',era3:' 资金充裕，可尝试窄体+宽体机队组合。',era4:' 注意油价波动和时代变迁！'};return base+(eraTip[G.era]||'');},
   trigger:()=>G.turnsPlayed===0&&G.routes.length===0,
   target:'#btn-buy-plane',spotlight:true,pulse:true,stepIdx:0},
  {title:'开拓航路',
   body:'已拥有飞机！现在在地图上先点击总部（红点），再点击另一个城市来开通航线。',
   trigger:()=>G.fleet.filter(f=>!f.delivering).length>0&&G.routes.length===0,
   target:'#map-container',spotlight:true,pulse:true,stepIdx:1},
  {title:'推进时间',
   body:'航线已就绪！点击右下角「推进回合」按钮开始运营，查看首季财报。',
   trigger:()=>G.routes.length>0&&G.turnsPlayed===0,
   target:'#advance-btn',spotlight:true,pulse:true,stepIdx:2},
  {title:'看懂财报',
   body:'首季财报即将弹出！关注利润行——绿色=盈利，红色=亏损。收入靠客座率，支出看燃料和人工占比。',
   trigger:()=>G.turnsPlayed===1&&!G._onboardReportShown,
   target:null,spotlight:false,pulse:false,stepIdx:3},
  {title:'苍穹之路',
   body:'点击顶部「🛫 苍穹之路 🛬」查看主线目标！达成全部目标即可通关。',
   trigger:()=>G.turnsPlayed>=2&&!G._mainQuestOnboardShown,
   target:'#hud-mainquest',spotlight:true,pulse:true,stepIdx:4},
  // ── Branch hints (priority=1, 非强制，HUD左下角气泡提醒，无聚光灯) ──
  {title:'分部扩展',
   body:'航线只能从总部起飞？点击「分部管理」扩展基地网络，在更多城市设立分部即可从那里出发！',
   trigger:()=>G.turnsPlayed>=3&&G.branches.length===0&&(!G.branchesConstructing||G.branchesConstructing.length===0)&&G.routes.length>=2&&G.cash>=30,
   target:null,spotlight:false,pulse:false,priority:1,stepIdx:-1},
  {title:'航线小贴士',
   body:'开航线分两步：先点击起飞城市（红点=总部），再点击目的地城市。需先有飞机！',
   trigger:()=>G.turnsPlayed>=3&&G.routes.length===0&&G.fleet.filter(f=>!f.delivering).length>0,
   target:null,spotlight:false,pulse:false,priority:1,stepIdx:-1},
  {title:'资金告急',
   body:'资金不足？试试银行贷款——低息借款加速扩张，但记得按时还款。',
   trigger:()=>G.cash<20&&G.turnsPlayed>=1&&G.loan===0,
   target:null,spotlight:false,pulse:false,priority:1,stepIdx:-1},
];

// ===== FTP MECHANISM CARDS (First-Time Popup) =====
// v0.7.1: 移除first_report（由引导步骤"看懂财报"替代）
const FTP_CARDS=[
  {id:'ops_panel',title:'运营三档',
   body:'服务档→提升客座率 | 维修档→降低故障 | 广告档→提升品牌\n中档为基准(×1.0)，高档×2.5费用，低档×0.4但效果打折',
   trigger:()=>!!G._opsPanelOpened},
  {id:'fault_first',title:'故障来了',
   body:'故障率 = 基础3% × 机龄 × 维修系数 × 运营效能\n严重(25%)：取消航班 | 致命(10%)：额外罚款+品牌损害',
   trigger:()=>G._faultsThisTurn&&G._faultsThisTurn.length>0},
  {id:'low_loadfactor',title:'客座率告急',
   body:'客座率 = 实际乘客 / 座位容量，低于60%将亏损\n改善方式：提升服务档 / 降低票价 / 增加广告投入',
       trigger:()=>G.routes.some(r=>r.loadFactor<0.6)},
  {id:'stock_first',title:'股市有风险',
    body:'每季股价受事件/运营影响波动\n低买高卖是核心逻辑，盛事催化可能带来暴涨',
    trigger:()=>!!G._stockPanelOpened},
  {id:'sub_first',title:'子公司系统',
    body:'点击地图城市→「🏢 子公司」按钮可开设子公司\n子公司种类：机场大巴、空港酒店、旅行社、免税店、投资共建机场\n子公司提供季度回报和航线联动加成',
    trigger:()=>!!G._subPanelOpened},
];

// ===== HELP ENTRIES =====
const HELP_ENTRIES={
  mechanics:[
    {id:'ops_efficiency',icon:'🛠',title:'运营效能',formula:'满编率 × (士气 / 60)',range:'0.3 ~ 1.5',affects:'客座率 / 故障率 / 收入',tip:'保持满编率和士气>60'},
    {id:'load_factor',icon:'💺',title:'客座率',formula:'实际乘客 / 座位容量',range:'0% ~ 100%',affects:'航线收入',tip:'低于60%大概率亏损'},
    {id:'fault',icon:'⚠️',title:'故障系统',formula:'基础3% × 机龄 × 维修系数 × 运营效能',range:'0% ~ 30%+',affects:'航班取消/罚款/品牌',tip:'老飞机+低维修=高频故障'},
    {id:'brand',icon:'⭐',title:'品牌评级',formula:'航线数×0.05 + 广告投入 + 盛事加成',range:'1 ~ 5',affects:'客座率加成 / 票价容忍度',tip:'品牌>3时客座率有显著提升'},
    {id:'stock',icon:'📈',title:'股票市场',formula:'每季波动受事件和运营影响',range:'-30% ~ +50%',affects:'投资收益',tip:'盛事前后买卖时机'},
    {id:'loan',icon:'🏦',title:'银行贷款',formula:'年利率'+LOAN_RATE+'%',range:'最低借款$10M',affects:'扩张速度/利息压力',tip:'利润>利息时借贷划算'},
    {id:'subsidiary',icon:'🏢',title:'子公司系统',formula:'回报=估值×基础回报率×城市指数×盛事倍率',range:'1.2%~2.2%/Q',affects:'季度被动收入+航线联动',tip:'旅行社→客座率+2% 机场→着陆费-15%'},
    {id:'company_value',icon:'💰',title:'公司市值',formula:'现金+飞机+子公司+股票-贷款',range:'--',affects:'破产清算顺序',tip:'市值越高，急救贷款额度越高'}
  ],
  guides:[
    {id:'open_route',title:'开通航线',steps:['购买飞机','点击地图上的起飞城市（红点=总部）','点击目的地城市','选择飞机执飞','确认开通']},
    {id:'open_branch',title:'建立分部',steps:['点击「分部管理」','选择分部城市','确认建造','等待建造完成（1-2季度）','从新分部出发开航线']},
    {id:'adjust_budget',title:'调整运营预算',steps:['点击「运营管理」','调整服务/维修/广告各档位','高档提升效果但费用×2.5','低档省钱但风险增加']},
    {id:'trade_stock',title:'股票交易',steps:['点击底部「📈 NASDOU」','查看持仓和行情','输入买卖数量','注意大事件催化机会']},
    {id:'open_sub',title:'开设子公司',steps:['在地图上点击城市','点击「🏢 子公司」按钮','选择新设或收购','投资共建机场需基地城市','子公司提供季度被动收入']}
  ]
};

// ===== HQ RECOMMENDED CITIES =====
const HQ_RECOMMENDED = ['beijing','tokyo','london','newyork','dubai','shanghai','losangeles','paris'];
