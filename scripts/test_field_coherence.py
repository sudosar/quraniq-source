#!/usr/bin/env python3
"""
Test the theme-name → field trigger check in semantic_coherence_check.

Added with the broader semantic field-coherence PR. The check has two parts:
  1. HARD REJECT: named field has 0 matches AND another field has 3+ matches.
  2. SOFT REJECT: named field has ≤2 matches AND another field has 3+ matches.

Catches obvious off-theme categories. Limitations (documented in the test):
  - #227 (luxury 2/2 vs place 2/2) is a tied split that this check cannot
    reliably catch without an LLM. The test verifies the LIKELY false
    negative, then documents the trade-off.
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


# --- 1. hard reject: named field is empty, competitor has 3+ matches ---
# Theme must actually name a field for the trigger to fire. No surah in the
# name, so the #228 surah check doesn't run first.
cat = {
    "nameEn": "Worldly Luxuries and Provisions",  # no surah → no surah check
    "items": [
        {"ref": "1:1", "ar": "", "en": "the stars", "verse": "", "verseEn": ""},
        {"ref": "1:2", "ar": "", "en": "the heavens", "verse": "", "verseEn": ""},
        {"ref": "1:3", "ar": "", "en": "the sun", "verse": "", "verseEn": ""},
        {"ref": "1:4", "ar": "", "en": "the moon", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("hard reject: 'luxuries' theme with 0 luxury items (all celestial)",
     not ok and reason and 'luxury' in reason.lower(),
     f"got ok={ok} reason={reason!r}")


# --- 2. soft reject: named field has 1-2 matches, competitor has 3+ ---
cat = {
    "nameEn": "Punishments in the Hereafter",
    "items": [
        {"ref": "1:1", "ar": "", "en": "punishment", "verse": "", "verseEn": ""},
        {"ref": "1:2", "ar": "", "en": "torment", "verse": "", "verseEn": ""},
        # These 3 don't match punishment but match creation
        {"ref": "1:3", "ar": "", "en": "the sun", "verse": "", "verseEn": ""},
        {"ref": "1:4", "ar": "", "en": "the moon", "verse": "", "verseEn": ""},
        {"ref": "1:5", "ar": "", "en": "the stars", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("soft reject: 'punishment' theme with 2/4 punishment + 3/4 creation",
     not ok and reason and 'punishment' in reason.lower(),
     f"got ok={ok} reason={reason!r}")


# --- 3. pass: named field has 3+ matches, no competitor beats it ---
cat = {
    "nameEn": "Worldly luxuries and provisions",  # No surah name
    "items": [
        {"ref": "1:1", "ar": "", "en": "ornament of gold", "verse": "", "verseEn": ""},
        {"ref": "1:2", "ar": "", "en": "silver", "verse": "", "verseEn": ""},
        {"ref": "1:3", "ar": "", "en": "comfort and luxury", "verse": "", "verseEn": ""},
        {"ref": "1:4", "ar": "", "en": "delicacies", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("pass: 'luxury' theme with 4/4 luxury items",
     ok, f"got ok={ok} reason={reason!r}")


# --- 4. pass: theme name doesn't trigger any field ---
cat = {
    "nameEn": "Astronomical entities in the Quran",
    "items": [
        {"ref": "1:1", "ar": "", "en": "the sun", "verse": "", "verseEn": ""},
        {"ref": "1:2", "ar": "", "en": "the moon", "verse": "", "verseEn": ""},
        {"ref": "1:3", "ar": "", "en": "the stars", "verse": "", "verseEn": ""},
        {"ref": "1:4", "ar": "", "en": "the heavens", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("pass: 'astronomical entities' doesn't trigger any field (1% cases pass through)",
     ok, f"got ok={ok} reason={reason!r}")


# --- 5. documented limitation: #227 (luxury 2/2 vs place 2/2) ---
cat_227 = {
    "nameEn": "Worldly Luxuries and Provisions in Surah Az-Zukhruf",
    "items": [
        {"ref": "43:31", "ar": "الْقَرْيَتَيْنِ", "en": "the two towns", "verse": "", "verseEn": ""},
        {"ref": "43:32", "ar": "مَعِيشَتَهُمْ", "en": "their livelihood", "verse": "", "verseEn": ""},
        {"ref": "43:34", "ar": "أَبْوَابًا", "en": "doors", "verse": "", "verseEn": ""},
        {"ref": "43:35", "ar": "زُخْرُفًا", "en": "ornaments of gold", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat_227)
test("documented limitation: #227 (2 luxury / 2 place tie) currently passes through",
     ok,
     f"got ok={ok} reason={reason!r} (this is a known limitation — needs an LLM to disambiguate tied splits)")


# --- 6. surah-anchored theme with all items in the surah still passes ---
cat = {
    "nameEn": "Worldly Luxuries and Provisions in Surah Az-Zukhruf",
    "items": [
        {"ref": "43:31", "ar": "", "en": "the two towns", "verse": "", "verseEn": ""},
        {"ref": "43:32", "ar": "", "en": "their livelihood", "verse": "", "verseEn": ""},
        {"ref": "43:33", "ar": "", "en": "ornaments of gold", "verse": "", "verseEn": ""},
        {"ref": "43:35", "ar": "", "en": "delicacies", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("pass: 'luxury' theme with 3/4 luxury items, all in same surah",
     ok, f"got ok={ok} reason={reason!r}")


# --- 7. legitimate coherent category: 'family members' ---
cat = {
    "nameEn": "Family Members in the Quran",
    "items": [
        {"ref": "1:1", "ar": "", "en": "father", "verse": "", "verseEn": ""},
        {"ref": "1:2", "ar": "", "en": "mother", "verse": "", "verseEn": ""},
        {"ref": "1:3", "ar": "", "en": "son", "verse": "", "verseEn": ""},
        {"ref": "1:4", "ar": "", "en": "daughter", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("pass: 'family members' theme with 4/4 family items",
     ok, f"got ok={ok} reason={reason!r}")


# --- 8. regression: surah-coherence still works (from #228) ---
cat = {
    "nameEn": "Words from Iblis's Address in Surah Al-Hijr",
    "items": [
        {"ref": "15:36", "ar": "", "en": "give me respite", "verse": "", "verseEn": ""},
        {"ref": "15:39", "ar": "", "en": "I will make fair-seeming", "verse": "", "verseEn": ""},
        {"ref": "15:40", "ar": "", "en": "the sincere", "verse": "", "verseEn": ""},
        {"ref": "15:42", "ar": "", "en": "any authority", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("pass: surah-anchored theme with all items in surah (#228 still works)",
     ok, f"got ok={ok} reason={reason!r}")


# --- 9. regression: surah-coherence still catches off-surah items ---
cat = {
    "nameEn": "Words from Iblis's Address in Surah Al-Hijr",
    "items": [
        {"ref": "15:36", "ar": "", "en": "give me respite", "verse": "", "verseEn": ""},
        {"ref": "15:39", "ar": "", "en": "I will make fair-seeming", "verse": "", "verseEn": ""},
        {"ref": "15:40", "ar": "", "en": "the sincere", "verse": "", "verseEn": ""},
        {"ref": "2:255", "ar": "", "en": "Ayat al-Kursi", "verse": "", "verseEn": ""},  # Wrong surah!
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("reject: surah-anchored theme with item from wrong surah (#228 still works)",
     not ok, f"got ok={ok} reason={reason!r}")


# --- 10. ensure no infinite loop in theme iteration ---
cat = {
    "nameEn": "Names of the Four Classical Elements",
    "items": [
        {"ref": "1:1", "ar": "", "en": "water", "verse": "", "verseEn": ""},
        {"ref": "1:2", "ar": "", "en": "fire", "verse": "", "verseEn": ""},
        {"ref": "1:3", "ar": "", "en": "earth", "verse": "", "verseEn": ""},
        {"ref": "1:4", "ar": "", "en": "wind", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
# "classical" / "elements" don't trigger any field — falls through to Layer 2
# Layer 2 might or might not catch this depending on clustering. Just check
# the function doesn't crash.
test("function terminates without crashing on ambiguous theme",
     isinstance(ok, bool), f"got ok={ok} reason={reason!r}")


print()
if FAIL:
    print(f"  {FAIL} test(s) FAILED")
    sys.exit(1)
print(f"  All {PASS} tests passed ✓")
