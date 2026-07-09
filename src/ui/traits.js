import { PLAYER_TRAITS, shufflePlayerTraits } from '../data/playerTraits.js';
import { byId } from '../domain/helpers.js';
import { escapeAttr, escapeHtml } from './html.js';
import { closeModalRoot, renderModalRoot } from './modal.js';

export function showTraitEnvelope(state) {
  if (!state || state.playerTrait || state.traitChosen) return;
  if (!Array.isArray(state.pendingTraitChoices)) state.pendingTraitChoices = shufflePlayerTraits();
  removeTraitOverlay();
  renderModalRoot(`<div id="trait-overlay" role="dialog" aria-modal="true" aria-label="选择航空公司特质" tabindex="-1">
    <div style="text-align:center">
      <button class="envelope-wrap" type="button" data-action="open-trait-coins" aria-label="打开神秘信件">
        <span class="envelope-body">
          <span class="envelope-flap"></span>
          <span class="envelope-seal"></span>
        </span>
      </button>
      <div class="envelope-text">一封神秘信件送达，点击信封打开</div>
    </div>
  </div>`);
}

export function openTraitCoins(state) {
  const overlay = byId('trait-overlay');
  if (!overlay) return;
  if (state && !Array.isArray(state.pendingTraitChoices)) state.pendingTraitChoices = shufflePlayerTraits();
  const traits = state?.pendingTraitChoices || shufflePlayerTraits();
  overlay.innerHTML = `
    <div style="text-align:center">
      <div style="color:#fbbf24;font-size:18px;font-weight:700;margin-bottom:24px">请随机选择一粒金豆</div>
      <div class="coins-stage" id="coins-stage">
        ${traits.map((trait, index) => `
          <button class="coin" type="button" data-action="select-trait-coin" data-trait="${escapeAttr(trait)}" data-coin-index="${index}" aria-label="选择第 ${index + 1} 粒金豆">
            <span class="coin-inner" id="coin-inner-${index}">
              <span class="coin-face"></span>
              <span class="coin-back"><span class="coin-label">${escapeHtml(trait)}</span></span>
            </span>
          </button>
        `).join('')}
      </div>
      <div style="color:#7ba3cc;font-size:12px;margin-top:20px">金豆豆，银豆豆，不如我家的辣豆豆</div>
    </div>`;
}

export function revealSelectedTrait(trait, coinIndex) {
  const overlay = byId('trait-overlay');
  const info = PLAYER_TRAITS[trait];
  if (!overlay || !info) return;
  overlay.querySelectorAll('.coin').forEach((coin) => {
    coin.style.pointerEvents = 'none';
    if (coin.dataset.coinIndex === String(coinIndex)) {
      const inner = byId(`coin-inner-${coinIndex}`);
      if (inner) inner.classList.add('flipped');
    } else {
      coin.classList.add('fading');
    }
  });
  setTimeout(() => {
    if (!overlay.isConnected) return;
    overlay.innerHTML = `
      <div style="text-align:center;animation:fadeInUp 0.5s ease-out">
        <div style="font-size:48px;margin-bottom:8px">🪙</div>
        <div style="font-size:28px;font-weight:700;margin:16px 0 8px;color:${info.color}">「${escapeHtml(trait)}」— ${escapeHtml(info.name)}</div>
        <p style="color:#7ba3cc;font-size:13px;line-height:1.6;max-width:360px">${escapeHtml(info.desc)}</p>
        <button class="btn btn-primary" type="button" data-action="confirm-trait" data-trait="${escapeAttr(trait)}" style="padding:10px 40px;font-size:15px;border-radius:8px;margin-top:16px">轰~隆隆！ ☁</button>
      </div>`;
  }, 1000);
}

export function removeTraitOverlay() {
  const overlay = byId('trait-overlay');
  if (!overlay) return;
  if (overlay.closest('#modal-root')) closeModalRoot();
  else overlay.remove();
}
