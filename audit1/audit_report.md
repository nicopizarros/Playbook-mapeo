# Playbook Intelligence — UX Audit Report

**Date:** 2026-05-02
**Auditor:** Claude Code
**App URL:** https://playbook-mapeo.vercel.app
**App Version:** v7.1.0 · Build 2804

---

## Executive Summary

The Playbook Intelligence app is largely functional and visually polished. The login screen, Index view (191 actors), Briefings view (9 verticals with stats), and Clusters view (10 cards) all render correctly. The login flow is high quality — error message, shake animation, and sub-50 ms transition all work perfectly. The single highest-risk item for the client presentation is the **D3 network graph, which takes ~9 seconds to render in Chrome** — this blank period will look broken in front of a client unless a loading indicator is added. Two confirmed functional bugs were found: the actor side panel does not close when the user switches tabs (stale open state), and the bottom ticker element overflows horizontally at all viewports. Zero browser console errors were detected across the full session.

---

## Asset Health

| Path | HTTP | Size | Count / Expected | OK |
|------|------|------|------------------|----|
| `/actors.json` | 200 | 236.8 KB | 191 / 191 | ✓ |
| `/edges.json` | 200 | 63.6 KB | 127 / 127 | ✓ |
| `/poi.json` | 200 | 70.9 KB | 80 actor entries (121 total POI items) | ✓ |
| `/clusters.json` | 200 | 8.9 KB | 10 / 10 | ✓ |

> **Note:** Assets are served at the root path (`/actors.json`), not under `/data/actors.json` as originally documented. All four files are live and serving correct data.
>
> `poi.json` is a dictionary keyed by actor ID (80 entries); the 121 figure refers to total POI sub-items across all entries. The format is correct — the discrepancy is a documentation expectation, not a bug.

---

## 🔴 Critical Bugs
> These break functionality entirely.

| # | Location | Description | Steps to Reproduce | Console Error |
|---|----------|-------------|-------------------|---------------|
| 1 | Network view — initial render | D3 force graph takes ~9 seconds to render in Chrome. The SVG is empty on load and fills gradually. No loading indicator exists during this window. | Load page → enter password → observe blank white SVG area for 6–9 seconds | None (silent failure — no spinner) |
| 2 | Side panel — tab switch | Actor side panel retains `.open` class and transform state after switching views. A panel opened in Index remains in open state (CSS) when the user switches to Briefings or Clusters. | Index view → click any row → panel opens for "Club América" → click "Briefings" tab → `#idx-panel` still has `class="actor-panel open"` | None |

---

## 🟡 UX Issues
> These degrade the experience but do not break it.

| # | Location | Description | Impact | Recommendation |
|---|----------|-------------|--------|----------------|
| 1 | Ticker — all viewports | `#tk-track.ticker-scroll` overflows its container horizontally at 1280px, 768px, and 375px | Ticker extends past viewport edge; may cause horizontal scroll bleed | Set `overflow: hidden` on `.ticker-scroll`; verify `#tk-track` uses `width: max-content` only inside a clipping parent |
| 2 | Network view — layout overflow | `div.view-wrap` and `#view-network` report `scrollWidth > viewportWidth` at 1280px and 375px | May cause unexpected horizontal scroll in the main canvas area | Audit `.view-wrap` width rule; ensure SVG container uses `overflow: hidden` not default |
| 3 | Escape key — panel close | Pressing Escape does not close an open side panel. The `closeP()` function exists but is only wired to the ✕ button click | Keyboard users (and power users) cannot dismiss the panel without clicking ✕ | Add `document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllPanels(); })` |
| 4 | Network graph — slow initial render (~9s) | After login, the D3 force simulation takes approximately 9 seconds to populate `#net-svg` with nodes and edges. No visual feedback exists during this delay. | First impression for client will be a blank network area | Add a loading spinner or progress bar that clears once `#net-svg circle` count > 0 |
| 5 | Index view — filter state bleeds across views | When a vertical filter (e.g. V1) is activated in the Network sidebar, the Index view only shows the filtered subset (31 actors) instead of all 191. The counter correctly shows "31 actores" but this is unintuitive if the user doesn't recall setting a filter | User may think actors are missing | Show an active-filter badge in Index bar, or scope sidebar filters to the Network view only |
| 6 | Briefings — Tier 1 card selector | Tier 1 actor cards in the Briefings view use class `.bac` inside `.b-grid`. This class name gives no semantic hint of its purpose. | Minor developer ergonomics; no user-facing impact | Consider renaming `.bac` → `.bv-actor-card` for maintainability |

---

## 🟢 Positive Findings
> What works well and should be preserved.

- Login screen design is visually excellent — animated canvas background, classification labels, and countdown styling create strong first impression
- Wrong-password error message `"CLAVE INCORRECTA — ACCESO DENEGADO"` displays correctly and immediately
- `#pw-in` shake animation fires on wrong password — clear, tactile feedback
- Login transition to main UI completes in **46 ms** — instant feel
- Correct password confirmed: `playbook2026` unlocks app successfully
- D3 loads on `window.d3` — library is globally accessible
- Google Fonts link present and loaded
- Network layout buttons (`#nlb-red`, `#nlb-clusters`, `#nlb-verticales`) all work and activate correctly
- Tooltip DOM fully built: `#net-tt`, `#tt-n`, `#tt-v`, `#tt-r` all present
- Search input `#srch` correctly filters: typing "América" highlights 142 nodes and fades 186
- Zoom controls (3 `.net-cb` buttons: +, −, ⌖) all present and clickable
- Sidebar vertical filters V1–V9 all present with correct IDs (`#sv-V1` → `#sv-V9`)
- Hamburger `#menu-toggle` is visible at 375px and opens sidebar correctly
- Sidebar closes and backdrop overlay clears correctly
- Index table renders **all 191 actor rows** when no filter is active
- Index table has 7 columns with `onclick` sort handlers — ascending/descending sort confirmed working (Club América ↔ Selección Mexicana de Fútbol)
- Clicking an index row opens `#idx-panel` and populates it with actor name ("Club América" confirmed)
- All 9 Briefings vertical nav pills (`.bn-item`) present and switch content correctly
- All 9 Briefing verticals render correct title text (V1=PROPIEDADES through V9=CAPITAL) and stat counts (11 Tier 1 per vertical)
- Clusters view renders **all 10 `.cl-card` elements** — first card "OLLAMANI-GENERAL ATLANTIC" confirmed
- Cluster cards have colored top border and correct layout
- Ticker `#tk-track` is populated with **160 signal items**
- Rapid tab switching (5 rounds × 4 tabs = 20 switches) produces **zero console errors**
- **Zero console errors or warnings detected** across the entire audit session

