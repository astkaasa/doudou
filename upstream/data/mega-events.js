// ===== MEGA EVENTS =====
// 历届夏季奥运会 + BIE注册综合类世博会
// type: 'olympics_summer' | 'world_expo'
// maxBoost: 主办城市需求乘数峰值 [待测试]
// quarter: 事件发生季度（夏奥Q3, 世博Q2）
// stockEffect: 对股票板块的冲击

const MEGA_EVENTS = [
  // ============================================================
  //  夏季奥运会（15届，1960-2016）
  // ============================================================

  {id:'oly_s1960', type:'olympics_summer', year:1960, quarter:3, cityId:'rome',
   name:'罗马奥运会', fullName:'第17届夏季奥林匹克运动会',
   desc:'永恒之城迎来全球体育健儿，古罗马遗址旁竞技声再起',
   maxBoost:0.40, stockEffect:{tourism:+0.10,culture:+0.08}},

  {id:'oly_s1964', type:'olympics_summer', year:1964, quarter:3, cityId:'tokyo',
   name:'东京奥运会', fullName:'第18届夏季奥林匹克运动会',
   desc:'亚洲首次举办奥运，日本全国一片欢腾、兴奋',
   maxBoost:0.45, stockEffect:{tourism:+0.12,culture:+0.08}},

  {id:'oly_s1968', type:'olympics_summer', year:1968, quarter:3, cityId:'mexicocity',
   name:'墨西哥城奥运会', fullName:'第19届夏季奥林匹克运动会',
   desc:'高原之城首次承办奥运，非洲国家首次大规模参赛',
   maxBoost:0.35, stockEffect:{tourism:+0.08,culture:+0.06}},

  {id:'oly_s1972', type:'olympics_summer', year:1972, quarter:3, cityId:'munich',
   name:'慕尼黑奥运会', fullName:'第20届夏季奥林匹克运动会',
   desc:'啤酒之都敞开怀抱迎接世界，巴伐利亚风情征服全球观众',
   maxBoost:0.30, stockEffect:{tourism:+0.06,culture:+0.04}},

  {id:'oly_s1976', type:'olympics_summer', year:1976, quarter:3, cityId:'montreal',
   name:'蒙特利尔奥运会', fullName:'第21届夏季奥林匹克运动会',
   desc:'加拿大首次承办奥运，法语区城市迎来全球关注',
   maxBoost:0.35, stockEffect:{tourism:+0.08,culture:+0.06}},

  {id:'oly_s1980', type:'olympics_summer', year:1980, quarter:3, cityId:'moscow',
   name:'莫斯科奥运会', fullName:'第22届夏季奥林匹克运动会',
   desc:'首次在东欧城市举办奥运，盛大开幕式展现独特文化魅力',
   maxBoost:0.20, stockEffect:{tourism:+0.04,culture:+0.03}},

  {id:'oly_s1984', type:'olympics_summer', year:1984, quarter:3, cityId:'losangeles',
   name:'洛杉矶奥运会', fullName:'第23届夏季奥林匹克运动会',
   desc:'商业化运营开创先河，赛事盈利改写奥运经济模式',
   maxBoost:0.40, stockEffect:{tourism:+0.10,culture:+0.08,finance:+0.06}},

  {id:'oly_s1988', type:'olympics_summer', year:1988, quarter:3, cityId:'seoul',
   name:'首尔奥运会', fullName:'第24届夏季奥林匹克运动会',
   desc:'汉江奇迹的全球亮相，韩国经济腾飞的重要里程碑',
   maxBoost:0.40, stockEffect:{tourism:+0.10,culture:+0.08}},

  {id:'oly_s1992', type:'olympics_summer', year:1992, quarter:3, cityId:'barcelona',
   name:'巴塞罗那奥运会', fullName:'第25届夏季奥林匹克运动会',
   desc:'地中海明珠重塑城市形象，会后旅游持续繁荣数年',
   maxBoost:0.45, stockEffect:{tourism:+0.12,culture:+0.10}},

  {id:'oly_s1996', type:'olympics_summer', year:1996, quarter:3, cityId:'atlanta',
   name:'亚特兰大奥运会', fullName:'第26届夏季奥林匹克运动会',
   desc:'百年奥运回归故土，美国南部航空枢纽迎来空前客流',
   maxBoost:0.35, stockEffect:{tourism:+0.08,culture:+0.06}},

  {id:'oly_s2000', type:'olympics_summer', year:2000, quarter:3, cityId:'sydney',
   name:'悉尼奥运会', fullName:'第27届夏季奥林匹克运动会',
   desc:'千禧年奥运降临南半球，澳洲大陆迎来史上最大客流',
   maxBoost:0.40, stockEffect:{tourism:+0.10,culture:+0.08}},

  {id:'oly_s2004', type:'olympics_summer', year:2004, quarter:3, cityId:'athens',
   name:'雅典奥运会', fullName:'第28届夏季奥林匹克运动会',
   desc:'奥运回家！故乡雅典迎来全球朝圣，但赛后场馆维护成为负担',
   maxBoost:0.30, stockEffect:{tourism:+0.06,culture:+0.10}},

  {id:'oly_s2008', type:'olympics_summer', year:2008, quarter:3, cityId:'beijing',
   name:'北京奥运会', fullName:'第29届夏季奥林匹克运动会',
   desc:'北京欢迎你！中国以无与伦比的开幕式征服全球观众',
   maxBoost:0.50, stockEffect:{tourism:+0.15,culture:+0.12}},

  {id:'oly_s2012', type:'olympics_summer', year:2012, quarter:3, cityId:'london',
   name:'伦敦奥运会', fullName:'第30届夏季奥林匹克运动会',
   desc:'三度举办奥运的传奇之城，英伦文化再掀全球热潮',
   maxBoost:0.40, stockEffect:{tourism:+0.10,culture:+0.08}},

  {id:'oly_s2016', type:'olympics_summer', year:2016, quarter:3, cityId:'rio',
   name:'里约奥运会', fullName:'第31届夏季奥林匹克运动会',
   desc:'奥运首次登陆南美！桑巴热情点燃全球，但筹备争议不断',
   maxBoost:0.35, stockEffect:{tourism:+0.10,culture:+0.08}},

  // ============================================================
  //  综合类世博会（6届，BIE注册，1967-2015）
  // ============================================================

  {id:'expo_1967', type:'world_expo', year:1967, quarter:2, cityId:'montreal',
   name:'蒙特利尔世博会', fullName:'1967年蒙特利尔世界博览会',
   desc:'人与世界——62国参展，蒙特利尔由此跻身国际大都会',
   maxBoost:0.35, stockEffect:{tourism:+0.10,culture:+0.08}},

  {id:'expo_1970', type:'world_expo', year:1970, quarter:2, cityId:'osaka',
   name:'大阪世博会', fullName:'1970年大阪世界博览会',
   desc:'人类的进步与和谐——77国参展，创当时世博最大规模纪录',
   maxBoost:0.40, stockEffect:{tourism:+0.12,culture:+0.10}},

  {id:'expo_1992', type:'world_expo', year:1992, quarter:2, cityId:'seville',
   name:'塞维利亚世博会', fullName:'1992年塞维利亚世界博览会',
   desc:'发现的时代——112国参展，西班牙借此重塑国际形象',
   maxBoost:0.35, stockEffect:{tourism:+0.10,culture:+0.08}},

  {id:'expo_2000', type:'world_expo', year:2000, quarter:2, cityId:'hannover',
   name:'汉诺威世博会', fullName:'2000年汉诺威世界博览会',
   desc:'人类·自然·科技——155国参展，千禧年世博聚焦可持续发展',
   maxBoost:0.30, stockEffect:{tourism:+0.08,culture:+0.06,tech:+0.04}},

  {id:'expo_2010', type:'world_expo', year:2010, quarter:2, cityId:'shanghai',
   name:'上海世博会', fullName:'2010年上海世界博览会',
   desc:'城市，让生活更美好！史上最大规模世博会，190国参展',
   maxBoost:0.50, stockEffect:{tourism:+0.15,culture:+0.10,finance:+0.05}},

  {id:'expo_2015', type:'world_expo', year:2015, quarter:2, cityId:'milan',
   name:'米兰世博会', fullName:'2015年米兰世界博览会',
   desc:'滋养地球，生命的能源——145国参展，聚焦食品与可持续',
   maxBoost:0.35, stockEffect:{tourism:+0.10,culture:+0.08}},
];
