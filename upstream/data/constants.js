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
  {id:'era1',name:'1960-1980 喷气时代',desc:'波音707率先跨洋，747巨无霸登场，航空业黄金起飞期',startYear:1960,endYear:1980,startOil:20,cash:50,detail:'窄体为主 · 低油价 · 高增长'},
  {id:'era2',name:'1975-1995 变革时代',desc:'美国航空管制放松，廉价航空崛起，油价危机与复苏交替',startYear:1975,endYear:1995,startOil:45,cash:100,detail:'宽体登场 · 油价波动 · 竞争加剧'},
  {id:'era3',name:'2000-2020 全球时代',desc:'低成本航空席卷全球，超远程宽体改写航线版图',startYear:2000,endYear:2020,startOil:60,cash:150,detail:'超宽体客机 · 高油价 · 全球互联'},
  {id:'era4',name:'1960-2020 苍穹传奇',desc:'从喷气启蒙到数字航空，六十年完整体验航空业变迁',startYear:1960,endYear:2020,startOil:30,cash:60,detail:'全机型 · 全事件 · 终极挑战'},
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
const ONBOARD_STEPS=[
  {title:'欢迎启航',body:'试试点击「购买飞机」扩充机队，然后在地图上点击总部或分部作为起飞城市来开通航线。',trigger:()=>G.turnsPlayed===0&&G.routes.length===0},
  {title:'开拓航路',body:'已拥有飞机！现在在地图上先点击总部（红点），再点击另一个城市来开通航线。',trigger:()=>G.fleet.filter(f=>!f.delivering).length>0&&G.routes.length===0},
  {title:'推进时间',body:'航线已就绪！点击右下角「推进回合」按钮开始运营，查看首季财报。',trigger:()=>G.routes.length>0&&G.turnsPlayed===0},
  {title:'分部管理',body:'航线只能从总部起飞？点击「分部管理」扩展基地网络，在更多城市设立分部即可从那里出发！',trigger:()=>G.turnsPlayed>=1&&G.branches.length===0&&(!G.branchesConstructing||G.branchesConstructing.length===0)&&G.routes.length>=2},
  {title:'继续成长',body:'试试购买更多飞机、开设分部扩展基地，或使用「银行贷款」加速扩张！',trigger:()=>G.turnsPlayed>=2&&G.turnsPlayed<=4},
  {title:'苍穹之路',body:'点击底部「★苍穹之路」或顶部「★苍穹之路」查看主线目标！达成全部目标即可通关。',trigger:()=>G.turnsPlayed>=3&&!G._mainQuestOnboardShown},
];
