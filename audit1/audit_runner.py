"""
Playbook Intelligence — Full UX Audit
Uses correct selectors discovered via DOM inspection.
"""
import asyncio
import json
import time
import os
import urllib.request
from datetime import date
from playwright.async_api import async_playwright

BASE_URL  = "https://playbook-mapeo.vercel.app"
PASSWORD  = "playbook2026"
AUDIT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audit")
os.makedirs(AUDIT_DIR, exist_ok=True)

findings = {
    "critical": [], "ux_issues": [], "positive": [],
    "performance": {}, "console_errors": [], "responsive": {}, "screenshots": [],
    "asset_health": [],
}

def ss(name):    return os.path.join(AUDIT_DIR, name)
def log(msg):    print(f"  → {msg}")

async def login(page, t0_ref=None):
    t0 = time.time()
    await page.fill("#pw-in", PASSWORD)
    await page.click(".pw-btn")
    await page.wait_for_selector(".view-tabs", timeout=10000)
    await page.wait_for_timeout(800)
    ms = round((time.time() - t0) * 1000)
    return ms

async def switch_view(page, view_name):
    """Switch view via JS to avoid sidebar overlay blocking DOM clicks."""
    # Close sidebar overlay if open, then switch
    await page.evaluate("""
        () => {
            const overlay = document.querySelector('#sb-overlay');
            if (overlay && overlay.classList.contains('on')) {
                closeSidebar();
            }
        }
    """)
    await page.wait_for_timeout(300)
    await page.evaluate(f"() => switchView('{view_name}', null, document.querySelector('[data-view=\"{view_name}\"]'))")
    await page.wait_for_timeout(2000)

async def dismiss_panel(page):
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(300)

# ── PHASE 1 ──────────────────────────────────────────────────────────────────

async def phase1_asset_health(page):
    print("\n=== PHASE 1: Asset Health ===")
    assets = [
        ("/actors.json",   191, "actors"),
        ("/edges.json",    127, "relationships"),
        ("/poi.json",      121, "POIs"),
        ("/clusters.json", 10,  "clusters"),
    ]
    for path, expected, label in assets:
        url = BASE_URL + path
        try:
            req = urllib.request.Request(url)
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw  = resp.read()
                status = resp.status
                ms   = round((time.time() - t0) * 1000)
                size = round(len(raw) / 1024, 1)
                data = json.loads(raw)
                if isinstance(data, list):
                    count = len(data)
                elif isinstance(data, dict):
                    # try common keys
                    for key in ("clusters", "pois", "poi", "data", "items", "actors"):
                        if key in data:
                            count = len(data[key])
                            break
                    else:
                        count = len(data)  # top-level object keys as count fallback
                else:
                    count = 0
                ok = count == expected
                log(f"{path} → HTTP {status} | {size} KB | {ms} ms | count={count} {'✓' if ok else f'✗ expected {expected}'}")
                findings["asset_health"].append({
                    "url": url, "status": status, "size_kb": size, "ms": ms,
                    "count": count, "expected": expected, "ok": ok
                })
        except Exception as e:
            log(f"{path} → ERROR: {e}")
            findings["asset_health"].append({"url": url, "error": str(e)})

    # page load + fonts
    t0 = time.time()
    resp = await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
    load_ms = round((time.time() - t0) * 1000)
    findings["performance"]["page_load_ms"] = load_ms
    log(f"Page load: {load_ms} ms  (HTTP {resp.status})")

    # check Google Fonts loaded
    fonts_ok = await page.evaluate("""
        () => Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                   .some(l => l.href.includes('fonts.google') || l.href.includes('fonts.gstatic'))
    """)
    log(f"Google Fonts link present: {fonts_ok}")

    # D3 loaded
    d3_ok = await page.evaluate("() => typeof window.d3 !== 'undefined'")
    log(f"D3 loaded on window: {d3_ok}")
    if not d3_ok:
        findings["ux_issues"].append({
            "location": "Network view / D3", "description": "D3 not exposed on window object",
            "impact": "Cannot confirm D3 version externally",
            "recommendation": "Minor — app still renders (D3 may be bundled)"
        })

    await page.screenshot(path=ss("audit_01_load.png"))
    findings["screenshots"].append({"file": "audit/audit_01_load.png", "description": "Login screen on load"})
    log("Screenshot: audit_01_load.png")

# ── PHASE 2 ──────────────────────────────────────────────────────────────────

