// ===== EVENTS & NEWSPAPER =====
function generateEvents(){
  G.events=[];G.newsItems=[];
  G.prevOilPrice=G.oilPrice;
  const oilChange=rand(-0.06,0.06);
  G.oilPrice=clamp(G.oilPrice*(1+oilChange),20,180);
  if(Math.abs(oilChange)>0.03){
    G.events.push({type:'oil',text:'油价'+(oilChange>0?'上涨':'下跌')+' '+fmtPct(oilChange*100),severity:Math.abs(oilChange)>0.05?'high':'low'});
  }
  // Track used news indices per year for deduplication
  if(!G._newsUsedPerYear)G._newsUsedPerYear={};
  const yearKey=G.year;
  if(!G._newsUsedPerYear[yearKey])G._newsUsedPerYear[yearKey]={};
  const used=G._newsUsedPerYear[yearKey];
  // Helper: pick a non-repeated item from pool for a category
  function pickNews(cat){
    const pool=NEWS_POOL[cat];
    if(!pool||pool.length===0)return null;
    if(!used[cat])used[cat]=[];
    const available=[];
    pool.forEach((item,idx)=>{if(!used[cat].includes(idx))available.push(idx);});
    // If all used, reset
    if(available.length===0){used[cat]=[];pool.forEach((_,idx)=>available.push(idx));}
    const pick=available[randInt(0,available.length-1)];
    used[cat].push(pick);
    return pool[pick];
  }
  // Fixed order: politics, economy, culture (pick 1 each)
  const fixedOrder=['politics','economy','culture'];
  fixedOrder.forEach(cat=>{
    const news=pickNews(cat);
    if(!news)return;
    G.newsItems.push({category:cat,title:news.title,desc:news.desc,effect:news.effect||'',effectFn:news.effectFn||null,stockEffect:news.stockEffect||null});
    try{if(news.effectFn)news.effectFn();}catch(e){}
  });
  // Ads (50% chance)
  if(Math.random()<0.5){
    const news=pickNews('ads');
    if(news)G.newsItems.push({category:'ads',title:news.title,desc:news.desc,effect:'',effectFn:null,stockEffect:news.stockEffect||null});
  }
  // Disaster (30% random chance, but avoid mega event host cities)
  if(Math.random()<0.3){
    // Build mega event protection zones: subRegions of current-peak hosts
    const megaEventZones = [];
    if (G.activeMegaEvents) {
      G.activeMegaEvents.forEach(evt => {
        if (evt.quartersFromEvent === 0) {
          const hostCity = getCity(evt.cityId);
          if (hostCity) {
            megaEventZones.push({
              subRegion: hostCity.subRegion,
              region: hostCity.region,
              name: hostCity.name
            });
          }
        }
      });
    }

    let disasterNews = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = pickNews('disaster');
      if (!candidate) break;
      const isProtected = megaEventZones.some(z =>
        (candidate.subRegion && z.subRegion === candidate.subRegion) ||
        (!candidate.subRegion && z.region === candidate.region)
      );
      if (!isProtected) { disasterNews = candidate; break; }
      // Protected — return index to pool for future use
      const pool = NEWS_POOL['disaster'];
      const idx = pool.indexOf(candidate);
      if (idx !== -1 && used['disaster']) {
        used['disaster'] = used['disaster'].filter(i => i !== idx);
      }
    }

    if (disasterNews) {
      G.disasterRegions = G.disasterRegions || [];
      G.disasterRegions.push({
        region: disasterNews.region,
        subRegion: disasterNews.subRegion || null,
        turns: 1
      });
      const regionLabel = disasterNews.subRegion
        ? disasterNews.subRegionName
        : disasterNews.regionName;
      G.newsItems.push({
        category: 'disaster',
        title: disasterNews.title,
        desc: disasterNews.desc,
        effect: `${regionLabel}航线遭受巨大影响`,
        stockEffect: disasterNews.stockEffect || null
      });
      G.events.push({type: 'disaster', text: disasterNews.title, severity: 'high'});
    }
  }
  // Aviation news: new planes entering service or retiring this year
  const newService=PLANES.filter(p=>p.serviceStart===G.year);
  const retiring=PLANES.filter(p=>p.serviceEnd===G.year);
  if(newService.length>0){
    const names=newService.map(p=>p.name).join('、');
    G.newsItems.push({category:'aviation',title:`新一代客机投入商业运营`,desc:`${names}正式投入商业服务，多家航空公司已下达订单。新一代机型的加入将为旅客带来更舒适的出行体验。`,effect:''});
  } else if(retiring.length>0){
    const names=retiring.map(p=>p.name).join('、');
    G.newsItems.push({category:'aviation',title:`经典机型正式退役`,desc:`${names}结束了数十年的商业飞行生涯，正式退出航线运营。航空界对这一历史性时刻表达了深切的怀念。`,effect:''});
  }
  // ── 盛事系统 ──
  if (!G.activeMegaEvents) G.activeMegaEvents = [];

  // Detect new mega events entering influence window
  MEGA_EVENTS.forEach(evt => {
    // Note: generateEvents() runs BEFORE quarter increment in advanceTurn(),
    // so G.year/G.quarter is the quarter being settled, not the next quarter.
    // Positive quartersFromEvent = event has passed; Negative = event is upcoming.
    const quartersFromEvent = (G.year - evt.year) * 4 + (G.quarter - evt.quarter);
    const inWindow = quartersFromEvent >= -MEGA_EVENT_PRE_ANNOUNCE
                  && quartersFromEvent <= MEGA_EVENT_DECAY_LENGTH;
    if (inWindow && !G.activeMegaEvents.find(a => a.id === evt.id)) {
      G.activeMegaEvents.push({
        id: evt.id,
        type: evt.type,
        cityId: evt.cityId,
        name: evt.name,
        fullName: evt.fullName,
        maxBoost: evt.maxBoost,
        currentBoost: 0,
        stockEffect: evt.stockEffect,
        quartersFromEvent: quartersFromEvent
      });
    }
  });

  // Update current boost for active mega events
  G.activeMegaEvents.forEach(a => {
    const evtDef = MEGA_EVENTS.find(e => e.id === a.id);
    a.quartersFromEvent = (G.year - evtDef.year) * 4 + (G.quarter - evtDef.quarter);
    a.currentBoost = evtDef.maxBoost * megaEventBoostCurve(a.quartersFromEvent);
  });

  // Remove expired mega events
  G.activeMegaEvents = G.activeMegaEvents.filter(a => a.currentBoost > 0);

  // ── 盛事新闻生成 ──
  G.activeMegaEvents.forEach(a => {
    if (a.quartersFromEvent === undefined) return;
    const city = getCity(a.cityId);
    const typeLabel = a.type === 'olympics_summer' ? '夏奥' : '世博';

    let title = '', desc = '', effectText = '';
    const q = a.quartersFromEvent;

    if (q === -4) {
      title = `${city.name}将举办${a.name}！`;
      desc = `国际${typeLabel === '夏奥' ? '奥委会' : '展览局'}正式宣布，${city.name}获得举办权。预计将吸引数百万国际游客。`;
      effectText = `${city.name}航线需求开始升温`;
    } else if (q === -2) {
      title = `${a.name}进入倒计时，${city.name}航空客流攀升`;
      desc = `筹备工作进入冲刺阶段，各国参展方陆续派驻先遣团队，航空预订量持续走高。`;
      effectText = `${city.name}航线需求明显上升`;
    } else if (q === -1) {
      title = `${a.name}即将开幕！`;
      desc = `各国代表团和${typeLabel === '夏奥' ? '运动员' : '参展商'}陆续抵达${city.name}，航空运力面临巨大考验。`;
      effectText = `${city.name}航线需求大幅攀升`;
    } else if (q === 0) {
      title = `${a.fullName}隆重开幕！`;
      desc = `盛大的开幕式震撼全球，${city.name}成为世界焦点。机场客流量创历史新高。`;
      effectText = `${city.name}航线需求达到峰值！`;
    } else if (q === 1) {
      title = `${a.name}圆满落幕`;
      desc = `盛会画上句号，但会后旅游热度不减。${city.name}航空客流仍维持高位。`;
      effectText = `${city.name}航线需求维持余温`;
    } else if (q === 2) {
      title = `${a.name}效应延续`;
      desc = `${city.name}游客量仍高于常态，会后效应持续释放。`;
      effectText = `${city.name}航线需求逐步回落`;
    } else if (q === 3) {
      title = `${a.name}热度渐退`;
      desc = `${city.name}航空需求逐步回归常态水平。`;
      effectText = `${city.name}航线需求回归常态`;
    }

    if (title) {
      G.newsItems.push({
        category: 'mega_event',
        title: title,
        desc: desc,
        effect: effectText,
        stockEffect: a.stockEffect,
        _megaEventId: a.id,
        _isHeadline: q === 0
      });
    }
  });

  // ── 股价波动 ──
  updateStockPrices();
}
