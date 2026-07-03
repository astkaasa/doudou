// ===== OPERATIONS MANAGEMENT UI (v0.6.1) =====

// ── 辅助函数 ──
function moraleStars(morale) {
  const full = Math.floor(morale / 20);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}

function tierLabel(tier, labels) {
  // labels = {low:'经济', mid:'标准', high:'豪华'}
  return labels[tier] || tier;
}

function tierBtnGroup(currentTier, field, labels) {
  // labels = {low:'经济', mid:'标准', high:'豪华'}
  const keys = ['low', 'mid', 'high'];
  return keys.map(k => {
    const active = currentTier === k;
    const style = active
      ? 'background:#2563eb;color:#fff;font-weight:700;border:1px solid #2563eb'
      : 'background:#1e3a5f;color:#7ba3cc;border:1px solid #1e3a5f';
    return `<button class="btn btn-sm ops-tier-btn" style="${style};padding:3px 10px;font-size:12px;border-radius:4px;cursor:pointer" onclick="setOpsTier('${field}','${k}')">${labels[k]}</button>`;
  }).join('');
}

function setOpsTier(field, tier) {
  if (!G) return;
  G[field] = tier;
  openOperationsPanel(); // 刷新面板
}

// ══════════════════════════════════════
// 运营管理主面板
// ══════════════════════════════════════
function openOperationsPanel() {
  if (!G) return;

  // 重新计算
  G.staffNeeded = calcStaffNeeded(G);
  G.opsEfficiency = calcOpsEfficiency(G);
  const opsBudget = calcOpsBudgetCost(G);
  const fillRate = G.staffNeeded > 0 ? G.staffCount / G.staffNeeded : 1;

  const staffDisplay = Math.round(G.staffCount * 1000);
  const needDisplay = Math.round(G.staffNeeded * 1000);
  const fillPct = (fillRate * 100).toFixed(0);
  const opsPct = G.opsEfficiency > 0 ? (G.opsEfficiency * 100).toFixed(0) : '--';

  const serviceLabels = { low: '经济', mid: '标准', high: '豪华' };
  const maintLabels  = { low: '基础', mid: '标准', high: '深度' };
  const adLabels     = { low: '口碑', mid: '标准', high: '饱和' };

  let html = `<h2 style="margin-bottom:16px">${ICON.cost} 运营管理</h2>`;

  // ── 员工区 ──
  html += `<div class="ops-section">
    <div class="ops-section-title">${ICON.passengers} 员工</div>
    <div class="ops-row"><span class="label">在编</span><span class="val">${staffDisplay.toLocaleString()}人</span></div>
    <div class="ops-row"><span class="label">运营需求</span><span class="val">${needDisplay.toLocaleString()}人</span></div>
    <div class="ops-row"><span class="label">满编率</span><span class="val" style="color:${fillRate>=0.8?'#4ade80':fillRate>=0.6?'#fbbf24':'#f87171'}">${fillPct}%</span></div>
    <div class="ops-row"><span class="label">士气</span><span class="val" style="color:#fbbf24">${moraleStars(G.staffMorale)}</span></div>
    <div class="ops-row"><span class="label">运营效能</span><span class="val" style="color:${G.opsEfficiency>=1.0?'#4ade80':G.opsEfficiency>=0.7?'#fbbf24':'#f87171'}">${opsPct}${G.opsEfficiency>0?'%':''}</span></div>
  </div>`;

  // ── 预算三档区 ──
  html += `<div class="ops-section">
    <div class="ops-section-title">🛋 服务预算</div>
    <div style="display:flex;gap:4px;margin:4px 0">${tierBtnGroup(G.serviceTier, 'serviceTier', serviceLabels)}</div>
    <div class="ops-row"><span class="label">本季费用</span><span class="val" style="color:#f87171">${fmt(opsBudget.serviceCost)}</span></div>
  </div>`;

  html += `<div class="ops-section">
    <div class="ops-section-title">🔧 维修预算</div>
    <div style="display:flex;gap:4px;margin:4px 0">${tierBtnGroup(G.maintTier, 'maintTier', maintLabels)}</div>
    <div class="ops-row"><span class="label">本季费用</span><span class="val" style="color:#f87171">${fmt(opsBudget.maintCost)}</span></div>
  </div>`;

  html += `<div class="ops-section">
    <div class="ops-section-title">📢 广告预算</div>
    <div style="display:flex;gap:4px;margin:4px 0">${tierBtnGroup(G.adTier, 'adTier', adLabels)}</div>
    <div class="ops-row"><span class="label">本季费用</span><span class="val" style="color:#f87171">${fmt(opsBudget.adCost)}</span></div>
  </div>`;

  // ── 事故后效 ──
  if (G.accidentPenalty < 0) {
    html += `<div class="ops-section" style="border-color:#f8717150">
      <div class="ops-row"><span class="label" style="color:#f87171">${ICON.warning} 事故后效</span><span class="val" style="color:#f87171">全局客座率 ${(G.accidentPenalty*100).toFixed(0)}%（剩余${G.accidentPenaltyTurns}季度）</span></div>
    </div>`;
  }

  // ── 运营支出合计 ──
  html += `<div style="margin-top:12px;text-align:center;padding:8px;background:#0a1628;border-radius:8px">
    <span style="color:#7ba3cc;font-size:13px">本季运营预算合计</span>
    <span style="color:#f87171;font-weight:700;font-size:15px;margin-left:8px">${fmt(opsBudget.total)}</span>
  </div>`;

  // ── 待签署合同入口 ──
  if (G._pendingRecruit || G._pendingBonus) {
    const pendingNames = [];
    if (G._pendingRecruit) pendingNames.push('年度招聘');
    if (G._pendingBonus)   pendingNames.push('年终奖金');
    html += `<div class="ops-section" style="border-color:#d9770640;background:#1a1505">
      <div class="ops-section-title" style="color:#d97706">⚠ 待签署合同</div>
      <div style="font-size:12px;color:#fbbf24;margin-bottom:8px">${pendingNames.join('、')}尚待签署</div>
      ${G._pendingRecruit ? `<button class="btn btn-warning btn-sm" style="margin-right:6px;margin-bottom:4px" onclick="openContractFromPanel('recruit')">签署招聘</button>` : ''}
      ${G._pendingBonus ? `<button class="btn btn-warning btn-sm" onclick="openContractFromPanel('bonus')">签署奖金</button>` : ''}
    </div>`;
  }

  html += `<div style="margin-top:16px;text-align:center"><button class="btn btn-primary" onclick="closeModal()" style="padding:8px 32px">关闭</button></div>`;

  showModal(html);
}