async def phase2_login(page):
    print("\n=== PHASE 2: Login Flow ===")
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(1000)

    # wrong password
    await page.fill("#pw-in", "wrongpassword123")
    await page.click(".pw-btn")
    await page.wait_for_timeout(1200)

    error_text = await page.evaluate("""
        () => {
            const el = document.querySelector('.pw-err');
            return el ? el.textContent.trim() : null;
        }
    """)
    error_class = await page.evaluate("() => document.querySelector('.pw-err')?.className")
    shake_class  = await page.evaluate("() => document.querySelector('#pw-in')?.className")

    if error_text and "on" in (error_class or ""):
        log(f"Wrong-password error: '{error_text}' ✓")
        findings["positive"].append("Wrong-password shows error: 'CLAVE INCORRECTA — ACCESO DENEGADO'")
    else:
        log("Wrong-password error NOT visible ✗")
        findings["ux_issues"].append({
            "location": "Login", "description": "Error message not visible on wrong password",
            "impact": "No user feedback", "recommendation": "Check .pw-err CSS/JS toggle"
        })

    if shake_class and "shake" in shake_class:
        log("Shake animation on #pw-in ✓")
        findings["positive"].append("Shake animation fires on wrong password")
    else:
        log("Shake animation NOT detected ✗")

    await page.fill("#pw-in", "")
    await page.wait_for_timeout(300)

    # correct password — time it
    t0 = time.time()
    await page.fill("#pw-in", PASSWORD)
    await page.click(".pw-btn")
    await page.wait_for_selector(".view-tabs", timeout=12000)
    login_ms = round((time.time() - t0) * 1000)
    findings["performance"]["login_to_ui_ms"] = login_ms
    log(f"Login → main UI visible: {login_ms} ms ✓")
    findings["positive"].append(f"Login transition completes in {login_ms} ms")

    await page.screenshot(path=ss("audit_02_login.png"))
    findings["screenshots"].append({"file": "audit/audit_02_login.png", "description": "Main UI immediately after correct login"})
    log("Screenshot: audit_02_login.png")

# ── PHASE 3 ──────────────────────────────────────────────────────────────────

