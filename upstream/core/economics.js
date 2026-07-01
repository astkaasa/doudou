// ===== ECONOMICS =====

// --- v2.0: 需求模型重构 + 收入频率分层 ---

function baseDemand(cityA,cityB){
  const sa=getCityState(cityA.id), sb=getCityState(cityB.id);
  const popA=sa?sa.pop:cityA.pop, popB=sb?sb.pop:cityB.pop;
  const bizA=sa?sa.biz:20, bizB=sb?sb.biz:20;
  const tourA=sa?sa.tour:15, tourB=sb?sb.tour:15;
  const distKm=cityDist(cityA,cityB);

  // ─── 人口基数：加法模型，避免乘法塌缩 ───
  const popBase=(popA+popB)*POP_SCALE;

  // ─── 枢纽加成：高级别城市作为中转枢纽放大需求 ───
  const hubBonus=1+Math.max(cityA.level,cityB.level)*HUB_FACTOR;

  // ─── 市场深度：商务+旅游作为独立需求层，而非衰减乘子 ───
  const marketDepth=(bizA+bizB)*BIZ_DEMAND_WEIGHT
                   +(tourA+tourB)*TOUR_DEMAND_WEIGHT;

  // ─── 距离因子：翻转！长途无替代→需求加成 ───
  let distFactor;
  if(distKm>8000) distFactor=DIST_PREMIUM_LONG;      // 洲际航线
  else if(distKm>4000) distFactor=DIST_PREMIUM_MID;   // 远程航线
  else if(distKm<2000) distFactor=DIST_SHORT_PENALTY; // 短途有高铁竞争
  else distFactor=1.0;

  // ─── 跨区域加成：连接不同市场→需求增量 ───
  const regionBonus=cityA.region===cityB.region?1.0:CROSS_REGION_BONUS;

  return Math.round((popBase+marketDepth)*hubBonus*distFactor*regionBonus);
}

function seasonModifier(q){return SEASON_MODIFIERS[q-1]}

function isDisasterAffected(cityRegion,citySubRegion){
  if(!G.disasterRegions||G.disasterRegions.length===0)return false;
  return G.disasterRegions.some(d=>{
    if(d.subRegion&&citySubRegion) return d.subRegion===citySubRegion;
    return d.region===cityRegion;
  });
}

// ── 盛事渐进曲线 ──
function megaEventBoostCurve(quartersFromEvent) {
  const q = quartersFromEvent;
  if (q <= -5) return 0;
  if (q === -4) return 0.10;
  if (q === -3) return 0.25;
  if (q === -2) return 0.50;
  if (q === -1) return 0.80;
  if (q === 0)  return 1.00;
  if (q === 1)  return 0.60;
  if (q === 2)  return 0.30;
  if (q === 3)  return 0.10;
  return 0;
}

// ── 判断某城市是否为当前活跃盛事的主办城市 ──
function isMegaEventHost(cityId, maxQ) {
  if (!G.activeMegaEvents || G.activeMegaEvents.length === 0) return false;
  const qLimit = maxQ !== undefined ? maxQ : 0;
  return G.activeMegaEvents.some(evt =>
    evt.cityId === cityId && evt.quartersFromEvent <= qLimit
  );
}

// ── 盛事/灾害综合需求调制系数 ──
function getEventDemandModifier(cityA, cityB) {
  let modifier = 1.0;

  // 正向：盛事需求加成
  if (G.activeMegaEvents && G.activeMegaEvents.length > 0) {
    G.activeMegaEvents.forEach(evt => {
      const hostCity = getCity(evt.cityId);
      if (!hostCity) return;

      if (evt.cityId === cityA.id || evt.cityId === cityB.id) {
        modifier *= (1 + evt.currentBoost);
      } else if (hostCity.region === cityA.region || hostCity.region === cityB.region) {
        modifier *= (1 + evt.currentBoost * MEGA_EVENT_SPILLOVER);
      } else {
        if (cityA.level >= 2 || cityB.level >= 2) {
          modifier *= (1 + evt.currentBoost * MEGA_EVENT_REMOTE_SPILLOVER);
        }
      }
    });
  }

  // 负向：灾害需求抑制（含盛事豁免权）
  if (G.disasterRegions && G.disasterRegions.length > 0) {
    const aAffected = isDisasterAffected(cityA.region, cityA.subRegion);
    const bAffected = isDisasterAffected(cityB.region, cityB.subRegion);
    if (aAffected || bAffected) {
      const aImmune = isMegaEventHost(cityA.id, 0);
      const bImmune = isMegaEventHost(cityB.id, 0);

      if (aAffected && bAffected) {
        if (aImmune && bImmune) { /* 双方均豁免 */ }
        else if (aImmune || bImmune) { modifier *= DISASTER_ONE_CITY; }
        else { modifier *= DISASTER_BOTH_CITIES; }
      } else {
        const immuneCity = aAffected ? aImmune : bImmune;
        if (!immuneCity) { modifier *= DISASTER_ONE_CITY; }
      }
    }
  }

  return modifier;
}

