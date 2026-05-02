"""Quick DOM inspector — understand actual selectors before running full audit."""
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

        print("=== Loading page ===")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2000)

        # --- login form
        print("\n=== Login form HTML ===")
        form_html = await page.evaluate("""
            () => {
                const body = document.body;
                return body.innerHTML.substring(0, 3000);
            }
        """)
        print(form_html[:2000])

        # check asset URLs
        print("\n=== Asset URL probing ===")
        asset_paths = [
            "/data/actors.json", "/actors.json", "/js/data/actors.json",
            "/assets/actors.json", "/static/actors.json",
        ]
        for path in asset_paths:
            resp = await page.request.get(BASE_URL + path)
            print(f"  {path} → {resp.status}")

        # login
        print("\n=== Attempting login ===")
        inputs = await page.query_selector_all("input")
        for i, inp in enumerate(inputs):
            itype = await inp.get_attribute("type")
            iname = await inp.get_attribute("name")
            iid   = await inp.get_attribute("id")
            iplaceholder = await inp.get_attribute("placeholder")
            print(f"  Input {i}: type={itype} name={iname} id={iid} placeholder={iplaceholder}")

        # fill password
        pw_input = inputs[0] if inputs else None
        if pw_input:
            await pw_input.fill(PASSWORD)
            await pw_input.press("Enter")
            await page.wait_for_timeout(3000)

        print("\n=== Post-login body (first 3000 chars) ===")
        body = await page.evaluate("() => document.body.innerHTML.substring(0, 3000)")
        print(body)

        print("\n=== All button texts ===")
        btns = await page.evaluate("""
            () => Array.from(document.querySelectorAll('button, [role="tab"], a.tab, .tab-btn')).map(b => ({
                tag: b.tagName, id: b.id, cls: b.className, text: b.textContent.trim().substring(0,50)
            }))
        """)
        for b in btns:
            print(f"  {b}")

        print("\n=== SVG structure ===")
        svg_info = await page.evaluate("""
            () => {
                const svg = document.querySelector('svg');
                if (!svg) return 'No SVG found';
                return {
                    children: Array.from(svg.children).map(c => ({tag: c.tagName, cls: c.className?.baseVal || c.className, count: c.children.length})),
                    circles: svg.querySelectorAll('circle').length,
                    rects: svg.querySelectorAll('rect').length,
                    gs: svg.querySelectorAll('g').length,
                };
            }
        """)
        print(svg_info)

        print("\n=== SVG first circle attrs ===")
        circle_info = await page.evaluate("""
            () => {
                const circles = Array.from(document.querySelectorAll('svg circle')).slice(0, 3);
                return circles.map(c => ({
                    r: c.getAttribute('r'),
                    cx: c.getAttribute('cx'),
                    cy: c.getAttribute('cy'),
                    cls: c.getAttribute('class'),
                    data: Object.fromEntries(Array.from(c.attributes).filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value])),
                    parent_cls: c.parentElement?.getAttribute('class'),
                    parent_data: Object.fromEntries(Array.from(c.parentElement?.attributes || []).filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value])),
                }));
            }
        """)
        for c in circle_info:
            print(f"  {c}")

        print("\n=== Overlay rect info ===")
        rect_info = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('svg rect')).map(r => ({
                    fill: r.getAttribute('fill'),
                    width: r.getAttribute('width'),
                    height: r.getAttribute('height'),
                    pe: window.getComputedStyle(r).pointerEvents,
                }));
            }
        """)
        for r in rect_info:
            print(f"  {r}")

        print("\n=== Panel selectors check ===")
        panel_check = await page.evaluate("""
            () => {
                const sels = ['#side-panel', '.side-panel', '#panel', '.panel', '[id*="panel"]', '[class*="panel"]', '#detail', '.detail-panel'];
                return sels.map(s => ({ sel: s, found: document.querySelector(s)?.tagName || null }));
            }
        """)
        for p in panel_check:
            print(f"  {p}")

        print("\n=== Tab/nav structure ===")
        nav_info = await page.evaluate("""
            () => {
                const navs = document.querySelectorAll('nav, .tabs, .tab-bar, #tabs, [role="tablist"]');
                return Array.from(navs).map(n => n.innerHTML.substring(0, 500));
            }
        """)
        for n in nav_info:
            print(f"  {n[:300]}")

        print("\n=== Console messages (first 20) ===")
        for m in console_msgs[:20]:
            print(f"  {m}")

        await browser.close()

asyncio.run(main())
