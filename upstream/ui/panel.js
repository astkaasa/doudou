function renderPanel(){
  const rs=$('route-summary');
  if(hqSelectMode){
    rs.innerHTML='<div style="color:#f97316;font-size:14px">📍 请在左侧地图上点击选择总部城市</div>';
    $('market-info').innerHTML='';
    return;
  }
  if(G.routes.length===0){
    rs.innerHTML='<div style="color:#556;font-size:13px">尚未开通航线</div>';
  } else {
    renderRouteSummary();
  }
  const mi=$('market-info');
  let mhtml=`<div class="panel-row"><span class="label">可用飞机</span><span class="val">${availablePlanes().length} 架</span></div><div class="panel-row"><span class="label">品牌等级</span><span class="val">${'★'.repeat(Math.min(5,Math.floor(G.brand)))}</span></div><div class="panel-row"><span class="label">油价</span><span class="val">$${G.oilPrice.toFixed(0)}/桶</span></div>`;
  if(G.loan>0)mhtml+=`<div class="panel-row"><span class="label" style="color:#f87171">贷款余额</span><span class="val" style="color:#f87171">${fmt(G.loan)}</span></div>`;
  if(G.disasterRegions&&G.disasterRegions.length>0)mhtml+=`<div class="panel-row"><span class="label" style="color:#fbbf24">灾害影响</span><span class="val" style="color:#fbbf24">${G.disasterRegions.map(d=>{const srMap={east_asia:'东亚',southeast_asia:'东南亚',south_asia:'南亚',mideast:'中东',europe:'欧洲',north_africa:'北非',central_africa:'中非',south_africa:'南非',east_namerica:'北美东部',central_namerica:'北美中部',west_namerica:'北美西部',caribbean:'加勒比',samerica:'南美',oceania:'大洋洲'};const rn=d.subRegion?(srMap[d.subRegion]||d.subRegion):({asia:'亚洲',europe:'欧洲',namerica:'北美',africa:'非洲',samerica:'南美',oceania:'大洋洲'}[d.region]||d.region);return rn;}).join(' ')}</span></div>`;
  mhtml+=`<div style="margin-top:8px;font-size:13px;color:#556">竞争对手:</div>`;
  mi.innerHTML=mhtml;
  G.ai.forEach(ai=>{mi.innerHTML+=`<div class="panel-row"><span class="label" style="color:${ai.color}">${ai.name}</span><span class="val">${ai.routes.length} 线 | ${ai.fleet.length} 机</span></div>`;});
}

// ===== ROUTE SUMMARY: Categorized tabs =====
let _routeSummaryTab='top'; // 'top' | 'new' | 'alert'

function renderRouteSummary(){
  const rs=$('route-summary');
  if(!rs||G.routes.length===0) return;

  // Tab buttons
  const tabs=[
    {key:'top',label:'最赚钱',icon:'💰'},
    {key:'new',label:'最新',icon:'✨'},
    {key:'alert',label:'需关注',icon:'⚠'},
  ];
  let html='<div style="display:flex;gap:4px;margin-bottom:6px">';
  tabs.forEach(t=>{
    const active=_routeSummaryTab===t.key;
    html+=`<button class="btn btn-sm" style="flex:1;padding:3px 6px;font-size:11px;font-weight:600;${active?'background:#2563eb;color:#fff':'background:#1e3a5f;color:#7ba3cc'}" onclick="_routeSummaryTab='${t.key}';renderRouteSummary()">${t.icon} ${t.label}</button>`;
  });
  html+='</div>';

  // Get routes for current tab
  const routes=getRoutesForTab(_routeSummaryTab);
  if(routes.length===0){
    html+=`<div style="color:#556;font-size:12px;text-align:center;padding:8px">${_routeSummaryTab==='top'?'暂无航线':_routeSummaryTab==='new'?'没有新开通航线':'没有需要关注的航线'}</div>`;
  } else {
    routes.slice(0,3).forEach(r=>{
      html+=buildRouteSummaryItem(r);
    });
  }

  // "View all" link
  if(G.routes.length>0){
    html+=`<div style="color:#7ba3cc;font-size:11px;text-align:center;padding:3px;cursor:pointer" onclick="openRouteList()">查看全部 ${G.routes.length} 条 ›</div>`;
  }

  rs.innerHTML=html;
}

function getRoutesForTab(tab){
  const allRoutes=G.routes.slice();
  switch(tab){
    case 'top':{
      // Most profitable routes (exclude new/suspended from top display)
      return allRoutes.filter(r=>!r.isNew&&!r.suspended).sort((a,b)=>{
        const pa=a._priceAdjusted||a._planeChanged?a._lastProfit:a.profit;
        const pb=b._priceAdjusted||b._planeChanged?b._lastProfit:b.profit;
        return pb-pa;
      });
    }
    case 'new':{
      // New + reopened routes
      return allRoutes.filter(r=>r.isNew||r._reopened);
    }
    case 'alert':{
      // Routes needing attention: suspended, low load factor, negative profit, price adjusted, plane changed
      return allRoutes.filter(r=>{
        if(r.suspended) return true;
        if(r._priceAdjusted||r._planeChanged) return true;
        if(!r.isNew&&r.profit<0) return true;
        if(!r.isNew&&r.loadFactor<0.4) return true;
        return false;
      });
    }
    default:
      return allRoutes;
  }
}

