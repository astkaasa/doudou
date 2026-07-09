// ===== ui/subsidiary.js — 子公司系统UI =====

// ═══════════════════════════════════════════════════════
// 城市底部抽屉（真实底部滑出面板，非Modal）
// ═══════════════════════════════════════════════════════

let _cityDrawerCityId = null;

/** 打开/切换城市底部抽屉 */
function openSubsidiaryDrawer(cityId) {
  const city = getCity(cityId);
  if (!city || !G || G.gameOver) return;

  // 如果点击同一城市，关闭抽屉
  if (_cityDrawerCityId === cityId) {
    closeCityDrawer();
    return;
  }
  _cityDrawerCityId = cityId;
  renderCityDrawer(cityId);
}

/** 关闭城市抽屉 */
function closeCityDrawer() {
  _cityDrawerCityId = null;
  const drawer = document.getElementById('city-drawer');
  if (drawer) {
    drawer.classList.remove('city-drawer-open');
    drawer.innerHTML = '';
  }
}

/** 渲染城市抽屉内容 */
function renderCityDrawer(cityId) {
  const city = getCity(cityId);
  if (!city) return;

  const cs = getCityState(cityId);
  const existing = G.subsidiaries?.[cityId] || [];
  const available = getAvailableSubTypes(cityId);
  const availableNormal = available.filter(t => t !== 'airport');
  const availableAirport = available.filter(t => t === 'airport');

  // 区域中文映射
  const regionMap = {asia:'亚洲',europe:'欧洲',africa:'非洲',namerica:'北美',samerica:'南美',oceania:'大洋洲'};
  const regionName = regionMap[city.region] || city.region || '';

  // 盛事预告
  let megaHint = '';
  if (G.activeMegaEvents) {
    for (const evt of G.activeMegaEvents) {
      if (evt.cityId === cityId && evt.currentBoost > 0 && evt.quartersFromEvent < 0) {
        megaHint = `<div class="sub-mega-hint">💡 ${evt.fullName}即将到来!</div>`;
        break;
      }
    }
  }

  // 已有子公司
  let existingHtml = '';
  if (existing.length > 0) {
    existingHtml = '<div class="sub-section-title">── 子公司 ──</div>';
    existing.forEach(sub => {
      const cfg = SUB_TYPES[sub.type];
      const sourceClass = sub.source === 'invest' ? 'sub-source-invest' :
                          sub.source === 'acquire' ? 'sub-source-acquire' : 'sub-source-open';
      const sourceLabel = sub.source === 'invest' ? '投资' :
                           sub.source === 'acquire' ? '收购' : '新设';
      const sellBtnLabel = sub.type === 'airport' ? '回购' : '出售';
      const sellGrossPrice = sub.type === 'airport'
        ? Math.round(sub.currentValue * SUB_AIRPORT_SELLBACK_RATE)
        : Math.round(sub.currentValue);
      const sellFee = Math.round(sellGrossPrice * SUB_FEE_RATE);
      const sellPrice = sellGrossPrice - sellFee;
      const cardClass = sub.type === 'airport' ? ' sub-card-airport' : '';
      const newTag = sub.isNew ? '<span class="sub-new-tag">NEW</span>' : '';
      const valueHtml = sub.isNew
        ? '<span class="sub-value" style="color:#fbbf24">待运营</span>'
        : `<span class="sub-value">估值${fmt(sub.currentValue)}</span>`;
      existingHtml += `
        <div class="sub-existing-row${cardClass}">
          <span class="sub-icon">${cfg.icon}</span>
          <span class="sub-name">${cfg.name}</span>${newTag}
          <span class="sub-source ${sourceClass}">${sourceLabel}</span>
          ${valueHtml}
          <button class="sub-sell-btn" onclick="confirmSellSub('${cityId}','${sub.type}')">${sellBtnLabel} ${fmt(sellPrice)}</button>
        </div>`;
    });
  }

  // 可开设（普通子公司：新设 + 收购）— 统一按钮大小
  let normalHtml = '';
  if (availableNormal.length > 0) {
    normalHtml = '<div class="sub-section-title">── 可开设 ──</div>';
    availableNormal.forEach(type => {
      const cfg = SUB_TYPES[type];
      const openCost = calcSubOpenCost(type, cityId);
      const acquireCost = getAcquirePrice(type, cityId);
      const canAffordOpen = G.cash >= openCost;
      const canAffordAcquire = G.cash >= acquireCost;
      normalHtml += `
        <div class="sub-available-row">
          <span class="sub-icon">${cfg.icon}</span>
          <span class="sub-name">${cfg.name}</span>
          <div class="sub-btn-group">
            <button class="sub-open-btn sub-action-btn${canAffordOpen ? '' : ' sub-btn-disabled'}"
              onclick="${canAffordOpen ? `confirmOpenSub('${cityId}','${type}')` : ''}"
              title="${canAffordOpen ? '' : '资金不足'}">新设 ${fmt(openCost)}</button>
            <button class="sub-acquire-btn sub-action-btn${canAffordAcquire ? '' : ' sub-btn-disabled'}"
              onclick="${canAffordAcquire ? `confirmAcquireSub('${cityId}','${type}')` : ''}"
              title="${canAffordAcquire ? '' : '资金不足'}">收购 ${fmt(acquireCost)}</button>
          </div>
        </div>`;
    });
  }

  // 投资共建（机场）— 删除分割线，改用section title
  let investHtml = '';
  if (availableAirport.length > 0) {
    investHtml = '<div class="sub-section-title sub-invest-title">┃ 投资共建 ┃</div>';
    availableAirport.forEach(type => {
      const cfg = SUB_TYPES[type];
      const investCost = calcSubOpenCost(type, cityId);
      const canAfford = G.cash >= investCost;
      const costStr = investCost > 500 ? fmt(investCost).replace('M','B').replace(/[\d.]+/, m => (parseFloat(m)/1000).toFixed(2)) : fmt(investCost);
      investHtml += `
        <div class="sub-available-row sub-invest-row">
          <span class="sub-icon">${cfg.icon}</span>
          <span class="sub-name">${cfg.name}</span>
          <button class="sub-invest-btn${canAfford ? '' : ' sub-btn-disabled'}"
            onclick="${canAfford ? `confirmInvestSub('${cityId}','${type}')` : ''}"
            title="${canAfford ? '' : '资金不足'}">投资 ${costStr}</button>
        </div>`;
    });
  }

  // 无任何可操作内容
  if (existing.length === 0 && available.length === 0) {
    existingHtml = '<div class="sub-empty">该城市暂无子公司相关操作</div>';
  }

  const html = `
      <div class="city-drawer-header">
        <span class="sub-city-name">${city.name}</span>
        <span class="sub-city-level">${'⭐'.repeat(city.level)}</span>
        <span class="sub-city-region">${regionName}</span>
        <button class="city-drawer-close" onclick="closeCityDrawer()">✕</button>
      </div>
      <div class="sub-drawer-stats">
        <div class="sub-stat">Bus. ${cs ? cs.biz : '-'}</div>
        <div class="sub-stat">Tour. ${cs ? cs.tour : '-'}</div>
        <div class="sub-stat">👥 ${cs ? (cs.pop).toFixed(1) + 'M' : '-'}</div>
      </div>
      ${megaHint}
      ${existingHtml}
      ${normalHtml}
      ${investHtml}`;

  const drawer = document.getElementById('city-drawer');
  if (drawer) {
    drawer.innerHTML = html;
    drawer.classList.add('city-drawer-open');
  }
}