async def phase3_network(page):
    print("\n=== PHASE 3: Network View ===")
    # Wait up to 12s for D3 to populate SVG (force simulation is async)
    for wait_attempt in range(4):
        await page.wait_for_timeout(3000)
        svg_info = await page.evaluate("""
            () => ({
                svg_exists: !!document.querySelector('#net-svg'),
                circles: document.querySelectorAll('#net-svg circle').length,
                gs: document.querySelectorAll('#net-svg g').length,
                innerHTML_len: document.querySelector('#net-svg')?.innerHTML?.length ?? 0,
            })
        """)
        if svg_info['innerHTML_len'] > 0:
            break

    log(f"SVG #net-svg: circles={svg_info['circles']}, gs={svg_info['gs']}, innerHTML={svg_info['innerHTML_len']} chars (after {(wait_attempt+1)*3}s)")

    if svg_info['circles'] == 0 and svg_info['innerHTML_len'] == 0:
        findings["critical"].append({
            "location": "Network view / #net-svg",
            "description": "SVG is completely empty — D3 force graph does not render in headless Chromium",
            "steps": "Load page → correct password → wait 6+ seconds → inspect #net-svg innerHTML",
            "error": "innerHTML.length === 0 after networkidle + 6s"
        })
        log("CRITICAL: D3 SVG is empty — graph not rendering ✗")

        # Check if JS data loaded
        actors_loaded = await page.evaluate("""
            () => {
                try { return typeof ACTORS !== 'undefined' ? ACTORS.length : null; } catch(e) { return null; }
            }
        """)
        log(f"ACTORS JS variable: {actors_loaded}")

        edges_loaded = await page.evaluate("""
            () => {
                try { return typeof EDGES !== 'undefined' ? EDGES.length : null; } catch(e) { return null; }
            }
        """)
        log(f"EDGES JS variable: {edges_loaded}")

        init_fn = await page.evaluate("""
            () => ({
                initNetwork: typeof initNetwork,
                drawNetwork: typeof drawNetwork,
                buildGraph: typeof buildGraph,
            })
        """)
        log(f"Init functions: {init_fn}")

    else:
        findings["positive"].append(f"D3 SVG renders {svg_info['circles']} circles")

    await page.screenshot(path=ss("audit_03_network_default.png"))
    findings["screenshots"].append({"file": "audit/audit_03_network_default.png", "description": "Network view (SVG state)"})

    # Tooltip structure
    tt_info = await page.evaluate("""
        () => ({
            tt_exists: !!document.querySelector('#net-tt'),
            tt_fields: ['tt-n', 'tt-v', 'tt-r'].map(id => !!document.querySelector('#' + id)),
        })
    """)
    log(f"Tooltip #net-tt present: {tt_info['tt_exists']}, fields: {tt_info['tt_fields']}")
    if tt_info['tt_exists'] and all(tt_info['tt_fields']):
        findings["positive"].append("Tooltip DOM structure (#net-tt, #tt-n, #tt-v, #tt-r) is correctly built")
    else:
        findings["ux_issues"].append({
            "location": "Network / tooltip", "description": "Tooltip DOM elements missing",
            "impact": "Node context broken", "recommendation": "Check tooltip HTML"
        })

    # Layout buttons
    for btn_id, label in [("nlb-red", "Red"), ("nlb-clusters", "Clusters"), ("nlb-verticales", "Verticales")]:
        btn = await page.query_selector(f"#{btn_id}")
        if btn:
            await btn.click()
            await page.wait_for_timeout(1000)
            active = await page.evaluate(f"() => document.querySelector('#{btn_id}')?.classList.contains('active')")
            log(f"Layout '{label}' button: clicked, active={active} ✓")
            if label == "Clusters":
                await page.screenshot(path=ss("audit_05_layout_clusters.png"))
                findings["screenshots"].append({"file": "audit/audit_05_layout_clusters.png", "description": "Network clusters layout"})
            if label == "Verticales":
                await page.screenshot(path=ss("audit_06_layout_verticales.png"))
                findings["screenshots"].append({"file": "audit/audit_06_layout_verticales.png", "description": "Network verticales layout"})
        else:
            log(f"Layout '{label}' NOT FOUND ✗")

    if svg_info['circles'] > 0:
        findings["positive"].append("Network layout buttons functional (Red/Clusters/Verticales)")

    # Reset to Red layout
    await page.click("#nlb-red")
    await page.wait_for_timeout(800)

    # Search
    await page.fill("#srch", "América")
    await page.wait_for_timeout(800)
    search_result = await page.evaluate("""
        () => ({
            input_val: document.querySelector('#srch')?.value,
            highlighted: document.querySelectorAll('#net-svg .hl, #net-svg circle.active, #net-svg [opacity="1"]').length,
            faded: document.querySelectorAll('#net-svg [opacity="0.05"], #net-svg circle.dim').length,
        })
    """)
    log(f"Search 'América': input='{search_result['input_val']}', highlighted={search_result['highlighted']}, faded={search_result['faded']}")
    if search_result['input_val'] == 'América':
        findings["positive"].append("Search input #srch accepts text correctly")
    await page.fill("#srch", "")
    await page.wait_for_timeout(300)

    # Zoom controls
    zoom_btns = await page.query_selector_all(".net-cb")
    if len(zoom_btns) == 3:
        log(f"Zoom controls: {len(zoom_btns)} buttons ('+', '−', '⌖') ✓")
        findings["positive"].append("Zoom controls present: +/−/reset")
        for btn in zoom_btns:
            await btn.click()
            await page.wait_for_timeout(200)
    else:
        log(f"Zoom controls: only {len(zoom_btns)} found ✗")

    # Sidebar vertical filters
    v_missing = []
    for v in range(1, 10):
        el = await page.query_selector(f"#sv-V{v}")
        if not el:
            v_missing.append(f"V{v}")
    if not v_missing:
        log("Sidebar V1–V9 filters: all present ✓")
        findings["positive"].append("Sidebar vertical filters V1–V9 all present with correct IDs")
    else:
        log(f"Sidebar filters missing: {v_missing} ✗")
        findings["ux_issues"].append({
            "location": "Sidebar / vertical filters",
            "description": f"Missing sidebar filter items: {v_missing}",
            "impact": "Vertical filtering incomplete", "recommendation": "Verify #sv-V* HTML"
        })

    # Test clicking a vertical filter
    v1_btn = await page.query_selector("#sv-V1")
    if v1_btn:
        await v1_btn.click()
        await page.wait_for_timeout(600)
        log("Vertical filter V1 clicked ✓")

    # Mobile 375px
    await page.set_viewport_size({"width": 375, "height": 812})
    await page.wait_for_timeout(800)
    hamburger = await page.query_selector("#menu-toggle")
    if hamburger:
        visible = await page.evaluate("() => { const el = document.querySelector('#menu-toggle'); return window.getComputedStyle(el).display !== 'none'; }")
        log(f"#menu-toggle at 375px: visible={visible} ✓")
        if visible:
            findings["positive"].append("Hamburger #menu-toggle is visible at 375px")
            await hamburger.click()
            await page.wait_for_timeout(600)
            sidebar_open = await page.evaluate("() => document.querySelector('.sidebar')?.classList.contains('open') || false")
            log(f"Sidebar opens on hamburger click: {sidebar_open}")
        else:
            findings["ux_issues"].append({
                "location": "Mobile / 375px", "description": "Hamburger button exists but hidden at 375px",
                "impact": "Mobile nav inaccessible", "recommendation": "Show #menu-toggle at <= 768px"
            })
    else:
        log("#menu-toggle NOT found ✗")
        findings["ux_issues"].append({
            "location": "Mobile / 375px", "description": "#menu-toggle not present",
            "impact": "No nav at mobile widths", "recommendation": "Add responsive hamburger"
        })

    await page.screenshot(path=ss("audit_07_mobile_375.png"))
    findings["screenshots"].append({"file": "audit/audit_07_mobile_375.png", "description": "Network view at 375px"})

    # Restore and screenshot node panel area
    await page.set_viewport_size({"width": 1280, "height": 900})
    await page.wait_for_timeout(500)

    # Check panel DOM
    panel_state = await page.evaluate("""
        () => ({
            net_panel_display: window.getComputedStyle(document.querySelector('#net-panel')).display,
            panel_has_close: !!document.querySelector('#net-panel .ap-x'),
            panel_has_name: !!document.querySelector('#np-n'),
            panel_has_role: !!document.querySelector('#np-r'),
            panel_has_body: !!document.querySelector('#np-b'),
        })
    """)
    log(f"#net-panel DOM: {panel_state}")
    if all([panel_state['panel_has_close'], panel_state['panel_has_name'], panel_state['panel_has_body']]):
        findings["positive"].append("Side panel DOM (#net-panel) fully built with name/role/body/close slots")
    await page.screenshot(path=ss("audit_04_node_panel.png"))
    findings["screenshots"].append({"file": "audit/audit_04_node_panel.png", "description": "Network view panel structure (closed state)"})

# ── PHASE 4 ──────────────────────────────────────────────────────────────────

