#!/usr/bin/env python3
"""
Test the verse-cooldown allowlist (surah_ranges.py) and its use in the
Connections prompt + validator.

Context: generation was taking ~2.5 hours and burning 11-13 retries per
category, almost all on "Verse ref reused (cooldown)". Root cause: the
prompt interpolated every blocked ref (~22k chars / ~5.6k tokens) as a
negative list, which the model ignored. Fix: offer the passages that are
STILL FREE as a compact positive allowlist (~90 tokens).

These tests cover the range maths, the formatter's size bound, and that
the prompt/validator actually use it.
"""
import sys
import os
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_daily_puzzle as gen
from surah_ranges import (
    VERSES_PER_SURAH, SURAH_NAMES, free_ayah_ranges,
    format_allowed_ranges, surah_ayah_count,
)

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


# ── static data sanity ─────────────────────────────────────────────
test("ayah table has 114 surahs", len(VERSES_PER_SURAH) == 114, f"got {len(VERSES_PER_SURAH)}")
test("ayah table sums to 6236", sum(VERSES_PER_SURAH) == 6236, f"got {sum(VERSES_PER_SURAH)}")
test("surah 1 has 7 ayahs", surah_ayah_count(1) == 7)
test("surah 2 has 286 ayahs", surah_ayah_count(2) == 286)
test("surah 114 has 6 ayahs", surah_ayah_count(114) == 6)
test("surah names cover 1-114", len(SURAH_NAMES) == 114, f"got {len(SURAH_NAMES)}")

# ── free_ayah_ranges maths ─────────────────────────────────────────
# nothing blocked -> every surah fully free
r = free_ayah_ranges(set())
test("no blocks -> all 114 surahs available", len(r) == 114, f"got {len(r)}")
test("no blocks -> surah 2 spans 1-286", r[2] == [(1, 286)], f"got {r.get(2)}")

# a single block splits the range
r = free_ayah_ranges({"2:100"})
test("one block splits surah 2 into two runs", r[2] == [(1, 99), (101, 286)], f"got {r.get(2)}")

# a fully-exhausted surah disappears
r = free_ayah_ranges({f"1:{a}" for a in range(1, 8)})
test("fully-blocked surah 1 disappears", 1 not in r, f"surah 1 still present: {r.get(1)}")
test("other surahs unaffected", 2 in r)

# min_free filter drops slivers
r = free_ayah_ranges({"26:1"}, min_free=3)
test("min_free filters out 1-2 ayah slivers",
     not any(hi - lo + 1 < 3 for lo, hi in r.get(26, [])),
     f"got {r.get(26)}")

# malformed refs are ignored rather than crashing
r = free_ayah_ranges({"garbage", "2:", ":5", "2:abc", None})
test("malformed refs ignored, no crash", 2 in r and 1 in r, f"got {len(r)} surahs")

# ── formatter size bound (the whole point) ─────────────────────────
blocked = {f"{s}:{a}" for s in range(1, 115) for a in range(1, min(VERSES_PER_SURAH[s-1], 200) + 1)}
ranges = free_ayah_ranges(blocked)
txt = format_allowed_ranges(ranges)
test("formatter stays under 800 chars with 200 ayahs/surah blocked",
     len(txt) < 800, f"got {len(txt)} chars")
test("formatter returns '(none)' when nothing is free",
     format_allowed_ranges({}) == "(none)", f"got {format_allowed_ranges({})!r}")
test("formatter output is non-empty when ranges exist", txt != "" and txt != "(none)")

# ── prompt actually uses the allowlist ─────────────────────────────
def make_history(blocked_refs, themes=()):
    return {
        "connections": {"themes": set(themes), "verses": set(blocked_refs), "words": set(), "meanings": {}},
        "harf": {"words": set(), "verses": set(), "hints": set(), "verseRefs": set(), "surahs": set()},
        "deduction": {"titles": set(), "characters": set(), "verseRefs": set(), "surahs": set()},
        "scramble": {"verses": set(), "references": set(), "surahs": set()},
        "juz": {"juz_numbers": set(), "verses": set()},
        "roothive": {"roots": set()},
        "all_verses": set(blocked_refs),
    }

# A realistic heavy-cooldown history: most of surahs 1-18 exhausted.
heavy = {f"{s}:{a}" for s in range(2, 19) for a in range(1, VERSES_PER_SURAH[s-1] + 1)}
h = make_history(heavy)
p = gen.build_single_category_prompt(h, "2026-10-23", 0, [])

test("prompt contains the allowlist instruction", "AVAILABLE PASSAGES" in p)
test("prompt no longer contains the forbidden-verse list", "forbidden list" not in p.lower(),
     "the ~5.6k-token negative list is still present")
test("heavy-cooldown prompt stays under 6000 chars", len(p) < 6000, f"got {len(p)} chars")

# The 2:255 that caused the original failures must NOT be offered
test("prompt does not offer blocked surah 2", "2 (Al-Baqarah)" not in p)

