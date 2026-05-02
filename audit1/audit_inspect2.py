"""Deep post-login DOM inspector."""
import asyncio
from playwright.async_api import async_playwright

BASE_URL = "https://playbook-mapeo.vercel.app"
PASSWORD = "playbook2026"

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})

        console_msgs = []
        page.on("console", lambda m: console_msgs.append(f"[{m.type}] {m.text}"))

        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)

        # login properly
        await page.fill("#pw-in", PASSWORD)
        await page.click(".pw-btn")
        await page.wait_for_timeout(5000)  # wait for D3 to render

        print("=== All JSON asset paths ===")
        for path in ["/actors.json", "/edges.json", "/poi.json", "/clusters.json"]:
            resp = await page.request.get(BASE_URL + path)
            print(f"  {path} → {resp.status} ({len(await resp.body())} bytes)")

        print("\n=== All buttons post-login ===")
        btns = await page.evaluate("""
            () => Array.from(document.querySelectorAll('button, [role="tab"], .tab, .nav-item, a[data-tab]')).map(b => ({
                tag: b.tagName, id: b.id, cls: b.className.substring(0,60), text: b.textContent.trim().substring(0,40)
            }))
        """)
        for b in btns:
            print(f"  {b}")

        print("\n=== Nav sidebar full HTML (first 2000) ===")
        nav_html = await page.evaluate("""
            () => {
                const nav = document.querySelector('nav, #sidebar, #nav, .nav, .sidebar');
                return nav ? nav.outerHTML.substring(0,2000) : 'NOT FOUND';
            }
        """)
        print(nav_html)

        print("\n=== All divs with 'tab' in id or class ===")
        tabs = await page.evaluate("""
            () => Array.from(document.querySelectorAll('[id*="tab"], [class*="tab"], [data-tab]')).map(el => ({
                tag: el.tagName, id: el.id, cls: el.className.substring(0,60),
                data_tab: el.getAttribute('data-tab'), text: el.textContent.trim().substring(0,40)
            }))
        """)
        for t in tabs:
            print(f"  {t}")

        print("\n=== SVG info after wait ===")
        svg_info = await page.evaluate("""
            () => {
                const svgs = document.querySelectorAll('svg');
                return Array.from(svgs).map((svg, i) => ({
                    index: i,
                    id: svg.id,
                    cls: svg.className?.baseVal,
                    circles: svg.querySelectorAll('circle').length,
                    rects: svg.querySelectorAll('rect').length,
                    gs: svg.querySelectorAll('g').length,
                    first_g_cls: svg.querySelector('g')?.getAttribute('class'),
                }));
            }
        """)
        print(svg_info)

        print("\n=== First 5 SVG circles ===")
        circles = await page.evaluate("""
            () => Array.from(document.querySelectorAll('svg circle')).slice(0,5).map(c => ({
                r: c.getAttribute('r'), cx: c.getAttribute('cx'), cy: c.getAttribute('cy'),
                cls: c.getAttribute('class'),
                parent_cls: c.parentElement?.getAttribute('class'),
                parent_tag: c.parentElement?.tagName,
                data: Object.fromEntries(Array.from(c.attributes).filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value])),
            }))
        """)
        for c in circles:
            print(f"  {c}")

        print("\n=== [id*=panel] element ===")
        panel_info = await page.evaluate("""
            () => {
                const panels = document.querySelectorAll('[id*="panel"]');
                return Array.from(panels).map(p => ({id: p.id, cls: p.className.substring(0,60), display: window.getComputedStyle(p).display}));
            }
        """)
        print(panel_info)

        print("\n=== Sidebar/panel actual HTML (first 1500) ===")
        panel_html = await page.evaluate("""
            () => {
                const p = document.querySelector('[id*="panel"]');
                return p ? p.outerHTML.substring(0,1500) : 'NOT FOUND';
            }
        """)
        print(panel_html)

        print("\n=== Search input ===")
        search_info = await page.evaluate("""
            () => {
                const inputs = document.querySelectorAll('input');
                return Array.from(inputs).map(i => ({id: i.id, cls: i.className.substring(0,40), type: i.type, placeholder: i.placeholder}));
            }
        """)
        print(search_info)

        print("\n=== Filter/chip/pill selectors ===")
        filter_info = await page.evaluate("""
            () => {
                const sels = ['.chip', '.v-chip', '.filter', '.pill', '.filter-chip', '[id*="vf"]', '[id*="filter"]', '[data-v]', '[id*="v1"], [id*="v2"]'];
                return sels.map(s => ({ sel: s, count: document.querySelectorAll(s).length, sample: document.querySelector(s)?.textContent?.trim().substring(0,30) }));
            }
        """)
        for f in filter_info:
            print(f"  {f}")

        print("\n=== All elements with 'vertical' in id/class ===")
        vert_els = await page.evaluate("""
            () => Array.from(document.querySelectorAll('[id*="vert"], [class*="vert"]')).map(el => ({
                tag: el.tagName, id: el.id, cls: el.className.substring(0,50), text: el.textContent.trim().substring(0,30)
            }))
        """)
        for v in vert_els[:20]:
            print(f"  {v}")

        print("\n=== Ticker elements ===")
        ticker = await page.evaluate("""
            () => {
                const sels = ['#ticker', '.ticker', '[class*="tick"]'];
                return sels.map(s => ({ sel: s, found: document.querySelector(s)?.outerHTML?.substring(0,200) }));
            }
        """)
        for t in ticker:
            print(f"  {t['sel']}: {t['found']}")

        print("\n=== Main sections/views ===")
        sections = await page.evaluate("""
            () => {
                const sels = ['#view-red', '#view-index', '#view-briefings', '#view-clusters', '.view', '[id*="view"]', '[id*="section"]'];
                return sels.map(s => ({ sel: s, count: document.querySelectorAll(s).length,
                    ids: Array.from(document.querySelectorAll(s)).slice(0,5).map(e => e.id)
                }));
            }
        """)
        for s in sections:
            print(f"  {s}")

        print("\n=== Console messages ===")
        for m in console_msgs[:30]:
            print(f"  {m}")

        await browser.close()

asyncio.run(main())