function buildRouteSummaryItem(r){
  const a=getCity(r.from),b=getCity(r.to);
  if(r.suspended){
    return `<div class="route-item" onclick="openRouteDetail('${r.from}','${r.to}')" style="opacity:0.5"><div style="display:flex;justify-content:space-between"><span>${a.name} → ${b.name}</span><span style="color:#f87171;font-weight:700;font-size:12px">停飞中</span></div><div style="color:#556;font-size:11px">暂停运营 | 票价 $${r.price}</div></div>`;
  }
  if(r._reopened){
    return `<div class="route-item" onclick="openRouteDetail('${r.from}','${r.to}')"><div style="display:flex;justify-content:space-between"><span>${a.name} → ${b.name}</span><span style="color:#60a5fa;font-weight:700">reopen</span></div><div style="color:#556;font-size:11px">恢复运营 | 票价 $${r.price}</div></div>`;
  }
  if(r.isNew){
    return `<div class="route-item" onclick="openRouteDetail('${r.from}','${r.to}')"><div style="display:flex;justify-content:space-between"><span>${a.name} → ${b.name}</span><span style="color:#fbbf24;font-weight:700">new</span></div><div style="color:#556;font-size:11px">新开通 | 票价 $${r.price}</div></div>`;
  }
  const displayProfit=r._priceAdjusted||r._planeChanged?r._lastProfit:r.profit;
  const displayLf=r._priceAdjusted||r._planeChanged?r._lastLf:r.loadFactor;
  const color=displayProfit>=0?'#4ade80':'#f87171';
  const changeIcon=r._priceAdjusted||r._planeChanged?'<span style="color:#fbbf24;font-size:9px">🔄</span>':'';
  // Alert-specific: show reason
  let alertTag='';
  if(r._priceAdjusted) alertTag='<span style="color:#fbbf24;font-size:10px;margin-left:4px">调价</span>';
  else if(r._planeChanged) alertTag='<span style="color:#d97706;font-size:10px;margin-left:4px">换机</span>';
  else if(r.profit<0) alertTag='<span style="color:#f87171;font-size:10px;margin-left:4px">亏损</span>';
  else if(r.loadFactor<0.4) alertTag='<span style="color:#f87171;font-size:10px;margin-left:4px">低客座</span>';
  return `<div class="route-item" onclick="openRouteDetail('${r.from}','${r.to}')"><div style="display:flex;justify-content:space-between"><span>${a.name} → ${b.name}${alertTag}</span><span style="color:${color}">${fmt(displayProfit)}${changeIcon}</span></div><div style="color:#556;font-size:11px">客座率 ${fmtPct(displayLf*100)} | 票价 $${r.price}</div></div>`;
}

// ===== ROUTE CREATE INFO (right panel) =====
function showRouteCreateInfo(cityFrom,cityTo){
  const sec=$('panel-route-create');const info=$('route-create-info');
  if(!sec||!info)return;
  sec.style.display='';
  const fromIsBase=isBase(cityFrom.id);
  if(!cityTo){
    info.innerHTML=`<div style="font-size:13px"><div style="margin-bottom:6px"><span style="color:#7ba3cc">起飞：</span><span style="color:#e0e8f0;font-weight:700">${cityFrom.name}</span>${!fromIsBase?'<span style="color:#f87171;font-size:11px;margin-left:6px">（非基地）</span>':''}</div><div style="color:#556">点击地图选择到达城市${!fromIsBase?'（仅查看距离，无法开通航线）':''}</div></div>`;
  } else {
    const d=cityDist(cityFrom,cityTo);
    info.innerHTML=`<div style="font-size:13px"><div style="margin-bottom:4px"><span style="color:#7ba3cc">起飞：</span><span style="color:#e0e8f0;font-weight:700">${cityFrom.name}</span>${!fromIsBase?'<span style="color:#f87171;font-size:11px;margin-left:6px">（非基地）</span>':''}</div><div style="margin-bottom:4px"><span style="color:#7ba3cc">到达：</span><span style="color:#e0e8f0;font-weight:700">${cityTo.name}</span></div><div style="color:#7ba3cc">距离：${Math.round(d)} km</div>${!fromIsBase?'<div style="color:#f87171;font-size:11px;margin-top:4px">起飞城市非基地，无法开通航线</div>':''}</div>`;
  }
}
function hideRouteCreateInfo(){
  const sec=$('panel-route-create');if(sec)sec.style.display='none';
}
