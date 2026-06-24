const CHINA_CITY_IDS = ['beijing', 'shanghai', 'hongkong', 'chengdu', 'wuhan', 'urumqi', 'lhasa', 'harbin', 'xian', 'taipei'];
const US_CITY_IDS = ['newyork', 'losangeles', 'chicago', 'miami', 'washington', 'dallas', 'denver', 'atlanta', 'houston', 'seattle'];
const SEA_CITY_IDS = ['singapore', 'bangkok', 'manila', 'jakarta', 'brunei'];
const ISLAND_CITY_IDS = ['male', 'guam', 'saipan', 'okinawa', 'singapore', 'wellington'];
const JAPAN_CITY_IDS = ['tokyo', 'sapporo', 'fukuoka', 'okinawa'];
const SOUTH_ASIA_CITY_IDS = ['delhi', 'mumbai', 'kolkata'];

const scopeAll = () => ({ kind: 'all' });
const scopeRegion = (...regions) => ({ kind: 'region', regions });
const scopeCityIds = (cityIds) => ({ kind: 'cityIds', cityIds });
const scopeConnects = (setA, setB) => ({ kind: 'connectsCitySets', setA, setB });
const scopeCrossRegion = () => ({ kind: 'crossRegion' });
const scopeRouteKeys = (routeKeys) => ({ kind: 'routeKeys', routeKeys });

function routeCities(route, getCity) {
  return [getCity(route.from), getCity(route.to)].filter(Boolean);
}

function routeTouchesAnyRegion(route, regions, getCity) {
  return routeCities(route, getCity).some((city) => regions.includes(city.region));
}

function routeTouchesRegion(route, region, getCity) {
  return routeTouchesAnyRegion(route, [region], getCity);
}

function randomRouteScope(state, predicate, selectRouteKeys) {
  return scopeRouteKeys(selectRouteKeys(state.routes, predicate));
}

