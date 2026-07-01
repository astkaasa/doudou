// ===== MAP RENDERING (Layered SVG + rAF drag throttle) =====
let _mapSVGReady = false;
let _dragRafId = 0;

function ensureMapSVG() {
  if (_mapSVGReady && $('map-svg')) return;
  const container = $('map-container');
  container.innerHTML = `<svg viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%" id="map-svg">
    <g id="map-bg"></g>
    <g id="debug-layer"></g>
    <g id="route-layer"></g>
    <g id="city-layer"></g>
    <g id="label-layer"></g>
  </svg>`;
  // Static background (created once, never rebuilt)
  $('map-bg').innerHTML = `<rect x="-1000" y="0" width="3000" height="500" fill="#0a1225"/>
    <image x="-1000" width="1000" height="500" preserveAspectRatio="none" href="${_MAP_SRC}"/>
    <image x="0" width="1000" height="500" preserveAspectRatio="none" href="${_MAP_SRC}"/>
    <image x="1000" width="1000" height="500" preserveAspectRatio="none" href="${_MAP_SRC}"/>`;
  // Click handler (attached once)
  $('map-svg').addEventListener('click', function(e) {
    if (!e.target.classList || !e.target.classList.contains('city-node')) {
      onMapEmptyClick();
    }
  });
  _mapSVGReady = true;
}

function updateMapViewBox() {
  const svgEl = $('map-svg');
  if (!svgEl) return;
  const zoom = G ? (G.mapZoom || 1) : 1;
  const panX = G ? (G.mapPanX || 0) : 0;
  const panY = G ? (G.mapPanY || 0) : 0;
  const vw = 1000 / zoom, vh = 500 / zoom;
  const wrappedPanX = ((panX % 1000) + 1000) % 1000;
  const ox = (1000 - vw) / 2 - wrappedPanX / zoom;
  const oy = (500 - vh) / 2 - panY / zoom;
  svgEl.setAttribute('viewBox', `${ox} ${oy} ${vw} ${vh}`);
}

