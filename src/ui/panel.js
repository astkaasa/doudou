import { CITIES } from '../data/cities.js';
import { availablePlanes } from '../domain/routes.js';
import { byId, cityDist, fmt, fmtPct, getCity, routeKey } from '../domain/helpers.js';
import { MODIFIER_TYPES } from '../domain/modifiers.js';

const REGION_NAMES = {
  africa: '非洲',
  asia: '亚洲',
  europe: '欧洲',
  mideast: '中东',
  namerica: '北美',
  oceania: '大洋洲',
  samerica: '南美',
};

const REGION_ORDER = ['asia', 'mideast', 'europe', 'africa', 'namerica', 'samerica', 'oceania'];

export function renderPanel(state, uiState) {
  const rs = byId('route-summary');
  if (uiState.hqSelectMode) {
    rs.innerHTML = renderHQCityPicker(uiState.selectedHQ);
    byId('market-info').innerHTML = '';
    return;
  }
  if (state.routes.length === 0) {
    rs.innerHTML = '<div style="color:#556;font-size:13px">尚未开通航线</div>';
  } else {
    let html = '';
    state.routes.slice(0, 6).forEach((r) => {
      const a = getCity(r.from);
      const b = getCity(r.to);
      const color = r.profit >= 0 ? '#4ade80' : '#f0a0a0';
      html += `<div class="route-item" data-action="open-route-detail" data-from="${r.from}" data-to="${r.to}"><div style="display:flex;justify-content:space-between"><span>${a.name} → ${b.name}</span><span style="color:${color}">${fmt(r.profit)}</span></div><div style="color:#556;font-size:11px">客座率 ${fmtPct(r.loadFactor * 100)} | 票价 $${r.price}</div></div>`;
    });
    if (state.routes.length > 6) html += `<div style="color:#556;font-size:12px;text-align:center;padding:4px">...共 ${state.routes.length} 条</div>`;
    rs.innerHTML = html;
  }
  const mi = byId('market-info');
  const hq = getCity(state.hq);
  mi.innerHTML = `<div class="panel-row"><span class="label">总部</span><span class="val">${hq ? hq.name : '待选择'}</span></div><div class="panel-row"><span class="label">可用飞机</span><span class="val">${availablePlanes(state).length} 架</span></div><div class="panel-row"><span class="label">品牌等级</span><span class="val">${'★'.repeat(Math.min(5, Math.floor(state.brand)))}</span></div><div class="panel-row"><span class="label">油价</span><span class="val">$${state.oilPrice.toFixed(0)}/桶</span></div><div style="margin-top:8px;font-size:13px;color:#556">竞争对手:</div>`;
  state.ai.forEach((ai) => {
    mi.innerHTML += `<div class="panel-row"><span class="label" style="color:${ai.color}">${ai.name}</span><span class="val">${ai.routes.length} 线 | ${ai.fleet.length} 机</span></div>`;
  });
  const activeModifiers = (state.activeModifiers || []).filter((modifier) => modifier.turnsRemaining > 0);
  if (activeModifiers.length > 0) {
    mi.innerHTML += '<div class="modifier-list"><div class="modifier-title">事件影响</div>';
    activeModifiers.slice(0, 4).forEach((modifier) => {
      mi.innerHTML += `<div class="modifier-item"><span>${modifier.source}</span><strong>${formatModifierEffect(modifier)}</strong></div>`;
    });
    if (activeModifiers.length > 4) {
      mi.innerHTML += `<div class="modifier-more">另有 ${activeModifiers.length - 4} 项影响</div>`;
    }
    mi.innerHTML += '</div>';
  }
}

export function showRouteCreateInfo(cityFrom, cityTo, html) {
  const sec = byId('panel-route-create');
  const info = byId('route-create-info');
  if (!sec || !info) return;
  sec.style.display = '';
  info.innerHTML = html;
}

export function renderRouteCityPicker(state, selectedCityId = null) {
  const planes = availablePlanes(state);
  const maxRange = planes.length > 0 ? Math.max(...planes.map((plane) => plane.range)) : 0;
  const selectedCity = selectedCityId ? getCity(selectedCityId) : null;
  const existingRoutes = new Set(state.routes.map((route) => routeKey(route.from, route.to)));
  const recommended = routeRecommendedCities(state, selectedCityId);
  const candidates = CITIES.filter((city) => city.id !== selectedCityId);
  const title = selectedCity ? `选择 ${selectedCity.name} 的到达城市` : '选择起飞城市';
  const hint = selectedCity
    ? '从列表选择到达城市，或继续点击地图上的城市'
    : '先选择一座城市作为起飞点，手机上推荐直接用列表';
  const planeHint = planes.length > 0
    ? `可用飞机 ${planes.length} 架，最大航程 ${Math.round(maxRange)} km`
    : '没有可用飞机，请先购买或等待交付';
  return `<div class="route-city-picker">
    <div class="route-city-status">
      <strong>${title}</strong>
      <span>${hint}</span>
      <em>${planeHint}</em>
    </div>
    ${renderCollapsibleCityGroup(
      '推荐城市',
      recommended,
      (city) => renderRouteCityButton(city, selectedCity, maxRange, existingRoutes),
      { open: true, className: 'city-picker-group-featured' },
    )}
    <div class="city-picker-title">全部城市</div>
    ${renderGroupedCityPicker(
      candidates,
      (city) => renderRouteCityButton(city, selectedCity, maxRange, existingRoutes),
      selectedCityId,
    )}
  </div>`;
}

