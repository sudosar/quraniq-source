"""
Playwright check: Connections solved-row carousel readability on mobile.

Renders one solved row from the local daily puzzle, expands its carousel,
and verifies the verse / pill / translation sizes at each font-size
setting, with no horizontal overflow. Screenshots land in
tests/screenshots/connections-carousel/.

Run: python3 tests/connections_carousel_mobile.py
Requires: a local server on :8765 (python3 -m http.server 8765) and
playwright chromium (python3 -m playwright install chromium).
"""
import os
import sys

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8765/"
SCREENSHOT_DIR = os.path.join(
    os.path.dirname(__file__), "screenshots", "connections-carousel"
)

FONT_SIZE_SETTINGS = ["0", "2"]
VIEWPORT = {"width": 390, "height": 844, "label": "mobile-390"}

# Minimum readable px at mobile width (390px), per setting.
MIN_PX = {
    "0": {"wbw": 24, "word": 26, "pill": 16, "en": 15, "tile": 22},
    "2": {"wbw": 30, "word": 34, "pill": 20, "en": 18, "tile": 34},
}

SETUP_JS = """
async () => {
  const res = await fetch('/data/daily_puzzle.json');
  const data = await res.json();
  const cats = data.puzzle.categories;
  const cat = cats.find(c => c.items && c.items[0] && c.items[0].verse) || cats[0];
  conn.puzzle = { id: 'daily', categories: cats };
  conn.solved = [{
    name: cat.name, nameEn: cat.nameEn, color: cat.color || 'purple',
    items: cat.items,
  }];
  renderSolvedRows();
  toggleCarousel(0);
  return { name: cat.nameEn, items: cat.items.length, color: cat.color };
}
"""

MEASURE_JS = """
() => {
  const px = (sel) => {
    const el = document.querySelector(sel);
    if (!el || !el.offsetParent) return null;
    return parseFloat(window.getComputedStyle(el).fontSize);
  };
  const wbw = document.querySelector('.wbw-ar');
  const wbwVisible = !!(wbw && wbw.offsetParent);
  const words = [...document.querySelectorAll('.wbw-word')];
  const card = document.querySelector('.verse-card');
  const enEl = document.querySelector('.verse-slide-en');
  return {
    cardScroll: card ? card.scrollHeight - card.clientHeight : null,
    enVisible: !!(enEl && enEl.offsetParent),
    wbw: px('.wbw-ar'),
    ayah: px('.verse-slide-ayah'),
    word: px('.verse-slide-word'),
    pill: px('.verse-pill'),
    meaning: px('.verse-slide-meaning'),
    en: px('.verse-slide-en'),
    tile: px('.conn-tile-ar'),
    wbwVisible,
    docOverflow: document.documentElement.scrollWidth - window.innerWidth,
    clippedWords: words.filter(w => w.scrollWidth > w.clientWidth + 1).length,
  };
}
"""


def main():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for fs in FONT_SIZE_SETTINGS:
            page = browser.new_page(viewport={
                "width": VIEWPORT["width"], "height": VIEWPORT["height"]
            })
            # Skip the first-visit onboarding overlay.
            # NB: a bare arrow-function string is never invoked; run the
            # statement directly.
            page.add_init_script(
                "localStorage.setItem('quraniq_onboarded', '1')")
            page.goto(BASE_URL, wait_until="domcontentloaded")
            page.evaluate(
                "(s) => document.documentElement.setAttribute('data-font-size', s)",
                fs,
            )
            page.wait_for_selector("#connections-solved", state="attached", timeout=10000)
            info = page.evaluate(SETUP_JS)
            # Word-by-word loads from api.quran.com; fall back to the static
            # ayah if it has not arrived after 15s.
            try:
                page.wait_for_selector(".wbw-ar", timeout=15000)
            except Exception:
                print(f"  [fs={fs}] WBW did not load; measuring fallback ayah")
            m = page.evaluate(MEASURE_JS)
            shot = os.path.join(
                SCREENSHOT_DIR, f"fs{fs}-{VIEWPORT['label']}.png")
            page.locator(".conn-solved-row").first.screenshot(path=shot)
            print(f"[fs={fs}] {info['name']} ({info['items']} words): {m}")
            print(f"  screenshot: {shot}")
            mins = MIN_PX[fs]
            verse_px = m["wbw"] if m["wbwVisible"] else m["ayah"]
            checks = [
                ("verse arabic", verse_px, mins["wbw"]),
                ("slide word", m["word"], mins["word"]),
                ("pill", m["pill"], mins["pill"]),
                ("translation", m["en"], mins["en"]),
                ("tile", m["tile"], mins["tile"]),
            ]
            for label, got, want in checks:
                if got is None or got < want:
                    failures.append(f"fs={fs} {label}: {got}px < {want}px")
            if m["docOverflow"] > 1:
                failures.append(
                    f"fs={fs} horizontal overflow: {m['docOverflow']}px")
            if m["clippedWords"]:
                failures.append(
                    f"fs={fs} {m['clippedWords']} WBW words clipped")
            if m["cardScroll"] is not None and m["cardScroll"] > 1:
                failures.append(
                    f"fs={fs} verse card scrolls internally by "
                    f"{m['cardScroll']}px (translation hidden below fold)")
            if not m["enVisible"]:
                failures.append(f"fs={fs} translation not visible")
            page.close()
        browser.close()
    if failures:
        print("\nFAIL:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll carousel readability checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
