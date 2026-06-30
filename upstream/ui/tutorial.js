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

// ===== MENU VIEW STATE =====
let menuView = 'main'; // 'main' | 'era' | 'save' | 'credits'
let _lastCompanyName = '豆豆航空'; // 会话级缓存，L2↔L1往返不丢失
let _creditsAutoScrollTimer = null;
let _creditsAutoScrollRaf = null;

// ===== 背景地图渲染（完整地图，自动裁剪，永不越界） =====
function renderMenuMapBG(){
  const bg = $('menu-map-bg');
  if(!bg) return;
  // 策略：viewBox 固定为 [0,0,1000,500]，显示完整地图图像范围
  // preserveAspectRatio="xMidYMid slice" 会根据窗口宽高比自动裁剪多余部分
  // 这样 viewBox 永远不会超出图像边界，杜绝越界色块
  // 三张地图图片水平拼接（x=-1000, 0, 1000）实现无缝水平环绕
  bg.innerHTML = `<svg viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%">
    <rect x="-1000" y="0" width="3000" height="500" fill="#0a1225"/>
    <image x="-1000" width="1000" height="500" preserveAspectRatio="none" href="${_MAP_SRC}"/>
    <image x="0" width="1000" height="500" preserveAspectRatio="none" href="${_MAP_SRC}"/>
    <image x="1000" width="1000" height="500" preserveAspectRatio="none" href="${_MAP_SRC}"/>
  </svg>`;
}