function renderMap() {
  ensureMapSVG();
  if (!G) {
    // Before game starts, just show background map
    $('debug-layer').innerHTML = '';
    $('route-layer').innerHTML = '';
    $('city-layer').innerHTML = '';
    $('label-layer').innerHTML = '';
    updateMapViewBox();
    return;
  }
  const zoom = G.mapZoom || 1;
  updateMapViewBox();

  // Debug grid layer
  const debugLayer = $('debug-layer');
  if (uiState.debugGrid) {
    let gridHtml = '';
    [-1000, 0, 1000].forEach(off => {
      for (let lon = -180; lon <= 180; lon += 30) {
        const x = (lon + 180) / 360 * 1000 + off;
        gridHtml += `<line x1="${x}" y1="0" x2="${x}" y2="500" stroke="#ffff00" stroke-width="0.5" opacity="0.4"/>`;
        gridHtml += `<text x="${x}" y="492" fill="#ffff00" font-size="6" text-anchor="middle" opacity="0.5">${lon}\u00B0</text>`;
      }
      for (let lat = -60; lat <= 90; lat += 30) {
        const y = (90 - lat) / 180 * 500;
        gridHtml += `<line x1="${-1000 + off}" y1="${y}" x2="${2000 + off}" y2="${y}" stroke="#00ff00" stroke-width="0.5" opacity="0.4"/>`;
        const labelX = -180 / 360 * 1000 + off + 10;
        gridHtml += `<text x="${labelX}" y="${y - 3}" fill="#00ff00" font-size="6" opacity="0.5">${lat}\u00B0</text>`;
      }
    });
    debugLayer.innerHTML = gridHtml;
  } else {
    debugLayer.innerHTML = '';
  }

  // Route layer
  const routeLayer = $('route-layer');
  let routeHtml = '';
  G.ai.forEach(ai => {
    ai.routes.forEach(r => {
      const a = getCity(r.from), b = getCity(r.to);
      if (!a || !b) return;
      routeHtml += renderRouteLine(a, b, ai.color, 1.5, '4 4', 0.25, false, '');
    });
  });
  G.routes.forEach(r => {
    const a = getCity(r.from), b = getCity(r.to);
    if (!a || !b) return;
    let lineColor = r.isNew ? '#ffffff' : r.profit >= 0 ? '#ffffff' : '#f87171';
    const isSuspended = r.suspended;
    const lineDash = isSuspended ? '8,4' : 'none';
    const lineOpacity = 0.6;
    routeHtml += renderRouteLine(a, b, lineColor, 2.5, lineDash, lineOpacity, !uiState.hideFlyingPlanes && !isSuspended, zoom);
  });
  routeLayer.innerHTML = routeHtml;

  // City layer + label layer
  const cityLayer = $('city-layer');
  const labelLayer = $('label-layer');
  const labelSize = Math.max(7, Math.round(9 / zoom));
  const routedCities = new Set();
  G.routes.forEach(r => { routedCities.add(r.from); routedCities.add(r.to); });
  let cityHtml = '';
  let labelHtml = '';
  CITIES.forEach(c => {
    const _isHQ = isHQ(c.id) || (hqSelectMode && selectedHQ === c.id);
    const _isBranch = isBranch(c.id);
    const _isConstructing = G && G.branchesConstructing && G.branchesConstructing.some(b => b.cityId === c.id);
    const _isBranchSel = branchSelectMode && selectedBranch === c.id;
    const isSelected = !hqSelectMode && !branchSelectMode && G.selectedCity === c.id;
    const hasRoute = routedCities.has(c.id);
    const alreadyBase = c.id === G.hq || (G.branches && G.branches.includes(c.id)) || (G.branchesConstructing && G.branchesConstructing.some(b => b.cityId === c.id));
    let r = 2.5, fill, stroke, strokeW = 1.2, labelOff = 12, dashArr = '';
    if (_isHQ) { r = 5; fill = '#ef4444'; stroke = '#ffffff'; strokeW = 2.5; labelOff = 14; }
    else if (_isConstructing) { r = 3.75; fill = '#fbbf2440'; stroke = '#fbbf24'; strokeW = 2; dashArr = ' stroke-dasharray="3 2"'; labelOff = 12; }
    else if (_isBranch || _isBranchSel) { r = 3.75; fill = '#3b82f6'; stroke = '#ffffff'; strokeW = 2; labelOff = 12; }
    else if (isSelected) { fill = '#60a5fa'; stroke = '#ffffff'; }
    else if (hasRoute) { fill = '#f0a0a0'; stroke = '#ffffff'; }
    else if (branchSelectMode && !alreadyBase) { fill = '#ffffff'; stroke = '#a855f7'; strokeW = 1.5; }
    else { fill = '#ffffff'; stroke = '#f0a0a0'; }
    [-1000, 0, 1000].forEach(offset => {
      cityHtml += `<circle cx="${_rx(c) * 1000 + offset}" cy="${c.y * 500}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"${dashArr} class="city-node" onclick="onCityClick('${c.id}')" />`;
      // Mega event gold pulse ring
      if (G.activeMegaEvents) {
        const isHost = G.activeMegaEvents.some(e => e.cityId === c.id && e.currentBoost > 0);
        if (isHost) {
          const cx = _rx(c) * 1000 + offset;
          const cy = c.y * 500;
          cityHtml += `<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="#d4a017" stroke-width="2" opacity="0.8"><animate attributeName="r" from="6" to="14" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite"/></circle>`;
        }
      }
      if (_isHQ || _isBranch || _isConstructing || isSelected || _isBranchSel) {
        labelHtml += `<text x="${_rx(c) * 1000 + offset}" y="${c.y * 500 + labelOff}" fill="${_isConstructing ? '#fbbf24' : '#c0d0e0'}" font-size="${labelSize}" text-anchor="middle" font-weight="500" pointer-events="none">${c.name}${_isConstructing ? ' 🏗' : ''}</text>`;
      }
      if (uiState.debugGrid) {
        const lon = Math.round(c.x * 360 - 180);
        const lat = Math.round(90 - c.y * 180);
        labelHtml += `<text x="${_rx(c) * 1000 + offset}" y="${c.y * 500 - 8}" fill="#ff8800" font-size="6" text-anchor="middle" pointer-events="none">${c.name} ${lat}\u00B0${lon}\u00B0</text>`;
      }
    });
  });
  cityLayer.innerHTML = cityHtml;
  labelLayer.innerHTML = labelHtml;
}

