// ===== ANGEL INVESTMENT RESCUE UI =====
// 辣豆基金天使投资 — 首次破产救助交互

// ── 金额池：50,55,60,...,100 (步长5) ──
function _angelAmounts() {
  const arr = [];
  for (let v = ANGEL_INVEST_MIN; v <= ANGEL_INVEST_MAX; v += ANGEL_INVEST_STEP) arr.push(v);
  return arr;
}

// ── 随机选中金额 ──
function _pickAngelAmount() {
  const pool = _angelAmounts();
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── 三阶段入口 ──
function showAngelInvest() {
  _showCrisisPhase();
}

// ══════════════════════════════════════
//  PHASE 1: 危机警告 — 红色脉冲闪烁
// ══════════════════════════════════════
function _showCrisisPhase() {
  const root = $('modal-root');
  root.innerHTML = `
    <div class="angel-overlay angel-crisis-overlay" id="angel-phase-1">
      <div class="angel-crisis-content">
        <div class="angel-crisis-icon">⚠</div>
        <h1 class="angel-crisis-title">资金告急</h1>
        <p class="angel-crisis-desc">你的航空公司资金已跌破安全线！</p>
        <p class="angel-crisis-amount">当前资金：<span class="angel-crisis-cash">${fmt(G.cash)}</span></p>
      </div>
    </div>
  `;
  // 2秒后自动进入下一阶段
  setTimeout(() => _showAngelPhase(), 2200);
}

// ══════════════════════════════════════
//  PHASE 2: 天使降临 — 金色转场 + 介绍
// ══════════════════════════════════════
function _showAngelPhase() {
  const root = $('modal-root');
  root.innerHTML = `
    <div class="angel-overlay angel-descend-overlay" id="angel-phase-2">
      <div class="angel-descend-content">
        <div class="angel-logo">
          <div class="angel-logo-coin">
            <span class="angel-logo-text">辣</span>
          </div>
        </div>
        <h1 class="angel-descend-title">辣豆基金 · 天使投资</h1>
        <p class="angel-descend-quote">"云层之上，<br>总有另一条航线"</p>
        <div class="angel-descend-info">
          <p>辣豆基金向你提供一笔天使投资，助你度过难关。</p>
          <p style="color:#f87171;font-size:12px;margin-top:6px">注：此为一次性救助，下次破产将无法再获援助</p>
        </div>
        <button class="btn angel-start-btn" onclick="_showSlotPhase()">
          ✦ 开始抽取 ✦
        </button>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════
//  PHASE 3: 老虎机抽取 — 滚动数字 + 锁定
// ══════════════════════════════════════
let _angelSlotTimer = null;
let _angelSlotLocked = false;
let _angelFinalAmount = 0;

function _showSlotPhase() {
  _angelSlotLocked = false;
  _angelFinalAmount = _pickAngelAmount();
  const pool = _angelAmounts();

  const root = $('modal-root');
  root.innerHTML = `
    <div class="angel-overlay angel-slot-overlay" id="angel-phase-3">
      <div class="angel-slot-content">
        <h2 class="angel-slot-title">✦ 天使投资抽取 ✦</h2>
        <div class="angel-slot-machine">
          <div class="angel-slot-reel-frame">
            <div class="angel-slot-window">
              <div class="angel-slot-strip" id="angel-strip">
                ${pool.map(v => `<div class="angel-slot-num">$${v}M</div>`).join('')}
              </div>
            </div>
            <div class="angel-slot-pointer"></div>
          </div>
        </div>
        <button class="btn angel-lock-btn" id="angel-lock-btn" onclick="_lockAngelSlot()">
          🎯 锁定金额
        </button>
        <p class="angel-slot-hint" id="angel-slot-hint">数字滚动中…点击按钮锁定！</p>
      </div>
    </div>
  `;

  // 启动滚动动画
  _startAngelSlotRoll(pool);
}

function _startAngelSlotRoll(pool) {
  const strip = $('angel-strip');
  if (!strip) return;
  const numH = 80; // 每个数字的高度（与CSS angel-slot-num一致）
  let idx = 0;
  let speed = 60; // 初始速度（ms）
  let elapsed = 0;

  function tick() {
    idx = (idx + 1) % pool.length;
    strip.style.transform = `translateY(-${idx * numH}px)`;
    elapsed += speed;
  }

  // 先匀速滚动约1.5秒，然后减速
  _angelSlotTimer = setInterval(() => {
    tick();
    // 1.2秒后开始减速
    if (elapsed > 1200) {
      clearInterval(_angelSlotTimer);
      _slowDownToTarget(pool, _angelFinalAmount);
    }
  }, speed);
}

function _slowDownToTarget(pool, targetAmount) {
  const strip = $('angel-strip');
  if (!strip) return;
  const numH = 80;
  const targetIdx = pool.indexOf(targetAmount);

  // 从当前位置逐步减速到目标位置
  let currentIdx = 0;
  // 先快速计算当前strip位置对应的index
  const currentTransform = strip.style.transform;
  const match = currentTransform.match(/translateY\(-(\d+)px\)/);
  if (match) currentIdx = parseInt(match[1]) / numH;

  // 再转2-3圈后停在目标上
  const extraRounds = 2;
  const totalSteps = extraRounds * pool.length + ((targetIdx - currentIdx + pool.length) % pool.length);
  let step = 0;
  let delay = 60;

  function decelerate() {
    if (step >= totalSteps) {
      // 到达目标，触发揭示
      setTimeout(() => _revealAngelResult(targetAmount), 400);
      return;
    }
    step++;
    currentIdx = (currentIdx + 1) % pool.length;
    strip.style.transform = `translateY(-${currentIdx * numH}px)`;

    // 逐步增大延迟（减速效果）
    const progress = step / totalSteps;
    delay = 60 + Math.pow(progress, 2.5) * 400; // 非线性减速
    setTimeout(decelerate, delay);
  }

  decelerate();
}

function _lockAngelSlot() {
  if (_angelSlotLocked) return;
  _angelSlotLocked = true;
  const btn = $('angel-lock-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '锁定中…';
    btn.classList.add('btn-locked');
  }
  const hint = $('angel-slot-hint');
  if (hint) hint.textContent = '正在减速…';
  // 滚动会自然减速到目标，无需额外操作
}

// ══════════════════════════════════════
//  PHASE 4: 结果揭示 + 继续游戏
// ══════════════════════════════════════
function _revealAngelResult(amount) {
  if (_angelSlotTimer) { clearInterval(_angelSlotTimer); _angelSlotTimer = null; }

  const root = $('modal-root');
  root.innerHTML = `
    <div class="angel-overlay angel-result-overlay" id="angel-phase-4">
      <div class="angel-result-content">
        <div class="angel-result-glow"></div>
        <h2 class="angel-result-title">天使投资到账！</h2>
        <div class="angel-result-amount">
          <span class="angel-result-dollar">$</span><span class="angel-result-num">${amount}</span><span class="angel-result-unit">M</span>
        </div>
        <button class="btn angel-continue-btn" onclick="_applyAngelRescue(${amount})">
          ✦ 重振旗鼓 ✦
        </button>
        <p class="angel-result-warning">下次破产将无法再获援助，请谨慎经营！</p>
      </div>
    </div>
  `;
}

// ── 救助生效 ──
function _applyAngelRescue(amount) {
  G.cash = amount;
  // 关闭modal，恢复游戏
  $('modal-root').innerHTML = '';
  // 更新UI
  applySeasonTheme();
  updateHUD();
  renderMap();
  renderPanel();
  showBanner(`辣豆基金注资 $${amount}M，重振旗鼓！`, '#d97706');
}
