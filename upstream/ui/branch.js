// ===== BRANCH SYSTEM =====
function openBranchModal(){
  if(!G.branches)G.branches=[];
  if(!G.branchesConstructing)G.branchesConstructing=[];
  const count=G.branches.length;
  const constructingCount=G.branchesConstructing.length;
  let html=`<h2>分部管理</h2><p style="color:#7ba3cc;font-size:13px;margin-bottom:12px">在总部以外的城市开设分部，扩展航线网络。航线只能从总部或分部起飞。分部上限10个。</p>`;
  // Branches under construction
  if(constructingCount>0){
    html+=`<h3 style="color:#fbbf24">建设中</h3><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">`;
    G.branchesConstructing.forEach(b=>{
      const c=getCity(b.cityId);
      html+=`<div style="display:flex;align-items:center;gap:4px;background:#fbbf2415;border:1px dashed #fbbf2460;border-radius:4px;padding:4px 8px"><span style="color:#fbbf24;font-size:12px">🏗 ${c.name}</span><span style="color:#fbbf24;font-size:10px">(施工中, ${b.constructIn}季度后完工)</span></div>`;
    });
    html+=`</div>`;
  }
  // Current branches with close button
  if(count>0){
    html+=`<h3>已有分部</h3><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">`;
    G.branches.forEach(bid=>{
      const c=getCity(bid);
      const routesFromBranch=G.routes.filter(r=>r.from===bid);
      html+=`<div style="display:flex;align-items:center;gap:4px;background:#3b82f620;border:1px solid #3b82f660;border-radius:4px;padding:4px 8px"><span style="color:#93c5fd;font-size:12px">${c.name}</span><span style="color:#7ba3cc;font-size:10px">(${routesFromBranch.length}航线)</span><button style="background:none;border:none;color:#f87171;cursor:pointer;font-size:13px;padding:0 2px" onclick="closeBranch('${bid}')" title="关闭分部">✕</button></div>`;
    });
    html+=`</div>`;
  }
  // HQ info
  if(G.hq)html+=`<div style="font-size:12px;color:#7ba3cc;margin-bottom:10px">总部: ${getCity(G.hq).name}</div>`;
  // Cost for next branch
  const totalCount=count+constructingCount;
  if(totalCount<10){
    const nextCost=branchCost(totalCount);
    const canAfford=G.cash>=nextCost;
    html+=`<div style="background:#0a1628;border-radius:8px;padding:12px;margin:8px 0">
      <div style="display:flex;justify-content:space-between;font-size:14px"><span style="color:#7ba3cc">分部${totalCount+1}费用</span><span style="font-weight:700;color:${canAfford?'#4ade80':'#f87171'}">${fmt(nextCost)}</span></div>
      <div style="font-size:11px;color:#556;margin-top:4px">当前资金: ${fmt(G.cash)}</div>
      <div style="font-size:11px;color:#fbbf24;margin-top:2px">⚠️ 建设需1个季度施工，完工后可开通航线</div>
    </div>`;
    if(canAfford){
      html+=`<button class="btn btn-primary" onclick="openBranchSelectOnMap()" style="width:100%;padding:10px">在地图上选择分部城市</button>`;
    } else {
      html+=`<div style="text-align:center;color:#f87171;font-size:13px;padding:8px">资金不足</div>`;
    }
  } else {
    html+=`<div style="text-align:center;color:#fbbf24;font-size:13px;padding:8px">已达分部上限（10个）</div>`;
  }
  html+=`<div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" onclick="closeModal()">关闭</button></div>`;
  showModal(html);
}

function openBranchSelectOnMap(){
  closeModal();
  branchSelectMode=true;
  selectedBranch=null;
  $('app').classList.add('branch-selecting');
  renderMap();
  // Show banner
  const totalCount=(G.branches?G.branches.length:0)+(G.branchesConstructing?G.branchesConstructing.length:0);
  const cost=branchCost(totalCount);
  let banner=document.getElementById('branch-banner');
  if(!banner){
    banner=document.createElement('div');
    banner.id='branch-banner';
    document.body.appendChild(banner);
  }
  banner.style.cssText='position:fixed;top:56px;left:50%;transform:translateX(-50%);background:rgba(17,29,51,0.96);border:2px solid #7c3aed;border-radius:14px;padding:18px 36px;z-index:90;text-align:center;min-width:420px;box-shadow:0 8px 32px rgba(0,0,0,0.5);pointer-events:none';
  banner.innerHTML=`
    <div style="font-size:20px;font-weight:700;color:#7c3aed;margin-bottom:6px">📍 选择分部城市</div>
    <div style="font-size:13px;color:#7ba3cc">点击地图上的城市开设分部（费用 ${fmt(cost)}）</div>
    <div id="branch-selected-info" style="margin-top:10px;font-size:15px;color:#e0e8f0;display:none">已选择: <span id="branch-selected-name" style="color:#7c3aed;font-weight:700;font-size:17px"></span></div>
    <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;pointer-events:auto">
      <button class="btn" style="background:#334155;color:#e0e8f0;padding:8px 20px" onclick="cancelBranchSelect()">← 取消</button>
      <button class="btn btn-success" id="branch-confirm-btn" style="padding:8px 32px;display:none" onclick="confirmBranchFromMap()">确认开设</button>
    </div>`;
  $('bottom-hint').textContent='点击地图上的城市选择分部';
}

