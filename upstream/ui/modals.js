// ===== MODALS =====
function showModal(html){$('modal-root').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="position:relative">${html}</div></div>`;}
function closeModal(){
  $('modal-root').innerHTML='';
  $('delivery-root').innerHTML='';
  if(branchSelectMode){cancelBranchSelect();}
  if(G&&!G.gameOver){
    if(G.selectedCity){G.selectedCity=null;renderMap();}
    hideRouteCreateInfo();
    $('bottom-hint').textContent='选择总部或分部作为起飞城市';
  }
}

function showBanner(text,color){const b=$('event-banner');b.textContent=text;b.style.background=color||'#2563eb';b.style.display='block';setTimeout(()=>{b.style.display='none';},3000);}

function showGameOver(){$('modal-root').innerHTML=`<div class="modal-overlay"><div class="modal gameover"><h1>破产了</h1><p>你的航空公司因资金耗尽而倒闭。</p><p>存活了 ${G.turnsPlayed} 个季度</p><p>最高曾拥有 ${G.routes.length} 条航线、${G.fleet.length} 架飞机</p><button class="btn btn-primary" onclick="location.reload()" style="margin-top:16px;padding:10px 32px">重新开始</button></div></div>`;}
