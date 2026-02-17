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
        "harf": {"words": set(), "verses": set(), "hints": set(), "verseRefs": set(), "surahs": set()},
        "deduction": {"titles": set(), "characters": set(), "verseRefs": set(), "surahs": set()},
        "scramble": {"verses": set(), "references": set(), "surahs": set()},
        "juz": {"juz_numbers": set(), "verses": set()},
        "all_verses": set(),
    }


def make_test_connections():
    return {
        "categories": [
            {
                "name": "تست", "nameEn": "Test Theme Alpha", "color": "yellow",
                "items": [
                    {"ar": "شمس", "en": "Sun", "verse": "verse text", "ref": "2:255", "verseEn": ""},
                    {"ar": "قمر", "en": "Moon", "verse": "verse text", "ref": "2:256", "verseEn": ""},
                    {"ar": "نجم", "en": "Star", "verse": "verse text", "ref": "2:257", "verseEn": ""},
                    {"ar": "سماء", "en": "Sky", "verse": "verse text", "ref": "2:258", "verseEn": ""},
                ],
                "verse": {"ayah": "test", "en": "test", "ref": "1:1"}
            },
            {
                "name": "تست٢", "nameEn": "Test Theme Beta", "color": "green",
                "items": [
                    {"ar": "غيمة", "en": "Cloud", "verse": "verse text", "ref": "3:1", "verseEn": ""},
                    {"ar": "نار", "en": "Fire", "verse": "verse text", "ref": "3:2", "verseEn": ""},
                    {"ar": "تراب", "en": "Dirt", "verse": "verse text", "ref": "3:3", "verseEn": ""},
                    {"ar": "ريح", "en": "Wind", "verse": "verse text", "ref": "3:4", "verseEn": ""},
                ],
                "verse": {"ayah": "test", "en": "test", "ref": "1:2"}
            },
            {
                "name": "تست٣", "nameEn": "Test Theme Gamma", "color": "blue",
                "items": [
                    {"ar": "جبل", "en": "Mountain", "verse": "verse text", "ref": "4:1", "verseEn": ""},
                    {"ar": "بحر", "en": "Sea", "verse": "verse text", "ref": "4:2", "verseEn": ""},
                    {"ar": "وادي", "en": "Valley", "verse": "verse text", "ref": "4:3", "verseEn": ""},
                    {"ar": "نهر", "en": "River", "verse": "verse text", "ref": "4:4", "verseEn": ""},
                ],
                "verse": {"ayah": "test", "en": "test", "ref": "1:3"}
            },
            {
                "name": "تست٤", "nameEn": "Test Theme Delta", "color": "purple",
                "items": [
                    {"ar": "خبز", "en": "Bread", "verse": "verse text", "ref": "5:1", "verseEn": ""},
                    {"ar": "لحم", "en": "Meat", "verse": "verse text", "ref": "5:2", "verseEn": ""},
                    {"ar": "عسل", "en": "Honey", "verse": "verse text", "ref": "5:3", "verseEn": ""},
                    {"ar": "لبن", "en": "Milk", "verse": "verse text", "ref": "5:4", "verseEn": ""},
                ],
                "verse": {"ayah": "test", "en": "test", "ref": "1:4"}
            }
        ]
    }


def make_test_harf():
    return {
        "word": "رحمة",
        "display": "رَحْمَة",
        "hint": "Allah's attribute most mentioned - mercy",
        "verseRef": "7:156",
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
        "verseRef": "12:1",
        "verse": "Test verse translation",
        "arabic": "آية اختبار"
    }


def make_test_scramble():
    return {
        "reference": "Surah Al-Fatiha (1:1)",
        "verseRef": "1:1",
        "segments": ["بِسْمِ", "اللَّهِ", "الرَّحْمَٰنِ", "الرَّحِيمِ"],
        "translations": ["In the name of", "Allah", "the Most Gracious", "the Most Merciful"],
        "arabic": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
        "hint": "The opening verse of the Quran"
    }


