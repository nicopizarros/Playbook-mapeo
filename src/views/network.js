import { APP, VX } from '../state.js';
import { openPanel } from '../panel.js';
import { buildMatrix } from './matrix.js';

let minimapCtx, minimapW = 120, minimapH = 80;

// Thresholds for red-mode dimming based on score_compuesto (0–1)
const SCORE_DIM_FULL    = 0.35;  // >= full opacity
const SCORE_DIM_PARTIAL = 0.15;  // >= mid dim; below this → ghost

function getRedModeNodeOpacity(d) {
  if (APP.netLayout !== 'red') return 1;
  const sc = d.score_compuesto || 0;
  if (sc >= SCORE_DIM_FULL)    return 0.88;
  if (sc >= SCORE_DIM_PARTIAL) return 0.22;
  return 0.06;
}

// Fill color driven by score_profundidad (depth of engagement)
function scoreToFillColor(d) {
  const base = VX[d.vertical].color;
  const sp = d.score_profundidad || 1;
  if (sp >= 3) return base;
  if (sp >= 2) return base + 'AA';
  return base + '66';
}

// Stroke width driven by score_amplitud (breadth across verticals)
function scoreToStrokeWidth(d) {
  const sa = d.score_amplitud || 1;
  return 0.3 + sa * 0.4;  // sa=1 → 0.7px, sa=4 → 1.9px
}

