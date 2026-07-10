const CHINA_CITY_IDS = ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'hongkong', 'chengdu', 'wuhan', 'urumqi', 'lhasa', 'harbin', 'xian', 'taipei'];
const US_CITY_IDS = ['newyork', 'losangeles', 'chicago', 'miami', 'washington', 'dallas', 'denver', 'atlanta', 'houston', 'seattle', 'sanfrancisco'];
const SEA_CITY_IDS = ['singapore', 'bangkok', 'manila', 'jakarta', 'kualalumpur', 'hochiminh', 'brunei', 'hanoi'];
const ISLAND_CITY_IDS = ['male', 'guam', 'saipan', 'okinawa', 'singapore', 'wellington'];
const scopeAll = () => ({ kind: 'all' });
const scopeRegion = (...regions) => ({ kind: 'region', regions });
const scopeSubRegion = (...subRegions) => ({ kind: 'subRegion', subRegions });
const scopeEventZone = (...eventZones) => ({ kind: 'eventZone', eventZones });
const scopeCityIds = (cityIds) => ({ kind: 'cityIds', cityIds });
const scopeAirportIds = (airportIds) => ({ kind: 'airportIds', airportIds });
const scopeConnects = (setA, setB) => ({ kind: 'connectsCitySets', setA, setB });
const scopeCrossRegion = () => ({ kind: 'crossRegion' });
const scopeRouteKeys = (routeKeys) => ({ kind: 'routeKeys', routeKeys });

function randomRouteScope(state, predicate, selectRouteKeys, random) {
  const activeRoutes = (state.routes || []).filter((route) => !route.suspended);
  const selected = selectRouteKeys(activeRoutes, predicate);
  if (selected.length > 0 || activeRoutes.length === 0) return scopeRouteKeys(selected);
  const fallback = selectRouteKeys(activeRoutes, () => true);
  const index = Math.floor((random?.() ?? 0.5) * fallback.length) % fallback.length;
  return scopeRouteKeys([fallback[index]]);
}

function randomRouteAirportId(state, random) {
  const routes = (state.routes || []).filter((route) => !route.suspended && route.fromAirportId && route.toAirportId);
  if (routes.length === 0) return null;
  const route = routes[Math.floor((random?.() ?? 0.5) * routes.length) % routes.length];
  return (random?.() ?? 0.5) < 0.5 ? route.fromAirportId : route.toAirportId;
}

function regionalDisaster({ title, desc, subRegion, label }) {
  return {
    title,
    desc,
    effect: `${label}航线遭受巨大影响`,
    subRegion,
    eventZone: subRegion,
    stockEffect: disasterStockEffect(title),
    effectFn: ({ state: G, addDisasterDemandModifier }) => {
      addDisasterDemandModifier(G, title, scopeEventZone(subRegion), 1);
    },
  };
}

function disasterStockEffect(title) {
  if (/火山/.test(title)) return { tourism: -0.15, culture: -0.06 };
  if (/地震/.test(title)) return { tourism: -0.10, culture: -0.04 };
  if (/洪|暴雨|滑坡/.test(title)) return { tourism: -0.10, culture: -0.03 };
  if (/高温|热浪/.test(title)) return { tourism: -0.06, energy: 0.05 };
  if (/山火|干旱/.test(title)) return { tourism: -0.05, energy: 0.03 };
  if (/暴雪|冰暴/.test(title)) return { tourism: -0.08, culture: -0.03 };
  if (/台风|飓风|气旋/.test(title)) return { tourism: -0.12, culture: -0.04 };
  if (/风暴|沙尘暴/.test(title)) return { tourism: -0.08, culture: -0.02 };
  return { tourism: -0.06, culture: -0.02 };
}

