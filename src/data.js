import { APP } from './state.js';

export function safeGetActor(id) {
  return APP.actorMap.get(id) || { id, label: id, vertical: 'V1', tier: 3, role: '', signal: '', conexiones: [], ciudad: '', valoracion: '', certeza: 'INFERIDO', flag: false, watchlist: false };
}

export function showDataWarning(msg) {
  const existing = document.getElementById('data-warning-banner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'data-warning-banner';
  banner.innerHTML = '<span>' + msg + '</span><button class="dwb-x" onclick="document.getElementById(\'data-warning-banner\').remove()">✕</button>';
  document.body.appendChild(banner);
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 6000);
}

export function showViewError(viewId, retryFn) {
  const container = document.getElementById(viewId);
  if (!container) return;
  if (container.querySelector('.view-error-state')) return;
  const err = document.createElement('div');
  err.className = 'view-error-state';
  err.innerHTML = '<div class="view-error-txt">ERROR AL CARGAR ESTA VISTA — INTENTA DE NUEVO</div><button class="view-error-btn" id="verr-btn-' + viewId + '">REINTENTAR</button>';
  container.appendChild(err);
  document.getElementById('verr-btn-' + viewId).addEventListener('click', function() {
    err.remove();
    try { retryFn(); } catch(e) { console.error(viewId + ' retry error:', e); }
  });
}

export function adaptActor(a) {
  const certezaMap = {
    'Verificado': 'VERIFICADO',
    'Fuente única': 'FUENTE UNICA',
    'Inferido': 'INFERIDO',
    'Inferido por patrón': 'INFERIDO',
  };
  return {
    id:        a.id,
    label:     a.label,
    vertical:  a.vertical,
    tier:      a.tier,
    role:      a.que_hace || a.subcategoria || '',
    certeza:   certezaMap[a.certeza] || a.certeza?.toUpperCase() || 'VERIFICADO',
    ciudad:    a.ciudad || '',
    valoracion:'',
    conexiones: a.conexiones || [],
    signal:    a.known_for || a.por_que || '',
    flag:      a.flag,
    nota_flag: a.nota_flag || '',
    watchlist: a.watchlist,
    website:   a.website || '',
    fuentes:   a.fuentes || '',
    que_hace:  a.que_hace || '',
    por_que:   a.por_que || '',
  };
}

function adaptEdge(e) {
  return [e.source, e.target];
}

export function buildPoiMap(rawMap) {
  const out = {};
  for (const [actorId, entries] of Object.entries(rawMap)) {
    out[actorId] = {
      poi: entries.map(p => ({ n: p.nombre, r: p.cargo })),
      riesgo: entries.map(p => p.por_que).filter(Boolean).join(' / ') || '',
    };
  }
  return out;
}

export function buildTicker(actors) {
  const flagged = actors.filter(a => a.flag || a.tier === 1).slice(0, 20);
  return flagged.map(a => ({
    v:   a.vertical,
    aid: a.id,
    t:   a.signal || a.label,
  }));
}

export async function loadData() {
  const failures = [];
  const safeFetch = async (url, name) => {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
      const data = await r.json();
      console.log('[loadData] ' + name + ' loaded: ' + (Array.isArray(data) ? data.length + ' items' : Object.keys(data).length + ' keys'));
      return data;
    } catch(e) {
      console.error('[loadData] FAILED ' + name + ':', e.message);
      failures.push(name);
      return null;
    }
  };
  const [actorsRaw, edgesRaw, poiRaw, clustersRaw] = await Promise.all([
    safeFetch('actors.json', 'actors'),
    safeFetch('edges.json', 'edges'),
    safeFetch('poi.json', 'poi'),
    safeFetch('clusters.json', 'clusters'),
  ]);
  APP.ACTORS    = actorsRaw ? actorsRaw.map(adaptActor) : [];
  APP.EDGES_RAW = edgesRaw || [];
  APP.EDGES     = APP.EDGES_RAW.map(adaptEdge);
  APP.POI       = poiRaw ? buildPoiMap(poiRaw) : {};
  APP.CLUSTERS  = clustersRaw || [];
  APP.TICKER_DATA = buildTicker(APP.ACTORS);
  const chk = document.querySelector('.ul-chk[data-s="2"]');
  if (chk) chk.textContent = APP.ACTORS.length + ' actores indexados';
  if (failures.length) {
    showDataWarning('ALGUNOS DATOS NO PUDIERON CARGARSE — FUNCIONALIDAD REDUCIDA');
  }
}
