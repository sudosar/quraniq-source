"""
Playwright test: Connections Arabic font scaling + overflow check.
Iterates all font-size settings × viewport widths and verifies:
  1. Arabic tiles render with a minimum readable font size.
  2. No horizontal overflow at any combination.

Run: python3 tests/connections_arabic_test.py
"""

import os
import sys
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8765/"
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots", "connections-arabic")

FONT_SIZE_SETTINGS = ["0", "1", "2"]
VIEWPORTS = [
    {"width": 390, "height": 844, "label": "mobile-390"},
    {"width": 768, "height": 1024, "label": "tablet-768"},
    {"width": 1280, "height": 800, "label": "desktop-1280"},
]

# Minimum font-size in px for .conn-tile-ar at each viewport
MIN_ARABIC_FONT_PX = {
    "mobile-390": 16,
    "tablet-768": 18,
    "desktop-1280": 20,
}


def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)


def safe_label(font_size, vp_label):
    return f"fs{font_size}-{vp_label}"


def run_test(font_size, vp, page):
    label = f"font-size={font_size} x {vp['label']}"
    print(f"\n--- {label} ---", flush=True)

    page.set_viewport_size({"width": vp["width"], "height": vp["height"]})
    page.goto(BASE_URL, wait_until="domcontentloaded", timeout=10000)
    page.evaluate("(fs) => { document.documentElement.setAttribute('data-font-size', fs); }", font_size)
    # Dismiss onboarding overlay if present
    page.evaluate("() => { localStorage.setItem('quraniq_onboarded', 'true'); const o = document.getElementById('onboarding-overlay'); if(o) o.remove(); }")

    # Wait for Connections grid to appear
    try:
        page.wait_for_selector(".connections-grid", timeout=6000)
    except Exception:
        # Take screenshot for debugging
        sl = safe_label(font_size, vp["label"])
        ensure_dir(SCREENSHOT_DIR)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, f"{sl}-nogrid.png"), full_page=False)
        raise Exception("connections-grid not found")

    # Click 4 tiles to reveal a theme
    visible = page.locator(".connections-grid .conn-tile:not(.conn-tile-hidden)")
    count = visible.count()
    if count >= 4:
        for i in range(4):
            visible.nth(i).click()
        page.wait_for_timeout(800)

    # Measure .conn-tile-ar font sizes
    tiles = page.locator(".conn-tile-ar")
    tile_count = tiles.count()
    smallest = float("inf")
    all_ok = True
    for i in range(tile_count):
        fs = tiles.nth(i).evaluate("el => parseFloat(window.getComputedStyle(el).fontSize)")
        if fs < smallest:
            smallest = fs
        if fs < MIN_ARABIC_FONT_PX[vp["label"]]:
            all_ok = False

    # Check overflow
    sw = page.evaluate("document.documentElement.scrollWidth")
    iw = page.evaluate("window.innerWidth")
    no_overflow = sw <= iw

    # Screenshot
    sl = safe_label(font_size, vp["label"])
    ensure_dir(SCREENSHOT_DIR)
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, f"{sl}.png"), full_page=False)

    print(f"  tiles={tile_count} smallest_font={smallest:.1f}px overflow_ok={no_overflow} scrollW={sw} innerW={iw}")

    if not all_ok:
        print(f"  [WARN] Some tiles below minimum size")
    if not no_overflow:
        print(f"  [FAIL] HORIZONTAL OVERFLOW")

    assert all_ok, f"[{label}] Arabic tile font too small: {smallest}px"
    assert no_overflow, f"[{label}] Horizontal overflow: scrollWidth={sw} > innerWidth={iw}"
    print(f"  PASS")
    return True


def main():
    ensure_dir(SCREENSHOT_DIR)
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Skip onboarding by pre-setting localStorage
        context = browser.new_context(
            storage_state={"cookies": [], "origins": []}
        )
        page = context.new_page()
        page.set_default_timeout(15000)

        for font_size in FONT_SIZE_SETTINGS:
            for vp in VIEWPORTS:
                label = f"font-size={font_size} x {vp['label']}"
                try:
                    run_test(font_size, vp, page)
                    results.append((font_size, vp["label"], "PASS"))
                except Exception as e:
                    print(f"  ERROR: {e}")
                    results.append((font_size, vp["label"], f"FAIL: {e}"))

        browser.close()

    # Summary
    print("\n\n========== SUMMARY ==========")
    all_pass = True
    for font_size, vp_label, status in results:
        mark = "PASS" if "PASS" in status else "FAIL"
        print(f"  font-size={font_size} x {vp_label}: {mark}")
        if "FAIL" in status:
            all_pass = False

    passed = sum(1 for r in results if "PASS" in r[2])
    failed = sum(1 for r in results if "FAIL" in r[2])
    print(f"\nTotal: {len(results)} | Passed: {passed} | Failed: {failed}")
    if all_pass:
        print("ALL TESTS PASSED")
    else:
        print("SOME TESTS FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
