import { CITIES, projectCity } from '../data/cities.js';
import { WORLD_BOUNDARY_PATH, WORLD_LAND_PATH } from '../data/worldMapPaths.js';
import { byId, cityDist, clamp, fmt, getCity } from '../domain/helpers.js';

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 500;
const MAP_ASPECT = MAP_WIDTH / MAP_HEIGHT;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const WHEEL_ZOOM_DELTA = 0.002;
const EDGE_SCROLL_SIZE = 32;
const EDGE_SCROLL_SPEED = 360;
const CITY_RADIUS_ZOOM_EXPONENT = 0.88;
const LABEL_ZOOM_EXPONENT = 0.82;
const TOUCH_RENDER_INTERVAL = 32;
const GRID_LONGITUDES = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const GRID_LATITUDES = [-60, -30, 0, 30, 60];

const ZOOM_BUTTONS = {
  1: 'zoom1',
  1.5: 'zoom15',
  2: 'zoom2',
};

let mapDrag = { dragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 };
let mapTouch = {
  mode: null,
  startX: 0,
  startY: 0,
  startPanX: 0,
  startPanY: 0,
  startZoom: MIN_ZOOM,
  startDistance: 0,
  startCenterX: 0,
  startCenterY: 0,
};
let edgeScroll = { x: 0, y: 0, frame: null, lastTime: 0 };

export function renderMap(state, uiState) {
  const zoom = state.mapZoom || 1;
  const panX = state.mapPanX || 0;
  const panY = state.mapPanY || 0;
  const container = byId('map-container');
  const { vw, vh, ox, oy } = viewportFor(container.getBoundingClientRect(), zoom, panX, panY);
  const worldOffsets = visibleWorldOffsets(ox, vw);
  let svg = `<svg viewBox="${ox} ${oy} ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%" id="map-svg" role="img" aria-label="航空经营世界地图">`;

  svg += renderBaseMap(worldOffsets);
  svg += `<rect x="${ox - vw}" y="${oy - vh}" width="${vw * 3}" height="${vh * 3}" fill="transparent" data-action="map-empty"/>`;

  state.ai.forEach((ai) => {
    ai.routes.forEach((r) => {
      const a = getCity(r.from);
      const b = getCity(r.to);
      if (!a || !b) return;
      worldOffsets.forEach((offset) => {
        svg += renderRouteLine(a, b, offset, ai.color, 'route-line route-line-ai');
      });
    });
  });

  state.routes.forEach((r) => {
    const a = getCity(r.from);
    const b = getCity(r.to);
    if (!a || !b) return;
    const lineColor = r.profit >= 0 ? '#e2f1ff' : '#fca5a5';
    worldOffsets.forEach((offset) => {
      const points = routePoints(a, b, offset);
      svg += renderRouteLine(a, b, offset, lineColor, 'route-line route-line-player', points);
      svg += `<text x="${points.mx}" y="${points.my - 6}" fill="${lineColor}" font-size="9" text-anchor="middle" class="route-profit-label">${fmt(r.profit)}</text>`;
    });
  });

  const labelSize = labelSizeForZoom(8.4, zoom);
  const hqLabelSize = labelSizeForZoom(7.2, zoom);
  const routedCities = new Set();
  state.routes.forEach((r) => {
    routedCities.add(r.from);
    routedCities.add(r.to);
  });
  let cityLabels = '';
  let cityTouchTargets = '<div class="city-touch-layer" aria-hidden="false">';
  CITIES.forEach((c) => {
    const isHQ = (c.id === state.hq) || (uiState.hqSelectMode && uiState.selectedHQ === c.id);
    const isBranch = (state.branches || []).includes(c.id);
    const isBranchSelected = uiState.branchSelectMode && uiState.selectedBranch === c.id;
    const isSelected = !uiState.hqSelectMode && !uiState.branchSelectMode && state.selectedCity === c.id;
    const hasRoute = routedCities.has(c.id);
    const r = cityRadius(c, { isHQ, isBranch, isBranchSelected, isSelected, hasRoute, zoom });
    const cy = cityY(c);
    const classes = cityClasses(c, { isHQ, isBranch, isBranchSelected, isSelected, hasRoute });
    worldOffsets.forEach((offset) => {
      const cx = cityX(c) + offset;
      if (!isPointNearViewport(cx, cy, ox, oy, vw, vh)) return;
      const xPct = ((cx - ox) / vw) * 100;
      const yPct = ((cy - oy) / vh) * 100;
      if (isHQ || isBranch || isBranchSelected || isSelected || hasRoute) {
        svg += `<circle cx="${cx}" cy="${cy}" r="${r + cityHaloExtra({ isHQ, isBranch, zoom })}" class="${cityHaloClasses({ isHQ, isBranch, isBranchSelected, isSelected, hasRoute })}" />`;
      }
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" class="${classes}" data-action="city-click" data-city-id="${c.id}" />`;
      cityTouchTargets += `<button class="city-touch-target" type="button" style="left:${xPct}%;top:${yPct}%" data-action="city-click" data-city-id="${c.id}" data-city-touch-target="true" aria-label="选择${c.name}" title="${c.name}"></button>`;
      if (shouldShowCityLabel(c, { isHQ, isBranch, isBranchSelected, isSelected, hasRoute, zoom })) {
        cityLabels += renderCityLabel(c, { isHQ, isBranch, isBranchSelected, isSelected, hasRoute, labelSize, offset, zoom });
      }
      if (isHQ) cityLabels += `<text x="${cx}" y="${cy - radiusAwareOffset(10, zoom)}" font-size="${hqLabelSize}" text-anchor="middle" class="city-label city-label-hq">总部</text>`;
      if (isBranch) cityLabels += `<text x="${cx}" y="${cy - radiusAwareOffset(10, zoom)}" font-size="${hqLabelSize}" text-anchor="middle" class="city-label city-label-branch">分部</text>`;
    });
  });
  cityTouchTargets += '</div>';
  svg += cityLabels;
  svg += '</svg>';
  container.innerHTML = `<div class="map-stage" style="${mapStageStyle()}">${svg}${cityTouchTargets}<div class="map-tooltip" hidden></div></div>`;
}