export function initNet() {
  const _netLoadOv = document.getElementById('net-loading-overlay');
  if (_netLoadOv) { _netLoadOv.classList.remove('hidden'); _netLoadOv.innerHTML = '<div class="net-load-dot"></div><div class="net-load-txt">CARGANDO RED...</div>'; }
  let _netPollIv = null;
  const _hideNetLoad = () => { if (_netLoadOv) _netLoadOv.classList.add('hidden'); if (_netPollIv) { clearInterval(_netPollIv); _netPollIv = null; } };
  if (APP.ACTORS.length === 0) { _hideNetLoad(); return; }
  _netPollIv = setInterval(() => { if (document.querySelectorAll('#net-svg .node-circle').length > 0) _hideNetLoad(); }, 500);
  try {
    const wrap = document.getElementById('net-svg-wrap');
    const W = wrap.clientWidth, H = wrap.clientHeight;
    APP.svgSel = d3.select('#net-svg').attr('viewBox', [0, 0, W, H]);
    const defs = APP.svgSel.append('defs');
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '4').attr('result', 'blur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    const radGrad = defs.append('radialGradient').attr('id', 'radBg').attr('cx', '50%').attr('cy', '50%').attr('r', '55%');
    radGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(69,216,2,0.025)');
    radGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,0,0,0)');
    APP.svgSel.append('rect').attr('width', W).attr('height', H).attr('fill', 'url(#radBg)');
    let currentScale = 1;
    APP.zoomBehavior = d3.zoom().scaleExtent([0.1, 5]).on('zoom', e => {
      APP.gMain.attr('transform', e.transform);
      currentScale = e.transform.k;
      const badge = document.getElementById('zoom-badge');
      if (badge) badge.textContent = Math.round(currentScale * 100) + '%';
      updateLOD(currentScale);
      updateMinimap(e.transform);
    });
    APP.svgSel.call(APP.zoomBehavior);
    APP.gMain = APP.svgSel.append('g');

    APP.nodeClusterMap = new Map();
    APP.nodeClusterLabel = new Map();
    APP.CLUSTERS.forEach((cl, ci) => {
      (cl.actor_ids || []).forEach(id => APP.nodeClusterMap.set(id, ci));
      const rawName = cl.nombre || cl.header || '';
      const shortName = rawName.replace(/^CLUSTER\s+\d+\s+[—-]\s+/i, '').replace(/^Cluster\s+/i, '').split('(')[0].trim();
      (cl.actor_ids || []).forEach(id => APP.nodeClusterLabel.set(id, shortName));
    });

    const clusterRingR = Math.min(W, H) * 0.13;
    const clCols = Math.min(4, Math.max(1, APP.CLUSTERS.length));
    const clRows = Math.ceil(APP.CLUSTERS.length / clCols);
    const clPadX = W * 0.12, clPadY = H * 0.15;
    const clCellW = (W - clPadX * 2) / clCols;
    const clCellH = clRows > 1 ? (H - clPadY * 2) / (clRows - 1) : 0;
    const clLastRowCount = APP.CLUSTERS.length % clCols || clCols;
    const clLastRowOffset = (clCols - clLastRowCount) / 2;
    APP.clusterCentroids = APP.CLUSTERS.map((cl, i) => {
      const col = i % clCols, row = Math.floor(i / clCols);
      const isLast = row === clRows - 1 && clLastRowCount !== clCols;
      const cx = clPadX + (col + (isLast ? clLastRowOffset : 0) + 0.5) * clCellW;
      const rawName = cl.nombre || cl.header || ('Cluster ' + (cl.num || (i + 1)));
      const verts = Array.isArray(cl.verticales) ? cl.verticales.join(' · ') : (cl.verticales || '');
      return { x: cx, y: clRows > 1 ? clPadY + row * clCellH : H / 2, nombre: rawName, actor_ids: cl.actor_ids || [], verticales: verts };
    });
    APP.gClusterBg = APP.gMain.append('g').attr('class', 'cluster-bg-g').attr('opacity', 0).attr('pointer-events', 'none');
    APP.clusterCentroids.forEach(cc => {
      const vMatch = (cc.verticales || '').match(/V\d+/);
      const firstV = vMatch ? vMatch[0] : 'V1';
      const color = VX[firstV] ? VX[firstV].color : '#45d802';
      APP.gClusterBg.append('circle').attr('class', 'cluster-ring').attr('cx', cc.x).attr('cy', cc.y).attr('r', clusterRingR).attr('fill', color).attr('fill-opacity', 0.04).attr('stroke', color).attr('stroke-width', 1).attr('stroke-opacity', 0.28);
      const clLblText = cc.nombre.replace(/^CLUSTER\s+\d+\s+[—-]\s+/i, '').replace(/^Cluster /, '');
      const clLblShort = clLblText.length > 42 ? clLblText.slice(0, 40) + '…' : clLblText;
      const clLblEl = APP.gClusterBg.append('text').attr('class', 'cluster-lbl').attr('x', cc.x).attr('y', cc.y - clusterRingR - 8).attr('text-anchor', 'middle').attr('font-family', 'Space Mono, monospace').attr('font-size', '7px').attr('letter-spacing', '0.14em').attr('fill', color).attr('fill-opacity', 0.75).text(clLblShort);
      clLblEl.append('title').text(cc.nombre);
    });

    APP.gVLaneBg = APP.gMain.append('g').attr('class', 'vzones-bg-g').attr('opacity', 0).attr('pointer-events', 'none');
    const ZONE_ORDER = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9'];
    (function buildZones(bW, bH) {
      const zPadX = bW * 0.06, zPadY = bH * 0.06;
      const zoneW = (bW - zPadX * 2) / 3, zoneH = (bH - zPadY * 2) / 3;
      ZONE_ORDER.forEach((v, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const zx = zPadX + col * zoneW, zy = zPadY + row * zoneH;
        const color = VX[v].color;
        APP.gVLaneBg.append('rect').attr('class', 'v-zone-bg').attr('data-vi', i).attr('x', zx + 5).attr('y', zy + 5).attr('width', zoneW - 10).attr('height', zoneH - 10).attr('rx', 2).attr('fill', color).attr('fill-opacity', 0.03).attr('stroke', color).attr('stroke-width', 0.5).attr('stroke-opacity', 0.18);
        APP.gVLaneBg.append('text').attr('class', 'v-zone-code').attr('data-vi', i).attr('x', zx + 14).attr('y', zy + 28).attr('font-family', 'Space Mono, monospace').attr('font-size', '15px').attr('font-weight', '700').attr('letter-spacing', '0.08em').attr('fill', color).attr('fill-opacity', 0.28).text(v);
        APP.gVLaneBg.append('text').attr('class', 'v-zone-name').attr('data-vi', i).attr('x', zx + 14).attr('y', zy + 44).attr('font-family', 'Space Mono, monospace').attr('font-size', '8px').attr('letter-spacing', '0.1em').attr('fill', color).attr('fill-opacity', 0.2).text(VX[v].label);
      });
    })(W, H);

    const vKeys = Object.keys(VX);
    const R = Math.min(W, H) * 0.31, cx = W / 2, cy = H / 2;
    APP.netNodeData = APP.ACTORS.map(a => {
      const vi = vKeys.indexOf(a.vertical);
      const ang = (vi / vKeys.length) * Math.PI * 2 - Math.PI / 2;
      const jitter = (Math.random() - .5) * 60;
      return { ...a, x: cx + R * Math.cos(ang) + jitter, y: cy + R * Math.sin(ang) + jitter, r: 3.5 + (a.score_compuesto || 0) * 11 };
    });
    const edgeData = APP.EDGES.map(e => ({
      source: APP.netNodeData.find(n => n.id === e.source),
      target: APP.netNodeData.find(n => n.id === e.target),
      tipo: e.tipo,
      nivel: e.nivel,
      direccion: e.direccion,
      cross: e.cross,
      id_rel: e.id,
    })).filter(e => e.source && e.target);

    APP.linkSel = APP.gMain.append('g').attr('class', 'links').selectAll('line').data(edgeData).enter().append('line').attr('stroke', 'rgba(255,255,255,0.12)').attr('stroke-width', 0.7).attr('opacity', 1);

    APP.netNodeGroups = APP.gMain.append('g').attr('class', 'nodes').selectAll('g').data(APP.netNodeData).enter().append('g').attr('class', 'node-g').style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        APP.hoveredId = d.id; updateHoverState();
        const tt = document.getElementById('net-tt');
        const rect = document.getElementById('net-svg-wrap').getBoundingClientRect();
        tt.classList.add('on');
        const ttW = 244;
        const leftCand = event.clientX - rect.left + 18;
        tt.style.left = Math.min(leftCand, rect.width - ttW - 4) + 'px';
        tt.style.top = (event.clientY - rect.top - 10) + 'px';
        document.getElementById('tt-n').textContent = d.label;
        document.getElementById('tt-v').style.color = VX[d.vertical].color;
        document.getElementById('tt-v').textContent = d.vertical + ' · ' + VX[d.vertical].label + ' · TIER ' + d.tier;
        document.getElementById('tt-r').textContent = d.role;
        const ttCl = document.getElementById('tt-cluster');
        if (ttCl) { const clName = APP.nodeClusterLabel.get(d.id); if (clName) { ttCl.textContent = '● ' + clName; ttCl.style.display = 'block'; } else { ttCl.style.display = 'none'; } }
      })
      .on('mousemove', function(event) {
        const rect = document.getElementById('net-svg-wrap').getBoundingClientRect();
        const tt = document.getElementById('net-tt');
        const ttW = 244;
        const leftCand = event.clientX - rect.left + 18;
        tt.style.left = Math.min(leftCand, rect.width - ttW - 4) + 'px';
        tt.style.top = (event.clientY - rect.top - 10) + 'px';
      })
      .on('mouseleave', function() { APP.hoveredId = null; updateHoverState(); document.getElementById('net-tt').classList.remove('on'); })
      .on('click', function(event, d) {
        event.stopPropagation();
        if (APP.netLayout === 'clusters') {
          const ci = APP.nodeClusterMap.get(d.id);
          APP.selectedCluster = (ci !== undefined && APP.selectedCluster === ci) ? null : ci !== undefined ? ci : null;
          updateClusterHighlight(); updateHoverState();
        }
        openPanel(d, 'net-panel');
      })
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) APP.simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) APP.simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    APP.netNodeGroups.filter(d => (d.score_compuesto || 0) >= 0.5).append('circle').attr('class', 'node-glow').attr('r', d => d.r * 2.2).attr('fill', d => VX[d.vertical].color).attr('opacity', d => (d.score_compuesto || 0) * 0.14).attr('filter', 'url(#glow)');
    APP.nodeSel = APP.netNodeGroups.append('circle').attr('class', 'node-circle').attr('r', d => d.r).attr('fill', d => scoreToFillColor(d)).attr('stroke', d => VX[d.vertical].color).attr('stroke-width', d => scoreToStrokeWidth(d)).attr('opacity', d => getRedModeNodeOpacity(d));
    APP.labelSel = APP.netNodeGroups.append('text').attr('class', 'node-label').attr('dy', d => d.r + 12).attr('text-anchor', 'middle').attr('font-family', 'DM Sans, sans-serif').attr('font-size', d => d.tier === 1 ? '9.5px' : '8.5px').attr('fill', d => d.tier === 1 ? VX[d.vertical].color : 'rgba(255,255,255,0.65)').attr('font-weight', d => d.tier === 1 ? 500 : 400).attr('pointer-events', 'none').text(d => d.label).attr('opacity', d => d.tier === 1 ? 0.85 : 0);

    APP.simulation = d3.forceSimulation(APP.netNodeData)
      .force('link', d3.forceLink(edgeData).id(d => d.id).distance(185).strength(0.45))
      .force('charge', d3.forceManyBody().strength(-300).distanceMax(360))
      .force('collision', d3.forceCollide().radius(d => d.r * 1.9).strength(0.7))
      .force('cluster', clusterForce(vKeys, cx, cy, R, 0.04))
      .force('center', d3.forceCenter(cx, cy).strength(0.02))
      .force('x', d3.forceX(cx).strength(0.015))
      .force('y', d3.forceY(cy).strength(0.015))
      .alphaDecay(0.035)
      .velocityDecay(0.55)
      .on('tick', () => {
        APP.linkSel.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        APP.netNodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
      })
      .on('end', () => {
        _hideNetLoad();
        if (APP.netLayout !== 'clusters') return;
        APP.CLUSTERS.forEach((cl, ci) => {
          const cc = APP.clusterCentroids[ci]; if (!cc) return;
          const members = APP.netNodeData.filter(n => APP.nodeClusterMap.get(n.id) === ci);
          if (!members.length) return;
          const maxDist = d3.max(members, n => Math.sqrt((n.x - cc.x) ** 2 + (n.y - cc.y) ** 2));
          const r = Math.max(60, Math.min(160, maxDist + 20));
          APP.gClusterBg.selectAll('.cluster-ring').filter((d, i) => i === ci).transition().duration(600).attr('r', r);
          APP.gClusterBg.selectAll('.cluster-lbl').filter((d, i) => i === ci).transition().duration(600).attr('y', cc.y - r - 8);
        });
      });

    APP.svgSel.on('click', () => {
      APP.hoveredId = null;
      if (APP.selectedCluster !== null) { APP.selectedCluster = null; updateClusterHighlight(); }
      updateHoverState();
    });

    const vPadF = 80, colWF = vKeys.length > 1 ? (W - vPadF * 2) / (vKeys.length - 1) : 0;
    APP.gFixedHeaders = APP.svgSel.append('g').attr('class', 'fixed-headers-g').attr('opacity', 0).attr('pointer-events', 'none');
    vKeys.forEach((v, i) => {
      const fx = vPadF + i * colWF; const color = VX[v].color;
      APP.gFixedHeaders.append('text').attr('class', 'fh-v-hdr').attr('data-vi', i).attr('x', fx).attr('y', 22).attr('text-anchor', 'middle').attr('font-family', 'Space Mono, monospace').attr('font-size', '11px').attr('font-weight', '700').attr('letter-spacing', '0.15em').attr('fill', color).text(v);
      APP.gFixedHeaders.append('text').attr('class', 'fh-v-sub').attr('data-vi', i).attr('x', fx).attr('y', 36).attr('text-anchor', 'middle').attr('font-family', 'Space Mono, monospace').attr('font-size', '8px').attr('letter-spacing', '0.1em').attr('fill', color).attr('opacity', 0.65).text(VX[v].label);
    });
    [['T1 — Dominante', 0.25], ['T2 — Relevante', 0.55], ['T3 — Especializado', 0.80]].forEach(([lbl, frac]) => {
      APP.gFixedHeaders.append('text').attr('class', 'fh-tier-lbl').attr('data-frac', frac).attr('x', 16).attr('y', H * frac).attr('font-family', 'Space Mono, monospace').attr('font-size', '11px').attr('letter-spacing', '0.12em').attr('fill', 'rgba(255,255,255,0.18)').attr('dominant-baseline', 'middle').text(lbl);
    });
    APP.zoomBehavior.on('zoom.headers', e => {
      if (APP.netLayout !== 'verticales' || !APP.gFixedHeaders) return;
      updateFixedHeaders(e.transform, APP.svgSel.node().clientWidth);
    });

    initMinimap();
    initNetResizeObserver();
  } catch(err) {
    console.error('initNet error:', err);
    if (_netPollIv) clearInterval(_netPollIv);
    const ov = document.getElementById('net-loading-overlay');
    if (ov) { ov.classList.remove('hidden'); ov.style.pointerEvents = 'auto'; ov.innerHTML = '<div class="net-error-state"><div style="font-family:var(--mono);font-size:9px;letter-spacing:0.14em;color:var(--text-dim);text-align:center;text-transform:uppercase">RED NO DISPONIBLE — RECARGAR</div><button class="net-error-retry" onclick="location.reload()">↺ REINTENTAR</button></div>'; }
  }
}

