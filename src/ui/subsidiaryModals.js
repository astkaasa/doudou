import { CITIES } from '../data/cities.js';
import { getCityMarketState } from '../data/cityEraData.js';
import {
  SUB_TYPES,
  acquireSubsidiary,
  calcCompanyValue,
  calcSubOpenCost,
  calcSubReturn,
  getAcquirePrice,
  getAllSubsidiaries,
  getAvailableSubTypes,
  openSubsidiary,
  sellSubsidiary,
} from '../domain/subsidiaries.js';
import { fmt, getCity } from '../domain/helpers.js';
import { escapeAttr, escapeHtml } from './html.js';
import { showModal } from './modal.js';

let selectedCityId = null;

export function showSubsidiaryOverview(state, cityId = selectedCityId) {
  if (!state) return;
  selectedCityId = getCity(cityId) ? cityId : state.hq;
  const city = getCity(selectedCityId);
  const allSubs = getAllSubsidiaries(state);
  const companyValue = calcCompanyValue(state);
  const expectedReturn = allSubs.reduce((sum, sub) => {
    if (sub.isNew) return sum;
    return sum + calcSubReturn(state, sub, sub.cityId).net;
  }, 0);
  const cityButtons = orderedCities(state).map((item) => renderCityButton(item)).join('');
  showModal(`<div class="subsidiary-modal">
    <div class="subsidiary-head">
      <div>
        <h2>投资管理</h2>
        <span>${state.year}年 第${state.quarter}季度</span>
      </div>
      <button class="btn btn-sm stock-close" type="button" data-action="close-modal">关闭</button>
    </div>
    <div class="subsidiary-summary">
      <button type="button" data-action="open-company-value"><span>公司市值</span><strong>${fmt(companyValue.totalNetWorth)}</strong></button>
      <div><span>子公司</span><strong>${allSubs.length}</strong></div>
      <div><span>子公司总值</span><strong>${fmt(companyValue.subValue)}</strong></div>
      <div><span>预估回报/Q</span><strong class="${expectedReturn >= 0 ? 'up' : 'down'}">${expectedReturn >= 0 ? '+' : ''}${fmt(expectedReturn)}</strong></div>
      <div><span>可用资金</span><strong>${fmt(state.cash)}</strong></div>
    </div>
    <div class="subsidiary-layout">
      <div class="subsidiary-city-list">${cityButtons}</div>
      <div class="subsidiary-city-panel">${city ? renderCityPanel(state, city) : '<div class="stock-empty">请选择城市</div>'}</div>
    </div>
  </div>`, { wide: true });
}

export function showCompanyValueModal(state) {
  const value = calcCompanyValue(state);
  const netClass = value.totalNetWorth >= 0 ? 'text-positive' : 'text-danger';
  showModal(`<div class="company-value-modal">
    <h2>公司市值</h2>
    <div class="report-section">
      <div class="report-row"><span>现金</span><span>${fmt(value.cash)}</span></div>
      <div class="report-row"><span>自有飞机估值</span><span>${fmt(value.fleetValue)}</span></div>
      <div class="report-row"><span>子公司总值</span><span>${fmt(value.subValue)}</span></div>
      <div class="report-row"><span>证券持仓市值</span><span>${fmt(value.stockValue)}</span></div>
      <div class="report-row"><span>贷款负债</span><span class="text-danger">-${fmt(value.loanDebt)}</span></div>
      <div class="report-total ${netClass}">净资产: ${fmt(value.totalNetWorth)}</div>
    </div>
    <div class="modal-actions"><button class="btn btn-primary" type="button" data-action="close-modal">关闭</button></div>
  </div>`);
}