function renderBaseMap(worldOffsets) {
  return `${renderMapDefs()}${worldOffsets.map((offset) => renderBaseMapTile(offset)).join('')}`;
}

function renderMapDefs() {
  return `<defs>
    <linearGradient id="map-ocean-gradient" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#071625"/>
      <stop offset="48%" stop-color="#0c2536"/>
      <stop offset="100%" stop-color="#123445"/>
    </linearGradient>
    <radialGradient id="map-ocean-light" cx="50%" cy="45%" r="72%">
      <stop offset="0%" stop-color="#1b5265" stop-opacity="0.28"/>
      <stop offset="72%" stop-color="#0a1b2b" stop-opacity="0"/>
      <stop offset="100%" stop-color="#030915" stop-opacity="0.5"/>
    </radialGradient>
    <filter id="map-land-glow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.4" flood-color="#5eead4" flood-opacity="0.18"/>
    </filter>
  </defs>`;
}

function renderBaseMapTile(offset) {
  const transform = offset ? ` transform="translate(${offset} 0)"` : '';
  return `<g${transform}>
  <rect x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" class="map-ocean"/>
  <rect x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" fill="url(#map-ocean-light)"/>
  ${renderGraticule()}
  <path d="${WORLD_LAND_PATH}" class="map-land" fill-rule="evenodd"/>
  <path d="${WORLD_BOUNDARY_PATH}" class="map-boundary"/>
  </g>`;
}

function renderGraticule() {
  const lonLines = GRID_LONGITUDES.map((lon) => {
    const x = ((lon + 180) / 360) * MAP_WIDTH;
    const cls = lon === 0 ? 'map-grid map-grid-prime' : 'map-grid';
    return `<line x1="${x}" y1="0" x2="${x}" y2="${MAP_HEIGHT}" class="${cls}"/>`;
  }).join('');
  const latLines = GRID_LATITUDES.map((lat) => {
    const y = ((90 - lat) / 180) * MAP_HEIGHT;
    const cls = lat === 0 ? 'map-grid map-grid-equator' : 'map-grid';
    return `<line x1="0" y1="${y}" x2="${MAP_WIDTH}" y2="${y}" class="${cls}"/>`;
  }).join('');
  return lonLines + latLines;
}

