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
      const vCodes = (cl.verticales || '').match(/V\d+/g) || ['V1'];
      const firstV = vCodes[0];
      const color = (VX[firstV] || VX.V1).color;
      const shortName = (cl.nombre || '').replace(/^Cluster /, '').split('(')[0].trim();
      const actorCount = (cl.actor_ids || []).filter(id => APP.actorMap.has(id)).length;
      const chips = vCodes.map(vc => `<span class="cl-list-chip" style="border-color:${(VX[vc] || VX.V1).color}55;color:${(VX[vc] || VX.V1).color}">${vc}</span>`).join('');
      return `<div class="cl-list-item" data-ci="${i}"><div class="cl-list-name">${shortName}</div><div class="cl-list-meta">${actorCount} actores</div><div class="cl-list-chips">${chips}</div></div>`;
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
  const vCodes = (cl.verticales || '').match(/V\d+/g) || ['V1'];
  const firstV = vCodes[0];
  const color = (VX[firstV] || VX.V1).color;
  const rgb = hexToRgb(color);
  const conexArr = (cl.conexiones || '').split('|').map(s => s.trim()).filter(Boolean);
  const conexHtml = conexArr.map(c =>
    `<div class="cl-detail-conn"><span class="cl-detail-conn-arrow" style="color:${color}">→</span><span>${c}</span></div>`
  ).join('');
  const pillsHtml = (cl.actor_ids || []).map(id => {
    const a = APP.actorMap.get(id); if (!a) return '';
    const ac = (VX[a.vertical] || VX.V1).color;
    return `<span data-aid="${id}" class="cl-detail-pill" style="border-color:${ac}44;color:${ac}" onmouseenter="this.style.background='${ac}15'" onmouseleave="this.style.background=''">${a.label}</span>`;
  }).join('');
  detailEl.innerHTML = `
    <div class="cl-detail-header">
      <div class="cl-detail-code">${clIdx + 1} / ${APP.CLUSTERS.length} &nbsp;·&nbsp; ${cl.verticales || ''}</div>
      <div class="cl-detail-title" style="color:${color}">${cl.nombre || ''}</div>
      <div class="cl-detail-puente"><span style="color:${color}">●</span>&nbsp; Nodo de poder: <span style="color:${color}">${cl.puente || '—'}</span></div>
    </div>
    <div class="cl-detail-sec">Control</div>
    <div class="cl-detail-control" style="border-left-color:${color};background:rgba(${rgb},0.04)">${cl.control || ''}</div>
    ${conexArr.length ? `<div class="cl-detail-sec">Conexiones documentadas</div><div style="margin-bottom:20px">${conexHtml}</div>` : ''}
    <div class="cl-detail-sec">Actores (${(cl.actor_ids || []).length})</div>
    <div class="cl-detail-pills">${pillsHtml}</div>
  `;
}
