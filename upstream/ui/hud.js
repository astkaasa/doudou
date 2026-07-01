function applySeasonTheme(){
  const app=$('app');
  app.classList.remove('season-q1','season-q2','season-q3','season-q4');
  app.classList.add('season-q'+G.quarter);
  $('season-badge').textContent=seasonEmoji(G.quarter)+' '+seasonName(G.quarter);
  updateOilBadge();
  updateNasdouBadge();
}
function updateOilBadge(){
  const ob=$('oil-badge');
  if(!ob||!G)return;
  const oilChange=G.prevOilPrice>0?((G.oilPrice-G.prevOilPrice)/G.prevOilPrice*100):0;
  const arrow=oilChange>0.01?'▲':oilChange<-0.01?'▼':'─';
  const changeColor=oilChange>0.01?'#f87171':oilChange<-0.01?'#4ade80':'#7ba3cc';
  ob.innerHTML=`🛢 $${G.oilPrice.toFixed(0)} <span style="color:${changeColor};font-size:10px">${arrow}${Math.abs(oilChange).toFixed(1)}%</span>`;
}

function updateHUD(){
  const compEl=$('hud-company-name');if(compEl&&G.companyName)compEl.textContent=G.companyName;
  // Trait badge
  const badge=$('hud-trait-badge');
  if(badge){
    if(G.playerTrait){
      const info=TRAIT_INFO[G.playerTrait];
      badge.style.display='inline-flex';
      badge.className='hud-trait';
      badge.innerHTML=`${G.playerTrait}<span class="trait-tooltip">${info.name}</span>`;
    } else {
      badge.style.display='none';
    }
  }
  const cashEl=$('hud-cash');cashEl.textContent=fmt(G.cash);cashEl.className='hud-val '+(G.cash>=0?'positive':'negative');
  const profitEl=$('hud-profit');profitEl.textContent=fmt(G.turnProfit);profitEl.className='hud-val '+(G.turnProfit>=0?'positive':'negative');
  $('hud-routes').textContent=G.routes.length;
  const activeFleet=G.fleet.filter(f=>!f.delivering);
  const bp=activeFleet.filter(f=>!f.isLease).length;
  const lp=activeFleet.filter(f=>f.isLease).length;
  $('hud-fleet').textContent='购'+bp+'/租'+lp;
  const avgLF=G.routes.length>0?G.routes.reduce((s,r)=>s+r.loadFactor,0)/G.routes.length:0;
  $('hud-load').textContent=fmtPct(avgLF*100);
  $('hud-brand-val').textContent='★'.repeat(Math.min(5,Math.floor(G.brand)));
  $('hud-turn').textContent=G.year+' Q'+G.quarter;
  const loanWrap=$('hud-loan-wrap');
  if(loanWrap){
    if(G.loan>0){loanWrap.style.display='flex';$('hud-loan').textContent=fmt(G.loan);}
    else{loanWrap.style.display='none';}
  }
  // v2.5: 顶部HUD不再显示证券市值（改由底部NASDOU徽章+证券市场Modal展示）
  // ── 盛事徽章（渐变蓝底金字，双盛事轮播） ──
  const megaBadge=$('mega-event-badge');
  if(megaBadge){
    if(G.activeMegaEvents&&G.activeMegaEvents.length>0){
      megaBadge.style.display='inline-flex';
      megaBadge.classList.add('mega-badge-active');
      // Store all active events for rotation
      megaBadge._megaEvents=[...G.activeMegaEvents];
      // Show primary (highest boost) by default
      if(!megaBadge._megaIdx)megaBadge._megaIdx=0;
      const evt=G.activeMegaEvents[megaBadge._megaIdx%G.activeMegaEvents.length];
      megaBadge.innerHTML=`🏆 ${evt.name}`;
      megaBadge.style.animation=evt.currentBoost>=evt.maxBoost*0.8
        ?'mega-pulse 1s infinite':'mega-pulse 2s infinite';
      // Rotation timer for dual mega events
      if(G.activeMegaEvents.length>1){
        if(!megaBadge._rotateTimer){
          megaBadge._rotateTimer=setInterval(()=>{
            megaBadge._megaIdx=(megaBadge._megaIdx+1)%megaBadge._megaEvents.length;
            const e=megaBadge._megaEvents[megaBadge._megaIdx];
            if(e)megaBadge.innerHTML=`🏆 ${e.name}`;
          },3000);
        }
      }else{
        if(megaBadge._rotateTimer){clearInterval(megaBadge._rotateTimer);megaBadge._rotateTimer=null;}
      }
    }else{
      megaBadge.style.display='none';
      megaBadge.classList.remove('mega-badge-active');
      if(megaBadge._rotateTimer){clearInterval(megaBadge._rotateTimer);megaBadge._rotateTimer=null;}
      megaBadge._megaIdx=0;
    }
  }
}