export function updateLOD(scale) {
  if (!APP.labelSel) return;
  const wrap = document.getElementById('net-svg-wrap');
  const isMobile = wrap && wrap.clientWidth < 520;
  if (APP.netLayout === 'verticales') {
    if (!APP.hoveredId) {
      if (isMobile) {
        APP.labelSel.attr('opacity', d => d.tier === 1 ? 0.9 : d.tier === 2 ? 0.55 : 0).attr('font-size', d => d.tier === 1 ? '9px' : '8px');
      } else {
        APP.labelSel.attr('opacity', d => d.tier === 1 ? 1 : d.tier === 2 ? 0.75 : 0).attr('font-size', d => d.tier === 1 ? '10px' : d.tier === 2 ? '8.5px' : '7.5px');
      }
    }
    return;
  }
  const t1Thresh = isMobile ? 0.3 : 0.35;
  const t2Thresh = isMobile ? 2.5 : 1.1;
  const t3Thresh = isMobile ? 4.0 : 2.0;
  APP.labelSel.attr('opacity', d => {
    if (APP.hoveredId) return;
    // En modo clusters, los no-miembros quedan invisibles independientemente del zoom.
    if (APP.netLayout === 'clusters' && !APP.nodeClusterMap.has(d.id)) return 0;
    if (d.tier === 1) return scale < t1Thresh ? 0 : Math.min(1, (scale - t1Thresh) * 2.5) * 0.88;
    if (d.tier === 2) return scale < t2Thresh ? 0 : Math.min(0.8, (scale - t2Thresh) * 2.5);
    if (d.tier === 3) return scale < t3Thresh ? 0 : Math.min(0.7, (scale - t3Thresh) * 3);
    return 0;
  }).attr('font-size', d => {
    const base = d.tier === 1 ? 9.5 : 8.5;
    return Math.max(7, Math.min(base, base / Math.max(scale, 0.5))) + 'px';
  });
  d3.selectAll('.node-circle').attr('r', d => {
    const base = d.r;
    if (scale < 0.5) return base * 1.5;
    if (scale < 0.8) return base * 1.15;
    return base;
  });
}

