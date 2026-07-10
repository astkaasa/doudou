import {
  airportContractSummary,
  compatibleContractPlanes,
  describeAirportContract,
  getActiveAirportContracts,
  getAirportContractOffers,
  getAirportOpportunityPool,
  refreshAirportContractOffers,
} from '../domain/airportContracts.js';
import { airportCapacitySnapshot } from '../domain/airportCapacity.js';
import { airportDisplayCode, getAirport, getDefaultAirportIdForYear } from '../domain/airports.js';
import {
  AIRPORT_UPGRADES,
  airportRelation,
  getAirportUpgradeCount,
} from '../domain/airportManagement.js';
import { routeOperatingDistance } from '../domain/economy.js';
import { fmt, fmtPct, getCity } from '../domain/helpers.js';
import { getAllSubsidiaries } from '../domain/subsidiaries.js';
import { escapeAttr, escapeHtml } from './html.js';
import { showModal } from './modal.js';

export function showAirportProgramModal(state) {
  refreshAirportContractOffers(state);
  const summary = airportContractSummary(state);
  const opportunityCount = getAirportOpportunityPool(state).length;
  const investments = getAllSubsidiaries(state).filter((sub) => sub.type === 'airport' && sub.airportId);
  const active = getActiveAirportContracts(state);
  const offers = getAirportContractOffers(state);
  const history = (state.airportContracts || [])
    .filter((contract) => ['completed', 'breached'].includes(contract.status))
    .slice(0, 6);

  showModal(`<div class="airport-program-modal">
    <div class="airport-program-head">
      <div><h2>机场经营</h2><span>${state.year}年 Q${state.quarter} · 容量、投资与航线开发</span></div>
      <button class="btn btn-sm" type="button" data-action="close-modal">关闭</button>
    </div>
    <div class="airport-program-summary">
      <div><span>机会池</span><strong>${opportunityCount}</strong></div>
      <div><span>本季合同</span><strong>${summary.offered}</strong></div>
      <div><span>履约中</span><strong>${summary.active}</strong></div>
      <div><span>已完成</span><strong>${summary.completed}</strong></div>
      <div><span>机场投资</span><strong>${investments.length}</strong></div>
    </div>
    <div class="airport-program-section"><h3>航线开发机会</h3>
      ${offers.length > 0 ? offers.map((contract) => renderContractOffer(state, contract)).join('') : '<div class="airport-program-empty">本季度暂无适配的新机会；机场部门会在下一季度更新。</div>'}
    </div>
    <div class="airport-program-section"><h3>履约中的合同</h3>
      ${active.length > 0 ? active.map((contract) => renderActiveContract(state, contract)).join('') : '<div class="airport-program-empty">暂无履约中的机场合同。</div>'}
    </div>
    <div class="airport-program-section"><h3>机场资产与容量</h3>
      ${investments.length > 0 ? investments.map((investment) => renderAirportAsset(state, investment)).join('') : '<div class="airport-program-empty">尚未投资具体机场。可在“投资管理”中的基地城市选择机场。</div>'}
    </div>
    ${history.length > 0 ? `<div class="airport-program-section"><h3>最近合同记录</h3>${history.map(renderContractHistory).join('')}</div>` : ''}
  </div>`, { wide: true });
}

