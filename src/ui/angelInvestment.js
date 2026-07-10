import { angelInvestmentAmounts, pickAngelInvestmentAmount } from '../domain/angelInvestment.js';
import { byId, fmt } from '../domain/helpers.js';
import { renderModalRoot } from './modal.js';

let phaseTimer = null;
let slotTimer = null;
let finalAmount = 0;
let slotLocked = false;

export function showAngelInvestment(state) {
  clearAngelTimers();
  renderModalRoot(`
    <div class="angel-overlay angel-crisis-overlay" role="dialog" aria-modal="true" aria-label="资金告急" tabindex="-1">
      <div class="angel-crisis-content">
        <div class="angel-crisis-icon">!</div>
        <h1 class="angel-crisis-title">资金告急</h1>
        <p class="angel-crisis-desc">你的航空公司资金已跌破安全线</p>
        <p class="angel-crisis-amount">当前资金：<span class="angel-crisis-cash">${fmt(state.cash)}</span></p>
      </div>
    </div>
  `);
  phaseTimer = window.setTimeout(showAngelIntroPhase, 1800);
}

export function showAngelSlotPhase(state) {
  clearAngelTimers();
  slotLocked = false;
  finalAmount = pickAngelInvestmentAmount(state);
  const amounts = angelInvestmentAmounts();
  renderModalRoot(`
    <div class="angel-overlay angel-slot-overlay" role="dialog" aria-modal="true" aria-label="天使投资抽取" tabindex="-1">
      <div class="angel-slot-content">
        <h2 class="angel-slot-title">天使投资抽取</h2>
        <div class="angel-slot-machine">
          <div class="angel-slot-reel-frame">
            <div class="angel-slot-window">
              <div class="angel-slot-strip" id="angel-strip">
                ${amounts.map((amount) => `<div class="angel-slot-num">$${amount}M</div>`).join('')}
              </div>
            </div>
            <div class="angel-slot-pointer"></div>
          </div>
        </div>
        <button class="btn angel-lock-btn" type="button" id="angel-lock-btn" data-action="lock-angel-slot">锁定金额</button>
        <p class="angel-slot-hint" id="angel-slot-hint">数字滚动中，点击按钮锁定</p>
      </div>
    </div>
  `);
  startSlotRoll(amounts);
}

export function lockAngelSlot() {
  if (slotLocked) return;
  slotLocked = true;
  const button = byId('angel-lock-btn');
  if (button) {
    button.disabled = true;
    button.textContent = '锁定中';
    button.classList.add('btn-locked');
  }
  const hint = byId('angel-slot-hint');
  if (hint) hint.textContent = '正在减速';
}

export function clearAngelTimers() {
  if (phaseTimer) {
    window.clearTimeout(phaseTimer);
    phaseTimer = null;
  }
  if (slotTimer) {
    window.clearInterval(slotTimer);
    slotTimer = null;
  }
}

function showAngelIntroPhase() {
  phaseTimer = null;
  renderModalRoot(`
    <div class="angel-overlay angel-descend-overlay" role="dialog" aria-modal="true" aria-label="辣豆基金天使投资" tabindex="-1">
      <div class="angel-descend-content">
        <div class="angel-logo">
          <div class="angel-logo-coin"><span class="angel-logo-text">辣</span></div>
        </div>
        <h1 class="angel-descend-title">辣豆基金 · 天使投资</h1>
        <p class="angel-descend-quote">“云层之上，<br>总有另一条航线”</p>
        <div class="angel-descend-info">
          <p>辣豆基金向你提供一笔天使投资，助你度过难关。</p>
          <p class="angel-descend-warning">此为一次性救助，下次破产将无法再获援助</p>
        </div>
        <button class="btn angel-start-btn" type="button" data-action="start-angel-slot">开始抽取</button>
      </div>
    </div>
  `);
}

function startSlotRoll(amounts) {
  const strip = byId('angel-strip');
  if (!strip) return;
  const rowHeight = 80;
  let index = 0;
  let elapsed = 0;
  const speed = 60;
  slotTimer = window.setInterval(() => {
    index = (index + 1) % amounts.length;
    strip.style.transform = `translateY(-${index * rowHeight}px)`;
    elapsed += speed;
    if (elapsed > 1200) {
      window.clearInterval(slotTimer);
      slotTimer = null;
      slowDownToTarget(amounts, finalAmount, index);
    }
  }, speed);
}

function slowDownToTarget(amounts, amount, startIndex) {
  const strip = byId('angel-strip');
  if (!strip) return;
  const rowHeight = 80;
  const targetIndex = amounts.indexOf(amount);
  let currentIndex = startIndex;
  const totalSteps = 2 * amounts.length + ((targetIndex - currentIndex + amounts.length) % amounts.length);
  let step = 0;

  function decelerate() {
    if (step >= totalSteps) {
      window.setTimeout(() => revealAngelResult(amount), 350);
      return;
    }
    step++;
    currentIndex = (currentIndex + 1) % amounts.length;
    strip.style.transform = `translateY(-${currentIndex * rowHeight}px)`;
    const progress = step / totalSteps;
    window.setTimeout(decelerate, 60 + Math.pow(progress, 2.5) * 360);
  }

  decelerate();
}

function revealAngelResult(amount) {
  renderModalRoot(`
    <div class="angel-overlay angel-result-overlay" role="dialog" aria-modal="true" aria-label="天使投资到账" tabindex="-1">
      <div class="angel-result-content">
        <div class="angel-result-glow"></div>
        <h2 class="angel-result-title">天使投资到账</h2>
        <div class="angel-result-amount">
          <span class="angel-result-dollar">$</span><span class="angel-result-num">${amount}</span><span class="angel-result-unit">M</span>
        </div>
        <button class="btn angel-continue-btn" type="button" data-action="apply-angel-rescue" data-amount="${amount}">重振旗鼓</button>
        <p class="angel-result-warning">下次破产将无法再获援助，请谨慎经营</p>
      </div>
    </div>
  `);
}
