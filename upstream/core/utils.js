// ===== UTILITY =====
function $(id){return document.getElementById(id)}
function fmt(n,pre='$',suf='M'){return pre+n.toFixed(1)+suf}
function fmtPct(n){return n.toFixed(1)+'%'}
function dist(a,b){const dx=(a.x-b.x)*1000,dy=(a.y-b.y)*500;return Math.sqrt(dx*dx+dy*dy);}
function cityDist(a,b){
  const toRad=v=>v*Math.PI/180;
  const lonA=a.x*360-180,lonB=b.x*360-180,latA=90-a.y*180,latB=90-b.y*180;
  const dLat=toRad(latB-latA),dLon=toRad(lonB-lonA);
  const h=Math.sin(dLat/2)**2+Math.cos(toRad(latA))*Math.cos(toRad(latB))*Math.sin(dLon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function getCity(id){return CITY_MAP[id]}
function _rx(c){return c.x+_MAP_OFFSET_X+(c._dx||0)/360}
function rand(a,b){return a+Math.random()*(b-a)}
function randInt(a,b){return Math.floor(rand(a,b+1))}
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v))}
function routeKey(a,b){return [a,b].sort().join('-')}
function seasonName(q){return ['春','夏','秋','冬'][q-1]}
function seasonEmoji(q){return ['🌸','☀️','🍂','❄️'][q-1]}
function planeDisplayName(p){return p.name+(p.isLease?' <span class="lease-badge">R</span>':'')}
function countBoughtPlanes(){return G.fleet.filter(p=>!p.isLease).length}
function countLeasedPlanes(){return G.fleet.filter(p=>p.isLease).length}
function maxLeasedPlanes(){return Math.floor(countBoughtPlanes()*LEASE_LIMIT_RATIO)}
function isHQ(cityId){return G&&G.hq===cityId}
function isBranch(cityId){return G&&G.branches&&G.branches.includes(cityId)}
function isConstructingBranch(cityId){return G&&G.branchesConstructing&&G.branchesConstructing.some(b=>b.cityId===cityId)}
function isBase(cityId){return isHQ(cityId)||isBranch(cityId)}
function branchCost(n){return BRANCH_BASE_COST*Math.pow(BRANCH_COST_GROWTH,n)}
function getAvailablePlanes(){if(!G)return PLANES;return PLANES.filter(p=>G.year>=p.serviceStart&&G.year<=p.serviceEnd);}
function getPlaneById(id){return PLANE_MAP[id]}
function rebuildFleetMap(){G.fleetMap={};G.fleet.forEach(p=>{G.fleetMap[p.uid]=p;});}