---

## Performance Report

| Metric | Value | Assessment |
|--------|-------|------------|
| Page load (to login screen) | 1,173 ms | ✓ Excellent |
| Login to main UI visible | 46 ms | ✓ Excellent |
| D3 network graph fully rendered | ~9,000 ms | ✗ Too slow for a demo — needs loading state |
| Index view render (tab click to rows) | 2,319 ms | ⚠ Acceptable |
| Briefings render | 2,336 ms | ⚠ Acceptable |
| Clusters render (incl. 4s wait) | 6,326 ms | ⚠ Includes mandated 4s wait |
| Asset fetch — actors.json (236 KB) | 372 ms | ✓ Good |
| Asset fetch — edges.json (64 KB) | 303 ms | ✓ Good |
| Asset fetch — poi.json (71 KB) | 248 ms | ✓ Good |
| Asset fetch — clusters.json (9 KB) | 297 ms | ✓ Good |

---

## Console Errors Log

| Error | Source | Line | View |
|-------|--------|------|------|
| No console errors or warnings detected across entire session | — | — | All views |

---

## Responsive Design Report

| Viewport | Issues Found |
|----------|-------------|
| 1280px | `div.view-wrap` and `#view-network` overflow viewport width; `div.ticker-scroll` overflows |
| 768px | `div.ticker-scroll` and `#tk-track.ticker-track` overflow; hamburger visible (✓ correct) |
| 375px | `div.view-wrap`, `#view-network`, and `div.ticker-scroll` all overflow; hamburger visible and opens sidebar (✓ correct) |

---

## Recommended Fixes — Priority Order
> Ordered by impact. Do not implement — for developer review only.

1. **[Critical — do before presentation]** Add a loading indicator to the Network view that displays during the ~9-second D3 initialization window. A spinner or "Cargando red..." overlay on `#net-svg-wrap` would prevent the blank-screen perception. Remove it once `#net-svg circle` count > 0 or via a D3 simulation `end` callback.

2. **[Critical — do before presentation]** Close all panels on tab switch. In `switchView()`, call `closeP()` (or a `closeAllPanels()` wrapper) before changing view display. Prevents the `actor-panel open` class persisting on `#idx-panel`, `#br-panel`, etc. after the user navigates away.

3. **[High]** Fix `#tk-track` / `.ticker-scroll` horizontal overflow at all viewports. Add `overflow: hidden` to `.ticker-scroll` and ensure the animation stays fully inside its clipping container.

4. **[High]** Fix `div.view-wrap` / `#view-network` overflow at 1280px and 375px. Audit the width rule on `.view-wrap` — likely `width: 100vw` or unconstrained flex child — and add `overflow: hidden` to the SVG wrapper.

5. **[Medium]** Add keyboard Escape support for closing panels. Wire `document.addEventListener('keydown', ...)` to `closeP()` so keyboard users can dismiss the actor panel without reaching for the ✕ button.

6. **[Low]** Display an active-filter indicator in the Index bar when a vertical filter from the sidebar is in effect. This prevents users from thinking actors are missing when the view is scoped.

7. **[Low]** Review `.bac` class name in Briefings — rename to `.bv-actor-card` for semantic clarity and easier future maintenance.

---

## Screenshots Index

| File | Description |
|------|-------------|
| `audit/audit_01_load.png` | Login screen — initial page load |
| `audit/audit_02_login.png` | Main UI — immediately after correct password |
| `audit/audit_03_network_default.png` | Network view — SVG rendered with 268 nodes |
| `audit/audit_04_node_panel.png` | Network view — side panel closed state (transform off-screen) |
| `audit/audit_05_layout_clusters.png` | Network — Clusters layout active |
| `audit/audit_06_layout_verticales.png` | Network — Verticales layout active |
| `audit/audit_07_mobile_375.png` | Network view — 375px mobile with sidebar open |
| `audit/audit_08_index_full.png` | Index view — 191 actors (no filter) |
| `audit/audit_09_index_sorted.png` | Index — sorted by Actor column (descending) |
| `audit/audit_10_index_filtered.png` | Index — search "BBVA" active |
| `audit/audit_11_briefings.png` | Briefings — V1 Propiedades active |
| `audit/audit_12_clusters_full.png` | Clusters de Poder — all 10 cards |
| `audit/audit_13_cluster_card_detail.png` | Cluster card — OLLAMANI-GENERAL ATLANTIC detail |
| `audit/audit_14_edge_cases.png` | Stress test state — after 5-round tab switching |
| `audit/audit_15_1280px.png` | Viewport 1280px — desktop layout |
| `audit/audit_16_768px.png` | Viewport 768px — tablet layout |
| `audit/audit_17_375px.png` | Viewport 375px — mobile layout |
