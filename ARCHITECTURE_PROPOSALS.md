# Playbook Ecosistema MX — Architecture Upgrade: 5 Proposals

**Date:** May 2026  
**Current state:** Single `index.html` (~1,754 lines, ~130 KB) — inline CSS (~350 lines), inline JS (~1,200 lines), four JSON data files served over HTTP.  
**Purpose of this document:** Lay out five distinct architectural paths, each fully self-contained, so the team can make an informed decision without external context.

---

## Baseline Audit

Before any proposal, here is the complete feature inventory extracted from the current monolith. Every proposal must account for all of these.

| Feature | Current implementation |
|---|---|
| Password gate (`playbook2026`) | Inline JS `doLogin()`, client-side string compare |
| Particle canvas animation | IIFE with `requestAnimationFrame`, 55 particles |
| Unlock sequence | Progress bar + 5-step checklist, `animPct()` + `startUnlock()` |
| View switching | `switchView(v)`, CSS `display:none/block`, 4 views |
| D3 network (Red) | D3 v7 SVG force simulation, drag, zoom, click |
| Network layout: Red | `clusterForce` + `forceCenter` + `forceX/Y` |
| Network layout: Clusters | `clusterCentroidForce` + `clusterBoundForce`, ring backgrounds |
| Network layout: Verticales | `zoneBoundForce3x3` + `laneBoundForce`, 3×3 zone grid |
| LOD labels | Opacity/size scaled by `currentScale` in `updateLOD()` |
| Hover state | `updateHoverState()` highlights connected nodes/edges |
| Minimap | Canvas 2D scaled to 120×80 px, `drawMinimap()` + `updateMinimap()` |
| Zoom badge | Text overlay updated on every zoom event |
| Actor detail panel | `openPanel(actor, pid)` populates + slides in from right (mobile: up from bottom) |
| Sidebar + vertical filters | `filterV(v)` toggling `activeV`, counts per vertical |
| Index view | Sortable table `renderIdx()`, filter chips, search, filter banner |
| Briefings view | `renderBrief(v)` per vertical, deal flow timeline `DEALFLOW` |
| Clusters view | `buildClusters()` + `renderClusterDetail(i)`, split list/detail layout |
| Ticker bar | CSS animation `tickmove 60s`, doubles data array, click-to-panel |
| Global search | `onSearch(q)` routes to `renderIdx()` or `applyNetSearch()` |
| Mobile layout | `@media(max-width:768px)` sidebar drawer, actor panel slides up |
| ResizeObserver | SVG + force recalculation, ticker animation restart |
| Error boundaries | `showViewError()` with retry button, `showDataWarning()` banner |
| Data loading | `Promise.all([fetch actors, edges, poi, clusters])` with `adaptActor()`, `adaptEdge()`, `buildPoiMap()` |
| Design system | `--green:#45d802`, Space Mono + Syne + DM Sans, 9 vertical colors |

---

## Proposal 1 — Vanilla ES Modules (No Build Step)

### One-line pitch
Split the 1,754-line monolith into native browser `.js` modules using `import`/`export` — no bundler, no compiler, no npm.

### Stack
- **Language:** Vanilla JavaScript (ES2022+)
- **Modules:** Native browser ES modules (`type="module"`)
- **Bundler:** None
- **CSS:** Single `style.css` extracted from `<style>` block
- **D3:** CDN import map entry (or direct URL import)
- **Data:** Same four JSON files, `fetch()` as today
- **Server:** Any static file server (`python3 -m http.server`, `npx serve`, Nginx, Vercel)
- **Deployment:** Vercel static (zero config)

### File/folder structure

```
playbook-mapeo/
├── index.html              # Thin shell: imports style.css, bootstraps app.js
├── style.css               # All CSS extracted verbatim from <style>
├── app.js                  # Entry point: imports all modules, calls init()
├── js/
│   ├── config.js           # VX vertical definitions, DEALFLOW data, constants
│   ├── data.js             # loadData(), adaptActor(), adaptEdge(), buildPoiMap(), buildTicker()
│   ├── state.js            # Shared mutable state: ACTORS, EDGES, POI, CLUSTERS, actorMap, activeV, curView
│   ├── auth.js             # doLogin(), initParticles(), startUnlock(), animPct(), launchMain()
│   ├── panel.js            # openPanel(), closeP(), closeAllPanels()
│   ├── ticker.js           # initTicker(), openTickerActor()
│   ├── search.js           # onSearch(), applyNetSearch()
│   ├── sidebar.js          # filterV(), toggleSidebar(), closeSidebar(), updateSidebarCounts()
│   ├── views/
│   │   ├── switchView.js   # switchView(), view lifecycle coordinator
│   │   ├── index.js        # buildIdx(), renderIdx(), sortIdx(), expandSignal()
│   │   ├── brief.js        # buildBrief(), renderBrief(), expandBacSig(), dealFlowHtml()
│   │   └── clusters.js     # buildClusters(), renderClusterDetail(), hexToRgb()
│   └── network/
│       ├── init.js         # initNet(), SVG setup, simulation creation
│       ├── forces.js       # clusterForce(), clusterCentroidForce(), clusterBoundForce(),
│       │                   # laneBoundForce(), zoneBoundForce3x3()
│       ├── layout.js       # setNetLayout(), applyLayoutForces(), applyLayoutBg(),
│       │                   # applyModeEdgeStyle(), updateClusterCentroids(), updateVLanePositions()
│       ├── hover.js        # updateHoverState(), applyNetFilter(), updateLOD()
│       ├── minimap.js      # initMinimap(), drawMinimap(), updateMinimap()
│       └── zoom.js         # netZoom(), netReset(), updateFixedHeaders()
├── actors.json
├── edges.json
├── poi.json
└── clusters.json
```

`index.html` becomes ~30 lines:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playbook Intelligence — Ecosistema Deportivo MX 2026</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- All existing HTML markup preserved verbatim -->
  ...
  <script type="importmap">
    { "imports": { "d3": "https://cdn.jsdelivr.net/npm/d3@7/+esm" } }
  </script>
  <script type="module" src="app.js"></script>