// ══════════════════════════════════════
// Q3 年度招聘弹窗
// ══════════════════════════════════════
function showRecruitModal() {
  if (!G) return;

  G.staffNeeded = calcStaffNeeded(G);
  const fillRate = G.staffNeeded > 0 ? G.staffCount / G.staffNeeded : 1;
  const fillPct = (fillRate * 100).toFixed(0);
  const staffDisplay = Math.round(G.staffCount * 1000);
  const needDisplay = Math.round(G.staffNeeded * 1000);

  // 三套方案
  const expandTarget  = G.staffNeeded * RECRUIT_TARGET_EXPAND;
  const standardTarget = G.staffNeeded * RECRUIT_TARGET_STANDARD;
  const expandQty  = Math.max(0, expandTarget - G.staffCount);
  const standardQty = Math.max(0, standardTarget - G.staffCount);
  const expandCost  = expandQty * STAFF_RECRUIT_COST;
  const standardCost = standardQty * STAFF_RECRUIT_COST;

  const expandFillPct  = G.staffNeeded > 0 ? ((G.staffCount + expandQty) / G.staffNeeded * 100).toFixed(0) : '—';
  const standardFillPct = G.staffNeeded > 0 ? ((G.staffCount + standardQty) / G.staffNeeded * 100).toFixed(0) : '—';

  let selectedRecruit = 'standard'; // 默认标准

  let html = `<h2 style="margin-bottom:4px">${ICON.autumn} 年度招聘</h2>
    <div style="color:#7ba3cc;font-size:13px;margin-bottom:16px">${G.year} Q3 — 每年一次的招聘窗口</div>
    <div class="ops-section">
      <div class="ops-row"><span class="label">当前在编</span><span class="val">${staffDisplay.toLocaleString()}人</span></div>
      <div class="ops-row"><span class="label">运营需求</span><span class="val">${needDisplay.toLocaleString()}人</span></div>
      <div class="ops-row"><span class="label">满编率</span><span class="val" style="color:${fillRate>=0.8?'#4ade80':'#fbbf24'}">${fillPct}%</span></div>
    </div>`;

  // 三选项
  const options = [
    { key: 'expand', label: '扩员', desc: `招聘后满编率 ~${expandFillPct}%`, cost: expandCost, qty: expandQty },
    { key: 'standard', label: '标准', desc: `招聘后满编率 ~${standardFillPct}%`, cost: standardCost, qty: standardQty },
    { key: 'tight', label: '紧缩', desc: `维持现状满编率 ${fillPct}%`, cost: 0, qty: 0 },
  ];

  html += `<div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">`;
  options.forEach(opt => {
    const isSelected = selectedRecruit === opt.key;
    html += `<div class="recruit-option" id="recruit-${opt.key}" onclick="selectRecruitOption('${opt.key}')" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:8px;cursor:pointer;border:2px solid ${isSelected?'#2563eb':'#1e3a5f'};background:${isSelected?'#1e3a5f':'#0a1628'};transition:all 0.15s">
      <div>
        <div style="font-weight:700;font-size:14px;color:${isSelected?'#4ade80':'#e0e8f0'}">[${opt.label}]</div>
        <div style="font-size:12px;color:#7ba3cc;margin-top:2px">${opt.desc}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;font-size:14px;color:${opt.cost>0?'#f87171':'#7ba3cc'}">${opt.cost>0?fmt(opt.cost):'$0'}</div>
        ${opt.qty>0?`<div style="font-size:11px;color:#556">+${Math.round(opt.qty*1000)}人</div>`:''}
      </div>
    </div>`;
  });
  html += `</div>`;

  html += `<div style="text-align:center;margin-top:8px">
    <button class="btn btn-primary" onclick="confirmRecruit()" style="padding:10px 40px;font-size:15px;border-radius:8px">确认选择</button>
  </div>`;

  showModal(html);
  // 初始化选中状态
  window._selectedRecruit = 'standard';
  selectRecruitOption('standard');
}