// ═══════════════════════════════════════════════════════
// 确认弹窗（使用Modal，操作后返回城市抽屉）
// ═══════════════════════════════════════════════════════

/** 新设子公司确认弹窗 */
function confirmOpenSub(cityId, type) {
  const city = getCity(cityId);
  const cfg = SUB_TYPES[type];
  const cost = calcSubOpenCost(type, cityId);
  const fee = Math.round(cost * SUB_FEE_RATE);
  const totalCost = cost + fee;
  const cashAfter = G.cash - totalCost;

  const html = `
    <div class="sub-confirm">
      <h3>${cfg.icon} 新设${cfg.name} — ${city.name}</h3>
      <div class="sub-confirm-info">
        <div>新设成本: <strong>${fmt(cost)}</strong></div>
        <div>手续费(1%): <strong>${fmt(fee)}</strong></div>
      </div>
      <div class="sub-confirm-cash">
        当前现金: <span style="color:#4ade80">${fmt(G.cash)}</span> → 投资后: <strong style="color:#f87171">${fmt(cashAfter)}</strong>
      </div>
      <div class="sub-confirm-actions">
        <button onclick="closeModal()">取消</button>
        <button class="sub-btn-open" onclick="executeOpenSub('${cityId}','${type}')">确认新设 ${fmt(totalCost)}</button>
      </div>
    </div>`;
  showModal(html);
}

