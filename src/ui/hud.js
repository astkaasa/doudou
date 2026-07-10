import { PLAYER_TRAITS } from '../data/playerTraits.js';
import { calcNetworkLoadFactor } from '../domain/economy.js';
import { byId, fmt, fmtPct, getCity } from '../domain/helpers.js';
import { getMainQuestStats } from '../domain/mainQuest.js';
import { getMilestoneStats } from '../domain/milestones.js';
import { calcNasdouIndex } from '../domain/stocks.js';
import { calcCompanyValue } from '../domain/subsidiaries.js';
import { escapeHtml, renderHtml } from './html.js';

let megaEventRotateTimer = null;
let megaEventBadgeIndex = 0;

export function updateHUD(state) {
  const companyEl = byId('hud-company-name');
  if (companyEl) {
    companyEl.textContent = state.companyName || '豆豆航空';
    companyEl.title = state.companyName || '豆豆航空';
  }
  const traitBadge = byId('hud-trait-badge');
  if (traitBadge) {
    const trait = PLAYER_TRAITS[state.playerTrait];
    if (trait) {
      traitBadge.hidden = false;
      traitBadge.className = 'hud-trait';
      renderHtml(traitBadge, `${escapeHtml(trait.symbol)}<span class="trait-tooltip">${escapeHtml(trait.name)}</span>`);
      traitBadge.title = `${trait.name}：${trait.desc}`;
    } else {
      traitBadge.hidden = true;
      traitBadge.className = '';
      traitBadge.textContent = '';
      traitBadge.removeAttribute('title');
    }
  }
  const cashEl = byId('hud-cash');
  cashEl.textContent = fmt(state.cash);
  cashEl.className = 'hud-val ' + (state.cash >= 0 ? 'positive' : 'negative');
  const companyValueBadge = byId('hud-cv-badge');
  if (companyValueBadge) {
    const valueEl = companyValueBadge.querySelector('.hud-val');
    const companyValue = calcCompanyValue(state);
    companyValueBadge.hidden = false;
    if (valueEl) {
      valueEl.textContent = fmt(companyValue.totalNetWorth);
      valueEl.className = 'hud-val ' + (companyValue.totalNetWorth >= 0 ? 'positive' : 'negative');
    }
    companyValueBadge.title = '查看公司市值详情';
  }
  const profitEl = byId('hud-profit');
  profitEl.textContent = fmt(state.turnProfit);
  profitEl.className = 'hud-val ' + (state.turnProfit >= 0 ? 'positive' : 'negative');
  byId('hud-routes').textContent = state.routes.length;
  const boughtPlanes = state.fleet.filter((f) => !f.isLease).length;
  const leasedPlanes = state.fleet.filter((f) => f.isLease).length;
  byId('hud-fleet').textContent = `购${boughtPlanes}/租${leasedPlanes}`;
  const loadEl = byId('hud-load');
  loadEl.textContent = fmtPct(calcNetworkLoadFactor(state) * 100);
  loadEl.title = '按运营航线有效座位加权';
  const opsEl = byId('hud-ops-eff');
  if (opsEl) {
    const efficiency = state.opsEfficiency || 0;
    if (state.turnsPlayed === 0 || efficiency <= 0) {
      opsEl.textContent = '--';
      opsEl.className = 'hud-val hud-ops-neutral';
    } else {
      opsEl.textContent = `${(efficiency * 100).toFixed(0)}%`;
      const status = efficiency >= 1 ? 'good' : efficiency >= 0.7 ? 'warning' : 'danger';
      opsEl.className = `hud-val hud-ops-${status}`;
    }
  }
  const hq = getCity(state.hq);
  const hqName = hq ? hq.name : '待选择';
  const hqEl = byId('hud-hq');
  hqEl.textContent = hqName;
  hqEl.title = hqName;
  byId('hud-brand-val').textContent = '★'.repeat(Math.min(5, Math.floor(state.brand)));
  const milestoneEl = byId('hud-milestones');
  if (milestoneEl) {
    const stats = getMilestoneStats(state);
    milestoneEl.textContent = `${stats.unlocked}/${stats.total}`;
  }
  const mainQuestEl = byId('hud-main-quest-stage');
  const mainQuestBtn = byId('hud-main-quest-btn');
  if (mainQuestEl && mainQuestBtn) {
    const stats = getMainQuestStats(state);
    const progress = stats.progress;
    mainQuestEl.textContent = stats.victoryGrade || String(stats.currentStage);
    mainQuestBtn.title = stats.victoryGrade
      ? `苍穹之路已通关：${stats.victoryGrade}`
      : `${progress?.title || '苍穹之路'} · ${progress?.metCount || 0}/4`;
  }
  byId('hud-turn').textContent = state.year + ' Q' + state.quarter;
  const loanWrap = byId('hud-loan-wrap');
  if (loanWrap) {
    if ((state.loan || 0) > 0) {
      loanWrap.hidden = false;
      byId('hud-loan').textContent = fmt(state.loan);
    } else {
      loanWrap.hidden = true;
    }
  }
  updateMegaEventBadge(state);
  updateNasdouBadge(state);
}