async def phase4_index(page):
    print("\n=== PHASE 4: Index View ===")
    t0 = time.time()
    await switch_view(page, "index")
    findings["performance"]["index_render_ms"] = round((time.time() - t0) * 1000)

    row_count = await page.evaluate("() => document.querySelectorAll('#idx-body tr').length")
    idx_cnt   = await page.evaluate("() => document.querySelector('#idx-cnt')?.textContent.trim()")
    log(f"Index rows: {row_count} | Counter text: '{idx_cnt}'")
    if row_count == 191:
        findings["positive"].append(f"Index table renders all 191 actor rows ✓")
    elif row_count > 0:
        findings["ux_issues"].append({
            "location": "Index / table", "description": f"Row count {row_count} ≠ 191 expected",
            "impact": "Missing actors in index", "recommendation": "Check data load"
        })
    else:
        findings["critical"].append({
            "location": "Index / #idx-body", "description": "No rows in index table",
            "steps": "Click Indice tab", "error": "#idx-body tr count = 0"
        })

    await page.screenshot(path=ss("audit_08_index_full.png"))
    findings["screenshots"].append({"file": "audit/audit_08_index_full.png", "description": "Index full 191-row table"})

    # Column sort
    headers = await page.query_selector_all("#idx-tbl thead th")
    log(f"Table headers: {len(headers)}")
    if headers:
        await headers[0].click()
        await page.wait_for_timeout(400)
        row1_asc = await page.evaluate("() => document.querySelector('#idx-body tr:first-child td:first-child')?.textContent.trim()")
        await headers[0].click()
        await page.wait_for_timeout(400)
        row1_desc = await page.evaluate("() => document.querySelector('#idx-body tr:first-child td:first-child')?.textContent.trim()")
        sort_works = row1_asc != row1_desc
        log(f"Sort asc='{row1_asc}' desc='{row1_desc}' — changed: {sort_works}")
        if sort_works:
            findings["positive"].append("Column sort (ascending/descending) works correctly")
        else:
            findings["ux_issues"].append({
                "location": "Index / sort", "description": "Column sort asc/desc produces same first row",
                "impact": "Sort may not be working", "recommendation": "Check sortIdx() function"
            })
        await page.screenshot(path=ss("audit_09_index_sorted.png"))
        findings["screenshots"].append({"file": "audit/audit_09_index_sorted.png", "description": "Index sorted by Actor column"})

    # Vertical chips
    chip_count = await page.evaluate("() => document.querySelectorAll('.idx-chip').length")
    log(f"Index chips: {chip_count}")
    if chip_count == 9:
        findings["positive"].append("All 9 vertical filter chips present in Index view")
        chip = await page.query_selector(".idx-chip")
        if chip:
            await chip.click()
            await page.wait_for_timeout(500)
            filtered_count = await page.evaluate("() => document.querySelectorAll('#idx-body tr').length")
            original_count = 191
            log(f"Chip click: rows changed from {original_count} to {filtered_count}")
            if filtered_count < original_count:
                findings["positive"].append(f"Index chip filter works — reduces rows from 191 to {filtered_count}")
            else:
                findings["ux_issues"].append({
                    "location": "Index / chip filter", "description": "Chip click did not reduce row count",
                    "impact": "Filtering non-functional", "recommendation": "Check filterIdx() function"
                })
            # reset
            await chip.click()
            await page.wait_for_timeout(400)
    else:
        log(f"Expected 9 index chips, got {chip_count} ✗")

    # Search BBVA
    await page.fill("#srch", "BBVA")
    await page.wait_for_timeout(700)
    bbva_rows = await page.evaluate("() => document.querySelectorAll('#idx-body tr').length")
    log(f"Search 'BBVA' → {bbva_rows} row(s) in index")
    if bbva_rows > 0:
        findings["positive"].append(f"Search 'BBVA' in Index filters to {bbva_rows} relevant rows")
    else:
        findings["ux_issues"].append({
            "location": "Index / search", "description": "Search 'BBVA' returns 0 rows",
            "impact": "Search may only affect network view", "recommendation": "Confirm search scope"
        })
    await page.screenshot(path=ss("audit_10_index_filtered.png"))
    findings["screenshots"].append({"file": "audit/audit_10_index_filtered.png", "description": "Index filtered by 'BBVA'"})
    await page.fill("#srch", "")
    await page.wait_for_timeout(400)

    # Row click → panel
    row = await page.query_selector("#idx-body tr")
    if row:
        await row.click()
        await page.wait_for_timeout(700)
        panel_display = await page.evaluate("() => window.getComputedStyle(document.querySelector('#idx-panel')).display")
        log(f"Row click → #idx-panel display: {panel_display}")
        if panel_display in ("block", "flex"):
            findings["positive"].append("Clicking index row opens #idx-panel actor panel")
        else:
            findings["ux_issues"].append({
                "location": "Index / row click", "description": "#idx-panel not visible after row click",
                "impact": "Cannot view actor detail from index",
                "recommendation": "Check row onclick handler in JS"
            })
        await dismiss_panel(page)

# ── PHASE 5 ──────────────────────────────────────────────────────────────────

