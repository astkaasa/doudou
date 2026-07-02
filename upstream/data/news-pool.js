// ===== data/news-pool.js — 新闻事件池 =====

// ===== NEWSPAPER EVENT POOL (重做：固定顺序，非灾害无buff，灾害可影响航线收入) =====
const NEWS_POOL = {
  politics: [
    {title:'多国领导人峰会在海牙闭幕',desc:'峰会发布联合声明，强调加强国际合作与多边贸易机制。分析人士认为这为全球出行市场注入稳定信号。',stockEffect:{finance:+0.03,tourism:+0.04}},
    {title:'联合国大会通过新决议',desc:'大会就促进国际航空便利化达成共识，各国签证政策有望进一步放宽。',stockEffect:{finance:+0.03,tourism:+0.05}},
    {title:'某国新政府推动经济改革',desc:'新政府承诺推动经济改革与开放政策，跨国贸易关系有望改善。市场预期趋稳。',stockEffect:{finance:+0.04,tourism:+0.03}},
    {title:'国际航空法庭裁决航线准入纠纷',desc:'长期悬而未决的跨国航线准入问题取得法律进展，相关区域航运趋于平稳。',stockEffect:{finance:+0.02}},
    {title:'多国签署跨境基础设施协议',desc:'新协定将促进交通枢纽建设与人员往来便利化，航空出行有望受益。',stockEffect:{tourism:+0.05,finance:+0.02}},
    {title:'亚太经合组织峰会达成贸易共识',desc:'成员国在关税减免和签证便利方面取得突破，区域商务出行有望升温。',stockEffect:{tourism:+0.06,finance:+0.03}},
    {title:'欧盟通过航空业补贴改革方案',desc:'新规统一成员国航空补贴标准，旨在营造公平竞争环境。中小航司获得更多发展空间。',stockEffect:{finance:+0.04,tourism:+0.02}},
    {title:'非盟首脑会议聚焦互联互通',desc:'非洲领导人一致同意加快跨境航空自由化进程，推动"单一非洲航空运输市场"建设。',stockEffect:{tourism:+0.04,finance:+0.02}},
    {title:'G7峰会宣布气候与交通联合倡议',desc:'主要经济体承诺推动可持续航空燃料研发，承诺为绿色航空技术提供资金支持。',stockEffect:{finance:+0.03,tech:+0.04}},
    {title:'中东航空开放协定正式签署',desc:'相关方达成空域开放协议，国际航班获准飞往更多中东城市。',stockEffect:{tourism:+0.05,finance:+0.03}},
    {title:'拉美区域一体化组织扩员',desc:'新增三个成员国加入南方共同市场，区域内部航空市场进一步开放。',stockEffect:{tourism:+0.04,finance:+0.02}},
    {title:'北极航道通航规则获得多方共识',desc:'各国同意设立联合管理机制，北极航线的商业飞行规则逐步明确。',stockEffect:{finance:+0.02,tourism:+0.03}},
    {title:'东南亚国家联盟签署免签互惠协议',desc:'成员国公民可免签互访，区域旅游市场预计迎来爆发式增长。',stockEffect:{tourism:+0.08,culture:+0.03}},
  ],
  economy: [
    {title:'全球制造业PMI升至六个月高点',desc:'主要经济体制造业数据好于预期，供应链回暖迹象明显。商务出行需求呈上升趋势。',stockEffect:{finance:+0.05,tech:+0.03}},
    {title:'国际货币基金组织下调全球增长预期',desc:'IMF在最新报告中将全球GDP增速预测下调0.3个百分点，警告贸易摩擦风险。',stockEffect:{finance:-0.06,tourism:-0.03}},
    {title:'新兴市场资本流入创季度新高',desc:'国际资金加速流向新兴经济体，当地消费和出行需求稳步增长。',stockEffect:{finance:+0.04,tourism:+0.02}},
    {title:'多国央行维持利率不变',desc:'主要经济体央行在最新议息会议上一致决定按兵不动，市场反应平淡。',stockEffect:{finance:+0.01}},
    {title:'全球贸易量连续第三个月回升',desc:'世贸组织最新数据显示商品贸易量持续恢复，集装箱运价指数上行。',stockEffect:{finance:+0.03,tech:+0.02}},
    {title:'亚洲基础设施投资银行加大航空基建投入',desc:'亚投行宣布向五个成员国提供机场扩建贷款，总金额超过120亿美元。',stockEffect:{finance:+0.03,tourism:+0.02}},
    {title:'全球航空旅客量突破新高',desc:'国际航协数据显示全球航空旅客首次突破50亿人次，亚太地区增速领先。',stockEffect:{finance:+0.04,tourism:+0.03}},
    {title:'美元指数波动引发跨国票价调整',desc:'汇率波动导致多家航司调整跨境航线票价，旅客购票策略受到影响。',stockEffect:{finance:-0.03}},
    {title:'科技行业并购潮推动商务出行升温',desc:'跨国科技公司频繁并购，高管出差和技术团队跨国协作带动商务舱需求上升。',stockEffect:{tech:+0.05,finance:+0.03}},
    {title:'国际航空运输协会上调行业利润预测',desc:'IATA预计全球航司将实现创纪录利润，主要得益于客运量增长和效率提升。',stockEffect:{finance:+0.05,tourism:+0.02}},
    {title:'全球通胀回落提振消费信心',desc:'主要经济体CPI数据持续改善，居民出行意愿增强，休闲旅游市场回暖明显。',stockEffect:{finance:+0.03,tourism:+0.04}},
    {title:'绿色债券市场扩容助力航空脱碳',desc:'多家航司成功发行绿色债券融资购买节能飞机，可持续航空成为投资热点。',stockEffect:{finance:+0.03,tech:+0.04}},
  ],
  culture: [
    {title:'国际电影节在南方海滨城市盛大开幕',desc:'来自八十多个国家和地区的影片参展，明星阵容豪华。影迷和媒体人员跨国出行需求激增。',stockEffect:{culture:+0.08,tourism:+0.04}},
    {title:'世界田径锦标赛即将开赛',desc:'全球顶尖运动员云集，预计数万名体育爱好者将亲临现场观赛，周边酒店预订率攀升。',stockEffect:{culture:+0.06,tourism:+0.03}},
    {title:'知名流行歌手宣布全球巡演',desc:'横跨四大洲五十城的巡回演唱会计划公布，粉丝跨国追星带动商务与休闲出行。',stockEffect:{culture:+0.07,tourism:+0.04}},
    {title:'国际电子竞技锦标赛总决赛定档',desc:'赛事将在线下举办，预计吸引全球数万玩家和观众到场支持，机票需求上升。',stockEffect:{culture:+0.05,tourism:+0.02}},
    {title:'大型国际艺术双年展揭幕',desc:'当代艺术界瞩目盛事，超过三百位艺术家参展，文化旅游出行需求增加。',stockEffect:{culture:+0.08,tourism:+0.03}},
    {title:'世界杯足球赛主办城市酒店预订爆满',desc:'两年后的赛事已开始售票，球迷提前规划行程，主办国航线需求攀升。',stockEffect:{culture:+0.04,tourism:+0.06}},
    {title:'国际美食节吸引百万游客',desc:'世界各地的美食爱好者汇聚一堂，航空公司推出"美食航线"主题航班。',stockEffect:{culture:+0.05,tourism:+0.04}},
    {title:'全球最大科技展会下月开幕',desc:'参展商和观众来自一百多个国家，商务航班预订量创下同期纪录。',stockEffect:{culture:+0.03,tourism:+0.02,tech:+0.03}},
    {title:'国际马拉松赛事联盟新增五站',desc:'新增城市位于五大洲不同时区，跑步爱好者跨国参赛热情高涨。',stockEffect:{culture:+0.04,tourism:+0.03}},
    {title:'诺贝尔奖颁奖典礼即将举行',desc:'全球学术和科学界目光聚焦斯德哥尔摩，相关城市航班需求增加。',stockEffect:{culture:+0.05,tourism:+0.02}},
    {title:'国际图书博览会规模创历史之最',desc:'超过一百个国家参展，出版界人士跨国交流推动商务出行。',stockEffect:{culture:+0.06,tourism:+0.02}},
    {title:'全球音乐节季拉开帷幕',desc:'从格拉斯顿伯里到富士摇滚，多个大型户外音乐节吸引跨国乐迷。',stockEffect:{culture:+0.07,tourism:+0.04}},
  ],
  ads: [
    {title:'新兴航空公司推出超值优惠',desc:'新锐航司发布限时特惠，洲际航线单程低至历史新低。业内人士关注此举对市场格局的影响。',stockEffect:{tourism:+0.03,culture:+0.02}},
    {title:'某豪华度假村推出"飞行+住宿"套餐',desc:'顶级海岛度假品牌联手航空公司打造一价全包体验，商务舱预订量显著提升。',stockEffect:{tourism:+0.04,culture:+0.02}},
    {title:'航空联盟宣布会员积分翻倍活动',desc:'全球最大航空联盟推出季度促销，常旅客积分获取速度加倍。旅客忠诚度提升。',stockEffect:{tourism:+0.02}},
    {title:'最新一代客机内饰广告引发热议',desc:'革命性的机舱设计概念在社交媒体广泛传播，旅客对未来飞行体验充满期待。',stockEffect:{tourism:+0.01,culture:+0.01}},
    {title:'低成本航司推出"随心飞"月卡',desc:'不限次数国内短途飞行月卡售价破底，引发全民讨论。传统航司面临新竞争压力。',stockEffect:{tourism:+0.03}},
    {title:'免税零售集团推出机上购物节',desc:'限时折扣覆盖全球航线免税商品，机上购物营业额同比增长三成。',stockEffect:{tourism:+0.02,culture:+0.01}},
    {title:'空中客车公司发布未来客舱概念视频',desc:'全景天窗和沉浸式娱乐系统亮相，视频播放量突破两千万，品牌关注度飙升。',stockEffect:{tourism:+0.02,culture:+0.02}},
    {title:'信用卡公司与航空公司联名发卡',desc:'年费减免和升舱券等福利令人瞩目，联名卡申请量一周内翻番。',stockEffect:{finance:+0.02,tourism:+0.01}},
    {title:'旅行社交平台推出AI行程规划',desc:'智能推荐最优中转方案和票价提醒，下载量激增，航司直销渠道面临新竞争。',stockEffect:{tourism:+0.02}},
    {title:'某豪华航司推出空中套房服务',desc:'配备独立卧室和淋浴间的超高端旅行体验，中东航线预订量大幅增长。',stockEffect:{tourism:+0.04,culture:+0.01}},
  ],
  disaster: [
    // 东亚 (east_asia) — 台风、暴雪、沙尘暴
    {title:'超强台风席卷东亚沿海',desc:'连续超强台风登陆东亚沿岸，多个国际机场被迫关闭超过48小时，大量航班延误或取消。',region:'asia',subRegion:'east_asia',regionName:'亚洲',subRegionName:'东亚',stockEffect:{tourism:-0.12,culture:-0.04}},
    {title:'东亚暴雪致大面积航班取消',desc:'罕见暴风雪袭击东亚多国，跑道积雪严重，数百航班被迫取消。',region:'asia',subRegion:'east_asia',regionName:'亚洲',subRegionName:'东亚',stockEffect:{tourism:-0.08,culture:-0.03}},
    {title:'沙尘暴笼罩东亚空域',desc:'大规模沙尘暴从内陆席卷而来，能见度骤降，多个机场被迫关闭。',region:'asia',subRegion:'east_asia',regionName:'亚洲',subRegionName:'东亚',stockEffect:{tourism:-0.06,culture:-0.02}},
    // 东南亚 (southeast_asia) — 台风、洪涝、火山
    {title:'超强台风横扫东南亚',desc:'猛烈台风登陆东南亚沿海地区，机场设施受损严重，航班全面停运。',region:'asia',subRegion:'southeast_asia',regionName:'亚洲',subRegionName:'东南亚',stockEffect:{tourism:-0.12,culture:-0.04}},
    {title:'东南亚洪灾致航空运输受阻',desc:'持续暴雨引发大范围洪涝，多个机场跑道被淹，航班大面积取消。',region:'asia',subRegion:'southeast_asia',regionName:'亚洲',subRegionName:'东南亚',stockEffect:{tourism:-0.10,culture:-0.03}},
    {title:'东南亚火山喷发扰乱航运',desc:'火山猛烈喷发，火山灰云扩散至高空，影响飞机起降安全。',region:'asia',subRegion:'southeast_asia',regionName:'亚洲',subRegionName:'东南亚',stockEffect:{tourism:-0.15,culture:-0.06}},
    // 南亚 (south_asia) — 季风、热浪、旋风
    {title:'南亚季风暴雨致航线受阻',desc:'持续季风暴雨袭击南亚次大陆，多个主要机场运营受阻，航班大量取消。',region:'asia',subRegion:'south_asia',regionName:'亚洲',subRegionName:'南亚',stockEffect:{tourism:-0.08,culture:-0.03}},
    {title:'南亚极端热浪冲击航空运营',desc:'罕见高温使空气密度下降，飞机无法满载起飞，多个机场限制航班密度。',region:'asia',subRegion:'south_asia',regionName:'亚洲',subRegionName:'南亚',stockEffect:{tourism:-0.06,energy:+0.05}},
    {title:'孟加拉湾气旋侵袭南亚',desc:'强气旋席卷南亚沿海，狂风暴雨导致机场关闭，航班全面停运。',region:'asia',subRegion:'south_asia',regionName:'亚洲',subRegionName:'南亚',stockEffect:{tourism:-0.10,culture:-0.04}},
    // 中东 (mideast) — 沙尘暴、极端高温、罕见暴雨
    {title:'中东特大沙尘暴瘫痪航空',desc:'巨型沙尘暴覆盖中东大部分地区，能见度降至近零，所有航班停飞。',region:'asia',subRegion:'mideast',regionName:'亚洲',subRegionName:'中东',stockEffect:{tourism:-0.08,culture:-0.03}},
    {title:'中东极端高温危及飞行安全',desc:'气温飙升至50度以上，空气密度不足导致飞机无法安全起降，航班大面积取消。',region:'asia',subRegion:'mideast',regionName:'亚洲',subRegionName:'中东',stockEffect:{tourism:-0.06,energy:+0.05}},
    {title:'中东罕见暴雨引发洪灾',desc:'多年未遇的暴雨袭击中东干旱地区，机场排水系统瘫痪，航班停运。',region:'asia',subRegion:'mideast',regionName:'亚洲',subRegionName:'中东',stockEffect:{tourism:-0.10,culture:-0.03}},
    // 欧洲 (europe) — 火山、暴风雪、风暴
    {title:'冰岛火山喷发，欧洲空域关闭',desc:'火山灰云扩散至北欧上空，危及飞行安全，数百航班被迫取消。',region:'europe',subRegion:'europe',regionName:'欧洲',subRegionName:'欧洲',stockEffect:{tourism:-0.15,culture:-0.06}},
    {title:'欧洲暴风雪致航空瘫痪',desc:'强寒潮席卷欧洲大陆，三大枢纽机场全部关闭，数千旅客滞留。',region:'europe',subRegion:'europe',regionName:'欧洲',subRegionName:'欧洲',stockEffect:{tourism:-0.08,culture:-0.03}},
    {title:'大西洋风暴横扫西欧',desc:'强烈低气压风暴袭击西欧，狂风导致机场跑道无法使用，航班全面停飞。',region:'europe',subRegion:'europe',regionName:'欧洲',subRegionName:'欧洲',stockEffect:{tourism:-0.08,culture:-0.02}},
    // 北非 (north_africa) — 沙尘暴、热浪、洪涝
    {title:'撒哈拉沙尘暴侵袭北非空域',desc:'大规模沙尘暴从撒哈拉沙漠席卷北非，多个机场因能见度过低而关闭。',region:'africa',subRegion:'north_africa',regionName:'非洲',subRegionName:'北非',stockEffect:{tourism:-0.06,culture:-0.02}},
    {title:'北非极端热浪冲击航空',desc:'北非多地气温突破50度，高温导致飞机性能受限，航班大面积减少。',region:'africa',subRegion:'north_africa',regionName:'非洲',subRegionName:'北非',stockEffect:{tourism:-0.06,energy:+0.05}},
    {title:'北非暴雨引发洪涝灾害',desc:'突发暴雨袭击北非干旱地区，机场被淹，航空运输暂时中断。',region:'africa',subRegion:'north_africa',regionName:'非洲',subRegionName:'北非',stockEffect:{tourism:-0.10,culture:-0.03}},
    // 中非 (central_africa) — 暴雨、热带风暴、火山
    {title:'中部非洲暴雨洪灾致航空受阻',desc:'持续强降雨导致中非多国洪涝，机场跑道被淹，航班被迫取消。',region:'africa',subRegion:'central_africa',regionName:'非洲',subRegionName:'中非',stockEffect:{tourism:-0.10,culture:-0.03}},
    {title:'中非热带风暴肆虐',desc:'强烈热带风暴席卷中部非洲，多个机场设施受损，运营受阻。',region:'africa',subRegion:'central_africa',regionName:'非洲',subRegionName:'中非',stockEffect:{tourism:-0.08,culture:-0.02}},
    {title:'中非火山喷发冲击航空运输',desc:'尼拉贡戈火山剧烈喷发，火山灰威胁飞行安全，周边机场紧急关闭。',region:'africa',subRegion:'central_africa',regionName:'非洲',subRegionName:'中非',stockEffect:{tourism:-0.15,culture:-0.06}},
    // 南非 (south_africa) — 暴风雪、干旱热浪、气旋
    {title:'南非罕见暴风雪致交通瘫痪',desc:'南非遭遇异常寒潮暴雪，机场跑道积雪无法起降，航班全部停运。',region:'africa',subRegion:'south_africa',regionName:'非洲',subRegionName:'南非',stockEffect:{tourism:-0.08,culture:-0.03}},
    {title:'南非极端干旱引发山火',desc:'持续干旱引发大规模山火，浓烟弥漫机场周边空域，航班受到影响。',region:'africa',subRegion:'south_africa',regionName:'非洲',subRegionName:'南非',stockEffect:{tourism:-0.05,energy:+0.03}},
    {title:'莫桑比克海峡气旋袭击南非',desc:'强热带气旋从东海岸登陆，狂风暴雨摧毁机场设施，航空运输中断。',region:'africa',subRegion:'south_africa',regionName:'非洲',subRegionName:'南非',stockEffect:{tourism:-0.10,culture:-0.04}},
    // 北美东部 (east_namerica) — 暴风雪、飓风、风暴
    {title:'北美东海岸遭遇超级暴风雪',desc:'超强暴风雪席卷北美东部，三大枢纽机场全部关闭超过24小时。',region:'namerica',subRegion:'east_namerica',regionName:'北美',subRegionName:'北美东部',stockEffect:{tourism:-0.08,culture:-0.03}},
    {title:'飓风袭击北美东海岸',desc:'大型飓风登陆东部沿海，多个机场遭洪水侵袭，航班全面停运。',region:'namerica',subRegion:'east_namerica',regionName:'北美',subRegionName:'北美东部',stockEffect:{tourism:-0.12,culture:-0.04}},
    {title:'东北风暴致北美东部航空瘫痪',desc:'强力东北风暴横扫东海岸，暴风雪和冰雨导致机场关闭。',region:'namerica',subRegion:'east_namerica',regionName:'北美',subRegionName:'北美东部',stockEffect:{tourism:-0.08,culture:-0.02}},
    // 北美中部 (central_namerica) — 龙卷风、暴风雪、冰暴
    {title:'北美中部龙卷风摧毁机场设施',desc:'大规模龙卷风横扫北美中部，多个机场航站楼受损，运营受阻。',region:'namerica',subRegion:'central_namerica',regionName:'北美',subRegionName:'北美中部',stockEffect:{tourism:-0.08,culture:-0.02}},
    {title:'北美中部暴风雪致大范围停飞',desc:'强暴风雪席卷大平原地区，多个枢纽机场被迫关闭，航班大面积取消。',region:'namerica',subRegion:'central_namerica',regionName:'北美',subRegionName:'北美中部',stockEffect:{tourism:-0.08,culture:-0.03}},
    {title:'冰暴袭击北美中部机场',desc:'冻雨形成严重冰灾，飞机机体积冰严重，机场跑道结冰，航班停运。',region:'namerica',subRegion:'central_namerica',regionName:'北美',subRegionName:'北美中部',stockEffect:{tourism:-0.06,culture:-0.02}},
    // 北美西部 (west_namerica) — 地震、山火、暴雨
    {title:'北美西海岸地震致机场关闭',desc:'强震袭击北美西海岸，旧金山和洛杉矶机场紧急关闭检查受损情况。',region:'namerica',subRegion:'west_namerica',regionName:'北美',subRegionName:'北美西部',stockEffect:{tourism:-0.10,culture:-0.04}},
    {title:'加州山火蔓延至机场周边',desc:'大规模山火产生的浓烟严重影响机场能见度，多个航班被迫取消。',region:'namerica',subRegion:'west_namerica',regionName:'北美',subRegionName:'北美西部',stockEffect:{tourism:-0.05,energy:+0.03}},
    {title:'太平洋风暴袭击西海岸',desc:'强烈太平洋风暴登陆，暴雨和狂风迫使多个西海岸机场关闭。',region:'namerica',subRegion:'west_namerica',regionName:'北美',subRegionName:'北美西部',stockEffect:{tourism:-0.08,culture:-0.02}},
    // 加勒比 (caribbean) — 飓风、火山、暴雨
    {title:'加勒比飓风致多机场关闭',desc:'超强飓风横扫加勒比海地区，多个海岛机场遭严重破坏，航班全面停运。',region:'namerica',subRegion:'caribbean',regionName:'北美',subRegionName:'加勒比',stockEffect:{tourism:-0.12,culture:-0.04}},
    {title:'加勒比火山喷发扰乱航空',desc:'加勒比海岛火山剧烈喷发，火山灰云升至高空，周边航班全部取消。',region:'namerica',subRegion:'caribbean',regionName:'北美',subRegionName:'加勒比',stockEffect:{tourism:-0.15,culture:-0.06}},
    {title:'加勒比暴雨引发山体滑坡',desc:'持续暴雨引发山体滑坡，多个机场道路中断，运营受到影响。',region:'namerica',subRegion:'caribbean',regionName:'北美',subRegionName:'加勒比',stockEffect:{tourism:-0.10,culture:-0.03}},
    // 南美 (samerica) — 地震、洪涝、火山
    {title:'南美洲强震破坏基础设施',desc:'7.8级强震袭击南美西海岸，机场和道路受损严重，航班大面积取消。',region:'samerica',subRegion:'samerica',regionName:'南美',subRegionName:'南美',stockEffect:{tourism:-0.10,culture:-0.04}},
    {title:'南美亚马逊流域洪灾',desc:'持续暴雨导致亚马逊流域严重洪涝，多个城市机场被淹，航班停运。',region:'samerica',subRegion:'samerica',regionName:'南美',subRegionName:'南美',stockEffect:{tourism:-0.10,culture:-0.03}},
    {title:'南美火山喷发致空域关闭',desc:'南美安第斯山脉火山猛烈喷发，火山灰云威胁飞行安全，航班停飞。',region:'samerica',subRegion:'samerica',regionName:'南美',subRegionName:'南美',stockEffect:{tourism:-0.15,culture:-0.06}},
    // 大洋洲 (oceania) — 气旋、风暴、火山
    {title:'南太平洋气旋袭击大洋洲',desc:'强烈热带气旋席卷大洋洲，多处机场设施遭破坏，航班全面停运。',region:'oceania',subRegion:'oceania',regionName:'大洋洲',subRegionName:'大洋洲',stockEffect:{tourism:-0.10,culture:-0.04}},
    {title:'大洋洲暴风雨致航空中断',desc:'罕见暴风雨席卷大洋洲多国，机场跑道积水严重，航班大面积取消。',region:'oceania',subRegion:'oceania',regionName:'大洋洲',subRegionName:'大洋洲',stockEffect:{tourism:-0.08,culture:-0.02}},
    {title:'新西兰火山喷发威胁航运',desc:'新西兰北岛火山突然喷发，火山灰危及飞行安全，周边空域紧急关闭。',region:'oceania',subRegion:'oceania',regionName:'大洋洲',subRegionName:'大洋洲',stockEffect:{tourism:-0.15,culture:-0.06}},
  ]
};
