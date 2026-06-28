function openFleetPanel(){
  uiState.fleetSort={key:'name',dir:'asc'};
  uiState.fleetPage=0;
  uiState.fleetPageSize=10;
  renderFleetPanel();
}
function toggleFleetSort(key){
  if(uiState.fleetSort.key===key)uiState.fleetSort.dir=uiState.fleetSort.dir==='asc'?'desc':'asc';
  else{uiState.fleetSort.key=key;uiState.fleetSort.dir='asc';}
  uiState.fleetPage=0;
  renderFleetPanel();
}
function renderFleetPanel(){
  if(!uiState.fleetFilter)uiState.fleetFilter='all';
  if(!uiState.fleetMakerFilter)uiState.fleetMakerFilter='all';
  if(G.fleet.length===0){showModal(`<h2>机队管理</h2><p style="color:#556">尚未拥有飞机，请先购买。</p><div style="margin-top:12px;text-align:right"><button class="btn" style="background:var(--c-bg-panel);color:var(--c-text)" onclick="closeModal()">关闭</button></div>`);return;}
  const makerMap={'b':'波音','dc':'麦道','md':'麦道','a':'空客','il':'伊留申','tv':'图波列夫','l':'洛克希德'};
  function getMaker(templateId){if(!templateId)return '其他';for(const[k,v]of Object.entries(makerMap)){if(templateId.startsWith(k))return v;}return '其他';}
  let filteredRows=uiState.fleetFilter==='all'?G.fleet:G.fleet.filter(p=>uiState.fleetFilter==='buy'?!p.isLease:p.isLease);
  if(uiState.fleetMakerFilter!=='all')filteredRows=filteredRows.filter(p=>getMaker(p.templateId)===uiState.fleetMakerFilter);
  const makerCounts={};makerCounts['all']=filteredRows.length;
  G.fleet.forEach(p=>{const m=getMaker(p.templateId);makerCounts[m]=(makerCounts[m]||0)+1;});
  const rows=filteredRows.map(p=>{
    const assignedRoute=G.routes.find(r=>r.assignedPlanes.includes(p.uid));
    let routeName='--',routeDist=0,routeProfitDisplay='<span style="color:#6b7280">--</span>';
    if(assignedRoute){
      const a=getCity(assignedRoute.from),b=getCity(assignedRoute.to);
      const suspendedTag=assignedRoute.suspended?'<span style="color:#f87171;font-size:10px;margin-left:4px;font-weight:700">停飞中</span>':'';
      routeName=`${a.name}→${b.name}${suspendedTag}`;
      routeDist=Math.round(cityDist(a,b));
      if(assignedRoute.suspended){
        routeProfitDisplay='<span style="color:#6b7280">--</span>';
      } else if(assignedRoute._reopened){
        routeProfitDisplay='<span style="color:#60a5fa;font-weight:700;font-size:13px">reopen</span>';
      } else if(assignedRoute.isNew){
        routeProfitDisplay='<span style="color:#fbbf24;font-weight:700;font-size:13px">new</span>';
      } else if(assignedRoute.priceAdjusted||assignedRoute.planeChanged){
        const lp=assignedRoute.lastProfit||0;
        const cls=lp>=0?'profit-pos':'profit-neg';
        const trend=assignedRoute.profit>(assignedRoute.lastProfit||0)?'📈':assignedRoute.profit<(assignedRoute.lastProfit||0)?'📉':'📊';
        routeProfitDisplay=`<span class="${cls}">${fmt(lp)}</span><span style="font-size:10px;margin-left:2px">${trend}</span>`;
      } else {
        const cls=assignedRoute.profit>=0?'profit-pos':'profit-neg';
        routeProfitDisplay=`<span class="${cls}">${fmt(assignedRoute.profit)}</span>`;
      }
    }
    let valueStr;
    if(p.isLease){
      valueStr=`租${p.leaseTurns}/${p.maxLeaseTurns}季`;
    } else {
      const val=p.buyPrice*Math.max(0.15,1-p.age*PLANE_SELL_AGE_FACTOR);
      valueStr=fmt(val);
    }
    return {
      name:p.name+(p.isLease?`<span style="font-size:12px;color:#fbbf24"> [R]</span>`:''),
      nameRaw:p.name,
      age:p.age,
      ageStr:p.age.toFixed(1)+'年',
      valueStr,
      isLease:p.isLease,
      buyPrice:p.buyPrice||0,
      routeName,
      routeDist,
      routeProfitDisplay,
      routeProfit: assignedRoute?assignedRoute.profit:0,
      uid:p.uid,
      delivering:p.delivering,
      deliverIn:p.deliverIn||0,
      assignedRoute:!!assignedRoute,
    };
  });
  const key=uiState.fleetSort.key;
  const dir=uiState.fleetSort.dir==='asc'?1:-1;
  rows.sort((a,b)=>(a[key]>b[key]?1:a[key]<b[key]?-1:0)*dir);
  const total=rows.length;
  const totalPages=Math.max(1,Math.ceil(total/uiState.fleetPageSize));
  uiState.fleetPage=clamp(uiState.fleetPage,0,totalPages-1);
  const start=uiState.fleetPage*uiState.fleetPageSize;
  const pageRows=rows.slice(start,start+uiState.fleetPageSize);
  const cols=[
    {key:'name',icon:'✈',label:'飞机型号'},
    {key:'age',icon:'📅',label:'机龄'},
    {key:'buyPrice',icon:'💎',label:'飞机价值'},
    {key:'routeName',icon:'🛫',label:'执飞航线'},
    {key:'routeDist',icon:'📏',label:'航线距离'},
    {key:'routeProfit',icon:'📈',label:'航线收益'},
  ];
  let html=`<h2>机队管理</h2>
    <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--c-muted);margin-right:2px">来源</span>
      <button class="btn btn-sm" style="${uiState.fleetFilter==='all'?'background:var(--c-primary);color:#fff':'background:var(--c-bg-panel);color:var(--c-text)'};padding:3px 12px;font-size:12px" onclick="uiState.fleetFilter='all';uiState.fleetPage=0;renderFleetPanel()">全部 (${G.fleet.length})</button>
      <button class="btn btn-sm" style="${uiState.fleetFilter==='buy'?'background:var(--c-primary);color:#fff':'background:var(--c-bg-panel);color:var(--c-text)'};padding:3px 12px;font-size:12px" onclick="uiState.fleetFilter='buy';uiState.fleetPage=0;renderFleetPanel()">购买 (${G.fleet.filter(p=>!p.isLease).length})</button>
      <button class="btn btn-sm" style="${uiState.fleetFilter==='lease'?'background:var(--c-primary);color:#fff':'background:var(--c-bg-panel);color:var(--c-text)'};padding:3px 12px;font-size:12px" onclick="uiState.fleetFilter='lease';uiState.fleetPage=0;renderFleetPanel()">租赁 (${G.fleet.filter(p=>p.isLease).length})</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:10px;align-items:center;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--c-muted);margin-right:2px">厂商</span>
      <button class="btn btn-sm" style="${uiState.fleetMakerFilter==='all'?'background:var(--c-primary);color:#fff':'background:var(--c-bg-panel);color:var(--c-text)'};padding:3px 12px;font-size:12px" onclick="uiState.fleetMakerFilter='all';uiState.fleetPage=0;renderFleetPanel()">全部</button>
      ${Object.entries(makerMap).reduce((acc,[k,v])=>{if(!acc.find(x=>x[0]===v))acc.push([v,makerCounts[v]||0]);return acc;},[]).map(([name,cnt])=>cnt>0?`<button class="btn btn-sm" style="${uiState.fleetMakerFilter===name?'background:var(--c-primary);color:#fff':'background:var(--c-bg-panel);color:var(--c-text)'};padding:3px 12px;font-size:12px" onclick="uiState.fleetMakerFilter='${name}';uiState.fleetPage=0;renderFleetPanel()">${name} (${cnt})</button>`:'').join('')}
    </div>
    <div style="overflow-x:auto">
    <table class="route-table" style="font-size:14px">
      <thead><tr>`;
  cols.forEach(c=>{
    const cls=uiState.fleetSort.key===c.key?(uiState.fleetSort.dir==='asc'?'sorted-asc':'sorted-desc'):'';
    html+=`<th class="${cls}" onclick="toggleFleetSort('${c.key}')" title="${c.label}">${c.icon} <span style="font-size:10px">${c.label}</span></th>`;
  });
  html+=`<th style="cursor:default" title="操作">操作</th></tr></thead><tbody>`;
  pageRows.forEach(r=>{
    const profitCls=r.routeProfit>=0?'profit-pos':'profit-neg';
    const distStr=r.routeDist>0?r.routeDist+'km':'--';
    const profitStr=r.assignedRoute?fmt(r.routeProfit):'--';
    const valColor=r.isLease?'var(--c-warning)':'var(--c-text)';
    let statusBadge='';
    if(r.delivering)statusBadge=`<span style="color:var(--c-warning);font-size:10px;margin-left:4px">交付${r.deliverIn}回合</span>`;
    html+=`<tr>
      <td style="font-weight:600">${r.name}${statusBadge}</td>
      <td>${r.delivering?'--':r.ageStr}</td>
      <td style="color:${valColor}">${r.delivering?'--':r.valueStr}</td>
      <td>${r.delivering?'交付中':r.routeName}</td>
      <td>${r.delivering?'--':distStr}</td>
      <td>${r.delivering?'--':r.routeProfitDisplay}</td>
      <td style="white-space:nowrap">${!r.delivering&&!r.assignedRoute?`<button class="btn btn-sm" style="background:var(--c-danger);color:#fff;padding:2px 8px;font-size:11px" onclick="${r.isLease?`returnLease(${r.uid})`:`sellPlane(${r.uid})`}">${r.isLease?'退租':'出售'}</button>`:''}</td>
    </tr>`;
  });
  html+=`</tbody></table></div>`;
  html+=`<div class="route-page-info">
    <div>
      <span>第 ${uiState.fleetPage+1}/${totalPages} 页</span>
      <button class="btn btn-sm" style="background:var(--c-bg-panel);color:var(--c-text);padding:1px 8px;font-size:11px;margin-left:6px" onclick="uiState.fleetPage=0;renderFleetPanel()">首</button>
      <button class="btn btn-sm" style="background:var(--c-bg-panel);color:var(--c-text);padding:1px 8px;font-size:11px" onclick="uiState.fleetPage=Math.max(0,uiState.fleetPage-1);renderFleetPanel()">‹</button>
      <button class="btn btn-sm" style="background:var(--c-bg-panel);color:var(--c-text);padding:1px 8px;font-size:11px" onclick="uiState.fleetPage=Math.min(${totalPages-1},uiState.fleetPage+1);renderFleetPanel()">›</button>
      <button class="btn btn-sm" style="background:var(--c-bg-panel);color:var(--c-text);padding:1px 8px;font-size:11px" onclick="uiState.fleetPage=${totalPages-1};renderFleetPanel()">末</button>
    </div>
    <div>
      <span>每页</span>
      <button class="btn btn-sm" style="${uiState.fleetPageSize===10?'background:var(--c-primary);color:#fff':'background:var(--c-bg-panel);color:var(--c-text)'};padding:1px 8px;font-size:11px;margin-left:4px" onclick="uiState.fleetPageSize=10;uiState.fleetPage=0;renderFleetPanel()">10</button>
      <button class="btn btn-sm" style="${uiState.fleetPageSize===20?'background:var(--c-primary);color:#fff':'background:var(--c-bg-panel);color:var(--c-text)'};padding:1px 8px;font-size:11px;margin-left:4px" onclick="uiState.fleetPageSize=20;uiState.fleetPage=0;renderFleetPanel()">20</button>
    </div>
  </div>`;
  html+=`<div style="margin-top:8px;text-align:right"><button class="btn" style="background:var(--c-bg-panel);color:var(--c-text)" onclick="closeModal()">关闭</button></div>`;
  $('modal-root').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="position:relative;max-width:900px;min-width:700px">${html}</div></div>`;
}

function sellPlane(uid){const plane=G.fleetMap[uid];if(!plane)return;const sellPrice=plane.buyPrice*Math.max(0.15,1-plane.age*PLANE_SELL_AGE_FACTOR);G.cash+=sellPrice;G.fleet=G.fleet.filter(p=>p.uid!==uid);rebuildFleetMap();G.routes.forEach(r=>{r.assignedPlanes=r.assignedPlanes.filter(id=>id!==uid);});updateRouteMetrics();emit('fleet:changed',{action:'sell',planeName:plane.name,sellPrice});renderFleetPanel();}
function returnLease(uid){const plane=G.fleetMap[uid];if(!plane)return;G.fleet=G.fleet.filter(p=>p.uid!==uid);rebuildFleetMap();G.routes.forEach(r=>{r.assignedPlanes=r.assignedPlanes.filter(id=>id!==uid);});updateRouteMetrics();emit('fleet:changed',{action:'returnLease',planeName:plane.name});renderFleetPanel();}