// ===== L1 — 主菜单 =====
function showMainMenu(){
  menuView = 'main';
  stopCreditsAutoScroll();
  // 隐藏游戏主界面（HUD/地图/面板/底栏），仅展示世界地图背景
  $('app').style.display = 'none';
  const obh = $('onboard-hint'); if(obh) obh.style.display = 'none';
  // 显示标题
  const title = $('menu-game-title');
  if(title) title.style.display = '';
  $('menu-box').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;align-items:center;margin-top:8px">
      <button class="btn menu-btn-start" onclick="showEraSelect()">开始游戏</button>
      <div style="text-align:center">
        <button class="btn menu-btn-continue" onclick="showSaveSelect()">继续游戏</button>
        ${(() => {
          let sp = '';
          if(localStorage.getItem('skyline_save')){
            try{
              const slots = JSON.parse(localStorage.getItem('skyline_slots')||'[]');
              if(slots.length > 0){ const s = slots[0]; sp = `<div style="font-size:11px;color:#7ba3cc;margin-top:2px">${s.company} · ${s.year} Q${s.quarter}</div>`; }
            }catch(e){}
          }
          return sp;
        })()}
      </div>
      <button class="btn menu-btn-credits" onclick="showCredits()">共筑航梦</button>
    </div>
    <div style="margin-top:20px;text-align:center">
      <span class="ver-badge" onclick="showVersionLog()">Version：<span id="ver-num"></span> 📋</span>
    </div>
  `;
  const vn = $('ver-num');
  if(vn) vn.textContent = typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '?';
}

// ===== L2 分支1 — 开始游戏 → 时代剧本 =====
function showEraSelect(){
  menuView = 'era';
  stopCreditsAutoScroll();
  let eraCards = '';
  if(typeof ERAS !== 'undefined'){
    ERAS.forEach((era,i) => {
      const sel = (selectedEra === era.id) ? ' selected' : (i === 2 && !selectedEra ? ' selected' : '');
      eraCards += `<div class="era-card${sel}" onclick="selectEraCard(this,'${era.id}')"><div class="era-name">${era.name}</div><div class="era-desc">${era.desc}</div><div class="era-detail">${era.detail}</div></div>`;
    });
    if(!selectedEra) selectedEra = ERAS[2].id;
  }
  $('menu-box').innerHTML = `
    <button class="menu-back-btn" onclick="showMainMenu()">返回主菜单</button>
    <div style="font-size:16px;font-weight:700;color:#e0e8f0;margin-bottom:12px">选择时代剧本</div>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap" id="era-select">${eraCards}</div>
    <p style="font-size:12px;color:#556;margin-top:12px">为你的航空公司命名：</p>
    <input type="text" id="company-name" value="${_lastCompanyName}" placeholder="输入公司名称" maxlength="20" oninput="_lastCompanyName=this.value">
    <div style="margin-top:20px;text-align:center">
      <button class="btn menu-btn-start" onclick="tutorialNextStep()">确认起飞</button>
    </div>
  `;
}

function selectEraCard(el, eraId){
  const eraSel = $('era-select');
  if(!eraSel) return;
  eraSel.querySelectorAll('.era-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedEra = eraId;
}

// ===== L2 分支2 — 继续游戏 → 选择存档 =====
function showSaveSelect(){
  menuView = 'save';
  stopCreditsAutoScroll();
  const hasSave = !!localStorage.getItem('skyline_save');
  let content = '';
  if(hasSave){
    try{
      const slots = JSON.parse(localStorage.getItem('skyline_slots')||'[]');
      if(slots.length > 0){
        slots.forEach((s,i) => {
          const cashStr = typeof fmt === 'function' ? fmt(s.cash) : ('$'+s.cash+'M');
          const timeStr = fmtSaveTime(s.ts);
          content += `
            <div class="save-card${i===0?' selected':''}" onclick="selectSaveCard(this)">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:15px;font-weight:700;color:#fbbf24">✈ ${s.company}</div>
                <div style="font-size:13px;color:#7ba3cc;font-family:monospace">${s.year} Q${s.quarter}</div>
              </div>
              <div style="font-size:13px;color:#c0d0e0;margin-top:6px">${cashStr} · ${s.routes}航线 · ${s.fleet}架飞机</div>
              <div style="font-size:11px;color:#556;margin-top:4px">保存于 ${timeStr}</div>
            </div>
          `;
        });
        content += `<div style="margin-top:16px;text-align:center"><button class="btn menu-btn-continue" onclick="loadGame()" style="min-width:160px">继续游戏</button></div>`;
      }else{
        content = renderEmptySave();
      }
    }catch(e){
      content = renderEmptySave();
    }
  }else{
    content = renderEmptySave();
  }
  $('menu-box').innerHTML = `
    <button class="menu-back-btn" onclick="showMainMenu()">返回主菜单</button>
    <div style="font-size:16px;font-weight:700;color:#e0e8f0;margin-bottom:12px">选择存档</div>
    ${content}
  `;
}

function renderEmptySave(){
  return `
    <div style="text-align:center;padding:40px 0">
      <div style="font-size:16px;color:#94a3b8;margin-bottom:8px">暂无存档</div>
      <div style="font-size:13px;color:#556;margin-bottom:20px">点击下方按钮开始一段新的航程</div>
      <button class="btn menu-btn-start" onclick="showEraSelect()">开始新游戏</button>
    </div>
  `;
}

function selectSaveCard(el){
  document.querySelectorAll('.save-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function fmtSaveTime(ts){
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ===== L2 分支3 — 共筑航梦 → 致谢名单 =====
function showCredits(){
  menuView = 'credits';
  // 第一章 · 起飞 — 开发致谢（合并contributors，逐行展示）
  let ch1 = '';
  if(typeof CREDITS !== 'undefined'){
    ch1 = `<div class="credits-section">开发致谢</div>`;
    if(CREDITS.contributors && CREDITS.contributors.length > 0){
      CREDITS.contributors.forEach(n => {
        ch1 += `<div class="credits-name-line">· ${n}</div>`;
      });
    }
  }
  // 第二章 · 航路
  let ch2 = '';
  if(typeof CREDITS !== 'undefined' && CREDITS.inspirations){
    ch2 = `<div class="credits-section">灵感致敬</div>`;
    CREDITS.inspirations.forEach(ins => {
      ch2 += `<div class="credits-item">· ${ins.name} <span style="color:#556">(${ins.platform}, ${ins.year})</span></div>`;
      ch2 += `<div style="font-size:12px;color:#94a3b8;margin:4px 0 6px 16px;line-height:1.5">${ins.desc}</div>`;
    });
  }
  // 第三章 · 乘组（读取 TRAIT_INFO）
  let ch3 = '';
  if(typeof TRAIT_INFO !== 'undefined'){
    ch3 = `<div class="credits-section">天赋角色</div>`;
    const traitQuotes = {
      '辣': '"天上不会掉馅饼？那我就自己撒！"',
      '机': '"修飞机这事，我有诀窍。"',
      '豆': '"省下的每一滴油，都是利润。"'
    };
    Object.entries(TRAIT_INFO).forEach(([key, info]) => {
      ch3 += `<div class="credits-item" style="margin-bottom:6px">· <span style="color:${info.color};font-weight:600">${info.name}</span> — ${info.desc}</div>`;
      ch3 += `<div style="font-size:12px;font-style:italic;color:#94a3b8;margin:0 0 8px 16px">${traitQuotes[key]||''}</div>`;
    });
  }
  // 第四章 · 远航
  let ch4 = `
    <div class="credits-section">鸣谢玩家</div>
    <div style="font-size:13px;color:#c0d0e0;line-height:1.8">
      感谢每一位飞行员——<br>
      你的每一次起飞、每一条航线、每一个决策，<br>
      都在书写属于自己的航空传奇。<br>
      <span style="color:#fbbf24;font-weight:600">空豆霸业因你而精彩。</span>
    </div>
  `;

  // 返回按钮放在右上角（与其他L2一致），底部不再重复
  $('menu-box').innerHTML = `
    <button class="menu-back-btn" onclick="showMainMenu()">返回主菜单</button>
    <div style="font-size:16px;font-weight:700;color:#e0e8f0;margin-bottom:12px;text-align:center">共筑航梦</div>
    <div class="credits-scroll" id="credits-scroll">
      <div class="credits-chapter">
        <div class="credits-title">══ 第一章 · 起飞 ══</div>
        <div class="credits-quote">"每一家伟大的航空公司，<br>都始于一个关于天空的梦。"</div>
        ${ch1}
      </div>
      <div class="credits-chapter">
        <div class="credits-title">══ 第二章 · 航路 ══</div>
        <div class="credits-quote">"没有前人铺就的跑道，<br>就没有我们起飞的可能。"</div>
        ${ch2}
      </div>
      <div class="credits-chapter">
        <div class="credits-title">══ 第三章 · 乘组 ══</div>
        <div class="credits-quote">"一架飞机能飞多远，<br>取决于驾驶舱里坐着谁。"</div>
        ${ch3}
      </div>
      <div class="credits-chapter">
        <div class="credits-title">══ 第四章 · 远航 ══</div>
        <div class="credits-quote">"最长的航线，飞向的是未来。"</div>
        ${ch4}
      </div>
    </div>
  `;
  // 启动自动缓慢向上滑动
  startCreditsAutoScroll();
}

// ===== 致谢页自动滚动（文本缓慢向上滑动） =====
function startCreditsAutoScroll(){
  stopCreditsAutoScroll();
  // 2秒后开始自动向上滑动
  _creditsAutoScrollTimer = setTimeout(() => {
    const el = $('credits-scroll');
    if(!el) return;
    // 用户交互时暂停
    const pauseAutoScroll = () => {
      stopCreditsAutoScroll();
      // 交互结束后3秒恢复自动向上滑动
      _creditsAutoScrollTimer = setTimeout(() => {
        if(menuView !== 'credits') return;
        _doCreditsScroll();
      }, 3000);
    };
    el.addEventListener('wheel', pauseAutoScroll, {passive:true});
    el.addEventListener('click', pauseAutoScroll);
    el.addEventListener('touchstart', pauseAutoScroll, {passive:true});
    _doCreditsScroll();
  }, 2000);
}

function _doCreditsScroll(){
  const el = $('credits-scroll');
  if(!el || menuView !== 'credits') return;
  const speed = 0.5; // 像素/帧，文本缓慢向上滑动
  function step(){
    if(menuView !== 'credits'){stopCreditsAutoScroll();return;}
    el.scrollTop += speed;
    // 到底停止
    if(el.scrollTop + el.clientHeight >= el.scrollHeight - 1){
      stopCreditsAutoScroll();
      return;
    }
    _creditsAutoScrollRaf = requestAnimationFrame(step);
  }
  _creditsAutoScrollRaf = requestAnimationFrame(step);
}

function stopCreditsAutoScroll(){
  if(_creditsAutoScrollTimer){clearTimeout(_creditsAutoScrollTimer);_creditsAutoScrollTimer=null;}
  if(_creditsAutoScrollRaf){cancelAnimationFrame(_creditsAutoScrollRaf);_creditsAutoScrollRaf=null;}
}

// ===== INIT TUTORIAL (now = show L1 main menu) =====
function initTutorial(){
  renderMenuMapBG();
  showMainMenu();
}

// ===== TUTORIAL NEXT STEP (start game → HQ select) =====
function tutorialNextStep(){
  if(!selectedEra){showBanner('请先选择时代剧本','#d97706');return;}
  const cnInput = $('company-name');
  if(cnInput) _lastCompanyName = cnInput.value.trim() || '豆豆航空';
  G = initState(null, selectedEra);
  G.companyName = _lastCompanyName;
  hqSelectMode = true;
  selectedHQ = null;
  $('app').style.display = '';  // 恢复游戏界面
  $('app').classList.add('hq-selecting');
  $('tutorial').style.display = 'none';
  stopCreditsAutoScroll();
  applySeasonTheme(); renderMap(); updateHUD(); renderPanel();
  const banner = document.createElement('div');
  banner.id = 'hq-banner';
  banner.innerHTML = `
    <div class="hq-title">📍 选择总部城市</div>
    <div class="hq-hint">点击左侧地图上的城市选择你的航空公司总部</div>
    <div id="hq-selected-info" class="hq-selected" style="display:none">已选择: <span id="hq-selected-name" class="hq-name"></span></div>
    <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;pointer-events:auto;flex-wrap:wrap">
      <button class="btn" style="background:#334155;color:#e0e8f0;padding:8px 20px" onclick="cancelHQSelect()">← 返回</button>
      <button class="btn btn-success" id="hq-confirm-btn" style="padding:8px 32px;display:none" onclick="confirmHQAndStart()">确认起飞！</button>
    </div>
  `;
  document.body.appendChild(banner);
  $('bottom-hint').textContent = '点击地图上的城市选择总部';
}

function cancelHQSelect(){
  const banner = $('hq-banner'); if(banner) banner.remove();
  hqSelectMode = false;
  $('app').classList.remove('hq-selecting');
  $('app').style.display = 'none';  // 回到菜单，隐藏游戏界面
  G = null;
  $('tutorial').style.display = '';
  renderMenuMapBG();
  showEraSelect();
}

function confirmHQAndStart(){
  if(!selectedHQ){showBanner('请先选择总部城市','#d97706');return;}
  startGame();
}

function loadGameFromHQ(){
  const raw = localStorage.getItem('skyline_save');
  if(!raw){showBanner('没有找到存档','#d97706');return;}
  const banner = $('hq-banner'); if(banner) banner.remove();
  hqSelectMode = false;
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
  G = null; hqSelectMode = false; selectedHQ = null;
  $('app').classList.remove('hq-selecting');
  const banner = $('hq-banner'); if(banner) banner.remove();
  $('modal-root').innerHTML = '';
  $('delivery-root').innerHTML = '';
  $('event-banner').style.display = 'none';
  const traitOverlay = $('trait-overlay'); if(traitOverlay) traitOverlay.remove();
  const badge = $('hud-trait-badge'); if(badge) badge.style.display = 'none';
  $('tutorial').style.display = '';
  const hudTurn = $('hud-turn'); if(hudTurn){hudTurn.textContent = '';}
  renderMenuMapBG();
  showMainMenu();  // showMainMenu 会隐藏 #app
}

function loadGameFromTutorial(){
  const raw = localStorage.getItem('skyline_save');
  if(!raw){showBanner('没有找到存档','#d97706');return;}
  loadGame();
}

// ===== SAVE MIGRATION =====
function migrateSave(data){
  const g=data.g;
  const defaults={loan:0,loanRate:LOAN_RATE,disasterRegions:[],branches:[],branchesConstructing:[],deliveredThisTurn:[],redPacketClaimed:false,_newsUsedPerYear:{},consecutiveProfit:0,lastNewspaperHtml:'',leaseExpiredThisTurn:[],playerTrait:null,traitChosen:false,_lastTraitFund:0,_lastBranchCompleted:[],milestones:{},stocks:{},portfolio:{},stockEvents:[],_lastStockDividend:0};
  Object.entries(defaults).forEach(([k,v])=>{if(g[k]===undefined)g[k]=typeof v==='object'?JSON.parse(JSON.stringify(v)):v;});
  if(!g.cityStates){g.cityStates=initCityStates(g.era);}
  if(g.routes)g.routes.forEach(r=>{
    const rDefaults={isNew:false,_priceAdjusted:false,_planeChanged:false,_lastLf:r.loadFactor||0,_lastProfit:r.profit||0,suspended:false,_reopened:false};
    Object.entries(rDefaults).forEach(([k,v])=>{if(r[k]===undefined)r[k]=v;});
  });
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
    const saveData=JSON.stringify({v:9,ts:Date.now(),g:G});
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
    const hqCity=getCity(G.hq);
    if(hqCity)G.mapPanX=((500-_rx(hqCity)*1000)%1000+1000)%1000;
    hqSelectMode=false;
    $('app').style.display = '';  // 恢复游戏界面
    $('app').classList.remove('hq-selecting');
    $('tutorial').style.display='none';
    stopCreditsAutoScroll();
    applySeasonTheme();renderMap();updateHUD();renderPanel();
    if(G.newsItems&&G.newsItems.length>0){const nb=$('reread-news-btn');if(nb)nb.style.display='';}
    if(G._lastReportData){const rb=$('reread-report-btn');if(rb)rb.style.display='';}
    showBanner('存档已载入！'+G.companyName+' - '+G.year+' Q'+G.quarter,'#16a34a');
  }catch(e){showBanner('读档失败：'+e.message,'#dc2626');}
}

function startGame(){
  const hq=selectedHQ||'beijing';
  const name=_lastCompanyName||'豆豆航空';
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
  $('app').style.display = '';  // 恢复游戏界面
  $('app').classList.remove('hq-selecting');
  const banner=$('hq-banner');if(banner)banner.remove();
  $('tutorial').style.display='none';
  stopCreditsAutoScroll();
  const hqCity=getCity(hq);
  if(hqCity){G.mapPanX=((500-_rx(hqCity)*1000)%1000+1000)%1000;}
  applySeasonTheme();renderMap();updateHUD();renderPanel();updateOnboarding();
  showTraitEnvelope();
}

// ===== VERSION LOG =====
function showVersionLog(){
  if(typeof VERSION_LOG==='undefined') return;

  const SECTIONS = [
    ['new',     '新功能',     '#fbbf24'],
    ['balance', '平衡调整',   '#4ade80'],
    ['fix',     '修复',       '#93c5fd'],
    ['ui',      '界面',       '#c084fc'],
  ];

  // 渲染所有版本条目
  let body = '';
  VERSION_LOG.forEach((entry, idx) => {
    // 版本分隔线（首个不加顶部分隔）
    if(idx > 0) body += `<div style="border-top:1px solid #1e3a5f;margin:18px 0"></div>`;
    // 版本号+日期标题
    body += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">`
          + `<span style="color:#fbbf24;font-weight:700;font-family:monospace;font-size:15px">v${entry.ver}</span>`
          + `<span style="font-size:11px;color:#556">${entry.date}</span>`
          + `</div>`;
    SECTIONS.forEach(([key, label, color]) => {
      const list = entry[key];
      if(!list || !list.length) return;
      body += `<div style="margin-bottom:10px">`
            + `<div style="font-weight:700;font-size:13px;color:${color};margin-bottom:4px">${label}</div>`;
      list.forEach(txt => {
        body += `<div style="font-size:12px;color:#c0d0e0;padding:2px 0 2px 14px;border-left:2px solid ${color}40">• ${txt}</div>`;
      });
      body += `</div>`;
    });
  });

  $('modal-root').innerHTML = `
    <div class="modal-overlay" style="z-index:250" onclick="if(event.target===this)closeVersionLog()">
      <div class="modal" style="position:relative;min-width:420px;max-width:520px;max-height:80vh;display:flex;flex-direction:column">
        <button onclick="closeVersionLog()" style="position:absolute;top:10px;right:14px;background:none;border:none;color:#7ba3cc;font-size:18px;cursor:pointer;padding:4px;transition:color 0.15s" onmouseover="this.style.color='#e0e8f0'" onmouseout="this.style.color='#7ba3cc'">✕</button>
        <div style="margin-bottom:4px;padding-right:28px">
          <h2 style="margin:0">更新日志</h2>
        </div>
        <div style="flex:1;overflow-y:auto;padding-right:4px;scrollbar-width:thin">
          ${body}
        </div>
        <div style="text-align:center;margin-top:14px;flex-shrink:0">
          <button class="btn" style="background:#334155;color:#e0e8f0;padding:6px 24px;font-size:13px;border-radius:6px" onclick="closeVersionLog()">关闭</button>
        </div>
      </div>
    </div>`;
}

function closeVersionLog(){
  $('modal-root').innerHTML = '';
}
