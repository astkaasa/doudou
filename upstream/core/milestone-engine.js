// ===== MILESTONE ENGINE =====
// Detection & state management only — no UI, no rewards.

// Check all milestones, return newly unlocked items
function checkMilestones(){
  if(!G||!G.milestones) G.milestones={};
  const newlyUnlocked=[];
  MILESTONES.forEach(m=>{
    if(!G.milestones[m.id] && m.check()){
      G.milestones[m.id]=true;
      newlyUnlocked.push(m);
    }
  });
  return newlyUnlocked;
}

// Get milestone stats for display
function getMilestoneStats(){
  if(!G||!G.milestones) return {unlocked:0,total:MILESTONES.length,cats:{}};
  const unlocked=Object.keys(G.milestones).filter(k=>G.milestones[k]).length;
  const cats={};
  MILESTONES.forEach(m=>{
    if(!cats[m.cat]) cats[m.cat]={unlocked:0,total:0};
    cats[m.cat].total++;
    if(G.milestones[m.id]) cats[m.cat].unlocked++;
  });
  return {unlocked,total:MILESTONES.length,cats};
}

// Check all milestones and notify — call this after every state-changing action
function updateMilestones(){
  if(!G||G.gameOver) return;
  const newly=checkMilestones();
  if(newly.length>0){
    showMilestoneNotification(newly);
    emit('milestone:unlocked',{ids:newly.map(m=>m.id),count:newly.length});
  }
}
