import { LOGO } from './state.js';
import { doLogin, initParticles, initAuthListeners } from './auth.js';
import { switchView, closeAllPanels, initRouterListeners } from './router.js';
import { openPanel, closeP } from './panel.js';
import { onSearch } from './search.js';
import { filterV, toggleSidebar, closeSidebar, initSidebarListeners } from './sidebar.js';
import { openTickerActor } from './ticker.js';
import { setNetLayout, netZoom, netReset } from './views/network.js';
import { sortIdx, expandSignal } from './views/index.js';
import { expandBacSig } from './views/brief.js';

if (location.protocol === 'file:') {
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#050505;font-family:Space Mono,monospace;font-size:11px;color:#45d802;letter-spacing:0.2em;text-align:center;padding:40px">SERVE THIS APP OVER HTTP<br><br>python3 -m http.server 8080<br><br>Then open http://localhost:8080</div>';
} else {
  ['pw-logo', 'ul-logo', 'sb-logo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.src = LOGO;
  });

  // Expose functions called from inline HTML event handlers
  window.doLogin         = doLogin;
  window.switchView      = switchView;
  window.closeP          = closeP;
  window.filterV         = filterV;
  window.toggleSidebar   = toggleSidebar;
  window.closeSidebar    = closeSidebar;
  window.onSearch        = onSearch;
  window.openTickerActor = openTickerActor;
  window.setNetLayout    = setNetLayout;
  window.netZoom         = netZoom;
  window.netReset        = netReset;
  window.sortIdx         = sortIdx;
  window.expandSignal    = expandSignal;
  window.expandBacSig    = expandBacSig;

  initParticles();
  initAuthListeners();
  initRouterListeners();
  initSidebarListeners();

  if (typeof ResizeObserver !== 'undefined') {
    const tickerEl = document.getElementById('ticker');
    if (tickerEl) {
      const tickerRo = new ResizeObserver(() => {
        const track = document.getElementById('tk-track');
        if (!track) return;
        const animName = track.style.animationName;
        track.style.animation = 'none';
        void track.offsetWidth;
        track.style.animation = animName || '';
      });
      tickerRo.observe(tickerEl);
    }
  }

  const _viewWrapEl = document.querySelector('.view-wrap');
  if (_viewWrapEl) {
    _viewWrapEl.addEventListener('scroll', () => {
      if (window.matchMedia('(max-width:768px)').matches && document.querySelector('.actor-panel.open')) {
        closeAllPanels();
      }
    }, { passive: true });
  }
}
