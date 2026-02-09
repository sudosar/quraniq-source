#!/usr/bin/env python3
"""
Test the 30-day cooldown enforcement in generate_daily_puzzle.py.
Tests all 4 game types: connections, wordle, deduction, scramble.
"""
import json
import os
import sys
import tempfile
import shutil
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_daily_puzzle as gen

PASS = 0
FAIL = 0


def test(name, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ✓ {name}")
    else:
        FAIL += 1
        print(f"  ✗ {name}")
        if detail:
            print(f"    → {detail}")


def make_empty_history():
    return {
        "connections": {"themes": set(), "verses": set(), "words": set()},
        "wordle": {"words": set(), "verses": set(), "hints": set()},
        "deduction": {"titles": set(), "prophets": set()},
        "scramble": {"verses": set(), "references": set()},
    }


def make_test_connections():
    return {
        "categories": [
            {
                "name": "تست", "nameEn": "Test Theme Alpha", "color": "yellow",
                "items": [
                    {"ar": "كلمة١", "en": "Word 1", "verse": "verse text", "ref": "2:255", "verseEn": ""},
                    {"ar": "كلمة٢", "en": "Word 2", "verse": "verse text", "ref": "2:256", "verseEn": ""},
                    {"ar": "كلمة٣", "en": "Word 3", "verse": "verse text", "ref": "2:257", "verseEn": ""},
                    {"ar": "كلمة٤", "en": "Word 4", "verse": "verse text", "ref": "2:258", "verseEn": ""},
                ],
                "verse": {"ayah": "test", "en": "test", "ref": "2:255"}
            },
            {
                "name": "تست٢", "nameEn": "Test Theme Beta", "color": "green",
                "items": [
                    {"ar": "كلمة٥", "en": "Word 5", "verse": "verse text", "ref": "3:1", "verseEn": ""},
                    {"ar": "كلمة٦", "en": "Word 6", "verse": "verse text", "ref": "3:2", "verseEn": ""},
                    {"ar": "كلمة٧", "en": "Word 7", "verse": "verse text", "ref": "3:3", "verseEn": ""},
                    {"ar": "كلمة٨", "en": "Word 8", "verse": "verse text", "ref": "3:4", "verseEn": ""},
                ],
                "verse": {"ayah": "test", "en": "test", "ref": "3:1"}
            },
            {
                "name": "تست٣", "nameEn": "Test Theme Gamma", "color": "blue",
                "items": [
                    {"ar": "كلمة٩", "en": "Word 9", "verse": "verse text", "ref": "4:1", "verseEn": ""},
                    {"ar": "كلمة١٠", "en": "Word 10", "verse": "verse text", "ref": "4:2", "verseEn": ""},
                    {"ar": "كلمة١١", "en": "Word 11", "verse": "verse text", "ref": "4:3", "verseEn": ""},
                    {"ar": "كلمة١٢", "en": "Word 12", "verse": "verse text", "ref": "4:4", "verseEn": ""},
                ],
                "verse": {"ayah": "test", "en": "test", "ref": "4:1"}
            },
            {
                "name": "تست٤", "nameEn": "Test Theme Delta", "color": "purple",
                "items": [
                    {"ar": "كلمة١٣", "en": "Word 13", "verse": "verse text", "ref": "5:1", "verseEn": ""},
                    {"ar": "كلمة١٤", "en": "Word 14", "verse": "verse text", "ref": "5:2", "verseEn": ""},
                    {"ar": "كلمة١٥", "en": "Word 15", "verse": "verse text", "ref": "5:3", "verseEn": ""},
                    {"ar": "كلمة١٦", "en": "Word 16", "verse": "verse text", "ref": "5:4", "verseEn": ""},
                ],
                "verse": {"ayah": "test", "en": "test", "ref": "5:1"}
            }
        ]
    }


def make_test_wordle():
    return {
        "word": "رحمة",
        "display": "رَحْمَة",
        "hint": "Allah's attribute most mentioned - mercy",
        "verse": "Surah Al-A'raf 7:156 — My mercy encompasses all things.",
        "arabicVerse": "وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ"
    }


def make_test_deduction():
    return {
        "title": "The Test Mystery",
        "intro": "A test intro paragraph...",
        "clues": ["Clue 1", "Clue 2", "Clue 3", "Clue 4", "Clue 5", "Clue 6"],
        "categories": {
            "prophet": {"label": "Prophet", "options": ["Musa", "Isa", "Ibrahim", "Nuh", "Yusuf"], "answer": "Yusuf"},
            "trial": {"label": "Trial", "options": ["opt1", "opt2", "opt3", "opt4", "opt5"], "answer": "opt1"},
            "location": {"label": "Location", "options": ["opt1", "opt2", "opt3", "opt4", "opt5"], "answer": "opt1"},
            "outcome": {"label": "Outcome", "options": ["opt1", "opt2", "opt3", "opt4", "opt5"], "answer": "opt1"},
        },
        "verse": "Test verse translation",
        "arabic": "آية اختبار"
    }


def make_test_scramble():
    return {
        "reference": "Surah Al-Fatiha (1:1)",
        "words": ["بِسْمِ", "اللَّهِ", "الرَّحْمَٰنِ", "الرَّحِيمِ"],
        "translations": ["In the name of", "Allah", "the Most Gracious", "the Most Merciful"],
        "arabic": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
        "hint": "The opening verse of the Quran"
    }


# ═══════════════════════════════════════════════════════════════
# CONNECTIONS TESTS
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("CONNECTIONS TESTS")
print("="*50)

print("\n1. Validate connections with empty history")
history = make_empty_history()
puzzle = make_test_connections()
errors, cooldown, warnings = gen.validate_connections(puzzle, history)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("No cooldown violations", len(cooldown) == 0, f"cooldown={cooldown}")

print("\n2. Validate connections with verse in cooldown")
history = make_empty_history()
history["connections"]["verses"].add("2:255")
puzzle = make_test_connections()
errors, cooldown, warnings = gen.validate_connections(puzzle, history)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("Cooldown violation for 2:255", any("2:255" in v for v in cooldown), f"cooldown={cooldown}")

print("\n3. Validate connections with theme in cooldown")
history = make_empty_history()
history["connections"]["themes"].add("test theme alpha")
puzzle = make_test_connections()
errors, cooldown, warnings = gen.validate_connections(puzzle, history)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("Cooldown violation for theme", any("theme" in v.lower() for v in cooldown), f"cooldown={cooldown}")

print("\n4. Validate connections with word in cooldown (soft warning)")
history = make_empty_history()
history["connections"]["words"].add("كلمة١")
puzzle = make_test_connections()
errors, cooldown, warnings = gen.validate_connections(puzzle, history)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("No cooldown violations (word is soft)", len(cooldown) == 0, f"cooldown={cooldown}")
test("Warning for word reuse", any("كلمة١" in w for w in warnings), f"warnings={warnings}")

print("\n5. Validate connections with wrong item count")
history = make_empty_history()
bad_puzzle = make_test_connections()
bad_puzzle["categories"][0]["items"] = bad_puzzle["categories"][0]["items"][:3]
errors, cooldown, warnings = gen.validate_connections(bad_puzzle, history)
test("Structural error for wrong item count", any("3 items" in e for e in errors), f"errors={errors}")

print("\n6. Build connections prompt includes history")
history = make_empty_history()
history["connections"]["themes"] = {"prophets of firm resolve", "pillars of islam"}
history["connections"]["verses"] = {"2:255", "4:163"}
prompt = gen.build_connections_prompt(history)
test("Prompt contains avoided themes", "prophets of firm resolve" in prompt.lower())
test("Prompt contains avoided verses", "2:255" in prompt)

print("\n7. Build connections prompt with violations")
violations = ["Verse ref 2:255 reused (30-day cooldown)"]
prompt = gen.build_connections_prompt(history, previous_violations=violations)
test("Prompt contains violation block", "PREVIOUS ATTEMPT FAILED" in prompt)
test("Prompt contains specific violation", "2:255 reused" in prompt)


# ═══════════════════════════════════════════════════════════════
# WORDLE TESTS
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("WORDLE TESTS")
print("="*50)

print("\n8. Validate wordle with empty history")
history = make_empty_history()
puzzle = make_test_wordle()
errors, cooldown, warnings = gen.validate_wordle(puzzle, history)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("No cooldown violations", len(cooldown) == 0, f"cooldown={cooldown}")

print("\n9. Validate wordle with word in cooldown")
history = make_empty_history()
history["wordle"]["words"].add("رحمة")
puzzle = make_test_wordle()
errors, cooldown, warnings = gen.validate_wordle(puzzle, history)
test("Cooldown violation for word", any("رحمة" in v for v in cooldown), f"cooldown={cooldown}")

print("\n10. Validate wordle with missing fields")
history = make_empty_history()
bad_puzzle = {"word": "رحمة"}
errors, cooldown, warnings = gen.validate_wordle(bad_puzzle, history)
test("Structural errors for missing fields", len(errors) >= 3, f"errors={errors}")

print("\n11. Validate wordle word length")
history = make_empty_history()
long_puzzle = make_test_wordle()
long_puzzle["word"] = "استغفار"  # 7 letters, too long
errors, cooldown, warnings = gen.validate_wordle(long_puzzle, history)
test("Error for word too long", any("letters" in e for e in errors), f"errors={errors}")


# ═══════════════════════════════════════════════════════════════
# DEDUCTION TESTS
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("DEDUCTION TESTS")
print("="*50)

print("\n12. Validate deduction with empty history")
history = make_empty_history()
puzzle = make_test_deduction()
errors, cooldown, warnings = gen.validate_deduction(puzzle, history)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("No cooldown violations", len(cooldown) == 0, f"cooldown={cooldown}")

print("\n13. Validate deduction with title in cooldown")
history = make_empty_history()
history["deduction"]["titles"].add("the test mystery")
puzzle = make_test_deduction()
errors, cooldown, warnings = gen.validate_deduction(puzzle, history)
test("Cooldown violation for title", any("title" in v.lower() for v in cooldown), f"cooldown={cooldown}")

print("\n14. Validate deduction with prophet in cooldown")
history = make_empty_history()
history["deduction"]["prophets"].add("Yusuf")
puzzle = make_test_deduction()
errors, cooldown, warnings = gen.validate_deduction(puzzle, history)
test("Cooldown violation for prophet", any("Yusuf" in v for v in cooldown), f"cooldown={cooldown}")

print("\n15. Validate deduction with wrong clue count")
history = make_empty_history()
bad_puzzle = make_test_deduction()
bad_puzzle["clues"] = ["Clue 1", "Clue 2"]  # Only 2 clues
errors, cooldown, warnings = gen.validate_deduction(bad_puzzle, history)
test("Error for wrong clue count", any("clues" in e for e in errors), f"errors={errors}")

print("\n16. Validate deduction with answer not in options")
history = make_empty_history()
bad_puzzle = make_test_deduction()
bad_puzzle["categories"]["prophet"]["answer"] = "Adam"  # Not in options
errors, cooldown, warnings = gen.validate_deduction(bad_puzzle, history)
test("Error for answer not in options", any("not in options" in e for e in errors), f"errors={errors}")


# ═══════════════════════════════════════════════════════════════
# SCRAMBLE TESTS
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("SCRAMBLE TESTS")
print("="*50)

print("\n17. Validate scramble with empty history")
history = make_empty_history()
puzzle = make_test_scramble()
errors, cooldown, warnings = gen.validate_scramble(puzzle, history)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("No cooldown violations", len(cooldown) == 0, f"cooldown={cooldown}")

print("\n18. Validate scramble with reference in cooldown")
history = make_empty_history()
history["scramble"]["references"].add("Surah Al-Fatiha (1:1)")
puzzle = make_test_scramble()
errors, cooldown, warnings = gen.validate_scramble(puzzle, history)
test("Cooldown violation for reference", any("reference" in v.lower() or "Reference" in v for v in cooldown), f"cooldown={cooldown}")

print("\n19. Validate scramble with too few segments")
history = make_empty_history()
bad_puzzle = make_test_scramble()
bad_puzzle["words"] = ["بِسْمِ", "اللَّهِ"]  # Only 2 segments
bad_puzzle["translations"] = ["In the name of", "Allah"]
errors, cooldown, warnings = gen.validate_scramble(bad_puzzle, history)
test("Error for too few segments", any("segment" in e for e in errors), f"errors={errors}")

print("\n20. Validate scramble with missing fields")
history = make_empty_history()
bad_puzzle = {"words": ["بِسْمِ", "اللَّهِ", "الرَّحْمَٰنِ", "الرَّحِيمِ"]}
errors, cooldown, warnings = gen.validate_scramble(bad_puzzle, history)
test("Errors for missing fields", len(errors) >= 2, f"errors={errors}")


# ═══════════════════════════════════════════════════════════════
# HISTORY TESTS
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("HISTORY TESTS")
print("="*50)

print("\n21. Load history from temp directory")
tmpdir = tempfile.mkdtemp()
old_history_dir = gen.HISTORY_DIR
gen.HISTORY_DIR = tmpdir
try:
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    test_history_data = {
        "connections": make_test_connections(),
        "wordle": make_test_wordle(),
        "deduction": make_test_deduction(),
        "scramble": make_test_scramble(),
    }
    with open(os.path.join(tmpdir, f"{yesterday}.json"), "w") as f:
        json.dump(test_history_data, f, ensure_ascii=False)

    old_date = (datetime.utcnow() - timedelta(days=35)).strftime("%Y-%m-%d")
    with open(os.path.join(tmpdir, f"{old_date}.json"), "w") as f:
        json.dump(test_history_data, f, ensure_ascii=False)

    history = gen.load_history()
    test("Connections themes loaded", "test theme alpha" in history["connections"]["themes"],
         f"themes={history['connections']['themes']}")
    test("Connections verses loaded", "2:255" in history["connections"]["verses"],
         f"verses={history['connections']['verses']}")
    test("Harf by Harf words loaded", "رحمة" in history["wordle"]["words"],
         f"words={history['wordle']['words']}")
    test("Deduction titles loaded", "the test mystery" in history["deduction"]["titles"],
         f"titles={history['deduction']['titles']}")
    test("Scramble references loaded", "Surah Al-Fatiha (1:1)" in history["scramble"]["references"],
         f"refs={history['scramble']['references']}")
    test("Old history file cleaned up",
         not os.path.exists(os.path.join(tmpdir, f"{old_date}.json")))
finally:
    gen.HISTORY_DIR = old_history_dir
    shutil.rmtree(tmpdir)


# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
print(f"\n{'='*50}")
print(f"Results: {PASS} passed, {FAIL} failed out of {PASS + FAIL} tests")
if FAIL > 0:
    sys.exit(1)
else:
    print("All tests passed! ✓")
    sys.exit(0)