export function updateMegaEventBadge(state) {
  const badge = byId('mega-event-badge');
  if (!badge) return;
  const events = [...(state?.activeMegaEvents || [])].filter((event) => event.currentBoost > 0);
  if (events.length === 0) {
    badge.hidden = true;
    badge.className = '';
    badge.textContent = '';
    badge.removeAttribute('title');
    clearMegaEventRotation();
    megaEventBadgeIndex = 0;
    return;
  }

  events.sort((a, b) => b.currentBoost - a.currentBoost);
  badge.hidden = false;
  badge.className = 'mega-badge-active';
  badge._megaEvents = events;
  if (megaEventBadgeIndex >= events.length) megaEventBadgeIndex = 0;
  renderMegaEventBadgeLabel(badge);

  if (events.length > 1 && !megaEventRotateTimer) {
    megaEventRotateTimer = window.setInterval(() => {
      const currentEvents = badge._megaEvents || [];
      if (currentEvents.length <= 1) {
        clearMegaEventRotation();
        return;
      }
      megaEventBadgeIndex = (megaEventBadgeIndex + 1) % currentEvents.length;
      renderMegaEventBadgeLabel(badge);
    }, 3000);
  } else if (events.length <= 1) {
    clearMegaEventRotation();
  }
}

export function updateNasdouBadge(state) {
  const badge = byId('nasdou-badge');
  if (!badge) return;
  if (!state?.stocks) {
    badge.hidden = true;
    return;
  }
  badge.hidden = false;
  const nasdou = calcNasdouIndex(state);
  const trendClass = nasdou > 0.001 ? 'up' : nasdou < -0.001 ? 'down' : 'flat';
  const sign = nasdou > 0.001 ? '+' : '';
  renderHtml(badge, `📈 NASDOU <span class="nasdou-change ${trendClass}">${sign}${(nasdou * 100).toFixed(1)}%</span>`);
}

function renderMegaEventBadgeLabel(badge) {
  const events = badge._megaEvents || [];
  const event = events[megaEventBadgeIndex % events.length];
  if (!event) return;
  badge.textContent = `${megaEventIcon(event.type)} ${event.name}`;
  badge.title = `${event.cityName || event.name}航线需求提升`;
  badge.classList.toggle('mega-badge-urgent', event.currentBoost >= event.maxBoost * 0.8);
}

function megaEventIcon(type) {
  if (type === 'world_cup') return '⚽';
  if (type === 'world_expo') return '🌐';
  return '🏅';
}

function clearMegaEventRotation() {
  if (!megaEventRotateTimer) return;
  window.clearInterval(megaEventRotateTimer);
  megaEventRotateTimer = null;
}
