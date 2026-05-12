import { APP, VX } from '../state.js';
import { openPanel } from '../panel.js';

let mxResizeObserver = null;
let mxZoom = null;

export function buildMatrix() {
  const wrap = document.getElementById('matrix-in-net');
  if (!wrap || !APP.ACTORS.length) return;

  d3.select('#matrix-svg').selectAll('*').remove();

  const W = wrap.clientWidth, H = wrap.clientHeight;
  if (W < 80 || H < 80) return;

  const margin = { top: 64, right: 48, bottom: 76, left: 80 };
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top - margin.bottom;

  const svg = d3.select('#matrix-svg').attr('viewBox', [0, 0, W, H]);

  // Glow filter
  const defs = svg.append('defs');
  const filt = defs.append('filter').attr('id', 'mx-glow')
    .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  filt.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '4').attr('result', 'blur');
  const fm = filt.append('feMerge');
  fm.append('feMergeNode').attr('in', 'blur');
  fm.append('feMergeNode').attr('in', 'SourceGraphic');

  const g = svg.append('g');

  // Zoom + pan — title stays fixed (appended to svg), data group (g) transforms
  mxZoom = d3.zoom().scaleExtent([0.3, 8])
    .on('zoom', e => {
      g.attr('transform', e.transform);
    });
  svg.call(mxZoom).on('dblclick.zoom', null);
  // Seed D3's internal transform with the margin so scaleBy/wheel zoom around the correct origin
  svg.call(mxZoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));

  // Zoom control buttons — reuse network CSS classes
  let ctrl = wrap.querySelector('.mx-zoom-ctrl');
  if (ctrl) ctrl.remove();
  ctrl = document.createElement('div');
  ctrl.className = 'mx-zoom-ctrl net-ctrl-grp';
  ctrl.style.cssText = 'position:absolute;bottom:36px;right:12px;z-index:5';
  ctrl.innerHTML = '<button class="net-cb" id="mxz-in" title="Acercar">+</button><button class="net-cb" id="mxz-out" title="Alejar">−</button><button class="net-cb" style="font-size:9px;letter-spacing:0" id="mxz-rst" title="Reset">⌖</button>';
  wrap.appendChild(ctrl);
  ctrl.querySelector('#mxz-in').addEventListener('click', () => svg.transition().duration(250).call(mxZoom.scaleBy, 1.35));
  ctrl.querySelector('#mxz-out').addEventListener('click', () => svg.transition().duration(250).call(mxZoom.scaleBy, 0.75));
  ctrl.querySelector('#mxz-rst').addEventListener('click', () => svg.transition().duration(400).call(mxZoom.transform, d3.zoomIdentity.translate(margin.left, margin.top)));

  // Scales — use real score ranges to avoid stacking all high-amplitud actors on the right edge
  const amps = APP.ACTORS.map(a => +a.score_amplitud || 0);
  const profs = APP.ACTORS.map(a => +a.score_profundidad || 0);
  const ampExtent = d3.extent(amps);
  const profExtent = d3.extent(profs);
  const ampMin = Math.min(0.5, ampExtent[0] ?? 0.5);
  const ampMax = Math.max(4.5, ampExtent[1] ?? 4.5);
  const profMin = Math.min(0.5, profExtent[0] ?? 0.5);
  const profMax = Math.max(4.0, profExtent[1] ?? 4.0);

  const xSc = d3.scaleLinear().domain([ampMin, ampMax]).range([0, iW]);
  const ySc = d3.scaleLinear().domain([profMin, profMax]).range([iH, 0]); // high at top

  // Quadrant backgrounds (divided at 2.5)
  const midX = xSc((ampMin + ampMax) / 2), midY = ySc((profMin + profMax) / 2);
  const quads = [
    { x: 0,    y: 0,    w: midX,      h: midY,      label: 'ESPECIALISTA',  desc: 'Alta profundidad · baja amplitud',  color: '#7B68EE' },
    { x: midX, y: 0,    w: iW - midX, h: midY,      label: 'DOMINANTE',     desc: 'Alta profundidad · alta amplitud',  color: '#45d802' },
    { x: 0,    y: midY, w: midX,      h: iH - midY, label: 'PERIFÉRICO',    desc: 'Baja profundidad · baja amplitud',  color: '#555' },
    { x: midX, y: midY, w: iW - midX, h: iH - midY, label: 'GENERALISTA',   desc: 'Baja profundidad · alta amplitud',  color: '#E8A838' },
  ];

  quads.forEach(q => {
    g.append('rect')
      .attr('x', q.x).attr('y', q.y).attr('width', q.w).attr('height', q.h)
      .attr('fill', q.color).attr('fill-opacity', 0.035)
      .attr('stroke', q.color).attr('stroke-width', 0.5).attr('stroke-opacity', 0.18);
    g.append('text')
      .attr('x', q.x + q.w / 2).attr('y', q.y + q.h - 14)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Space Mono, monospace').attr('font-size', '9px').attr('letter-spacing', '0.14em')
      .attr('fill', q.color).attr('fill-opacity', 0.4).attr('pointer-events', 'none')
      .text(q.label);
    g.append('text')
      .attr('x', q.x + q.w / 2).attr('y', q.y + q.h - 2)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Sans, sans-serif').attr('font-size', '8px')
      .attr('fill', q.color).attr('fill-opacity', 0.22).attr('pointer-events', 'none')
      .text(q.desc);
  });

  // Divider lines
  g.append('line').attr('x1', midX).attr('y1', 0).attr('x2', midX).attr('y2', iH)
    .attr('stroke', 'rgba(255,255,255,0.1)').attr('stroke-width', 1).attr('stroke-dasharray', '5,4');
  g.append('line').attr('x1', 0).attr('y1', midY).attr('x2', iW).attr('y2', midY)
    .attr('stroke', 'rgba(255,255,255,0.1)').attr('stroke-width', 1).attr('stroke-dasharray', '5,4');

  // Grid lines by quartiles
  const xTicks = d3.range(0, 4).map(i => ampMin + ((ampMax - ampMin) * i) / 3);
  const yTicks = d3.range(0, 4).map(i => profMin + ((profMax - profMin) * i) / 3);

  xTicks.slice(1, -1).forEach(v => {
    g.append('line').attr('x1', xSc(v)).attr('y1', 0).attr('x2', xSc(v)).attr('y2', iH)
      .attr('stroke', 'rgba(255,255,255,0.04)').attr('stroke-width', 0.5);
  });
  yTicks.slice(1, -1).forEach(v => {
    g.append('line').attr('x1', 0).attr('y1', ySc(v)).attr('x2', iW).attr('y2', ySc(v))
      .attr('stroke', 'rgba(255,255,255,0.04)').attr('stroke-width', 0.5);
  });

  // Axes
  const xLabels = ['Focal', 'Dual', 'Multi', 'Ecosistema'];
  const yLabels = ['Superficial', 'Establecido', 'Profundo', 'Estructural'];

  const xAxis = d3.axisBottom(xSc).tickValues(xTicks).tickFormat((d, i) => xLabels[i] || Math.round(d));
  g.append('g').attr('transform', `translate(0,${iH})`).call(xAxis).call(ax => {
    ax.select('.domain').attr('stroke', 'rgba(255,255,255,0.14)');
    ax.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.14)');
    ax.selectAll('.tick text')
      .attr('fill', 'rgba(255,255,255,0.45)').attr('font-family', 'Space Mono, monospace')
      .attr('font-size', '8px').attr('letter-spacing', '0.08em').attr('dy', '1.2em');
  });

  const yAxis = d3.axisLeft(ySc).tickValues(yTicks).tickFormat((d, i) => yLabels[i] || Math.round(d));
  g.append('g').call(yAxis).call(ax => {
    ax.select('.domain').attr('stroke', 'rgba(255,255,255,0.14)');
    ax.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.14)');
    ax.selectAll('.tick text')
      .attr('fill', 'rgba(255,255,255,0.45)').attr('font-family', 'Space Mono, monospace')
      .attr('font-size', '8px').attr('letter-spacing', '0.08em').attr('dx', '-0.4em');
  });

  // Axis titles
  g.append('text').attr('x', iW / 2).attr('y', iH + 58)
    .attr('text-anchor', 'middle').attr('font-family', 'Space Mono, monospace')
    .attr('font-size', '8px').attr('letter-spacing', '0.14em').attr('fill', 'rgba(255,255,255,0.28)')
    .text('AMPLITUD — Verticalidades alcanzadas');

  g.append('text').attr('transform', 'rotate(-90)').attr('x', -iH / 2).attr('y', -62)
    .attr('text-anchor', 'middle').attr('font-family', 'Space Mono, monospace')
    .attr('font-size', '8px').attr('letter-spacing', '0.14em').attr('fill', 'rgba(255,255,255,0.28)')
    .text('PROFUNDIDAD — Penetración sectorial');

  // View title
  svg.append('text').attr('x', W / 2).attr('y', 26)
    .attr('text-anchor', 'middle').attr('font-family', 'Space Mono, monospace')
    .attr('font-size', '10px').attr('letter-spacing', '0.18em').attr('fill', 'rgba(255,255,255,0.45)')
    .text('MATRIZ ESTRATÉGICA DE CAPACIDAD FUNCIONAL');

  svg.append('text').attr('x', W / 2).attr('y', 42)
    .attr('text-anchor', 'middle').attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', '9px').attr('fill', 'rgba(255,255,255,0.22)')
    .text('Tamaño = score compuesto · Color = vertical · Trazo = amplitud');

  // Brand accent (Playbook green corner)
  const accent = svg.append('g').attr('transform', `translate(${W - 96},18)`);
  accent.append('rect').attr('x', 0).attr('y', 0).attr('width', 64).attr('height', 6).attr('fill', 'var(--green)');
  accent.append('rect').attr('x', 58).attr('y', 0).attr('width', 6).attr('height', 34).attr('fill', 'var(--green)');

  // Node data — use force simulation to spread overlapping nodes within their grid cell
  const nodeData = APP.ACTORS.map(a => ({
    ...a,
    r: 3.5 + (a.score_compuesto || 0) * 11,
    // Start at exact axis position; simulation will spread
    x: xSc(a.score_amplitud || 1),
    y: ySc(a.score_profundidad || 1),
  }));

  // Lower strength lets collision win → nodes spread within cell rather than stacking
  const sim = d3.forceSimulation(nodeData)
    .force('x', d3.forceX(d => xSc(d.score_amplitud || 1)).strength(0.48))
    .force('y', d3.forceY(d => ySc(d.score_profundidad || 1)).strength(0.48))
    .force('collision', d3.forceCollide().radius(d => d.r + 4).strength(1).iterations(3))
    .stop();

  for (let i = 0; i < 300; i++) sim.tick();

  // Soft clamp — allow slight overflow so zoom can reach edge nodes
  nodeData.forEach(n => {
    n.x = Math.max(n.r, Math.min(iW - n.r, n.x));
    n.y = Math.max(n.r, Math.min(iH - n.r, n.y));
  });

  // Glow rings for high-score nodes
  g.append('g').selectAll('circle.mx-glow-ring').data(nodeData.filter(d => (d.score_compuesto || 0) >= 0.5))
    .enter().append('circle').attr('class', 'mx-glow-ring')
    .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.r * 2.0)
    .attr('fill', d => VX[d.vertical].color)
    .attr('opacity', d => (d.score_compuesto || 0) * 0.12)
    .attr('filter', 'url(#mx-glow)').attr('pointer-events', 'none');

  // Node groups
  const nodeGs = g.append('g').selectAll('g.mx-node').data(nodeData).enter()
    .append('g').attr('class', 'mx-node')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('mouseenter', function(event, d) {
      showMxTooltip(event, d);
      d3.select(this).select('circle.mx-circle').attr('r', d.r * 1.5);
    })
    .on('mousemove', moveMxTooltip)
    .on('mouseleave', function(event, d) {
      hideMxTooltip();
      d3.select(this).select('circle.mx-circle').attr('r', d.r);
    })
    .on('click', function(event, d) {
      event.stopPropagation();
      openPanel(d, 'mx-panel');
    });

  nodeGs.append('circle').attr('class', 'mx-circle')
    .attr('r', d => d.r)
    .attr('fill', d => mxFillColor(d))
    .attr('stroke', d => VX[d.vertical].color)
    .attr('stroke-width', d => 0.3 + (d.score_amplitud || 1) * 0.4)
    .attr('opacity', d => {
      const sc = d.score_compuesto || 0;
      if (sc >= 0.35) return 0.88;
      if (sc >= 0.15) return 0.45;
      return 0.18;
    });

  // Labels for dominant nodes only
  nodeGs.filter(d => (d.score_compuesto || 0) >= 0.45).append('text')
    .attr('dy', d => d.r + 11)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'DM Sans, sans-serif').attr('font-size', '8px')
    .attr('fill', d => VX[d.vertical].color).attr('fill-opacity', 0.8)
    .attr('pointer-events', 'none')
    .text(d => d.label.length > 18 ? d.label.slice(0, 16) + '…' : d.label);

  // Click on background: close panel
  svg.on('click', () => {
    const p = document.getElementById('mx-panel');
    if (p) p.classList.remove('open');
  });

  // Size legend (bottom-right)
  const legX = iW - 6, legY = 10;
  [[0.2, 'Score 20%'], [0.5, 'Score 50%'], [0.8, 'Score 80%']].forEach(([sc, lbl], i) => {
    const r = 3.5 + sc * 11;
    const lx = legX - (i === 0 ? 70 : i === 1 ? 40 : 10);
    g.append('circle').attr('cx', lx).attr('cy', legY + r).attr('r', r)
      .attr('fill', 'rgba(255,255,255,0.06)').attr('stroke', 'rgba(255,255,255,0.2)').attr('stroke-width', 0.5);
    g.append('text').attr('x', lx).attr('y', legY + r * 2 + 11)
      .attr('text-anchor', 'middle').attr('font-family', 'Space Mono, monospace')
      .attr('font-size', '6.5px').attr('fill', 'rgba(255,255,255,0.28)')
      .text(lbl);
  });

  // ResizeObserver — rebuild on size change
  if (mxResizeObserver) mxResizeObserver.disconnect();
  if (typeof ResizeObserver !== 'undefined') {
    mxResizeObserver = new ResizeObserver(() => {
      if (APP.netLayout === 'matriz') buildMatrix();
    });
    mxResizeObserver.observe(wrap);
  }
}