export function showSubsidiaryConfirm(state, mode, cityId, type) {
  const city = getCity(cityId);
  const cfg = SUB_TYPES[type];
  if (!state || !city || !cfg) return;
  const isAcquire = mode === 'acquire';
  const isSell = mode === 'sell';
  const cost = isSell ? calcSellPreview(state, cityId, type).sellPrice : isAcquire ? getAcquirePrice(state, type, cityId) : calcSubOpenCost(type, cityId);
  const fee = isSell ? calcSellPreview(state, cityId, type).fee : Math.round(cost * 0.01 * 10) / 10;
  const title = isSell
    ? `${type === 'airport' ? '退出投资' : '出售'}${cfg.name}`
    : `${isAcquire ? '收购' : type === 'airport' ? '投资共建' : '新设'}${cfg.name}`;
  const cashAfter = isSell ? state.cash + cost : state.cash - cost - fee;
  const cashClass = cashAfter >= 0 ? 'text-positive' : 'text-danger';
  const action = isSell ? 'execute-sub-sell' : 'execute-sub-open';
  const label = isSell ? `${type === 'airport' ? '确认回购' : '确认出售'} ${fmt(cost)}` : `确认${isAcquire ? '收购' : type === 'airport' ? '投资' : '新设'} ${fmt(cost + fee)}`;
  showModal(`<div class="sub-confirm">
    <h2>${escapeHtml(cfg.icon)} ${escapeHtml(title)} — ${escapeHtml(city.name)}</h2>
    <div class="report-section">
      <div class="report-row"><span>${isSell ? '实得金额' : isAcquire ? '收购价格' : '基础成本'}</span><span>${fmt(cost)}</span></div>
      <div class="report-row"><span>手续费</span><span>${fmt(fee)}</span></div>
      <div class="report-row"><span>操作后现金</span><span class="${cashClass}">${fmt(cashAfter)}</span></div>
      ${type === 'airport' && isSell ? '<div class="sub-note">机场投资按当前估值 60% 回购退出。</div>' : ''}
      ${type === 'airport' && !isSell ? '<div class="sub-note">机场建设仅可在总部或分部城市投资，可降低同城航线着陆费。</div>' : ''}
    </div>
    <div class="sub-confirm-actions">
      <button class="btn" type="button" data-action="open-subsidiary-overview" data-city-id="${escapeAttr(cityId)}">取消</button>
      <button class="btn btn-primary" type="button" data-action="${action}" data-sub-mode="${escapeAttr(mode)}" data-city-id="${escapeAttr(cityId)}" data-sub-type="${escapeAttr(type)}">${escapeHtml(label)}</button>
    </div>
  </div>`);
}

export function executeSubsidiaryOpen(state, mode, cityId, type) {
  const result = mode === 'acquire'
    ? acquireSubsidiary(state, type, cityId)
    : openSubsidiary(state, type, cityId);
  selectedCityId = cityId;
  showSubsidiaryOverview(state, cityId);
  return result;
}

export function executeSubsidiarySell(state, cityId, type) {
  const result = sellSubsidiary(state, cityId, type);
  selectedCityId = cityId;
  showSubsidiaryOverview(state, cityId);
  return result;
}

function renderCityPanel(state, city) {
  const market = getCityMarketState(state, city.id);
  const existing = state.subsidiaries?.[city.id] || [];
  const available = getAvailableSubTypes(state, city.id);
  return `<div class="subsidiary-city-head">
    <div>
      <h3>${escapeHtml(city.name)}</h3>
      <span>${'★'.repeat(city.level)} · ${escapeHtml(city.subRegion || city.region)}</span>
    </div>
    <div class="sub-market-stats">
      <span>人口 ${market.pop.toFixed(1)}M</span>
      <span>商务 ${market.biz}</span>
      <span>旅游 ${market.tour}</span>
    </div>
  </div>
  <div class="sub-section-title">已持有</div>
  ${existing.length > 0 ? existing.map((sub) => renderExistingSub(state, city.id, sub)).join('') : '<div class="sub-empty">该城市暂无子公司</div>'}
  <div class="sub-section-title">可投资</div>
  ${available.length > 0 ? available.map((type) => renderAvailableSub(state, city.id, type)).join('') : '<div class="sub-empty">暂无可投资项目</div>'}`;
}

function renderExistingSub(state, cityId, sub) {
  const cfg = SUB_TYPES[sub.type];
  const ret = sub.isNew ? null : calcSubReturn(state, sub, cityId);
  const sell = calcSellPreview(state, cityId, sub.type);
  const sourceLabel = sub.source === 'invest' ? '投资' : sub.source === 'acquire' ? '收购' : '新设';
  return `<div class="sub-card ${sub.type === 'airport' ? 'sub-card-airport' : ''}">
    <div class="sub-card-main">
      <strong>${escapeHtml(cfg.icon)} ${escapeHtml(cfg.name)}</strong>
      <span>${sourceLabel} · 成本 ${fmt(sub.openCost)} · 估值 ${fmt(sub.currentValue)}</span>
    </div>
    <div class="sub-card-side">
      <b class="${ret && ret.net < 0 ? 'down' : 'up'}">${sub.isNew ? 'NEW' : `${ret.net >= 0 ? '+' : ''}${fmt(ret.net)}/Q`}</b>
      <button class="btn btn-sm sub-sell" type="button" data-action="confirm-sub-sell" data-city-id="${escapeAttr(cityId)}" data-sub-type="${escapeAttr(sub.type)}">${sub.type === 'airport' ? '回购' : '出售'} ${fmt(sell.sellPrice)}</button>
    </div>
  </div>`;
}

