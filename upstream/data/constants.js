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

// ===== PLANES DATA =====
const PLANES = [
  // === BOEING 波音 ===
  {id:'b707-120',name:'B707-120',type:'wide',seats:140,range:6700,fuel:7.2,maint:0.30,buyPrice:52,leasePrice:0.45,age:0,serviceStart:1958,serviceEnd:1982},
  {id:'b707-320',name:'B707-320',type:'wide',seats:160,range:8900,fuel:6.0,maint:0.30,buyPrice:55,leasePrice:0.48,age:0,serviceStart:1960,serviceEnd:1981},
  {id:'b727-100',name:'B727-100',type:'narrow',seats:110,range:3700,fuel:1.9,maint:0.12,buyPrice:26,leasePrice:0.22,age:0,serviceStart:1964,serviceEnd:1970},
  {id:'b727-200',name:'B727-200',type:'narrow',seats:150,range:4200,fuel:1.9,maint:0.13,buyPrice:33,leasePrice:0.28,age:0,serviceStart:1967,serviceEnd:1983},
  {id:'b737-200',name:'B737-200',type:'narrow',seats:110,range:2400,fuel:2.0,maint:0.11,buyPrice:30,leasePrice:0.25,age:0,serviceStart:1968,serviceEnd:1987},
  {id:'b747-200',name:'B747-200',type:'superjumbo',seats:450,range:10800,fuel:6.0,maint:0.50,buyPrice:116,leasePrice:1.0,age:0,serviceStart:1970,serviceEnd:1994},
  {id:'b747-300',name:'B747-300',type:'superjumbo',seats:500,range:10800,fuel:5.8,maint:0.48,buyPrice:138,leasePrice:1.2,age:0,serviceStart:1983,serviceEnd:2005},
  {id:'b757',name:'B757',type:'wide',seats:200,range:4700,fuel:3.4,maint:0.18,buyPrice:36,leasePrice:0.31,age:0,serviceStart:1985,serviceEnd:2003},
  {id:'b737-300',name:'B737-300',type:'narrow',seats:120,range:2600,fuel:1.8,maint:0.11,buyPrice:34,leasePrice:0.29,age:0,serviceStart:1985,serviceEnd:2004},
  {id:'b767',name:'B767',type:'wide',seats:230,range:6500,fuel:3.4,maint:0.20,buyPrice:39,leasePrice:0.34,age:0,serviceStart:1985,serviceEnd:2008},
  {id:'b747-400',name:'B747-400',type:'superjumbo',seats:550,range:11500,fuel:5.6,maint:0.55,buyPrice:165,leasePrice:1.4,age:0,serviceStart:1989,serviceEnd:2005},
  {id:'b777',name:'B777',type:'wide',seats:360,range:8800,fuel:3.4,maint:0.25,buyPrice:66,leasePrice:0.56,age:0,serviceStart:1996,serviceEnd:2014},
  {id:'b747-500',name:'B747-500',type:'superjumbo',seats:600,range:11200,fuel:5.6,maint:0.58,buyPrice:215,leasePrice:1.8,age:0,serviceStart:2004,serviceEnd:2020},
  {id:'b2000hc',name:'B2000HC',type:'superjumbo',seats:1000,range:12000,fuel:8.0,maint:0.70,buyPrice:440,leasePrice:3.7,age:0,serviceStart:2007,serviceEnd:2020},
  {id:'b2001sst',name:'B2001SST',type:'wide',seats:300,range:6500,fuel:6.0,maint:0.45,buyPrice:248,leasePrice:2.1,age:0,serviceStart:2008,serviceEnd:2017},
  // === DOUGLAS 麦道 ===
  {id:'dc6',name:'DC-6',type:'narrow',seats:80,range:6400,fuel:3.0,maint:0.10,buyPrice:15,leasePrice:0.13,age:0,serviceStart:1947,serviceEnd:1969},
  {id:'dc8-30',name:'DC-8-30',type:'wide',seats:140,range:8200,fuel:7.0,maint:0.30,buyPrice:53,leasePrice:0.46,age:0,serviceStart:1959,serviceEnd:1976},
  {id:'dc8-50',name:'DC-8-50',type:'wide',seats:150,range:9700,fuel:5.8,maint:0.28,buyPrice:54,leasePrice:0.47,age:0,serviceStart:1961,serviceEnd:1978},
  {id:'dc9-30',name:'DC-9-30',type:'narrow',seats:120,range:2400,fuel:1.8,maint:0.10,buyPrice:29,leasePrice:0.25,age:0,serviceStart:1966,serviceEnd:1980},
  {id:'dc8-60',name:'DC-8-60',type:'wide',seats:240,range:9500,fuel:5.8,maint:0.30,buyPrice:56,leasePrice:0.48,age:0,serviceStart:1967,serviceEnd:1981},
  {id:'dc10',name:'DC-10',type:'wide',seats:350,range:8900,fuel:4.8,maint:0.28,buyPrice:83,leasePrice:0.71,age:0,serviceStart:1971,serviceEnd:1987},
  {id:'md80',name:'MD-80',type:'narrow',seats:150,range:5700,fuel:1.6,maint:0.11,buyPrice:33,leasePrice:0.28,age:0,serviceStart:1981,serviceEnd:2001},
  {id:'md11',name:'MD-11',type:'wide',seats:360,range:12400,fuel:4.0,maint:0.25,buyPrice:112,leasePrice:0.95,age:0,serviceStart:1991,serviceEnd:2009},
  {id:'md12',name:'MD-12',type:'wide',seats:400,range:12800,fuel:3.8,maint:0.24,buyPrice:132,leasePrice:1.12,age:0,serviceStart:1995,serviceEnd:2020},
  {id:'md100',name:'MD-100',type:'wide',seats:200,range:7500,fuel:1.4,maint:0.16,buyPrice:40,leasePrice:0.34,age:0,serviceStart:1998,serviceEnd:2014},
  {id:'md1',name:'MD-1',type:'wide',seats:300,range:8000,fuel:6.0,maint:0.40,buyPrice:216,leasePrice:1.83,age:0,serviceStart:2009,serviceEnd:2015},
  // === AIRBUS 空客 ===
  {id:'a300',name:'A300',type:'wide',seats:350,range:5800,fuel:3.4,maint:0.22,buyPrice:60,leasePrice:0.51,age:0,serviceStart:1975,serviceEnd:1994},
  {id:'a320',name:'A320',type:'narrow',seats:180,range:6700,fuel:1.8,maint:0.12,buyPrice:28,leasePrice:0.24,age:0,serviceStart:1982,serviceEnd:2002},
  {id:'a300-600',name:'A300-600',type:'wide',seats:370,range:8800,fuel:3.2,maint:0.22,buyPrice:62,leasePrice:0.53,age:0,serviceStart:1985,serviceEnd:2007},
  {id:'a310',name:'A310',type:'wide',seats:280,range:9600,fuel:3.0,maint:0.19,buyPrice:48,leasePrice:0.41,age:0,serviceStart:1985,serviceEnd:2007},
  {id:'a340',name:'A340',type:'wide',seats:330,range:14200,fuel:3.6,maint:0.24,buyPrice:110,leasePrice:0.93,age:0,serviceStart:1993,serviceEnd:2020},
  {id:'a360',name:'A360',type:'superjumbo',seats:500,range:6000,fuel:4.0,maint:0.35,buyPrice:158,leasePrice:1.34,age:0,serviceStart:2005,serviceEnd:2020},
  {id:'a370',name:'A370',type:'narrow',seats:200,range:7200,fuel:2.2,maint:0.14,buyPrice:31,leasePrice:0.26,age:0,serviceStart:2005,serviceEnd:2020},
  {id:'a700',name:'A700',type:'wide',seats:350,range:6000,fuel:5.2,maint:0.30,buyPrice:140,leasePrice:1.19,age:0,serviceStart:2010,serviceEnd:2020},
  {id:'a720',name:'A720',type:'wide',seats:200,range:4500,fuel:5.2,maint:0.28,buyPrice:113,leasePrice:0.96,age:0,serviceStart:2010,serviceEnd:2020},
  // === ILYUSHIN 伊留申 ===
  {id:'il14',name:'IL-14',type:'narrow',seats:30,range:3000,fuel:0.8,maint:0.08,buyPrice:9,leasePrice:0.08,age:0,serviceStart:1954,serviceEnd:1959},
  {id:'il62',name:'IL-62',type:'wide',seats:150,range:7900,fuel:6.4,maint:0.28,buyPrice:30,leasePrice:0.26,age:0,serviceStart:1965,serviceEnd:1974},
  {id:'il62m',name:'IL-62M',type:'wide',seats:160,range:9000,fuel:6.2,maint:0.27,buyPrice:32,leasePrice:0.27,age:0,serviceStart:1970,serviceEnd:1992},
  {id:'il62mk',name:'IL-62MK',type:'wide',seats:170,range:8800,fuel:6.2,maint:0.27,buyPrice:34,leasePrice:0.29,age:0,serviceStart:1978,serviceEnd:2004},
  {id:'il86',name:'IL-86',type:'wide',seats:360,range:4100,fuel:7.0,maint:0.32,buyPrice:42,leasePrice:0.36,age:0,serviceStart:1981,serviceEnd:2003},
  {id:'il96-300',name:'IL-96-300',type:'wide',seats:300,range:11000,fuel:6.4,maint:0.28,buyPrice:45,leasePrice:0.38,age:0,serviceStart:1988,serviceEnd:2004},
  // === TUPOLEV 图波列夫 ===
  {id:'tv104',name:'Tu-104',type:'narrow',seats:50,range:4000,fuel:7.6,maint:0.10,buyPrice:15,leasePrice:0.13,age:0,serviceStart:1955,serviceEnd:1976},
  {id:'tv124',name:'Tu-124',type:'narrow',seats:40,range:5600,fuel:3.0,maint:0.09,buyPrice:20,leasePrice:0.17,age:0,serviceStart:1962,serviceEnd:1975},
  {id:'tv134',name:'Tu-134',type:'narrow',seats:70,range:3700,fuel:2.8,maint:0.10,buyPrice:22,leasePrice:0.19,age:0,serviceStart:1967,serviceEnd:1990},
  {id:'tv154',name:'Tu-154',type:'narrow',seats:150,range:3900,fuel:4.5,maint:0.14,buyPrice:24,leasePrice:0.20,age:0,serviceStart:1972,serviceEnd:1991},
  {id:'tv144',name:'Tu-144',type:'wide',seats:140,range:4200,fuel:9.9,maint:0.40,buyPrice:90,leasePrice:0.77,age:0,serviceStart:1977,serviceEnd:1978},
  {id:'tv154b',name:'Tu-154B',type:'narrow',seats:160,range:4000,fuel:4.3,maint:0.14,buyPrice:28,leasePrice:0.24,age:0,serviceStart:1977,serviceEnd:2000},
  {id:'tv204',name:'Tu-204',type:'wide',seats:210,range:4600,fuel:3.2,maint:0.18,buyPrice:26,leasePrice:0.22,age:0,serviceStart:1989,serviceEnd:2005},
  // === LOCKHEED 洛克希德 ===
  {id:'l1049',name:'L-1049',type:'narrow',seats:90,range:7600,fuel:1.8,maint:0.12,buyPrice:24,leasePrice:0.20,age:0,serviceStart:1951,serviceEnd:1975},
  {id:'l1011',name:'L-1011',type:'wide',seats:350,range:7200,fuel:4.8,maint:0.26,buyPrice:88,leasePrice:0.75,age:0,serviceStart:1972,serviceEnd:1983},
];

