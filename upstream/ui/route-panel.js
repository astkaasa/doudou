function openRouteCreateModal(from,to){
  // Store for updatePricePreview
  window._routeCreateFrom=from;window._routeCreateTo=to;
  // Only HQ/branch can be departure
   if(!isBase(from)){showModal(`<h2>无法开通航线</h2><p style="color:#f87171">起飞城市必须是总部或分部！${getCity(from).name}不是你的基地。</p><p style="color:#7ba3cc;font-size:13px">提示：在快捷操作中点击「分部管理」扩展基地网络。</p><button class="btn btn-primary" onclick="closeModal()">确定</button>`);return;}
  const a=getCity(from),b=getCity(to);const d=cityDist(a,b);const sp=suggestedPrice(from,to);
  const avail=availablePlanes().filter(p=>p.range>=d);
  if(avail.length===0){const ap=getAvailablePlanes();const longRange=ap.filter(p=>p.range>=d);const hint=longRange.length>0?`如 ${longRange[0].name}`:`当前时代暂无航程足够的机型`;showModal(`<h2>无法开通航线</h2><p>航程 ${Math.round(d)} km，没有航程足够的可用飞机。</p><p>请先购买航程足够的飞机${hint}。</p><button class="btn btn-primary" onclick="closeModal()">确定</button>`);return;}
  const existing=G.routes.find(r=>routeKey(r.from,r.to)===routeKey(from,to));
  if(existing){showModal(`<h2>航线已开通</h2><p>${a.name} → ${b.name} 已在运营中。</p><button class="btn btn-primary" onclick="closeModal()">确定</button>`);return;}
  const demand=baseDemand(a,b);const comp=countCompetitors(from,to);const openCost=routeOpenCost(from,to);const canAfford=G.cash>=openCost;
  let html=`<h2>开通航线</h2><div class="route-preview">
    <div style="font-size:24px;font-weight:700;margin-bottom:10px;text-align:center">${a.name} ✈ ${b.name}</div>
    <div class="r-field"><span class="r-label">起飞城市</span><span class="r-val">${a.name}</span></div>
    <div class="r-field"><span class="r-label">到达城市</span><span class="r-val">${b.name}</span></div>
<div class="r-field"><span class="r-label">距离</span><span class="r-val">${Math.round(d)} km</span></div>
<div class="r-field"><span class="r-label">竞争航线</span><span class="r-val">${comp} 条</span></div>
    <div class="r-field" style="background:${canAfford?'#dc262610':'#dc262620'};border-radius:6px;padding:6px 10px;margin:0 -10px"><span class="r-label" style="color:#f87171">开通费用</span><span class="r-val" style="color:#f87171;font-weight:700">$${openCost}M</span></div>
    ${!canAfford?'<div style="color:#f87171;font-size:12px;margin-top:4px">资金不足，无法开通此航线</div>':''}
  </div><h3>分配飞机</h3><select id="route-plane" style="width:100%;padding:8px;background:#0a1628;color:#e0e8f0;border:1px solid #1e3a5f;border-radius:4px;font-size:13px" ${!canAfford?'disabled':''}>`;
  avail.forEach(p=>{html+=`<option value="${p.uid}">${p.name}${p.isLease?' [R]':''} (${p.seats}座, 航程${p.range}km)</option>`;});
  html+=`</select><h3>票价设置</h3><input type="range" id="route-price" min="${Math.round(sp*0.5)}" max="${Math.round(sp*1.5)}" value="${sp}" class="price-slider" oninput="updatePricePreview()"><div class="price-display"><span id="price-val">$${sp}</span><span id="price-est">预估客座率: --</span></div><div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap"><span style="font-size:11px;color:#7ba3cc;line-height:26px;margin-right:2px">快捷:</span><button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" onclick="setRoutePricePreset(${sp},-50)">-50%</button><button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" onclick="setRoutePricePreset(${sp},-25)">-25%</button><button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" onclick="setRoutePricePreset(${sp},0)">0%</button><button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" onclick="setRoutePricePreset(${sp},25)">+25%</button><button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" onclick="setRoutePricePreset(${sp},50)">+50%</button></div><div style="margin-top:16px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0;margin-right:8px" onclick="closeModal()">取消</button><button class="btn btn-success" onclick="confirmOpenRoute('${from}','${to}')" ${!canAfford?'disabled style="opacity:0.4;cursor:not-allowed"':''}>确认开通</button></div>`;
  $('modal-root').innerHTML=`<div class="modal-overlay route-overlay" onclick="if(event.target===this)closeModal()"><div class="modal route-modal" style="position:relative">${html}</div></div>`;
  setTimeout(updatePricePreview,100);
}