function initMinimap() {
  const mc = document.getElementById('minimap-canvas'); if (!mc) return;
  mc.width = minimapW * 2; mc.height = minimapH * 2;
  mc.style.width = minimapW + 'px'; mc.style.height = minimapH + 'px';
  minimapCtx = mc.getContext('2d');
  APP.simulation.on('tick.minimap', drawMinimap);
}

function drawMinimap() {
  if (!minimapCtx || !APP.simulation) return;
  const ns = APP.simulation.nodes(); if (!ns.length) return;
  const ctx = minimapCtx;
  ctx.clearRect(0, 0, minimapW * 2, minimapH * 2);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  ns.forEach(n => { minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y); });
  const pw = maxX - minX || 1, ph = maxY - minY || 1, pad = 12;
  const sx = (minimapW * 2 - pad * 2) / pw, sy = (minimapH * 2 - pad * 2) / ph, s = Math.min(sx, sy);
  const toMX = x => (x - minX) * s + pad, toMY = y => (y - minY) * s + pad;
  ctx.globalAlpha = 0.15; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.4;
  APP.EDGES.forEach(e => {
    const sa = ns.find(n => n.id === e.source), sb = ns.find(n => n.id === e.target);
    if (!sa || !sb) return;
    ctx.beginPath(); ctx.moveTo(toMX(sa.x), toMY(sa.y)); ctx.lineTo(toMX(sb.x), toMY(sb.y)); ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ns.forEach(n => {
    const sc = n.score_compuesto || 0;
    if (APP.netLayout === 'clusters' && !APP.nodeClusterMap.has(n.id)) {
      ctx.globalAlpha = 0.18;
    } else if (APP.netLayout === 'red') {
      ctx.globalAlpha = sc >= SCORE_DIM_FULL ? 1 : sc >= SCORE_DIM_PARTIAL ? 0.45 : 0.2;
    } else {
      ctx.globalAlpha = 1;
    }
    const vc = VX[n.vertical];
    const r = 1.0 + sc * 2.8;
    ctx.beginPath(); ctx.arc(toMX(n.x), toMY(n.y), r, 0, Math.PI * 2);
    ctx.fillStyle = scoreToFillColor(n); ctx.fill();
  });
  ctx.globalAlpha = 1;
  if (APP.netLayout === 'clusters' && APP.clusterCentroids.length) {
    ctx.globalAlpha = 0.18; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.6;
    APP.clusterCentroids.forEach(cc => { ctx.beginPath(); ctx.arc(toMX(cc.x), toMY(cc.y), 130 * s, 0, Math.PI * 2); ctx.stroke(); });
  } else if (APP.netLayout === 'verticales') {
    const svgEl = document.getElementById('net-svg');
    const mmW = svgEl ? svgEl.clientWidth : 800, mmH = svgEl ? svgEl.clientHeight : 600;
    const zPX = mmW * 0.06, zPY = mmH * 0.06, zW = (mmW - zPX * 2) / 3, zH = (mmH - zPY * 2) / 3;
    ctx.globalAlpha = 0.1; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.5;
    [1, 2].forEach(n => {
      ctx.beginPath(); ctx.moveTo(toMX(zPX + n * zW), toMY(zPY)); ctx.lineTo(toMX(zPX + n * zW), toMY(zPY + 3 * zH)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(toMX(zPX), toMY(zPY + n * zH)); ctx.lineTo(toMX(zPX + 3 * zW), toMY(zPY + n * zH)); ctx.stroke();
    });
  }
  ctx.globalAlpha = 1;
  window._mmScale = s; window._mmMinX = minX; window._mmMinY = minY; window._mmPad = pad;
}

function updateMinimap(transform) {
  drawMinimap();
  const vp = document.getElementById('minimap-viewport'); if (!vp || !window._mmScale) return;
  const s = window._mmScale;
  const svgEl = document.getElementById('net-svg');
  const W = svgEl.clientWidth, H = svgEl.clientHeight;
  const vpW = W / transform.k, vpH = H / transform.k;
  const vpX = -transform.x / transform.k, vpY = -transform.y / transform.k;
  vp.style.left = Math.max(0, ((vpX - window._mmMinX) * s + window._mmPad) / 2) + 'px';
  vp.style.top  = Math.max(0, ((vpY - window._mmMinY) * s + window._mmPad) / 2) + 'px';
  vp.style.width  = Math.min(minimapW, (vpW * s) / 2) + 'px';
  vp.style.height = Math.min(minimapH, (vpH * s) / 2) + 'px';
}

function clusterForce(vKeys, cx, cy, R, strength) {
  return function(alpha) {
    APP.simulation.nodes().forEach(n => {
      const vi = vKeys.indexOf(n.vertical);
      const ang = (vi / vKeys.length) * Math.PI * 2 - Math.PI / 2;
      const tx = cx + R * Math.cos(ang), ty = cy + R * Math.sin(ang);
      n.vx += (tx - n.x) * strength * alpha;
      n.vy += (ty - n.y) * strength * alpha;
    });
  };
}

function updateFixedHeaders(transform, W, H) {
  if (!APP.gFixedHeaders) return;
  const vKeys = Object.keys(VX);
  const vPad = 80, colW = vKeys.length > 1 ? (W - vPad * 2) / (vKeys.length - 1) : 0;
  APP.gFixedHeaders.selectAll('.fh-v-hdr,.fh-v-sub').each(function() {
    const i = +this.getAttribute('data-vi');
    const screenX = transform.applyX(vPad + i * colW);
    d3.select(this).attr('x', screenX);
  });
  if (H !== undefined) {
    APP.gFixedHeaders.selectAll('.fh-tier-lbl').each(function() {
      d3.select(this).attr('y', H * (+this.getAttribute('data-frac')));
    });
  }
}

// En modo clusters, los actores sin centroid (no-miembros de ningun cluster)
// reciben empuje hacia el fondo de la pantalla — donde no estorban al layout principal.
function clusterCentroidForce(strength, fallbackX, fallbackY) {
  return function(alpha) {
    APP.netNodeData.forEach(n => {
      const ci = APP.nodeClusterMap.get(n.id);
      if (ci !== undefined && APP.clusterCentroids[ci]) {
        n.vx += (APP.clusterCentroids[ci].x - n.x) * strength * alpha;
        n.vy += (APP.clusterCentroids[ci].y - n.y) * strength * alpha;
      } else if (fallbackX !== undefined) {
        // Los no-miembros se quedan en una zona "estacionada" abajo, atenuada visualmente.
        n.vx += (fallbackX - n.x) * strength * 0.3 * alpha;
        n.vy += (fallbackY - n.y) * strength * 0.3 * alpha;
      }
    });
  };
}

function clusterBoundForce(W, H) {
  return function() {
    const fallX = W / 2, fallY = H * 0.88;
    APP.netNodeData.forEach(n => {
      const ci = APP.nodeClusterMap.get(n.id);
      let ccx, ccy, maxR;
      if (ci !== undefined && APP.clusterCentroids[ci]) {
        ccx = APP.clusterCentroids[ci].x; ccy = APP.clusterCentroids[ci].y;
        const ring = APP.gClusterBg && APP.gClusterBg.selectAll('.cluster-ring').filter((d, i) => i === ci).attr('r');
        maxR = ring ? +ring : Math.min(W, H) * 0.13;
        maxR = Math.max(60, maxR - 10);
      } else { ccx = fallX; ccy = fallY; maxR = 80; }
      const dx = n.x - ccx, dy = n.y - ccy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxR) { n.x = ccx + (dx / dist) * maxR; n.y = ccy + (dy / dist) * maxR; n.vx *= 0.25; n.vy *= 0.25; }
    });
  };
}

function zoneBoundForce3x3(W, H) {
  const zo = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9'];
  return function() {
    const zPadX = W * 0.06, zPadY = H * 0.06;
    const zoneW = (W - zPadX * 2) / 3, zoneH = (H - zPadY * 2) / 3;
    APP.netNodeData.forEach(n => {
      const idx = zo.indexOf(n.vertical); if (idx < 0) return;
      const col = idx % 3, row = Math.floor(idx / 3);
      const zx1 = zPadX + col * zoneW + 18, zx2 = zPadX + (col + 1) * zoneW - 18;
      const zy1 = zPadY + row * zoneH + 50, zy2 = zPadY + (row + 1) * zoneH - 14;
      if (n.x < zx1) { n.x = zx1; n.vx *= 0.15; }
      if (n.x > zx2) { n.x = zx2; n.vx *= 0.15; }
      if (n.y < zy1) { n.y = zy1; n.vy *= 0.15; }
      if (n.y > zy2) { n.y = zy2; n.vy *= 0.15; }
    });
  };
}

function getBaseEdgeStroke(d) {
  if (APP.netLayout === 'clusters') {
    const sc = APP.nodeClusterMap.get(d.source.id), tc = APP.nodeClusterMap.get(d.target.id);
    if (sc === undefined || tc === undefined) return 'rgba(255,255,255,0.04)';
    if (sc === tc) return 'rgba(255,255,255,0.1)';
    return 'rgba(69,216,2,0.65)';
  }
  return 'rgba(255,255,255,0.12)';
}

function getBaseEdgeOpacity(d) {
  if (APP.netLayout === 'clusters') {
    const sc = APP.nodeClusterMap.get(d.source.id), tc = APP.nodeClusterMap.get(d.target.id);
    // Edges que tocan a un no-miembro: invisible en modo clusters.
    if (sc === undefined || tc === undefined) return 0;
    if (sc === tc) return 0.35;
    return 0.28;
  }
  if (APP.netLayout === 'verticales') return 0;
  // red mode: score-weighted — only high-relevance connections stand out
  const avg = ((d.source.score_compuesto || 0) + (d.target.score_compuesto || 0)) / 2;
  if (avg >= SCORE_DIM_FULL)    return 0.32;
  if (avg >= SCORE_DIM_PARTIAL) return 0.1;
  return 0.03;
}

function getBaseEdgeWidth(d) {
  if (APP.netLayout === 'verticales') return 0;
  if (APP.netLayout === 'clusters') {
    const sc = APP.nodeClusterMap.get(d.source.id), tc = APP.nodeClusterMap.get(d.target.id);
    if (sc === undefined || tc === undefined) return 0;
    if (sc === tc) return 0.5;
    return 1.0;
  }
  return 0.5;
}

function applyModeEdgeStyle() {
  if (!APP.linkSel) return;
  APP.linkSel.transition().duration(300)
    .attr('stroke', d => getBaseEdgeStroke(d))
    .attr('stroke-width', d => getBaseEdgeWidth(d))
    .attr('opacity', d => getBaseEdgeOpacity(d));
}

// En modo clusters, los no-miembros quedan visualmente atenuados y sin glow.
function applyClusterModeNodeOpacity() {
  if (!APP.nodeSel) return;
  APP.nodeSel.transition().duration(300).attr('opacity', d => {
    if (APP.netLayout === 'clusters') return APP.nodeClusterMap.has(d.id) ? 1 : 0.08;
    return getRedModeNodeOpacity(d);
  });
  d3.selectAll('.node-glow').transition().duration(300).attr('opacity', d => {
    if (APP.netLayout === 'clusters') return APP.nodeClusterMap.has(d.id) ? 0.12 : 0;
    if (APP.netLayout === 'red') {
      const sc = d.score_compuesto || 0;
      return sc >= SCORE_DIM_FULL ? 0.12 : sc >= SCORE_DIM_PARTIAL ? 0.06 : 0;
    }
    return 0.08;
  });
  if (APP.labelSel) {
    APP.labelSel.transition().duration(300).attr('opacity', d => {
      if (APP.netLayout === 'clusters' && !APP.nodeClusterMap.has(d.id)) return 0;
      if (APP.netLayout === 'verticales') return d.tier === 1 ? 1 : d.tier === 2 ? 0.75 : 0;
      return d.tier === 1 ? 0.85 : 0;
    });
  }
  // Los no-miembros tampoco deben aceptar pointer events en cluster mode
  if (APP.netNodeGroups) {
    APP.netNodeGroups.style('pointer-events', d => {
      if (APP.netLayout === 'clusters' && !APP.nodeClusterMap.has(d.id)) return 'none';
      return 'auto';
    });
  }
}

function updateClusterCentroids(W, H) {
  const clCols = Math.min(4, Math.max(1, APP.CLUSTERS.length));
  const clRows = Math.ceil(APP.CLUSTERS.length / clCols);
  const clPadX = W * 0.12, clPadY = H * 0.15;
  const clCellW = (W - clPadX * 2) / clCols;
  const clCellH = clRows > 1 ? (H - clPadY * 2) / (clRows - 1) : 0;
  const clLastRowCount = APP.CLUSTERS.length % clCols || clCols;
  const clLastRowOffset = (clCols - clLastRowCount) / 2;
  APP.CLUSTERS.forEach((_, i) => {
    const col = i % clCols, row = Math.floor(i / clCols);
    if (APP.clusterCentroids[i]) {
      const isLast = row === clRows - 1 && clLastRowCount !== clCols;
      APP.clusterCentroids[i].x = clPadX + (col + (isLast ? clLastRowOffset : 0) + 0.5) * clCellW;
      APP.clusterCentroids[i].y = clRows > 1 ? clPadY + row * clCellH : H / 2;
    }
  });
  if (APP.gClusterBg) {
    const rr = Math.min(W, H) * 0.13;
    APP.gClusterBg.selectAll('.cluster-ring').data(APP.clusterCentroids).attr('cx', d => d.x).attr('cy', d => d.y).attr('r', rr);
    APP.gClusterBg.selectAll('.cluster-lbl').data(APP.clusterCentroids).attr('x', d => d.x).attr('y', d => d.y - rr - 8);
  }
}

function updateVLanePositions(W, H) {
  if (!APP.gVLaneBg) return;
  const zPadX = W * 0.06, zPadY = H * 0.06;
  const zoneW = (W - zPadX * 2) / 3, zoneH = (H - zPadY * 2) / 3;
  APP.gVLaneBg.selectAll('.v-zone-bg').each(function() {
    const i = +this.getAttribute('data-vi');
    const col = i % 3, row = Math.floor(i / 3);
    const zx = zPadX + col * zoneW, zy = zPadY + row * zoneH;
    d3.select(this).attr('x', zx + 5).attr('y', zy + 5).attr('width', zoneW - 10).attr('height', zoneH - 10);
  });
  APP.gVLaneBg.selectAll('.v-zone-code').each(function() {
    const i = +this.getAttribute('data-vi');
    const col = i % 3, row = Math.floor(i / 3);
    d3.select(this).attr('x', zPadX + col * zoneW + 14).attr('y', zPadY + row * zoneH + 28);
  });
  APP.gVLaneBg.selectAll('.v-zone-name').each(function() {
    const i = +this.getAttribute('data-vi');
    const col = i % 3, row = Math.floor(i / 3);
    d3.select(this).attr('x', zPadX + col * zoneW + 14).attr('y', zPadY + row * zoneH + 44);
  });
}

function applyLayoutForces(mode, W, H) {
  const vKeys = Object.keys(VX);
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.31;
  APP.simulation
    .force('clusterBound', null).force('laneBound', null).force('cluster', null)
    .force('zoneBound', null)
    .force('x', null).force('y', null)
    .force('charge', d3.forceManyBody().strength(-300).distanceMax(360))
    .force('collision', d3.forceCollide().radius(d => d.r * 1.9).strength(0.7));
  if (mode === 'red') {
    APP.simulation
      .force('cluster', clusterForce(vKeys, cx, cy, R, 0.04))
      .force('center', d3.forceCenter(cx, cy).strength(0.02))
      .force('x', d3.forceX(cx).strength(0.015))
      .force('y', d3.forceY(cy).strength(0.015));
  } else if (mode === 'clusters') {
    updateClusterCentroids(W, H);
    APP.simulation
      .force('charge', d3.forceManyBody().strength(-100).distanceMax(320))
      .force('collision', d3.forceCollide().radius(d => d.r + (d.tier === 1 ? 48 : d.tier === 2 ? 18 : 10)).strength(0.92))
      .force('cluster', clusterCentroidForce(0.35, W / 2, H * 1.4)) // fallbackY fuera de la pantalla
      .force('center', d3.forceCenter(cx, cy).strength(0.01))
      .force('clusterBound', clusterBoundForce(W, H));
  } else if (mode === 'verticales') {
    const zo = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9'];
    updateVLanePositions(W, H);
    const zPadX = W * 0.06, zPadY = H * 0.06;
    const zoneW = (W - zPadX * 2) / 3, zoneH = (H - zPadY * 2) / 3;
    const zCollideR = d => d.tier === 1 ? Math.min(zoneW * 0.1, 28) : d.tier === 2 ? Math.min(zoneW * 0.07, 18) : Math.min(zoneW * 0.05, 12);
    APP.simulation
      .force('charge', d3.forceManyBody().strength(-55).distanceMax(180))
      .force('collision', d3.forceCollide().radius(zCollideR).strength(0.92))
      .force('center', null)
      .force('x', d3.forceX(d => { const idx = zo.indexOf(d.vertical); const col = idx >= 0 ? idx % 3 : 0; return zPadX + (col + 0.5) * zoneW; }).strength(0.82))
      .force('y', d3.forceY(d => { const idx = zo.indexOf(d.vertical); const row = idx >= 0 ? Math.floor(idx / 3) : 0; return zPadY + (row + 0.5) * zoneH; }).strength(0.82))
      .force('zoneBound', zoneBoundForce3x3(W, H));
  }
}

export function updateClusterHighlight() {
  if (!APP.gClusterBg) return;
  APP.gClusterBg.selectAll('.cluster-ring').transition().duration(200)
    .attr('fill-opacity', (d, i) => APP.selectedCluster === null ? 0.04 : i === APP.selectedCluster ? 0.2 : 0.02)
    .attr('stroke-opacity', (d, i) => APP.selectedCluster === null ? 0.28 : i === APP.selectedCluster ? 0.7 : 0.1);
}

export function updateHoverState() {
  if (!APP.linkSel) return;
  const connectedIds = new Set();
  if (APP.hoveredId) { APP.linkSel.each(function(d) { if (d.source.id === APP.hoveredId) connectedIds.add(d.target.id); if (d.target.id === APP.hoveredId) connectedIds.add(d.source.id); }); }
  APP.linkSel
    .attr('stroke', d => { if (!APP.hoveredId) return getBaseEdgeStroke(d); const connected = d.source.id === APP.hoveredId || d.target.id === APP.hoveredId; return connected ? VX[d.source.vertical].color : 'rgba(255,255,255,0.04)'; })
    .attr('stroke-width', d => { if (!APP.hoveredId) return getBaseEdgeWidth(d); return (d.source.id === APP.hoveredId || d.target.id === APP.hoveredId) ? 1.8 : 0.4; })
    .attr('opacity', d => { if (!APP.hoveredId) return getBaseEdgeOpacity(d); return (d.source.id === APP.hoveredId || d.target.id === APP.hoveredId) ? 0.85 : 0.06; });
  d3.selectAll('.node-circle').attr('opacity', function(d) {
    if (!APP.hoveredId) {
      if (APP.netLayout === 'clusters' && !APP.nodeClusterMap.has(d.id)) return 0.08;
      if (APP.selectedCluster !== null && APP.netLayout === 'clusters') return APP.nodeClusterMap.get(d.id) === APP.selectedCluster ? 1 : 0.08;
      return getRedModeNodeOpacity(d);
    }
    if (d.id === APP.hoveredId) return 1;
    return connectedIds.has(d.id) ? 0.9 : 0.12;
  }).attr('r', function(d) {
    const base = d.r;
    if (!APP.hoveredId) return base;
    if (d.id === APP.hoveredId) return base * 1.6;
    return connectedIds.has(d.id) ? base * 1.2 : base;
  });
  d3.selectAll('.node-label').attr('opacity', function(d) {
    if (!APP.hoveredId) {
      if (APP.netLayout === 'clusters' && !APP.nodeClusterMap.has(d.id)) return 0;
      if (APP.selectedCluster !== null && APP.netLayout === 'clusters') return APP.nodeClusterMap.get(d.id) === APP.selectedCluster ? (d.tier === 1 ? 1 : 0.7) : 0;
      if (APP.netLayout === 'verticales') return d.tier === 1 ? 1 : d.tier === 2 ? 0.75 : 0;
      return d.tier === 1 ? 0.85 : 0;
    }
    if (d.id === APP.hoveredId) return 1;
    if (connectedIds.has(d.id)) return 0.85;
    return d.tier === 1 ? 0.15 : 0;
  }).attr('fill', function(d) {
    if (APP.hoveredId && (d.id === APP.hoveredId || connectedIds.has(d.id))) return '#eaeaea';
    return d.tier === 1 ? VX[d.vertical].color : 'rgba(255,255,255,0.65)';
  });
  d3.selectAll('.node-glow').attr('opacity', function(d) {
    if (!APP.hoveredId) {
      if (APP.netLayout === 'clusters' && !APP.nodeClusterMap.has(d.id)) return 0;
      if (APP.netLayout === 'red') {
        const sc = d.score_compuesto || 0;
        return sc >= SCORE_DIM_FULL ? 0.12 : sc >= SCORE_DIM_PARTIAL ? 0.06 : 0;
      }
      return 0.08;
    }
    return d.id === APP.hoveredId ? 0.3 : 0.02;
  });
}

export function applyNetFilter(v) {
  if (!APP.linkSel) return;
  d3.selectAll('.node-circle').transition().duration(300).attr('opacity', d => {
    if (APP.netLayout === 'clusters' && !APP.nodeClusterMap.has(d.id)) return 0.08;
    if (!v) return getRedModeNodeOpacity(d);
    return d.vertical === v ? 1 : 0.06;
  });
  d3.selectAll('.node-label').transition().duration(300).attr('opacity', d => {
    if (APP.netLayout === 'clusters' && !APP.nodeClusterMap.has(d.id)) return 0;
    if (!v) { if (APP.netLayout === 'verticales') return d.tier === 1 ? 1 : d.tier === 2 ? 0.75 : 0; return d.tier === 1 ? 0.85 : 0; }
    return d.vertical === v ? (d.tier === 1 ? 1 : 0.7) : 0;
  });
  d3.selectAll('.node-glow').transition().duration(300).attr('opacity', d => {
    if (APP.netLayout === 'clusters' && !APP.nodeClusterMap.has(d.id)) return 0;
    return !v || d.vertical === v ? 0.1 : 0;
  });
  APP.linkSel.transition().duration(300)
    .attr('opacity', d => !v || d.source.vertical === v || d.target.vertical === v ? getBaseEdgeOpacity(d) : 0.03)
    .attr('stroke-width', d => !v || d.source.vertical === v || d.target.vertical === v ? getBaseEdgeWidth(d) : 0.3);
}

export function setNetLayout(mode) {
  const wrap = document.getElementById('net-svg-wrap');
  APP.netLayout = mode;
  document.querySelectorAll('.net-lb').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nlb-' + mode);
  if (btn) btn.classList.add('active');

  // Matriz mode: swap to scatter-plot overlay — bypasses D3 simulation entirely
  const matrixDiv = document.getElementById('matrix-in-net');
  const netSvgEl = document.getElementById('net-svg');
  if (mode === 'matriz') {
    if (matrixDiv) matrixDiv.style.display = 'block';
    if (netSvgEl) netSvgEl.style.display = 'none';
    buildMatrix();
    return;
  }
  if (matrixDiv) matrixDiv.style.display = 'none';
  if (netSvgEl) netSvgEl.style.display = 'block';

  if (!APP.simulation) return;
  const W = wrap.clientWidth, H = wrap.clientHeight;
  applyLayoutForces(mode, W, H);
  if (APP.gClusterBg) APP.gClusterBg.transition().duration(300).attr('opacity', mode === 'clusters' ? 1 : 0);
  if (APP.gVLaneBg) APP.gVLaneBg.transition().duration(300).attr('opacity', mode === 'verticales' ? 1 : 0);
  applyModeEdgeStyle();
  applyClusterModeNodeOpacity();
  if (mode === 'verticales') {
    if (APP.labelSel) APP.labelSel.transition().duration(300).attr('opacity', d => d.tier === 1 ? 1 : d.tier === 2 ? 0.75 : 0).attr('font-size', d => d.tier === 1 ? '10px' : d.tier === 2 ? '8.5px' : '7.5px');
  } else if (mode === 'red') {
    if (APP.labelSel) APP.labelSel.transition().duration(300).attr('opacity', d => d.tier === 1 ? 0.85 : 0).attr('font-size', d => d.tier === 1 ? '9.5px' : '8.5px');
  }
  applyNetFilter(APP.activeV);
  if (APP.gFixedHeaders) APP.gFixedHeaders.attr('opacity', 0);
  if (APP.selectedCluster !== null) { APP.selectedCluster = null; updateClusterHighlight(); }
  APP.simulation.alpha(0.8).restart();
}

export function netZoom(f) { APP.svgSel.transition().duration(300).call(APP.zoomBehavior.scaleBy, f); }
export function netReset() { APP.svgSel.transition().duration(500).call(APP.zoomBehavior.transform, d3.zoomIdentity); }

function initNetResizeObserver() {
  if (typeof ResizeObserver === 'undefined') return;
  const netWrap = document.getElementById('net-svg-wrap');
  if (!netWrap) return;
  const ro = new ResizeObserver(() => {
    if (!APP.svgSel || !APP.simulation) return;
    const W = netWrap.clientWidth, H = netWrap.clientHeight;
    APP.svgSel.attr('viewBox', [0, 0, W, H]);
    applyLayoutForces(APP.netLayout, W, H);
    if (APP.gFixedHeaders && APP.netLayout === 'verticales') {
      const curT = d3.zoomTransform(APP.svgSel.node());
      updateFixedHeaders(curT, W, H);
    }
    APP.simulation.alpha(0.3).restart();
  });
  ro.observe(netWrap);
}