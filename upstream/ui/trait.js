// ===== PLAYER TRAIT SYSTEM =====
function showTraitEnvelope(){
  if(G.playerTrait||G.traitChosen)return;
  const overlay=document.createElement('div');
  overlay.id='trait-overlay';
  overlay.innerHTML=`
    <div style="text-align:center">
      <div class="envelope-wrap" onclick="openTraitCoins()">
        <div class="envelope-body">
          <div class="envelope-flap"></div>
          <div class="envelope-seal"></div>
        </div>
      </div>
      <div class="envelope-text">一封神秘信件送达，点击信封打开</div>
    </div>`;
  document.body.appendChild(overlay);
}

function openTraitCoins(){
  const overlay=$('trait-overlay');
  if(!overlay)return;
  // Randomly assign "辣" "机" "豆" to 3 beans, each appears once
  const traits=['辣','机','豆'];
  // Shuffle
  for(let i=traits.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[traits[i],traits[j]]=[traits[j],traits[i]];}
  overlay.innerHTML=`
    <div style="text-align:center">
      <div style="color:#fbbf24;font-size:18px;font-weight:700;margin-bottom:24px">请随机选择一粒金豆</div>
      <div class="coins-stage" id="coins-stage">
        <div class="coin" data-idx="0" onclick="selectTraitCoin(0)">
          <div class="coin-inner" id="coin-inner-0">
            <div class="coin-face"></div>
            <div class="coin-back"><span class="coin-label">${traits[0]}</span></div>
          </div>
        </div>
        <div class="coin" data-idx="1" onclick="selectTraitCoin(1)">
          <div class="coin-inner" id="coin-inner-1">
            <div class="coin-face"></div>
            <div class="coin-back"><span class="coin-label">${traits[1]}</span></div>
          </div>
        </div>
        <div class="coin" data-idx="2" onclick="selectTraitCoin(2)">
          <div class="coin-inner" id="coin-inner-2">
            <div class="coin-face"></div>
            <div class="coin-back"><span class="coin-label">${traits[2]}</span></div>
          </div>
        </div>
      </div>
      <div style="color:#7ba3cc;font-size:12px;margin-top:20px">金豆豆，银豆豆，不如我家的辣豆豆</div>
    </div>`;
  // Store trait assignment
  overlay._traitMap=traits;
}

function selectTraitCoin(idx){
  const overlay=$('trait-overlay');
  if(!overlay||!overlay._traitMap)return;
  const traits=overlay._traitMap;
  const selectedTrait=traits[idx];
  // Animate: flip selected bean, fade others
  const coins=overlay.querySelectorAll('.coin');
  coins.forEach((coin,i)=>{
    if(i===idx){
      coin.style.pointerEvents='none';
      const inner=$('coin-inner-'+i);
      if(inner)inner.classList.add('flipped');
    } else {
      coin.classList.add('fading');
      coin.style.pointerEvents='none';
    }
  });
  // After animation, show trait name & meaning (no buff details)
  setTimeout(()=>{
    const info=TRAIT_INFO[selectedTrait];
    overlay.innerHTML=`
      <div style="text-align:center;animation:fadeInUp 0.5s ease-out">
        <div style="font-size:48px;margin-bottom:8px">🪙</div>
        <div style="font-size:28px;font-weight:700;margin:16px 0 8px;color:${info.color}">「${selectedTrait}」— ${info.name}</div>
        <button class="btn btn-primary" onclick="confirmTrait('${selectedTrait}')" style="padding:10px 40px;font-size:15px;border-radius:8px;margin-top:16px">轰~隆隆！ ☁</button>
      </div>`;
  },1000);
}

function confirmTrait(trait){
  G.playerTrait=trait;
  G.traitChosen=true;
  const overlay=$('trait-overlay');
  if(overlay)overlay.remove();
  updateHUD();
  showBanner('欢迎经营 '+G.companyName+'！('+G.year+'-'+G.endYear+') 试试开通第一条航线吧','#2563eb');
  // v0.7.2: 特质仪式完成后激活新手引导
  updateOnboarding();
}
