import { APP, VX } from './state.js';
import { openPanel } from './panel.js';

export function initTicker() {
  const doubled = [...APP.TICKER_DATA, ...APP.TICKER_DATA];
  document.getElementById('tk-track').innerHTML = doubled.map(t =>
    `<span class="ticker-item" style="cursor:${t.aid ? 'pointer' : 'default'}" onclick="${t.aid ? `openTickerActor('${t.aid || ''}')` : ''}" onmouseenter="${t.aid ? `this.style.color='#45d802'` : ''}" onmouseleave="this.style.color=''"><span style="color:${VX[t.v].color};margin-right:5px">●</span>${t.t}${t.aid ? '<span style="color:rgba(69,216,2,0.4);margin-left:6px;font-size:7px">→</span>' : ''}</span><span class="ticker-sep">//</span>`
  ).join('');
}

export function openTickerActor(aid) {
  const actor = APP.actorMap.get(aid);
  if (!actor) return;
  const panelId = APP.curView === 'index' ? 'idx-panel' : APP.curView === 'brief' ? 'br-panel' : 'net-panel';
  openPanel(actor, panelId);
}
