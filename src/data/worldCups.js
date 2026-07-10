// Tournament chronology follows FIFA Archives. The 2002 Yokohama final uses Tokyo as its playable air gateway.
export const WORLD_CUP_EVENTS = [
  worldCup({ year: 1962, quarter: 2, cityId: 'santiago', name: '智利世界杯', desc: '决赛在圣地亚哥国家体育场举行，巴西成功卫冕世界冠军', boost: 0.2 }),
  worldCup({ year: 1966, quarter: 3, cityId: 'london', name: '英格兰世界杯', desc: '温布利球场迎来决赛，东道主英格兰首次捧起冠军奖杯', boost: 0.22 }),
  worldCup({ year: 1970, quarter: 2, cityId: 'mexicocity', name: '墨西哥世界杯', desc: '阿兹特克体育场见证巴西第三次夺冠，永久保留雷米特杯', boost: 0.24 }),
  worldCup({ year: 1974, quarter: 3, cityId: 'munich', name: '西德世界杯', desc: '决赛在慕尼黑奥林匹克体育场举行，东道主西德逆转夺冠', boost: 0.21 }),
  worldCup({ year: 1978, quarter: 2, cityId: 'buenosaires', name: '阿根廷世界杯', desc: '布宜诺斯艾利斯纪念碑球场迎来决赛，阿根廷首次夺得世界杯', boost: 0.22 }),
  worldCup({ year: 1982, quarter: 3, cityId: 'madrid', name: '西班牙世界杯', desc: '马德里伯纳乌球场举行决赛，意大利第三次成为世界冠军', boost: 0.21 }),
  worldCup({ year: 1986, quarter: 2, cityId: 'mexicocity', name: '墨西哥世界杯', desc: '阿兹特克体育场再度承办决赛，马拉多纳率领阿根廷夺冠', boost: 0.24 }),
  worldCup({ year: 1990, quarter: 3, cityId: 'rome', name: '意大利世界杯', desc: '罗马奥林匹克体育场迎来决赛，西德队第三次捧起冠军奖杯', boost: 0.21 }),
  worldCup({ year: 1994, quarter: 3, cityId: 'losangeles', name: '美国世界杯', desc: '洛杉矶都会区帕萨迪纳玫瑰碗举行决赛，冠军首次由点球大战决出', boost: 0.25 }),
  worldCup({ year: 1998, quarter: 3, cityId: 'paris', name: '法国世界杯', desc: '巴黎都会区法兰西体育场举行决赛，东道主法国首次夺冠', boost: 0.25 }),
  worldCup({ year: 2002, quarter: 2, cityId: 'tokyo', name: '韩日世界杯', desc: '首次由两国联合举办且首次登陆亚洲，决赛在横滨举行，东京湾机场群承接大量国际客流', boost: 0.18 }),
  worldCup({ year: 2006, quarter: 3, cityId: 'berlin', name: '德国世界杯', desc: '柏林奥林匹克体育场举行决赛，意大利在点球大战后第四次夺冠', boost: 0.18 }),
  worldCup({ year: 2010, quarter: 3, cityId: 'johannesburg', name: '南非世界杯', desc: '世界杯首次登陆非洲，约翰内斯堡足球城见证西班牙首次夺冠', boost: 0.2 }),
  worldCup({ year: 2014, quarter: 3, cityId: 'rio', name: '巴西世界杯', desc: '里约热内卢马拉卡纳球场举行决赛，德国在加时赛中夺冠', boost: 0.22 }),
  worldCup({ year: 2018, quarter: 3, cityId: 'moscow', name: '俄罗斯世界杯', desc: '莫斯科卢日尼基体育场举行决赛，法国第二次成为世界冠军', boost: 0.15 }),
];

function worldCup({ year, quarter, cityId, name, desc, boost }) {
  return {
    id: `wc_${year}`,
    type: 'world_cup',
    year,
    quarter,
    cityId,
    name,
    fullName: `${year}年国际足联世界杯`,
    desc,
    maxBoost: boost,
    stockEffect: { tourism: 0.1, culture: 0.08, finance: 0.02 },
  };
}