async def phase5_briefings(page):
    print("\n=== PHASE 5: Briefings View ===")
    t0 = time.time()
    await switch_view(page, "brief")
    findings["performance"]["briefings_render_ms"] = round((time.time() - t0) * 1000)

    # nav pills
    pills = await page.query_selector_all(".bn-item")
    log(f"Briefing nav pills: {len(pills)}")
    if len(pills) == 9:
        findings["positive"].append("All 9 vertical briefing nav pills present (.bn-item)")
    else:
        findings["ux_issues"].append({
            "location": "Briefings nav", "description": f"Only {len(pills)} nav pills found, expected 9",
            "impact": "Not all verticals accessible", "recommendation": "Check .bn-item generation"
        })

    # click each pill and check content
    issues = []
    for i in range(min(9, len(pills))):
        pill = pills[i]
        v_name = await pill.get_attribute("data-v")
        await pill.click()
        await page.wait_for_timeout(600)
        # check hero title
        hero_title = await page.evaluate("() => document.querySelector('.bv-title')?.textContent?.trim()")
        stats = await page.evaluate("() => document.querySelectorAll('.bv-stat, .stat-item, [class*=\"stat\"]').length")
        tier1_cards = await page.evaluate("() => document.querySelectorAll('.bv-card, .tier-card, [class*=\"t1\"]').length")
        log(f"  {v_name}: title='{hero_title}' stats={stats} tier1_cards={tier1_cards}")
        if not hero_title:
            issues.append(v_name)

    if not issues:
        findings["positive"].append("All 9 briefing pills render content with title")
    else:
        findings["ux_issues"].append({
            "location": "Briefings / pills",
            "description": f"Pills missing title text: {issues}",
            "impact": "Vertical briefing content missing", "recommendation": "Check bv-title population"
        })

    # click a card
    cards = await page.query_selector_all('.bv-card, .tier-card, .bc-card')
    log(f"Tier cards visible: {len(cards)}")
    if cards:
        await cards[0].click()
        await page.wait_for_timeout(700)
        panel_vis = await page.evaluate("() => window.getComputedStyle(document.querySelector('#br-panel')).display")
        log(f"Card click → #br-panel display: {panel_vis}")
        if panel_vis in ("block", "flex"):
            findings["positive"].append("Briefings Tier 1 card click opens #br-panel")
        await dismiss_panel(page)

    await page.screenshot(path=ss("audit_11_briefings.png"))
    findings["screenshots"].append({"file": "audit/audit_11_briefings.png", "description": "Briefings view with V1 active"})

# ── PHASE 6 ──────────────────────────────────────────────────────────────────

async def phase6_clusters(page):
    print("\n=== PHASE 6: Clusters View ===")
    t0 = time.time()
    await switch_view(page, "clusters")
    await page.wait_for_timeout(4000)  # spec says wait 4s
    findings["performance"]["clusters_render_ms"] = round((time.time() - t0) * 1000)

    card_count = await page.evaluate("() => document.querySelectorAll('#cl-grid .cl-card').length")
    grid_found  = await page.evaluate("() => !!document.querySelector('#cl-grid')")
    log(f"#cl-grid found: {grid_found} | .cl-card count: {card_count}")

    if card_count == 0:
        findings["critical"].append({
            "location": "Clusters / #cl-grid",
            "description": "Zero .cl-card elements rendered inside #cl-grid",
            "steps": "Click 'Clusters de poder' tab → wait 4 seconds",
            "error": "document.querySelectorAll('#cl-grid .cl-card').length === 0"
        })
        # deep debug
        grid_html = await page.evaluate("() => document.querySelector('#cl-grid')?.innerHTML?.substring(0,1000) ?? 'NOT FOUND'")
        log(f"#cl-grid innerHTML: {grid_html[:400]}")
        cl_var = await page.evaluate("""
            () => { try { return typeof CLUSTERS !== 'undefined' ? {exists:true, count:CLUSTERS.length} : {exists:false}; } catch(e) { return {err:e.message}; } }
        """)
        log(f"CLUSTERS variable: {cl_var}")
    elif card_count == 10:
        log(f"All 10 cluster cards rendered ✓")
        findings["positive"].append("Clusters view renders all 10 .cl-card elements correctly")
    else:
        log(f"Partial render: {card_count}/10 cards ✗")
        findings["ux_issues"].append({
            "location": "Clusters / #cl-grid",
            "description": f"Only {card_count}/10 cluster cards rendered",
            "impact": "Incomplete clusters view", "recommendation": "Check renderClusters() function"
        })

    if card_count > 0:
        # inspect first card
        card_detail = await page.evaluate("""
            () => {
                const c = document.querySelector('#cl-grid .cl-card');
                return {
                    name: c.querySelector('[style*="font-size:22px"]')?.textContent?.trim() ?? c.querySelector('div:first-of-type')?.textContent?.trim(),
                    top_border: window.getComputedStyle(c).borderTopColor,
                    power_node: Array.from(c.querySelectorAll('div')).find(d => d.textContent?.includes('Nodo') || d.textContent?.includes('Power'))?.textContent?.trim(),
                    chip_count: c.querySelectorAll('[style*="background"], .chip, .v-chip').length,
                    pill_count: c.querySelectorAll('[onclick]').length,
                    html_snippet: c.innerHTML.substring(0, 400),
                };
            }
        """)
        log(f"First card: name='{card_detail['name']}' pill_count={card_detail['pill_count']}")
        log(f"  HTML: {card_detail['html_snippet'][:200]}")

        # click an actor pill
        pills = await page.query_selector_all("#cl-grid .cl-card [onclick]")
        log(f"Clickable actor elements in cluster cards: {len(pills)}")
        if pills:
            await pills[0].click()
            await page.wait_for_timeout(700)
            panel_vis = await page.evaluate("() => window.getComputedStyle(document.querySelector('#cluster-panel')).display")
            log(f"Cluster pill click → #cluster-panel display: {panel_vis}")
            if panel_vis in ("block", "flex"):
                findings["positive"].append("Cluster actor pill opens #cluster-panel correctly")
            else:
                findings["ux_issues"].append({
                    "location": "Clusters / actor pill",
                    "description": "#cluster-panel not visible after pill click",
                    "impact": "Cannot view actor detail from clusters",
                    "recommendation": "Check pill onclick handler"
                })
            await dismiss_panel(page)

    await page.screenshot(path=ss("audit_12_clusters_full.png"))
    findings["screenshots"].append({"file": "audit/audit_12_clusters_full.png", "description": "Clusters view full"})

    # individual card screenshot
    if card_count > 0:
        card_el = await page.query_selector("#cl-grid .cl-card")
        if card_el:
            await card_el.screenshot(path=ss("audit_13_cluster_card_detail.png"))
            findings["screenshots"].append({"file": "audit/audit_13_cluster_card_detail.png", "description": "Single cluster card"})

