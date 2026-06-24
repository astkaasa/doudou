import { byId, fmt, fmtPct, getCity } from '../domain/helpers.js';

export function updateHUD(state) {
  const cashEl = byId('hud-cash');
  cashEl.textContent = fmt(state.cash);
  cashEl.className = 'hud-val ' + (state.cash >= 0 ? 'positive' : 'negative');
  const profitEl = byId('hud-profit');
  profitEl.textContent = fmt(state.turnProfit);
  profitEl.className = 'hud-val ' + (state.turnProfit >= 0 ? 'positive' : 'negative');
  byId('hud-routes').textContent = state.routes.length;
  const boughtPlanes = state.fleet.filter((f) => !f.isLease).length;
  const leasedPlanes = state.fleet.filter((f) => f.isLease).length;
  byId('hud-fleet').textContent = `购${boughtPlanes}/租${leasedPlanes}`;
  const avgLF = state.routes.length > 0 ? state.routes.reduce((s, r) => s + r.loadFactor, 0) / state.routes.length : 0;
  byId('hud-load').textContent = fmtPct(avgLF * 100);
  const hq = getCity(state.hq);
  const hqName = hq ? hq.name : '待选择';
  const hqEl = byId('hud-hq');
  hqEl.textContent = hqName;
  hqEl.title = hqName;
  byId('hud-brand-val').textContent = '★'.repeat(Math.min(5, Math.floor(state.brand)));
  byId('hud-turn').textContent = state.year + ' Q' + state.quarter;
  const loanWrap = byId('hud-loan-wrap');
  if (loanWrap) {
    if ((state.loan || 0) > 0) {
      loanWrap.style.display = 'flex';
      byId('hud-loan').textContent = fmt(state.loan);
    } else {
      loanWrap.style.display = 'none';
    }
  }
}
