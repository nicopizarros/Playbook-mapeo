import { APP, VX } from '../state.js';
import { openPanel } from '../panel.js';
import { showViewError } from '../data.js';

export function buildIdx() {
  const chips = document.getElementById('idx-chips');
  Object.entries(VX).forEach(([k, v]) => {
    const c = document.createElement('div');
    c.className = 'idx-chip';
    c.id = 'ic-' + k;
    c.textContent = k + ' · ' + v.label;
    c.onclick = () => {
      APP.idxF = APP.idxF === k ? null : k;
      document.querySelectorAll('.idx-chip').forEach(x => x.classList.remove('on'));
      if (APP.idxF) c.classList.add('on');
      renderIdx();
    };
    chips.appendChild(c);
  });
  renderIdx();
  document.getElementById('idx-body').addEventListener('click', e => {
    if (e.target.closest('.td-signal')) return;
    const row = e.target.closest('tr[data-id]');
    if (row) { const a = APP.actorMap.get(row.dataset.id); if (a) openPanel(a, 'idx-panel'); }
  });
}

export function sortIdx(col) {
  if (APP.sortCol === col) { APP.sortDir *= -1; } else { APP.sortCol = col; APP.sortDir = 1; }
  document.querySelectorAll('.idx-tbl th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    const txt = th.textContent.trim().toLowerCase();
    if ((col === 'label' && txt === 'actor') || (col !== 'label' && txt.startsWith(col.slice(0, 4).toLowerCase()))) {
      th.classList.add(APP.sortDir === 1 ? 'sort-asc' : 'sort-desc');
    }
  });
  renderIdx();
}

export function renderIdx(q = '') {
  try {
    const srch = (q || document.getElementById('srch').value || '').toLowerCase();
    let rows = APP.ACTORS.filter(a => {
      if (APP.idxF && a.vertical !== APP.idxF) return false;
      if (APP.activeV && a.vertical !== APP.activeV) return false;
      if (srch && !a.label.toLowerCase().includes(srch) && !a.role.toLowerCase().includes(srch)) return false;
      return true;
    });
    if (APP.sortCol) {
      rows = [...rows].sort((a, b) => {
        let av = a[APP.sortCol] || '', bv = b[APP.sortCol] || '';
        if (APP.sortCol === 'tier') { av = +av; bv = +bv; }
        return av < bv ? -APP.sortDir : av > bv ? APP.sortDir : 0;
      });
    }
    const cntEl = document.getElementById('idx-cnt');
    if (srch && rows.length > 0) {
      cntEl.innerHTML = `<em class="idx-cnt-srch">${rows.length}</em> resultado${rows.length === 1 ? '' : 's'} para &ldquo;${srch.toUpperCase()}&rdquo;`;
    } else {
      cntEl.textContent = rows.length + ' actores';
    }
    const viewIndex = document.getElementById('view-index');
    const existingBanner = document.getElementById('idx-filter-banner');
    if (existingBanner) existingBanner.remove();
    if (APP.activeV && viewIndex) {
      const vc = VX[APP.activeV];
      const banner = document.createElement('div');
      banner.id = 'idx-filter-banner';
      banner.innerHTML = '<span class="ifb-txt">FILTRO ACTIVO: ' + APP.activeV + ' · ' + vc.label + ' — MOSTRANDO ' + rows.length + ' DE ' + APP.ACTORS.length + ' ACTORES</span><button class="ifb-x" onclick="filterV(\'' + APP.activeV + '\')">✕</button>';
      const idxBar = viewIndex.querySelector('.idx-bar');
      if (idxBar && idxBar.nextSibling) { viewIndex.insertBefore(banner, idxBar.nextSibling); }
      else if (idxBar) { viewIndex.appendChild(banner); }
      else { viewIndex.insertBefore(banner, viewIndex.firstChild); }
    }
    if (rows.length === 0) {
      document.getElementById('idx-body').innerHTML = `<tr><td colspan="7"><div class="idx-empty-state">${srch ? `<em>0 resultados para &ldquo;${srch.toUpperCase()}&rdquo;</em>Prueba con otro termino o elimina los filtros activos` : APP.idxF ? `<em>Sin actores en ${APP.idxF}</em>Selecciona otro vertical o elimina el filtro` : '<em>Sin actores en esta seleccion</em>'}</div></td></tr>`;
    } else {
      document.getElementById('idx-body').innerHTML = rows.map(a => {
        const vc = VX[a.vertical];
        const bc = a.certeza === 'VERIFICADO' ? 'bv' : a.certeza === 'FUENTE UNICA' ? 'bs' : 'bi';
        const dots = [1, 2, 3].map(i => `<div class="td-dot${i <= a.tier ? ' on' : ''}" style="${i <= a.tier ? 'background:' + vc.color : ''}"></div>`).join('');
        const sigId = 'sig-' + a.id;
        return `<tr data-id="${a.id}"><td><span class="td-n">${a.label}</span>${a.watchlist ? `<span style="margin-left:6px;font-family:var(--mono);font-size:6px;letter-spacing:0.12em;padding:1px 4px;border:1px solid var(--v9);color:var(--v9)">WL</span>` : ''}</td><td><span class="td-vp" style="border-color:${vc.color}44;color:${vc.color}">${a.vertical}</span></td><td><div class="td-dots">${dots}</div></td><td>${a.ciudad}</td><td style="color:${vc.color}">${a.valoracion}</td><td><span class="td-bdg ${bc}">${a.certeza.slice(0, 3)}</span></td><td class="td-signal" id="${sigId}" onclick="expandSignal(event,'${sigId}')" title="${a.signal.replace(/"/g, '&quot;')}" style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal;line-height:1.45;font-size:8px;color:var(--text-dim)">${a.signal}</td></tr>`;
      }).join('');
    }
  } catch(err) {
    console.error('renderIdx error:', err);
    showViewError('view-index', renderIdx);
  }
}

export function expandSignal(e, id) {
  e.stopPropagation();
  const el = document.getElementById(id); if (!el) return;
  const isExpanded = el.classList.contains('idx-signal-expanded');
  el.classList.toggle('idx-signal-expanded', !isExpanded);
  if (!isExpanded) { el.style.cssText = 'white-space:normal;line-height:1.55;font-size:8px;color:var(--text-muted);cursor:pointer'; }
  else { el.style.cssText = 'overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal;line-height:1.45;font-size:8px;color:var(--text-dim);cursor:pointer'; }
}
