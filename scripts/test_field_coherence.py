#!/usr/bin/env python3
"""
Test the theme-name → field trigger check in semantic_coherence_check.

Added with the broader semantic field-coherence PR. The check has two parts:
  1. HARD REJECT: named field has 0 matches AND another field has 3+ matches.
  2. SOFT REJECT: named field has ≤2 matches AND another field has 3+ matches.

UPDATE (#235): this suite originally used placeholder refs (1:1-1:4)
and two cases asserted that surah-anchored themes PASS. Both are
superseded: semantic_coherence_check now runs the pattern-anchor check
(Layer 0) first, which rejects surah-named themes and single-passage
clusters. Fixtures below therefore use realistic spread refs, and the
#227/#228 cases assert the new rejection.

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
        {"ref": "37:6", "ar": "", "en": "the stars", "verse": "", "verseEn": ""},
        {"ref": "91:1", "ar": "", "en": "the heavens", "verse": "", "verseEn": ""},
        {"ref": "14:32", "ar": "", "en": "the sun", "verse": "", "verseEn": ""},
        {"ref": "54:1", "ar": "", "en": "the moon", "verse": "", "verseEn": ""},
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
        {"ref": "43:35", "ar": "", "en": "ornament of gold", "verse": "", "verseEn": ""},
        {"ref": "18:31", "ar": "", "en": "silver", "verse": "", "verseEn": ""},
        {"ref": "22:23", "ar": "", "en": "comfort and luxury", "verse": "", "verseEn": ""},
        {"ref": "35:33", "ar": "", "en": "delicacies", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("pass: 'luxury' theme with 4/4 luxury items",
     ok, f"got ok={ok} reason={reason!r}")


# --- 4. pass: theme name doesn't trigger any field ---
cat = {
    "nameEn": "Astronomical entities in the Quran",
    "items": [
        {"ref": "91:1", "ar": "", "en": "the sun", "verse": "", "verseEn": ""},
        {"ref": "55:5", "ar": "", "en": "the moon", "verse": "", "verseEn": ""},
        {"ref": "37:6", "ar": "", "en": "the stars", "verse": "", "verseEn": ""},
        {"ref": "21:33", "ar": "", "en": "the heavens", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("pass: 'astronomical entities' doesn't trigger any field (1% cases pass through)",
     ok, f"got ok={ok} reason={reason!r}")


# --- 5. #227 (luxury 2/2 vs place 2/2) — was a documented limitation ---
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
test("#227 category now REJECTED as passage-anchored (#235 supersedes the limitation)",
     not ok and reason and "surah" in reason.lower(),
     f"got ok={ok} reason={reason!r}")


# --- 6. pattern theme (no surah named) with 3/4 luxury items passes ---
# (The original case asserted a surah-anchored version of this theme
# passes; that behaviour is superseded by #235 — see case 5.)
cat = {
    "nameEn": "Worldly Luxuries and Provisions",
    "items": [
        {"ref": "43:31", "ar": "", "en": "the two towns", "verse": "", "verseEn": ""},
        {"ref": "43:32", "ar": "", "en": "their livelihood", "verse": "", "verseEn": ""},
        {"ref": "18:31", "ar": "", "en": "ornaments of gold", "verse": "", "verseEn": ""},
        {"ref": "52:22", "ar": "", "en": "delicacies", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("pass: 'luxury' theme with 3/4 luxury items, refs spread",
     ok, f"got ok={ok} reason={reason!r}")


# --- 7. legitimate coherent category: 'family members' ---
cat = {
    "nameEn": "Family Members in the Quran",
    "items": [
        {"ref": "12:4", "ar": "", "en": "father", "verse": "", "verseEn": ""},
        {"ref": "28:7", "ar": "", "en": "mother", "verse": "", "verseEn": ""},
        {"ref": "37:101", "ar": "", "en": "son", "verse": "", "verseEn": ""},
        {"ref": "66:12", "ar": "", "en": "daughter", "verse": "", "verseEn": ""},
    ],
}
ok, reason = gen.semantic_coherence_check(cat)
test("pass: 'family members' theme with 4/4 family items",
     ok, f"got ok={ok} reason={reason!r}")


# --- 8. #228 case: surah-anchored themes are now rejected (#235) ---
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
test("reject: surah-anchored theme even with all items in surah (#228 superseded by #235)",
     not ok and reason and "surah" in reason.lower(), f"got ok={ok} reason={reason!r}")


# --- 9. regression: surah-anchored theme with an off-surah item still rejected ---
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
test("reject: surah-anchored theme with item from wrong surah",
     not ok, f"got ok={ok} reason={reason!r}")


# --- 10. ensure no infinite loop in theme iteration ---
cat = {
    "nameEn": "Names of the Four Classical Elements",
    "items": [
        {"ref": "21:30", "ar": "", "en": "water", "verse": "", "verseEn": ""},
        {"ref": "2:24", "ar": "", "en": "fire", "verse": "", "verseEn": ""},
        {"ref": "7:57", "ar": "", "en": "earth", "verse": "", "verseEn": ""},
        {"ref": "30:48", "ar": "", "en": "wind", "verse": "", "verseEn": ""},
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