function selectRecruitOption(key) {
  window._selectedRecruit = key;
  ['expand', 'standard', 'tight'].forEach(k => {
    const el = document.getElementById('recruit-' + k);
    if (!el) return;
    if (k === key) {
      el.style.borderColor = '#2563eb';
      el.style.background = '#1e3a5f';
      el.querySelector('div > div:first-child').style.color = '#4ade80';
    } else {
      el.style.borderColor = '#1e3a5f';
      el.style.background = '#0a1628';
      el.querySelector('div > div:first-child').style.color = '#e0e8f0';
    }
  });
}

function confirmRecruit() {
  if (!G || !window._selectedRecruit) return;

  G.staffNeeded = calcStaffNeeded(G);
  const key = window._selectedRecruit;
  let recruitQty = 0;

  if (key === 'expand') {
    recruitQty = Math.max(0, G.staffNeeded * RECRUIT_TARGET_EXPAND - G.staffCount);
  } else if (key === 'standard') {
    recruitQty = Math.max(0, G.staffNeeded * RECRUIT_TARGET_STANDARD - G.staffCount);
  }
  // tight: recruitQty = 0

  const cost = recruitQty * STAFF_RECRUIT_COST;
  G.staffCount += recruitQty;
  G.cash -= cost;
  G._recruitCostThisTurn = cost;

  closeModal();
  showBanner(`招聘完成：+${Math.round(recruitQty*1000)}人，费用${fmt(cost)}`, '#2563eb');
}

