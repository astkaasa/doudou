// ===== CONTRACT CARD UI (v0.6.3) =====
// 年度招聘 & 年终奖金：合同卡片取代事件弹窗
// 设计文档：docs/contract-card-design.md

// ── 合同卡片 UI 状态 ──
let _cards = {};       // { recruit: { expanded, selected }, bonus: { expanded, selected } }
let _guideVisible = false;

// ══════════════════════════════════════
// 合同浮现
// ══════════════════════════════════════

function spawnPendingContracts() {
  if (!G || G.gameOver) return;
  if (G._pendingRecruit && !_cards.recruit) {
    _cards.recruit = { expanded: false, selected: 'standard', signing: false };
    renderContractZone();
    // 触发卷入动画
    requestAnimationFrame(() => {
      const el = document.getElementById('contract-card-recruit');
      if (el) el.classList.add('contract-enter');
    });
  }
  if (G._pendingBonus && !_cards.bonus) {
    _cards.bonus = { expanded: false, selected: 'mid', signing: false };
    renderContractZone();
    requestAnimationFrame(() => {
      const el = document.getElementById('contract-card-bonus');
      if (el) el.classList.add('contract-enter');
    });
  }
  updateAdvanceBtn();
}

// ══════════════════════════════════════
// 渲染合同区域
// ══════════════════════════════════════

function renderContractZone() {
  const zone = document.getElementById('contract-zone');
  if (!zone) return;

  const parts = [];
  // 渲染顺序：招聘在上，奖金在下
  if (_cards.recruit) parts.push(renderCard('recruit'));
  if (_cards.bonus)   parts.push(renderCard('bonus'));

  // 引导条（守门检查第二层）
  if (_guideVisible && G) {
    const names = [];
    if (G._pendingRecruit) names.push('年度招聘');
    if (G._pendingBonus)   names.push('年终奖金');
    parts.push(`<div class="advance-guide" id="advance-guide">
      <span class="guide-text">请先签署：${names.join('、')}</span>
      <button class="guide-sign-btn" onclick="goSign()">去签署</button>
    </div>`);
  }

  zone.innerHTML = parts.join('');
}

function renderCard(type) {
  const c = _cards[type];
  if (!c) return '';
  const isR = type === 'recruit';

  // ── 已签署收据态 ──
  if (c.signing) {
    const title = isR ? '年度招聘' : '年终奖金';
    const icon  = isR ? '🍂' : '🎊';
    const result = c.receiptText || '已签署';
    return `<div class="contract-card contract-signed" id="contract-card-${type}">
      <div class="contract-header">
        <span class="contract-icon">${icon}</span>
        <span class="contract-title">${title}</span>
        <span class="contract-badge signed">已签署 ✓</span>
      </div>
      <div class="contract-receipt-text">${result}</div>
    </div>`;
  }

  const title = isR ? '年度招聘' : '年终奖金';
  const icon  = isR ? '🍂' : '🎊';
  const qLabel = G ? `${G.year} Q${G.quarter}` : '';

  // ── 折叠/展开态 ──
  const expanded = c.expanded;
  let bodyHtml = '';
  if (expanded) {
    bodyHtml = isR ? renderRecruitBody(c) : renderBonusBody(c);
  }

  return `<div class="contract-card ${expanded ? 'contract-expanded' : 'contract-folded'}" id="contract-card-${type}">
    <div class="contract-header" onclick="toggleContract('${type}')">
      <span class="contract-icon">${icon}</span>
      <span class="contract-title">${title}</span>
      ${expanded ? `<span class="contract-quarter">${qLabel}</span>` : '<span class="contract-badge unsigned">未签署</span><span class="dot-pulse"></span>'}
      <span class="contract-arrow">${expanded ? '▲' : '▼'}</span>
    </div>
    <div class="contract-body" style="${expanded ? '' : 'display:none'}">${bodyHtml}</div>
  </div>`;
}

