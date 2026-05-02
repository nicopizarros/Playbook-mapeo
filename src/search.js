import { APP } from './state.js';
import { renderIdx } from './views/index.js';
import { updateClusterHighlight, updateHoverState } from './views/network.js';

export function onSearch(q) {
  if (APP.curView === 'index') renderIdx(q);
  if (APP.curView === 'network') applyNetSearch(q);
}

export function applyNetSearch(q) {
  if (!APP.nodeSel) return;
  const term = q.toLowerCase().trim();
  const badge = document.getElementById('srch-count');
  if (!term) {
    if (badge) badge.style.display = 'none';
    if (APP.selectedCluster !== null) { APP.selectedCluster = null; updateClusterHighlight(); }
    d3.selectAll('.node-circle').transition().duration(300).attr('opacity', 1).attr('r', d => d.r);
    d3.selectAll('.node-label').transition().duration(300)
      .attr('opacity', d => d.tier === 1 ? 0.85 : 0)
      .attr('font-size', d => d.tier === 1 ? '9.5px' : '8.5px');
    return;
  }
  const matched = APP.netNodeData.filter(n => n.label.toLowerCase().includes(term));
  if (badge) {
    badge.textContent = matched.length + ' resultado' + (matched.length === 1 ? '' : 's');
    badge.style.display = matched.length ? 'inline' : 'none';
  }
  d3.selectAll('.node-circle').transition().duration(300)
    .attr('opacity', d => d.label.toLowerCase().includes(term) ? 1 : 0.05)
    .attr('r', d => d.label.toLowerCase().includes(term) ? d.r * 1.5 : d.r);
  d3.selectAll('.node-label').transition().duration(300)
    .attr('opacity', d => d.label.toLowerCase().includes(term) ? 1 : 0)
    .attr('font-size', '9.5px');
  if (matched.length > 0) {
    if (APP.netLayout === 'verticales' && APP.svgSel && APP.zoomBehavior) {
      const n = matched[0];
      const svgEl = document.getElementById('net-svg');
      const W = svgEl.clientWidth, H = svgEl.clientHeight;
      APP.svgSel.transition().duration(600).call(APP.zoomBehavior.transform, d3.zoomIdentity.translate(W / 2 - n.x, H / 2 - n.y));
    }
    if (APP.netLayout === 'clusters') {
      const ci = APP.nodeClusterMap.get(matched[0].id);
      if (ci !== undefined) { APP.selectedCluster = ci; updateClusterHighlight(); updateHoverState(); }
    }
  }
}