/** 收购子公司确认弹窗 */
function confirmAcquireSub(cityId, type) {
  const city = getCity(cityId);
  const cfg = SUB_TYPES[type];
  const acquireCost = getAcquirePrice(type, cityId);
  const fee = Math.round(acquireCost * SUB_FEE_RATE);
  const totalCost = acquireCost + fee;
  const cashAfter = G.cash - totalCost;

  const html = `
    <div class="sub-confirm">
      <h3>${cfg.icon} 收购${cfg.name} — ${city.name}</h3>
      <div class="sub-confirm-info">
        <div>收购价格: <strong>${fmt(acquireCost)}</strong></div>
        <div>手续费(1%): <strong>${fmt(fee)}</strong></div>
      </div>
      <div class="sub-confirm-cash">
        当前现金: <span style="color:#4ade80">${fmt(G.cash)}</span> → 收购后: <strong style="color:#f87171">${fmt(cashAfter)}</strong>
      </div>
      <div class="sub-confirm-actions">
        <button onclick="closeModal()">取消</button>
        <button class="sub-btn-acquire" onclick="executeAcquireSub('${cityId}','${type}')">确认收购 ${fmt(totalCost)}</button>
      </div>
    </div>`;
  showModal(html);
}

/** 投资共建机场确认弹窗 */
function confirmInvestSub(cityId, type) {
  const city = getCity(cityId);
  const cfg = SUB_TYPES[type];
  const investCost = calcSubOpenCost(type, cityId);
  const fee = Math.round(investCost * SUB_FEE_RATE);
  const totalCost = investCost + fee;
  const cashAfter = G.cash - totalCost;

  const html = `
    <div class="sub-confirm">
      <h3>${cfg.icon} 投资共建 — ${city.name}机场</h3>
      <div class="sub-confirm-info sub-invest-info">
        <div class="sub-invest-project">🏛️ 招标项目</div>
        <div>${city.name}机场 × 玩家航空公司</div>
        <div>投资金额: <strong>${fmt(investCost)}</strong></div>
        <div>手续费(1%): <strong>${fmt(fee)}</strong></div>
        <div>企业持股: 85% · 机场持股: 15%</div>
        <div class="sub-invest-divider-line">── 退出机制 ──</div>
        <div>⚠️ 仅可机场回购股份</div>
      </div>
      <div class="sub-confirm-cash">
        当前现金: <span style="color:#4ade80">${fmt(G.cash)}</span> → 投资后: <strong style="color:#f87171">${fmt(cashAfter)}</strong>
      </div>
      <div class="sub-confirm-actions">
        <button onclick="closeModal()">取消</button>
        <button class="sub-btn-invest" onclick="executeInvestSub('${cityId}','${type}')">确认投资 ${fmt(totalCost)}</button>
      </div>
    </div>`;
  showModal(html);
}

/** 出售/回购确认弹窗 */
function confirmSellSub(cityId, type) {
  const city = getCity(cityId);
  const cfg = SUB_TYPES[type];
  const sub = G.subsidiaries?.[cityId]?.find(s => s.type === type);
  if (!sub) return;

  const isAirport = type === 'airport';
  const grossPrice = isAirport
    ? Math.round(sub.currentValue * SUB_AIRPORT_SELLBACK_RATE)
    : Math.round(sub.currentValue);
  const fee = Math.round(grossPrice * SUB_FEE_RATE);
  const sellPrice = grossPrice - fee;
  const title = isAirport ? '退出投资共建' : '出售子公司';
  const btnLabel = isAirport ? '确认回购' : '确认出售';

  const html = `
    <div class="sub-confirm">
      <h3>${cfg.icon} ${title} — ${city.name}${cfg.name}</h3>
      <div class="sub-confirm-info">
        <div>成交金额: <strong>${fmt(grossPrice)}</strong></div>
        <div>手续费(1%): <strong>${fmt(fee)}</strong></div>
        <div>实得金额: <strong style="color:#4ade80">${fmt(sellPrice)}</strong></div>
        ${isAirport ? '<div style="color:#d97706">⚠️ 回购退出价=估值×60%</div>' : ''}
        <div>原始${isAirport ? '投资' : '成本'}: ${fmt(sub.openCost)}</div>
        <div>当前估值: ${fmt(sub.currentValue)}</div>
      </div>
      <div class="sub-confirm-actions">
        <button onclick="closeModal()">取消</button>
        <button class="sub-btn-sell" onclick="executeSellSub('${cityId}','${type}')">${btnLabel}</button>
      </div>
    </div>`;
  showModal(html);
}