// ── 招聘展开内容 ──
function renderRecruitBody(c) {
  G.staffNeeded = calcStaffNeeded(G);
  const fillRate = G.staffNeeded > 0 ? G.staffCount / G.staffNeeded : 1;
  const fillPct = (fillRate * 100).toFixed(0);
  const staffDisplay = Math.round(G.staffCount * 1000);
  const needDisplay = Math.round(G.staffNeeded * 1000);

  const expandQty  = Math.max(0, G.staffNeeded * RECRUIT_TARGET_EXPAND - G.staffCount);
  const standardQty = Math.max(0, G.staffNeeded * RECRUIT_TARGET_STANDARD - G.staffCount);
  const expandCost  = expandQty * STAFF_RECRUIT_COST;
  const standardCost = standardQty * STAFF_RECRUIT_COST;
  const expandFillPct  = G.staffNeeded > 0 ? ((G.staffCount + expandQty) / G.staffNeeded * 100).toFixed(0) : '—';
  const standardFillPct = G.staffNeeded > 0 ? ((G.staffCount + standardQty) / G.staffNeeded * 100).toFixed(0) : '—';

  const opts = [
    { key: 'expand',   label: '扩员', desc: `~${expandFillPct}%`, cost: expandCost, qty: expandQty },
    { key: 'standard', label: '标准', desc: `~${standardFillPct}%`, cost: standardCost, qty: standardQty },
    { key: 'tight',    label: '紧缩', desc: `${fillPct}%`,         cost: 0, qty: 0 },
  ];

  const optsHtml = opts.map(o => {
    const sel = c.selected === o.key;
    return `<div class="contract-option ${sel ? 'selected' : ''}" onclick="selectContractOpt('recruit','${o.key}')">
      <div class="opt-name">${o.label}</div>
      <div class="opt-desc">满编${o.desc}</div>
      <div class="opt-cost" style="color:${o.cost > 0 ? '#f87171' : '#556'}">${o.cost > 0 ? fmt(o.cost) : '$0'}</div>
      ${o.qty > 0 ? `<div class="opt-qty">+${Math.round(o.qty * 1000)}人</div>` : ''}
    </div>`;
  }).join('');

  return `<div class="contract-info">
      <span>在编 ${staffDisplay.toLocaleString()}人</span>
      <span>需求 ${needDisplay.toLocaleString()}人</span>
      <span>满编 ${fillPct}%</span>
    </div>
    <div class="contract-options">${optsHtml}</div>
    <button class="contract-sign-btn" onclick="signContract('recruit')">签署合同 ✓</button>`;
}

// ── 奖金展开内容 ──
function renderBonusBody(c) {
  const staffDisplay = Math.round(G.staffCount * 1000);
  const tiers = [
    { key: 'high', label: '丰厚', unitCost: BONUS_COST_HIGH, morale: BONUS_MORALE_HIGH },
    { key: 'mid',  label: '标准', unitCost: BONUS_COST_MID,  morale: BONUS_MORALE_MID },
    { key: 'low',  label: '象征性', unitCost: BONUS_COST_LOW, morale: BONUS_MORALE_LOW },
  ];

  const optsHtml = tiers.map(t => {
    const totalCost = G.staffCount * t.unitCost;
    const sel = c.selected === t.key;
    return `<div class="contract-option ${sel ? 'selected' : ''}" onclick="selectContractOpt('bonus','${t.key}')">
      <div class="opt-name">${t.label}</div>
      <div class="opt-desc">士气 +${t.morale}</div>
      <div class="opt-cost" style="color:#f87171">${fmt(totalCost)}</div>
    </div>`;
  }).join('');

  return `<div class="contract-info">
      <span>士气 ${moraleStars(G.staffMorale)}</span>
      <span>在编 ${staffDisplay.toLocaleString()}人</span>
    </div>
    <div class="contract-options">${optsHtml}</div>
    <button class="contract-sign-btn" onclick="signContract('bonus')">签署合同 ✓</button>`;
}

// ══════════════════════════════════════
// 交互操作
// ══════════════════════════════════════

function toggleContract(type) {
  const c = _cards[type];
  if (!c || c.signing) return;
  c.expanded = !c.expanded;
  renderContractZone();
}

function selectContractOpt(type, key) {
  const c = _cards[type];
  if (!c || c.signing) return;
  c.selected = key;
  renderContractZone();
}

function signContract(type) {
  if (!G) return;
  const c = _cards[type];
  if (!c || c.signing) return;

  // 执行确认逻辑（复用 operations.js 中的 confirm 逻辑，但不使用 showModal/closeModal）
  if (type === 'recruit') {
    doConfirmRecruit(c);
  } else {
    doConfirmBonus(c);
  }
}

function doConfirmRecruit(c) {
  G.staffNeeded = calcStaffNeeded(G);
  const key = c.selected;
  let recruitQty = 0;
  if (key === 'expand') {
    recruitQty = Math.max(0, G.staffNeeded * RECRUIT_TARGET_EXPAND - G.staffCount);
  } else if (key === 'standard') {
    recruitQty = Math.max(0, G.staffNeeded * RECRUIT_TARGET_STANDARD - G.staffCount);
  }
  const cost = recruitQty * STAFF_RECRUIT_COST;
  G.staffCount += recruitQty;
  G.cash -= cost;
  G._recruitCostThisTurn = cost;
  G._pendingRecruit = false;

  const labelMap = { expand: '扩员', standard: '标准', tight: '紧缩' };
  const receiptText = `✓ ${labelMap[key]} · ${recruitQty > 0 ? '+' + Math.round(recruitQty * 1000) + '人' : '未招人'} · ${cost > 0 ? fmt(cost) : '$0'}`;
  c.signing = true;
  c.receiptText = receiptText;
  renderContractZone();

  // 签署仪式感动画
  animateSigning('recruit', () => {
    showBanner(`招聘完成：${recruitQty > 0 ? '+' + Math.round(recruitQty * 1000) + '人' : '紧缩方案'}，费用${fmt(cost)}`, '#2563eb');
    // 3秒后收据淡出
    setTimeout(() => {
      delete _cards.recruit;
      renderContractZone();
      updateAdvanceBtn();
      updateHUD();
      // 招聘签完后检查是否还有奖金待签
      if (G._pendingBonus && _cards.bonus && !_cards.bonus.expanded) {
        _cards.bonus.expanded = true;
        renderContractZone();
      }
    }, 2500);
  });
}

