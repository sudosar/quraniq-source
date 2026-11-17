"""
Playwright + HTTP check: per-game OG share cards and landing pages.

For each game, verifies:
  - /<game>/ serves a landing page with its own og:title / og:description /
    og:image (1200x630 JPEG, <300KB) and og:url, plus a redirect to /#<game>
  - the game's share-text URL in js/ points at /<game>/, not /#<game>
  - opening /<game>/ in a browser lands on /#<game> with that game's
    section active
Also checks the home page still serves the original og-preview.png logo card.

Run: python3 tests/og_cards.py
Requires: a local server on :8765 (python3 -m http.server 8765) and
playwright chromium (python3 -m playwright install chromium).
"""
import io
import os
import re
import sys
import urllib.request
from html.parser import HTMLParser

from PIL import Image
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8765/"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# slug -> (game title, hash mode, section id, js file with the share text)
GAMES = {
    "connections": ("Ayah Connections", "connections", "connections-game", "js/connections.js"),
    "harf": ("Harf by Harf", "harf", "harf-game", "js/harf.js"),
    "deduction": ("Who Am I?", "deduction", "deduction-game", "js/deduction.js"),
    "scramble": ("Ayah Scramble", "scramble", "scramble-game", "js/scramble.js"),
    "roothive": ("Root Hive", "roothive", "roothive-game", "js/roothive.js"),
    "juz": ("Juz Journey", "juz", "juz-game", "js/juz-puzzle.js"),
}

FAILURES = []


def check(cond, label):
    print(("  PASS " if cond else "  FAIL ") + label)
    if not cond:
        FAILURES.append(label)


class MetaParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.props = {}
        self.names = {}
        self.refresh = None
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "meta" and "property" in d and "content" in d:
            self.props[d["property"]] = d["content"]
        if tag == "meta" and "name" in d and "content" in d:
            self.names[d["name"]] = d["content"]
        if tag == "meta" and d.get("http-equiv") == "refresh":
            self.refresh = d.get("content", "")
        if tag == "link" and d.get("rel") == "canonical":
            self.canonical = d.get("href")


def fetch(path):
    with urllib.request.urlopen(BASE_URL + path) as r:
        return r.status, r.headers.get_content_type(), r.read()


def check_landing(slug, title, mode):
    print(f"[{slug}] landing page")
    status, _, body = fetch(f"{slug}/")
    check(status == 200, f"{slug}/ returns 200")
    p = MetaParser()
    p.feed(body.decode("utf-8"))
    check(title in (p.props.get("og:title") or ""), f"og:title names {title}")
    check(p.props.get("og:url") == f"https://sudosar.github.io/quraniq/{slug}/",
          "og:url is the landing URL")
    img = p.props.get("og:image") or ""
    check(img == f"https://sudosar.github.io/quraniq/icons/og/og-{slug}.jpg",
          f"og:image is og-{slug}.jpg")
    check(p.props.get("og:image:width") == "1200", "og:image:width is 1200")
    check(p.props.get("og:image:height") == "630", "og:image:height is 630")
    check(p.props.get("og:image:type") == "image/jpeg", "og:image:type is jpeg")
    check(p.names.get("twitter:card") == "summary_large_image",
          "twitter:card is summary_large_image")
    check(p.names.get("twitter:image") == img, "twitter:image matches og:image")
    check(p.canonical == f"https://sudosar.github.io/quraniq/{slug}/",
          "canonical is the landing URL")
    check(f"url=../#{mode}" in (p.refresh or ""), f"meta refresh targets #{mode}")
    check(f"../#{mode}" in body.decode("utf-8"), "fallback link targets #" + mode)

    # The image itself: right size, under WhatsApp's ~300KB ceiling.
    status, ctype, data = fetch(f"icons/og/og-{slug}.jpg")
    check(status == 200, f"og-{slug}.jpg serves 200")
    check(ctype == "image/jpeg", f"og-{slug}.jpg is jpeg")
    check(len(data) < 300_000, f"og-{slug}.jpg under 300KB ({len(data)} bytes)")
    im = Image.open(io.BytesIO(data))
    check(im.size == (1200, 630), f"og-{slug}.jpg is 1200x630")


def check_share_url(slug, mode, js_file):
    print(f"[{slug}] share URL in {js_file}")
    with open(os.path.join(REPO_ROOT, js_file), encoding="utf-8") as f:
        src = f.read()
    check(f"https://sudosar.github.io/quraniq/{slug}/" in src,
          f"share text links /{slug}/")
    check(f"https://sudosar.github.io/quraniq/#{mode}" not in src,
          f"share text no longer links /#{mode}")


def check_home():
    print("[home] index og card")
    status, _, body = fetch("")
    check(status == 200, "home returns 200")
    p = MetaParser()
    p.feed(body.decode("utf-8"))
    check(p.props.get("og:image") == "https://sudosar.github.io/quraniq/icons/og-preview.png",
          "home og:image is og-preview.png")
    check(p.props.get("og:image:width") == "512", "home og:image:width is 512")
    check(p.props.get("og:image:height") == "512", "home og:image:height is 512")


def check_redirects():
    print("[browser] landing pages redirect to the right game")
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        for slug, (_title, mode, section, _js) in GAMES.items():
            page.goto(BASE_URL + slug + "/")
            page.wait_for_timeout(2500)
            url = page.url
            check(url.endswith(f"#{mode}"), f"/{slug}/ lands on #{mode} (got {url})")
            active = page.evaluate(
                f"() => document.getElementById('{section}')?.classList.contains('active')"
            )
            check(active is True, f"{section} is active after redirect")
        browser.close()


def main():
    for slug, (title, mode, _section, js_file) in GAMES.items():
        check_landing(slug, title, mode)
        check_share_url(slug, mode, js_file)
    check_home()
    check_redirects()
    print()
    if FAILURES:
        print(f"FAILED: {len(FAILURES)} check(s)")
        for f in FAILURES:
            print("  - " + f)
        sys.exit(1)
    print("All OG card checks passed.")


if __name__ == "__main__":
    main()
