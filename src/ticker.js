import { APP, VX } from './state.js';

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
    const parts = [vcode, name, score, sig].filter(Boolean).join(sep);
    return `<span class="ticker-item">${parts}</span>`;
  }).join('');

  // Double the content for seamless infinite loop
  track.innerHTML = html + html;
  wrap.classList.add('on');
}

export function initTicker() {
  renderTicker();
}