# theme list is capped
h2 = make_history(set(), themes=[f"theme number {i}" for i in range(120)])
p2 = gen.build_single_category_prompt(h2, "2026-10-23", 0, [])
import re as _re
m = _re.search(r'FORBIDDEN themes[^\n]*', p2)
test("forbidden theme list capped at 30", m is not None and m.group(0).count(",") <= 30,
     f"got {m.group(0).count(',') if m else '?'} entries")
test("prompt with 120 themes stays under 6000 chars", len(p2) < 6000, f"got {len(p2)} chars")

# ── validator enforces the allowlist ───────────────────────────────
def cat_with_refs(refs):
    return {
        "name": "تست", "nameEn": "Test Theme", "color": "yellow",
        "items": [
            {"ar": "كلمة", "en": f"word{i}", "ref": r, "verse": "", "verseEn": ""}
            for i, r in enumerate(refs)
        ],
        "verse": {"ayah": "t", "en": "t", "ref": refs[0]},
    }

# Pick refs from a free surah (23 has free space in a fresh history)
h3 = make_history({f"{s}:{a}" for s in range(2, 19) for a in range(1, VERSES_PER_SURAH[s-1] + 1)})
good = cat_with_refs(["23:60", "23:61", "23:62", "23:63"])
errs, viol, warn = gen.validate_single_category(good, 0, h3, [])
test("validator accepts in-allowlist refs",
     not any("outside the available" in str(v) for v in viol),
     f"got violations={viol}")

# Now one ref from an exhausted surah
bad = cat_with_refs(["23:60", "23:61", "23:62", "2:255"])
errs, viol, warn = gen.validate_single_category(bad, 0, h3, [])
test("validator rejects off-allowlist ref with a named alternative",
     any("outside the available" in str(v) for v in viol),
     f"got violations={viol}")
test("violation message includes a usable alternative list",
     any("Pick from:" in str(v) for v in viol),
     f"got {viol}")

# ── the exact verse that caused the original failure ──────────────
h4 = make_history(set())  # nothing blocked yet
bad2 = cat_with_refs(["2:255", "2:256", "2:257", "2:258"])
errs, viol, warn = gen.validate_single_category(bad2, 0, h4, [])
test("2:255-258 accepted on a fresh history (not blocked yet)",
     not any("outside the available" in str(v) for v in viol),
     "a fresh history should permit any verse")

# ── prompt/validator must agree (regression) ──────────────────────
# The prompt renders offered_ranges (runs >= MIN_SPAN). If the validator
# tested raw free_ayah_ranges instead, it would reject refs inside runs the
# prompt had filtered out — advertising surah 26 [19-27] and then refusing
# 26:20, which is worse than not checking at all.
h5 = make_history({f"{s}:{a}" for s in range(2, 19) for a in range(1, VERSES_PER_SURAH[s-1] + 1)})
from surah_ranges import offered_ranges, MIN_SPAN
off = offered_ranges(h5["connections"]["verses"] | h5["all_verses"])
top_s = max(off.items(), key=lambda kv: sum(b - a + 1 for a, b in kv[1]))[0]
top_run = off[top_s][0]
# A ref inside the advertised run must be accepted.
mid = f"{top_s}:{(top_run[0] + top_run[1]) // 2}"
cat_ok = cat_with_refs([f"{top_s}:{top_run[0]+i}" for i in range(4)])
e, v, _ = gen.validate_single_category(cat_ok, 0, h5, [])
test("prompt-advertised refs are accepted by the validator (no mismatch)",
     not any("outside the available" in str(x) for x in v), f"violations={v}")

# Every ref the prompt literally prints must validate.
prompt5 = gen.build_single_category_prompt(h5, "2026-10-23", 0, [])
import re as _re2
printed = set()
for m in _re2.finditer(r"(\d+) \([^)]*\) \[([\d,\-]+)\]", prompt5):
    s_n = int(m.group(1))
    for span in m.group(2).split(","):
        if "-" in span:
            a_, b_ = span.split("-")
            printed.add((s_n, int(a_), int(b_)))
        else:
            printed.add((s_n, int(span), int(span)))
sample_refs = [f"{s}:{a}" for s, a, b in sorted(printed)[:4]]
cat_printed = cat_with_refs(sample_refs)
e2, v2, _ = gen.validate_single_category(cat_printed, 0, h5, [])
test("refs taken from the prompt's own printed ranges validate",
     not any("outside the available" in str(x) for x in v2),
     f"refs={sample_refs} violations={[str(x)[:80] for x in v2]}")

# A short run the prompt filtered out must NOT be silently accepted either
test("offered_ranges applies MIN_SPAN filtering",
     all((b - a + 1) >= MIN_SPAN for runs in off.values() for a, b in runs),
     "a sub-MIN_SPAN run leaked into the offered set")

print()
if FAIL:
    print(f"  {FAIL} test(s) FAILED")
    sys.exit(1)
print(f"  All {PASS} tests passed \u2713")