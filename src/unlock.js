import { APP, VX } from './state.js';
import { loadData } from './data.js';
import { initNet } from './views/network.js';
import { buildIdx } from './views/index.js';
import { buildBrief } from './views/brief.js';
import { buildClusters } from './views/clusters.js';
import { initTicker } from './ticker.js';
import { switchView } from './router.js';

const STEPS = [
  { pct: 18, lbl: 'Verificando credenciales',          st: '',                          chk: 0 },
  { pct: 38, lbl: 'Acceso concedido',                  st: 'Usuario autorizado',         chk: 1 },
  { pct: 60, lbl: 'Cargando ecosistema',               st: 'Indexando actores...',       chk: 2 },
  { pct: 82, lbl: 'Construyendo red de relaciones',    st: 'Mapeando conexiones...',     chk: 3 },
  { pct: 100, lbl: 'Listo',                            st: 'Bienvenido al ecosistema',   chk: 4 },
];

export function startUnlock() {
  document.getElementById('screen-unlock').classList.add('on');
  let si = 0, cur = 0;
  const run = () => {
    if (si >= STEPS.length) { setTimeout(launchMain, 700); return; }
    const s = STEPS[si];
    document.getElementById('ul-lbl').textContent = s.lbl;
    document.getElementById('ul-status').textContent = s.st;
    animPct(cur, s.pct, () => {
      cur = s.pct;
      document.querySelectorAll('.ul-chk').forEach(el => { if (+el.dataset.s <= s.chk) el.classList.add('done'); });
      si++;
      setTimeout(run, si === STEPS.length ? 500 : 300);
    });
  };
  run();
}

export function animPct(from, to, done) {
  const fill = document.getElementById('ul-fill');
  const pctEl = document.getElementById('ul-pct');
  let c = from;
  const step = (to - from) / 22;
  const iv = setInterval(() => {
    c = Math.min(c + step, to);
    fill.style.width = c + '%';
    pctEl.textContent = Math.round(c) + '%';
    if (c >= to) { clearInterval(iv); done(); }
  }, 28);
}

export async function launchMain() {
  await loadData();
  APP.actorMap = new Map(APP.ACTORS.map(a => [a.id, a]));
  document.getElementById('screen-unlock').classList.remove('on');
  document.getElementById('screen-main').classList.add('on');
  document.getElementById('ticker').classList.add('on');
  const d = new Date();
  const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const tbDate = document.getElementById('tb-date');
  if (tbDate) tbDate.textContent = d.getDate().toString().padStart(2, '0') + '.' + months[d.getMonth()] + '.' + d.getFullYear();
  const prefersReduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  Object.keys(VX).forEach(v => {
    const el = document.getElementById('sc-' + v);
    if (el) {
      el.textContent = APP.ACTORS.filter(a => a.vertical === v).length;
      const wc = APP.ACTORS.filter(a => a.vertical === v && a.watchlist).length;
      if (wc > 0) {
        const dot = document.createElement('span');
        dot.style.cssText = 'margin-left:4px;width:5px;height:5px;border-radius:50%;background:var(--v9);display:inline-block;' +
          (prefersReduced ? 'opacity:0.7' : 'animation:pulse 2s ease-in-out infinite;opacity:0.7');
        el.appendChild(dot);
      }
    }
  });
  initTicker();
  if (typeof window.d3 === 'undefined') {
    document.querySelectorAll('.vt[data-view="network"],.sb-item[data-view="network"]').forEach(el => el.style.display = 'none');
    const netContainer = document.getElementById('view-network');
    if (netContainer) netContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:var(--mono);font-size:9px;letter-spacing:0.14em;color:var(--text-dim);text-transform:uppercase">VISUALIZACIÓN NO DISPONIBLE EN ESTE NAVEGADOR</div>';
    buildIdx(); buildBrief(); buildClusters();
    switchView('index');
  } else {
    initNet();
    buildIdx(); buildBrief(); buildClusters();
  }
}
