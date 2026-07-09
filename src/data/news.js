const CHINA_CITY_IDS = ['beijing', 'shanghai', 'hongkong', 'chengdu', 'wuhan', 'urumqi', 'lhasa', 'harbin', 'xian', 'taipei'];
const US_CITY_IDS = ['newyork', 'losangeles', 'chicago', 'miami', 'washington', 'dallas', 'denver', 'atlanta', 'houston', 'seattle', 'sanfrancisco'];
const SEA_CITY_IDS = ['singapore', 'bangkok', 'manila', 'jakarta', 'brunei', 'hanoi'];
const ISLAND_CITY_IDS = ['male', 'guam', 'saipan', 'okinawa', 'singapore', 'wellington'];
const scopeAll = () => ({ kind: 'all' });
const scopeRegion = (...regions) => ({ kind: 'region', regions });
const scopeSubRegion = (...subRegions) => ({ kind: 'subRegion', subRegions });
const scopeCityIds = (cityIds) => ({ kind: 'cityIds', cityIds });
const scopeConnects = (setA, setB) => ({ kind: 'connectsCitySets', setA, setB });
const scopeCrossRegion = () => ({ kind: 'crossRegion' });
const scopeRouteKeys = (routeKeys) => ({ kind: 'routeKeys', routeKeys });

function randomRouteScope(state, predicate, selectRouteKeys) {
  return scopeRouteKeys(selectRouteKeys(state.routes, predicate));
}