function cityX(city) {
  return projectCity(city).x * MAP_WIDTH;
}

function cityY(city) {
  return projectCity(city).y * MAP_HEIGHT;
}

function cityRadius(city, { isHQ, isBranch, isBranchSelected, isSelected, hasRoute, zoom }) {
  let baseRadius = 2.3;
  if (isHQ) baseRadius = 6;
  else if (isBranch || isBranchSelected) baseRadius = 4.8;
  else if (isSelected) baseRadius = 4.6;
  else if (hasRoute) baseRadius = 4;
  else if (city.level >= 3) baseRadius = 3.5;
  else if (city.level >= 2) baseRadius = 2.9;
  return scaleRadiusForZoom(baseRadius, zoom);
}

function cityHaloExtra({ isHQ, isBranch, zoom }) {
  return scaleRadiusForZoom(isHQ ? 2.9 : isBranch ? 2.3 : 1.9, zoom);
}

function scaleRadiusForZoom(radius, zoom) {
  return radius / Math.pow(Math.max(MIN_ZOOM, zoom || MIN_ZOOM), CITY_RADIUS_ZOOM_EXPONENT);
}

function labelSizeForZoom(size, zoom) {
  const scaled = size / Math.pow(Math.max(MIN_ZOOM, zoom || MIN_ZOOM), LABEL_ZOOM_EXPONENT);
  return Number(clamp(scaled, 3.4, size).toFixed(2));
}

function radiusAwareOffset(offset, zoom) {
  return Number((offset / Math.pow(Math.max(MIN_ZOOM, zoom || MIN_ZOOM), 0.55)).toFixed(2));
}

function cityClasses(city, { isHQ, isBranch, isBranchSelected, isSelected, hasRoute }) {
  return [
    'city-node',
    city.level >= 3 ? 'city-node-major' : '',
    isHQ ? 'city-node-hq' : '',
    isBranch ? 'city-node-branch' : '',
    isBranchSelected ? 'city-node-branch-selected' : '',
    isSelected ? 'city-node-selected' : '',
    hasRoute ? 'city-node-routed' : '',
  ].filter(Boolean).join(' ');
}

function cityHaloClasses({ isHQ, isBranch, isBranchSelected, isSelected, hasRoute }) {
  return [
    'city-halo',
    isHQ ? 'city-node-hq' : '',
    isBranch ? 'city-node-branch' : '',
    isBranchSelected ? 'city-node-branch-selected' : '',
    isSelected ? 'city-node-selected' : '',
    hasRoute ? 'city-node-routed' : '',
  ].filter(Boolean).join(' ');
}

function shouldShowCityLabel(city, { isHQ, isBranch, isBranchSelected, isSelected, hasRoute, zoom }) {
  if (isHQ || isBranch || isBranchSelected || isSelected || hasRoute || city.level >= 3) return true;
  if (zoom >= 1.5 && city.level >= 2) return true;
  return zoom >= 2;
}

function renderCityLabel(city, { isHQ, isBranch, isBranchSelected, isSelected, hasRoute, labelSize, offset = 0, zoom }) {
  const cx = cityX(city) + offset;
  const cy = cityY(city);
  const projected = projectCity(city);
  const dx = projected.x > 0.88 ? -8 : projected.x < 0.12 ? 8 : 0;
  const anchor = dx < 0 ? 'end' : dx > 0 ? 'start' : 'middle';
  const y = isHQ || isBranch || isBranchSelected || isSelected || hasRoute ? cy + labelSize + radiusAwareOffset(4.5, zoom) : cy - radiusAwareOffset(7, zoom);
  const classes = ['city-label', city.level >= 3 ? 'city-label-major' : '', isHQ ? 'city-label-hq' : '', isBranch ? 'city-label-branch' : ''].filter(Boolean).join(' ');
  return `<text x="${cx + dx}" y="${y}" font-size="${labelSize}" text-anchor="${anchor}" class="${classes}">${city.name}</text>`;
}

