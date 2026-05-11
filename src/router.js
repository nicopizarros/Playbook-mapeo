import { APP, VX } from './state.js';
import { showViewError } from './data.js';
import { renderIdx } from './views/index.js';
import { buildBrief } from './views/brief.js';
import { buildClusters } from './views/clusters.js';
import { updateHoverState } from './views/network.js';

export function closeAllPanels() {
  ['net-panel', 'idx-panel', 'br-panel', 'cluster-panel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
}

export function switchView(v, sbEl, tabEl) {
  closeAllPanels();
  APP.hoveredId = null;
  try { updateHoverState(); } catch(e) {}
  APP.curView = v;
  ['network', 'index', 'brief', 'clusters'].forEach(id => {
    const el = document.getElementById('view-' + id);
    if (!el) return;
    if (id === v) { el.style.display = 'block'; el.style.visibility = 'visible'; void el.offsetHeight; }
    else { el.style.display = 'none'; el.style.visibility = 'hidden'; }
  });
  document.querySelectorAll('.sb-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === v));
  document.querySelectorAll('.vt').forEach(el => el.classList.toggle('active', el.dataset.view === v));
  const lbls = {
    network: 'Red <em>/ Ecosistema completo</em>',
    index:   'Indice <em>/ Todos los actores</em>',
    brief:   'Briefings <em>/ Por vertical</em>',
    clusters:'Clusters ejecutivos <em>/ 7 estructuras de poder</em>',
  };
  document.getElementById('tb-crumb').innerHTML = lbls[v] || '';
  if (v === 'index') {
    try { renderIdx(); } catch(e) { console.warn('renderIdx error:', e); showViewError('view-index', renderIdx); }
  }
  if (v === 'brief') {
    const nav = document.getElementById('brief-nav');
    const body = document.getElementById('brief-body');
    if (nav && body && nav.children.length === 0) {
      try { buildBrief(); } catch(e) { console.warn('buildBrief error:', e); showViewError('view-brief', buildBrief); }
    }
  }
  if (v === 'clusters') {
    try { buildClusters(); } catch(e) { console.warn('buildClusters error:', e); showViewError('view-clusters', buildClusters); }
  }
}

export function initRouterListeners() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAllPanels();
      const sb = document.querySelector('.sidebar');
      if (sb && sb.classList.contains('open')) {
        sb.classList.remove('open');
        const ov = document.getElementById('sb-overlay');
        if (ov) ov.classList.remove('on');
      }
    }
  });
}