function mxFillColor(d) {
  const base = VX[d.vertical].color;
  const sp = d.score_profundidad || 1;
  if (sp >= 3) return base;
  if (sp >= 2) return base + 'AA';
  return base + '66';
}

function showMxTooltip(event, d) {
  const tt = document.getElementById('mx-tt');
  const wrap = document.getElementById('matrix-in-net');
  if (!tt || !wrap) return;
  const rect = wrap.getBoundingClientRect();
  tt.classList.add('on');
  const ttW = 244;
  const leftCand = event.clientX - rect.left + 18;
  tt.style.left = Math.min(leftCand, rect.width - ttW - 4) + 'px';
  tt.style.top = (event.clientY - rect.top - 10) + 'px';
  document.getElementById('mxt-n').textContent = d.label;
  const vc = VX[d.vertical];
  document.getElementById('mxt-v').style.color = vc.color;
  document.getElementById('mxt-v').textContent =
    d.vertical + ' · ' + vc.label + ' · ' + Math.round((d.score_compuesto || 0) * 100) + '%';
  document.getElementById('mxt-r').textContent = d.role;
}

function moveMxTooltip(event) {
  const tt = document.getElementById('mx-tt');
  const wrap = document.getElementById('matrix-in-net');
  if (!tt || !wrap) return;
  const rect = wrap.getBoundingClientRect();
  const ttW = 244;
  const leftCand = event.clientX - rect.left + 18;
  tt.style.left = Math.min(leftCand, rect.width - ttW - 4) + 'px';
  tt.style.top = (event.clientY - rect.top - 10) + 'px';
}

function hideMxTooltip() {
  const tt = document.getElementById('mx-tt');
  if (tt) tt.classList.remove('on');
}