function mapStageStyle() {
  return 'width:100%;height:100%';
}

function viewportFor(rect, zoom, panX = 0, panY = 0) {
  const { vw, vh } = viewportSizeFor(rect, zoom);
  const wrappedPanX = wrapPanX(panX, zoom);
  const clampedPanY = clampPanY(panY, zoom, rect);
  return {
    vw,
    vh,
    ox: (MAP_WIDTH - vw) / 2 - wrappedPanX / zoom,
    oy: (MAP_HEIGHT - vh) / 2 - clampedPanY / zoom,
  };
}

function viewportSizeFor(rect, zoom) {
  const base = baseViewportSizeFor(rect);
  const safeZoom = Math.max(MIN_ZOOM, zoom || MIN_ZOOM);
  return {
    vw: base.vw / safeZoom,
    vh: base.vh / safeZoom,
  };
}

function baseViewportSizeFor(rect) {
  const aspect = rect?.width && rect?.height ? rect.width / rect.height : MAP_ASPECT;
  if (aspect >= MAP_ASPECT) {
    return {
      vw: MAP_WIDTH,
      vh: MAP_WIDTH / aspect,
    };
  }
  return {
    vw: MAP_HEIGHT * aspect,
    vh: MAP_HEIGHT,
  };
}

export function setMapZoom(state, z) {
  if (!state) return;
  state.mapZoom = clampZoom(z);
  state.mapPanX = 0;
  state.mapPanY = 0;
  updateZoomButtons(state.mapZoom);
}

export function updateZoomButtons(zoom) {
  Object.values(ZOOM_BUTTONS).forEach((id) => {
    const el = byId(id);
    if (el) {
      el.style.background = '#334155';
      el.style.color = '#e0e8f0';
    }
  });
  const activeId = ZOOM_BUTTONS[zoom] || 'zoom1';
  const el = byId(activeId);
  if (el) {
    el.style.background = '#2563eb';
    el.style.color = '#fff';
  }
}

