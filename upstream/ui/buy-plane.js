function openBuyPlaneModal(){
  const boughtCount=countBoughtPlanes();
  const leasedCount=countLeasedPlanes();
  const leaseMax=maxLeasedPlanes();
  const canLease=boughtCount>=1&&leasedCount<leaseMax;
  let leaseTip='';
  if(boughtCount<1)leaseTip='<div style="background:#dc262620;border:1px solid #dc262660;border-radius:6px;padding:8px;margin-bottom:10px;font-size:12px;color:#f87171">⚠ 租赁限制：需先购买至少1架飞机后才能租赁</div>';
  else if(leasedCount>=leaseMax)leaseTip='<div style="background:#dc262620;border:1px solid #dc262660;border-radius:6px;padding:8px;margin-bottom:10px;font-size:12px;color:#f87171">⚠ 租赁限制：租赁飞机数量已达上限（购买'+boughtCount+'架，最多租赁'+leaseMax+'架）</div>';
  else leaseTip='<div style="background:#16a34a20;border:1px solid #16a34a60;border-radius:6px;padding:8px;margin-bottom:10px;font-size:12px;color:#4ade80">租赁信息：已购'+boughtCount+'架 · 已租'+leasedCount+'架 · 剩余可租'+(leaseMax-leasedCount)+'架 · 租期最长10年</div>';

  // Group planes by manufacturer
  const makerMap={'b':'波音','dc':'麦道','md':'麦道','a':'空客','il':'伊留申','tv':'图波列夫','l':'洛克希德'};
  const makerIcons={'波音':'','麦道':'','空客':'','伊留申':'','图波列夫':'','洛克希德':''};
  const availPlanes=getAvailablePlanes();
  const groups={};
  availPlanes.forEach(p=>{
    let maker='其他';for(const[k,v]of Object.entries(makerMap)){if(p.id.startsWith(k)){maker=v;break;}}
    if(!groups[maker])groups[maker]=[];
    groups[maker].push(p);
  });
  const makerKeys=Object.keys(groups);

  let html=`<h2>购买飞机</h2>${leaseTip}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">`;
  makerKeys.forEach((maker,i)=>{
    const icon=makerIcons[maker]||'✈';
    const active=i===0?'btn-primary':'';
    html+=`<button class="btn btn-sm ${active}" id="maker-btn-${i}" onclick="selectMaker(${i})" style="font-size:12px">${icon?icon+' ':''}${maker}</button>`;
  });
  html+=`</div><div id="plane-list"></div><div style="margin-top:12px;text-align:right"><button class="btn" style="background:#334155;color:#e0e8f0" onclick="closeModal()">关闭</button></div>`;
  showModal(html);
  // Store groups for tab switching
  uiState._buyPlaneGroups=groups;
  uiState._buyPlaneCanLease=canLease;
  uiState._buyPlaneMakerKeys=makerKeys;
  // Restore previous maker tab or default to first
  const restoreIdx=Math.min(uiState.buyPlaneSelectedMaker||0,makerKeys.length-1);
  selectMaker(restoreIdx);
}

function selectMaker(idx){
  uiState.buyPlaneSelectedMaker=idx;
  const groups=uiState._buyPlaneGroups;
  const canLease=uiState._buyPlaneCanLease;
  const makerKeys=uiState._buyPlaneMakerKeys;
  // Update tab buttons
  makerKeys.forEach((_,i)=>{
    const btn=document.getElementById('maker-btn-'+i);
    if(btn){btn.className='btn btn-sm '+(i===idx?'btn-primary':'');btn.style.background=i===idx?'':'#334155';btn.style.color=i===idx?'':'#e0e8f0';}
  });
  const maker=makerKeys[idx];
  const planes=groups[maker]||[];
  let html='';
  planes.forEach(p=>{
    const leaseFee=(p.buyPrice*0.1).toFixed(1);
    html+=`<div class="fleet-item" style="flex-direction:column;align-items:flex-start;gap:4px"><div style="display:flex;justify-content:space-between;width:100%"><span class="name">${p.name}</span><span style="color:#7ba3cc;font-size:12px">${p.type==='narrow'?'窄体':p.type==='wide'?'宽体':'超宽体'} · ${maker}</span></div><div style="display:flex;gap:12px;font-size:12px;color:#556;width:100%"><span>${p.seats}座</span><span>航程${p.range}km</span><span>油耗${p.fuel}</span><span>服役${p.serviceStart}年起</span></div><div style="display:flex;gap:6px;margin-top:4px;width:100%;justify-content:space-between;align-items:center;flex-wrap:wrap"><div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap"><span style="font-size:11px;color:#7ba3cc">数量</span><input type="number" min="1" max="10" value="1" id="buy-qty-${p.id}" style="width:45px;padding:2px 4px;background:#0a1628;color:#e0e8f0;border:1px solid #1e3a5f;border-radius:3px;font-size:12px;text-align:center" oninput="this.value=Math.min(10,Math.max(1,parseInt(this.value)||1))"><button class="btn btn-primary btn-sm" onclick="buyPlaneMulti('${p.id}',false)">购买 ${fmt(p.buyPrice)}/架</button><button class="btn btn-warning btn-sm" onclick="buyPlaneMulti('${p.id}',true)"${canLease?'':' disabled'}>租赁 ${fmt(p.leasePrice)}/季 +10%手续费</button></div><span style="font-size:12px;color:#556">资金: ${fmt(G.cash)}</span></div></div>`;
  });
  const list=document.getElementById('plane-list');
  if(list)list.innerHTML=html;
}

function buyPlaneMulti(planeId,isLease){
  const input=document.getElementById('buy-qty-'+planeId);
  const count=input?clamp(parseInt(input.value)||1,1,10):1;
  // Save current maker tab before reopening
  const savedMaker=uiState.buyPlaneSelectedMaker||0;
  const result=buyPlane(planeId,isLease,count);
  if(!result.ok){
    // Show rejection modal (UI layer responsibility)
    if(result.reason==='year_unavailable'){
      showModal(`<h2>无法购买</h2><p style="color:#f87171">${result.template.name} 在当前年份不可用（服役期：${result.template.serviceStart}-${result.template.serviceEnd}）</p><button class="btn btn-primary" onclick="closeModal()">确定</button>`);
    }else if(result.reason==='lease_no_bought'){
      showModal(`<h2>无法租赁</h2><p style="color:#f87171">需先购买至少1架飞机才能租赁！</p><button class="btn btn-primary" onclick="closeModal()">确定</button>`);
    }else if(result.reason==='lease_limit'){
      showModal(`<h2>无法租赁</h2><p style="color:#f87171">租赁飞机数量不能超过购买飞机的50%！当前上限：${result.maxLeased}架</p><button class="btn btn-primary" onclick="closeModal()">确定</button>`);
    }else if(result.reason==='insufficient_funds'){
      showModal(`<h2>资金不足</h2><p style="color:#f87171">当前资金 ${fmt(G.cash)}，需要 ${fmt(result.totalCost)}${result.isLease?' (含手续费 '+fmt(result.fee)+')':''}</p><button class="btn btn-primary" onclick="closeModal();openBuyPlaneModal()">确定</button>`);
    }
    return;
  }
  // Keep buy modal open, refresh to update available funds
  uiState.buyPlaneSelectedMaker=savedMaker;
  openBuyPlaneModal();
}