function renderAvailableSub(state, cityId, type) {
  const cfg = SUB_TYPES[type];
  const openCost = calcSubOpenCost(type, cityId);
  const openFee = Math.round(openCost * 0.01 * 10) / 10;
  if (type === 'airport') {
    const disabled = state.cash < openCost + openFee;
    return `<div class="sub-card sub-card-airport">
      <div class="sub-card-main">
        <strong>${escapeHtml(cfg.icon)} ${escapeHtml(cfg.name)}</strong>
        <span>机场投资 · 同城着陆费 -15%</span>
      </div>
      <div class="sub-card-side">
        <b>${fmt(openCost + openFee)}</b>
        <button class="btn btn-sm sub-invest" type="button" data-action="confirm-sub-open" data-sub-mode="open" data-city-id="${escapeAttr(cityId)}" data-sub-type="${escapeAttr(type)}" ${disabled ? 'disabled' : ''}>投资</button>
      </div>
    </div>`;
  }
  const acquireCost = getAcquirePrice(state, type, cityId);
  const acquireFee = Math.round(acquireCost * 0.01 * 10) / 10;
  return `<div class="sub-card">
    <div class="sub-card-main">
      <strong>${escapeHtml(cfg.icon)} ${escapeHtml(cfg.name)}</strong>
      <span>${describeSpecial(cfg.special)}</span>
    </div>
    <div class="sub-card-actions">
      <button class="btn btn-sm sub-open" type="button" data-action="confirm-sub-open" data-sub-mode="open" data-city-id="${escapeAttr(cityId)}" data-sub-type="${escapeAttr(type)}" ${state.cash < openCost + openFee ? 'disabled' : ''}>新设 ${fmt(openCost + openFee)}</button>
      <button class="btn btn-sm sub-acquire" type="button" data-action="confirm-sub-open" data-sub-mode="acquire" data-city-id="${escapeAttr(cityId)}" data-sub-type="${escapeAttr(type)}" ${state.cash < acquireCost + acquireFee ? 'disabled' : ''}>收购 ${fmt(acquireCost + acquireFee)}</button>
    </div>
  </div>`;
}

function renderCityButton(city) {
  const selected = city.id === selectedCityId ? ' selected' : '';
  return `<button class="sub-city-btn${selected}" type="button" data-action="open-subsidiary-overview" data-city-id="${escapeAttr(city.id)}">
    <span>${escapeHtml(city.name)}</span>
    <small>${escapeHtml(city.subRegion || city.region)} · ${'★'.repeat(city.level)}</small>
  </button>`;
}

function orderedCities(state) {
  const owned = new Set(getAllSubsidiaries(state).map((sub) => sub.cityId));
  const bases = new Set([state.hq, ...(state.branches || [])].filter(Boolean));
  const routed = new Set((state.routes || []).flatMap((route) => [route.from, route.to]));
  return [...CITIES].sort((a, b) => cityScore(state, b, owned, bases, routed) - cityScore(state, a, owned, bases, routed));
}

function cityScore(state, city, owned, bases, routed) {
  const market = getCityMarketState(state, city.id);
  return (owned.has(city.id) ? 10000 : 0)
    + (bases.has(city.id) ? 4000 : 0)
    + (routed.has(city.id) ? 1200 : 0)
    + city.level * 100
    + market.biz + market.tour;
}

function calcSellPreview(state, cityId, type) {
  const sub = state.subsidiaries?.[cityId]?.find((item) => item.type === type);
  if (!sub) return { sellPrice: 0, fee: 0 };
  const gross = type === 'airport' ? Math.round(sub.currentValue * 0.6 * 10) / 10 : Math.round(sub.currentValue * 10) / 10;
  const fee = Math.round(gross * 0.01 * 10) / 10;
  return { sellPrice: gross - fee, fee };
}

function describeSpecial(special) {
  if (special === 'route_lf_boost') return '同城航线客座率 +2%';
  if (special === 'landing_discount') return '同城着陆费 -15%';
  if (special === 'mega_boost') return '盛事季回报提升';
  if (special === 'mega_boost_s') return '盛事季回报提升 · 品牌成长';
  return '稳定季度回报';
}
