// ticker.js — banda inferior de senales.
// Lee APP.TICKER_DATA (poblado por data.js) y arma un loop CSS de doble largo.

import { APP } from './state.js';

function escapeHTML(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderTicker() {
  const track = document.getElementById('tk-track');
  const wrap  = document.getElementById('ticker');
  if (!track || !wrap) return;

  const items = (APP.TICKER_DATA && APP.TICKER_DATA.length)
    ? APP.TICKER_DATA
    : APP.ACTORS.filter(a => a.signal).slice(0, 16).map(a => ({
        label:  a.label,
        signal: a.signal,
        vertical: a.vertical,
      }));

  if (!items.length) {
    wrap.classList.remove('on');
    track.innerHTML = '';
    return;
  }

  const html = items.map(it => {
    const v = it.vertical ? '<span style="color:var(--' + escapeHTML(it.vertical.toLowerCase()) + ')">' + escapeHTML(it.vertical) + '</span>' : '';
    const sep = '<span class="ticker-sep">·</span>';
    const lbl = '<strong style="color:var(--text-muted);font-weight:700">' + escapeHTML(it.label) + '</strong>';
    return '<span class="ticker-item">' + v + (v ? sep : '') + lbl + sep + escapeHTML(it.signal) + '</span>';
  }).join('');

  // Doble largo para loop continuo
  track.innerHTML = html + html;
  wrap.classList.add('on');
}

export function initTicker() {
  renderTicker();
}