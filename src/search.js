// search.js — buscador del topbar.
// Expone onSearch(value) global. Filtra red e indice en vivo.

import { APP } from './state.js';
import { renderIdx } from './views/index.js';
import { applyNetFilter } from './views/network.js';

let lastQuery = '';

function normalize(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function matchesQuery(actor, q) {
  if (!q) return true;
  const fields = [
    actor.label, actor.role, actor.signal, actor.ciudad,
    actor.vertical, actor.id, actor.id_vertical,
  ];
  for (const f of fields) {
    if (normalize(f).includes(q)) return true;
  }
  return false;
}

function paintCount(q, hits) {
  const el = document.getElementById('srch-count');
  if (!el) return;
  if (!q) { el.style.display = 'none'; el.textContent = ''; return; }
  el.style.display = 'inline';
  el.textContent = hits + (hits === 1 ? ' resultado' : ' resultados');
}

export function onSearch(value) {
  const q = normalize(value);
  lastQuery = q;
  let hits = 0;
  if (q) {
    for (const a of APP.ACTORS) if (matchesQuery(a, q)) hits++;
  } else {
    hits = APP.ACTORS.length;
  }
  paintCount(q, hits);
  // La red ya re-renderiza al cambiar el filtro vertical; aqui refrescamos por si
  // el usuario esta en vista network: applyNetFilter re-aplica opacidad por filtro activo.
  try { applyNetFilter(APP.activeV); } catch(e) { console.warn('applyNetFilter (search):', e); }
  if (APP.curView === 'index') {
    try { renderIdx(); } catch(e) { console.warn('renderIdx:', e); }
  }
}

export function getSearchQuery() {
  return lastQuery;
}

export function initSearch() {
  window.onSearch = onSearch;
  // Atajo: / para enfocar el buscador
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      const inp = document.getElementById('srch');
      if (inp) inp.focus();
    }
  });
}