export const NEWS_POOL = {
  aviation: [
    {title:'棕榈滩机场启用特朗普国际机场新名',desc:'迈阿密都会区北侧的棕榈滩国际机场正式更名为“President Donald J. Trump International Airport”。FAA 识别码同步改为 KDJT，IATA 代码将在本季度由 PBI 过渡为 DJT。',effect:'迈阿密开放远端特殊机场选择',years:[2026],quarters:[3],scheduled:true,stockEffect:{tourism:0.02,finance:0.01},effectFn:()=>{}},
    {title:'枢纽机场新航站楼投入使用',desc:'一座玩家正在运营的机场完成航站楼扩建，值机、行李和中转保障能力得到改善。',effect:'目标机场航线需求上升4%',requiresAirportRoutes:true,stockEffect:{tourism:0.03,finance:0.02},effectFn:({state:G,addDemandModifier,random,getAirport,airportDisplayCode})=>{const airportId=randomRouteAirportId(G,random);if(!airportId)return;addDemandModifier(G,'机场新航站楼投用',scopeAirportIds([airportId]),1.04);const airport=getAirport?.(airportId);const code=airportDisplayCode?.(airport)||airportId;return{title:`${code} 新航站楼投入使用`,desc:`${airport?.name||'目标机场'}完成航站楼扩建，旅客处理和中转保障能力得到改善。`};}},
    {title:'喷气客运网络进入扩张期',desc:'航空公司加密干线并开辟更多跨境航点，喷气旅行逐渐从少数旗舰航线走向大众市场。',effect:'行业趋势，无直接经营修正',startYear:1960,endYear:1979,stockEffect:{tourism:0.03,finance:0.01}},
    {title:'宽体客机推动洲际枢纽扩张',desc:'大型宽体客机提升远程航线运力，航空公司开始围绕主要枢纽组织更密集的洲际网络。',effect:'行业趋势，无直接经营修正',startYear:1970,endYear:1994,stockEffect:{tourism:0.03,finance:0.01}},
    {title:'低成本航空加速开辟区域航线',desc:'低成本航空公司利用次级机场和高周转模式扩大网络，更多旅客开始选择航空出行。',effect:'行业趋势，无直接经营修正',startYear:1995,stockEffect:{tourism:0.03,finance:0.01}},
    {title:'航空联盟扩大跨洲联程合作',desc:'多家航空公司统一中转、常旅客和行李衔接标准，跨洲联程吸引力提高。',effect:'行业趋势，无直接经营修正',startYear:1997,stockEffect:{tourism:0.03,finance:0.02}},
    {title:'主要枢纽航管与地勤人手紧张',desc:'航班量增长快于管制员和地勤人员补充速度，延误、加班与外包费用同步上升。',effect:'整体航线成本上升5%',startYear:1970,stockEffect:{tourism:-0.02,finance:-0.02},effectFn:({state:G,addCostModifier})=>{addCostModifier(G,'航管与地勤人手紧张',scopeAll(),1.05);}},
  ],
  politics: [
    {title:'中东局势紧张，多国发布旅行警告',desc:'区域冲突升级，多国政府建议公民避免前往中东部分地区。航空公司纷纷调整航线。',effect:'中东航线需求下降15%',stockEffect:{tourism:-0.05,culture:-0.03,energy:0.04},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'中东局势紧张',scopeSubRegion('mideast'),0.85);}},
    {title:'欧盟通过新的航空碳排放法规',desc:'欧盟扩大航空碳排放交易规则，航空公司的合规成本随之上升。',effect:'欧洲航线运营成本增加3%',startYear:2008,stockEffect:{finance:-0.02,tech:0.04,energy:-0.02},effectFn:({state:G,addCostModifier})=>{addCostModifier(G,'欧盟航空碳排放法规',scopeRegion('europe'),1.03);}},
    {title:'中美签署新航空协议，增加航班配额',desc:'两国达成新的双边航空服务安排，定期航班配额增加，市场迎来利好。',effect:'中美航线需求上升20%',startYear:1980,stockEffect:{tourism:0.06,finance:0.04},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'中美新航空协议',scopeConnects(CHINA_CITY_IDS,US_CITY_IDS),1.2);}},
    {title:'某国爆发大规模抗议活动',desc:'东南亚某国政局动荡，街头抗议持续数周，外国游客锐减。',effect:'东南亚航线客座率下降10%',stockEffect:{tourism:-0.04,finance:-0.02,culture:-0.02},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'东南亚抗议活动',scopeCityIds(SEA_CITY_IDS),0.9);}},
    {title:'联合国气候峰会推动绿色航空',desc:'各国承诺加速可持续航空燃料研发，传统航油税可能上调。',effect:'燃油附加费预期上升',startYear:2008,stockEffect:{tech:0.05,energy:-0.02,finance:0.01},effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*1.05,30,180);}},
    {title:'多国逐步放宽航空市场准入',desc:'新的双边安排减少部分运力和航点限制，航空公司获得更多跨境经营空间。',effect:'行业趋势，无直接经营修正',startYear:1980,stockEffect:{tourism:0.03,finance:0.02}},
    {title:'区域签证便利化带动短途出境游',desc:'多国简化旅游签证和团队入境手续，旅行社迅速增加跨境产品。',effect:'行业趋势，无直接经营修正',startYear:1985,stockEffect:{tourism:0.04,culture:0.02}},
    {title:'国际机场安检标准全面升级',desc:'各国加强旅客、行李和货物检查，航空公司需要投入更多地面保障资源。',effect:'跨区域航线成本上升4%',startYear:2001,stockEffect:{tourism:-0.02,finance:-0.02,tech:0.02},effectFn:({state:G,addCostModifier})=>{addCostModifier(G,'国际机场安检升级',scopeCrossRegion(),1.04);}},
  ],
  entertainment: [
    {title:'全球顶级歌手宣布世界巡回演唱会',desc:'数十场跨洲演唱会带动粉丝跨国追星，商务舱和头等舱预订上升。',effect:'高端出行需求上升10%',stockEffect:{culture:0.07,tourism:0.04},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'世界巡回演唱会',scopeAll(),1.1);}},
    {title:'好莱坞大制作取景带动旅游热潮',desc:'某热带海岛因电影取景走红，旅行社咨询和旅游杂志报道迅速增加。',effect:'海岛航线需求上升15%',stockEffect:{culture:0.06,tourism:0.05},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'海岛旅游热潮',scopeCityIds(ISLAND_CITY_IDS),1.15);}},
    {title:'国际电子竞技总决赛吸引全球观众',desc:'赛事在亚洲举行，数万粉丝跨国观赛，周边酒店一房难求。',effect:'亚洲航线短期需求上升',startYear:2000,stockEffect:{culture:0.05,tourism:0.02,tech:0.02},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'电竞总决赛',scopeRegion('asia'),1.1);}},
    {title:'国际电影节与颁奖季带动观众出行',desc:'电影首映、颁奖礼和行业交易活动集中举行，媒体与观众跨境出行增加。',effect:'行业关注升温，无直接经营修正',stockEffect:{culture:0.04,tourism:0.02}},
    {title:'全球电视文化热潮催生取景地旅游',desc:'热门节目和跨国转播令多个拍摄地受到关注，旅行社快速推出主题线路。',effect:'行业趋势，无直接经营修正',startYear:1965,stockEffect:{culture:0.03,tourism:0.02}},
  ],
  disaster: [
    {title:'枢纽机场遭遇极端天气中断',desc:'一座正在运营的机场遭遇强对流天气，跑道和地面保障能力骤降。预先指定备降机场或建设灾害韧性设施的航线可以显著减少损失。',effect:'目标机场航线需求与成本受韧性方案影响',requiresAirportRoutes:true,stockEffect:{tourism:-0.05,finance:-0.02},effectFn:({state:G,addAirportDisruptionModifier,random,getAirport,airportDisplayCode})=>{const airportId=randomRouteAirportId(G,random);if(!airportId||!addAirportDisruptionModifier)return;addAirportDisruptionModifier(G,'机场极端天气中断',[airportId],1);const airport=getAirport?.(airportId);const code=airportDisplayCode?.(airport)||airportId;return{title:`${code} 遭遇极端天气中断`,desc:`${airport?.name||'目标机场'}遭遇强对流天气，备降计划和灾害韧性设施将决定实际损失。`};}},
    regionalDisaster({title:'超强台风席卷东亚沿海',desc:'连续超强台风登陆东亚沿岸，多个国际机场被迫关闭超过48小时，大量航班延误或取消。',subRegion:'east_asia',label:'东亚'}),
    regionalDisaster({title:'东亚暴雪致大面积航班取消',desc:'罕见暴风雪袭击东亚多国，跑道积雪严重，数百航班被迫取消。',subRegion:'east_asia',label:'东亚'}),
    regionalDisaster({title:'沙尘暴笼罩东亚空域',desc:'大规模沙尘暴从内陆席卷而来，能见度骤降，多个机场被迫关闭。',subRegion:'east_asia',label:'东亚'}),
    regionalDisaster({title:'超强台风横扫东南亚',desc:'猛烈台风登陆东南亚沿海地区，机场设施受损严重，航班全面停运。',subRegion:'southeast_asia',label:'东南亚'}),
    regionalDisaster({title:'东南亚洪灾致航空运输受阻',desc:'持续暴雨引发大范围洪涝，多个机场跑道被淹，航班大面积取消。',subRegion:'southeast_asia',label:'东南亚'}),
    regionalDisaster({title:'东南亚火山喷发扰乱航运',desc:'火山猛烈喷发，火山灰云扩散至高空，影响飞机起降安全。',subRegion:'southeast_asia',label:'东南亚'}),
    regionalDisaster({title:'南亚季风暴雨致航线受阻',desc:'持续季风暴雨袭击南亚次大陆，多个主要机场运营受阻，航班大量取消。',subRegion:'south_asia',label:'南亚'}),
    regionalDisaster({title:'南亚极端热浪冲击航空运营',desc:'罕见高温使空气密度下降，飞机无法满载起飞，多个机场限制航班密度。',subRegion:'south_asia',label:'南亚'}),
    regionalDisaster({title:'孟加拉湾气旋侵袭南亚',desc:'强气旋席卷南亚沿海，狂风暴雨导致机场关闭，航班全面停运。',subRegion:'south_asia',label:'南亚'}),
    regionalDisaster({title:'中亚寒潮令机场大面积除冰',desc:'强寒潮覆盖中亚，跑道积雪和机体结冰导致航班延误与取消。',subRegion:'central_asia',label:'中亚'}),
    regionalDisaster({title:'中东特大沙尘暴瘫痪航空',desc:'巨型沙尘暴覆盖中东大部分地区，能见度降至近零，所有航班停飞。',subRegion:'mideast',label:'中东'}),
    regionalDisaster({title:'中东极端高温危及飞行安全',desc:'气温飙升至50度以上，空气密度不足导致飞机无法安全起降，航班大面积取消。',subRegion:'mideast',label:'中东'}),
    regionalDisaster({title:'中东罕见暴雨引发洪灾',desc:'多年未遇的暴雨袭击中东干旱地区，机场排水系统瘫痪，航班停运。',subRegion:'mideast',label:'中东'}),
    regionalDisaster({title:'冰岛火山喷发，欧洲空域关闭',desc:'火山灰云扩散至北欧上空，危及飞行安全，数百航班被迫取消。',subRegion:'europe',label:'欧洲'}),
    regionalDisaster({title:'欧洲暴风雪致航空瘫痪',desc:'强寒潮席卷欧洲大陆，三大枢纽机场全部关闭，数千旅客滞留。',subRegion:'europe',label:'欧洲'}),
    regionalDisaster({title:'大西洋风暴横扫西欧',desc:'强烈低气压风暴袭击西欧，狂风导致机场跑道无法使用，航班全面停飞。',subRegion:'europe',label:'欧洲'}),
    regionalDisaster({title:'撒哈拉沙尘暴侵袭北非空域',desc:'大规模沙尘暴从撒哈拉沙漠席卷北非，多个机场因能见度过低而关闭。',subRegion:'north_africa',label:'北非'}),
    regionalDisaster({title:'北非极端热浪冲击航空',desc:'北非多地气温突破50度，高温导致飞机性能受限，航班大面积减少。',subRegion:'north_africa',label:'北非'}),
    regionalDisaster({title:'北非暴雨引发洪涝灾害',desc:'突发暴雨袭击北非干旱地区，机场被淹，航空运输暂时中断。',subRegion:'north_africa',label:'北非'}),
    regionalDisaster({title:'西非季风洪灾冲击航空网络',desc:'季风暴雨导致西非多个机场跑道积水，区域航班大面积取消。',subRegion:'west_africa',label:'西非'}),
    regionalDisaster({title:'东非火山灰云迫使航班绕飞',desc:'东非裂谷火山活动增强，火山灰云令周边机场关闭并触发大范围绕飞。',subRegion:'east_africa',label:'东非'}),
    regionalDisaster({title:'中部非洲暴雨洪灾致航空受阻',desc:'持续强降雨导致中非多国洪涝，机场跑道被淹，航班被迫取消。',subRegion:'central_africa',label:'中非'}),
    regionalDisaster({title:'中非热带风暴肆虐',desc:'强烈热带风暴席卷中部非洲，多个机场设施受损，运营受阻。',subRegion:'central_africa',label:'中非'}),
    regionalDisaster({title:'中非火山喷发冲击航空运输',desc:'尼拉贡戈火山剧烈喷发，火山灰威胁飞行安全，周边机场紧急关闭。',subRegion:'central_africa',label:'中非'}),
    regionalDisaster({title:'南非罕见暴风雪致交通瘫痪',desc:'南非遭遇异常寒潮暴雪，机场跑道积雪无法起降，航班全部停运。',subRegion:'south_africa',label:'南非'}),
    regionalDisaster({title:'南非极端干旱引发山火',desc:'持续干旱引发大规模山火，浓烟弥漫机场周边空域，航班受到影响。',subRegion:'south_africa',label:'南非'}),
    regionalDisaster({title:'莫桑比克海峡气旋袭击南非',desc:'强热带气旋从东海岸登陆，狂风暴雨摧毁机场设施，航空运输中断。',subRegion:'south_africa',label:'南非'}),
    regionalDisaster({title:'北美东海岸遭遇超级暴风雪',desc:'超强暴风雪席卷北美东部，三大枢纽机场全部关闭超过24小时。',subRegion:'east_namerica',label:'北美东部'}),
    regionalDisaster({title:'飓风袭击北美东海岸',desc:'大型飓风登陆东部沿海，多个机场遭洪水侵袭，航班全面停运。',subRegion:'east_namerica',label:'北美东部'}),
    regionalDisaster({title:'东北风暴致北美东部航空瘫痪',desc:'强力东北风暴横扫东海岸，暴风雪和冰雨导致机场关闭。',subRegion:'east_namerica',label:'北美东部'}),
    regionalDisaster({title:'北美中部龙卷风摧毁机场设施',desc:'大规模龙卷风横扫北美中部，多个机场航站楼受损，运营受阻。',subRegion:'central_namerica',label:'北美中部'}),
    regionalDisaster({title:'北美中部暴风雪致大范围停飞',desc:'强暴风雪席卷大平原地区，多个枢纽机场被迫关闭，航班大面积取消。',subRegion:'central_namerica',label:'北美中部'}),
    regionalDisaster({title:'冰暴袭击北美中部机场',desc:'冻雨形成严重冰灾，飞机机体积冰严重，机场跑道结冰，航班停运。',subRegion:'central_namerica',label:'北美中部'}),
    regionalDisaster({title:'北美西海岸地震致机场关闭',desc:'强震袭击北美西海岸，旧金山和洛杉矶机场紧急关闭检查受损情况。',subRegion:'west_namerica',label:'北美西部'}),
    regionalDisaster({title:'加州山火蔓延至机场周边',desc:'大规模山火产生的浓烟严重影响机场能见度，多个航班被迫取消。',subRegion:'west_namerica',label:'北美西部'}),
    regionalDisaster({title:'太平洋风暴袭击西海岸',desc:'强烈太平洋风暴登陆，暴雨和狂风迫使多个西海岸机场关闭。',subRegion:'west_namerica',label:'北美西部'}),
    regionalDisaster({title:'加勒比飓风致多机场关闭',desc:'超强飓风横扫加勒比海地区，多个海岛机场遭严重破坏，航班全面停运。',subRegion:'caribbean',label:'加勒比'}),
    regionalDisaster({title:'加勒比火山喷发扰乱航空',desc:'加勒比海岛火山剧烈喷发，火山灰云升至高空，周边航班全部取消。',subRegion:'caribbean',label:'加勒比'}),
    regionalDisaster({title:'加勒比暴雨引发山体滑坡',desc:'持续暴雨引发山体滑坡，多个机场道路中断，运营受到影响。',subRegion:'caribbean',label:'加勒比'}),
    regionalDisaster({title:'南美洲强震破坏基础设施',desc:'7.8级强震袭击南美西海岸，机场和道路受损严重，航班大面积取消。',subRegion:'samerica',label:'南美'}),
    regionalDisaster({title:'南美亚马逊流域洪灾',desc:'持续暴雨导致亚马逊流域严重洪涝，多个城市机场被淹，航班停运。',subRegion:'samerica',label:'南美'}),
    regionalDisaster({title:'南美火山喷发致空域关闭',desc:'南美安第斯山脉火山猛烈喷发，火山灰云威胁飞行安全，航班停飞。',subRegion:'samerica',label:'南美'}),
    regionalDisaster({title:'南太平洋气旋袭击大洋洲',desc:'强烈热带气旋席卷大洋洲，多处机场设施遭破坏，航班全面停运。',subRegion:'oceania',label:'大洋洲'}),
    regionalDisaster({title:'大洋洲暴风雨致航空中断',desc:'罕见暴风雨席卷大洋洲多国，机场跑道积水严重，航班大面积取消。',subRegion:'oceania',label:'大洋洲'}),
    regionalDisaster({title:'新西兰火山喷发威胁航运',desc:'新西兰北岛火山突然喷发，火山灰危及飞行安全，周边空域紧急关闭。',subRegion:'oceania',label:'大洋洲'}),
  ],
  economy: [
    {title:'全球股市暴跌，经济衰退预警',desc:'主要经济体多项指标集体下滑，投资者恐慌抛售，消费信心降至低位。',effect:'商务出行需求下降15%',stockEffect:{finance:-0.08,tech:-0.05,tourism:-0.04},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'全球经济衰退预警',scopeAll(),0.85);}},
    {title:'国际油价暴跌至三年新低',desc:'OPEC成员国协调破裂，主要产油国宣布增产，油价单日跌幅超过8%。',effect:'燃油成本大幅下降',startYear:1973,stockEffect:{energy:-0.08,tourism:0.04},effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*0.8,30,180);}},
    {title:'油价突破120美元，航空公司承压',desc:'地缘冲突叠加供给不足，原油价格持续攀升，航空业利润被大幅侵蚀。',effect:'运营成本上升8%',startYear:2008,stockEffect:{energy:0.08,tourism:-0.04},effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*1.15,30,180);}},
    {title:'多国央行同步降息，经济刺激方案出台',desc:'主要经济体进入宽松周期，消费和出行意愿回升，旅游行业率先受益。',effect:'整体需求回暖10%',startYear:1987,stockEffect:{finance:0.05,tourism:0.04,tech:0.02},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'全球降息刺激',scopeAll(),1.1);}},
    {title:'某大型航空公司破产重组',desc:'欧洲知名航司因长期亏损申请破产保护，释放大量时刻资源。',effect:'竞争减弱，市场份额机会',stockEffect:{finance:-0.03,tourism:0.02},effectFn:({state:G})=>{const ai=G.ai[0];ai.routes=ai.routes.slice(0,Math.ceil(ai.routes.length/2));}},
    {title:'枢纽机场启动临时跑道检修',desc:'一座正在运营的枢纽机场临时关闭部分跑道，相关航线需要承担绕行、等待和调度成本。',effect:'受影响机场航线成本上升12%',requiresAirportRoutes:true,stockEffect:{tourism:-0.02,finance:-0.01},effectFn:({state:G,addCostModifier,random,getAirport,airportDisplayCode})=>{const airportId=randomRouteAirportId(G,random);if(!airportId)return;addCostModifier(G,'机场跑道临时检修',scopeAirportIds([airportId]),1.12);const airport=getAirport?.(airportId);const code=airportDisplayCode?.(airport)||airportId;return{title:`${code} 启动临时跑道检修`,desc:`${airport?.name||'目标机场'}临时关闭部分跑道，相关航线需要承担等待和调度成本。`};}},
    {title:'跨国商务活动持续升温',desc:'制造、金融和专业服务企业增加跨境拜访与会议预算，工作日航空需求走强。',effect:'行业趋势，无直接经营修正',stockEffect:{finance:0.04,tourism:0.02}},
    {title:'航空保险费率普遍上调',desc:'事故风险评估和再保险成本上升，航空公司需要承担更高的综合保障费用。',effect:'整体航线成本上升4%',startYear:1970,stockEffect:{finance:0.02,tourism:-0.02},effectFn:({state:G,addCostModifier})=>{addCostModifier(G,'航空保险费率上调',scopeAll(),1.04);}},
    {title:'航空零部件供应链出现瓶颈',desc:'发动机、航电与高周转备件交付延迟，航空公司被迫增加库存和紧急采购支出。',effect:'整体航线成本上升5%',startYear:1990,stockEffect:{tech:-0.03,finance:-0.02},effectFn:({state:G,addCostModifier})=>{addCostModifier(G,'航空零部件供应瓶颈',scopeAll(),1.05);}},
  ],
  tech: [
    {title:'新一代航空电子设备投入使用',desc:'改进型气象雷达、导航设备和自动飞行系统提升了航班可靠性。',effect:'品牌形象小幅提升',stockEffect:{tech:0.03,finance:0.01},effectFn:({state:G,clamp})=>{G.brand=clamp(G.brand+0.03,1,10);}},
    {title:'超音速客机试飞引发全球关注',desc:'多国原型机相继突破音障，航空业期待以两倍音速连接洲际城市。',effect:'品牌形象提升',startYear:1968,endYear:1975,stockEffect:{tech:0.06,finance:0.02},effectFn:({state:G,clamp})=>{G.brand=clamp(G.brand+0.05,1,10);}},
    {title:'民用超音速飞行计划重新启动',desc:'多家初创公司公布验证机和客机方案，但研发仍处于设计与测试阶段。',effect:'品牌形象提升',startYear:2015,stockEffect:{tech:0.05,finance:0.01},effectFn:({state:G,clamp})=>{G.brand=clamp(G.brand+0.03,1,10);}},
    {title:'可持续航空燃料进入商业试用',desc:'试验和认证取得进展，多家航司开始在部分商业航班中使用SAF混合燃料。',effect:'燃油成本下降5%',startYear:2011,stockEffect:{tech:0.05,energy:-0.03,tourism:0.02},effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*0.95,30,180);}},
    {title:'远程驾驶货运飞机进入测试',desc:'货运验证机完成远程操控飞行，相关技术仍需通过长期测试和适航审定。',effect:'长期：人员成本有望降低',startYear:2018,stockEffect:{tech:0.05},effectFn:()=>{}},
    {title:'计算机订座系统加速普及',desc:'航空公司逐步以实时计算机网络替代纸质座位表，订座速度和库存准确性显著提高。',effect:'行业趋势，无直接经营修正',startYear:1964,endYear:1999,stockEffect:{tech:0.04,finance:0.02}},
    {title:'双发客机获准执飞更远洋区航线',desc:'发动机可靠性和备降规范改善，双发客机可以更灵活地规划跨洋航路。',effect:'行业趋势，无直接经营修正',startYear:1985,stockEffect:{tech:0.05,finance:0.02}},
    {title:'网上订座开始走向大众市场',desc:'消费者可以直接查询航班和价格，航空公司的直销与收益管理能力同步增强。',effect:'行业趋势，无直接经营修正',startYear:1996,stockEffect:{tech:0.04,finance:0.02}},
  ],
  sports: [
    {title:'F1新赛季开赛，巡回赛带动出行',desc:'从欧洲传统赛道到美洲等海外分站，车迷跨国观赛需求旺盛。',effect:'洲际航线需求小幅上升',quarters:[1],stockEffect:{culture:0.03,tourism:0.03,energy:0.01},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'F1巡回赛',scopeCrossRegion(),1.08);}},
    {title:'网球大满贯赛季吸引跨国观众',desc:'球员、媒体和观众在多个大洲间连续转场，赛事城市航空预订保持活跃。',effect:'行业关注升温，无直接经营修正',stockEffect:{culture:0.03,tourism:0.02}},
    {title:'洲际俱乐部决赛掀起球迷远征潮',desc:'两支传统劲旅会师决赛，大批球迷通过包机和定期航班前往观赛。',effect:'行业关注升温，无直接经营修正',startYear:1960,stockEffect:{culture:0.03,tourism:0.02}},
  ],
  health: [
    {title:'新型流感变种引发区域性恐慌',desc:'WHO发布预警，某地区出现高传染性流感变种，多国加强入境检疫。',effect:'相关区域出行下降20%',requiresRoutes:true,stockEffect:{tourism:-0.08,culture:-0.04,finance:-0.02},effectFn:({state:G,addDemandModifier,selectRouteKeys,random})=>{addDemandModifier(G,'新型流感变种',randomRouteScope(G,()=> (random?.() ?? 0.5)<0.3,selectRouteKeys,random),0.8);}},
    {title:'全球疫苗接种率创新高，出行信心恢复',desc:'主要经济体疫苗接种率突破85%，各国逐步撤销旅行限制。',effect:'整体需求回升15%',startYear:2021,stockEffect:{tourism:0.06,culture:0.03,finance:0.02},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'全球出行信心恢复',scopeAll(),1.15);}},
    {title:'某国爆发不明肺炎，航空管制升级',desc:'数个国际机场启动体温筛查，来自疫区航班需额外审批。',effect:'国际航线受阻',startYear:2003,stockEffect:{tourism:-0.06,culture:-0.03,finance:-0.01},effectFn:({state:G,addSuspensionModifier})=>{addSuspensionModifier(G,'国际航线航空管制',scopeCrossRegion(),1);}},
    {title:'季节性流感令部分航线退订增加',desc:'冬季流感传播加快，商务与探亲旅客临时取消行程，部分航线预订转弱。',effect:'部分航线需求下降10%',quarters:[1,4],requiresRoutes:true,stockEffect:{tourism:-0.04,culture:-0.02},effectFn:({state:G,addDemandModifier,selectRouteKeys,random})=>{addDemandModifier(G,'季节性流感退订',randomRouteScope(G,()=> (random?.() ?? 0.5)<0.35,selectRouteKeys,random),0.9);}},
    {title:'区域疫情受控，旅行警告逐步解除',desc:'病例持续下降后，多国撤销临时检疫和旅行警告，旅客信心开始恢复。',effect:'行业信心改善，无直接经营修正',stockEffect:{tourism:0.03,culture:0.02}},
  ]
};
