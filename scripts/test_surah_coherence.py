#!/usr/bin/env python3
"""
Test the surah-coherence check in semantic_coherence_check.

Triggered by:
  #226 — "Sultan is not iblis's address"
    Theme: "Words from Iblis's Address in Surah Al-Hijr"
    Items: 15:36, 15:39, 15:40, 15:42  ← 15:42 is Allah's reply, not Iblis's
    The new check should: pass the surah-in-coherence check (all in surah 15)
    but the structural complaint about a 7-verse span is below threshold,
    so we ALSO need a thematic check. For this test we verify the
    _surah_proximity_violation helper detects both real and synthetic bad
    inputs.

  #227 — "Purple words don't really connect"
    Theme: "Worldly Luxuries and Provisions in Surah Az-Zukhruf"
    Items: 43:31, 43:32, 43:34, 43:35  ← span 5 verses, all in surah 43
    These actually pass the surah-in-coherence check, so the bug is
    semantic (items don't match "luxuries" theme). The new check is
    necessary but not sufficient for this case. Document the limitation
    rather than over-claim.
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


def make_items(refs):
    return [{"ref": r, "ar": "x", "en": "x", "verse": "", "verseEn": ""} for r in refs]


# --- case 1: _extract_surah_from_theme returns the right number ---
test("extract: 'Words from Iblis's Address in Surah Al-Hijr' → 15",
     gen._extract_surah_from_theme("Words from Iblis's Address in Surah Al-Hijr") == 15)

test("extract: 'Worldly Luxuries in Surah Az-Zukhruf' → 43",
     gen._extract_surah_from_theme("Worldly Luxuries and Provisions in Surah Az-Zukhruf") == 43)

test("extract: '... in Surah Ad-Dukhan' → 44",
     gen._extract_surah_from_theme("Elements of the Sinners' Punishment in Surah Ad-Dukhan") == 44)

test("extract: '(Surah Al-Buruj)' → 85",
     gen._extract_surah_from_theme("The People of the Ditch (Surah Al-Buruj)") == 85)

test("extract: theme with no surah → None",
     gen._extract_surah_from_theme("Astronomical entities in the Quran") is None)

test("extract: unknown surah name → None",
     gen._extract_surah_from_theme("Words from Surah Al-Foobar") is None)


# --- case 2: _surah_proximity_violation catches off-surah refs ---
items_off_surah = make_items(["15:36", "15:39", "15:40", "99:1"])  # last is from surah 99
v = gen._surah_proximity_violation(items_off_surah, 15)
test("off-surah item rejected", v is not None and "from other surahs" in v,
     f"got {v!r}")


# --- case 3: items spanning too many verses ---
items_scattered = make_items(["15:36", "15:39", "15:40", "15:80"])
v = gen._surah_proximity_violation(items_scattered, 15, max_span=20)
test("items span 45 verses (>20) rejected", v is not None and "span" in v,
     f"got {v!r}")


# --- case 4: tightly clustered items pass ---
items_tight = make_items(["15:36", "15:39", "15:40", "15:42"])
v = gen._surah_proximity_violation(items_tight, 15, max_span=20)
test("items span 7 verses passes proximity check", v is None, f"got {v!r}")


# --- case 5: real bug #226 (theme names surah, but should be rejected for off-theme) ---
# Note: the off-surah is a 15:42 vs 15:36-40, all in surah 15. So the new check
# actually PASSES this category on its own — the real complaint is semantic.
# The new check will still catch FUTURE off-surah inclusions, which is the
# realistic regression class. The semantic check is a separate problem.
cat_226 = {
    "nameEn": "Words from Iblis's Address in Surah Al-Hijr",
    "items": [
        {"ref": "15:36", "ar": "أَنْظِرْنِي", "en": "Then give me respite"},
        {"ref": "15:39", "ar": "أُزَيِّنَنَّ", "en": "surely, I will make (evil) fair-seeming"},
        {"ref": "15:40", "ar": "الْمُخْلَصِينَ", "en": "the ones who are sincere"},
        {"ref": "15:42", "ar": "سُلْطَانٌ", "en": "any authority"},
    ],
}
ok, reason = gen.semantic_coherence_check(cat_226)
test("bug #226: all 4 items in surah 15 within 7 verses → coherence passes",
     ok and reason is None,
     f"got ok={ok} reason={reason!r} (this documents the limitation: the new check is necessary but not sufficient for this bug)")


# --- case 6: real bug #227 (purple items in same surah, span 5) ---
cat_227 = {
    "nameEn": "Worldly Luxuries and Provisions in Surah Az-Zukhruf",
    "items": [
        {"ref": "43:31", "ar": "الْقَرْيَتَيْنِ", "en": "the two towns"},
        {"ref": "43:32", "ar": "مَعِيشَتَهُمْ", "en": "their livelihood"},
        {"ref": "43:34", "ar": "أَبْوَابًا", "en": "doors"},
        {"ref": "43:35", "ar": "زُخْرُفًا", "en": "ornaments of gold"},
    ],
}
ok, reason = gen.semantic_coherence_check(cat_227)
test("bug #227: items in surah 43 within 5 verses → coherence passes",
     ok and reason is None,
     f"got ok={ok} reason={reason!r} (limitation: items are in the right surah but the theme is semantic)")


# --- case 7: hypothetical bad category that the new check SHOULD catch ---
cat_bad = {
    "nameEn": "Words from Iblis's Address in Surah Al-Hijr",
    "items": [
        {"ref": "15:36", "ar": "x", "en": "x"},
        {"ref": "15:39", "ar": "x", "en": "x"},
        {"ref": "15:40", "ar": "x", "en": "x"},
        {"ref": "2:255", "ar": "x", "en": "x"},  # Ayat al-Kursi, wrong surah
    ],
}
ok, reason = gen.semantic_coherence_check(cat_bad)
test("hypothetical: 2:255 sneaking into a Surah-15 theme is REJECTED",
     not ok and reason and "from other surahs" in reason,
     f"got ok={ok} reason={reason!r}")


# --- case 8: very long surah with scattered items ---
cat_scattered = {
    "nameEn": "Verses of Guidance in Surah Al-Baqarah",
    "items": [
        {"ref": "2:5", "ar": "x", "en": "x"},
        {"ref": "2:100", "ar": "x", "en": "x"},
        {"ref": "2:200", "ar": "x", "en": "x"},
        {"ref": "2:285", "ar": "x", "en": "x"},
    ],
}
ok, reason = gen.semantic_coherence_check(cat_scattered)
test("scattered items across surah 2 (281 verses) REJECTED",
     not ok and reason and "span" in reason,
     f"got ok={ok} reason={reason!r}")


print()
if FAIL:
    print(f"  {FAIL} test(s) FAILED")
    sys.exit(1)
print(f"  All {PASS} tests passed ✓")