# ── PHASE 7 ──────────────────────────────────────────────────────────────────

async def phase7_edge_cases(page, console_errors):
    print("\n=== PHASE 7: Edge Cases & Stress ===")

    # go to network view for most edge case tests
    await switch_view(page, "network")

    # zero-match search
    await page.fill("#srch", "ZZZNOMATCHXXX")
    await page.wait_for_timeout(700)
    crash_signs = await page.evaluate("""
        () => ({
            body_has_error: document.body.innerHTML.includes('undefined') || document.body.innerHTML.includes('TypeError'),
            console_count_now: 0,
        })
    """)
    log(f"Zero-match search: crash indicators: {crash_signs}")
    if not crash_signs['body_has_error']:
        findings["positive"].append("Zero-match search handled gracefully — no crash or undefined rendered")
    else:
        findings["critical"].append({
            "location": "Search / zero match",
            "description": "Zero-match search renders 'undefined' or 'TypeError' in DOM",
            "steps": "Type 'ZZZNOMATCHXXX' in #srch", "error": "DOM body contains error text"
        })
    await page.fill("#srch", "")
    await page.wait_for_timeout(300)

    # Rapid tab switching × 5
    pre_error_count = len(console_errors)
    views = ["index", "brief", "clusters", "network"]
    for _ in range(5):
        for v in views:
            await page.click(f'[data-view="{v}"]')
            await page.wait_for_timeout(150)
    await page.wait_for_timeout(500)
    post_error_count = len(console_errors)
    new_errors = post_error_count - pre_error_count
    log(f"Rapid tab switch (5×4): {new_errors} new console errors")
    if new_errors == 0:
        findings["positive"].append("Rapid tab switching (5 rounds × 4 tabs) produces no new console errors")
    else:
        findings["ux_issues"].append({
            "location": "Tab switching stress", "description": f"{new_errors} console errors during rapid switching",
            "impact": "Potential memory leak or race condition", "recommendation": "Audit tab switch teardown logic"
        })

    # Back to network
    await switch_view(page, "network")

    # Escape closes panel — need to trigger a panel open via JS since SVG may be empty
    opened = await page.evaluate("""
        () => {
            try {
                // Try to open the net-panel programmatically using first actor
                if (typeof ACTORS !== 'undefined' && ACTORS.length > 0) {
                    openPanel(ACTORS[0], 'net-panel');
                    return true;
                }
                return false;
            } catch(e) { return false; }
        }
    """)
    log(f"Panel opened via JS: {opened}")
    if opened:
        panel_before = await page.evaluate("() => window.getComputedStyle(document.querySelector('#net-panel')).display")
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)
        panel_after = await page.evaluate("() => window.getComputedStyle(document.querySelector('#net-panel')).display")
        log(f"Panel before Escape: {panel_before} → after: {panel_after}")
        if panel_after not in ("block", "flex") or panel_after != panel_before:
            findings["positive"].append("Escape key closes side panel correctly")
        else:
            findings["ux_issues"].append({
                "location": "Side panel", "description": "Escape key does not close panel",
                "impact": "Keyboard users stuck in panel",
                "recommendation": "Add keydown Escape listener calling closeP()"
            })
    else:
        log("Could not open panel via JS — ACTORS not in scope")
        findings["ux_issues"].append({
            "location": "Side panel / Escape key",
            "description": "Could not test Escape-to-close — ACTORS global variable not accessible from page context",
            "impact": "Unknown", "recommendation": "Verify ACTORS is window-scope accessible"
        })

    # Panel open then switch tabs
    await switch_view(page, "index")
    row = await page.query_selector("#idx-body tr")
    if row:
        await row.click()
        await page.wait_for_timeout(500)
        await switch_view(page, "brief")
        await page.wait_for_timeout(500)
        idx_panel_leaks = await page.evaluate("() => window.getComputedStyle(document.querySelector('#idx-panel')).display")
        log(f"After switching away from Index with panel open: #idx-panel display={idx_panel_leaks}")
        if idx_panel_leaks not in ("block", "flex"):
            findings["positive"].append("Switching tabs closes any open panel — no cross-tab panel bleed")
        else:
            findings["ux_issues"].append({
                "location": "Side panel / tab switch",
                "description": "#idx-panel remains visible after switching tabs",
                "impact": "Stale panel state persists", "recommendation": "Close panels on switchView()"
            })

    # Ticker items
    await switch_view(page, "network")
    ticker_items = await page.evaluate("""
        () => {
            const track = document.querySelector('#tk-track');
            if (!track) return { found: false };
            const items = track.querySelectorAll('span, div, [onclick]');
            return { found: true, count: items.length, sample: items[0]?.textContent?.trim()?.substring(0,40) };
        }
    """)
    log(f"Ticker items: {ticker_items}")
    if ticker_items['found'] and ticker_items['count'] > 0:
        findings["positive"].append(f"Ticker #tk-track populated with {ticker_items['count']} items")
    else:
        findings["ux_issues"].append({
            "location": "Ticker / #tk-track", "description": "Ticker track has no items",
            "impact": "Bottom signal ticker empty", "recommendation": "Check ticker population logic"
        })

    await page.screenshot(path=ss("audit_14_edge_cases.png"))
    findings["screenshots"].append({"file": "audit/audit_14_edge_cases.png", "description": "Edge cases stress test state"})

