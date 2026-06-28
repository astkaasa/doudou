// ===== MILESTONE UI =====
// Presentation layer only — trophies, notifications, bookshelf.
// Depends on: MILESTONES, MILESTONE_CATS (data), checkMilestones/getMilestoneStats/updateMilestones (engine)

// ===== TROPHY RENDERING =====
const TROPHY_MATERIALS = {
  1:{fill:'#8B6914',stroke:'#654321',glow:''},
  2:{fill:'rgba(173,216,230,0.6)',stroke:'#87CEEB',glow:''},
  3:{fill:'#CD7F32',stroke:'#8B4513',glow:'0 0 8px rgba(205,127,50,0.5)'},
  4:{fill:'#C0C0C0',stroke:'#808080',glow:'0 0 8px rgba(192,192,192,0.5)'},
  5:{fill:'#FFD700',stroke:'#B8860B',glow:'0 0 14px rgba(255,215,0,0.6)'},
};

function renderTrophy(lv,unlocked,size){
  size=size||56;
  const m=TROPHY_MATERIALS[lv]||TROPHY_MATERIALS[1];
  const w=size, h=size;
  const s=size/56; // scale factor
  const locked=unlocked?'':'filter:grayscale(1) brightness(0.3);opacity:0.35;';
  const anim=unlocked&&lv===5?'animation:trophyPulse 2s ease-in-out infinite;':'';
  const glowShadow=unlocked?m.glow:'';
  return `<div style="position:relative;width:${w}px;height:${h}px;${locked}${anim}flex-shrink:0" class="trophy-lv${lv}">
    <svg viewBox="0 0 56 56" width="${w}" height="${h}" style="display:block;filter:drop-shadow(${glowShadow})">
      <defs>
        <linearGradient id="tg${lv}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${m.fill}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${m.stroke}" stop-opacity="1"/>
        </linearGradient>
        <linearGradient id="tb${lv}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${m.stroke}"/>
          <stop offset="100%" stop-color="${m.fill}" stop-opacity="0.8"/>
        </linearGradient>
      </defs>
      <!-- Cup body -->
      <path d="M16 10 L14 30 Q14 42 28 42 Q42 42 42 30 L40 10 Z" fill="url(#tg${lv})" stroke="${m.stroke}" stroke-width="1.5"/>
      <!-- Left handle -->
      <path d="M16 14 Q8 14 8 22 Q8 30 14 30" fill="none" stroke="${m.stroke}" stroke-width="2" stroke-linecap="round"/>
      <!-- Right handle -->
      <path d="M40 14 Q48 14 48 22 Q48 30 42 30" fill="none" stroke="${m.stroke}" stroke-width="2" stroke-linecap="round"/>
      <!-- Rim -->
      <ellipse cx="28" cy="10" rx="14" ry="3" fill="url(#tb${lv})" stroke="${m.stroke}" stroke-width="1"/>
      <!-- Star emblem -->
      <text x="28" y="30" text-anchor="middle" font-size="${lv===5?'14':'12'}" fill="${unlocked?(lv>=4?'#FFF':'#FFD700'):'#555'}" font-weight="bold">${['','★','★','★','★','★'][lv]}</text>
      <!-- Stem -->
      <rect x="25" y="42" width="6" height="5" fill="${m.stroke}" rx="1"/>
      <!-- Base -->
      <rect x="18" y="47" width="20" height="5" fill="url(#tb${lv})" stroke="${m.stroke}" stroke-width="1" rx="2"/>
      <rect x="16" y="51" width="24" height="3" fill="${m.stroke}" rx="1.5"/>
    </svg>
  </div>`;
}