function calcLoadFactor(route,price,brand,competitors){
  const cityA=getCity(route.from),cityB=getCity(route.to);
  // ── 盛事/灾害综合调制（替代二元灾害检查） ──
  const eventModifier = getEventDemandModifier(cityA, cityB);
  let demand=baseDemand(cityA,cityB)*seasonModifier(G.quarter)*eventModifier;
  const refPrice=route.suggestedPrice;
  const priceRatio=price/refPrice;
  const priceEffect=Math.pow(priceRatio,PRICE_ELASTICITY);
  const brandEffect=1+(brand-1)*BRAND_EFFECT_FACTOR;
  const compEffect=1/(1+competitors*COMP_EFFECT_FACTOR);
  const effectiveDemand=demand*priceEffect*brandEffect*compEffect;
  const totalSeats=route.assignedPlanes.reduce((s,pid)=>{const plane=G.fleetMap[pid];return s+(plane?plane.seats:0);},0);
  if(totalSeats===0)return 0;
  return clamp(effectiveDemand/totalSeats,0,1);
}

function suggestedPrice(from,to){const d=cityDist(getCity(from),getCity(to));return Math.round(d*SUGGESTED_PRICE_PER_KM+SUGGESTED_PRICE_BASE)}

function routeOpenCost(from,to){const a=getCity(from),b=getCity(to);const avgLevel=(a.level+b.level)/2;const d=cityDist(a,b);const distFactor=d>8000?2:d>3000?1.5:1;return Math.round(ROUTE_OPEN_COST_BASE*avgLevel*distFactor);}

// ─── 距离-频率分层：短途高频、长途低频 ───
function routeFreqFactor(distKm){
  if(distKm<2000)  return 4;    // 短途: ~2班/天
  if(distKm<4500)  return 2.5;  // 中途: ~1班/天
  if(distKm<8000)  return 1.5;  // 长途: ~5班/周
  return 1;                      // 超远程: ~2班/周
}

function routeRevenue(route){
  const lf=route.loadFactor;
  const totalSeats=route.assignedPlanes.reduce((s,pid)=>{const plane=G.fleetMap[pid];return s+(plane?plane.seats:0);},0);
  const cityA=getCity(route.from),cityB=getCity(route.to);
  const distKm=cityDist(cityA,cityB);
  const freq=routeFreqFactor(distKm);
  const pax=Math.round(totalSeats*lf);
  let rev=pax*route.price*freq/ROUTE_REVENUE_DIVISOR;
  const cargoRev=pax*0.02*route.price*0.3*freq/ROUTE_REVENUE_DIVISOR;
  return {pax:pax*freq,rev,cargoRev,total:rev+cargoRev};
}

function routeCost(route){
  const cityA=getCity(route.from),cityB=getCity(route.to);
  const d=cityDist(cityA,cityB);
  const freq=routeFreqFactor(d);
  // 高频航班批量折扣：freq=1→1.0x, freq=4→1.9x（而非4x）
  const freqScale=1+(freq-1)*FREQ_COST_SCALE;
  let fuelCost=0,maintCost=0,crewCost=0;
  let landingFee=0,catering=0;
  for(const pid of route.assignedPlanes){
    const plane=G.fleetMap[pid];if(!plane)continue;
    let fuelRate=plane.fuel;
    let maintRate=plane.maint;
    if(G.playerTrait==='豆')fuelRate*=TRAIT_FUEL_DISCOUNT;
    if(G.playerTrait==='机')maintRate*=TRAIT_MAINT_DISCOUNT;
    fuelCost+=fuelRate*(G.oilPrice/80)*(d/5000);
    maintCost+=maintRate*(1+MAINT_AGING*plane.age);
    crewCost+=CREW_PER_180*(plane.seats/180);
    landingFee+=(LANDING_BASE+(cityA.level+cityB.level)*LANDING_PER_LEVEL*Math.sqrt(d/LANDING_DIST_REF))*freqScale;
    catering+=CATERING_PER_FLIGHT*freqScale;
  }
  return {fuel:fuelCost,maint:maintCost,crew:crewCost,landing:landingFee,catering:catering,total:fuelCost+maintCost+crewCost+landingFee+catering};
}
