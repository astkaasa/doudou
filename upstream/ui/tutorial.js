function updateOnboarding(){
  if(!G||G.gameOver){const h=$('onboard-hint');if(h)h.style.display='none';return;}
  const h=$('onboard-hint');
  if(!h)return;
  const step=ONBOARD_STEPS.find(s=>s.trigger());
  if(step){
    h.style.display='block';
    h.querySelector('.hint-title').textContent=step.title;
    h.querySelector('.hint-body').textContent=step.body;
    h.querySelector('.hint-step').textContent='新手引导';
  }else{
    h.style.display='none';
  }
}

// ===== TUTORIAL / START =====
function initTutorial(){
  const eraSel=$('era-select');
  ERAS.forEach((era,i)=>{
    const card=document.createElement('div');
    card.className='era-card'+(i===2?' selected':'');
    card.innerHTML=`<div class="era-name">${era.name}</div><div class="era-desc">${era.desc}</div><div class="era-detail">${era.detail}</div>`;
    card.onclick=()=>{
      eraSel.querySelectorAll('.era-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      selectedEra=era.id;
    };
    eraSel.appendChild(card);
  });
  selectedEra=ERAS[2].id;
}

function tutorialNextStep(){
  if(!selectedEra){showBanner('请先选择时代剧本','#d97706');return;}
  G=initState(null,selectedEra);
  G.companyName=$('company-name').value.trim()||'豆豆航空';
  hqSelectMode=true;
  selectedHQ=null;
  $('app').classList.add('hq-selecting');
  $('tutorial').style.display='none';
  applySeasonTheme();renderMap();updateHUD();renderPanel();
  const banner=document.createElement('div');
  banner.id='hq-banner';
  banner.innerHTML=`
    <div class="hq-title">📍 选择总部城市</div>
    <div class="hq-hint">点击左侧地图上的城市选择你的航空公司总部</div>
    <div id="hq-selected-info" class="hq-selected" style="display:none">已选择: <span id="hq-selected-name" class="hq-name"></span></div>
    <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;pointer-events:auto;flex-wrap:wrap">
      <button class="btn" style="background:#334155;color:#e0e8f0;padding:8px 20px" onclick="cancelHQSelect()">← 返回</button>
      <button class="btn btn-success" id="hq-confirm-btn" style="padding:8px 32px;display:none" onclick="confirmHQAndStart()">确认起飞！</button>
    </div>
  `;
  document.body.appendChild(banner);
  $('bottom-hint').textContent='点击地图上的城市选择总部';
}

function cancelHQSelect(){
  const banner=$('hq-banner');if(banner)banner.remove();
  hqSelectMode=false;
  $('app').classList.remove('hq-selecting');
  G=null;
  $('tutorial').style.display='';
}

function confirmHQAndStart(){
  if(!selectedHQ){showBanner('请先选择总部城市','#d97706');return;}
  startGame();
}

function loadGameFromHQ(){
  const raw=localStorage.getItem('skyline_save');
  if(!raw){showBanner('没有找到存档','#d97706');return;}
  // Close HQ banner first
  const banner=$('hq-banner');if(banner)banner.remove();
  hqSelectMode=false;
  $('app').classList.remove('hq-selecting');
  loadGame();
}

function backToMenu(){
  showModal(`<h2 style="color:#fbbf24">🏠 返回主菜单</h2>
    <p style="color:#94a3b8;margin:12px 0;line-height:1.6">返回主菜单后，当前未保存的进度将丢失。<br>建议先点击"💾 存档"保存游戏。</p>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:18px">
      <button class="btn" style="background:#334155;color:#e0e8f0;padding:8px 24px" onclick="closeModal()">取消</button>
      <button class="btn btn-danger" style="padding:8px 24px" onclick="confirmBackToMenu()">确认返回</button>
    </div>`);
}
function confirmBackToMenu(){
  closeModal();
  // Reset game state
  G=null;hqSelectMode=false;selectedHQ=null;
  $('app').classList.remove('hq-selecting');
  const banner=$('hq-banner');if(banner)banner.remove();
  // Close any open modals
  $('modal-root').innerHTML='';
  $('delivery-root').innerHTML='';
  $('event-banner').style.display='none';
  const traitOverlay=$('trait-overlay');if(traitOverlay)traitOverlay.remove();
  // Reset HUD trait badge
  const badge=$('hud-trait-badge');if(badge)badge.style.display='none';
  // Show tutorial screen
  $('tutorial').style.display='';
  // Reset HUD
  const hudTurn=$('hud-turn');if(hudTurn){hudTurn.textContent='';}
  // Re-init era selection
  const eraSel=$('era-select');
  eraSel.innerHTML='';
  initTutorial();
  renderMap();
}

function loadGameFromTutorial(){
  const raw=localStorage.getItem('skyline_save');
  if(!raw){showBanner('没有找到存档','#d97706');return;}
  loadGame();
}

// ===== SAVE MIGRATION =====
function migrateSave(data){
  const g=data.g;
  const defaults={loan:0,loanRate:LOAN_RATE,disasterRegions:[],branches:[],branchesConstructing:[],deliveredThisTurn:[],redPacketClaimed:false,_newsUsedPerYear:{},consecutiveProfit:0,lastNewspaperHtml:'',leaseExpiredThisTurn:[],playerTrait:null,traitChosen:false,_lastTraitFund:0,_lastBranchCompleted:[],milestones:{}};
  Object.entries(defaults).forEach(([k,v])=>{if(g[k]===undefined)g[k]=typeof v==='object'?JSON.parse(JSON.stringify(v)):v;});
  // Ensure cityStates exists for old saves
  if(!g.cityStates){g.cityStates=initCityStates(g.era);}
  if(g.routes)g.routes.forEach(r=>{
    const rDefaults={isNew:false,_priceAdjusted:false,_planeChanged:false,_lastLf:r.loadFactor||0,_lastProfit:r.profit||0,suspended:false,_reopened:false};
    Object.entries(rDefaults).forEach(([k,v])=>{if(r[k]===undefined)r[k]=v;});
  });
  // Patch old saves: fleet planes missing 'type' field
  if(g.fleet)g.fleet.forEach(p=>{
    if(!p.type&&p.templateId&&typeof PLANE_MAP!=='undefined'){
      const t=PLANE_MAP[p.templateId];
      if(t)p.type=t.type;
    }
  });
  delete g.tech;delete g.techResearch;delete g.achievements;
  return data;
}

// ===== SAVE / LOAD =====
function saveGame(){
  if(!G){showBanner('游戏尚未开始，无法存档','#dc2626');return;}
  try{
    const saveData=JSON.stringify({v:8,ts:Date.now(),g:G});
    localStorage.setItem('skyline_save',saveData);
    let slots=JSON.parse(localStorage.getItem('skyline_slots')||'[]');
    const info={ts:Date.now(),company:G.companyName,year:G.year,quarter:G.quarter,cash:G.cash,routes:G.routes.length,fleet:G.fleet.length};
    slots=[info];
    localStorage.setItem('skyline_slots',JSON.stringify(slots));
    showBanner('存档保存成功！('+G.year+' Q'+G.quarter+')','#16a34a');
  }catch(e){showBanner('存档失败：'+e.message,'#dc2626');}
}
function loadGame(){
  try{
    const raw=localStorage.getItem('skyline_save');
    if(!raw){showBanner('没有找到存档','#d97706');return;}
    const data=JSON.parse(raw);
    if(!data.g){showBanner('存档格式无效','#dc2626');return;}
    migrateSave(data);
    G=data.g;
    rebuildFleetMap();
    // Center map horizontally on HQ city
    const hqCity=getCity(G.hq);
    if(hqCity)G.mapPanX=((500-_rx(hqCity)*1000)%1000+1000)%1000;
    hqSelectMode=false;
    $('app').classList.remove('hq-selecting');
    $('tutorial').style.display='none';
    applySeasonTheme();renderMap();updateHUD();renderPanel();
    // Restore newspaper & report re-read buttons
    if(G.newsItems&&G.newsItems.length>0){const nb=$('reread-news-btn');if(nb)nb.style.display='';}
    if(G._lastReportData){const rb=$('reread-report-btn');if(rb)rb.style.display='';}
    showBanner('存档已载入！'+G.companyName+' - '+G.year+' Q'+G.quarter,'#16a34a');
  }catch(e){showBanner('读档失败：'+e.message,'#dc2626');}
}

function startGame(){
  const hq=selectedHQ||'beijing';
  const name=$('company-name')?($('company-name').value.trim()||'豆豆航空'):'豆豆航空';
  const era=selectedEra||'era1';
  G=initState(hq,era);
  G.companyName=name;
  const ap=getAvailablePlanes();
  const starterPlane=ap.find(p=>p.type==='narrow')||ap[0]||PLANES[0];
  G.fleet.push({...starterPlane,uid:G.planeIdCounter++,age:0,isLease:false,leasePrice:0,delivering:false,deliverIn:0,leaseTurns:0,maxLeaseTurns:MAX_LEASE_TURNS});
  G.fleet.push({...starterPlane,uid:G.planeIdCounter++,age:2,isLease:false,leasePrice:0,delivering:false,deliverIn:0,leaseTurns:0,maxLeaseTurns:MAX_LEASE_TURNS});
  rebuildFleetMap();
  G.ai.forEach(ai=>{for(let i=0;i<3;i++){const ap=getAvailablePlanes();const template=ap.length>0?ap[i<2?0:Math.min(ap.length-1,Math.floor(ap.length/2))]:PLANES[0];ai.fleet.push({uid:ai.name+'_'+i,...template,age:randInt(1,5),assigned:false});}});
  hqSelectMode=false;
  $('app').classList.remove('hq-selecting');
  const banner=$('hq-banner');if(banner)banner.remove();
  $('tutorial').style.display='none';
  // Center map on HQ city
  const hqCity=getCity(hq);
  if(hqCity){G.mapPanX=((500-_rx(hqCity)*1000)%1000+1000)%1000;}
  applySeasonTheme();renderMap();updateHUD();renderPanel();updateOnboarding();
  // Show player trait envelope on first turn
  showTraitEnvelope();
}