export function initMapDrag(getState, render) {
  const mc = byId('map-container');
  const renderMap = () => render();
  let touchRenderFrame = null;
  let lastTouchRenderTime = 0;
  const scheduleTouchRender = () => {
    if (touchRenderFrame) return;
    touchRenderFrame = requestAnimationFrame((time) => {
      touchRenderFrame = null;
      if (time - lastTouchRenderTime < TOUCH_RENDER_INTERVAL) {
        scheduleTouchRender();
        return;
      }
      lastTouchRenderTime = time;
      renderMap();
    });
  };
  const flushTouchRender = () => {
    if (touchRenderFrame) {
      cancelAnimationFrame(touchRenderFrame);
      touchRenderFrame = null;
    }
    lastTouchRenderTime = performance.now();
    renderMap();
  };

  mc.addEventListener('mousedown', (e) => {
    const state = getState();
    if (e.target.closest('[data-city-touch-target]')) return;
    if (!e.target.closest('.map-stage')) return;
    const stage = mc.querySelector('.map-stage') || mc;
    if (!state || !canPan(state, stage.getBoundingClientRect())) return;
    mapDrag = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: state.mapPanX || 0,
      startPanY: state.mapPanY || 0,
    };
    mc.style.cursor = 'grabbing';
    stopEdgeScroll();
    e.preventDefault();
  });

  mc.addEventListener('wheel', (e) => {
    const state = getState();
    const stage = stageFromEvent(e);
    if (!state || !stage) return;
    e.preventDefault();
    const oldZoom = state.mapZoom || MIN_ZOOM;
    const factor = Math.exp(clamp(-e.deltaY, -80, 80) * WHEEL_ZOOM_DELTA);
    const nextZoom = clampZoom(oldZoom * factor);
    if (Math.abs(nextZoom - oldZoom) < 0.01) return;
    setMapZoomAtPoint(state, nextZoom, e, stage.getBoundingClientRect());
    renderMap();
  }, { passive: false });

  mc.addEventListener('click', normalizeCityTouchClick, true);

  mc.addEventListener('touchstart', (e) => {
    const state = getState();
    if (!state) return;
    const stage = mc.querySelector('.map-stage') || mc;
    const rect = stage.getBoundingClientRect();
    if (e.touches.length >= 2) {
      beginTouchPinch(state, e.touches, rect);
      mapDrag.dragging = false;
      stopEdgeScroll();
      e.preventDefault();
      return;
    }
    if (e.touches.length !== 1) return;
    if (e.target.closest('[data-city-touch-target]')) return;
    if (!e.target.closest('.map-stage')) return;
    if (!canPan(state, rect)) return;
    const touch = e.touches[0];
    beginTouchPan(state, touch);
    stopEdgeScroll();
    e.preventDefault();
  }, { passive: false });

  mc.addEventListener('touchmove', (e) => {
    const state = getState();
    if (!state || !mapTouch.mode) return;
    const stage = mc.querySelector('.map-stage') || mc;
    const rect = stage.getBoundingClientRect();
    if (e.touches.length >= 2) {
      if (mapTouch.mode !== 'pinch') beginTouchPinch(state, e.touches, rect);
      updateTouchPinch(state, e.touches, rect);
      scheduleTouchRender();
      e.preventDefault();
      return;
    }
    if (mapTouch.mode === 'pan' && e.touches.length === 1) {
      updateTouchPan(state, e.touches[0], rect);
      scheduleTouchRender();
      e.preventDefault();
    }
  }, { passive: false });

  mc.addEventListener('touchend', (e) => {
    const state = getState();
    if (state && mapTouch.mode === 'pinch' && e.touches.length === 1) {
      beginTouchPan(state, e.touches[0]);
      return;
    }
    if (e.touches.length === 0) {
      resetMapTouch();
      flushTouchRender();
    }
  });

  mc.addEventListener('touchcancel', resetMapTouch);

  window.addEventListener('mousemove', (e) => {
    const state = getState();
    if (!state) return;
    if (mapDrag.dragging) {
      const stage = mc.querySelector('.map-stage') || mc;
      const rect = stage.getBoundingClientRect();
      const viewport = viewportSizeFor(rect, state.mapZoom);
      const dx = (e.clientX - mapDrag.startX) * (viewport.vw / rect.width) * state.mapZoom;
      const dy = (e.clientY - mapDrag.startY) * (viewport.vh / rect.height) * state.mapZoom;
      state.mapPanX = wrapPanX(mapDrag.startPanX + dx, state.mapZoom);
      state.mapPanY = clampPanY(mapDrag.startPanY + dy, state.mapZoom, rect);
      renderMap();
      return;
    }
    updateCityTooltip(e);
    updateEdgeScroll(e, state, getState, renderMap);
  });

  window.addEventListener('mouseup', () => {
    const state = getState();
    if (mapDrag.dragging) {
      mapDrag.dragging = false;
      const mc2 = byId('map-container');
      if (mc2) {
        const stage = mc2.querySelector('.map-stage') || mc2;
        mc2.style.cursor = state && canPan(state, stage.getBoundingClientRect()) ? 'grab' : 'default';
      }
    }
  });

  mc.addEventListener('mousemove', () => {
    const state = getState();
    const stage = mc.querySelector('.map-stage') || mc;
    if (state && canPan(state, stage.getBoundingClientRect()) && !mapDrag.dragging) mc.style.cursor = 'grab';
    else if (!mapDrag.dragging) mc.style.cursor = 'default';
  });

  mc.addEventListener('mouseleave', () => {
    hideCityTooltip();
    stopEdgeScroll();
    if (!mapDrag.dragging) mc.style.cursor = 'default';
  });
}

function clampZoom(zoom) {
  return Math.round(clamp(zoom, MIN_ZOOM, MAX_ZOOM) * 100) / 100;
}

function setMapZoomAtPoint(state, nextZoom, event, stageRect) {
  setMapZoomBetweenPoints(state, nextZoom, stageRect, {
    oldZoom: state.mapZoom || MIN_ZOOM,
    oldPanX: state.mapPanX || 0,
    oldPanY: state.mapPanY || 0,
    anchorClientX: event.clientX,
    anchorClientY: event.clientY,
    targetClientX: event.clientX,
    targetClientY: event.clientY,
  });
}

