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
  // Disaster (30% random chance, load factor drops to 0 for affected sub-region)
  if(Math.random()<0.3){
    const news=pickNews('disaster');
    G.disasterRegions=G.disasterRegions||[];
    G.disasterRegions.push({region:news.region,subRegion:news.subRegion||null,turns:1});
    const regionLabel=news.subRegion?news.subRegionName:news.regionName;
    G.newsItems.push({category:'disaster',title:news.title,desc:news.desc,effect:`${regionLabel}航线遭受巨大影响`,stockEffect:news.stockEffect||null});
    G.events.push({type:'disaster',text:news.title,severity:'high'});
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
  // ── 股价波动 ──
  updateStockPrices();
}
