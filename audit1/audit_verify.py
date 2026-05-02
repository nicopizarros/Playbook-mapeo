"""Verify specific findings from the audit."""
import asyncio, json
import urllib.request
from playwright.async_api import async_playwright

BASE_URL = "https://playbook-mapeo.vercel.app"
PASSWORD = "playbook2026"

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})

        console = []
        page.on("console", lambda m: console.append(f"[{m.type}] {m.text[:200]}"))

        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)
        await page.fill("#pw-in", PASSWORD)
        await page.click(".pw-btn")
        await page.wait_for_selector(".view-tabs", timeout=10000)
        await page.wait_for_timeout(8000)  # let D3 fully render

        print("=== 1. Panel CSS — how does open/closed work? ===")
        panel_css = await page.evaluate("""
            () => {
                const panel = document.querySelector('#net-panel');
                const computed = window.getComputedStyle(panel);
                return {
                    display: computed.display,
                    visibility: computed.visibility,
                    opacity: computed.opacity,
                    transform: computed.transform,
                    right: computed.right,
                    classes: panel.className,
                    inline_style: panel.getAttribute('style') || '(none)',
                };
            }
        """)
        print(f"Panel (closed state): {panel_css}")

        print("\n=== 2. Open a panel via click and check CSS ===")
        # Click a real SVG node
        circles = await page.query_selector_all("#net-svg circle")
        print(f"SVG circles available: {len(circles)}")
        if circles:
            # Use JS to dispatch a click event to avoid overlay issues
            panel_before = await page.evaluate("""
                () => {
                    const p = document.querySelector('#net-panel');
                    return { right: window.getComputedStyle(p).right, transform: window.getComputedStyle(p).transform, cls: p.className };
                }
            """)
            print(f"Panel before click: {panel_before}")

            # Click first node via JS dispatch
            clicked = await page.evaluate("""
                () => {
                    const circles = document.querySelectorAll('#net-svg circle');
                    for (const c of circles) {
                        try {
                            c.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
                            return true;
                        } catch(e) {}
                    }
                    return false;
                }
            """)
            await page.wait_for_timeout(800)
            panel_after = await page.evaluate("""
                () => {
                    const p = document.querySelector('#net-panel');
                    return {
                        right: window.getComputedStyle(p).right,
                        transform: window.getComputedStyle(p).transform,
                        cls: p.className,
                        content: document.querySelector('#np-n')?.textContent?.trim(),
                        body_content: document.querySelector('#np-b')?.innerHTML?.substring(0,200),
                    };
                }
            """)
            print(f"Panel after click: {panel_after}")

            # Press Escape
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(500)
            panel_esc = await page.evaluate("""
                () => {
                    const p = document.querySelector('#net-panel');
                    return { right: window.getComputedStyle(p).right, transform: window.getComputedStyle(p).transform, cls: p.className };
                }
            """)
            print(f"Panel after Escape: {panel_esc}")

        print("\n=== 3. Zero-match search — what's in DOM? ===")
        await page.fill("#srch", "ZZZNOMATCHXXX")
        await page.wait_for_timeout(700)
        # Check VISIBLE text only, not script tags
        visible_text = await page.evaluate("""
            () => {
                // Get only visible text nodes, exclude scripts/styles
                const texts = [];
                document.querySelectorAll('body *:not(script):not(style)').forEach(el => {
                    if (el.children.length === 0 && el.textContent.trim()) {
                        const text = el.textContent.trim();
                        if (text.includes('undefined') || text.includes('TypeError') || text.includes('null')) {
                            const style = window.getComputedStyle(el);
                            if (style.display !== 'none' && style.visibility !== 'hidden') {
                                texts.push({ tag: el.tagName, cls: el.className.substring(0,30), text: text.substring(0,80) });
                            }
                        }
                    }
                });
                return texts;
            }
        """)
        print(f"Visible 'undefined/TypeError/null' text: {visible_text}")

        # Also check script source
        script_undefined = await page.evaluate("""
            () => document.querySelector('body').innerHTML.includes('undefined')
        """)
        print(f"'undefined' anywhere in body HTML (including scripts): {script_undefined}")
        await page.fill("#srch", "")
        await page.wait_for_timeout(300)

        print("\n=== 4. POI.json structure ===")
        resp = await page.request.get(BASE_URL + "/poi.json")
        poi_data = json.loads(await resp.body())
        if isinstance(poi_data, list):
            print(f"POI is array, length: {len(poi_data)}")
        else:
            print(f"POI is object, keys: {list(poi_data.keys())}")
            for k, v in poi_data.items():
                if isinstance(v, list):
                    print(f"  {k}: {len(v)} items")
                else:
                    print(f"  {k}: {type(v).__name__}")

        print("\n=== 5. Index rows after resetting all filters ===")
        await page.evaluate("() => { closeSidebar && closeSidebar(); }")
        await page.evaluate("() => switchView('index', null, document.querySelector('[data-view=\"index\"]'))")
        await page.wait_for_timeout(1500)
        # reset any vertical filter
        await page.evaluate("() => { if (typeof filterV === 'function') filterV(null); }")
        await page.wait_for_timeout(500)
        row_count = await page.evaluate("() => document.querySelectorAll('#idx-body tr').length")
        cnt_text  = await page.evaluate("() => document.querySelector('#idx-cnt')?.textContent?.trim()")
        print(f"Index rows (no filter): {row_count} | Counter: '{cnt_text}'")

        print("\n=== 6. Briefings Tier 1 card selector ===")
        await page.evaluate("() => switchView('brief', null, document.querySelector('[data-view=\"brief\"]'))")
        await page.wait_for_timeout(2000)
        br_html = await page.evaluate("() => document.querySelector('#brief-body')?.innerHTML?.substring(0,2000)")
        print(br_html[:1000] if br_html else "NOT FOUND")

        # find tier 1 card selectors
        t1_sels = await page.evaluate("""
            () => {
                const sels = ['.t1-card', '.bv-card', '.bc-card', '.tier-1-card', '[class*="t1"]', '.actor-card'];
                return sels.map(s => ({ sel: s, count: document.querySelectorAll(s).length }));
            }
        """)
        print(f"Tier 1 card selectors: {t1_sels}")

        print("\n=== 7. Panel state toggle check ===")
        await page.evaluate("() => switchView('index', null, document.querySelector('[data-view=\"index\"]'))")
        await page.wait_for_timeout(1500)
        idx_panel_before = await page.evaluate("""
            () => {
                const p = document.querySelector('#idx-panel');
                return { cls: p.className, right: window.getComputedStyle(p).right, transform: window.getComputedStyle(p).transform };
            }
        """)
        print(f"idx-panel initial: {idx_panel_before}")

        row = await page.query_selector("#idx-body tr")
        if row:
            await row.click()
            await page.wait_for_timeout(700)
            idx_panel_open = await page.evaluate("""
                () => {
                    const p = document.querySelector('#idx-panel');
                    return { cls: p.className, right: window.getComputedStyle(p).right, transform: window.getComputedStyle(p).transform, name: document.querySelector('#ip-n')?.textContent?.trim() };
                }
            """)
            print(f"idx-panel after row click: {idx_panel_open}")

            # switch view
            await page.evaluate("() => switchView('brief', null, document.querySelector('[data-view=\"brief\"]'))")
            await page.wait_for_timeout(1000)
            idx_panel_after_switch = await page.evaluate("""
                () => {
                    const p = document.querySelector('#idx-panel');
                    return { cls: p.className, right: window.getComputedStyle(p).right, transform: window.getComputedStyle(p).transform };
                }
            """)
            print(f"idx-panel after tab switch: {idx_panel_after_switch}")

        print("\n=== Console messages ===")
        for m in console[:20]:
            print(f"  {m}")

        await browser.close()

asyncio.run(main())