// ═══════════════════════════════════════════════════════
// 执行操作 — 操作后返回城市抽屉
// ═══════════════════════════════════════════════════════

function executeOpenSub(cityId, type) {
  const result = openSubsidiary(type, cityId);
  closeModal();
  if (result.ok) {
    const cfg = SUB_TYPES[type];
    showBanner(`${getCity(cityId).name}${cfg.name}已开设`, '#4ade80');
    updateHUD();
    // 返回城市抽屉
    if (_cityDrawerCityId) renderCityDrawer(cityId);
  } else {
    showBanner(result.msg, '#f87171');
  }
}

function executeAcquireSub(cityId, type) {
  const result = acquireSubsidiary(type, cityId);
  closeModal();
  if (result.ok) {
    const cfg = SUB_TYPES[type];
    showBanner(`成功收购${getCity(cityId).name}${cfg.name}`, '#60a5fa');
    updateHUD();
    if (_cityDrawerCityId) renderCityDrawer(cityId);
  } else {
    showBanner(result.msg, '#f87171');
  }
}

function executeInvestSub(cityId, type) {
  const result = openSubsidiary(type, cityId);
  closeModal();
  if (result.ok) {
    showBanner(`投资共建${getCity(cityId).name}机场已启动`, '#DAA520');
    updateHUD();
    if (_cityDrawerCityId) renderCityDrawer(cityId);
  } else {
    showBanner(result.msg, '#f87171');
  }
}

function executeSellSub(cityId, type) {
  const result = sellSubsidiary(cityId, type);
  closeModal();
  if (result.ok) {
    const cfg = SUB_TYPES[type];
    const isAirport = type === 'airport';
    const msg = isAirport
      ? `退出${getCity(cityId).name}机场投资共建，获得${fmt(result.sellPrice)}`
      : `出售${getCity(cityId).name}${cfg.name}，获得${fmt(result.sellPrice)}`;
    showBanner(msg, isAirport ? '#d97706' : '#4ade80');
    updateHUD();
    // 返回城市抽屉
    if (_cityDrawerCityId) renderCityDrawer(cityId);
  } else {
    showBanner('出售失败', '#f87171');
  }
}

// ═══════════════════════════════════════════════════════
// 子公司总览 Modal
// ═══════════════════════════════════════════════════════

let _subOverviewPage = 0;
let _subOverviewPageSize = 15;
let _subOverviewSortKey = 'currentValue';
let _subOverviewSortDir = 'desc';

/** 打开子公司总览Modal */
function openSubsidiaryOverview() {
  _subOverviewPage = 0;
  renderSubOverview();
}

