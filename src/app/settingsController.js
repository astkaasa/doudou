import { showModal } from '../ui/modal.js';

export const APP_SETTINGS_KEY = 'doudou.appSettings';

export function loadAppSettings(storage = localStorage) {
  try {
    const stored = JSON.parse(storage.getItem(APP_SETTINGS_KEY) || '{}');
    return {
      showBoundaries: stored.showBoundaries !== false,
      mapStyle: stored.mapStyle === 'terrain' ? 'terrain' : 'classic',
    };
  } catch {
    return { showBoundaries: true, mapStyle: 'classic' };
  }
}

export function createSettingsController(app, storage = localStorage) {
  function saveSettings() {
    try {
      storage.setItem(APP_SETTINGS_KEY, JSON.stringify(app.settings));
    } catch {
      // Settings still apply to the current session when storage is unavailable.
    }
  }

  function showSettings() {
    const checked = app.settings.showBoundaries ? 'checked' : '';
    const classicActive = app.settings.mapStyle === 'terrain' ? '' : ' active';
    const terrainActive = app.settings.mapStyle === 'terrain' ? ' active' : '';
    showModal(`<h2>设置</h2>
      <div class="settings-field">
        <div>
          <strong>地图样式</strong>
          <small>经典适合清晰查看航线，地形使用 Natural Earth II 官方地形底图。</small>
        </div>
        <div class="settings-choice-row">
          <button class="settings-choice${classicActive}" data-action="set-map-style" data-map-style="classic">经典</button>
          <button class="settings-choice${terrainActive}" data-action="set-map-style" data-map-style="terrain">地形</button>
        </div>
      </div>
      <label class="settings-toggle">
        <span>
          <strong>显示国界</strong>
          <small>关闭后地图更简洁，只保留陆地轮廓、城市和航线。</small>
        </span>
        <input type="checkbox" data-action="toggle-map-boundaries" ${checked}>
      </label>
      <div style="margin-top:14px;display:flex;justify-content:flex-end">
        <button class="btn btn-primary" data-action="close-modal">完成</button>
      </div>`);
  }

  function toggleMapBoundaries(checked) {
    app.settings.showBoundaries = checked;
    app.uiState.showBoundaries = checked;
    saveSettings();
    app.renderMapOnly();
  }

  function setMapStyle(style) {
    app.settings.mapStyle = style === 'terrain' ? 'terrain' : 'classic';
    app.uiState.mapStyle = app.settings.mapStyle;
    saveSettings();
    app.renderMapOnly();
    showSettings();
  }

  return {
    clickActions: {
      'show-settings': showSettings,
      'set-map-style': ({ target }) => setMapStyle(target.dataset.mapStyle),
      'toggle-map-boundaries': ({ target }) => toggleMapBoundaries(target.checked),
    },
  };
}