const AI_PROFILES = [
  {name:'稳健航空',color:'#f87171',cssClass:'ai0',prefType:'wide',prefLevel:3,riskAverse:0.8,priceMul:1.15},
  {name:'闪电航空',color:'#fbbf24',cssClass:'ai1',prefType:'narrow',prefLevel:1,riskAverse:0.3,priceMul:0.75},
  {name:'远航航空',color:'#a78bfa',cssClass:'ai2',prefType:'wide',prefLevel:2,riskAverse:0.6,priceMul:1.05},
];

// ===== NEWSPAPER EVENT POOL (重做：固定顺序，非灾害无buff，灾害可影响航线收入) =====
const NEWS_POOL = {
  politics: [
    {title:'多国领导人峰会在海牙闭幕',desc:'峰会发布联合声明，强调加强国际合作与多边贸易机制。分析人士认为这为全球出行市场注入稳定信号。',stockEffect:{finance:+0.03,tourism:+0.04}},
    {title:'联合国大会通过新决议',desc:'安理会就区域安全问题达成一致，国际社会对此表示谨慎乐观。签证政策有望放宽。',stockEffect:{finance:+0.03,tourism:+0.05}},
    {title:'某区域选举结果引发执政更迭',desc:'新政府承诺推动经济改革与开放政策，外交关系有望缓和。市场预期趋稳。',stockEffect:{finance:+0.04,tourism:+0.03}},
    {title:'国际法庭对领土争端做出裁决',desc:'长期悬而未决的边界问题取得法律进展，相关区域局势趋于平稳。',stockEffect:{finance:+0.02}},
    {title:'多国签署跨境基础设施协议',desc:'新协定将促进交通枢纽建设与人员往来便利化，航空出行有望受益。',stockEffect:{tourism:+0.05,finance:+0.02}},
    {title:'亚太经合组织峰会达成贸易共识',desc:'成员国在关税减免和签证便利方面取得突破，区域商务出行有望升温。',stockEffect:{tourism:+0.06,finance:+0.03}},
    {title:'欧盟通过航空业补贴改革方案',desc:'新规统一成员国航空补贴标准，旨在营造公平竞争环境。中小航司获得更多发展空间。',stockEffect:{finance:+0.04,tourism:+0.02}},
    {title:'非盟首脑会议聚焦互联互通',desc:'非洲领导人一致同意加快跨境航空自由化进程，推动"单一非洲航空运输市场"建设。',stockEffect:{tourism:+0.04,finance:+0.02}},
    {title:'G7峰会宣布气候与交通联合倡议',desc:'主要经济体承诺推动可持续航空燃料研发，承诺为绿色航空技术提供资金支持。',stockEffect:{finance:+0.03,tech:+0.04}},
    {title:'中东和平进程取得阶段性成果',desc:'相关方签署停火协议，国际航班开始恢复飞往此前受限空域的航线。',stockEffect:{tourism:+0.05,finance:+0.03}},
    {title:'拉美区域一体化组织扩员',desc:'新增三个成员国加入南方共同市场，区域内部航空市场进一步开放。',stockEffect:{tourism:+0.04,finance:+0.02}},
    {title:'北极航道主权争议获得外交解决',desc:'各方同意设立联合管理机制，北极航线的商业飞行规则逐步明确。',stockEffect:{finance:+0.02,tourism:+0.03}},
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
];