function onMapEmptyClick() {
  if (!G || G.gameOver) return;
  if (branchSelectMode) return;
  if (G.selectedCity) { G.selectedCity = null; renderMap(); $('bottom-hint').textContent = '选择总部或分部作为起飞城市'; hideRouteCreateInfo(); }
}

function onCityClick(cityId) {
  if (hqSelectMode) {
    selectedHQ = cityId;
    renderMap();
    const nameEl = document.getElementById('hq-selected-name');
    const btnEl = document.getElementById('hq-confirm-btn');
    const infoEl = document.getElementById('hq-selected-info');
    if (nameEl) nameEl.textContent = getCity(cityId).name;
    if (btnEl) btnEl.style.display = '';
    if (infoEl) infoEl.style.display = '';
    return;
  }
  if (branchSelectMode) {
    const c = getCity(cityId);
    const alreadyBase = c.id === G.hq || (G.branches && G.branches.includes(c.id)) || (G.branchesConstructing && G.branchesConstructing.some(b => b.cityId === c.id));
    if (alreadyBase) {
      showBanner(c.name + ' 已是基地，无法重复开设', '#d97706');
      return;
    }
    selectedBranch = cityId;
    renderMap();
    const nameEl2 = document.getElementById('branch-selected-name');
    const btnEl2 = document.getElementById('branch-confirm-btn');
    if (nameEl2) nameEl2.textContent = c.name;
    if (btnEl2) btnEl2.style.display = '';
    return;
  }
  if (G.gameOver) return;
  if (!G.selectedCity) {
    G.selectedCity = cityId;
    renderMap();
    if (isBase(cityId)) {
      $('bottom-hint').textContent = '已选择 ' + getCity(cityId).name + '，点击另一个城市开通航线';
      showRouteCreateInfo(getCity(cityId), null);
    } else {
      $('bottom-hint').textContent = getCity(cityId).name + ' 非基地，选择到达城市可查看距离（无法开通航线）';
      showRouteCreateInfo(getCity(cityId), null);
    }
  }
  else if (G.selectedCity === cityId) { G.selectedCity = null; renderMap(); $('bottom-hint').textContent = '选择总部或分部作为起飞城市'; hideRouteCreateInfo(); }
  else {
    const from = G.selectedCity;
    const toCity = getCity(cityId);
    if (!isBase(from)) {
      const d = cityDist(getCity(from), toCity);
      showRouteCreateInfo(getCity(from), toCity);
      $('bottom-hint').textContent = getCity(from).name + ' \u2192 ' + toCity.name + ' 距离 ' + Math.round(d) + 'km（需从总部或分部起飞才能开通航线）';
      G.selectedCity = null; renderMap();
    }
    else {
      G.selectedCity = null;
      showRouteCreateInfo(getCity(from), toCity);
      openRouteCreateModal(from, cityId);
    }
  }
}

