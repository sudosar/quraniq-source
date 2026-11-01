#!/usr/bin/env python3
"""
Tests for the allowlist span fallback (Nov 2026) and the Kimi
temperature fix.

Background: on 1 Nov 2026 history blocked 3,463 verses and the longest
free run anywhere was 7 ayahs, so offered_ranges() with MIN_SPAN=8
returned {} -- no prompt guidance, no repair candidates. The cascade
(8, then 5, then 3) degrades instead of collapsing. Separately, Kimi K3
400s any temperature other than 1, while the shared payload sent 0.6.

Offline: no API keys, no network. The Kimi test stubs the HTTP layer
and captures the payload.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_daily_puzzle as gen
from surah_ranges import offered_ranges, free_ayah_ranges, format_allowed_ranges, VERSES_PER_SURAH

PASS = 0
FAIL = 0


def test(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  \u2713 {name}")
    else:
        FAIL += 1
        print(f"  \u2717 {name}")
        if detail:
            print(f"    \u2192 {detail}")


def fragmented_blocked():
    """Block every 8th ayah in every surah: max free run is exactly 7."""
    blocked = set()
    for s in range(1, 115):
        for a in range(1, VERSES_PER_SURAH[s - 1] + 1):
            if a % 8 == 0:
                blocked.add(f"{s}:{a}")
    return blocked


def main():
    blocked = fragmented_blocked()
    free = free_ayah_ranges(blocked)
    longest = max((hi - lo + 1 for runs in free.values() for lo, hi in runs), default=0)
    test("fixture: longest free run is 7", longest == 7, f"longest={longest}")

    result = offered_ranges(blocked)
    test("fallback: default offered_ranges non-empty on fragmented input",
         len(result) > 0, f"surahs={len(result)}")
    test("fallback: all offered runs >= 5",
         all(hi - lo + 1 >= 5 for runs in result.values() for lo, hi in runs))
    test("fallback: result equals explicit span-5 pool",
         result == offered_ranges(blocked, min_span=5))
    test("fallback: no offered ref is blocked",
         all(f"{s}:{a}" not in blocked for s, runs in result.items() for lo, hi in runs for a in range(lo, hi + 1)))

    explicit8 = offered_ranges(blocked, min_span=8)
    test("explicit min_span=8 honored (no cascade)", explicit8 == {}, f"got {len(explicit8)} surahs")

    control = offered_ranges(set())
    test("control: empty blocked set still uses span 8",
         len(control) > 0 and all(hi - lo + 1 >= 8 for runs in control.values() for lo, hi in runs))

    # Kimi temperature: capture the payload at the HTTP layer.
    captured = {}

    class StubResp:
        status_code = 400
        text = "stub"

    def fake_post(api_url, headers, payload, timeout, label):
        captured["payload"] = payload
        captured["url"] = api_url
        return StubResp()

    orig_post = gen._post_with_retries
    orig_key = gen.KIMI_API_KEY
    orig_deepseek = gen.DEEPSEEK_API_KEY
    try:
        gen._post_with_retries = fake_post
        gen.KIMI_API_KEY = "dummy-test-key"
        gen.call_model("test", {"id": "kimi-k3", "api": "kimi", "label": "Kimi K3"})
        test("kimi payload temperature is 1",
             captured.get("payload", {}).get("temperature") == 1,
             f"got {captured.get('payload', {}).get('temperature')}")
        test("kimi payload has no response_format (pre-existing rule)",
             "response_format" not in captured.get("payload", {}))

        captured.clear()
        gen.DEEPSEEK_API_KEY = "dummy-test-key"
        gen.call_model("test", {"id": "deepseek-v4-pro", "api": "deepseek", "label": "DeepSeek V4 Pro"})
        test("deepseek payload temperature unchanged at 0.6",
             captured.get("payload", {}).get("temperature") == 0.6,
             f"got {captured.get('payload', {}).get('temperature')}")
    finally:
        gen._post_with_retries = orig_post
        gen.KIMI_API_KEY = orig_key
        gen.DEEPSEEK_API_KEY = orig_deepseek

    # Renderer floor (Nov 2026): format_allowed_ranges used to re-filter
    # at min_span=8, so a span-5 fallback pool rendered as "(none)" in
    # the prompt and in stray violations even though the pool was
    # non-empty. The renderer must never filter stricter than the pool.
    frag_pool = offered_ranges(blocked)
    rendered = format_allowed_ranges(frag_pool)
    test("render: span-5 fallback pool renders surahs, not (none)",
         rendered != "(none)" and len(rendered) > 10, rendered[:120])
    test("render: span-5 pool renders all its surahs",
         all(f"{s} (" in rendered for s in frag_pool))
    test("render: empty pool still renders (none)",
         format_allowed_ranges({}) == "(none)")
    test("render: span-8 control pool renders",
         format_allowed_ranges(control) != "(none)")

    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