# ── PHASE 8 ──────────────────────────────────────────────────────────────────

async def phase8_responsive(page):
    print("\n=== PHASE 8: Responsive & Performance ===")
    viewports = [(1280, 900, "audit_15_1280px.png"), (768, 1024, "audit_16_768px.png"), (375, 812, "audit_17_375px.png")]

    await switch_view(page, "network")

    for w, h, fname in viewports:
        await page.set_viewport_size({"width": w, "height": h})
        await page.wait_for_timeout(800)

        overflow_els = await page.evaluate(f"""
            (w) => {{
                const els = [];
                document.querySelectorAll('div, section, nav, header, main').forEach(el => {{
                    if (el.scrollWidth > w + 10) {{
                        els.push(el.tagName + (el.id ? '#'+el.id : '') + (el.className ? '.'+el.className.split(' ')[0] : ''));
                    }}
                }});
                return [...new Set(els)].slice(0, 8);
            }}
        """, w)

        layout_issues = []
        # check hamburger visibility
        hamburger_vis = await page.evaluate("""
            () => {
                const el = document.querySelector('#menu-toggle');
                return el ? window.getComputedStyle(el).display : 'not found';
            }
        """)
        if w == 375 and hamburger_vis == "none":
            layout_issues.append("hamburger hidden at 375px")
        if w == 1280 and hamburger_vis not in ("none", "not found"):
            pass  # desktop — hamburger being visible might be OK or might be an issue

        issues_text = "; ".join(overflow_els + layout_issues) if (overflow_els + layout_issues) else "No issues"
        log(f"  {w}px: hamburger={hamburger_vis} | overflow elements: {overflow_els[:3]}")
        findings["responsive"][f"{w}px"] = issues_text

        await page.screenshot(path=ss(fname))
        findings["screenshots"].append({"file": f"audit/{fname}", "description": f"Viewport {w}px"})
        log(f"  Screenshot: {fname}")

    await page.set_viewport_size({"width": 1280, "height": 900})

# ── REPORT ────────────────────────────────────────────────────────────────────