function regionalDisaster({ title, desc, subRegion, label }) {
  return {
    title,
    desc,
    effect: `${label}航线遭受巨大影响`,
    subRegion,
    stockEffect: disasterStockEffect(title),
    effectFn: ({ state: G, addDisasterDemandModifier }) => {
      addDisasterDemandModifier(G, title, scopeSubRegion(subRegion), 1);
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
  politics: [
    {title:'中东局势紧张，多国发布旅行警告',desc:'区域冲突升级，多国政府建议公民避免前往中东部分地区。航空公司纷纷调整航线。',effect:'中东航线需求下降15%',stockEffect:{tourism:-0.05,culture:-0.03,energy:0.04},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'中东局势紧张',scopeSubRegion('mideast'),0.85);}},
    {title:'欧盟通过新的航空碳排放法规',desc:'欧盟议会以微弱多数通过扩大碳排放交易体系，航空公司额外成本上升。',effect:'欧洲航线运营成本增加3%',stockEffect:{finance:-0.02,tech:0.04,energy:-0.02},effectFn:({state:G,addCostModifier})=>{addCostModifier(G,'欧盟航空碳排放法规',scopeRegion('europe'),1.03);}},
    {title:'中美签署新航空协议，增加航班配额',desc:'两国达成新的双边航空服务协定，每周航班限额大幅提升，市场迎来利好。',effect:'中美航线需求上升20%',stockEffect:{tourism:0.06,finance:0.04},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'中美新航空协议',scopeConnects(CHINA_CITY_IDS,US_CITY_IDS),1.2);}},
    {title:'某国爆发大规模抗议活动',desc:'东南亚某国政局动荡，街头抗议持续数周，外国游客锐减。',effect:'东南亚航线客座率下降10%',stockEffect:{tourism:-0.04,finance:-0.02,culture:-0.02},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'东南亚抗议活动',scopeCityIds(SEA_CITY_IDS),0.9);}},
    {title:'联合国气候峰会推动绿色航空',desc:'各国承诺加速可持续航空燃料研发，传统航油税可能上调。',effect:'燃油附加费预期上升',stockEffect:{tech:0.05,energy:-0.02,finance:0.01},effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*1.05,30,180);}},
  ],
  entertainment: [
    {title:'世界杯举办城市酒店预订暴增',desc:'距世界杯开幕仅6个月，举办城市酒店预订率已达92%，航空公司加开包机。',effect:'相关航线需求激增25%',stockEffect:{culture:0.04,tourism:0.06},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'世界杯客流高峰',scopeAll(),1.25);}},
    {title:'全球顶级歌手宣布世界巡回演唱会',desc:'数十场跨洲演唱会带动粉丝跨国追星，商务舱和头等舱预订上升。',effect:'高端出行需求上升10%',stockEffect:{culture:0.07,tourism:0.04},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'世界巡回演唱会',scopeAll(),1.1);}},
    {title:'好莱坞大制作取景带动旅游热潮',desc:'某热带海岛因电影取景走红，社交媒体上旅行打卡帖激增。',effect:'海岛航线需求上升15%',stockEffect:{culture:0.06,tourism:0.05},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'海岛旅游热潮',scopeCityIds(ISLAND_CITY_IDS),1.15);}},
    {title:'国际电子竞技总决赛吸引全球观众',desc:'赛事在亚洲举行，数万粉丝跨国观赛，周边酒店一房难求。',effect:'亚洲航线短期需求上升',stockEffect:{culture:0.05,tourism:0.02,tech:0.02},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'电竞总决赛',scopeRegion('asia'),1.1);}},
  ],
  disaster: [
    regionalDisaster({title:'超强台风席卷东亚沿海',desc:'连续超强台风登陆东亚沿岸，多个国际机场被迫关闭超过48小时，大量航班延误或取消。',subRegion:'east_asia',label:'东亚'}),
    regionalDisaster({title:'东亚暴雪致大面积航班取消',desc:'罕见暴风雪袭击东亚多国，跑道积雪严重，数百航班被迫取消。',subRegion:'east_asia',label:'东亚'}),
    regionalDisaster({title:'沙尘暴笼罩东亚空域',desc:'大规模沙尘暴从内陆席卷而来，能见度骤降，多个机场被迫关闭。',subRegion:'east_asia',label:'东亚'}),
    regionalDisaster({title:'超强台风横扫东南亚',desc:'猛烈台风登陆东南亚沿海地区，机场设施受损严重，航班全面停运。',subRegion:'southeast_asia',label:'东南亚'}),
    regionalDisaster({title:'东南亚洪灾致航空运输受阻',desc:'持续暴雨引发大范围洪涝，多个机场跑道被淹，航班大面积取消。',subRegion:'southeast_asia',label:'东南亚'}),
    regionalDisaster({title:'东南亚火山喷发扰乱航运',desc:'火山猛烈喷发，火山灰云扩散至高空，影响飞机起降安全。',subRegion:'southeast_asia',label:'东南亚'}),
    regionalDisaster({title:'南亚季风暴雨致航线受阻',desc:'持续季风暴雨袭击南亚次大陆，多个主要机场运营受阻，航班大量取消。',subRegion:'south_asia',label:'南亚'}),
    regionalDisaster({title:'南亚极端热浪冲击航空运营',desc:'罕见高温使空气密度下降，飞机无法满载起飞，多个机场限制航班密度。',subRegion:'south_asia',label:'南亚'}),
    regionalDisaster({title:'孟加拉湾气旋侵袭南亚',desc:'强气旋席卷南亚沿海，狂风暴雨导致机场关闭，航班全面停运。',subRegion:'south_asia',label:'南亚'}),
    regionalDisaster({title:'中东特大沙尘暴瘫痪航空',desc:'巨型沙尘暴覆盖中东大部分地区，能见度降至近零，所有航班停飞。',subRegion:'mideast',label:'中东'}),
    regionalDisaster({title:'中东极端高温危及飞行安全',desc:'气温飙升至50度以上，空气密度不足导致飞机无法安全起降，航班大面积取消。',subRegion:'mideast',label:'中东'}),
    regionalDisaster({title:'中东罕见暴雨引发洪灾',desc:'多年未遇的暴雨袭击中东干旱地区，机场排水系统瘫痪，航班停运。',subRegion:'mideast',label:'中东'}),
    regionalDisaster({title:'冰岛火山喷发，欧洲空域关闭',desc:'火山灰云扩散至北欧上空，危及飞行安全，数百航班被迫取消。',subRegion:'europe',label:'欧洲'}),
    regionalDisaster({title:'欧洲暴风雪致航空瘫痪',desc:'强寒潮席卷欧洲大陆，三大枢纽机场全部关闭，数千旅客滞留。',subRegion:'europe',label:'欧洲'}),
    regionalDisaster({title:'大西洋风暴横扫西欧',desc:'强烈低气压风暴袭击西欧，狂风导致机场跑道无法使用，航班全面停飞。',subRegion:'europe',label:'欧洲'}),
    regionalDisaster({title:'撒哈拉沙尘暴侵袭北非空域',desc:'大规模沙尘暴从撒哈拉沙漠席卷北非，多个机场因能见度过低而关闭。',subRegion:'north_africa',label:'北非'}),
    regionalDisaster({title:'北非极端热浪冲击航空',desc:'北非多地气温突破50度，高温导致飞机性能受限，航班大面积减少。',subRegion:'north_africa',label:'北非'}),
    regionalDisaster({title:'北非暴雨引发洪涝灾害',desc:'突发暴雨袭击北非干旱地区，机场被淹，航空运输暂时中断。',subRegion:'north_africa',label:'北非'}),
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
    {title:'全球股市暴跌，经济衰退预警',desc:'主要经济体PMI数据集体下滑，投资者恐慌抛售，消费信心指数创新低。',effect:'商务出行需求下降15%',stockEffect:{finance:-0.08,tech:-0.05,tourism:-0.04},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'全球经济衰退预警',scopeAll(),0.85);}},
    {title:'国际油价暴跌至三年新低',desc:'OPEC+谈判破裂，沙特宣布全面增产，油价单日跌幅超8%。',effect:'燃油成本大幅下降',stockEffect:{energy:-0.08,tourism:0.04},effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*0.8,30,180);}},
    {title:'油价突破120美元，航空公司叫苦',desc:'地缘冲突叠加供给不足，原油价格持续攀升，航空业利润被大幅侵蚀。',effect:'运营成本上升8%',stockEffect:{energy:0.08,tourism:-0.04},effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*1.15,30,180);}},
    {title:'多国央行同步降息，经济刺激方案出台',desc:'全球进入宽松周期，消费和出行意愿回升，旅游行业率先受益。',effect:'整体需求回暖10%',stockEffect:{finance:0.05,tourism:0.04,tech:0.02},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'全球降息刺激',scopeAll(),1.1);}},
    {title:'某大型航空公司破产重组',desc:'欧洲知名航司因长期亏损申请破产保护，释放大量时刻资源。',effect:'竞争减弱，市场份额机会',stockEffect:{finance:-0.03,tourism:0.02},effectFn:({state:G})=>{const ai=G.ai[0];ai.routes=ai.routes.slice(0,Math.ceil(ai.routes.length/2));}},
  ],
  tech: [
    {title:'新一代超音速客机试飞成功',desc:'某航空初创公司宣布其Mach 1.5超音速客机完成首飞，有望2028年投入商业运营。',effect:'品牌形象提升',stockEffect:{tech:0.06,finance:0.02},effectFn:({state:G,clamp})=>{G.brand=clamp(G.brand+0.05,1,10);}},
    {title:'可持续航空燃料获重大突破',desc:'生物燃料成本降低40%，多家航司宣布加大SAF采购比例。',effect:'燃油成本下降5%',stockEffect:{tech:0.05,energy:-0.03,tourism:0.02},effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*0.95,30,180);}},
    {title:'自动驾驶客机完成无人试飞',desc:'技术里程碑！首架全自动飞行客机完成城际试飞，但监管审批仍需数年。',effect:'长期：人员成本有望降低',stockEffect:{tech:0.05},effectFn:()=>{}},
  ],
  sports: [
    {title:'奥运会举办城市迎来客流高峰',desc:'距奥运会开幕3个月，举办城市机票预订量同比增长180%。',effect:'相关航线需求暴增30%',stockEffect:{culture:0.05,tourism:0.06},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'奥运会客流高峰',scopeAll(),1.3);}},
    {title:'F1新赛季开赛，巡回赛带动出行',desc:'全球20站赛事横跨五大洲，车迷跨国观赛需求旺盛。',effect:'洲际航线需求小幅上升',stockEffect:{culture:0.03,tourism:0.03,energy:0.01},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'F1巡回赛',scopeCrossRegion(),1.08);}},
  ],
  health: [
    {title:'新型流感变种引发区域性恐慌',desc:'WHO发布预警，某地区出现高传染性流感变种，多国加强入境检疫。',effect:'相关区域出行下降20%',stockEffect:{tourism:-0.08,culture:-0.04,finance:-0.02},effectFn:({state:G,addDemandModifier,selectRouteKeys,random})=>{addDemandModifier(G,'新型流感变种',randomRouteScope(G,()=> (random?.() ?? 0.5)<0.3,selectRouteKeys),0.8);}},
    {title:'全球疫苗接种率创新高，出行信心恢复',desc:'主要经济体疫苗接种率突破85%，各国逐步撤销旅行限制。',effect:'整体需求回升15%',stockEffect:{tourism:0.06,culture:0.03,finance:0.02},effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'全球出行信心恢复',scopeAll(),1.15);}},
    {title:'某国爆发不明肺炎，航空管制升级',desc:'数个国际机场启动体温筛查，来自疫区航班需额外审批。',effect:'国际航线受阻',stockEffect:{tourism:-0.06,culture:-0.03,finance:-0.01},effectFn:({state:G,addSuspensionModifier})=>{addSuspensionModifier(G,'国际航线航空管制',scopeCrossRegion(),1);}},
  ]
};