function renderContractOffer(state, contract) {
  const airport = getAirport(contract.airportId);
  const planes = compatibleContractPlanes(state, contract);
  const route = {
    from: contract.originCityId,
    to: contract.cityId,
    fromAirportId: getDefaultAirportIdForYear(contract.originCityId, state.year),
    toAirportId: contract.airportId,
  };
  const distance = routeOperatingDistance(route);
  const city = getCity(contract.cityId);
  return `<article class="airport-contract-card airport-contract-offer">
    <div class="airport-contract-main">
      <div class="airport-contract-title"><strong>${escapeHtml(getCity(contract.originCityId)?.name || contract.originCityId)} → ${escapeHtml(city?.name || contract.cityId)} ${escapeHtml(airportDisplayCode(airport))}</strong><span>${escapeHtml(airport?.name || contract.airportId)}</span></div>
      <div class="airport-contract-tags"><span>${contract.durationQuarters} 季度</span><span>达标 ${contract.requiredMetQuarters} 季</span><span>客座率 ≥ ${fmtPct(contract.minLoadFactor * 100)}</span><span>起降费 -${fmtPct(contract.landingDiscount * 100)}</span></div>
      <p>开航补贴 ${fmt(contract.upfrontSubsidy)} · 达标保底 ${fmt(contract.quarterlyGuarantee)}/Q · 完成奖励 ${fmt(contract.completionBonus)}${Number.isFinite(distance) ? ` · ${Math.round(distance)}km` : ''}</p>
    </div>
    <div class="airport-contract-action">
      ${planes.length > 0 ? `<select id="contract-plane-${escapeAttr(contract.id)}" aria-label="选择合同执飞飞机">${planes.map((plane) => `<option value="${escapeAttr(plane.uid)}">${escapeHtml(plane.name)} · ${plane.seats}座</option>`).join('')}</select><button class="btn btn-sm btn-success" type="button" data-action="accept-airport-contract" data-contract-id="${escapeAttr(contract.id)}">接受并开线</button>` : '<span class="airport-contract-unavailable">暂无适配的空闲飞机</span>'}
    </div>
  </article>`;
}

function renderActiveContract(state, contract) {
  const route = (state.routes || []).find((item) => item.uid === contract.routeUid);
  const progress = `${contract.metQuarters}/${contract.requiredMetQuarters}`;
  const status = route
    ? `客座率 ${fmtPct((route.loadFactor || 0) * 100)} · ${contract.lastQuarterMet ? '上季达标' : '上季未达标'}`
    : '航线已关闭，将在季度结算时违约';
  return `<article class="airport-contract-card airport-contract-active">
    <div><strong>${escapeHtml(describeAirportContract(contract))}</strong><span>剩余 ${contract.remainingQuarters} 季 · 达标进度 ${progress}</span><small>${escapeHtml(status)}</small></div>
    <b>+${fmt(contract.quarterlyGuarantee)}/Q</b>
  </article>`;
}

function renderAirportAsset(state, investment) {
  const airport = getAirport(investment.airportId);
  if (!airport) return '';
  const capacity = airportCapacitySnapshot(state, airport.id);
  const upgrades = Object.keys(investment.upgrades || {}).filter((upgradeId) => investment.upgrades[upgradeId]);
  const utilizationClass = capacity.congested ? 'negative' : capacity.utilization >= 0.8 ? 'warning' : 'positive';
  return `<article class="airport-asset-card">
    <div class="airport-asset-code"><strong>${escapeHtml(airportDisplayCode(airport))}</strong><small>关系 ${airportRelation(state, airport.id)}</small></div>
    <div class="airport-asset-main"><strong>${escapeHtml(airport.name)}</strong><span>${escapeHtml(getCity(investment.cityId)?.name || investment.cityId)} · 升级 ${getAirportUpgradeCount(state, airport.id)}/3</span><small>${upgrades.length > 0 ? upgrades.map((id) => AIRPORT_UPGRADES[id]?.name || id).join('、') : '尚未升级'}</small></div>
    <div class="airport-asset-capacity"><span>容量</span><strong class="${utilizationClass}">${capacity.used}/${capacity.capacity}</strong><small>AI 折算 ${capacity.aiUsed}</small></div>
  </article>`;
}

function renderContractHistory(contract) {
  const success = contract.status === 'completed';
  return `<div class="airport-contract-history"><span>${escapeHtml(describeAirportContract(contract))}</span><strong class="${success ? 'positive' : 'negative'}">${success ? '已完成' : '已违约'}</strong></div>`;
}
