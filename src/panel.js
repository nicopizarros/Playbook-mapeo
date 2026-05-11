import { APP, VX, RIESGO_DEFAULT } from './state.js';

function fmtPct(n) {
  if (n === null || n === undefined || typeof n !== 'number') return null;
  return (n * 100).toFixed(0) + '%';
}

function shortTipo(t) {
  if (!t) return '';
  return t.split('(')[0].trim();
}

export function openPanel(actor, pid) {
  const vc = VX[actor.vertical] || VX.V1;
  const panel = document.getElementById(pid);
  if (!panel) return;
  const px = pid === 'net-panel' ? 'np' : pid === 'idx-panel' ? 'ip' : pid === 'cluster-panel' ? 'cp' : 'bp';

  const idVertTag = actor.id_vertical ? `<span style="color:var(--text-dim);margin-left:8px;font-size:7px">· ${actor.id_vertical}</span>` : '';
  document.getElementById(px + '-vt').innerHTML = `<span style="color:${vc.color}">${actor.vertical} · ${vc.label}</span>${idVertTag}`;
  document.getElementById(px + '-n').textContent = actor.label;
  document.getElementById(px + '-r').textContent = actor.role;

  const bc = actor.certeza === 'VERIFICADO' ? 'bv' : actor.certeza === 'FUENTE UNICA' ? 'bs' : 'bi';
  const tierColor = vc.color;
  const tierLabel = ['', 'DOMINANTE', 'RELEVANTE', 'ESPECIALIZADO'][actor.tier] || '';
  const tierDots = [1, 2, 3].map(i =>
    `<div style="width:${20 + i * 4}px;height:3px;border-radius:1px;background:${i <= actor.tier ? tierColor : 'rgba(255,255,255,0.08)'}"></div>`
  ).join('');

  const conns = (actor.conexiones || []).map(cv =>
    `<span class="ap-conn" style="border-color:${VX[cv]?.color || '#444'}33;color:${VX[cv]?.color || '#888'}" onclick="filterV('${cv}')">${cv} · ${VX[cv]?.label || cv}</span>`
  ).join('');

  // POI
  const poiData = APP.POI[actor.id];
  const poiHtml = poiData?.poi?.length
    ? poiData.poi.map(p => {
        const tierTag = p.tier ? `<span style="font-family:var(--mono);font-size:6px;color:var(--text-dim);letter-spacing:0.1em;margin-left:6px">${p.tier}</span>` : '';
        return `<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><div style="width:26px;height:26px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:var(--mono);font-size:8px;color:${vc.color}">${p.n.split(' ').map(w => w[0]).slice(0, 2).join('')}</div><div style="flex:1"><div style="font-family:var(--sans);font-size:11px;color:var(--text);font-weight:500">${p.n}${tierTag}</div><div style="font-family:var(--mono);font-size:8px;color:var(--text-muted);letter-spacing:0.06em;margin-top:2px">${p.r}</div></div></div>`;
      }).join('')
    : '<div style="font-family:var(--mono);font-size:8px;color:var(--text-dim)">Sin POI registrados para este actor</div>';
  const riesgoTxt = poiData?.riesgo || actor.nota_flag || RIESGO_DEFAULT;

  // Edges con metadata: EDGES_RAW son objetos con tipo, descripcion, nivel, etc.
  const dirEdges = APP.EDGES_RAW.filter(e => e.source === actor.id || e.target === actor.id);
  const edgeCnt = dirEdges.length;
  const topEdges = dirEdges.slice(0, 6).map(e => {
    const otherId = e.source === actor.id ? e.target : e.source;
    const arrow = e.source === actor.id ? '→' : '←';
    const other = APP.actorMap.get(otherId);
    if (!other) return '';
    const tipoTag = e.tipo ? `<span style="font-family:var(--mono);font-size:6px;color:var(--text-dim);letter-spacing:0.1em;margin-left:6px">${e.tipo}</span>` : '';
    return `<div style="font-family:var(--mono);font-size:8px;color:var(--text-dim);margin-bottom:3px"><span style="color:${vc.color}">${arrow}</span> ${other.label}${tipoTag}</div>`;
  }).join('');
  const moreEdges = dirEdges.length > 6
    ? `<div style="font-family:var(--mono);font-size:7px;color:${vc.color};margin-top:4px">+${dirEdges.length - 6} más</div>`
    : '';

  // Amplitud funcional (scores AF v1.00.31)
  const scoreCompPct = fmtPct(actor.score_compuesto);
  const scoreAmpPct  = fmtPct(actor.score_amplitud);
  const scoreProfPct = fmtPct(actor.score_profundidad);
  const tipoCap      = shortTipo(actor.tipo_capacidad);
  const afBlock = (scoreCompPct || tipoCap) ? `
    <div>
      <div class="ap-bt">Amplitud funcional</div>
      <div class="ap-kv">
        ${scoreCompPct ? `<div class="ap-kvi"><div class="ap-kv-l">Score Compuesto</div><div class="ap-kv-v" style="color:${vc.color};font-size:11px">${scoreCompPct}</div></div>` : ''}
        ${tipoCap ? `<div class="ap-kvi"><div class="ap-kv-l">Tipo de capacidad</div><div class="ap-kv-v">${tipoCap}</div></div>` : ''}
        ${scoreAmpPct ? `<div class="ap-kvi"><div class="ap-kv-l">Amplitud</div><div class="ap-kv-v">${scoreAmpPct}</div></div>` : ''}
        ${scoreProfPct ? `<div class="ap-kvi"><div class="ap-kv-l">Profundidad</div><div class="ap-kv-v">${scoreProfPct}</div></div>` : ''}
      </div>
    </div>` : '';

  document.getElementById(px + '-b').innerHTML = `
    <div>
      <div class="ap-bt">Clasificacion</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
        <span class="ap-badge ${bc}">● ${actor.certeza}</span>
        <span style="font-family:var(--mono);font-size:7px;letter-spacing:0.14em;color:${tierColor};text-transform:uppercase;border:1px solid ${tierColor}44;padding:2px 6px">TIER ${actor.tier} · ${tierLabel}</span>
        ${actor.watchlist ? `<span style="font-family:var(--mono);font-size:7px;letter-spacing:0.12em;color:var(--v9);border:1px solid var(--v9);padding:2px 6px">WATCHLIST</span>` : ''}
      </div>
      <div style="display:flex;gap:3px;align-items:flex-end">${tierDots}</div>
    </div>
    <div>
      <div class="ap-bt">Datos clave</div>
      <div class="ap-kv">
        <div class="ap-kvi"><div class="ap-kv-l">Ciudad / Sede</div><div class="ap-kv-v">${actor.ciudad || '—'}</div></div>
        <div class="ap-kvi"><div class="ap-kv-l">Pais de origen</div><div class="ap-kv-v">${actor.pais || '—'}</div></div>
        <div class="ap-kvi"><div class="ap-kv-l">Vertical primaria</div><div class="ap-kv-v" style="color:${vc.color}">${actor.vertical} · ${vc.label}</div></div>
        ${actor.id_vertical ? `<div class="ap-kvi"><div class="ap-kv-l">ID Vertical</div><div class="ap-kv-v">${actor.id_vertical}</div></div>` : ''}
      </div>
    </div>
    ${afBlock}
    <div>
      <div class="ap-bt">Senal de inteligencia</div>
      <div class="ap-sig" style="border-left-color:${vc.color}">${actor.signal || actor.por_que || '—'}</div>
    </div>
    <div>
      <div class="ap-bt">People of Interest</div>
      ${poiHtml}
    </div>
    <div>
      <div class="ap-bt">Riesgo / Tension</div>
      <div style="padding:10px 12px;background:rgba(255,77,109,0.06);border-left:2px solid rgba(255,77,109,0.4);font-family:var(--sans);font-size:11px;color:var(--text-muted);line-height:1.6;font-weight:300">${riesgoTxt}</div>
    </div>
    <div>
      <div class="ap-bt">Conexiones verticales</div>
      <div class="ap-conns">${conns || '<span style="font-family:var(--mono);font-size:8px;color:var(--text-dim)">Sin conexiones registradas</span>'}</div>
    </div>
    <div>
      <div class="ap-bt">Relaciones en el mapa</div>
      <div style="font-family:var(--mono);font-size:9px;color:${vc.color};margin-bottom:8px">${edgeCnt} relaciones directas documentadas</div>
      ${topEdges}${moreEdges}
    </div>`;
  panel.classList.add('open');
}

export function closeP(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
