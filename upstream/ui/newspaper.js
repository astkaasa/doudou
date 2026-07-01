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
  // Headline: prefer mega_event at peak (q===0), then any mega_event (highest boost), then first non-ads
  const megaItems=G.newsItems.filter(n=>n.category==='mega_event');
  const peakMega=megaItems.find(n=>n._isHeadline);
  const bestMega=!peakMega&&megaItems.length>0?megaItems.reduce((a,b)=>{
    const aEvt=G.activeMegaEvents?.find(e=>e.id===a._megaEventId);
    const bEvt=G.activeMegaEvents?.find(e=>e.id===b._megaEventId);
    return (aEvt?.currentBoost||0)>(bEvt?.currentBoost||0)?a:b;
  },megaItems[0]):null;
  const fallbackHeadline=G.newsItems.find(n=>n.category!=='ads'&&n.category!=='mega_event');
  const headline=peakMega||bestMega||fallbackHeadline||G.newsItems[0];
  const isMegaHeadline=peakMega||bestMega;
  if(headline)html+=`<div class="newspaper-headline">${isMegaHeadline?'🏆':'⚡'} ${headline.title}</div>`;
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
    <div style="margin-top:6px;font-size:11px;color:#4a4a3a;line-height:1.4">${Math.abs(oilChange)<1?'原油价格保持平稳，市场供需基本均衡。':oilChange>0?'产油国供应调整叠加季节性需求走强，油价上行压力明显。':'产油国增产预期增强，油价承压回落。'}</div>
  </div>`;
  // NASDOU 股市行情模块（石油行情之后）
  if(G.stocks){
    const nasdou=calcNasdouIndex();
    const nasdouPct=(nasdou*100).toFixed(1);
    const nasdouSign=nasdou>0.001?'+':'';
    const nasdouColor=nasdou>0.001?'#b91c1c':nasdou<-0.001?'#166534':'#555';
    const nasdouArrow=nasdou>0.001?'↑':nasdou<-0.001?'↓':'→';
    html+=`<div class="newspaper-item" style="background:#ebe6d6;border:1px solid #8b7355;border-radius:4px;padding:10px;margin-bottom:14px">
      <span class="cat stock">行情</span>
      <div class="title">📈 NASDOU 综合指数</div>
      <div style="margin-top:6px;font-size:13px">
        <span style="color:${nasdouColor};font-weight:700">${nasdouArrow} ${nasdouSign}${nasdouPct}%</span>
      </div>
      <div style="margin-top:6px;font-size:11px;color:#4a4a3a;line-height:1.4">${getNasdouDesc(nasdou)}</div>
    </div>`;
  }
  // News items in correct order: mega_event first (most important), then aviation, politics, etc.
  const order=['mega_event','aviation','politics','economy','culture','ads','disaster'];
  const catName={politics:'时政',economy:'财经',culture:'文化',aviation:'航空',ads:'广告',disaster:'灾害',mega_event:'盛事'};
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
        } else if(item.category==='mega_event'){
          html+=`<div class="newspaper-item" style="background:#fdf6e3;border:2px solid #d4a017;border-radius:4px;padding:10px;margin-bottom:14px">
            <span class="cat mega-event" style="background:#d4a017;color:#fff">盛事</span>
            <div class="title" style="font-size:15px;font-weight:700">🏆 ${item.title}</div>
            <div class="desc">${item.desc}</div>
            ${item.effect?`<div class="effect" style="color:#b45309">→ ${item.effect}</div>`:''}
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

// 根据NASDOU指数涨跌幅返回3档动态描述
function getNasdouDesc(nasdou){
  const pct=Math.abs(nasdou)*100;
  // 大涨(>5%): 市场强势，多数板块大涨
  if(nasdou>0.05){
    const lines=['市场全面走强，各板块普涨，投资者信心高涨。','资金大规模流入，多个板块涨幅显著，市场呈现强势格局。','利好消息密集释放，市场做多情绪浓厚，指数大幅上扬。'];
    return lines[Math.floor(Math.random()*lines.length)];
  }
  // 大跌(>5%): 市场承压，恐慌抛售
  if(nasdou<-0.05){
    const lines=['市场大幅下挫，恐慌性抛售蔓延，投资者纷纷避险。','多重利空叠加，各板块深度回调，市场信心遭受重创。','资金加速撤离，指数暴跌，市场笼罩在悲观情绪中。'];
    return lines[Math.floor(Math.random()*lines.length)];
  }
  // 平稳(-5%~+5%): 波动不大/小幅涨跌
  if(nasdou>0.005){
    return '市场小幅上行，各板块波动温和，整体走势偏暖。';
  }
  if(nasdou<-0.005){
    return '市场小幅承压，部分板块微跌，投资者观望情绪较浓。';
  }
  return '股市整体平稳，各板块波动不大，市场交投清淡。';
}
