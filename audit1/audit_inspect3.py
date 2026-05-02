"""Final targeted inspector for remaining unknowns."""
import asyncio
from playwright.async_api import async_playwright

BASE_URL = "https://playbook-mapeo.vercel.app"
PASSWORD = "playbook2026"

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})

        console_msgs = []
        page.on("console", lambda m: console_msgs.append(f"[{m.type}] {m.text[:200]}"))

        await page.goto(BASE_URL, wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.fill("#pw-in", PASSWORD)
        await page.click(".pw-btn")
        await page.wait_for_timeout(6000)

        print("=== .view-tabs children ===")
        tabs = await page.evaluate("""
            () => {
                const vt = document.querySelector('.view-tabs');
                if (!vt) return 'NOT FOUND';
                return vt.outerHTML.substring(0, 2000);
            }
        """)
        print(tabs)

        print("\n=== sidebar full structure (no images) ===")
        sidebar = await page.evaluate("""
            () => {
                const sb = document.querySelector('.sidebar');
                if (!sb) return 'NOT FOUND';
                // remove img src to avoid base64 spam
                const clone = sb.cloneNode(true);
                clone.querySelectorAll('img').forEach(i => i.removeAttribute('src'));
                return clone.outerHTML.substring(0, 3000);
            }
        """)
        print(sidebar)

        print("\n=== #view-network structure ===")
        net_view = await page.evaluate("""
            () => {
                const v = document.querySelector('#view-network');
                if (!v) return 'NOT FOUND';
                const clone = v.cloneNode(true);
                clone.querySelectorAll('img').forEach(i => i.removeAttribute('src'));
                return clone.outerHTML.substring(0, 3000);
            }
        """)
        print(net_view)

        print("\n=== SVG after networkidle (wait 6s) ===")
        svg_info = await page.evaluate("""
            () => {
                const svg = document.querySelector('#net-svg');
                if (!svg) return 'NOT FOUND';
                return {
                    innerHTML_length: svg.innerHTML.length,
                    circles: svg.querySelectorAll('circle').length,
                    gs: svg.querySelectorAll('g').length,
                    first_300: svg.innerHTML.substring(0, 300),
                };
            }
        """)
        print(svg_info)

        print("\n=== Wrong password test ===")
        # check wrong password error
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)
        await page.fill("#pw-in", "wrongpassword")
        await page.click(".pw-btn")
        await page.wait_for_timeout(1500)
        error_info = await page.evaluate("""
            () => {
                const candidates = document.querySelectorAll('[class*="error"], [class*="wrong"], [class*="invalid"], [class*="shake"], .pw-err, #pw-err, .pw-error');
                const allVisible = Array.from(candidates).filter(el => el.offsetParent !== null);
                return {
                    total: candidates.length,
                    visible: allVisible.length,
                    texts: Array.from(candidates).map(el => ({ cls: el.className, text: el.textContent.trim().substring(0,60), visible: el.offsetParent !== null }))
                };
            }
        """)
        print(error_info)
        # also check pw-in class after wrong password
        pw_class = await page.evaluate("() => document.querySelector('#pw-in')?.className")
        print(f"#pw-in class after wrong password: {pw_class}")
        # check pw-center class
        pw_center = await page.evaluate("() => document.querySelector('.pw-center')?.className")
        print(f".pw-center class after wrong password: {pw_center}")
        # check screen class
        screen_class = await page.evaluate("() => document.querySelector('#screen-pw')?.className")
        print(f"#screen-pw class: {screen_class}")

        # re-login
        await page.fill("#pw-in", PASSWORD)
        await page.click(".pw-btn")
        await page.wait_for_timeout(6000)

        print("\n=== #view-index structure ===")
        idx = await page.evaluate("""
            () => {
                const v = document.querySelector('#view-index');
                if (!v) return 'NOT FOUND';
                return v.outerHTML.substring(0, 2000);
            }
        """)
        print(idx)

        print("\n=== Click view-tabs items ===")
        # find the tab items
        tab_items = await page.evaluate("""
            () => {
                const vt = document.querySelector('.view-tabs');
                if (!vt) return [];
                return Array.from(vt.querySelectorAll('*')).filter(el => el.children.length === 0).map(el => ({
                    tag: el.tagName, id: el.id, cls: el.className.substring(0,40), text: el.textContent.trim().substring(0,40)
                }));
            }
        """)
        print(tab_items)

        # Try clicking on each tab and inspect
        for tab_name in ["Indice", "Briefings", "Clusters"]:
            try:
                await page.click(f"text={tab_name}", timeout=2000)
                await page.wait_for_timeout(3000)
                print(f"\n=== After clicking '{tab_name}' ===")
                view_info = await page.evaluate(f"""
                    () => {{
                        const v = document.querySelector('#view-index, #view-brief, #view-clusters');
                        const style_net = document.querySelector('#view-network')?.style.display;
                        return {{
                            visible_view: Array.from(document.querySelectorAll('[id^="view-"]')).map(el => ({{id: el.id, display: window.getComputedStyle(el).display}})),
                        }};
                    }}
                """)
                print(view_info)

                if tab_name == "Indice":
                    rows = await page.evaluate("""
                        () => ({
                            table_rows: document.querySelectorAll('table tbody tr').length,
                            all_rows: document.querySelectorAll('.idx-row, .actor-row, [class*="idx"]').length,
                            idx_html: document.querySelector('#view-index')?.innerHTML?.substring(0, 1000)
                        })
                    """)
                    print(f"Index rows: {rows}")

                if tab_name == "Briefings":
                    br = await page.evaluate("""
                        () => ({
                            view_html: document.querySelector('#view-brief')?.innerHTML?.substring(0, 1000),
                            pills: document.querySelectorAll('.br-pill, .brief-pill, [id*="br"]').length,
                        })
                    """)
                    print(f"Briefings: {br}")

                if tab_name == "Clusters":
                    cl = await page.evaluate("""
                        () => ({
                            cl_grid: document.querySelector('#cl-grid')?.outerHTML?.substring(0, 500),
                            cl_cards: document.querySelectorAll('.cl-card').length,
                            cl_grid_found: !!document.querySelector('#cl-grid'),
                        })
                    """)
                    print(f"Clusters: {cl}")
            except Exception as e:
                print(f"  Failed to click '{tab_name}': {e}")

        print("\n=== Console messages ===")
        for m in console_msgs[:30]:
            print(f"  {m}")

        await browser.close()

asyncio.run(main())