def make_test_juz():
    return {
        "juz_number": 1,
        "juz_name": "Alif Lam Meem",
        "juz_name_ar": "الم",
        "verse": {
            "surah_number": 2,
            "surah_name": "Al-Baqarah",
            "surah_name_ar": "البقرة",
            "ayah_number": 45,
            "arabic_text": "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ",
            "translation": "And seek help through patience and prayer.",
            "audio_url": "https://cdn.islamic.network/quran/audio/128/ar.alafasy/52.mp3"
        },
        "theme_question": {
            "correct": "Patience and prayer",
            "options": ["Patience and prayer", "Fasting", "Charity", "Hajj"]
        },
        "surah_question": {
            "correct_surah": 2,
            "options": [
                {"num": 1, "name": "Al-Fatiha", "name_ar": "الفاتحة", "name_en": "The Opening"},
                {"num": 2, "name": "Al-Baqarah", "name_ar": "البقرة", "name_en": "The Cow"},
                {"num": 3, "name": "Aal-E-Imran", "name_ar": "آل عمران", "name_en": "The Family of Imran"},
                {"num": 4, "name": "An-Nisa", "name_ar": "النساء", "name_en": "The Women"}
            ]
        },
        "surah_order": {
            "surahs": [{"num": 1, "name": "Al-Fatiha", "name_ar": "الفاتحة", "name_en": "The Opening"}]
        },
        "educational_notes": {
            "verse_context": "test",
            "theme_explanation": "test",
            "surah_overview": "test"
        }
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
history["connections"]["words"].add("شمس")
puzzle = make_test_connections()
errors, cooldown, warnings = gen.validate_connections(puzzle, history)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("No cooldown violations (word is soft)", len(cooldown) == 0, f"cooldown={cooldown}")
test("Warning for word reuse", any("شمس" in w for w in warnings), f"warnings={warnings}")

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
test("Prompt contains violation block", "PREVIOUS ATTEMPT REUSED THESE" in prompt)
test("Prompt contains specific violation", "2:255 reused" in prompt)


# HARF TESTS
print("\n" + "="*50)
print("HARF TESTS")
print("="*50)

print("\n8. Validate harf with empty history")
history = make_empty_history()
puzzle = make_test_harf()
errors, cooldown, warnings = gen.validate_harf(puzzle, history)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("No cooldown violations", len(cooldown) == 0, f"cooldown={cooldown}")

print("\n9. Validate harf with word in cooldown")
history = make_empty_history()
history["harf"]["words"].add("رحمة")
puzzle = make_test_harf()
errors, cooldown, warnings = gen.validate_harf(puzzle, history)
test("Cooldown violation for word", any("رحمة" in v for v in cooldown), f"cooldown={cooldown}")

print("\n10. Validate harf with missing fields")
history = make_empty_history()
bad_puzzle = {"word": "رحمة"}
errors, cooldown, warnings = gen.validate_harf(bad_puzzle, history)
test("Structural errors for missing fields", len(errors) >= 3, f"errors={errors}")

print("\n11. Validate harf word length")
history = make_empty_history()
long_puzzle = make_test_harf()
long_puzzle["word"] = "استغفار"  # 7 letters, too long
errors, cooldown, warnings = gen.validate_harf(long_puzzle, history)
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
history["deduction"]["characters"].add("Yusuf")
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
# JUZ JOURNEY TESTS (Decoupled Cooldown)
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("JUZ JOURNEY TESTS")
print("="*50)

print("\n21. Validate juz with empty history")
history = make_empty_history()
puzzle = make_test_juz()
errors, cooldown, warnings = gen.validate_juz(puzzle, history)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("No cooldown violations", len(cooldown) == 0, f"cooldown={cooldown}")

print("\n22. Validate juz with verse in global cooldown (SHOULD BE EXEMPT)")
history = make_empty_history()
history["all_verses"].add("2:45")
puzzle = make_test_juz()
errors, cooldown, warnings = gen.validate_juz(puzzle, history)
test("No cooldown violation (exempt from global)", len(cooldown) == 0, f"cooldown={cooldown}")

print("\n23. Validate juz with verse in its own cooldown (SHOULD FAIL)")
history = make_empty_history()
history["juz"]["verses"].add("2:45")
puzzle = make_test_juz()
errors, cooldown, warnings = gen.validate_juz(puzzle, history)
test("Cooldown violation for its own history", any("2:45" in v for v in cooldown), f"cooldown={cooldown}")

print("\n24. Validate regular game with verse in juz cooldown (SHOULD BE EXEMPT)")
history = make_empty_history()
history["juz"]["verses"].add("2:255")
puzzle = make_test_connections() # Uses 2:255
errors, cooldown, warnings = gen.validate_connections(puzzle, history)
test("Regular game exempt from juz cooldown", len(cooldown) == 0, f"cooldown={cooldown}")

print("\n25. Build juz prompt avoids only its own history")
history = make_empty_history()
history["juz"]["verses"].add("2:45")
history["all_verses"].add("3:100")
prompt = gen.build_juz_prompt(history)
test("Prompt contains its own avoided verses", "2:45" in prompt)
test("Prompt does NOT contain global avoided verses", "3:100" not in prompt)


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
        "harf": make_test_harf(),
        "deduction": make_test_deduction(),
        "scramble": make_test_scramble(),
    }
    with open(os.path.join(tmpdir, f"{yesterday}.json"), "w") as f:
        json.dump(test_history_data, f, ensure_ascii=False)

        # Use a date older than 365 days to test cleanup
        old_date = (datetime.utcnow() - timedelta(days=400)).strftime("%Y-%m-%d")
    with open(os.path.join(tmpdir, f"{old_date}.json"), "w") as f:
        json.dump(test_history_data, f, ensure_ascii=False)

    history = gen.load_history()
    test("Connections themes loaded", "test theme alpha" in history["connections"]["themes"],
         f"themes={history['connections']['themes']}")
    test("Connections verses loaded", "2:255" in history["connections"]["verses"],
         f"verses={history['connections']['verses']}")
    test("Harf by Harf words loaded", "رحمة" in history["harf"]["words"],
         f"words={history['harf']['words']}")
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
