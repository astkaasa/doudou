// ===== data/cities.js — 城市数据库 =====

const _MAP_SRC='assets/world-map.png'
// ===== RENDER OFFSET =====
// The map PNG landmasses are shifted ~1° west relative to true equirectangular coordinates.
// This constant offsets city rendering positions eastward to align with the map image.
// Distance calculations (cityDist) use original c.x/c.y and are NOT affected.
const _MAP_OFFSET_X = 1/360; // +1° visual offset to align cities with map PNG

// ===== CITIES DATA =====
// pop: population in millions (M)
const CITIES = [
  // ===== 亚洲-东亚 ===== Equirectangular: x=(lon+180)/360, y=(90-lat)/180
  {id:'beijing',name:'北京',x:0.8233,y:0.2783,pop:21.5,level:3,region:'asia',subRegion:'east_asia'},
  {id:'shanghai',name:'上海',x:0.8375,y:0.3267,pop:24.2,level:3,region:'asia',subRegion:'east_asia'},
  {id:'tokyo',name:'东京',x:0.8881,y:0.3017,pop:13.9,level:3,region:'asia',subRegion:'east_asia'},
  {id:'seoul',name:'首尔',x:0.8528,y:0.2911,pop:9.7,level:2,region:'asia',subRegion:'east_asia'},
  {id:'hongkong',name:'香港',x:0.8172,y:0.3761,pop:7.5,level:2,region:'asia',subRegion:'east_asia',_dx:-0.5},
  {id:'urumqi',name:'乌鲁木齐',x:0.7433,y:0.2567,pop:3.5,level:1,region:'asia',subRegion:'east_asia'},
  {id:'lhasa',name:'拉萨',x:0.7531,y:0.3356,pop:0.5,level:1,region:'asia',subRegion:'east_asia'},
  {id:'chengdu',name:'成都',x:0.7892,y:0.3300,pop:16.3,level:2,region:'asia',subRegion:'east_asia'},
  {id:'wuhan',name:'武汉',x:0.8175,y:0.3300,pop:11.2,level:2,region:'asia',subRegion:'east_asia'},
  {id:'harbin',name:'哈尔滨',x:0.8514,y:0.2456,pop:10,level:1,region:'asia',subRegion:'east_asia'},
  {id:'xian',name:'西安',x:0.8025,y:0.3094,pop:12.9,level:2,region:'asia',subRegion:'east_asia'},
  {id:'taipei',name:'台北',x:0.8375,y:0.3611,pop:2.7,level:2,region:'asia',subRegion:'east_asia'},
  {id:'fukuoka',name:'福冈',x:0.8622,y:0.3133,pop:2.6,level:1,region:'asia',subRegion:'east_asia'},
  {id:'sapporo',name:'札幌',x:0.8925,y:0.2606,pop:2.6,level:1,region:'asia',subRegion:'east_asia'},
  {id:'okinawa',name:'冲绳',x:0.8547,y:0.3539,pop:1.4,level:1,region:'asia',subRegion:'east_asia',_dx:2.8},
  {id:'ulanbator',name:'乌兰巴托',x:0.7969,y:0.2339,pop:1.4,level:1,region:'asia',subRegion:'east_asia'},
  {id:'osaka',name:'大阪',x:0.8764,y:0.3073,pop:2.7,level:2,region:'asia',subRegion:'east_asia'},
  // ===== 亚洲-东南亚 =====
  {id:'singapore',name:'新加坡',x:0.7883,y:0.4928,pop:5.7,level:3,region:'asia',subRegion:'southeast_asia'},
  {id:'bangkok',name:'曼谷',x:0.7792,y:0.4233,pop:10.5,level:2,region:'asia',subRegion:'southeast_asia'},
  {id:'manila',name:'马尼拉',x:0.8361,y:0.4189,pop:13.8,level:2,region:'asia',subRegion:'southeast_asia'},
  {id:'jakarta',name:'雅加达',x:0.7967,y:0.5344,pop:10.7,level:2,region:'asia',subRegion:'southeast_asia'},
  {id:'brunei',name:'文莱',x:0.8194,y:0.4728,pop:0.1,level:1,region:'asia',subRegion:'southeast_asia'},
  {id:'guam',name:'关岛',x:0.9022,y:0.4256,pop:0.17,level:1,region:'asia',subRegion:'southeast_asia'},
  {id:'saipan',name:'塞班',x:0.9047,y:0.4156,pop:0.05,level:1,region:'asia',subRegion:'southeast_asia'},
  {id:'male',name:'马累',x:0.7042,y:0.4767,pop:0.2,level:1,region:'asia',subRegion:'south_asia'},
  {id:'hanoi',name:'河内',x:0.7939,y:0.3833,pop:8.1,level:2,region:'asia',subRegion:'southeast_asia'},
  // ===== 亚洲-南亚 =====
  {id:'delhi',name:'德里',x:0.7144,y:0.3411,pop:19,level:2,region:'asia',subRegion:'south_asia'},
  {id:'mumbai',name:'孟买',x:0.7025,y:0.3939,pop:20.6,level:2,region:'asia',subRegion:'south_asia'},
  {id:'kolkata',name:'加尔各答',x:0.7456,y:0.3744,pop:14.9,level:2,region:'asia',subRegion:'south_asia'},
  {id:'karachi',name:'卡拉奇',x:0.6861,y:0.3617,pop:16,level:3,region:'asia',subRegion:'south_asia'},
  // ===== 亚洲-中东 =====
  {id:'dubai',name:'迪拜',x:0.6536,y:0.3600,pop:3.4,level:2,region:'asia',subRegion:'mideast'},
  {id:'baghdad',name:'巴格达',x:0.6233,y:0.3150,pop:7.2,level:2,region:'asia',subRegion:'mideast'},
  {id:'tehran',name:'德黑兰',x:0.6428,y:0.3017,pop:8.7,level:2,region:'asia',subRegion:'mideast'},
  {id:'islamabad',name:'伊斯兰堡',x:0.7028,y:0.3128,pop:1.1,level:2,region:'asia',subRegion:'mideast'},
  {id:'mecca',name:'麦加',x:0.6106,y:0.3811,pop:2,level:1,region:'asia',subRegion:'mideast'},
  {id:'riyadh',name:'利雅得',x:0.6297,y:0.3628,pop:7.6,level:2,region:'asia',subRegion:'mideast'},
  {id:'tashkent',name:'塔什干',x:0.6925,y:0.2706,pop:2.6,level:1,region:'asia',subRegion:'mideast'},
  // ===== 欧洲 =====
  {id:'london',name:'伦敦',x:0.4997,y:0.2139,pop:9,level:3,region:'europe',subRegion:'europe'},
  {id:'paris',name:'巴黎',x:0.5064,y:0.2283,pop:2.2,level:3,region:'europe',subRegion:'europe'},
  {id:'istanbul',name:'伊斯坦布尔',x:0.5806,y:0.2722,pop:15.5,level:2,region:'europe',subRegion:'europe'},
  {id:'moscow',name:'莫斯科',x:0.6044,y:0.1900,pop:12.5,level:3,region:'europe',subRegion:'europe'},
  {id:'berlin',name:'柏林',x:0.5372,y:0.2083,pop:3.6,level:2,region:'europe',subRegion:'europe'},
  {id:'copenhagen',name:'哥本哈根',x:0.5350,y:0.1906,pop:1.4,level:2,region:'europe',subRegion:'europe'},
  {id:'stockholm',name:'斯德哥尔摩',x:0.5503,y:0.1706,pop:1.6,level:2,region:'europe',subRegion:'europe',_dx:-0.3},
  {id:'oslo',name:'奥斯陆',x:0.5297,y:0.1672,pop:1.1,level:1,region:'europe',subRegion:'europe'},
  {id:'rome',name:'罗马',x:0.5347,y:0.2672,pop:4.3,level:2,region:'europe',subRegion:'europe'},
  {id:'madrid',name:'马德里',x:0.4897,y:0.2756,pop:6.5,level:2,region:'europe',subRegion:'europe'},
  {id:'lisbon',name:'里斯本',x:0.4747,y:0.2850,pop:2.9,level:1,region:'europe',subRegion:'europe'},
  {id:'athens',name:'雅典',x:0.5658,y:0.2894,pop:3.2,level:2,region:'europe',subRegion:'europe',_dx:-0.5},
  {id:'warsaw',name:'华沙',x:0.5583,y:0.2100,pop:1.8,level:2,region:'europe',subRegion:'europe'},
  {id:'minsk',name:'明斯克',x:0.5767,y:0.2006,pop:1.9,level:1,region:'europe',subRegion:'europe'},
  {id:'kyiv',name:'基辅',x:0.5847,y:0.2200,pop:2.9,level:2,region:'europe',subRegion:'europe'},
  {id:'amsterdam',name:'阿姆斯特丹',x:0.5136,y:0.2089,pop:0.82,level:2,region:'europe',subRegion:'europe'},
  {id:'zurich',name:'苏黎世',x:0.5236,y:0.2367,pop:0.4,level:1,region:'europe',subRegion:'europe'},
  {id:'vienna',name:'维也纳',x:0.5456,y:0.2322,pop:1.9,level:2,region:'europe',subRegion:'europe'},
  {id:'rostov',name:'罗斯托夫',x:0.6103,y:0.2378,pop:1.1,level:1,region:'europe',subRegion:'europe'},
  {id:'barcelona',name:'巴塞罗那',x:0.5061,y:0.2700,pop:1.6,level:2,region:'europe',subRegion:'europe'},
  {id:'marseille',name:'马赛',x:0.5150,y:0.2594,pop:0.86,level:1,region:'europe',subRegion:'europe'},
  {id:'munich',name:'慕尼黑',x:0.5322,y:0.2328,pop:1.45,level:2,region:'europe',subRegion:'europe'},
  {id:'stpetersburg',name:'圣彼得堡',x:0.5842,y:0.1671,pop:5.4,level:2,region:'europe',subRegion:'europe'},
  {id:'seville',name:'塞维利亚',x:0.4834,y:0.2923,pop:0.7,level:1,region:'europe',subRegion:'europe'},
  {id:'hannover',name:'汉诺威',x:0.5271,y:0.2091,pop:0.5,level:1,region:'europe',subRegion:'europe'},
  {id:'milan',name:'米兰',x:0.5255,y:0.2474,pop:1.3,level:2,region:'europe',subRegion:'europe'},
  // ===== 非洲-北部 =====
  {id:'algiers',name:'阿尔及尔',x:0.5083,y:0.2956,pop:3.2,level:2,region:'africa',subRegion:'north_africa'},
  {id:'dakar',name:'达喀尔',x:0.4517,y:0.4183,pop:2.8,level:1,region:'africa',subRegion:'north_africa'},
  {id:'abuja',name:'阿布贾',x:0.5208,y:0.4494,pop:3.6,level:1,region:'africa',subRegion:'north_africa'},
  {id:'casablanca',name:'卡萨布兰卡',x:0.4789,y:0.3133,pop:3.5,level:2,region:'africa',subRegion:'north_africa'},
  {id:'tunis',name:'突尼斯',x:0.5283,y:0.2956,pop:0.63,level:1,region:'africa',subRegion:'north_africa'},
  {id:'cairo',name:'开罗',x:0.5867,y:0.3333,pop:21,level:3,region:'africa',subRegion:'north_africa'},
  // ===== 非洲-中部 =====
  {id:'nairobi',name:'内罗毕',x:0.6022,y:0.5072,pop:4.7,level:2,region:'africa',subRegion:'central_africa'},
  {id:'addisababa',name:'亚的斯亚贝巴',x:0.6075,y:0.4500,pop:4.8,level:2,region:'africa',subRegion:'central_africa'},
  {id:'daressalaam',name:'达累斯萨拉姆',x:0.6092,y:0.5378,pop:4.4,level:1,region:'africa',subRegion:'central_africa'},
  {id:'kinshasa',name:'金沙萨',x:0.5425,y:0.5239,pop:17,level:2,region:'africa',subRegion:'central_africa'},
  {id:'lagos',name:'拉各斯',x:0.5094,y:0.4639,pop:15,level:3,region:'africa',subRegion:'central_africa'},
  // ===== 非洲-南部 =====
  {id:'johannesburg',name:'约翰内斯堡',x:0.5778,y:0.6456,pop:5.6,level:2,region:'africa',subRegion:'south_africa'},
  {id:'capetown',name:'开普敦',x:0.5512,y:0.6885,pop:4.4,level:2,region:'africa',subRegion:'south_africa'},
  // ===== 北美-东部 =====
  {id:'newyork',name:'纽约',x:0.2944,y:0.2739,pop:8.3,level:3,region:'namerica',subRegion:'east_namerica',_dx:-0.3},
  {id:'chicago',name:'芝加哥',x:0.2567,y:0.2672,pop:2.7,level:2,region:'namerica',subRegion:'east_namerica'},
  {id:'miami',name:'迈阿密',x:0.2772,y:0.3567,pop:0.5,level:2,region:'namerica',subRegion:'east_namerica',_dx:-0.3},
  {id:'washington',name:'华盛顿',x:0.2861,y:0.2839,pop:6.9,level:2,region:'namerica',subRegion:'east_namerica'},
  {id:'ottawa',name:'渥太华',x:0.2897,y:0.2478,pop:1,level:2,region:'namerica',subRegion:'east_namerica'},
  {id:'atlanta',name:'亚特兰大',x:0.2656,y:0.3128,pop:0.6,level:2,region:'namerica',subRegion:'east_namerica'},
  {id:'montreal',name:'蒙特利尔',x:0.2956,y:0.2472,pop:1.7,level:2,region:'namerica',subRegion:'east_namerica'},
  {id:'havana',name:'哈瓦那',x:0.2711,y:0.3717,pop:2.1,level:2,region:'namerica',subRegion:'caribbean'},
  {id:'kingston',name:'金斯顿',x:0.2867,y:0.4000,pop:0.66,level:1,region:'namerica',subRegion:'caribbean',_dx:0.8},
  {id:'santodomingo',name:'圣多明各',x:0.3058,y:0.3972,pop:0.99,level:1,region:'namerica',subRegion:'caribbean'},
  // ===== 北美-中部 =====
  {id:'mexicocity',name:'墨西哥城',x:0.2247,y:0.3922,pop:21.8,level:3,region:'namerica',subRegion:'central_namerica'},
  {id:'dallas',name:'达拉斯',x:0.2311,y:0.3178,pop:1.3,level:2,region:'namerica',subRegion:'central_namerica'},
  {id:'denver',name:'丹佛',x:0.2083,y:0.2794,pop:0.7,level:1,region:'namerica',subRegion:'central_namerica'},
  {id:'houston',name:'休斯敦',x:0.2350,y:0.3344,pop:2.3,level:2,region:'namerica',subRegion:'central_namerica'},
  // ===== 北美-西部 =====
  {id:'losangeles',name:'洛杉矶',x:0.1717,y:0.3106,pop:4,level:3,region:'namerica',subRegion:'west_namerica'},
  {id:'vancouver',name:'温哥华',x:0.1581,y:0.2261,pop:2.6,level:2,region:'namerica',subRegion:'west_namerica'},
  {id:'seattle',name:'西雅图',x:0.1603,y:0.2356,pop:0.75,level:1,region:'namerica',subRegion:'west_namerica'},
  {id:'honolulu',name:'檀香山',x:0.0615,y:0.3816,pop:1,level:2,region:'namerica',subRegion:'west_namerica'},
  {id:'sanfrancisco',name:'旧金山',x:0.1600,y:0.2900,pop:0.87,level:2,region:'namerica',subRegion:'west_namerica'},
  // ===== 南美洲 =====
  {id:'rio',name:'里约热内卢',x:0.3801,y:0.6273,pop:6.7,level:3,region:'samerica',subRegion:'samerica'},
  {id:'saopaulo',name:'圣保罗',x:0.3706,y:0.6306,pop:12.3,level:3,region:'samerica',subRegion:'samerica'},
  {id:'buenosaires',name:'布宜诺斯艾利斯',x:0.3378,y:0.6922,pop:15,level:2,region:'samerica',subRegion:'samerica'},
  {id:'brasilia',name:'巴西利亚',x:0.3669,y:0.5878,pop:3,level:1,region:'samerica',subRegion:'samerica'},
  {id:'lima',name:'利马',x:0.2861,y:0.5667,pop:10,level:2,region:'samerica',subRegion:'samerica'},
  {id:'bogota',name:'波哥大',x:0.2942,y:0.4739,pop:7.4,level:2,region:'samerica',subRegion:'samerica'},
  {id:'santiago',name:'圣地亚哥',x:0.3036,y:0.6856,pop:5.6,level:2,region:'samerica',subRegion:'samerica'},
  {id:'caracas',name:'加拉加斯',x:0.3142,y:0.4417,pop:2.9,level:1,region:'samerica',subRegion:'samerica'},
  {id:'quito',name:'基多',x:0.2819,y:0.5011,pop:1.8,level:1,region:'samerica',subRegion:'samerica'},
  // ===== 大洋洲 =====
  {id:'sydney',name:'悉尼',x:0.9200,y:0.6883,pop:5.3,level:3,region:'oceania',subRegion:'oceania'},
  {id:'perth',name:'珀斯',x:0.8219,y:0.6772,pop:2.1,level:1,region:'oceania',subRegion:'oceania'},
  {id:'melbourne',name:'墨尔本',x:0.9028,y:0.7100,pop:5,level:2,region:'oceania',subRegion:'oceania'},
  {id:'wellington',name:'惠灵顿',x:0.9856,y:0.7294,pop:0.22,level:2,region:'oceania',subRegion:'oceania'},
];
