// main.js — punto de entrada (lo invoca <script type="module"> en index.html).
// Orquesta: auth -> unlock -> bootMain (carga datos + monta UI).

import { APP } from './state.js';
import { loadData, showDataWarning } from './data.js';
import { initAuth } from './auth.js';
import { initSidebar, paintCounts } from './sidebar.js';
import { initSearch } from './search.js';
import { initTicker } from './ticker.js';
import { initRouterListeners, switchView } from './router.js';
import {
  initNet, setNetLayout, netZoom, netReset, toggleNetClean,
} from './views/network.js';
import { renderIdx, sortIdx } from './views/index.js';
import { buildBrief, expandBacSig } from './views/brief.js';
import { closeP } from './panel.js';

function setDate() {
  const el = document.getElementById('tb-date');
  if (!el) return;
  const d = new Date();
  const meses = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  el.textContent = String(d.getDate()).padStart(2,'0') + '.' + meses[d.getMonth()] + '.' + String(d.getFullYear()).slice(-2);
}

function exposeGlobals() {
  // Onclicks inline del HTML
  window.switchView   = switchView;
  window.setNetLayout = setNetLayout;
  window.netZoom      = netZoom;
  window.netReset     = netReset;
  window.toggleNetClean = toggleNetClean;
  window.closeP       = closeP;
  window.sortIdx      = sortIdx;
  window.expandBacSig = expandBacSig;
}

export async function bootMain() {
  const screen = document.getElementById('screen-main');
  if (screen) screen.classList.add('on');

  setDate();
  exposeGlobals();
  initRouterListeners();

  try {
    await loadData();
  } catch (e) {
    console.error('loadData fallo:', e);
    showDataWarning('Algunos datos no pudieron cargarse. La interfaz funciona en modo degradado.');
  }

  // Map para lookups rapidos
  APP.actorMap = new Map(APP.ACTORS.map(a => [a.id, a]));

  // Monta UI dependiente de datos
  initSidebar();
  initSearch();
  initTicker();
  paintCounts();

  try { initNet(); } catch(e) { console.warn('initNet:', e); }

  // Pre-render de vistas que tienen render perezoso ya esta cubierto por switchView,
  // asi que solo pintamos la inicial
  switchView('network', null, null);
}

// Punto de entrada: auth corre primero. Si el usuario ya esta autenticado
// en una sesion previa podriamos saltar; por ahora siempre arrancamos en auth.
function start() {
  initAuth();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

// Registrar global para que el fallback inline en index.html pueda invocarlo
window.__bootMain__ = bootMain;