// ══════════════════════════════════════
// Q4 年终奖金弹窗
// ══════════════════════════════════════
function showBonusModal() {
  if (!G) return;

  const staffDisplay = Math.round(G.staffCount * 1000);

  const tiers = [
    { key: 'high', label: '丰厚奖金', unitCost: BONUS_COST_HIGH, morale: BONUS_MORALE_HIGH },
    { key: 'mid', label: '标准奖金', unitCost: BONUS_COST_MID, morale: BONUS_MORALE_MID },
    { key: 'low', label: '象征性奖金', unitCost: BONUS_COST_LOW, morale: BONUS_MORALE_LOW },
  ];

  let html = `<h2 style="margin-bottom:4px">🎊 年终奖金</h2>
    <div style="color:#7ba3cc;font-size:13px;margin-bottom:16px">${G.year} Q4 — 年终发放，提振士气</div>
    <div class="ops-section">
      <div class="ops-row"><span class="label">当前士气</span><span class="val" style="color:#fbbf24">${moraleStars(G.staffMorale)}</span></div>
      <div class="ops-row"><span class="label">在编人数</span><span class="val">${staffDisplay.toLocaleString()}人</span></div>
    </div>`;

  html += `<div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">`;
  tiers.forEach((t, i) => {
    const totalCost = G.staffCount * t.unitCost;
    const isSelected = i === 1; // 默认标准
    html += `<div class="bonus-option" id="bonus-${t.key}" onclick="selectBonusOption('${t.key}')" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:8px;cursor:pointer;border:2px solid ${isSelected?'#2563eb':'#1e3a5f'};background:${isSelected?'#1e3a5f':'#0a1628'};transition:all 0.15s">
      <div>
        <div style="font-weight:700;font-size:14px;color:${isSelected?'#4ade80':'#e0e8f0'}">${t.label}</div>
        <div style="font-size:12px;color:#7ba3cc;margin-top:2px">士气 +${t.morale} (${t.unitCost}$M/K人)</div>
      </div>
      <div style="font-weight:700;font-size:14px;color:#f87171">${fmt(totalCost)}</div>
    </div>`;
  });
  html += `</div>`;

  html += `<div style="text-align:center;margin-top:8px">
    <button class="btn btn-primary" onclick="confirmBonus()" style="padding:10px 40px;font-size:15px;border-radius:8px">确认发放</button>
  </div>`;

  showModal(html);
  window._selectedBonus = 'mid';
  selectBonusOption('mid');
}

function selectBonusOption(key) {
  window._selectedBonus = key;
  ['high', 'mid', 'low'].forEach(k => {
    const el = document.getElementById('bonus-' + k);
    if (!el) return;
    if (k === key) {
      el.style.borderColor = '#2563eb';
      el.style.background = '#1e3a5f';
      el.querySelector('div > div:first-child').style.color = '#4ade80';
    } else {
      el.style.borderColor = '#1e3a5f';
      el.style.background = '#0a1628';
      el.querySelector('div > div:first-child').style.color = '#e0e8f0';
    }
  });
}

function confirmBonus() {
  if (!G || !window._selectedBonus) return;

  const tierMap = {
    high: { unitCost: BONUS_COST_HIGH, morale: BONUS_MORALE_HIGH },
    mid:  { unitCost: BONUS_COST_MID,  morale: BONUS_MORALE_MID },
    low:  { unitCost: BONUS_COST_LOW,  morale: BONUS_MORALE_LOW },
  };
  const t = tierMap[window._selectedBonus];
  const cost = G.staffCount * t.unitCost;

  G.staffMorale = clamp(G.staffMorale + t.morale, 0, 100);
  G.cash -= cost;
  G._bonusCostThisTurn = cost;
  G.opsEfficiency = calcOpsEfficiency(G); // 立即重算

  closeModal();
  showBanner(`年终奖金已发放：士气+${t.morale}，费用${fmt(cost)}`, '#d97706');
}
