#!/usr/bin/env python3
"""
Tests for the post-enrich theme check (Nov 2026, issue #260).

Background: on 1 Nov 2026 the published yellow category "Body parts
mentioned in the Qur'an" carried the item AYDINA glossed "(is) before
us" (19:64). The Arabic word is "our hands" and genuinely belongs in
the category, but the Quran API word-by-word rendering is the
contextual phrase translation, which does not read as a body part.
Nothing caught it because the pre-enrich gates judged the model's
gloss, enrich then overwrote the gloss, and no gate re-checked the
FINAL glosses against the theme. Worse, the yellow theme names no
recognisable keyword field at all, so the pre-enrich self-grade gate
skipped entirely ("theme names no recognisable field").

The fix: post_enrich_theme_check(), run after enrich and before
acceptance. Keyword 4/4 on the final glosses passes outright; anything
else goes to the grader on the final glosses; a grader skip fails
CLOSED (nothing stands behind this check, so an unverifiable category
must fail rather than publish).

Offline: no API keys, no network. The grader is stubbed via
monkeypatching generate_daily_puzzle.self_grade_category.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_daily_puzzle as gen

PASS = 0
FAIL = 0


def test(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✓ {name}")
    else:
        FAIL += 1
        print(f"  ✗ {name} {detail}")


def yellow_aidina():
    """The exact 1 Nov 2026 yellow shape, with post-enrich glosses."""
    return {
        "nameEn": "Body parts mentioned in the Quran",
        "items": [
            {"ar": "قُلُوبُهُم", "en": "their hearts", "ref": "16:22"},
            {"ar": "أَعْيُنِ", "en": "(the) eyes", "ref": "21:61"},
            {"ar": "عِظَامًا", "en": "and bones", "ref": "37:16"},
            {"ar": "أَيْدِينَا", "en": "(is) before us", "ref": "19:64"},
        ],
    }


def paradise(mismatch=False):
    """A theme that DOES resolve to a keyword field (paradise)."""
    last = "(is) before us" if mismatch else "golden"
    return {
        "nameEn": "Gardens of paradise",
        "items": [
            {"ar": "جَنَّات", "en": "gardens", "ref": "2:25"},
            {"ar": "أَنْهَار", "en": "rivers", "ref": "2:25"},
            {"ar": "حَرِير", "en": "silk", "ref": "22:23"},
            {"ar": "ذَهَب", "en": last, "ref": "22:23"},
        ],
    }


def run(cat, stub):
    """Run post_enrich_theme_check with a stubbed grader.

    stub: (verdict, bad, reason) the fake grader returns, or None to
    assert the grader is never called. Returns ("ok", value) or
    ("err", message). The real grader is always restored.
    """
    real = gen.self_grade_category
    calls = []

    def fake(c, m):
        calls.append(1)
        if stub is None:
            raise AssertionError("grader should not have been called")
        verdict, bad, reason = stub
        return verdict, bad, reason, "stub-raw"

    gen.self_grade_category = fake
    try:
        value = gen.post_enrich_theme_check(cat, None)
        return "ok", (value, len(calls))
    except Exception as e:
        return "err", f"{type(e).__name__}: {e}"
    finally:
        gen.self_grade_category = real


def main():
    # 1. Fast path: keyword 4/4 on final glosses passes, grader untouched.
    status, res = run(paradise(), None)
    test("fast path: keyword 4/4 passes without grader",
         status == "ok" and res[0] == (True, []) and res[1] == 0, str(res))

    # 2. The aidina shape: no-field theme, grader says item 4 off-theme.
    status, res = run(yellow_aidina(), ("fail", [4], "before us is not a body part"))
    ok = status == "ok" and res[0][0] is False
    viol = res[0][1] if ok else []
    test("aidina shape: grader fail rejects the category",
         ok and len(viol) == 1, str(res))
    test("aidina shape: violation names the theme and the off-theme gloss",
         ok and "Body parts" in viol[0] and "(is) before us" in viol[0],
         viol[0] if viol else "")
    test("aidina shape: violation uses the retry-feedback shape",
         ok and viol[0].startswith("Semantic coherence:"),
         viol[0] if viol else "")

    # 3. Same shape, grader passes: accepted (grader arbitrates, keywords
    #    alone never auto-fail).
    status, res = run(yellow_aidina(), ("pass", [], ""))
    test("aidina shape: grader pass accepts",
         status == "ok" and res[0] == (True, []), str(res))

    # 4. Partial field match goes to the grader, not to an auto-fail.
    status, res = run(paradise(mismatch=True), ("pass", [], ""))
    test("partial field match: grader pass accepts",
         status == "ok" and res[0] == (True, []), str(res))
    status, res = run(paradise(mismatch=True), ("fail", [4], "not paradise"))
    test("partial field match: grader fail rejects",
         status == "ok" and res[0][0] is False, str(res))

    # 5. Grader outage fails CLOSED: no verdict, no acceptance.
    status, res = run(yellow_aidina(), ("skipped", [], ""))
    test("grader skipped: fail-closed, category rejected",
         status == "ok" and res[0][0] is False, str(res))

    # 6. Grader fail with no indices is unverifiable: fail-closed too.
    status, res = run(yellow_aidina(), ("fail", [], ""))
    test("grader fail without indices: fail-closed",
         status == "ok" and res[0][0] is False, str(res))

    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