export const NEWS_POOL = {
  politics: [
    {title:'中东局势紧张，多国发布旅行警告',desc:'区域冲突升级，多国政府建议公民避免前往中东部分地区。航空公司纷纷调整航线。',effect:'中东航线需求下降15%',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'中东局势紧张',scopeRegion('mideast'),0.85);}},
    {title:'欧盟通过新的航空碳排放法规',desc:'欧盟议会以微弱多数通过扩大碳排放交易体系，航空公司额外成本上升。',effect:'欧洲航线运营成本增加3%',effectFn:({state:G,addCostModifier})=>{addCostModifier(G,'欧盟航空碳排放法规',scopeRegion('europe'),1.03);}},
    {title:'中美签署新航空协议，增加航班配额',desc:'两国达成新的双边航空服务协定，每周航班限额大幅提升，市场迎来利好。',effect:'中美航线需求上升20%',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'中美新航空协议',scopeConnects(CHINA_CITY_IDS,US_CITY_IDS),1.2);}},
    {title:'某国爆发大规模抗议活动',desc:'东南亚某国政局动荡，街头抗议持续数周，外国游客锐减。',effect:'东南亚航线客座率下降10%',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'东南亚抗议活动',scopeCityIds(SEA_CITY_IDS),0.9);}},
    {title:'联合国气候峰会推动绿色航空',desc:'各国承诺加速可持续航空燃料研发，传统航油税可能上调。',effect:'燃油附加费预期上升',effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*1.05,30,180);}},
  ],
  entertainment: [
    {title:'世界杯举办城市酒店预订暴增',desc:'距世界杯开幕仅6个月，举办城市酒店预订率已达92%，航空公司加开包机。',effect:'相关航线需求激增25%',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'世界杯客流高峰',scopeAll(),1.25);}},
    {title:'全球顶级歌手宣布世界巡回演唱会',desc:'数十场跨洲演唱会带动粉丝跨国追星，商务舱和头等舱预订上升。',effect:'高端出行需求上升10%',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'世界巡回演唱会',scopeAll(),1.1);}},
    {title:'好莱坞大制作取景带动旅游热潮',desc:'某热带海岛因电影取景走红，社交媒体上旅行打卡帖激增。',effect:'海岛航线需求上升15%',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'海岛旅游热潮',scopeCityIds(ISLAND_CITY_IDS),1.15);}},
    {title:'国际电子竞技总决赛吸引全球观众',desc:'赛事在亚洲举行，数万粉丝跨国观赛，周边酒店一房难求。',effect:'亚洲航线短期需求上升',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'电竞总决赛',scopeRegion('asia'),1.1);}},
  ],
  disaster: [
    {title:'太平洋超强台风季，多机场临时关闭',desc:'连续3个超强台风席卷西太平洋，多个机场被迫关闭超过48小时。',effect:'亚太航线中断2回合',effectFn:({state:G,getCity,addSuspensionModifier,selectRouteKeys})=>{addSuspensionModifier(G,'太平洋超强台风季',randomRouteScope(G,(r)=>routeTouchesAnyRegion(r,['asia','oceania'],getCity)&&Math.random()<0.25,selectRouteKeys),2);}},
    {title:'冰岛火山喷发，欧洲空域大范围关闭',desc:'火山灰云扩散至北欧上空，类似2010年情景，数百航班取消。',effect:'欧洲航线受阻，成本上升',effectFn:({state:G,addCostModifier,addSuspensionModifier})=>{addSuspensionModifier(G,'冰岛火山喷发',scopeRegion('europe'),1);addCostModifier(G,'冰岛火山喷发',scopeRegion('europe'),1.1);}},
    {title:'日本发生强烈地震，新干线及航班停运',desc:'7.2级地震袭击日本中部，机场跑道受损，预计修复需数日。',effect:'日本航线暂时停飞',effectFn:({state:G,addSuspensionModifier})=>{addSuspensionModifier(G,'日本强烈地震',scopeCityIds(JAPAN_CITY_IDS),1);}},
    {title:'北美暴风雪致数千航班取消',desc:'罕见暴风雪席卷美国东海岸，三大枢纽机场全部关闭超过24小时。',effect:'北美航线中断1回合',effectFn:({state:G,getCity,addSuspensionModifier,selectRouteKeys})=>{addSuspensionModifier(G,'北美暴风雪',randomRouteScope(G,(r)=>routeTouchesRegion(r,'namerica',getCity)&&Math.random()<0.3,selectRouteKeys),1);}},
    {title:'南亚特大洪灾，机场跑道被淹',desc:'季风暴雨引发百年一遇洪灾，多个机场积水严重，航班全面停摆。',effect:'南亚航线暂停',effectFn:({state:G,addSuspensionModifier})=>{addSuspensionModifier(G,'南亚特大洪灾',scopeCityIds(SOUTH_ASIA_CITY_IDS),1);}},
  ],
  economy: [
    {title:'全球股市暴跌，经济衰退预警',desc:'主要经济体PMI数据集体下滑，投资者恐慌抛售，消费信心指数创新低。',effect:'商务出行需求下降15%',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'全球经济衰退预警',scopeAll(),0.85);}},
    {title:'国际油价暴跌至三年新低',desc:'OPEC+谈判破裂，沙特宣布全面增产，油价单日跌幅超8%。',effect:'燃油成本大幅下降',effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*0.8,30,180);}},
    {title:'油价突破120美元，航空公司叫苦',desc:'地缘冲突叠加供给不足，原油价格持续攀升，航空业利润被大幅侵蚀。',effect:'运营成本上升8%',effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*1.15,30,180);}},
    {title:'多国央行同步降息，经济刺激方案出台',desc:'全球进入宽松周期，消费和出行意愿回升，旅游行业率先受益。',effect:'整体需求回暖10%',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'全球降息刺激',scopeAll(),1.1);}},
    {title:'某大型航空公司破产重组',desc:'欧洲知名航司因长期亏损申请破产保护，释放大量时刻资源。',effect:'竞争减弱，市场份额机会',effectFn:({state:G})=>{const ai=G.ai[0];ai.routes=ai.routes.slice(0,Math.ceil(ai.routes.length/2));}},
  ],
  tech: [
    {title:'新一代超音速客机试飞成功',desc:'某航空初创公司宣布其Mach 1.5超音速客机完成首飞，有望2028年投入商业运营。',effect:'品牌形象提升',effectFn:({state:G,clamp})=>{G.brand=clamp(G.brand+0.05,1,10);}},
    {title:'可持续航空燃料获重大突破',desc:'生物燃料成本降低40%，多家航司宣布加大SAF采购比例。',effect:'燃油成本下降5%',effectFn:({state:G,clamp})=>{G.oilPrice=clamp(G.oilPrice*0.95,30,180);}},
    {title:'自动驾驶客机完成无人试飞',desc:'技术里程碑！首架全自动飞行客机完成城际试飞，但监管审批仍需数年。',effect:'长期：人员成本有望降低',effectFn:()=>{}},
  ],
  sports: [
    {title:'奥运会举办城市迎来客流高峰',desc:'距奥运会开幕3个月，举办城市机票预订量同比增长180%。',effect:'相关航线需求暴增30%',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'奥运会客流高峰',scopeAll(),1.3);}},
    {title:'F1新赛季开赛，巡回赛带动出行',desc:'全球20站赛事横跨五大洲，车迷跨国观赛需求旺盛。',effect:'洲际航线需求小幅上升',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'F1巡回赛',scopeCrossRegion(),1.08);}},
  ],
  health: [
    {title:'新型流感变种引发区域性恐慌',desc:'WHO发布预警，某地区出现高传染性流感变种，多国加强入境检疫。',effect:'相关区域出行下降20%',effectFn:({state:G,addDemandModifier,selectRouteKeys})=>{addDemandModifier(G,'新型流感变种',randomRouteScope(G,()=>Math.random()<0.3,selectRouteKeys),0.8);}},
    {title:'全球疫苗接种率创新高，出行信心恢复',desc:'主要经济体疫苗接种率突破85%，各国逐步撤销旅行限制。',effect:'整体需求回升15%',effectFn:({state:G,addDemandModifier})=>{addDemandModifier(G,'全球出行信心恢复',scopeAll(),1.15);}},
    {title:'某国爆发不明肺炎，航空管制升级',desc:'数个国际机场启动体温筛查，来自疫区航班需额外审批。',effect:'国际航线受阻',effectFn:({state:G,addSuspensionModifier})=>{addSuspensionModifier(G,'国际航线航空管制',scopeCrossRegion(),1);}},
  ]
};
