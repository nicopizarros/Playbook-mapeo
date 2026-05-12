import { APP, VX } from './state.js';
import { openPanel } from './panel.js';

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function renderTicker() {
  const track = document.getElementById('tk-track');
  const wrap  = document.getElementById('ticker');
  if (!track || !wrap) return;

  const items = (APP.TICKER_DATA && APP.TICKER_DATA.length)
    ? APP.TICKER_DATA
    : APP.ACTORS.filter(a => a.tier === 1 || a.flag).slice(0, 28).map(a => ({
        label: a.label, vertical: a.vertical, signal: a.signal || a.role || '',
        score: a.score_compuesto, tier: a.tier,
      }));

  if (!items.length) { wrap.classList.remove('on'); track.innerHTML = ''; return; }

  const html = items.map(it => {
    const vc    = VX[it.vertical] || {};
    const col   = vc.color || '#45d802';
    const vcode = `<span style="color:${col};font-weight:700;letter-spacing:0.1em">${esc(it.vertical || '')}</span>`;
    const name  = `<span style="color:rgba(255,255,255,0.82);font-weight:700">${esc(it.label)}</span>`;
    const score = it.score != null
      ? `<span class="ticker-score" style="color:${col}">${Math.round((it.score||0)*100)}%</span>`
      : '';
    const sig   = it.signal
      ? `<span style="color:rgba(255,255,255,0.42)">${esc(it.signal.length > 72 ? it.signal.slice(0,70)+'…' : it.signal)}</span>`
      : '';
    const sep   = `<span class="ticker-sep">·</span>`;
    const trend = it.score != null ? (it.score >= 0.5 ? '▲' : '▼') : '•';
    const trendCol = it.score != null ? (it.score >= 0.5 ? '#45d802' : '#ff6b6b') : 'rgba(255,255,255,0.45)';
    const marker = `<span style="color:${trendCol};font-weight:700">${trend}</span>`;
    const badge = it.watchlist ? '<span style="color:#ffd60a">WL</span>' : (it.flag ? '<span style="color:#ff6b6b">FLAG</span>' : '');
    const parts = [marker, vcode, name, score, badge, sig].filter(Boolean).join(sep);
    const idAttr = it.id ? ` data-actor-id="${esc(it.id)}"` : '';
    const cls = it.id ? 'ticker-item is-clickable' : 'ticker-item';
    return `<span class="${cls}"${idAttr}>${parts}</span>`;
  }).join('');

  // Double the content for seamless infinite loop
  track.innerHTML = html + html;
  wrap.classList.add('on');

  track.onclick = e => {
    const item = e.target.closest('.ticker-item[data-actor-id]');
    if (!item) return;
    const actorId = item.getAttribute('data-actor-id');
    const actor = APP.actorMap && APP.actorMap.get(actorId);
    if (actor) openPanel(actor, 'net-panel');
  };
}

export function initTicker() {
  renderTicker();
}
