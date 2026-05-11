import { APP, VX } from '../state.js';
import { openPanel } from '../panel.js';
import { showViewError } from '../data.js';

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  if (isNaN(n)) return '69,216,2';
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// Limpia el nombre del cluster para mostrar en la lista lateral.
// El header viene como "CLUSTER N — Nombre" o el nombre puede tener "Cluster ...".
function cleanName(cl) {
  const raw = cl.nombre || cl.header || '';
  return raw.replace(/^CLUSTER\s+\d+\s+[—-]\s+/i, '').replace(/^Cluster\s+/i, '').trim();
}

// Resuelve los verticales del cluster a un array de códigos V#.
function clusterVerticals(cl) {
  if (Array.isArray(cl.verticales)) return cl.verticales.filter(v => /^V\d+$/.test(v));
  if (typeof cl.verticales === 'string') return (cl.verticales.match(/V\d+/g) || []);
  return [];
}

export function buildClusters(attempt) {
  attempt = attempt || 0;
  if (!(APP.CLUSTERS.length > 0 && APP.ACTORS.length > 0 && APP.actorMap.size > 0)) {
    if (attempt < 10) setTimeout(() => buildClusters(attempt + 1), 300);
    return;
  }
  const listEl = document.getElementById('cl-list');
  const detailEl = document.getElementById('cl-detail');
  if (!listEl || !detailEl) return;
  try {
    listEl.innerHTML = APP.CLUSTERS.map((cl, i) => {
      const vCodes = clusterVerticals(cl);
      const firstV = vCodes[0] || 'V1';
      const color = (VX[firstV] || VX.V1).color;
      const shortName = cleanName(cl);
      const actorCount = (cl.actor_ids || []).filter(id => APP.actorMap.has(id)).length;
      const chips = vCodes.map(vc => `<span class="cl-list-chip" style="border-color:${(VX[vc] || VX.V1).color}55;color:${(VX[vc] || VX.V1).color}">${vc}</span>`).join('');
      return `<div class="cl-list-item" data-ci="${i}"><div class="cl-list-name">${shortName}</div><div class="cl-list-meta">${actorCount} actores · cluster ${cl.num || i + 1}</div><div class="cl-list-chips">${chips}</div></div>`;
    }).join('');
    listEl.querySelectorAll('.cl-list-item').forEach(item => {
      item.addEventListener('click', () => {
        listEl.querySelectorAll('.cl-list-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        renderClusterDetail(parseInt(item.dataset.ci, 10));
      });
    });
    detailEl.onclick = e => {
      const pill = e.target.closest('[data-aid]');
      if (!pill) return;
      const actor = APP.actorMap.get(pill.dataset.aid);
      if (actor) openPanel(actor, 'cluster-panel');
    };
    if (!APP._clustersBuilt) {
      APP._clustersBuilt = true;
      const first = listEl.querySelector('.cl-list-item');
      if (first) { first.classList.add('active'); renderClusterDetail(0); }
    } else {
      const active = listEl.querySelector('.cl-list-item.active');
      if (!active) { const first = listEl.querySelector('.cl-list-item'); if (first) { first.classList.add('active'); renderClusterDetail(0); } }
    }
  } catch(err) {
    console.error('buildClusters error:', err);
    showViewError('view-clusters', buildClusters);
  }
}

export function renderClusterDetail(clIdx) {
  const cl = APP.CLUSTERS[clIdx];
  const detailEl = document.getElementById('cl-detail');
  if (!cl || !detailEl) return;
  const vCodes = clusterVerticals(cl);
  const firstV = vCodes[0] || 'V1';
  const color = (VX[firstV] || VX.V1).color;
  const rgb = hexToRgb(color);

  // Actor central: A-### o vacío
  const centralActor = cl.actor_central ? APP.actorMap.get(cl.actor_central) : null;
  const centralBlock = centralActor
    ? `<div class="cl-detail-puente"><span style="color:${color}">●</span>&nbsp; Actor central: <span data-aid="${centralActor.id}" style="color:${color};cursor:pointer;border-bottom:1px dashed ${color}66">${centralActor.label}</span></div>`
    : (cl.actor_central
        ? `<div class="cl-detail-puente"><span style="color:${color}">●</span>&nbsp; Actor central: <span style="color:${color}">${cl.actor_central}</span></div>`
        : '');

  // POI principal (texto libre, no vinculado a actor)
  const poiBlock = cl.poi_principal
    ? `<div class="cl-detail-puente" style="margin-top:6px"><span style="color:${color}">●</span>&nbsp; POI principal: <span style="color:var(--text)">${cl.poi_principal}</span></div>`
    : '';

  // Conexiones internas: texto plano (puede traer saltos de línea o '|')
  const conexRaw = (cl.conexiones || '').trim();
  let conexHtml = '';
  if (conexRaw) {
    // Si trae '|' o saltos de línea, fragmentamos. Si no, mostramos como bloque.
    const lines = conexRaw.split(/\s*\|\s*|\n+/).map(s => s.trim()).filter(Boolean);
    if (lines.length > 1) {
      conexHtml = lines.map(c =>
        `<div class="cl-detail-conn"><span class="cl-detail-conn-arrow" style="color:${color}">→</span><span>${c}</span></div>`
      ).join('');
    } else {
      conexHtml = `<div class="cl-detail-control" style="border-left-color:${color};background:rgba(${rgb},0.04);margin-bottom:18px">${conexRaw}</div>`;
    }
  }

  // Insight ejecutivo: bloque destacado
  const insightBlock = cl.insight
    ? `<div class="cl-detail-sec">Insight ejecutivo</div>
       <div class="cl-detail-control" style="border-left-color:${color};background:rgba(${rgb},0.04)">${cl.insight}</div>`
    : '';

  // Hueco accionable: bloque destacado en tono distinto
  const huecoBlock = cl.hueco
    ? `<div class="cl-detail-sec" style="margin-top:18px">Hueco accionable</div>
       <div class="cl-detail-control" style="border-left-color:#ff4d6d;background:rgba(255,77,109,0.05);color:var(--text-muted)">${cl.hueco}</div>`
    : '';

  // Pills de actores miembros
  const pillsHtml = (cl.actor_ids || []).map(id => {
    const a = APP.actorMap.get(id);
    if (!a) return `<span class="cl-detail-pill" style="border-color:#33333355;color:var(--text-dim);opacity:0.5" title="ID no resuelto">${id}</span>`;
    const ac = (VX[a.vertical] || VX.V1).color;
    return `<span data-aid="${id}" class="cl-detail-pill" style="border-color:${ac}44;color:${ac}" onmouseenter="this.style.background='${ac}15'" onmouseleave="this.style.background=''">${a.label}</span>`;
  }).join('');

  const headerLabel = cl.header || `CLUSTER ${cl.num || clIdx + 1}`;
  const vertLabel = vCodes.length ? vCodes.join(' · ') : '';
  const titleLabel = cleanName(cl);

  detailEl.innerHTML = `
    <div class="cl-detail-header">
      <div class="cl-detail-code">${headerLabel}${vertLabel ? '  ·  ' + vertLabel : ''}</div>
      <div class="cl-detail-title" style="color:${color}">${titleLabel}</div>
      ${centralBlock}
      ${poiBlock}
    </div>
    ${insightBlock}
    ${huecoBlock}
    ${conexHtml ? `<div class="cl-detail-sec" style="margin-top:18px">Conexiones internas clave</div>${lines_wrapper_if_needed(conexHtml)}` : ''}
    <div class="cl-detail-sec" style="margin-top:18px">Actores (${(cl.actor_ids || []).length})</div>
    <div class="cl-detail-pills">${pillsHtml}</div>
  `;
}

// Pequeño helper para no envolver dos veces si conexHtml ya viene como bloque control.
function lines_wrapper_if_needed(html) {
  if (html.indexOf('cl-detail-control') === 0 || html.startsWith('<div class="cl-detail-control"')) {
    return html;
  }
  return `<div style="margin-bottom:8px">${html}</div>`;
}