// Inject trophy CSS animations once
(function(){
  if(document.getElementById('trophy-styles')) return;
  const s=document.createElement('style');
  s.id='trophy-styles';
  s.textContent=`
@keyframes trophyPulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 14px rgba(255,215,0,0.6))}50%{transform:scale(1.06);filter:drop-shadow(0 0 22px rgba(255,215,0,0.9))}}
@keyframes milestoneSlideIn{from{opacity:0}to{opacity:1}}
@keyframes milestoneSlideOut{from{opacity:1}to{opacity:0}}
.shelf-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.shelf{background:linear-gradient(180deg,#4E342E 0%,#3E2723 100%);border-radius:8px;padding:12px 14px 8px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.3)}
.shelf-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid rgba(109,76,65,0.5)}
.shelf-row{display:flex;justify-content:center;align-items:center;gap:16px;padding:8px 0 10px;border-bottom:2px solid #6D4C41;min-height:80px}
.trophy-slot{display:flex;flex-direction:column;align-items:center;gap:3px;position:relative;cursor:default}
.trophy-label{font-size:11px;color:#94a3b8;max-width:76px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trophy-label.locked{color:#555}
.trophy-tooltip{display:none;position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#1a2d48,#0f1f38);border:1px solid #fbbf2460;border-radius:10px;padding:10px 14px;z-index:200;min-width:180px;text-align:center;pointer-events:none;box-shadow:0 6px 24px rgba(0,0,0,0.5)}
.trophy-slot:hover .trophy-tooltip{display:block}
.trophy-tooltip .tt-title{font-size:14px;font-weight:700;color:#fbbf24;margin-bottom:4px}
.trophy-tooltip .tt-desc{font-size:12px;color:#94a3b8;margin-bottom:4px}
.trophy-tooltip .tt-notify{font-size:11px;color:#4ade80;font-style:italic}
.trophy-tooltip .tt-locked{font-size:11px;color:#fbbf24}
  `;
  document.head.appendChild(s);
})();

// ===== NOTIFICATION (toast) =====
let _milestoneQueue=[];
let _milestoneShowing=false;

function showMilestoneNotification(milestoneList){
  if(!milestoneList||milestoneList.length===0) return;
  _milestoneQueue.push(milestoneList);
  if(!_milestoneShowing) _showNextMilestone();
}

function _showNextMilestone(){
  if(_milestoneQueue.length===0){_milestoneShowing=false;return;}
  _milestoneShowing=true;
  const list=_milestoneQueue.shift();
  const popup=document.createElement('div');
  popup.id='milestone-toast';
  popup.style.cssText='position:fixed;bottom:40px;left:0;right:0;z-index:10000;display:flex;justify-content:center;pointer-events:none;animation:milestoneSlideIn 0.5s ease-out;font-family:inherit';
  let inner=`<div style="min-width:300px;max-width:420px;border:2px solid #fbbf24;border-radius:12px;padding:16px;box-shadow:0 8px 32px rgba(251,191,36,0.3);pointer-events:auto;background:linear-gradient(135deg,#1a2d48 0%,#0f1f38 100%)">`;
  inner+=_buildPopupHtml(list);
  inner+=`</div>`;
  popup.innerHTML=inner;
  document.body.appendChild(popup);
  popup._timer=setTimeout(()=>dismissMilestone(),3000);
}

function _buildPopupHtml(list){
  if(list.length===0) return '';
  let h='<div style="text-align:center;margin:4px 0">';
  if(list.length===1){
    const m=list[0];
    h+=`<div style="display:flex;justify-content:center;margin-bottom:8px">${renderTrophy(m.lv,true,64)}</div>`;
    h+=`<div style="font-size:18px;font-weight:700;color:#fbbf24;margin-bottom:4px">里程碑达成！</div>`;
    h+=`<div style="font-size:16px;font-weight:600;color:#e0e8f0">${m.title}</div>`;
    h+=`<div style="font-size:13px;color:#94a3b8;margin:4px 0">${m.desc}</div>`;
    h+=`<div style="font-size:12px;color:#fbbf24;margin-top:4px">${m.notify}</div>`;
  } else {
    h+=`<div style="font-size:16px;font-weight:700;color:#fbbf24;margin-bottom:8px">达成 ${list.length} 个里程碑！</div>`;
    list.forEach(m=>{
      h+=`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #1e3a5f30">`;
      h+=renderTrophy(m.lv,true,32);
      h+=`<div style="flex:1;text-align:left"><div style="font-weight:600;color:#e0e8f0;font-size:13px">${m.title}</div><div style="font-size:11px;color:#94a3b8">${m.desc}</div></div>`;
      h+=`</div>`;
    });
  }
  h+='</div>';
  return h;
}

