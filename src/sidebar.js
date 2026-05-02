import { APP, VX } from './state.js';
import { renderIdx } from './views/index.js';
import { applyNetFilter } from './views/network.js';

export function filterV(v) {
  APP.activeV = APP.activeV === v ? null : v;
  document.querySelectorAll('[id^="sv-"]').forEach(el => el.classList.remove('active'));
  if (APP.activeV) {
    const el = document.getElementById('sv-' + APP.activeV);
    if (el) el.classList.add('active');
  }
  if (APP.curView === 'index') renderIdx();
  applyNetFilter(APP.activeV);
}

export function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  const ov = document.getElementById('sb-overlay');
  const opening = !sb.classList.contains('open');
  sb.classList.toggle('open', opening);
  ov.classList.toggle('on', opening);
}

export function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('on');
}

export function initSidebarListeners() {
  document.querySelector('.sidebar').addEventListener('click', e => {
    const item = e.target.closest('.sb-item');
    if (item && window.matchMedia('(max-width:768px)').matches) closeSidebar();
  });
}