// ===== SHARED ROUTE RENDERING (P4 dedup) =====
function renderRouteLine(a, b, color, width, dash, opacity, showPlanes, zoom) {
  let out = '';
  const dx = b.x - a.x;
  if (Math.abs(dx) > 0.5) {
    const ax = _rx(a) * 1000, ay = a.y * 500, bx = _rx(b) * 1000, by = b.y * 500;
    const goEast = dx < 0;
    const fullDist = goEast ? bx + 1000 - ax : (bx - 1000) - ax;
    const tEdge = goEast ? (1000 - ax) / fullDist : (0 - ax) / fullDist;
    const midY = ay + tEdge * (by - ay);
    [-1000, 0, 1000].forEach(off => {
      let seg1x1, seg1y1, seg1x2, seg1y2, seg2x1, seg2y1, seg2x2, seg2y2;
      if (goEast) {
        seg1x1 = ax + off; seg1y1 = ay; seg1x2 = 1000 + off; seg1y2 = midY;
        seg2x1 = 0 + off; seg2y1 = midY; seg2x2 = bx + off; seg2y2 = by;
      } else {
        seg1x1 = ax + off; seg1y1 = ay; seg1x2 = 0 + off; seg1y2 = midY;
        seg2x1 = 1000 + off; seg2y1 = midY; seg2x2 = bx + off; seg2y2 = by;
      }
      out += `<line x1="${seg1x1}" y1="${seg1y1}" x2="${seg1x2}" y2="${seg1y2}" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}" opacity="${opacity}"/>`;
      out += `<line x1="${seg2x1}" y1="${seg2y1}" x2="${seg2x2}" y2="${seg2y2}" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}" opacity="${opacity}"/>`;
      if (showPlanes) {
        const fs = Math.max(8, Math.round(10 / zoom));
        out += `<text class="flying-plane" style="offset-path:path('M${seg1x1},${seg1y1} L${seg1x2},${seg1y2}');animation-delay:${Math.random() * -6}s" fill="${color}" font-size="${fs}">\u2708</text>`;
        out += `<text class="flying-plane" style="offset-path:path('M${seg2x1},${seg2y1} L${seg2x2},${seg2y2}');animation-delay:${Math.random() * -6}s" fill="${color}" font-size="${fs}">\u2708</text>`;
      }
    });
  } else {
    [-1000, 0, 1000].forEach(off => {
      out += `<line x1="${_rx(a) * 1000 + off}" y1="${a.y * 500}" x2="${_rx(b) * 1000 + off}" y2="${b.y * 500}" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}" opacity="${opacity}"/>`;
      if (showPlanes) {
        const fs = Math.max(8, Math.round(10 / zoom));
        out += `<text class="flying-plane" style="offset-path:path('M${_rx(a) * 1000 + off},${a.y * 500} L${_rx(b) * 1000 + off},${b.y * 500}');animation-delay:${Math.random() * -6}s" fill="${color}" font-size="${fs}">\u2708</text>`;
      }
    });
  }
  return out;
}

// ===== MAP ZOOM & PAN =====
function setMapZoom(z) {
  if (!G) return;
  G.mapZoom = z;
  G.mapPanY = 0;
  const hqCity = getCity(G.hq);
  if (hqCity) G.mapPanX = ((500 - _rx(hqCity) * 1000) % 1000 + 1000) % 1000;
  ['zoom1', 'zoom15', 'zoom2'].forEach(id => { const el = $(id); if (el) { el.style.background = '#334155'; el.style.color = '#e0e8f0'; } });
  const activeId = { 1: 'zoom1', 1.5: 'zoom15', 2: 'zoom2' }[z] || 'zoom1';
  const el = $(activeId); if (el) { el.style.background = '#2563eb'; el.style.color = '#fff'; }
  renderMap();
}

// ===== MAP DRAG (PAN) — rAF throttled =====
function initMapDrag() {
  const mc = $('map-container');
  mc.addEventListener('mousedown', e => {
    if (!G) return;
    if (e.target.classList && e.target.classList.contains('city-node')) return;
    uiState.mapDrag.dragging = true;
    uiState.hideFlyingPlanes = true;
    uiState.mapDrag.startX = e.clientX;
    uiState.mapDrag.startY = e.clientY;
    uiState.mapDrag.startPanX = G.mapPanX || 0;
    uiState.mapDrag.startPanY = G.mapPanY || 0;
    mc.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!uiState.mapDrag.dragging || !G) return;
    const rect = mc.getBoundingClientRect();
    const scale = 1000 / rect.width;
    const zoom = G.mapZoom || 1;
    const dx = (e.clientX - uiState.mapDrag.startX) * scale / zoom;
    const dy = (e.clientY - uiState.mapDrag.startY) * scale / zoom;
    G.mapPanX = (uiState.mapDrag.startPanX + dx);
    const maxPanY = ((zoom - 1) * 250) / zoom;
    G.mapPanY = clamp(uiState.mapDrag.startPanY + dy, -maxPanY, maxPanY);
    // Throttle redraws with requestAnimationFrame
    if (!_dragRafId) {
      _dragRafId = requestAnimationFrame(() => {
        updateMapViewBox();
        _dragRafId = 0;
      });
    }
  });
  window.addEventListener('mouseup', () => {
    if (uiState.mapDrag.dragging) {
      uiState.mapDrag.dragging = false;
      uiState.hideFlyingPlanes = false;
      // Full rebuild after drag ends to restore flying planes
      renderMap();
      const mc2 = $('map-container');
      if (mc2) mc2.style.cursor = 'grab';
    }
  });
  mc.addEventListener('mousemove', () => {
    if (!uiState.mapDrag.dragging) mc.style.cursor = 'grab';
  });
}