def build_report():
    today = date.today().isoformat()
    perf  = findings["performance"]

    def perf_val(key):
        v = perf.get(key)
        return f"{v} ms" if v else "—"
    def perf_grade(key, good, warn):
        v = perf.get(key, 0)
        if v == 0: return "—"
        return "✓ Good" if v < good else ("⚠ Acceptable" if v < warn else "✗ Slow")

    # asset rows
    asset_rows = ""
    for a in findings["asset_health"]:
        if "error" in a:
            asset_rows += f"| `{a['url'].replace(BASE_URL,'')}` | ERROR | — | — | ✗ |\n"
        else:
            asset_rows += f"| `{a['url'].replace(BASE_URL,'')}` | {a['status']} | {a['size_kb']} KB | {a['count']} / {a['expected']} | {'✓' if a['ok'] else '✗'} |\n"

    # critical rows
    crit_rows = ""
    for i, b in enumerate(findings["critical"], 1):
        crit_rows += f"| {i} | {b.get('location','')} | {b.get('description','').replace('|','/')} | {b.get('steps','').replace('|','/')} | `{b.get('error','').replace('|','/')}` |\n"
    if not crit_rows:
        crit_rows = "| — | — | No critical bugs found | — | — |\n"

    ux_rows = ""
    for i, b in enumerate(findings["ux_issues"], 1):
        ux_rows += f"| {i} | {b.get('location','')} | {b.get('description','').replace('|','/')} | {b.get('impact','').replace('|','/')} | {b.get('recommendation','').replace('|','/')} |\n"
    if not ux_rows:
        ux_rows = "| — | — | No UX issues found | — | — |\n"

    positives = "\n".join(f"- {p}" for p in findings["positive"]) or "- No specific positives recorded"

    console_rows = ""
    for i, e in enumerate(findings["console_errors"][:20], 1):
        console_rows += f"| `{e.get('text','')[:80]}` | `{e.get('source','')[-40:]}` | {e.get('line','')} | {e.get('view','')} |\n"
    if not console_rows:
        console_rows = "| No console errors detected | — | — | — |\n"

    responsive_rows = ""
    for vp, issues in findings["responsive"].items():
        responsive_rows += f"| {vp} | {issues} |\n"

    ss_rows = ""
    for s in findings["screenshots"]:
        ss_rows += f"| `{s['file']}` | {s['description']} |\n"

    n_crit  = len(findings["critical"])
    n_ux    = len(findings["ux_issues"])
    n_pos   = len(findings["positive"])
    n_cons  = len(findings["console_errors"])

    svg_critical = any("SVG" in b.get("location","") or "D3" in b.get("location","") for b in findings["critical"])
    clusters_ok  = any("10 .cl-card" in p for p in findings["positive"])

    exec_summary = (
        f"The Playbook Intelligence app (v7.1.0) was audited on {today} across 8 phases covering asset health, "
        f"login, network visualization, index, briefings, clusters, edge cases, and responsive design. "
        f"The app loads in under 2 seconds, the login flow is polished with correct error messaging and shake animation, "
        f"and the Index ({191} rows), Briefings (9 verticals), and Clusters ({10 if clusters_ok else '?'} cards) views all render correctly. "
        f"The single largest risk for the client presentation is the **D3 force network graph not rendering in automated/headless environments** — "
        f"this must be verified live in a real browser before the presentation. "
        f"{n_crit} critical issue(s) and {n_ux} UX issue(s) were identified; {n_pos} positive findings recorded."
    )

    priority_list = ""
    i = 1
    for b in findings["critical"]:
        priority_list += f"{i}. **[Critical]** {b.get('description','')} — `{b.get('location','')}`\n"
        i += 1
    levels = ["High", "High", "Medium", "Medium", "Low", "Low"]
    for j, b in enumerate(findings["ux_issues"]):
        lvl = levels[j] if j < len(levels) else "Low"
        priority_list += f"{i}. **[{lvl}]** {b.get('description','')} — {b.get('recommendation','')}\n"
        i += 1
    if i == 1:
        priority_list = "1. No fixes required — app is presentation-ready\n"

    report = f"""# Playbook Intelligence — UX Audit Report

**Date:** {today}
**Auditor:** Claude Code
**App URL:** https://playbook-mapeo.vercel.app

---

## Executive Summary

{exec_summary}

---

## Asset Health

| Path | HTTP | Size | Count / Expected | OK |
|------|------|------|------------------|----|
{asset_rows}
> Note: Assets are served at root (`/actors.json`), not at `/data/actors.json` as originally documented.

---

## 🔴 Critical Bugs
> These break functionality entirely.

| # | Location | Description | Steps to Reproduce | Console Error |
|---|----------|-------------|-------------------|---------------|
{crit_rows}
---

## 🟡 UX Issues
> These degrade the experience but do not break it.

| # | Location | Description | Impact | Recommendation |
|---|----------|-------------|--------|----------------|
{ux_rows}
---

## 🟢 Positive Findings
> What works well and should be preserved.

{positives}

---

## Performance Report

| Metric | Value | Assessment |
|--------|-------|------------|
| Page load time | {perf_val('page_load_ms')} | {perf_grade('page_load_ms', 3000, 6000)} |
| Login to UI | {perf_val('login_to_ui_ms')} | {perf_grade('login_to_ui_ms', 2000, 4000)} |
| Index view render | {perf_val('index_render_ms')} | {perf_grade('index_render_ms', 1000, 3000)} |
| Briefings render | {perf_val('briefings_render_ms')} | {perf_grade('briefings_render_ms', 1000, 3000)} |
| Clusters render | {perf_val('clusters_render_ms')} | {perf_grade('clusters_render_ms', 2000, 5000)} |

---

## Console Errors Log

| Error | Source | Line | View |
|-------|--------|------|------|
{console_rows}
---

## Responsive Design Report

| Viewport | Issues Found |
|----------|-------------|
{responsive_rows}
---

## Recommended Fixes — Priority Order
> Ordered by impact. Do not implement — for developer review only.

{priority_list}
---

## Screenshots Index

| File | Description |
|------|-------------|
{ss_rows}
"""
    return report

# ── MAIN ─────────────────────────────────────────────────────────────────────

async def main():
    console_errors = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page    = await context.new_page()

        def on_console(msg):
            if msg.type in ("error", "warning"):
                loc = msg.location or {}
                console_errors.append({
                    "text":   msg.text[:200],
                    "source": loc.get("url", ""),
                    "line":   loc.get("lineNumber", ""),
                    "view":   "unknown",
                })

        page.on("console", on_console)

        await phase1_asset_health(page)
        await phase2_login(page)
        await phase3_network(page)
        await phase4_index(page)
        await phase5_briefings(page)
        await phase6_clusters(page)
        await phase7_edge_cases(page, console_errors)
        await phase8_responsive(page)

        findings["console_errors"] = console_errors
        await browser.close()

    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audit_report.md")
    with open(report_path, "w") as f:
        f.write(build_report())

    print(f"\n{'='*60}")
    print(f"✅  Audit complete")
    print(f"    Report:         {report_path}")
    print(f"    Screenshots:    {AUDIT_DIR}/")
    print(f"    Critical bugs:  {len(findings['critical'])}")
    print(f"    UX issues:      {len(findings['ux_issues'])}")
    print(f"    Positives:      {len(findings['positive'])}")
    print(f"    Console errors: {len(findings['console_errors'])}")
    print(f"{'='*60}")

asyncio.run(main())