function setMapZoomBetweenPoints(state, nextZoom, stageRect, anchor) {
  const oldViewport = viewportFor(stageRect, anchor.oldZoom, anchor.oldPanX, anchor.oldPanY);
  const anchorPctX = clamp((anchor.anchorClientX - stageRect.left) / stageRect.width, 0, 1);
  const anchorPctY = clamp((anchor.anchorClientY - stageRect.top) / stageRect.height, 0, 1);
  const targetPctX = clamp((anchor.targetClientX - stageRect.left) / stageRect.width, 0, 1);
  const targetPctY = clamp((anchor.targetClientY - stageRect.top) / stageRect.height, 0, 1);
  const anchorX = oldViewport.ox + anchorPctX * oldViewport.vw;
  const anchorY = oldViewport.oy + anchorPctY * oldViewport.vh;
  const { vw: newVw, vh: newVh } = viewportSizeFor(stageRect, nextZoom);
  const newOx = anchorX - targetPctX * newVw;
  const newOy = anchorY - targetPctY * newVh;

  state.mapZoom = nextZoom;
  state.mapPanX = wrapPanX(((MAP_WIDTH - newVw) / 2 - newOx) * nextZoom, nextZoom);
  state.mapPanY = clampPanY(((MAP_HEIGHT - newVh) / 2 - newOy) * nextZoom, nextZoom, stageRect);
  updateZoomButtons(nextZoom);
}

function stageFromEvent(event) {
  return stageFromClientPoint(event.clientX, event.clientY);
}

function stageFromClientPoint(clientX, clientY) {
  const stage = byId('map-container')?.querySelector('.map-stage');
  if (!stage) return null;
  const rect = stage.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
  return stage;
}

function normalizeCityTouchClick(event) {
  const target = event.target.closest('[data-city-touch-target]');
  if (!target) return;
  const stage = target.closest('.map-stage');
  if (!stage) return;
  const nearest = nearestCityTouchTarget(stage, event.clientX, event.clientY);
  if (!nearest || nearest === target) return;
  const originalCityId = target.dataset.cityId;
  target.dataset.cityId = nearest.dataset.cityId;
  queueMicrotask(() => {
    if (target.isConnected && target.dataset.cityId === nearest.dataset.cityId) {
      target.dataset.cityId = originalCityId;
    }
  });
}

function nearestCityTouchTarget(stage, clientX, clientY) {
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  stage.querySelectorAll('[data-city-touch-target]').forEach((target) => {
    const rect = target.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const distance = dx * dx + dy * dy;
    if (distance < nearestDistance) {
      nearest = target;
      nearestDistance = distance;
    }
  });
  return nearest;
}

function beginTouchPan(state, touch) {
  mapTouch = {
    mode: 'pan',
    startX: touch.clientX,
    startY: touch.clientY,
    startPanX: state.mapPanX || 0,
    startPanY: state.mapPanY || 0,
    startZoom: state.mapZoom || MIN_ZOOM,
    startDistance: 0,
    startCenterX: touch.clientX,
    startCenterY: touch.clientY,
  };
}

function updateTouchPan(state, touch, rect) {
  const zoom = state.mapZoom || MIN_ZOOM;
  const viewport = viewportSizeFor(rect, zoom);
  const dx = (touch.clientX - mapTouch.startX) * (viewport.vw / rect.width) * zoom;
  const dy = (touch.clientY - mapTouch.startY) * (viewport.vh / rect.height) * zoom;
  state.mapPanX = wrapPanX(mapTouch.startPanX + dx, zoom);
  state.mapPanY = clampPanY(mapTouch.startPanY + dy, zoom, rect);
}

function beginTouchPinch(state, touches, rect) {
  const center = touchCenter(touches);
  if (!stageFromClientPoint(center.clientX, center.clientY)) return;
  mapTouch = {
    mode: 'pinch',
    startX: 0,
    startY: 0,
    startPanX: state.mapPanX || 0,
    startPanY: state.mapPanY || 0,
    startZoom: state.mapZoom || MIN_ZOOM,
    startDistance: touchDistance(touches) || 1,
    startCenterX: center.clientX,
    startCenterY: center.clientY,
  };
}