function updatePricePreview(){
  const slider=document.getElementById('route-price');if(!slider)return;
  const price=parseInt(slider.value);document.getElementById('price-val').textContent='$'+price;
  const select=document.getElementById('route-plane');const planeUid=parseInt(select.value);
  const plane=G.fleetMap[planeUid];
  if(plane){
    // Use full calcLoadFactor for accurate preview (instead of simplified formula)
    const tempRoute={from:window._routeCreateFrom,to:window._routeCreateTo,price,suggestedPrice:plane._sp||price,assignedPlanes:[planeUid]};
    const comp=countCompetitors(tempRoute.from,tempRoute.to);
    const estLF=calcLoadFactor(tempRoute,price,G.brand,comp);
    const totalSeats=plane.seats;
    const pax=Math.round(totalSeats*estLF);
    const d=cityDist(getCity(tempRoute.from),getCity(tempRoute.to));
    const freq=routeFreqFactor(d);
    let estRev=pax*price*freq/ROUTE_REVENUE_DIVISOR;
    const cargoRev=pax*0.02*price*0.3*freq/ROUTE_REVENUE_DIVISOR;
    const totalRev=estRev+cargoRev;
    let fuelRate=plane.fuel;let maintRate=plane.maint;
    if(G.playerTrait==='豆')fuelRate*=TRAIT_FUEL_DISCOUNT;
    if(G.playerTrait==='机')maintRate*=TRAIT_MAINT_DISCOUNT;
    let fuelC=fuelRate*(G.oilPrice/80)*(d/5000);
    let maintC=maintRate*(1+MAINT_AGING*plane.age);
    let crewC=CREW_PER_180*(plane.seats/180);
    const cityA=getCity(tempRoute.from),cityB=getCity(tempRoute.to);
    const freqScale=1+(freq-1)*FREQ_COST_SCALE;
    const landingFee=(LANDING_BASE+(cityA.level+cityB.level)*LANDING_PER_LEVEL*Math.sqrt(d/LANDING_DIST_REF))*freqScale;
    const catering=CATERING_PER_FLIGHT*freqScale;
    const totalCost=fuelC+maintC+crewC+landingFee+catering;
    const estProfit=totalRev-totalCost;
    document.getElementById('price-est').textContent=`预估客座率: ${fmtPct(estLF*100)} | 利润: ${fmt(estProfit)}`;
  }
}

function setRoutePricePreset(basePrice,pct){
  const slider=document.getElementById('route-price');if(!slider)return;
  const price=Math.round(basePrice*(1+pct/100));
  slider.value=clamp(price,Math.round(basePrice*0.5),Math.round(basePrice*1.5));
  updatePricePreview();
}

function confirmOpenRoute(from,to){
  const openCost=routeOpenCost(from,to);
  if(G.cash<openCost){showBanner('资金不足，无法开通航线','#dc2626');return;}
  const select=document.getElementById('route-plane');const planeUid=parseInt(select.value);const slider=document.getElementById('route-price');const price=parseInt(slider.value);
  const key=routeKey(from,to);if(G.routes.find(r=>routeKey(r.from,r.to)===key))return;
  const sp=suggestedPrice(from,to);
  G.cash-=openCost;
  G.routes.push({from,to,price,suggestedPrice:sp,assignedPlanes:[planeUid],loadFactor:0,profit:0,revenue:0,cost:0,isNew:true,suspended:false,_reopened:false});
  updateRouteMetrics();updateHUD();renderMap();renderPanel();closeModal();hideRouteCreateInfo();
  showBanner('航线开通：'+getCity(from).name+' → '+getCity(to).name+'  开通费用 $'+openCost+'M','#16a34a');
  updateOnboarding();
  updateMilestones();
}

