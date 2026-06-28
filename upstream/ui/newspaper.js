function buildNewspaperHtml(includeFooter,settledYear,settledQuarter){
  // 标题显示结算季度（上季度），不是当前季度
  const nq=settledQuarter||G.quarter;
  const nyr=settledYear||G.year;
  const seasonTxt=seasonName(nq)+seasonEmoji(nq);
  const dateStr=nyr+'年 第'+nq+'季度 · '+seasonTxt;
  let html=`<div class="newspaper">
    <div class="newspaper-header">
      <h2>环球航空报</h2>
      <div class="date">${dateStr}</div>
    </div>
    <div class="newspaper-body">`;
  // Headline
  const headline=G.newsItems.find(n=>n.category!=='ads')||G.newsItems[0];
  if(headline)html+=`<div class="newspaper-headline">⚡ ${headline.title}</div>`;
  // Oil module (always first)
  const oilChange=G.prevOilPrice>0?((G.oilPrice-G.prevOilPrice)/G.prevOilPrice*100):0;
  const oilArrow=oilChange>0.01?'↑':oilChange<-0.01?'↓':'→';
  const oilColor=oilChange>0.01?'#b91c1c':oilChange<-0.01?'#166534':'#555';
  html+=`<div class="newspaper-item" style="background:#ebe6d6;border:1px solid #8b7355;border-radius:4px;padding:10px;margin-bottom:14px">
    <span class="cat oil">行情</span>
    <div class="title">🛢 国际原油行情</div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:13px">
      <span>期初: $${G.prevOilPrice.toFixed(1)}/桶</span>
      <span>期末: <strong>$${G.oilPrice.toFixed(1)}/桶</strong></span>
      <span style="color:${oilColor};font-weight:700">${oilArrow} ${oilChange>=0?'+':''}${oilChange.toFixed(1)}%</span>
    </div>
    <div style="margin-top:6px;font-size:11px;color:#4a4a3a;line-height:1.4">${Math.abs(oilChange)<1?'原油价格保持平稳，市场供需基本均衡。':oilChange>0?'地缘政治紧张叠加季节性需求走强，油价上行压力明显。':'产油国增产预期增强，油价承压回落。'}</div>
  </div>`;
  // News items in correct order: politics, economy, culture, ads, disaster
  const order=['aviation','politics','economy','culture','ads','disaster'];
  const catName={politics:'时政',economy:'财经',culture:'文化',aviation:'航空',ads:'广告',disaster:'灾害'};
  order.forEach(cat=>{
      G.newsItems.filter(n=>n.category===cat).forEach(item=>{
        // Aviation and oil use special bordered box style
        if(item.category==='aviation'){
          html+=`<div class="newspaper-item" style="background:#ebe6d6;border:1px solid #0284c7;border-radius:4px;padding:10px;margin-bottom:14px">
            <span class="cat aviation">航空</span>
            <div class="title">✈ ${item.title}</div>
            <div class="desc">${item.desc}</div>
            ${item.effect?`<div class="effect">→ ${item.effect}</div>`:''}
          </div>`;
        } else {
          html+=`<div class="newspaper-item">
            <span class="cat ${item.category}">${catName[item.category]||'综合'}</span>
            <div class="title">${item.title}</div>
            <div class="desc">${item.desc}</div>
            ${item.effect?`<div class="effect">→ ${item.effect}</div>`:''}
          </div>`;
        }
      });
  });
  html+=`</div>`;
  if(includeFooter){
    html+=`<div class="newspaper-footer">
      <button class="btn btn-primary" onclick="closeModal()" style="padding:8px 32px">知道了，继续经营</button>
    </div>`;
  }
  html+=`</div>`;
  return html;
}

function showNewspaper(){
  const rd=G._lastReportData||{};
  const html=buildNewspaperHtml(true,rd.year,rd.quarter);
  G.lastNewspaperHtml=html;
  $('modal-root').innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)closeModal()" style="align-items:flex-start;padding-top:40px;overflow-y:auto"><div style="max-height:82vh;overflow-y:auto">${html}</div></div>`;
  $('reread-news-btn').style.display='';
}