function doConfirmBonus(c) {
  const tierMap = {
    high: { unitCost: BONUS_COST_HIGH, morale: BONUS_MORALE_HIGH, label: '丰厚' },
    mid:  { unitCost: BONUS_COST_MID,  morale: BONUS_MORALE_MID,  label: '标准' },
    low:  { unitCost: BONUS_COST_LOW,  morale: BONUS_MORALE_LOW,  label: '象征性' },
  };
  const t = tierMap[c.selected];
  const cost = G.staffCount * t.unitCost;
  G.staffMorale = clamp(G.staffMorale + t.morale, 0, 100);
  G.cash -= cost;
  G._bonusCostThisTurn = cost;
  G.opsEfficiency = calcOpsEfficiency(G);
  G._pendingBonus = false;

  const receiptText = `✓ ${t.label} · 士气+${t.morale} · ${fmt(cost)}`;
  c.signing = true;
  c.receiptText = receiptText;
  renderContractZone();

  animateSigning('bonus', () => {
    showBanner(`年终奖金已发放：士气+${t.morale}，费用${fmt(cost)}`, '#d97706');
    setTimeout(() => {
      delete _cards.bonus;
      renderContractZone();
      updateAdvanceBtn();
      updateHUD();
    }, 2500);
  });
}

// ── 签署动画 ──
function animateSigning(type, onDone) {
  const card = document.getElementById('contract-card-' + type);
  if (!card) { onDone(); return; }
  // 盖章抖动
  card.classList.add('contract-stamping');
  setTimeout(() => {
    card.classList.remove('contract-stamping');
    onDone();
  }, 400);
}

// ── 从运营面板打开合同卡片 ──
function openContractFromPanel(type) {
  if (!G) return;
  // 确保合同存在
  if (type === 'recruit' && G._pendingRecruit && !_cards.recruit) {
    _cards.recruit = { expanded: false, selected: 'standard', signing: false };
  }
  if (type === 'bonus' && G._pendingBonus && !_cards.bonus) {
    _cards.bonus = { expanded: false, selected: 'mid', signing: false };
  }
  const c = _cards[type];
  if (c) {
    c.expanded = true;
    renderContractZone();
    // 高亮闪烁
    setTimeout(() => {
      const el = document.getElementById('contract-card-' + type);
      if (el) {
        el.classList.add('contract-highlight');
        setTimeout(() => el.classList.remove('contract-highlight'), 600);
      }
    }, 50);
  }
  closeModal(); // 关闭运营面板
}

// ══════════════════════════════════════
// 守门检查：推进回合软阻断
// ══════════════════════════════════════

function handleAdvance() {
  if (!G || G.gameOver) return;
  const hasPending = G._pendingRecruit || G._pendingBonus;
  if (!hasPending) {
    advanceTurn();
    return;
  }
  // 有待签署合同 → 显示引导条
  if (!_guideVisible) {
    _guideVisible = true;
    renderContractZone();
  }
}

function goSign() {
  _guideVisible = false;
  renderContractZone();
  // 展开第一个待签署的合同
  let target = null;
  if (G._pendingRecruit && _cards.recruit) target = 'recruit';
  else if (G._pendingBonus && _cards.bonus) target = 'bonus';
  if (!target) return;

  const c = _cards[target];
  if (!c.expanded) {
    c.expanded = true;
    renderContractZone();
  }
  // 高亮闪烁引导注意
  setTimeout(() => {
    const el = document.getElementById('contract-card-' + target);
    if (el) {
      el.classList.add('contract-highlight');
      setTimeout(() => el.classList.remove('contract-highlight'), 600);
    }
  }, 50);
}

// ── 推进按钮状态更新 ──
function updateAdvanceBtn() {
  const btn = document.getElementById('advance-btn');
  if (!btn || !G) return;
  const hasPending = G._pendingRecruit || G._pendingBonus;
  if (hasPending) {
    btn.textContent = '⚠ 有待签署';
    btn.className = 'advance-warned';
    btn.style.background = 'linear-gradient(135deg,#d97706,#f59e0b)';
    btn.style.cursor = 'pointer';
  } else {
    btn.textContent = '推进回合 ▶';
    btn.className = '';
    btn.style.background = 'linear-gradient(135deg,#2563eb,#7c3aed)';
    btn.style.cursor = 'pointer';
    // 隐藏引导条
    if (_guideVisible) {
      _guideVisible = false;
      renderContractZone();
    }
  }
}

// ── 加载存档后恢复合同状态 ──
function restoreContractState() {
  _cards = {};
  _guideVisible = false;
  if (!G || G.gameOver) {
    const zone = document.getElementById('contract-zone');
    if (zone) zone.innerHTML = '';
    updateAdvanceBtn();
    return;
  }
  spawnPendingContracts();
  updateAdvanceBtn();
}
