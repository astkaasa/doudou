import { CITIES } from '../data/cities.js';

export const STORAGE_KEYS = {
  save: 'skyline_save',
  backup: 'skyline_save_backup',
  slots: 'skyline_slots',
};

export function byId(id) {
  return document.getElementById(id);
}

export function fmt(n, pre = '$', suf = 'M') {
  return pre + Number(n).toFixed(1) + suf;
}

export function fmtPct(n) {
  return Number(n).toFixed(1) + '%';
}

export function cityDist(a, b) {
  const toRad = (v) => v * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function getCity(id) {
  return CITIES.find((c) => c.id === id);
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function routeKey(a, b) {
  return [a, b].sort().join('-');
}

export function seasonName(q) {
  return ['春', '夏', '秋', '冬'][q - 1];
}

export function seasonEmoji(q) {
  return ['🌸', '☀️', '🍂', '❄️'][q - 1];
}
