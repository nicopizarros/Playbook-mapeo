// sidebar.js — sidebar y filtro por vertical.
// Expone filterV(), toggleSidebar(), closeSidebar() globales para los onclicks del HTML.

import { APP } from './state.js';
import { renderIdx } from './views/index.js';
import { applyNetFilter } from './views/network.js';

export function paintCounts() {
  const counts = {};
  for (const a of APP.ACTORS) {
    counts[a.vertical] = (counts[a.vertical] || 0) + 1;
  }
  for (let i = 1; i <= 9; i++) {
    const code = 'V' + i;
    const el = document.getElementById('sc-' + code);
    if (el) el.textContent = counts[code] || 0;
  }
}

function paintActiveV() {
  for (let i = 1; i <= 9; i++) {
    const code = 'V' + i;
    const item = document.getElementById('sv-' + code);
    if (item) item.classList.toggle('active', APP.activeV === code);
  }
}

export function filterV(code) {
  // Toggle: si ya esta activa la apaga
  APP.activeV = (APP.activeV === code) ? null : code;
  paintActiveV();
  try { applyNetFilter(APP.activeV); } catch(e) { console.warn('applyNetFilter:', e); }
  if (APP.curView === 'index') {
    try { renderIdx(); } catch(e) { console.warn('renderIdx:', e); }
  }
}

export function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  const ov = document.getElementById('sb-overlay');
  if (!sb) return;
  const open = sb.classList.toggle('open');
  if (ov) ov.classList.toggle('on', open);
}

export function closeSidebar() {
  const sb = document.querySelector('.sidebar');
  const ov = document.getElementById('sb-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('on');
}

export function initSidebar() {
  paintCounts();
  paintActiveV();
  window.filterV       = filterV;
  window.toggleSidebar = toggleSidebar;
  window.closeSidebar  = closeSidebar;
}