function openRouteList(){
  uiState.routeListSort={key:'profit',dir:'desc'};
  uiState.routeListPage=0;
  uiState.routeListPageSize=10;
  uiState.routeStatusFilter='all';
  uiState.routeCityFilter='all';
  renderRouteList();
}

function renderRouteList(){
  if(G.routes.length===0){showModal(`<h2>航线管理</h2><p style="color:#556">尚未开通航线。</p><div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" onclick="closeModal()">关闭</button></div>`);return;}
  // Build route data
  let rows=G.routes.map(r=>{
    const a=getCity(r.from),b=getCity(r.to);
    const d=cityDist(a,b);
    const planeInfo=r.assignedPlanes.map(pid=>{const p=G.fleetMap[pid];return p?p.name+(p.isLease?'<span style="font-size:12px;color:#fbbf24"> [R]</span>':''):'?';}).join(', ');
    const planeInfoPlain=r.assignedPlanes.map(pid=>{const p=G.fleetMap[pid];return p?p.name+(p.isLease?' [R]':''):'?';}).join(', ');
    const priceCoeff=((r.price/r.suggestedPrice)*100-100).toFixed(0);
    const priceCoeffStr=priceCoeff>0?`+${priceCoeff}%`:priceCoeff===0?'0%':`${priceCoeff}%`;
    return {from:a.name,to:b.name,dist:Math.round(d),planes:planeInfo,planesPlain:planeInfoPlain,planeUids:r.assignedPlanes.slice(),priceCoeff:parseFloat(priceCoeff),priceCoeffStr,lf:r.loadFactor,price:r.price,suggestedPrice:r.suggestedPrice,fromId:r.from,toId:r.to,profit:r.profit,revenue:r.revenue,cost:r.cost,isNew:!!r.isNew,suspended:!!r.suspended,reopened:!!r._reopened,priceAdjusted:!!r._priceAdjusted,planeChanged:!!r._planeChanged,lastLf:r._lastLf||0,lastProfit:r._lastProfit||0,suspendCooldown:r._suspendTurn!==undefined&&r._suspendTurn>=G.turnsPlayed,resumeCooldown:r._resumedTurn!==undefined&&r._resumedTurn>=G.turnsPlayed};
  });
  // Filter by status
  const allCount=rows.length;
  const activeCount=rows.filter(r=>!r.suspended).length;
  const suspendedCount=rows.filter(r=>r.suspended).length;
  if(uiState.routeStatusFilter==='active')rows=rows.filter(r=>!r.suspended);
  else if(uiState.routeStatusFilter==='suspended')rows=rows.filter(r=>r.suspended);
  // Filter by city
  const baseCities=[{id:'all',name:'全部'}];
  if(G.hq){const hqCity=getCity(G.hq);if(hqCity)baseCities.push({id:G.hq,name:'📍'+hqCity.name});}
  if(G.branches)G.branches.forEach(bid=>{const bc=getCity(bid);if(bc)baseCities.push({id:bid,name:'🏬'+bc.name});});
  if(G.branchesConstructing)G.branchesConstructing.forEach(b=>{const bc=getCity(b.cityId);if(bc)baseCities.push({id:b.cityId,name:'🏗'+bc.name});});
  if(uiState.routeCityFilter!=='all')rows=rows.filter(r=>r.fromId===uiState.routeCityFilter||r.toId===uiState.routeCityFilter);
  // Sort
  const key=uiState.routeListSort.key;
  const dir=uiState.routeListSort.dir==='asc'?1:-1;
  rows.sort((a,b)=>(a[key]>b[key]?1:a[key]<b[key]?-1:0)*dir);
  // Paginate
  const total=rows.length;
  const totalPages=Math.max(1,Math.ceil(total/uiState.routeListPageSize));
  uiState.routeListPage=clamp(uiState.routeListPage,0,totalPages-1);
  const start=uiState.routeListPage*uiState.routeListPageSize;
  const pageRows=rows.slice(start,start+uiState.routeListPageSize);
  // Column headers with icons and descriptive tooltips
  const cols=[
    {key:'from',icon:'🛫',label:'起飞城市'},
    {key:'to',icon:'🛬',label:'到达城市'},
    {key:'dist',icon:'📏',label:'航线距离'},
    {key:'planes',icon:'✈',label:'执飞机型'},
    {key:'priceCoeff',icon:'💰',label:'票价系数'},
    {key:'lf',icon:'👥',label:'客座率'},
    {key:'revenue',icon:'💵',label:'航线收入'},
    {key:'cost',icon:'💸',label:'航线成本'},
    {key:'profit',icon:'📈',label:'收益'},
  ];
  let html=`<h2>航线管理</h2>
    <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center;flex-wrap:wrap">
      <span style="font-size:11px;color:#7ba3cc;margin-right:2px">状态</span>
      <button class="btn btn-sm" style="${uiState.routeStatusFilter==='all'?'background:#2563eb;color:#fff':'background:#334155;color:#e0e8f0'};padding:3px 12px;font-size:12px" onclick="uiState.routeStatusFilter='all';uiState.routeListPage=0;renderRouteList()">全部 (${allCount})</button>
      <button class="btn btn-sm" style="${uiState.routeStatusFilter==='active'?'background:#2563eb;color:#fff':'background:#334155;color:#e0e8f0'};padding:3px 12px;font-size:12px" onclick="uiState.routeStatusFilter='active';uiState.routeListPage=0;renderRouteList()">正常 (${activeCount})</button>
      <button class="btn btn-sm" style="${uiState.routeStatusFilter==='suspended'?'background:#2563eb;color:#fff':'background:#334155;color:#e0e8f0'};padding:3px 12px;font-size:12px" onclick="uiState.routeStatusFilter='suspended';uiState.routeListPage=0;renderRouteList()">停飞 (${suspendedCount})</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:10px;align-items:center;flex-wrap:wrap">
      <span style="font-size:11px;color:#7ba3cc;margin-right:2px">基地</span>
      ${baseCities.map(bc=>{const cnt=bc.id==='all'?allCount:G.routes.filter(r=>r.from===bc.id||r.to===bc.id).length;return `<button class="btn btn-sm" style="${uiState.routeCityFilter===bc.id?'background:#2563eb;color:#fff':'background:#334155;color:#e0e8f0'};padding:3px 12px;font-size:12px" onclick="uiState.routeCityFilter='${bc.id}';uiState.routeListPage=0;renderRouteList()">${bc.name} (${cnt})</button>`;}).join('')}
    </div>
    <div style="overflow-x:auto">
    <table class="route-table" style="font-size:14px">
      <thead><tr>`;
  cols.forEach(c=>{
    const cls=uiState.routeListSort.key===c.key?(uiState.routeListSort.dir==='asc'?'sorted-asc':'sorted-desc'):'';
    html+=`<th class="${cls}" onclick="toggleRouteSort('${c.key}')" title="${c.label}">${c.icon} <span style="font-size:10px">${c.label}</span></th>`;
  });
  html+=`<th style="cursor:default" title="操作">操作</th></tr></thead><tbody>`;
  pageRows.forEach(r=>{
    const displayProfit=r.priceAdjusted||r.planeChanged?r.lastProfit:r.profit;
    const profitCls=displayProfit>=0?'profit-pos':'profit-neg';
    const revCls=r.revenue>=0?'profit-pos':'profit-neg';
    const lfPct=(r.lf*100).toFixed(1)+'%';
    const lastLfPct=(r.lastLf*100).toFixed(1)+'%';
    // Trend icon for load factor and profit (stock K-line style)
    const lfTrend=r.lf>r.lastLf?'📈':r.lf<r.lastLf?'📉':'📊';
    const profitTrend=r.profit>r.lastProfit?'📈':r.profit<r.lastProfit?'📉':'📊';
    // Suspended route display
    const suspendedBadge=r.suspended?'<span style="color:#f87171;font-size:10px;margin-left:4px;font-weight:700">停飞中</span>':'';
    // Load factor display: suspended→0%, reopened→"reopen", new→"new", adjusted→trend icon, normal→value
    const lfDisplay=r.suspended?'0%':r.reopened?`<span style="color:#60a5fa;font-weight:700;font-size:13px">reopen</span>`:r.isNew?`<span style="color:#fbbf24;font-weight:700;font-size:13px">new</span>`:r.priceAdjusted||r.planeChanged?`${lastLfPct}<span style="font-size:10px;margin-left:2px" title="数据下季度可能变化">${lfTrend}</span>`:lfPct;
    const profitDisplay=r.suspended?'--':r.reopened?`<span style="color:#60a5fa;font-weight:700;font-size:13px">reopen</span>`:r.isNew?`<span style="color:#fbbf24;font-weight:700;font-size:13px">new</span>`:r.priceAdjusted||r.planeChanged?`<span class="${profitCls}">${fmt(r.lastProfit)}</span><span style="font-size:10px;margin-left:2px" title="数据下季度可能变化">${profitTrend}</span>`:`<span class="${profitCls}">${fmt(r.profit)}</span>`;
    const revDisplay=r.suspended?'--':r.reopened?`<span style="color:#60a5fa;font-weight:700;font-size:13px">reopen</span>`:r.isNew?`<span style="color:#fbbf24;font-weight:700;font-size:13px">new</span>`:`<span class="${revCls}">${fmt(r.revenue)}</span>`;
    const costDisplay=r.suspended?'--':r.reopened?`<span style="color:#60a5fa;font-weight:700;font-size:13px">reopen</span>`:r.isNew?`<span style="color:#fbbf24;font-weight:700;font-size:13px">new</span>`:`<span style="color:#f87171">-${fmt(r.cost)}</span>`;
    // Price/plane change indicators unified to 🔄
    const changeIcon=r.priceAdjusted||r.planeChanged?`<span style="color:#fbbf24;font-size:10px;margin-left:2px" title="本季度调整过${r.priceAdjusted?'票价':'机型'}">🔄</span>`:'';
    const rowStyle=r.suspended?'style="opacity:0.5"':'';
    // Suspend/resume button: icon only, with cooldown disable
    const suspendBtn=r.suspended
      ?`<button class="btn btn-sm" style="background:${r.resumeCooldown?'#1e3a5f':'#16a34a'};color:#fff;padding:2px 6px;font-size:13px${r.resumeCooldown?';cursor:not-allowed;opacity:0.4':''}" onclick="${r.resumeCooldown?'':'toggleSuspendRoute(\x27'+r.fromId+'\x27,\x27'+r.toId+'\x27)'}" title="${r.resumeCooldown?'需推进1回合后才能复飞':'复飞'}">▶</button>`
      :`<button class="btn btn-sm" style="background:${r.suspendCooldown?'#1e3a5f':'#6b7280'};color:#fff;padding:2px 6px;font-size:13px${r.suspendCooldown?';cursor:not-allowed;opacity:0.4':''}" onclick="${r.suspendCooldown?'':'toggleSuspendRoute(\x27'+r.fromId+'\x27,\x27'+r.toId+'\x27)'}" title="${r.suspendCooldown?'需推进1回合后才能停飞':'停飞'}">⏸</button>`;
    // Suspend button goes between "change plane" and "close route"
    html+=`<tr ${rowStyle}>
      <td>${r.from}${suspendedBadge}</td>
      <td>${r.to}</td>
      <td>${r.dist}km</td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.planesPlain}">${r.planes}${r.planeChanged?changeIcon:''}</td>
      <td>${r.suspended?'--':r.priceCoeffStr}${!r.suspended&&r.priceAdjusted?changeIcon:''}</td>
      <td>${lfDisplay}</td>
      <td>${revDisplay}</td>
      <td>${costDisplay}</td>
      <td>${profitDisplay}</td>
      <td style="white-space:nowrap">
        ${!r.suspended?`<button class="btn btn-sm" style="background:#2563eb;color:#fff;padding:2px 6px;font-size:12px" onclick="openRoutePriceAdjust('${r.fromId}','${r.toId}')" title="调整票价">💰</button>
        <button class="btn btn-sm" style="background:#d97706;color:#fff;padding:2px 6px;font-size:12px" onclick="openRouteChangePlane('${r.fromId}','${r.toId}')" title="更换机型">✈</button>`:''}
        ${suspendBtn}
        <button class="btn btn-sm" style="background:#dc2626;color:#fff;padding:2px 6px;font-size:12px" onclick="confirmCloseRoute('${r.fromId}','${r.toId}')" title="关闭航线">✕</button>
      </td>
    </tr>`;
  });
  html+=`</tbody></table></div>`;
  // Pagination
  html+=`<div class="route-page-info">
    <div>
      <span>第 ${uiState.routeListPage+1}/${totalPages} 页</span>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:1px 8px;font-size:11px;margin-left:6px" onclick="uiState.routeListPage=0;renderRouteList()">首</button>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:1px 8px;font-size:11px" onclick="uiState.routeListPage=Math.max(0,uiState.routeListPage-1);renderRouteList()">‹</button>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:1px 8px;font-size:11px" onclick="uiState.routeListPage=Math.min(${totalPages-1},uiState.routeListPage+1);renderRouteList()">›</button>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:1px 8px;font-size:11px" onclick="uiState.routeListPage=${totalPages-1};renderRouteList()">末</button>
    </div>
    <div>
      <span>每页</span>
      <button class="btn btn-sm" style="${uiState.routeListPageSize===10?'background:#2563eb;color:#fff':'background:#334155;color:#e0e8f0'};padding:1px 8px;font-size:11px;margin-left:4px" onclick="uiState.routeListPageSize=10;uiState.routeListPage=0;renderRouteList()">10</button>
      <button class="btn btn-sm" style="${uiState.routeListPageSize===20?'background:#2563eb;color:#fff':'background:#334155;color:#e0e8f0'};padding:1px 8px;font-size:11px;margin-left:4px" onclick="uiState.routeListPageSize=20;uiState.routeListPage=0;renderRouteList()">20</button>
    </div>
  </div>`;
  html+=`<div style="margin-top:8px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" onclick="closeModal()">关闭</button></div>`;
  // Use wider modal for route list
  $('modal-root').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="position:relative;max-width:900px;min-width:700px">${html}</div></div>`;
}

function toggleRouteSort(key){
  if(uiState.routeListSort.key===key)uiState.routeListSort.dir=uiState.routeListSort.dir==='asc'?'desc':'asc';
  else{uiState.routeListSort.key=key;uiState.routeListSort.dir='asc';}
  uiState.routeListPage=0;
  renderRouteList();
}

function openRoutePriceAdjust(from,to){
  const route=G.routes.find(r=>r.from===from&&r.to===to);
  if(!route)return;
  const a=getCity(from),b=getCity(to);
  const sp=route.suggestedPrice;
  const currentPct=Math.round((route.price/sp-1)*100);
  let html=`<h2>调价 - ${a.name} → ${b.name}</h2>
    <div style="display:flex;justify-content:space-between;margin:10px 0;font-size:14px">
      <span style="color:#7ba3cc">基础票价</span><span>$${sp}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin:6px 0;font-size:14px">
      <span style="color:#7ba3cc">当前票价</span><span style="font-weight:700">$${route.price} (${currentPct>=0?'+':''}${currentPct}%)</span>
    </div>
    <input type="range" id="adj-price-slider" min="${Math.round(sp*0.5)}" max="${Math.round(sp*1.5)}" value="${route.price}" class="price-slider" oninput="document.getElementById('adj-price-val').textContent='$'+this.value">
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#556;margin-top:2px"><span>$${Math.round(sp*0.5)}</span><span id="adj-price-val">$${route.price}</span><span>$${Math.round(sp*1.5)}</span></div>
    <div style="display:flex;gap:4px;margin-top:10px;flex-wrap:wrap">
      <span style="font-size:11px;color:#7ba3cc;line-height:26px;margin-right:2px">快捷:</span>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" onclick="applyPricePreset('${from}','${to}',-50)">-50%</button>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" onclick="applyPricePreset('${from}','${to}',-25)">-25%</button>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" onclick="applyPricePreset('${from}','${to}',0)">0%</button>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" onclick="applyPricePreset('${from}','${to}',25)">+25%</button>
      <button class="btn btn-sm" style="background:#334155;color:#e0e8f0;padding:2px 8px;font-size:11px" onclick="applyPricePreset('${from}','${to}',50)">+50%</button>
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" style="background:#334155;color:#e0e8f0" onclick="renderRouteList()">取消</button>
      <button class="btn btn-success" onclick="confirmPriceAdjust('${from}','${to}')">确认调价</button>
    </div>`;
  showModal(html);
}

function applyPricePreset(from,to,pct){
  const route=G.routes.find(r=>r.from===from&&r.to===to);if(!route)return;
  const sp=route.suggestedPrice;
  const price=Math.round(sp*(1+pct/100));
  const slider=document.getElementById('adj-price-slider');
  if(slider){slider.value=clamp(price,Math.round(sp*0.5),Math.round(sp*1.5));document.getElementById('adj-price-val').textContent='$'+slider.value;}
}

function confirmPriceAdjust(from,to){
  const slider=document.getElementById('adj-price-slider');
  const route=G.routes.find(r=>r.from===from&&r.to===to);if(!route||!slider)return;
  // Save current settled data before change
  route._lastLf=route.loadFactor;route._lastProfit=route.profit;
  route.price=parseInt(slider.value);
  route._priceAdjusted=true;
  updateRouteMetrics();updateHUD();renderPanel();
  renderRouteList();
  showBanner(`${getCity(from).name}→${getCity(to).name} 票价调整为 $${route.price}`,'#2563eb');
}

function confirmCloseRoute(from,to){
  const a=getCity(from),b=getCity(to);
  showModal(`<h2>关闭航线</h2>
    <p style="font-size:15px;margin:10px 0">确定关闭 <strong>${a.name} → ${b.name}</strong> 航线？</p>
    <p style="color:#f87171;font-size:13px">关闭后该航线将失去收益，飞机将变为空闲可用状态。</p>
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" style="background:#334155;color:#e0e8f0" onclick="renderRouteList()">取消</button>
      <button class="btn btn-danger" onclick="closeRoute('${from}','${to}')">确认关闭</button>
    </div>`);
}
function closeRoute(from,to){G.routes=G.routes.filter(r=>!(r.from===from&&r.to===to));updateRouteMetrics();updateHUD();renderMap();renderPanel();renderRouteList();}

function toggleSuspendRoute(from,to){
  const route=G.routes.find(r=>r.from===from&&r.to===to);if(!route)return;
  const a=getCity(from),b=getCity(to);
  const currentTurn=G.turnsPlayed;
  if(!route.suspended){
    // Check cooldown: if resumed this turn, cannot suspend
    if(route._resumedTurn!==undefined&&route._resumedTurn>=currentTurn){
      showBanner('复飞后需推进1个回合才能再次停飞','#d97706');return;
    }
    // Suspend confirmation
    showModal(`<h2>停飞航线</h2>
      <p style="font-size:15px;margin:10px 0">确定停飞 <strong>${a.name} → ${b.name}</strong> 航线？</p>
      <p style="color:#f87171;font-size:13px">停飞后客座率和收入归零，但执飞飞机仍处于占用状态。停飞后需要下季度才能复飞。</p>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn" style="background:#334155;color:#e0e8f0" onclick="renderRouteList()">取消</button>
        <button class="btn btn-danger" onclick="doSuspendRoute('${from}','${to}')">确认停飞</button>
      </div>`);
  } else {
    // Check cooldown: if suspended this turn, cannot resume
    if(route._suspendTurn!==undefined&&route._suspendTurn>=currentTurn){
      showBanner('本季度停飞的航线需要下季度才能复飞','#d97706');return;
    }
    // Resume confirmation
    showModal(`<h2>复飞航线</h2>
      <p style="font-size:15px;margin:10px 0">确定复飞 <strong>${a.name} → ${b.name}</strong> 航线？</p>
      <p style="color:#16a34a;font-size:13px">复飞后航线将在下季度恢复运营并产生收益。</p>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn" style="background:#334155;color:#e0e8f0" onclick="renderRouteList()">取消</button>
        <button class="btn btn-success" onclick="doResumeRoute('${from}','${to}')">确认复飞</button>
      </div>`);
  }
}

function doSuspendRoute(from,to){
  const route=G.routes.find(r=>r.from===from&&r.to===to);if(!route)return;
  route.suspended=true;
  route._suspendTurn=G.turnsPlayed;
  route._priceAdjusted=false;route._planeChanged=false;
  route.loadFactor=0;route.revenue=0;route.cost=0;route.profit=0;
  updateRouteMetrics();updateHUD();renderMap();renderPanel();
  showBanner(`航线已停飞：${getCity(from).name} → ${getCity(to).name}`,'#d97706');
  renderRouteList();
}

function doResumeRoute(from,to){
  const route=G.routes.find(r=>r.from===from&&r.to===to);if(!route)return;
  route.suspended=false;
  route._resumedTurn=G.turnsPlayed;
  route._reopened=true;
  route._lastLf=0;route._lastProfit=0;
  updateRouteMetrics();updateHUD();renderMap();renderPanel();
  showBanner(`航线已复飞：${getCity(from).name} → ${getCity(to).name}`,'#16a34a');
  renderRouteList();
}
function openRouteChangePlane(from,to){
  const route=G.routes.find(r=>r.from===from&&r.to===to);if(!route)return;
  const a=getCity(from),b=getCity(to);const d=cityDist(a,b);
  // Current planes on this route
  const currentPlanes=route.assignedPlanes.map(uid=>G.fleetMap[uid]).filter(Boolean);
  // Available planes (unassigned + not delivering) that can cover the distance
  const avail=availablePlanes().filter(p=>p.range>=d);
  const currentInfo=currentPlanes.map(p=>`${p.name}${p.isLease?' [R]':''} (${p.seats}座)`).join('、');
  if(avail.length===0){showModal(`<h2>更换机型</h2><p style="margin:10px 0">${a.name} → ${b.name}</p><p>当前执飞：${currentInfo}</p><p style="color:#f87171;margin-top:8px">没有可用的替代飞机（需航程 ≥ ${Math.round(d)} km）。</p><div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" onclick="renderRouteList()">返回</button></div>`);return;}
  let html=`<h2>更换机型</h2>
    <p style="font-size:14px;margin-bottom:8px">${a.name} → ${b.name} <span style="color:#7ba3cc">(航程 ${Math.round(d)} km)</span></p>
    <p style="font-size:13px;color:#7ba3cc;margin-bottom:10px">当前执飞：${currentInfo}</p>
    <h3>选择新飞机</h3>
    <div style="max-height:220px;overflow-y:auto;background:#0a1628;border-radius:6px;padding:4px">`;
  avail.forEach(p=>{
    html+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid #1a2d48;cursor:pointer" onclick="doChangePlane('${from}','${to}',${p.uid})">
      <div><span style="font-weight:600">${p.name}${p.isLease?' <span style="color:#fbbf24;font-size:10px">[R]</span>':''}</span><span style="color:#7ba3cc;font-size:12px;margin-left:8px">${p.seats}座 | 航程${p.range}km</span></div>
      <span style="color:#4ade80;font-size:12px">选择</span>
    </div>`;
  });
  html+=`</div>
    <div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" onclick="renderRouteList()">取消</button></div>`;
  showModal(html);
}
function doChangePlane(from,to,newUid){
  newUid=parseInt(newUid);
  const route=G.routes.find(r=>r.from===from&&r.to===to);if(!route)return;
  if(route.assignedPlanes.includes(newUid))return; // already assigned
  // Save current settled data before change
  route._lastLf=route.loadFactor;route._lastProfit=route.profit;
  // Remove all current planes, assign the new one
  route.assignedPlanes=[newUid];
  route._planeChanged=true;
  updateRouteMetrics();updateHUD();renderPanel();
  renderRouteList();
  showBanner(`${getCity(from).name}→${getCity(to).name} 已更换执飞机型`,'#d97706');
}

function openRouteDetail(from,to){openRouteList();}
function openRouteModal(){G.selectedCity=null;$('bottom-hint').textContent='在地图上点击第一个城市';hideRouteCreateInfo();renderMap();}