</body>
</html>
```

### Migration path from current monolith

**Step 1 — Extract CSS (30 min):** Copy the `<style>` block verbatim into `style.css`. Replace `<style>...</style>` with `<link rel="stylesheet" href="style.css">`. Test that the app still looks identical.

**Step 2 — Create `state.js` (1 hour):** Define and `export let` every top-level mutable variable (`ACTORS`, `EDGES`, `EDGES_RAW`, `POI`, `CLUSTERS`, `actorMap`, `activeV`, `curView`, `netLayout`, `hoveredId`, `selectedCluster`, etc.). This is the hardest step conceptually — it forces you to identify all shared mutable state.

**Step 3 — Extract `config.js` (30 min):** Move `VX`, `DEALFLOW`, `STEPS`, and `RIESGO_DEFAULT` into `config.js`. These are pure data — no dependencies, no side effects.

**Step 4 — Extract leaf modules (2 hours):** In dependency order: `data.js` → `panel.js` → `ticker.js` → `search.js` → `sidebar.js`. Each imports from `state.js` and `config.js`. Wire them back into `app.js`.

**Step 5 — Extract view modules (3 hours):** `views/index.js`, `views/brief.js`, `views/clusters.js`. Each imports from `state.js`, `config.js`, `panel.js`.

**Step 6 — Extract network modules (4 hours):** Start with `forces.js` (pure functions), then `minimap.js`, `zoom.js`, `hover.js`, `layout.js`, `init.js`. The key challenge is that D3 selections (`linkSel`, `nodeSel`, `labelSel`, `svgSel`, etc.) are module-level state — move them into `state.js` or pass them between functions explicitly.

**Step 7 — Extract `auth.js` (2 hours):** Password gate, particles, unlock sequence. `launchMain()` must import everything it needs to bootstrap.

**Total estimated time:** 1–2 developer days.

### How each current feature maps to the new architecture

| Feature | New location | Behavior change? |
|---|---|---|
| Password gate | `auth.js` → `doLogin()` | None |
| Particle canvas | `auth.js` → `initParticles()` | None |
| Unlock sequence | `auth.js` → `startUnlock()`, `animPct()` | None |
| D3 network | `network/init.js` | None |
| Custom forces | `network/forces.js` | None — pure functions |
| Layout switching | `network/layout.js` | None |
| Hover / LOD | `network/hover.js` | None |
| Minimap | `network/minimap.js` | None |
| Zoom controls | `network/zoom.js` | None |
| Index view | `views/index.js` | None |
| Briefings view | `views/brief.js` | None |
| Clusters view | `views/clusters.js` | None |
| Actor panel | `panel.js` | None |
| Ticker | `ticker.js` | None |
| Sidebar / filters | `sidebar.js` | None |
| Global search | `search.js` | None |
| Data loading | `data.js` | None |
| Design system | `style.css` | None |
| Mobile layout | `style.css` (media queries) | None |

### Data layer
The four JSON files remain static files at the project root. `data.js` uses the same `Promise.all([fetch(...)])` pattern. No change. The import map lets D3 be loaded as an ES module from CDN, so the `<script src="...d3.min.js">` tag is removed.

### Development workflow

**Run locally:**
```bash
python3 -m http.server 8080
# open http://localhost:8080
```

**Add a new actor:** Edit `actors.json`. No rebuild. Reload the page.

**Add a new view:**
1. Create `js/views/myview.js` exporting `buildMyView()` and `renderMyView()`
2. Add HTML markup to `index.html`
3. Add tab in `.view-tabs` + sidebar item
4. Import and call from `js/views/switchView.js`

**Add a new vertical:** Add entry to `VX` in `config.js`. Add sidebar HTML. Actors referencing the new key will pick up the color automatically.

### Deployment
```bash
# Nothing to build. Just serve the directory.
vercel --prod   # or: git push → Vercel auto-deploys
```
No `vercel.json` needed. All files are static.

### Offline behavior
After first HTTP load, the browser caches HTML, CSS, JS, and JSON files via standard browser cache. No service worker is added by this proposal, so "offline" is cache-dependent. To add offline support, a 10-line service worker precaching the 8 static files would suffice.

### Honest tradeoffs

**Better than the monolith:**
- Each module can be read, tested, and reasoned about independently
- Git diffs are meaningful (changes to `network/forces.js` don't affect `views/brief.js`)
- No new tooling to learn or break

**Worse than the monolith:**
- HTTP/1.1 servers will make one round-trip per module file (12+ files). On HTTP/2 this is a non-issue; on HTTP/1.1 (unlikely in prod) it adds a tiny delay.
- Import maps are not supported in Safari < 16.4 (released March 2023). The current user base likely doesn't hit this.
- No tree-shaking. Unused code (if any creeps in) ships to the browser.
- Debugging still happens in browser DevTools; source maps don't exist without a bundler.
- As the module graph grows past ~20 files, circular dependency errors become hard to trace without tooling.

**What this requires from the team:**
- Understanding of ES module semantics (`import`/`export`, live bindings, circular deps)
- Discipline to keep `state.js` as the single source of truth and not re-introduce global `window.*` variables

### Complexity score
- **Setup complexity:** 1/5 — no tooling at all
- **Learning curve:** 1/5 — pure JavaScript
- **Ongoing maintenance burden:** 2/5 — slightly lower than monolith due to separation, but manual wiring

---

## Proposal 2 — Vite + React (Component Architecture)

### One-line pitch
A React SPA built with Vite, where each view is a component, D3 runs inside `useEffect` with refs, and data is managed by TanStack Query (react-query v5).

### Stack
- **Framework:** React 19
- **Bundler/dev server:** Vite 6
- **Routing:** React Router v7 (or `useState`-based view switching to avoid URL changes)
- **Data fetching/caching:** TanStack Query v5
- **D3:** npm `d3` v7, used inside `useEffect` refs
- **CSS:** CSS Modules (`.module.css`) per component, global `globals.css` for design system variables
- **TypeScript:** Optional but recommended for actor/edge types
- **Deployment:** Vercel (static SPA, `vercel.json` with rewrites if using React Router)

### File/folder structure

```
playbook-mapeo/
├── index.html                    # Vite entry (minimal, just <div id="root">)
├── vite.config.js
├── package.json
├── public/
│   ├── actors.json
│   ├── edges.json
│   ├── poi.json
│   └── clusters.json
├── src/
│   ├── main.jsx                  # ReactDOM.createRoot, QueryClientProvider
│   ├── App.jsx                   # Top-level: AuthGate → UnlockScreen → MainApp
│   ├── config/
│   │   ├── verticals.js          # VX object
│   │   └── dealflow.js           # DEALFLOW object
│   ├── hooks/
│   │   ├── usePlaybookData.js    # TanStack Query: fetches all 4 JSON files
│   │   └── useActorMap.js        # useMemo: builds Map from actors array
│   ├── store/
│   │   └── uiStore.js            # Zustand or useReducer: activeV, curView, selectedActor
│   ├── components/
│   │   ├── auth/
│   │   │   ├── PasswordGate.jsx  # pw screen + particle canvas
│   │   │   ├── PasswordGate.module.css
│   │   │   ├── ParticleCanvas.jsx
│   │   │   └── UnlockScreen.jsx  # progress bar + checklist
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx       # vertical filters + view nav
│   │   │   ├── Sidebar.module.css
│   │   │   ├── Topbar.jsx        # breadcrumb + search + date badge
│   │   │   ├── ViewTabs.jsx
│   │   │   └── Ticker.jsx        # bottom ticker bar
│   │   ├── panel/
│   │   │   ├── ActorPanel.jsx    # slide-in detail panel
│   │   │   └── ActorPanel.module.css
│   │   └── views/
│   │       ├── NetworkView.jsx   # D3 black-box container
│   │       ├── NetworkView.module.css
│   │       ├── IndexView.jsx     # sortable table
│   │       ├── BriefingsView.jsx # per-vertical briefings
│   │       └── ClustersView.jsx  # split list/detail
│   ├── d3/
│   │   ├── simulation.js         # createSimulation(), applyLayout() — pure D3 logic
│   │   ├── forces.js             # clusterForce(), zoneBoundForce3x3(), etc.
│   │   ├── minimap.js            # drawMinimap(), updateMinimap()
│   │   └── hover.js              # updateHoverState(), applyNetFilter(), updateLOD()
│   └── globals.css               # :root CSS variables, resets, scrollbar, animations
```

### Migration path from current monolith

**Step 1 — Scaffold (15 min):**
```bash
npm create vite@latest playbook-mapeo -- --template react
cd playbook-mapeo && npm install
npm install d3 @tanstack/react-query zustand
```

**Step 2 — Port design system (1 hour):** Copy `:root` variables and all CSS rules from `index.html`'s `<style>` block into `src/globals.css`. Import it in `main.jsx`.

**Step 3 — Port HTML structure (2 hours):** Convert `<div id="screen-pw">`, `<div id="screen-unlock">`, `<nav class="sidebar">`, `<div class="main-area">` to React components. Use `className` instead of `class`. Keep markup identical.

**Step 4 — Port data layer (2 hours):** Create `usePlaybookData.js` with TanStack Query. Replicate `adaptActor()`, `adaptEdge()`, `buildPoiMap()`, `buildTicker()` as utility functions in `src/utils/`.

**Step 5 — Port non-D3 views (4 hours):** `IndexView`, `BriefingsView`, `ClustersView` are straightforward JSX conversions. State (sort column, filter chip, selected cluster) becomes `useState`.

**Step 6 — Port actor panel (1 hour):** `ActorPanel` receives `actor` prop and `isOpen` boolean. CSS `transform: translateX` controlled by prop.

**Step 7 — Port D3 network (full day — the hard part):** This is the critical integration challenge. The correct pattern:

```jsx
// NetworkView.jsx
export function NetworkView({ actors, edges, clusters }) {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !actors.length) return;
    // D3 owns everything inside the SVG.
    // React never touches svgRef.current's children.
    const { simulation, cleanup } = createSimulation(svgRef.current, actors, edges, clusters);
    simulationRef.current = simulation;
    return cleanup; // stop simulation, remove D3 event listeners
  }, [actors, edges, clusters]);

  // Layout changes, filter, search: call imperative D3 functions via refs
  useEffect(() => {
    if (simulationRef.current) applyNetFilter(activeV);
  }, [activeV]);

  return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
}
```

**The key rule:** React renders one `<svg>` element. D3 owns all children of that SVG. React never re-renders inside the SVG. Communication from React to D3 goes through `useEffect` calling imperative D3 functions stored in refs.

**Step 8 — Port auth screens (2 hours):** `PasswordGate` with `ParticleCanvas` using `useEffect` and `useRef` for the canvas. `UnlockScreen` with `useState` for progress percentage.

**Step 9 — Port ticker (1 hour):** `Ticker` component, data comes from `usePlaybookData` hook.

**Total estimated time:** 3–5 developer days.

### How each current feature maps to the new architecture

| Feature | New location | Behavior change? |
|---|---|---|
| Password gate | `PasswordGate.jsx` + `usePasswordGate` hook | None |
| Particle canvas | `ParticleCanvas.jsx` with `useEffect` + `useRef` | None |
| Unlock sequence | `UnlockScreen.jsx` with `useState` | None |
| D3 network | `NetworkView.jsx` (React shell) + `src/d3/simulation.js` (D3 logic) | None — D3 is untouched inside the black box |
| Custom forces | `src/d3/forces.js` — pure functions, no React | None |
| Layout switching | `layout.js` called imperatively from `useEffect` | None |
| Hover / LOD | `hover.js` called imperatively from D3 event handlers | None |
| Minimap | `minimap.js` — same canvas 2D logic | None |
| Actor panel | `ActorPanel.jsx` — prop-driven open/close | Identical behavior, cleaner API |
| Index view | `IndexView.jsx` with `useState` for sort/filter | None |
| Briefings | `BriefingsView.jsx` | None |
| Clusters view | `ClustersView.jsx` | None |
| Ticker | `Ticker.jsx` | CSS animation identical |
| Sidebar / filters | `Sidebar.jsx` | None |
| Global search | Controlled input in `Topbar.jsx`, propagated via state | None |
| Data loading | `usePlaybookData.js` (TanStack Query) | Adds caching + loading/error states |
| Design system | `globals.css` + `*.module.css` | None |
| Mobile layout | CSS Modules preserve all media queries | None |

### Data layer
`public/actors.json` etc. are served as-is by Vite. TanStack Query fetches them on first render, caches indefinitely (`staleTime: Infinity`), and surfaces loading and error states automatically. The four adaptation functions (`adaptActor`, etc.) live in `src/utils/data.js` and are called inside the query's `select` option.

### Development workflow

```bash
npm run dev       # Vite HMR at http://localhost:5173
npm run build     # outputs dist/
npm run preview   # preview production build
```

**Add a new actor:** Edit `public/actors.json`. The dev server hot-reloads JSON changes in ~200ms.

**Add a new view:** Create `src/components/views/MyView.jsx`, add a tab in `ViewTabs.jsx`, add a case in `App.jsx` conditional rendering.

**Add a new vertical:** Add to `src/config/verticals.js`. The sidebar and all views pick it up automatically via `Object.entries(VX)`.

### Deployment
```bash
npm run build
vercel --prod   # deploys dist/
```

`vercel.json` only needed if using client-side routing with React Router (to add a catch-all rewrite):
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
Since this app uses view-state instead of URL routes, `vercel.json` may not be needed at all.

### Offline behavior
Vite's production build generates hashed asset filenames. A Vite PWA plugin (`vite-plugin-pwa`) can add a service worker in ~10 lines of config, caching all static assets and JSON files for full offline support.

### Honest tradeoffs

**Better than the monolith:**
- Component isolation: `BriefingsView` has zero knowledge of the D3 network
- TanStack Query adds automatic error retry, loading states, and deduplication
- HMR in development: CSS and component changes reflect in <200ms without losing D3 simulation state (if `useEffect` dependencies are set correctly)
- TypeScript option gives actor/edge type safety across all components

**Worse than the monolith:**
- The D3 + React integration (the "black box ref" pattern) is non-obvious. A developer who doesn't understand why React must not touch the SVG interior will break the simulation in subtle ways.
- Bundle size grows: React 19 + React DOM ≈ 45 KB gzipped (D3 is already ~70 KB gzipped). Net increase: ~45 KB.
- Build step is now required: a developer cannot open `index.html` directly.
- TanStack Query, Zustand, React Router are additional packages with their own upgrade cycles.
- `npm install` required before any local dev.

**What this requires from the team:**
- Solid understanding of React hooks (`useEffect`, `useRef`, `useMemo`)
- Understanding of the D3/React boundary contract (who owns the DOM)
- Familiarity with npm ecosystem

### Complexity score
- **Setup complexity:** 3/5
- **Learning curve:** 3/5
- **Ongoing maintenance burden:** 2/5

---

## Proposal 3 — SvelteKit (SSR + Static Export)

### One-line pitch
SvelteKit with `adapter-static` generates a fully pre-rendered static site; reactive `$store` variables replace the current global `let` declarations; `+page.server.js` load functions replace the `fetch`-in-script pattern.

### Stack
- **Framework:** SvelteKit 2 + Svelte 5
- **Adapter:** `@sveltejs/adapter-static` (or `adapter-node` if a server is acceptable)
- **CSS:** Svelte `<style>` blocks (scoped per component) + `src/app.css` for global design system
- **D3:** npm `d3` v7
- **Data:** Loaded via `+page.server.js` load functions (static adapter reads JSON at build time) or client-side `fetch` on first render
- **Deployment:** Vercel with `@sveltejs/adapter-vercel` (or adapter-static → Vercel static)

### File/folder structure

```
playbook-mapeo/
├── package.json
├── svelte.config.js          # adapter-static, prerender: true
├── vite.config.js
├── static/
│   ├── actors.json
│   ├── edges.json
│   ├── poi.json
│   └── clusters.json
├── src/
│   ├── app.css               # :root variables, resets, global rules
│   ├── app.html              # SvelteKit HTML template
│   ├── lib/
│   │   ├── config/
│   │   │   ├── verticals.js  # VX
│   │   │   └── dealflow.js   # DEALFLOW
│   │   ├── stores/
│   │   │   ├── data.js       # writable: actors, edges, poi, clusters, actorMap
│   │   │   └── ui.js         # writable: activeV, curView, selectedActor, netLayout
│   │   ├── utils/
│   │   │   └── data.js       # adaptActor(), adaptEdge(), buildPoiMap(), buildTicker()
│   │   └── d3/
│   │       ├── simulation.js
│   │       ├── forces.js
│   │       ├── minimap.js
│   │       └── hover.js
│   └── routes/
│       ├── +layout.svelte        # App shell: Sidebar, Topbar, ViewTabs, Ticker, AuthGate
│       ├── +layout.server.js     # load(): reads all 4 JSON files at build time
│       ├── +page.svelte          # Redirects to /network (default view)
│       ├── network/
│       │   └── +page.svelte      # NetworkView component
│       ├── index/
│       │   └── +page.svelte      # IndexView component
│       ├── briefings/
│       │   └── +page.svelte      # BriefingsView component
│       └── clusters/
│           └── +page.svelte      # ClustersView component
```

### Migration path from current monolith

**Step 1 — Scaffold (15 min):**
```bash
npm create svelte@latest playbook-mapeo
# Choose: Skeleton project, No TypeScript (or Yes), ESLint
cd playbook-mapeo && npm install
npm install d3 @sveltejs/adapter-static
```

**Step 2 — Configure static adapter (10 min):**
```js
// svelte.config.js
import adapter from '@sveltejs/adapter-static';
export default {
  kit: { adapter: adapter({ fallback: 'index.html' }), prerender: { entries: ['*'] } }
};
```

**Step 3 — Port design system (1 hour):** Extract CSS to `src/app.css`. Import in `app.html`.

**Step 4 — Port data layer (2 hours):** Create `+layout.server.js` that reads JSON files (at build time for static, or via `fetch` on client). Populate Svelte stores in `+layout.svelte` `onMount`.

```js
// +layout.server.js
export async function load({ fetch }) {
  const [actors, edges, poi, clusters] = await Promise.all([
    fetch('/actors.json').then(r => r.json()),
    fetch('/edges.json').then(r => r.json()),
    fetch('/poi.json').then(r => r.json()),
    fetch('/clusters.json').then(r => r.json()),
  ]);
  return { actors, edges, poi, clusters };
}
```

**Step 5 — Port stores (2 hours):** Every top-level `let` variable in the monolith becomes a Svelte writable store:

```js
// src/lib/stores/ui.js
import { writable, derived } from 'svelte/store';
export const activeV = writable(null);
export const curView = writable('network');
export const selectedActor = writable(null);
export const netLayout = writable('red');
```

**Step 6 — Port layout shell (3 hours):** `+layout.svelte` contains Sidebar, Topbar, ViewTabs, Ticker. The `<slot />` renders the current route's page.

**Step 7 — Port views (4 hours):** Each `+page.svelte` is a thin component that imports from stores and lib.

**Step 8 — Port D3 network (full day):** Same "black box" pattern as React — `bind:this={svgEl}` and `onMount(() => { createSimulation(svgEl, ...) })`. Reactive statements `$:` handle filter/layout changes imperatively.

**Step 9 — Port auth screens (3 hours):** Auth state as a store: `export const authenticated = writable(false)`. `+layout.svelte` conditionally renders `<PasswordGate>` or `<UnlockScreen>` or `<slot />`.

**Total estimated time:** 3–4 developer days.

### How each current feature maps to the new architecture

| Feature | New location | Behavior change? |
|---|---|---|
| Password gate | `PasswordGate.svelte`, `authenticated` store | None |
| Particle canvas | `ParticleCanvas.svelte` with `onMount` + canvas ref | None |
| Unlock sequence | `UnlockScreen.svelte`, Svelte `{#if}` blocks | None |
| D3 network | `routes/network/+page.svelte` + `lib/d3/simulation.js` | None |
| Custom forces | `lib/d3/forces.js` — pure functions | None |
| Layout switching | Reactive `$: applyLayout($netLayout)` | None |
| Hover / LOD | Same D3 imperative calls | None |
| Minimap | Same canvas 2D logic, triggered by simulation tick | None |
| Actor panel | `ActorPanel.svelte`, `selectedActor` store | None |
| Index view | `routes/index/+page.svelte` | None |
| Briefings | `routes/briefings/+page.svelte` | None |
| Clusters view | `routes/clusters/+page.svelte` | None |
| Ticker | `Ticker.svelte`, data from store | None |
| Sidebar / filters | `Sidebar.svelte`, writes to `activeV` store | None |
| Global search | `Topbar.svelte` input → `$: applySearch(query)` | None |
| Data loading | `+layout.server.js` + stores | Adds SSR data available on first paint |
| Design system | `app.css` + scoped `<style>` in components | None |
| Mobile layout | Same media queries in component styles | None |

### Data layer
With `adapter-static`, `+layout.server.js` runs at build time. The four JSON files are read once, passed as page data props, and stored in Svelte stores at `onMount`. On Vercel this means the build process reads the JSON files and embeds the data in the generated HTML — eliminating the `fetch()` call entirely on first load. This is the key performance advantage over the current monolith.

Alternatively: keep `fetch()` client-side (same as today) and use `adapter-static` purely for routing. This is simpler and avoids a 474 KB of data being inlined in HTML.

### Development workflow

```bash
npm run dev       # Vite HMR at http://localhost:5173
npm run build     # generates static site in build/
npm run preview   # preview production build
```

**Add a new actor:** Edit `static/actors.json`. Rebuild if using SSR prerender; hot-reload if using client `fetch`.

**Add a new view:** Create `src/routes/myview/+page.svelte`. SvelteKit automatically generates the route. Add a nav item to `+layout.svelte`.

**Add a new vertical:** Add to `src/lib/config/verticals.js`.

### Deployment
```bash
npm run build
vercel --prod   # deploys build/
```
With `adapter-static`, output is a folder of `.html`/`.js` files. Zero `vercel.json` needed for static deployment.

### Offline behavior
SvelteKit supports `@vite-pwa/sveltekit` for service worker generation. With `adapter-static`, all routes are pre-rendered HTML, making offline support straightforward.

### Honest tradeoffs

**Better than the monolith:**
- Svelte's reactive stores are a natural fit for replacing the current scattered `let activeV`, `let curView`, etc.
- File-based routing makes view separation explicit and enforced by convention
- `+layout.server.js` can pre-render data, meaning the app shows content before JS executes
- Svelte compiles to vanilla JS — no virtual DOM overhead, smallest JS bundle of the framework proposals
- Scoped component styles eliminate the risk of global CSS conflicts

**Worse than the monolith:**
- SvelteKit's routing changes the URL on view switch. If the current URL-less behavior is required, you need to implement view-switching via state rather than navigation (defeating some of the routing advantage).
- The D3/Svelte integration is the same "black box" problem as React; `$:` reactive statements calling D3 imperative functions feel awkward.
- Svelte 5's runes syntax (`$state`, `$derived`) is a significant API change from Svelte 4 if the team has any Svelte 4 experience.
- Smallest ecosystem of the three framework options (fewer example integrations for D3 + SvelteKit).

**What this requires from the team:**
- Understanding of SvelteKit routing conventions
- Understanding of Svelte stores and reactivity model
- The same D3/framework boundary discipline as React

### Complexity score
- **Setup complexity:** 3/5
- **Learning curve:** 3/5
- **Ongoing maintenance burden:** 2/5

---

## Proposal 4 — Astro + Islands

### One-line pitch
Astro renders the static shell (password gate UI, sidebar HTML, briefings, clusters, index table) at build time as zero-JS HTML; only the D3 force graph hydrates as an interactive island, sending the minimum possible JavaScript to the browser.

### Stack
- **Framework:** Astro 5
- **Islands:** `client:load` or `client:visible` directive on `<NetworkIsland />`
- **Island component library:** Vanilla JS (`client:only="vanilla"`) or optionally React/Svelte if the team prefers
- **CSS:** Astro scoped `<style>` in `.astro` components + `global.css` for design system variables
- **D3:** npm `d3` v7, used only in the island component
- **Data:** JSON files in `public/`, fetched client-side at runtime (password gate already defers all content loading)
- **Deployment:** Vercel (`@astrojs/vercel/static` adapter)

### File/folder structure

```
playbook-mapeo/
├── package.json
├── astro.config.mjs          # adapter: vercel/static, output: 'static'
├── public/
│   ├── actors.json
│   ├── edges.json
│   ├── poi.json
│   └── clusters.json
├── src/
│   ├── styles/
│   │   └── global.css        # :root vars, resets, all existing CSS classes
│   ├── lib/
│   │   ├── verticals.js      # VX — used at build time for static HTML
│   │   ├── dealflow.js
│   │   └── data.ts           # adaptActor(), adaptEdge(), types
│   ├── layouts/
│   │   └── AppShell.astro    # <html>, fonts, global CSS, sidebar, topbar, ticker
│   ├── components/
│   │   ├── auth/
│   │   │   ├── PasswordGate.astro  # Static HTML markup only
│   │   │   └── AuthScript.astro    # <script> block: doLogin(), particles, unlock
│   │   ├── layout/
│   │   │   ├── Sidebar.astro
│   │   │   ├── Topbar.astro
│   │   │   ├── ViewTabs.astro
│   │   │   └── Ticker.astro        # HTML markup; JS animation is CSS-only
│   │   ├── panel/
│   │   │   └── ActorPanel.astro    # Static HTML shell; JS fills content
│   │   ├── views/
│   │   │   ├── IndexView.astro     # Static HTML table shell; JS fills rows
│   │   │   ├── BriefingsView.astro # Static HTML shell; JS fills cards
│   │   │   └── ClustersView.astro  # Static HTML shell; JS fills list/detail
│   │   └── network/
│   │       └── NetworkIsland.js    # client:only island — D3 SVG, all network logic
│   └── pages/
│       └── index.astro             # Assembles everything, single page
```

### The island boundary — what is static vs. hydrated

This is the core design decision of this proposal. Here is the exact boundary:

| Element | Static HTML (build time) | Hydrated JS island |
|---|---|---|
| Password gate markup | ✓ Astro renders the full HTML structure | — |
| Particle canvas animation | — | ✓ Inline `<script>` tag (not a component, no framework overhead) |
| Unlock sequence markup | ✓ | — |
| Unlock animation JS | — | ✓ Inline `<script>` |
| App shell (sidebar, topbar, tabs) | ✓ | — |
| Sidebar filter click handlers | — | ✓ Inline `<script>` (event delegation, ~20 lines) |
| D3 SVG force graph | — | ✓ `NetworkIsland.js` — `client:only` |
| Index table HTML shell | ✓ | — |
| Index table rows (191 actors) | — | ✓ Inline `<script>` fills `<tbody>` after data loads |
| Briefings hero + stats | — | ✓ Inline `<script>` fills content |
| Clusters list/detail | — | ✓ Inline `<script>` fills content |
| Actor panel markup | ✓ | — |
| Actor panel content | — | ✓ Inline `<script>` fills on open |
| Ticker markup | ✓ | — |
| Ticker items | — | ✓ Inline `<script>` fills after data loads |
| CSS animations (ticker, pulse) | ✓ | — |

**Net result:** The browser receives ~15 KB of actual HTML on first byte. The D3 island (`NetworkIsland.js` + `d3` ≈ 120 KB gzipped) loads only when the user reaches the network view, via `client:visible`.

### Build output structure

```
dist/
├── index.html          # ~15 KB: full app HTML shell with all static content
├── _astro/
│   ├── NetworkIsland.HASH.js   # D3 island, ~120 KB gzipped
│   ├── global.HASH.css         # All styles, ~8 KB gzipped
│   └── hoisted.HASH.js         # Astro inline scripts bundled, ~5 KB
├── actors.json
├── edges.json
├── poi.json
└── clusters.json
```

Total JS on initial load (before user unlocks password): **0 KB** (the island is `client:visible` and the network view is hidden). After unlock: ~5 KB for UI scripts. Only when the user clicks "Red de actores": ~120 KB for D3.

### Migration path from current monolith

**Step 1 — Scaffold (15 min):**
```bash
npm create astro@latest playbook-mapeo -- --template minimal
cd playbook-mapeo && npm install
npm install d3 @astrojs/vercel
```

**Step 2 — Port global CSS (1 hour):** Copy CSS to `src/styles/global.css`, import in `AppShell.astro`.

**Step 3 — Port HTML to Astro components (3 hours):** Copy each HTML section into `.astro` files. Astro components are just enhanced HTML — no JSX, no template syntax for static content.

**Step 4 — Port data-independent scripts as inline `<script>` blocks (2 hours):** Password check, particle canvas, unlock animation, sidebar toggle — these don't need data and can be `<script>` tags in `AuthScript.astro` and `AppShell.astro`.

**Step 5 — Port data-dependent view scripts (4 hours):** `renderIdx()`, `renderBrief()`, `buildClusters()`, `openPanel()`, `initTicker()` — wrap these in a single inline `<script>` block in `index.astro`. They run after `loadData()` exactly as today.

**Step 6 — Isolate `NetworkIsland.js` (full day):** Extract all D3 code into `NetworkIsland.js`. This file exports an `init(svgEl, actors, edges, clusters)` function. Astro loads it with `client:only="vanilla"`. The data is passed via `data-*` attributes or a global event.

**Step 7 — Wire data handoff (2 hours):** After `loadData()` in the inline script, dispatch a `CustomEvent('playbookDataLoaded', { detail: { actors, edges, poi, clusters } })`. The `NetworkIsland.js` listens for this event to initialize.

**Total estimated time:** 4–6 developer days (the island boundary design takes thought).

### How each current feature maps to the new architecture

| Feature | New location | Behavior change? |
|---|---|---|
| Password gate | `PasswordGate.astro` (markup) + inline `<script>` (logic) | None |
| Particle canvas | Inline `<script>` in `AuthScript.astro` | None |
| Unlock sequence | Inline `<script>` | None |
| D3 network | `NetworkIsland.js` — `client:only` island | None — same D3 code |
| All network features | Inside `NetworkIsland.js` | None |
| Index/Briefings/Clusters | Inline `<script>` (same functions as today) | None |
| Actor panel | Inline `<script>` | None |
| Ticker | Inline `<script>` fills items; CSS handles animation | None |
| Sidebar / filters | Inline `<script>` (event delegation) | None |
| Global search | Inline `<script>` | None |
| Data loading | `loadData()` in inline `<script>`, fires CustomEvent | None |
| Design system | `global.css` | None |
| Mobile layout | `global.css` media queries | None |

### Data layer
JSON files remain in `public/`. Client-side `fetch` as today. No change. The key architectural gain is that the D3 bundle is deferred — users on slow connections see the full UI (except the network graph) without waiting for D3 to load.

### Development workflow

```bash
npm run dev       # Astro dev server at http://localhost:4321
npm run build     # generates dist/
npm run preview
```

**Add a new actor:** Edit `public/actors.json`. No rebuild needed (client-side fetch).

**Add a new view:** Create a new `.astro` component, add HTML shell, add a tab to `ViewTabs.astro`, add a `<script>` block to handle the view's content rendering.

**Add a new vertical:** Add to `src/lib/verticals.js`. If used in Astro component frontmatter (build-time), rebuild. If used in inline scripts only, no rebuild needed.

### Deployment
```bash
npm run build
vercel --prod   # deploys dist/
```
No `vercel.json` needed for static output.

### Offline behavior
Astro supports Vite PWA plugin. With all routes statically generated and JSON files in `public/`, a service worker can cache everything for full offline support.

### Honest tradeoffs

**Better than the monolith:**
- The D3 bundle (~120 KB) is deferred until needed, improving Time to Interactive for users who only need the Index or Briefings views
- Static HTML shell means content is visible before JS executes (faster perceived load)
- Clean architectural separation: static content vs. interactive islands is explicit and enforced by the file structure
- Minimal JS framework overhead — Astro itself ships 0 KB of runtime JS to the browser

**Worse than the monolith:**
- The island boundary adds a coordination problem: how does the D3 island receive data? The `CustomEvent` approach works but feels like a workaround; it's less elegant than React/Svelte prop passing.
- Astro components cannot use client-side state reactively. The current `filterV(v)` function needs to notify both the sidebar (Astro, static), the D3 island, AND the index/brief/cluster views. This requires a shared event bus or a global variable — essentially recreating what React/Svelte stores provide.
- For a heavily interactive, single-page app that is already open in the browser, the performance benefit of deferred JS is smaller than for a content site. The app is password-gated — no content renders until unlock anyway.
- Two mental models in one project: Astro's file-based components + inline `<script>` tags is a hybrid that can confuse contributors.

**What this requires from the team:**
- Understanding of Astro's island architecture and `client:*` directives
- Careful design of the data handoff mechanism between inline scripts and the D3 island
- Awareness that Astro is not designed for SPAs — some patterns (global reactive state) require extra work

### Complexity score
- **Setup complexity:** 3/5
- **Learning curve:** 4/5
- **Ongoing maintenance burden:** 3/5

---

## Proposal 5 — Monolith Hardened (No Framework)

### One-line pitch
Do not rewrite. In 1–2 developer days, extract CSS to `style.css`, restructure the JS into IIFE modules inside `app.js`, replace scattered `let` globals with a single `APP` state object, add JSDoc types for all data structures, and add `package.json` with a dev server script. The app is still one file in spirit — but it is now a defensible production artifact.

### Stack
- **Language:** Vanilla JavaScript (ES5-compatible, no modules, no transpilation)
- **CSS:** External `style.css` (extracted verbatim)
- **D3:** CDN `<script>` tag (unchanged)
- **Data:** Same four JSON files (unchanged)
- **Dev tooling:** `package.json` with `"dev": "npx serve ."` or `"python3 -m http.server 8080"`
- **Linting:** Optional `eslint` with `eslint-plugin-jsdoc`
- **Deployment:** Vercel static (unchanged)

### The minimum intervention

The goal is not a rewrite. It is surgical hardening of the existing code to eliminate the three biggest fragility sources:

1. **Scattered mutable globals** → single `APP` state object
2. **Implicit coupling between functions** → explicit module boundaries via IIFE namespaces
3. **No type information** → JSDoc annotations on all data structures

### `app.js` module structure (detailed outline)

```js
// app.js — extracted from index.html <script> block
// Structure: each IIFE namespace is a logical module boundary

// ─── 1. LOGO ────────────────────────────────────────────────────────────────
const LOGO = 'data:image/webp;base64,...'; // unchanged

// ─── 2. CONFIG ──────────────────────────────────────────────────────────────
const VX = { V1: {...}, V2: {...}, ... };       // vertical definitions
const DEALFLOW = { V1: [...], V2: [...], ... }; // deal flow timeline data
const STEPS = [...];                            // unlock sequence steps
const RIESGO_DEFAULT = '...';

// ─── 3. APP STATE ────────────────────────────────────────────────────────────
/**
 * @typedef {Object} AppState
 * @property {Actor[]}     actors        - Adapted actor array
 * @property {Edge[]}      edges         - [sourceId, targetId] tuples
 * @property {RawEdge[]}   edgesRaw      - Full edge objects for panel display
 * @property {PoiMap}      poi           - POI by actor ID
 * @property {Cluster[]}   clusters      - Cluster objects
 * @property {Map<string,Actor>} actorMap - Lookup by actor ID
 * @property {TickerItem[]} tickerData   - Ticker items (derived from actors)
 * @property {string|null} activeV       - Active vertical filter (null = all)
 * @property {string}      curView       - 'network'|'index'|'brief'|'clusters'
 * @property {string}      netLayout     - 'red'|'clusters'|'verticales'
 * @property {string|null} hoveredId     - Hovered node ID
 * @property {number|null} selectedCluster - Selected cluster index
 */
const APP = {
  actors: [], edges: [], edgesRaw: [], poi: {}, clusters: [],
  actorMap: new Map(), tickerData: [],
  activeV: null, curView: 'network', netLayout: 'red',
  hoveredId: null, selectedCluster: null,
};

// ─── 4. DATA TYPEDEFS ────────────────────────────────────────────────────────
/**
 * @typedef {Object} Actor
 * @property {string}  id
 * @property {string}  label
 * @property {string}  vertical   - 'V1'–'V9'
 * @property {number}  tier       - 1, 2, or 3
 * @property {string}  role       - que_hace or subcategoria
 * @property {string}  signal     - known_for or por_que
 * @property {string}  ciudad
 * @property {string}  certeza    - 'VERIFICADO'|'FUENTE UNICA'|'INFERIDO'
 * @property {string[]} conexiones - vertical keys this actor connects to
 * @property {boolean} flag
 * @property {boolean} watchlist
 * @property {string}  website
 * @property {string}  fuentes
 * @property {string}  que_hace
 * @property {string}  por_que
 * @property {number}  [x]        - D3 simulation x (set at runtime)
 * @property {number}  [y]        - D3 simulation y (set at runtime)
 * @property {number}  [r]        - node radius (set at runtime)
 */

/**
 * @typedef {Object} RawEdge
 * @property {string} id
 * @property {string} source
 * @property {string} target
 * @property {string} vertical_a
 * @property {string} vertical_b
 * @property {string} tier
 * @property {string} descripcion
 * @property {string} tipo
 * @property {string} direccion
 * @property {string} fuerza
 * @property {boolean} vigente
 * @property {boolean} cross
 */

// ─── 5. DATA LAYER ───────────────────────────────────────────────────────────
// adaptActor(), adaptEdge(), buildPoiMap(), buildTicker(), loadData()
// Same logic as today, but reading from / writing to APP.*

// ─── 6. AUTH MODULE ──────────────────────────────────────────────────────────
// (function Auth() {
//   doLogin(), initParticles(), startUnlock(), animPct(), launchMain()
// })();

// ─── 7. UI UTILITIES ─────────────────────────────────────────────────────────
// safeGetActor(), showDataWarning(), showViewError()

// ─── 8. PANEL MODULE ─────────────────────────────────────────────────────────
// openPanel(), closeP(), closeAllPanels()

// ─── 9. VIEW CONTROLLER ──────────────────────────────────────────────────────
// switchView(), filterV(), onSearch()

// ─── 10. NETWORK MODULE ──────────────────────────────────────────────────────
// initNet()
//   — Internal: createSimulation(), buildClusterBg(), buildVLaneBg(), buildFixedHeaders()
// Submodules (still in same file, separated by comments):
//   — Forces: clusterForce(), clusterCentroidForce(), clusterBoundForce(),
//             laneBoundForce(), zoneBoundForce3x3()
//   — Layout: setNetLayout(), applyLayoutForces(), applyLayoutBg(), applyModeEdgeStyle()
//   — Hover:  updateHoverState(), applyNetFilter(), updateLOD()
//   — Minimap: initMinimap(), drawMinimap(), updateMinimap()
//   — Zoom:   netZoom(), netReset(), updateFixedHeaders()
//   — Edge style helpers: getBaseEdgeStroke(), getBaseEdgeOpacity(), getBaseEdgeWidth()

// ─── 11. INDEX VIEW ──────────────────────────────────────────────────────────
// buildIdx(), renderIdx(), sortIdx(), expandSignal()

// ─── 12. BRIEFINGS VIEW ──────────────────────────────────────────────────────
// buildBrief(), renderBrief(), expandBacSig(), dealFlowHtml()

// ─── 13. CLUSTERS VIEW ───────────────────────────────────────────────────────
// buildClusters(), renderClusterDetail(), hexToRgb()

// ─── 14. TICKER ──────────────────────────────────────────────────────────────
// initTicker(), openTickerActor()

// ─── 15. MOBILE / SIDEBAR ────────────────────────────────────────────────────
// toggleSidebar(), closeSidebar()

// ─── 16. RESIZE OBSERVERS ────────────────────────────────────────────────────
// ResizeObserver for net-svg-wrap and ticker
```

### The single `APP` state object — schema

```js
const APP = {
  // ── Data (populated by loadData()) ──────────────────────────────
  actors:    [],          // Actor[]
  edges:     [],          // [string, string][]  (source, target ID pairs)
  edgesRaw:  [],          // RawEdge[]
  poi:       {},          // { [actorId: string]: { poi: {n,r}[], riesgo: string } }
  clusters:  [],          // Cluster[]
  actorMap:  new Map(),   // Map<string, Actor>
  tickerData:[],          // { v: string, aid: string, t: string }[]

  // ── UI state ────────────────────────────────────────────────────
  activeV:          null, // string|null — active vertical filter
  curView:          'network', // 'network'|'index'|'brief'|'clusters'
  netLayout:        'red',     // 'red'|'clusters'|'verticales'
  hoveredId:        null, // string|null — hovered network node
  selectedCluster:  null, // number|null — selected cluster index

  // ── D3 selections (set by initNet(), used across network functions) ──
  net: {
    simulation: null,
    svgSel:     null,
    gMain:      null,
    zoomBehavior:null,
    linkSel:    null,
    nodeSel:    null,
    labelSel:   null,
    nodeGroups: null,
    gClusterBg: null,
    gVLaneBg:   null,
    gFixedHeaders:null,
    nodeClusterMap:  new Map(),
    clusterCentroids: [],
    nodeClusterLabel: new Map(),
    nodeData: [],
    currentScale: 1,
  },

  // ── Index view sort state ────────────────────────────────────────
  idx: {
    filter: null,  // vertical chip filter (independent of activeV)
    sortCol: null,
    sortDir: 1,
  },
};
```

**Before:** 20+ top-level `let` variables scattered across 1,200 lines.  
**After:** All mutable state lives in one named object. Any function can read `APP.actors`, any function can mutate `APP.hoveredId`. No hidden global state. Easy to serialize for debugging.

### Migration path from current monolith

**Step 1 — Extract CSS to `style.css` (30 min):** Copy `<style>` block verbatim. Add `<link rel="stylesheet" href="style.css">`. Delete `<style>` block. Test visually.

**Step 2 — Extract JS to `app.js` (1 hour):** Copy `<script>` block verbatim to `app.js`. Add `<script src="app.js"></script>`. Delete inline `<script>`. Test functionally.

**Step 3 — Introduce `APP` object (2 hours):** Replace each top-level `let ACTORS = []` etc. with an entry in `APP`. Use your editor's Find & Replace to update all references. E.g.: `ACTORS` → `APP.actors`, `activeV` → `APP.activeV`, `netLayout` → `APP.netLayout`. The D3 selections (`simulation`, `svgSel`, etc.) move to `APP.net.*`.

**Step 4 — Add section comments (30 min):** Add the `// ─── N. MODULE NAME ───` comments to delimit logical sections. These are cosmetic but dramatically improve navigability.

**Step 5 — Add JSDoc types (2 hours):** Add `@typedef` blocks for `Actor`, `RawEdge`, `Cluster`, `PoiEntry`. Annotate the most-called functions (`openPanel`, `renderIdx`, `initNet`, `adaptActor`). This is incremental — you don't need to annotate everything at once.

**Step 6 — Add `package.json` (15 min):**
```json
{
  "name": "playbook-ecosistema-mx",
  "version": "7.1.0",
  "private": true,
  "scripts": {
    "dev": "npx serve . -p 8080",
    "dev:py": "python3 -m http.server 8080"
  },
  "devDependencies": {
    "serve": "^14.0.0"
  }
}
```

**Step 7 — Optional: add ESLint (30 min):** `npx eslint --init` with `eslint-plugin-jsdoc`. Run `npx eslint app.js` to find undefined variable references.

**Total estimated time:** 1 day.

### How each current feature maps to the new architecture

Every single feature maps identically to the current implementation. There are zero behavior changes. The only differences are:

- All global `let` variables are now `APP.*` properties
- CSS is in `style.css` instead of `<style>`
- JS is in `app.js` instead of `<script>`
- The file is no longer a single file — it is three files

### Data layer
Unchanged. Same `fetch()` calls, same adaptation functions, same `APP.actors` array. The only change is the namespace: `ACTORS` becomes `APP.actors`.

### Development workflow

```bash
npm run dev   # starts serve on port 8080
# open http://localhost:8080
```

**Add a new actor:** Edit `actors.json`. Reload the page.  
**Add a new view:** Add HTML to `index.html`, add a JS section in `app.js` following the existing patterns.  
**Add a new vertical:** Add to `VX` in `app.js`, add sidebar HTML.

### Deployment
```bash
vercel --prod   # unchanged
```
No `vercel.json` needed.

### Offline behavior
Identical to the current monolith. Browser cache only.

### Honest tradeoffs

**Better than the monolith:**
- `APP.*` state is inspectable in the browser console: `APP.actors.length`, `APP.netLayout`, `APP.net.simulation.alpha()`
- Section comments + JSDoc make the file navigable in any editor with symbol search
- `package.json` gives new contributors a one-command onboarding (`npm run dev`)
- JSDoc types provide editor autocompletion without TypeScript compilation
- Git diffs are slightly more meaningful (a change to `renderIdx` is clearly in the Index section)
- Completable in a single day without risk of regressions

**Worse than the monolith:**
- `app.js` is still ~1,200 lines. A large function still touches many parts of `APP`. The separation is logical (comments), not physical (files).
- No tree-shaking, no code splitting, no HMR
- Testing is still manual — no unit test isolation because functions share the `APP` object
- Does not solve the fundamental issue that all code is still in one execution context

**What this requires from the team:**
- 4–8 hours of focused refactoring
- Discipline to always use `APP.*` and never re-introduce loose `let` globals

### Complexity score
- **Setup complexity:** 1/5
- **Learning curve:** 1/5
- **Ongoing maintenance burden:** 3/5 — same as monolith at the function level, but global state is more traceable

---

## Recommendation Matrix

Scoring 1 (worst) to 5 (best) per dimension.

| Dimension | P1 Vanilla Modules | P2 React+Vite | P3 SvelteKit | P4 Astro Islands | P5 Hardened Monolith |
|---|:---:|:---:|:---:|:---:|:---:|
| **Time to working locally** | 5 | 3 | 3 | 3 | 5 |
| **Maintainability in 12 months** | 3 | 4 | 4 | 3 | 3 |
| **Performance (initial load)** | 4 | 3 | 4 | 5 | 4 |
| **Developer experience** | 3 | 4 | 4 | 3 | 3 |
| **Fit for team size (1–3 people)** | 4 | 3 | 4 | 3 | 5 |
| **Risk of breaking existing behavior** | 2 | 3 | 3 | 3 | 5 |
| **Total** | **21** | **20** | **22** | **20** | **25** |
| **Verdict** | Clean separation without tooling, but module-graph discipline is manual and circular deps are invisible until runtime. Good for 1 developer who knows JS well. | Industry-standard choice with the best long-term ecosystem. The D3/React boundary requires a clear contract. Right choice if the team will grow or already uses React elsewhere. | Best-fit framework for this app: reactive stores map directly to the current global variables, and the compiler output is smallest. Best choice if the team is willing to learn Svelte. | Architectural elegance for content-heavy sites, but this is a fully interactive SPA behind a password gate — the deferred-JS advantage is minimal. Coordination overhead between static and island layers is real. | The lowest-risk, fastest path to a defensible codebase. Doesn't solve long-term scaling, but eliminates the most fragile aspects today. The right first step before committing to a framework. |

### Score rationale

**Time to working locally:** P1 and P5 score 5 because there is no `npm install`, no build step, and no new tooling. P2, P3, P4 require scaffolding, dependency installation, and a build step even for development.

**Maintainability in 12 months:** P2 and P3 score highest because component isolation enforced by the framework prevents the re-emergence of God-function patterns. P1 requires manual discipline to maintain module boundaries. P5 is still one large file.

**Performance (initial load):** P4 scores 5 — the static HTML shell + deferred D3 island is the fastest possible initial render. P3 scores 4 — Svelte's compiler output is smaller than React's runtime. P1 and P5 score 4 — no framework overhead, D3 is the only large dependency. P2 scores 3 — React adds ~45 KB to the bundle.

**Developer experience:** P2 and P3 score 4 — HMR, component isolation, typed props. P1 scores 3 — no HMR (full reload), but instant startup. P4 scores 3 — two mental models (Astro + inline scripts) make the codebase harder to reason about. P5 scores 3 — no HMR, but instant startup and zero context-switching.

**Fit for team size (1–3 people):** P5 scores 5 — no onboarding cost for a developer who already knows the codebase. P3 scores 4 — Svelte's minimal boilerplate suits small teams. P1 scores 4 — no build system to maintain. P2 and P4 score 3 — dependency management and framework learning curve are real costs for a 1–3 person team.

**Risk of breaking existing behavior:** P5 scores 5 — the migration is additive (rename variables, extract files). The D3 simulation code is never touched. P2, P3, P4 score 3 — the D3 black-box pattern is well-understood, but a mistake in the `useEffect`/`onMount` dependency array can break the simulation silently. P1 scores 2 — circular dependencies in the module graph can produce subtle initialization order bugs that are hard to diagnose without tooling.

---

## Final recommendation

**Start with P5 (Hardened Monolith) — complete it this week.** It eliminates the immediate fragility (scattered globals, no dev server script, no type hints) with the lowest risk of regression. It is completable in one day.

**Then choose either P1 or P3 as the next step.** If the team is comfortable staying framework-free, P1 (Vanilla ES Modules) extends P5 naturally — just move the IIFE sections into separate files. If the team wants reactive state and component isolation, P3 (SvelteKit) is the best fit: Svelte stores map directly to the `APP.*` properties introduced in P5, and the migration path from P5 → P3 is the most mechanical of any framework option.

**Avoid P4 (Astro Islands) for this specific app.** Astro's strengths are content-heavy sites with discrete interactive widgets. This app is a fully interactive SPA where almost every element responds to data. The deferred-JS benefit is negated by the password gate, and the coordination overhead between static Astro components and inline scripts is higher than either P1 or P3.

**P2 (React+Vite) is valid if the team already uses React elsewhere** and wants to standardize on one framework. The D3/React integration pattern (black-box ref) is well-documented and reliable. But for a 1–3 person team building this specific app, React's bundle overhead and hook complexity are costs without commensurate benefits over SvelteKit.