function renderSubOverview() {
  const allSubs = getAllSubsidiaries();
  const totalValue = allSubs.reduce((s, sub) => s + sub.currentValue, 0);
  let totalReturn = 0;
  allSubs.forEach(sub => { if (!sub.isNew) totalReturn += calcSubReturn(sub, sub.cityId).net; });

  // 排序
  const sorted = [...allSubs].sort((a, b) => {
    let va = a[_subOverviewSortKey], vb = b[_subOverviewSortKey];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (_subOverviewSortDir === 'asc') return va > vb ? 1 : va < vb ? -1 : 0;
    return va < vb ? 1 : va > vb ? -1 : 0;
  });

  // 分页
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / _subOverviewPageSize));
  _subOverviewPage = Math.min(_subOverviewPage, totalPages - 1);
  const start = _subOverviewPage * _subOverviewPageSize;
  const pageItems = sorted.slice(start, start + _subOverviewPageSize);

  let rowsHtml = '';
  pageItems.forEach(sub => {
    const city = getCity(sub.cityId);
    const cfg = SUB_TYPES[sub.type];
    const ret = calcSubReturn(sub, sub.cityId);
    const sourceClass = sub.source === 'invest' ? 'sub-source-invest' :
                        sub.source === 'acquire' ? 'sub-source-acquire' : 'sub-source-open';
    const sourceLabel = sub.source === 'invest' ? '投资' :
                         sub.source === 'acquire' ? '收购' : '新设';
    // 估值颜色: >成本→红, <成本→绿
    const valColor = sub.currentValue > sub.openCost ? '#f87171' : sub.currentValue < sub.openCost ? '#4ade80' : '#e0e8f0';
    // 回报颜色: +→红, -→绿; 新建子公司显示NEW
    const retDisplay = sub.isNew
      ? '<span style="color:#fbbf24;font-weight:700">NEW</span>'
      : `<span style="color:${ret.net >= 0 ? '#f87171' : '#4ade80'};font-weight:600">${ret.net >= 0 ? '+' : ''}${fmt(ret.net)}/Q</span>`;
    // 操作按钮
    const isAirport = sub.type === 'airport';
    const sellPrice = isAirport ? Math.round(sub.currentValue * SUB_AIRPORT_SELLBACK_RATE) : Math.round(sub.currentValue);
    const actionBtnLabel = isAirport ? '回购' : '出售';
    const actionBtn = `<button class="btn btn-sm" style="background:#dc262630;color:#f87171;border:1px solid #f8717140;padding:2px 10px;font-size:12px;border-radius:4px;cursor:pointer;white-space:nowrap" onclick="confirmSellSubFromOverview('${sub.cityId}','${sub.type}')">${actionBtnLabel}</button>`;
    rowsHtml += `<tr>
      <td>${city ? city.name : sub.cityId}</td>
      <td>${cfg.icon} ${cfg.name}</td>
      <td class="${sourceClass}">${sourceLabel}</td>
      <td>${fmt(sub.openCost)}</td>
      <td style="color:${valColor};font-weight:600">${fmt(sub.currentValue)}</td>
      <td>${retDisplay}</td>
      <td style="white-space:nowrap">${actionBtn}</td>
    </tr>`;
  });

  const paginationHtml = totalItems > _subOverviewPageSize ? `
    <div class="sub-pagination">
      <button onclick="_subOverviewPage=0;renderSubOverview()" ${_subOverviewPage===0?'disabled':''}>◀◀</button>
      <button onclick="_subOverviewPage=Math.max(0,_subOverviewPage-1);renderSubOverview()" ${_subOverviewPage===0?'disabled':''}>◀</button>
      <span> ${_subOverviewPage+1} / ${totalPages} </span>
      <button onclick="_subOverviewPage=Math.min(${totalPages-1},_subOverviewPage+1);renderSubOverview()" ${_subOverviewPage>=totalPages-1?'disabled':''}>▶</button>
      <span class="sub-page-size">
        每页 <select onchange="_subOverviewPageSize=parseInt(this.value);_subOverviewPage=0;renderSubOverview()">
          <option value="10" ${_subOverviewPageSize===10?'selected':''}>10</option>
          <option value="15" ${_subOverviewPageSize===15?'selected':''}>15</option>
          <option value="20" ${_subOverviewPageSize===20?'selected':''}>20</option>
        </select>
      </span>
    </div>` : '';

  const sortTh = (key, label) => {
    const arrow = _subOverviewSortKey === key ? (_subOverviewSortDir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<th class="sub-sortable" onclick="_subOverviewSortKey='${key}';_subOverviewSortDir=_subOverviewSortKey==='${key}'&&_subOverviewSortDir==='desc'?'asc':'desc';renderSubOverview()">${label}${arrow}</th>`;
  };

  const html = `
    <div class="sub-overview">
      <h2>投资管理 &nbsp; ${G.year} Q${G.quarter}</h2>
      <div class="sub-overview-summary">
        总估值: <strong>${fmt(totalValue)}</strong> &nbsp; 本季回报: <strong style="color:${totalReturn>=0?'#f87171':'#4ade80'}">${totalReturn >= 0 ? '+' : ''}${fmt(totalReturn)}</strong> &nbsp; 回报率: <strong>${totalValue > 0 ? ((totalReturn/totalValue)*100).toFixed(2) : '0.00'}%/Q</strong>
      </div>
      ${allSubs.length === 0 ? '<div class="sub-empty">暂无子公司</div>' : `
      <table class="sub-table" style="font-size:14px">
        <thead><tr>
          ${sortTh('cityId', '城市')}
          ${sortTh('type', '子公司')}
          <th>来源</th>
          ${sortTh('openCost', '成本')}
          ${sortTh('currentValue', '估值')}
          ${sortTh('_netReturn', '回报/Q')}
          <th>操作</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${paginationHtml}`}
      <div class="sub-confirm-actions" style="margin-top:12px">
        <button onclick="closeModal()">关闭</button>
      </div>
    </div>`;
  $('modal-root').innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal" style="position:relative;max-width:900px;min-width:700px">${html}</div></div>`;
}

/** 从总览页出售子公司 — 弹出确认后返回总览 */
function confirmSellSubFromOverview(cityId, type) {
  const city = getCity(cityId);
  const cfg = SUB_TYPES[type];
  const sub = G.subsidiaries?.[cityId]?.find(s => s.type === type);
  if (!sub) return;

  const isAirport = type === 'airport';
  const grossPrice = isAirport
    ? Math.round(sub.currentValue * SUB_AIRPORT_SELLBACK_RATE)
    : Math.round(sub.currentValue);
  const fee = Math.round(grossPrice * SUB_FEE_RATE);
  const sellPrice = grossPrice - fee;
  const title = isAirport ? '退出投资' : '出售子公司';
  const btnLabel = isAirport ? '确认回购' : '确认出售';

  const html = `
    <div class="sub-confirm">
      <h3>${cfg.icon} ${title} — ${city.name}${cfg.name}</h3>
      <div class="sub-confirm-info">
        <div>成交金额: <strong>${fmt(grossPrice)}</strong></div>
        <div>手续费(1%): <strong>${fmt(fee)}</strong></div>
        <div>实得金额: <strong style="color:#4ade80">${fmt(sellPrice)}</strong></div>
        ${isAirport ? '<div style="color:#d97706">回购退出价=估值×60%</div>' : ''}
        <div>原始${isAirport ? '投资' : '成本'}: ${fmt(sub.openCost)}</div>
        <div>当前估值: ${fmt(sub.currentValue)}</div>
      </div>
      <div class="sub-confirm-actions">
        <button onclick="renderSubOverview()">取消</button>
        <button class="sub-btn-sell" onclick="executeSellSubFromOverview('${cityId}','${type}')">${btnLabel}</button>
      </div>
    </div>`;
  showModal(html);
}

function executeSellSubFromOverview(cityId, type) {
  const result = sellSubsidiary(cityId, type);
  if (result.ok) {
    const cfg = SUB_TYPES[type];
    const isAirport = type === 'airport';
    const msg = isAirport
      ? `退出${getCity(cityId).name}机场投资，获得${fmt(result.sellPrice)}`
      : `出售${getCity(cityId).name}${cfg.name}，获得${fmt(result.sellPrice)}`;
    showBanner(msg, isAirport ? '#d97706' : '#4ade80');
    updateHUD();
  } else {
    showBanner('出售失败', '#f87171');
  }
  // 返回投资管理总览（不关闭）
  renderSubOverview();
}

/** 公司市值详情Modal */
function openCompanyValueModal() {
  const cv = calcCompanyValue();
  const html = `
    <div class="sub-confirm">
      <h2>💰 公司市值</h2>
      <div class="sub-confirm-info" style="text-align:left">
        <div>现金: ${fmt(cv.cash)}</div>
        <div>飞机总值: ${fmt(cv.fleetValue)}</div>
        <div>子公司总值: ${fmt(cv.subValue)}</div>
        <div>股票持仓市值: ${fmt(cv.stockValue)}</div>
        <div style="color:#f87171">贷款负债: -${fmt(cv.loanDebt)}</div>
        <div style="border-top:1px solid #555;margin:8px 0;padding-top:8px;font-size:1.2em;font-weight:bold;color:${cv.totalNetWorth >= 0 ? '#4ade80' : '#f87171'}">净资产: ${fmt(cv.totalNetWorth)}</div>
      </div>
      <div class="sub-confirm-actions" style="margin-top:12px">
        <button onclick="closeModal()">关闭</button>
      </div>
    </div>`;
  showModal(html);
}