function updateTouchPinch(state, touches, rect) {
  const center = touchCenter(touches);
  const distance = touchDistance(touches);
  if (!distance || !mapTouch.startDistance) return;
  const nextZoom = clampZoom(mapTouch.startZoom * (distance / mapTouch.startDistance));
  setMapZoomBetweenPoints(state, nextZoom, rect, {
    oldZoom: mapTouch.startZoom,
    oldPanX: mapTouch.startPanX,
    oldPanY: mapTouch.startPanY,
    anchorClientX: mapTouch.startCenterX,
    anchorClientY: mapTouch.startCenterY,
    targetClientX: center.clientX,
    targetClientY: center.clientY,
  });
}

function resetMapTouch() {
  mapTouch.mode = null;
}

function touchCenter(touches) {
  return {
    clientX: (touches[0].clientX + touches[1].clientX) / 2,
    clientY: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function touchDistance(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function updateCityTooltip(event) {
  const target = event.target.closest('[data-city-touch-target]');
  if (!target) {
    hideCityTooltip();
    return;
  }
  const city = getCity(target.dataset.cityId);
  const tooltip = target.closest('.map-stage')?.querySelector('.map-tooltip');
  if (!city || !tooltip) return;
  const stageRect = target.closest('.map-stage').getBoundingClientRect();
  tooltip.textContent = city.name;
  tooltip.hidden = false;
  const left = clamp(event.clientX - stageRect.left + 12, 8, stageRect.width - 96);
  const top = clamp(event.clientY - stageRect.top - 34, 8, stageRect.height - 32);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideCityTooltip() {
  const tooltip = byId('map-container')?.querySelector('.map-tooltip');
  if (tooltip) tooltip.hidden = true;
}

function updateEdgeScroll(event, state, getState, render) {
  const stage = stageFromEvent(event);
  if (!stage || !canPan(state, stage.getBoundingClientRect())) {
    stopEdgeScroll();
    return;
  }
  const rect = stage.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  edgeScroll.x = edgeDirection(x, rect.width);
  edgeScroll.y = maxPanY(state.mapZoom || MIN_ZOOM, rect) > 0.5 ? edgeDirection(y, rect.height) : 0;
  if (!edgeScroll.x && !edgeScroll.y) {
    stopEdgeScroll();
    return;
  }
  if (!edgeScroll.frame) {
    edgeScroll.lastTime = performance.now();
    edgeScroll.frame = requestAnimationFrame((time) => stepEdgeScroll(time, getState, render));
  }
}

function edgeDirection(position, size) {
  if (position < EDGE_SCROLL_SIZE) return 1 - position / EDGE_SCROLL_SIZE;
  if (position > size - EDGE_SCROLL_SIZE) return -(1 - (size - position) / EDGE_SCROLL_SIZE);
  return 0;
}

function stepEdgeScroll(time, getState, render) {
  const state = getState();
  const zoom = state?.mapZoom || MIN_ZOOM;
  const stage = byId('map-container')?.querySelector('.map-stage');
  const rect = stage?.getBoundingClientRect();
  if (!state || !rect || !canPan(state, rect) || (!edgeScroll.x && !edgeScroll.y)) {
    stopEdgeScroll();
    return;
  }
  const elapsed = Math.min(0.05, Math.max(0, (time - edgeScroll.lastTime) / 1000));
  edgeScroll.lastTime = time;
  const speed = EDGE_SCROLL_SPEED * (0.85 + zoom * 0.15);
  const currentX = state.mapPanX || 0;
  const currentY = state.mapPanY || 0;
  const nextX = wrapPanX(currentX + edgeScroll.x * speed * elapsed, zoom);
  const nextY = clampPanY(currentY + edgeScroll.y * speed * elapsed, zoom, rect);
  if (Math.abs(nextX - currentX) > 0.01 || Math.abs(nextY - currentY) > 0.01) {
    state.mapPanX = nextX;
    state.mapPanY = nextY;
    render();
  } else if (elapsed > 0.02) {
    stopEdgeScroll();
    return;
  }
  edgeScroll.frame = requestAnimationFrame((nextTime) => stepEdgeScroll(nextTime, getState, render));
}

function stopEdgeScroll() {
  edgeScroll.x = 0;
  edgeScroll.y = 0;
  edgeScroll.lastTime = 0;
  if (edgeScroll.frame) {
    cancelAnimationFrame(edgeScroll.frame);
    edgeScroll.frame = null;
  }
}

function clampPanY(value, zoom, rect) {
  return clamp(value, -maxPanY(zoom, rect), maxPanY(zoom, rect));
}

function wrapPanX(value, zoom) {
  const period = MAP_WIDTH * Math.max(MIN_ZOOM, zoom || MIN_ZOOM);
  return wrapCentered(value || 0, period);
}

function wrapCentered(value, period) {
  return ((((value + period / 2) % period) + period) % period) - period / 2;
}

function maxPanY(zoom, rect) {
  const { vh } = viewportSizeFor(rect, zoom);
  return ((MAP_HEIGHT - vh) * Math.max(MIN_ZOOM, zoom)) / 2;
}

function canPan(state, rect) {
  const zoom = state?.mapZoom || MIN_ZOOM;
  return canPanHorizontally() || maxPanY(zoom, rect) > 0.5;
}

function canPanHorizontally() {
  return true;
}

function visibleWorldOffsets(ox, vw) {
  const start = Math.floor((ox - MAP_WIDTH) / MAP_WIDTH);
  const end = Math.floor((ox + vw + MAP_WIDTH) / MAP_WIDTH);
  const offsets = [];
  for (let tile = start; tile <= end; tile += 1) {
    offsets.push(tile * MAP_WIDTH);
  }
  return offsets;
}

function isPointNearViewport(x, y, ox, oy, vw, vh) {
  const margin = 36;
  return x >= ox - margin && x <= ox + vw + margin && y >= oy - margin && y <= oy + vh + margin;
}

function routePoints(a, b, offset = 0) {
  const x1 = cityX(a) + offset;
  const y1 = cityY(a);
  let x2 = cityX(b) + offset;
  const y2 = cityY(b);
  const dx = x2 - x1;
  if (dx > MAP_WIDTH / 2) x2 -= MAP_WIDTH;
  else if (dx < -MAP_WIDTH / 2) x2 += MAP_WIDTH;
  return {
    x1,
    y1,
    x2,
    y2,
    mx: (x1 + x2) / 2,
    my: (y1 + y2) / 2,
  };
}

function renderRouteLine(a, b, offset, color, className, points = routePoints(a, b, offset)) {
  return `<line x1="${points.x1}" y1="${points.y1}" x2="${points.x2}" y2="${points.y2}" stroke="${color}" class="${className}"/>`;
}

export function describeRouteSelection(cityFrom, cityTo, options = {}) {
  const fromIsBase = options.fromIsBase ?? true;
  const baseWarning = fromIsBase ? '' : '<span style="color:#f87171;font-size:11px;margin-left:6px">（非基地）</span>';
  if (!cityTo) {
    return `<div style="font-size:13px"><div style="margin-bottom:6px"><span style="color:#7ba3cc">起飞：</span><span style="color:#e0e8f0;font-weight:700">${cityFrom.name}</span>${baseWarning}</div><div style="color:#556">点击地图选择到达城市${fromIsBase ? '' : '（仅查看距离，无法开通航线）'}</div></div>`;
  }
  const d = cityDist(cityFrom, cityTo);
  return `<div style="font-size:13px"><div style="margin-bottom:4px"><span style="color:#7ba3cc">起飞：</span><span style="color:#e0e8f0;font-weight:700">${cityFrom.name}</span>${baseWarning}</div><div style="margin-bottom:4px"><span style="color:#7ba3cc">到达：</span><span style="color:#e0e8f0;font-weight:700">${cityTo.name}</span></div><div style="color:#7ba3cc">距离：${Math.round(d)} km</div>${fromIsBase ? '' : '<div style="color:#f87171;font-size:11px;margin-top:4px">起飞城市非基地，无法开通航线</div>'}</div>`;
}