function dismissMilestone(){
  const popup=document.getElementById('milestone-toast');
  if(popup){
    clearTimeout(popup._timer);
    popup.style.animation='milestoneSlideOut 0.3s ease-in forwards';
    setTimeout(()=>{popup.remove();_showNextMilestone();},300);
  } else {
    _showNextMilestone();
  }
}

// ===== BOOKSHELF MODAL =====
function openMilestoneList(){
  if(!G) return;
  const stats=getMilestoneStats();
  const pct=stats.total>0?(stats.unlocked/stats.total*100):0;
  let html=`<div style="max-width:920px;margin:0 auto">`;
  // Title + progress
  html+=`<div style="text-align:center;margin-bottom:14px">
    <div style="font-size:22px;font-weight:700;color:#fbbf24;margin-bottom:6px">奖杯陈列室</div>
    <div style="display:flex;justify-content:center;align-items:center;gap:10px">
      <span style="color:#94a3b8;font-size:13px">收集进度</span>
      <div style="background:#1e3a5f;border-radius:6px;height:8px;width:200px;overflow:hidden">
        <div style="background:linear-gradient(90deg,#fbbf24,#f59e0b);height:100%;width:${pct}%;border-radius:6px;transition:width 0.5s"></div>
      </div>
      <span style="color:#fbbf24;font-weight:700;font-size:14px">${stats.unlocked} / ${stats.total}</span>
    </div>
  </div>`;

  // 3×2 grid: 6 categories, each shelf shows 5 trophies in one row (LV1→LV5)
  html+=`<div class="shelf-grid">`;
  MILESTONE_CATS.forEach(catInfo=>{
    const cat=catInfo.id;
    const items=MILESTONES.filter(m=>m.cat===cat);
    if(items.length===0) return;
    const catStat=stats.cats[cat]||{unlocked:0,total:0};
    html+=`<div class="shelf">`;
    html+=`<div class="shelf-title">
      <span style="font-weight:700;color:#e0e8f0;font-size:14px">${catInfo.icon} ${cat}</span>
      <span style="font-size:11px;color:#7ba3cc">${catStat.unlocked}/${catStat.total}</span>
    </div>`;

    // One row: 5 trophies LV1→LV5
    html+=`<div class="shelf-row">`;
    for(let lv=1;lv<=5;lv++){
      const m=items.find(x=>x.lv===lv);
      if(!m) continue;
      const done=G.milestones&&G.milestones[m.id];
      // Label: unlocked → show title, locked → "？？？"
      const showTitle=done?m.title:'？？？';
      html+=`<div class="trophy-slot">`;
      html+=renderTrophy(m.lv,!!done,52);
      html+=`<div class="trophy-label ${done?'':'locked'}">${showTitle}</div>`;
      // Hover tooltip: secret milestones show "？？？" when locked; others show full info
      const isLocked=!done;
      const isSecret=m.secret&&isLocked;
      html+=`<div class="trophy-tooltip">`;
      html+=`<div class="tt-title">${isSecret?'？？？':m.title}</div>`;
      html+=`<div class="tt-desc">${isSecret?'？？？':m.desc}</div>`;
      if(done&&m.notify) html+=`<div class="tt-notify">${m.notify}</div>`;
      if(isLocked&&!isSecret) html+=`<div class="tt-locked">未解锁</div>`;
      if(isSecret) html+=`<div class="tt-locked">未解锁</div>`;
      html+=`</div>`;
      html+=`</div>`;
    }
    html+=`</div>`; // shelf-row
    html+=`</div>`; // shelf
  });
  html+=`</div>`; // shelf-grid

  html+=`<div style="margin-top:10px;text-align:right"><button class="btn btn-primary" onclick="closeModal()" style="padding:6px 24px">关闭</button></div>`;
  html+=`</div>`;
  // Use wider modal for milestone bookshelf
  $('modal-root').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="position:relative;max-width:960px;width:960px">${html}</div></div>`;
}
