// ===== FLEET OPS =====
function availablePlanes(){const assigned=new Set();G.routes.forEach(r=>r.assignedPlanes.forEach(p=>assigned.add(p)));return G.fleet.filter(f=>!assigned.has(f.uid)&&!f.delivering)}
function buyPlane(planeId,isLease,count=1){
  const template=PLANE_MAP[planeId];if(!template)return {ok:false,reason:'not_found'};
  if(G.year<template.serviceStart||G.year>template.serviceEnd){
    return {ok:false,reason:'year_unavailable',template,isLease,count};
  }
  count=clamp(count,1,10);
  if(isLease){
    if(countBoughtPlanes()<1) return {ok:false,reason:'lease_no_bought',template,count};
    if(countLeasedPlanes()+count>maxLeasedPlanes()) return {ok:false,reason:'lease_limit',template,count,maxLeased:maxLeasedPlanes()};
  }
  const fee=isLease?template.buyPrice*LEASE_FEE_RATIO:0;
  const cost=isLease?template.leasePrice:template.buyPrice;
  const totalCost=(cost+fee)*count;
  if(G.cash<totalCost) return {ok:false,reason:'insufficient_funds',template,isLease,count,totalCost,fee:fee*count};
  G.cash-=totalCost;
  for(let i=0;i<count;i++){
    const plane={uid:G.planeIdCounter++,templateId:template.id,type:template.type,name:template.name,seats:template.seats,range:template.range,fuel:template.fuel,maint:template.maint,age:0,buyPrice:template.buyPrice,isLease:isLease,leasePrice:isLease?template.leasePrice:0,leaseTurns:0,maxLeaseTurns:MAX_LEASE_TURNS,delivering:!isLease,deliverIn:isLease?0:PLANE_DELIVER_TURNS};
    G.fleet.push(plane);
  }
  rebuildFleetMap();
  emit('fleet:changed',{action:isLease?'lease':'buy',planeName:template.name,count,isLease,fee:fee*count});
  return {ok:true,action:isLease?'lease':'buy',planeName:template.name,count,isLease,fee:fee*count};
}