function cancelBranchSelect(){
  branchSelectMode=false;
  selectedBranch=null;
  $('app').classList.remove('branch-selecting');
  const banner=$('branch-banner');if(banner)banner.remove();
  renderMap();
  $('bottom-hint').textContent='选择总部或分部作为起飞城市';
}

function confirmBranchFromMap(){
  if(!selectedBranch){showBanner('请先选择分部城市','#d97706');return;}
  const cityId=selectedBranch;
  const totalCount=(G.branches?G.branches.length:0)+(G.branchesConstructing?G.branchesConstructing.length:0);
  const cost=branchCost(totalCount);
  const c=getCity(cityId);
  if(G.cash<cost){showModal(`<h2>资金不足</h2><p>开设分部需要 ${fmt(cost)}，当前资金 ${fmt(G.cash)}</p><button class="btn btn-primary" onclick="closeModal()">确定</button>`);return;}
  if(totalCount>=10){showModal(`<h2>已达上限</h2><p>分部数量最多10个。</p><button class="btn btn-primary" onclick="closeModal()">确定</button>`);return;}
  G.cash-=cost;
  if(!G.branchesConstructing)G.branchesConstructing=[];
  G.branchesConstructing.push({cityId:cityId,constructIn:BRANCH_CONSTRUCT_TURNS});
  syncStaffToNeeded(0.80); // v0.6.2: 开分部自动补员80%
  branchSelectMode=false;
  selectedBranch=null;
  $('app').classList.remove('branch-selecting');
  const banner=$('branch-banner');if(banner)banner.remove();
  updateHUD();renderMap();renderPanel();
  showBanner(`🏗 分部建设：${c.name}（花费 ${fmt(cost)}，${BRANCH_CONSTRUCT_TURNS}季度后完工）`,'#fbbf24');
  $('bottom-hint').textContent='选择总部或分部作为起飞城市';
  updateMilestones();
}

function closeBranch(cityId){
  const c=getCity(cityId);
  const affectedRoutes=G.routes.filter(r=>r.from===cityId);
  const affectedPlanes=[];
  affectedRoutes.forEach(r=>{r.assignedPlanes.forEach(uid=>{const p=G.fleetMap[uid];if(p)affectedPlanes.push(p);});});
  let html=`<h2>确认关闭分部</h2>
    <div style="background:#dc262620;border:1px solid #dc262660;border-radius:8px;padding:12px;margin:12px 0">
      <p style="color:#f87171;font-weight:700;font-size:15px">确定关闭「${c.name}」分部？</p>
      <p style="color:#f87171;font-size:13px;margin-top:6px">此操作不可撤销！</p>
    </div>
    <div style="font-size:13px;color:#e0e8f0">
      <div style="margin-bottom:4px">将关闭从该分部起飞的航线：<span style="color:#f87171;font-weight:700">${affectedRoutes.length} 条</span></div>`;
  if(affectedRoutes.length>0){
    html+=`<div style="margin:8px 0;padding:8px;background:#0a1628;border-radius:6px">`;
    affectedRoutes.forEach(r=>{html+=`<div style="font-size:12px;color:#7ba3cc">→ ${getCity(r.to).name}</div>`;});
    html+=`</div>`;
  }
  if(affectedPlanes.length>0){
    html+=`<div style="margin-bottom:4px">涉及的飞机将入库变为空闲：<span style="color:#fbbf24;font-weight:700">${affectedPlanes.length} 架</span></div>
    <div style="margin:8px 0;padding:8px;background:#0a1628;border-radius:6px">`;
    affectedPlanes.forEach(p=>{html+=`<div style="font-size:12px;color:#7ba3cc">${p.name}${p.isLease?'<span style="font-size:10px;color:#fbbf24"> [R]</span>':''}</div>`;});
    html+=`</div>`;
  }
  html+=`</div>
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" style="background:#334155;color:#e0e8f0" onclick="openBranchModal()">取消</button>
      <button class="btn btn-danger" onclick="confirmCloseBranch('${cityId}')">确认关闭</button>
    </div>`;
  showModal(html);
}

function confirmCloseBranch(cityId){
  // Close all routes from this branch
  G.routes=G.routes.filter(r=>r.from!==cityId);
  // Remove branch
  G.branches=G.branches.filter(b=>b!==cityId);
  updateRouteMetrics();updateHUD();renderMap();renderPanel();closeModal();
  showBanner(`已关闭分部：${getCity(cityId).name}`,'#dc2626');
}