export function hideRouteCreateInfo() {
  const sec = byId('panel-route-create');
  if (sec) sec.style.display = 'none';
}

function formatModifierEffect(modifier) {
  if (modifier.type === MODIFIER_TYPES.suspension) return `${modifier.turnsRemaining} 回合停飞`;
  const label = modifier.type === MODIFIER_TYPES.cost ? '成本' : '需求';
  const pct = ((modifier.multiplier ?? 1) - 1) * 100;
  return `${label}${pct >= 0 ? '+' : ''}${fmtPct(pct)}`;
}

function renderHQCityPicker(selectedCityId) {
  const recommended = CITIES.filter((city) => city.level >= 3 || ['dubai', 'singapore', 'sydney'].includes(city.id));
  return `<div class="city-picker">
    <div class="city-picker-hint">在地图上点击城市，或从列表选择总部</div>
    ${renderCollapsibleCityGroup(
      '推荐总部',
      recommended,
      (city) => renderCityButton(city, selectedCityId),
      { open: true, className: 'city-picker-group-featured' },
    )}
    <div class="city-picker-title">全部城市</div>
    ${renderGroupedCityPicker(CITIES, (city) => renderCityButton(city, selectedCityId), selectedCityId)}
  </div>`;
}

function renderGroupedCityPicker(cities, renderButton, selectedCityId = null) {
  return groupCitiesByRegion(cities)
    .map(({ region, cities: regionCities }) => renderCollapsibleCityGroup(
      REGION_NAMES[region] || region,
      regionCities,
      renderButton,
      { open: selectedCityId ? regionCities.some((city) => city.id === selectedCityId) : false },
    ))
    .join('');
}

function renderCollapsibleCityGroup(title, cities, renderButton, options = {}) {
  if (cities.length === 0) return '';
  const openAttr = options.open ? ' open' : '';
  const className = options.className ? ` ${options.className}` : '';
  const compactClass = cities.length > 8 ? ' city-picker-grid-compact' : '';
  return `<details class="city-picker-group${className}"${openAttr}>
    <summary><span>${title}</span><small>${cities.length}</small></summary>
    <div class="city-picker-grid${compactClass}">
      ${cities.map(renderButton).join('')}
    </div>
  </details>`;
}

function groupCitiesByRegion(cities) {
  const byRegion = new Map();
  cities.forEach((city) => {
    const region = city.region || 'other';
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region).push(city);
  });
  const orderedRegions = [
    ...REGION_ORDER.filter((region) => byRegion.has(region)),
    ...[...byRegion.keys()].filter((region) => !REGION_ORDER.includes(region)).sort(),
  ];
  return orderedRegions.map((region) => ({ region, cities: byRegion.get(region) }));
}

function routeRecommendedCities(state, selectedCityId) {
  if (selectedCityId) {
    const selectedCity = getCity(selectedCityId);
    return CITIES
      .filter((city) => city.id !== selectedCityId)
      .sort((a, b) => routeCityScore(state, selectedCity, b) - routeCityScore(state, selectedCity, a))
      .slice(0, 10);
  }
  const ids = new Set([state.hq, ...state.routes.flatMap((route) => [route.from, route.to])].filter(Boolean));
  const preferred = CITIES.filter((city) => ids.has(city.id) || city.level >= 3);
  return preferred.slice(0, 10);
}

function routeCityScore(state, selectedCity, city) {
  if (!selectedCity) return city.level;
  const existing = state.routes.some((route) => routeKey(route.from, route.to) === routeKey(selectedCity.id, city.id));
  if (existing) return -1000;
  const d = cityDist(selectedCity, city);
  const rangePenalty = availablePlanes(state).some((plane) => plane.range >= d) ? 0 : 500;
  return city.level * 100 - Math.abs(d - 2500) / 100 - rangePenalty;
}

function renderRouteCityButton(city, selectedCity, maxRange, existingRoutes) {
  let meta = REGION_NAMES[city.region] || city.region;
  let disabled = false;
  if (selectedCity) {
    const d = cityDist(selectedCity, city);
    const key = routeKey(selectedCity.id, city.id);
    if (existingRoutes.has(key)) {
      meta = '已开通';
      disabled = true;
    } else if (maxRange <= 0) {
      meta = '无可用飞机';
      disabled = true;
    } else if (d > maxRange) {
      meta = `${Math.round(d)}km`;
      disabled = true;
    } else {
      meta = `${Math.round(d)}km`;
    }
  }
  const disabledAttr = disabled ? ' disabled aria-disabled="true"' : '';
  const actionAttr = disabled ? '' : ' data-action="city-click"';
  return `<button class="city-picker-btn${disabled ? ' disabled' : ''}" type="button"${actionAttr} data-city-id="${city.id}"${disabledAttr}>
    <span>${city.name}</span>
    <small>${meta}</small>
  </button>`;
}

function renderCityButton(city, selectedCityId) {
  const selectedClass = city.id === selectedCityId ? ' selected' : '';
  return `<button class="city-picker-btn${selectedClass}" type="button" data-action="city-click" data-city-id="${city.id}">
    <span>${city.name}</span>
    <small>${REGION_NAMES[city.region] || city.region}</small>
  </button>`;
}
