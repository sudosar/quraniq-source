#!/usr/bin/env python3
"""
Test the pattern-first Connections validators (fixes #235).

#235 — "These are almost impossible to find patterns for between the
words" (Day 663, puzzle data dated 2026-10-25). All four categories
were mined from a single short passage each, then given a broad theme
name describing the passage ("Aspects of … in Surah …", "Elements of …
in Surah …"). The words themselves share no pattern a player can see:
the grid hides verses, refs and surah names.

The fix has three parts, all exercised here:
  1. passage_anchor_violation() — deterministic rejection of
     surah/juz-named themes, empty-container themes ("Aspects of…"),
     and categories whose 4 refs sit in one short passage.
  2. semantic_coherence_check() runs that check as Layer 0, so
     validate_single_category() — the hard gate every category passes
     through in _generate_single_category — rejects them at generation
     time.
  3. build_single_category_prompt() no longer instructs the model to
     pick all 4 refs from one passage; it requires a pattern visible
     from the words alone, spread across different passages.

The four #235 categories are embedded verbatim below (names, words,
glosses, refs from data/daily_puzzle.json, 2026-10-25).
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
        print(f"  ✗ {name}")
        if detail:
            print(f"    → {detail}")


def empty_history():
    return {
        "connections": {"themes": set(), "verses": set(), "words": set(), "meanings": {}},
        "all_verses": set(),
    }


def mk_cat(name_en, items):
    return {
        "name": "x",
        "nameEn": name_en,
        "items": [
            {"ar": ar, "en": en, "ref": ref, "verse": "", "verseEn": ""}
            for ar, en, ref in items
        ],
    }


# ── The real #235 puzzle (Day 663) ────────────────────────────────
CATS_235 = [
    mk_cat("Aspects of Allah's Sovereignty in Surah Az-Zukhruf", [
        ("السَّمَاوَاتِ", "(of) the heavens", "43:82"),
        ("الْأَرْضِ", "the earth", "43:84"),
        ("السَّاعَةِ", "(of) the Hour", "43:85"),
        ("الشَّفَاعَةَ", "(for) the intercession", "43:86"),
    ]),
    mk_cat("Aspects of the False Gods' Inability in Surah Al-A'raf", [
        ("شُرَكَاءَ", "partners", "7:190"),
        ("يُخْلَقُونَ", "are created", "7:191"),
        ("نَصْرًا", "any help", "7:192"),
        ("الْهُدَىٰ", "the guidance", "7:193"),
    ]),
    mk_cat("Dialogue of the People of the Fire with their Lord in Surah Al-Mu'minun", [
        ("أَرْجِعُونِ", "Send me back", "23:99"),
        ("غَلَبَتْ", "Overcame", "23:106"),
        ("أَخْرِجْنَا", "Bring us out", "23:107"),
        ("اِخْسَئُوا", "Remain despised", "23:108"),
    ]),
    mk_cat("Elements of the Magicians' Confrontation with Musa in Surah Ash-Shu'ara", [
        ("أَجْرًا", "a reward", "26:41"),
        ("الْمُقَرَّبِينَ", "the ones who are brought near", "26:42"),
        ("أَلْقُوا", "Throw", "26:43"),
        ("حِبَالَهُمْ", "their ropes", "26:44"),
    ]),
]

for cat in CATS_235:
    label = cat["nameEn"][:45]
    v = gen.passage_anchor_violation(cat)
    test(f"#235 rejected by passage_anchor_violation: {label}",
         v is not None, "got None")
    ok, reason = gen.semantic_coherence_check(cat)
    test(f"#235 rejected by semantic_coherence_check: {label}",
         not ok and reason, f"got ok={ok} reason={reason!r}")
    errors, violations, _ = gen.validate_single_category(
        cat, 0, empty_history(), [])
    test(f"#235 rejected by validate_single_category: {label}",
         any("passage" in v.lower() or "surah" in v.lower()
             or "pattern" in v.lower() for v in violations),
         f"violations={violations!r} errors={errors!r}")

# Note: validate_connections() is deliberately NOT the pattern gate —
# it is the final cross-category cooldown/duplicate check, and every
# category has already passed validate_single_category (the hard gate
# in _generate_single_category) before it runs.


# ── Each rejection rule in isolation ──────────────────────────────
# Surah named in the theme, refs spread out — still rejected.
cat = mk_cat("Words of Guidance in Surah Al-Baqarah", [
    ("x", "guidance", "2:2"), ("x", "light", "24:35"),
    ("x", "path", "1:6"), ("x", "truth", "22:62"),
])
v = gen.passage_anchor_violation(cat)
test("surah-named theme rejected even with spread refs",
     v is not None and "surah" in v.lower(), f"got {v!r}")

# Empty-container theme, refs spread out, no surah named — rejected.
cat = mk_cat("Aspects of Divine Mercy", [
    ("x", "mercy", "39:53"), ("x", "mercy", "7:156"),
    ("x", "merciful", "21:107"), ("x", "compassion", "12:64"),
])
v = gen.passage_anchor_violation(cat)
test("'Aspects of…' container theme rejected",
     v is not None and "container" in v.lower(), f"got {v!r}")

# Intrinsic theme name, but all 4 refs mined from one short passage.
cat = mk_cat("Birds mentioned in the Qur'an", [
    ("x", "speech of the birds", "27:16"), ("x", "armies", "27:17"),
    ("x", "the hoopoe", "27:20"), ("x", "news", "27:22"),
])
v = gen.passage_anchor_violation(cat)
test("single-passage cluster rejected whatever the theme claims",
     v is not None and "one passage" in v.lower(), f"got {v!r}")


# ── A valid pattern-first category passes ─────────────────────────
cat_good = mk_cat("Family Members in the Quran", [
    ("أَبِيهِ", "his father", "12:4"),
    ("أُمِّ", "mother of", "28:7"),
    ("غُلَامٍ", "a son", "37:101"),
    ("ابْنَتَ", "the daughter of", "66:12"),
])
v = gen.passage_anchor_violation(cat_good)
test("valid category: no passage-anchor violation", v is None, f"got {v!r}")
ok, reason = gen.semantic_coherence_check(cat_good)
test("valid category: coherence passes", ok and reason is None,
     f"got ok={ok} reason={reason!r}")


# ── Prompt: pattern-first, no passage mining ──────────────────────
prompt = gen.build_single_category_prompt(empty_history(), "2026-10-26", 0, [])
test("prompt no longer says 'Pick all 4 refs from ONE of those passages'",
     "so they sit near each other" not in prompt)
test("prompt requires the SOLVABILITY TEST",
     "SOLVABILITY TEST" in prompt)
test("prompt requires refs spread across DIFFERENT passages",
     "DIFFERENT passages" in prompt)
test("prompt forbids empty-container theme names",
     "empty container" in prompt)


print()
if FAIL:
    print(f"  {FAIL} test(s) FAILED")
    sys.exit(1)
print(f"  All {PASS} tests passed ✓")
