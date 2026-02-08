#!/usr/bin/env python3
"""
Test the 30-day cooldown enforcement in generate_daily_puzzle.py.
Runs unit tests on load_history(), validate_puzzle(), and build_prompt().
"""
import json
import os
import sys
import tempfile
import shutil
from datetime import datetime, timedelta

# Add parent dir to path so we can import the generator
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# We need to test the functions directly, so import them
# But the module uses relative paths, so we need to patch
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


def make_test_puzzle():
    """Create a minimal valid puzzle for testing."""
    return {
        "categories": [
            {
                "name": "تست",
                "nameEn": "Test Theme Alpha",
                "color": "yellow",
                "items": [
                    {"ar": "كلمة١", "en": "Word 1", "verse": "verse text", "ref": "2:255", "verseEn": ""},
                    {"ar": "كلمة٢", "en": "Word 2", "verse": "verse text", "ref": "2:256", "verseEn": ""},
                    {"ar": "كلمة٣", "en": "Word 3", "verse": "verse text", "ref": "2:257", "verseEn": ""},
                    {"ar": "كلمة٤", "en": "Word 4", "verse": "verse text", "ref": "2:258", "verseEn": ""},
                ],
                "verse": {"ayah": "test", "en": "test", "ref": "2:255"}
            },
            {
                "name": "تست٢",
                "nameEn": "Test Theme Beta",
                "color": "green",
                "items": [
                    {"ar": "كلمة٥", "en": "Word 5", "verse": "verse text", "ref": "3:1", "verseEn": ""},
                    {"ar": "كلمة٦", "en": "Word 6", "verse": "verse text", "ref": "3:2", "verseEn": ""},
                    {"ar": "كلمة٧", "en": "Word 7", "verse": "verse text", "ref": "3:3", "verseEn": ""},
                    {"ar": "كلمة٨", "en": "Word 8", "verse": "verse text", "ref": "3:4", "verseEn": ""},
                ],
                "verse": {"ayah": "test", "en": "test", "ref": "3:1"}
            },
            {
                "name": "تست٣",
                "nameEn": "Test Theme Gamma",
                "color": "blue",
                "items": [
                    {"ar": "كلمة٩", "en": "Word 9", "verse": "verse text", "ref": "4:1", "verseEn": ""},
                    {"ar": "كلمة١٠", "en": "Word 10", "verse": "verse text", "ref": "4:2", "verseEn": ""},
                    {"ar": "كلمة١١", "en": "Word 11", "verse": "verse text", "ref": "4:3", "verseEn": ""},
                    {"ar": "كلمة١٢", "en": "Word 12", "verse": "verse text", "ref": "4:4", "verseEn": ""},
                ],
                "verse": {"ayah": "test", "en": "test", "ref": "4:1"}
            },
            {
                "name": "تست٤",
                "nameEn": "Test Theme Delta",
                "color": "purple",
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


# ── Test 1: validate_puzzle with empty history (no cooldown) ──
print("\n1. Validate puzzle with empty history")
empty_history = {"themes": set(), "verses": set(), "words": set()}
puzzle = make_test_puzzle()
errors, cooldown, warnings = gen.validate_puzzle(puzzle, empty_history)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("No cooldown violations", len(cooldown) == 0, f"cooldown={cooldown}")
test("No warnings", len(warnings) == 0, f"warnings={warnings}")


# ── Test 2: validate_puzzle with verse in cooldown ──
print("\n2. Validate puzzle with verse ref in cooldown")
history_with_verse = {
    "themes": set(),
    "verses": {"2:255"},  # This ref is used in the test puzzle
    "words": set()
}
puzzle = make_test_puzzle()
errors, cooldown, warnings = gen.validate_puzzle(puzzle, history_with_verse)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("Cooldown violation detected for 2:255",
     any("2:255" in v for v in cooldown),
     f"cooldown={cooldown}")
test("At least 1 cooldown violation", len(cooldown) >= 1, f"count={len(cooldown)}")


# ── Test 3: validate_puzzle with theme in cooldown ──
print("\n3. Validate puzzle with theme in cooldown")
history_with_theme = {
    "themes": {"test theme alpha"},  # Matches "Test Theme Alpha" lowercased
    "verses": set(),
    "words": set()
}
puzzle = make_test_puzzle()
errors, cooldown, warnings = gen.validate_puzzle(puzzle, history_with_theme)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("Cooldown violation detected for theme",
     any("theme" in v.lower() for v in cooldown),
     f"cooldown={cooldown}")


# ── Test 4: validate_puzzle with word in cooldown (should be warning, not error) ──
print("\n4. Validate puzzle with Arabic word in cooldown (soft warning)")
history_with_word = {
    "themes": set(),
    "verses": set(),
    "words": {"كلمة١"}  # This word is in the test puzzle
}
puzzle = make_test_puzzle()
errors, cooldown, warnings = gen.validate_puzzle(puzzle, history_with_word)
test("No structural errors", len(errors) == 0, f"errors={errors}")
test("No cooldown violations (word is soft)", len(cooldown) == 0, f"cooldown={cooldown}")
test("Warning issued for word reuse",
     any("كلمة١" in w for w in warnings),
     f"warnings={warnings}")


# ── Test 5: validate_puzzle with duplicate refs within puzzle ──
print("\n5. Validate puzzle with duplicate refs within same puzzle")
dup_puzzle = make_test_puzzle()
# Make item ref duplicate the category verse ref (already same: 2:255)
# Actually the test puzzle already has cat verse ref = first item ref
# Let's make two items have the same ref
dup_puzzle["categories"][0]["items"][1]["ref"] = "2:255"  # duplicate
errors, cooldown, warnings = gen.validate_puzzle(dup_puzzle, empty_history)
test("Cooldown violation for internal duplicate",
     any("Duplicate item ref within category" in v for v in cooldown),
     f"cooldown={cooldown}")


# ── Test 6: validate_puzzle with wrong item count ──
print("\n6. Validate puzzle with wrong item count")
bad_puzzle = make_test_puzzle()
bad_puzzle["categories"][0]["items"] = bad_puzzle["categories"][0]["items"][:3]  # Only 3 items
errors, cooldown, warnings = gen.validate_puzzle(bad_puzzle, empty_history)
test("Structural error for wrong item count",
     any("3 items" in e for e in errors),
     f"errors={errors}")


# ── Test 7: build_prompt includes avoided themes and verses ──
print("\n7. Build prompt includes history context")
test_history = {
    "themes": {"prophets of firm resolve", "pillars of islam"},
    "verses": {"2:255", "4:163", "46:35"},
    "words": set()
}
prompt = gen.build_prompt(test_history)
test("Prompt contains avoided themes", "prophets of firm resolve" in prompt.lower())
test("Prompt contains avoided verses", "2:255" in prompt)
test("Prompt contains avoided verses", "4:163" in prompt)


# ── Test 8: build_prompt with violations includes violation block ──
print("\n8. Build prompt with previous violations")
violations = ["Verse ref 2:255 reused (30-day cooldown)", "Theme 'prophets' reused"]
prompt = gen.build_prompt(test_history, previous_violations=violations)
test("Prompt contains violation block", "PREVIOUS ATTEMPT FAILED" in prompt)
test("Prompt contains specific violation", "2:255 reused" in prompt)


# ── Test 9: load_history with temp directory ──
print("\n9. Load history from temp directory")
tmpdir = tempfile.mkdtemp()
old_history_dir = gen.HISTORY_DIR
gen.HISTORY_DIR = tmpdir
try:
    # Create a recent history file
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    test_puzzle = make_test_puzzle()
    with open(os.path.join(tmpdir, f"{yesterday}.json"), "w") as f:
        json.dump(test_puzzle, f, ensure_ascii=False)

    # Create an old history file (should be cleaned up)
    old_date = (datetime.utcnow() - timedelta(days=35)).strftime("%Y-%m-%d")
    with open(os.path.join(tmpdir, f"{old_date}.json"), "w") as f:
        json.dump(test_puzzle, f, ensure_ascii=False)

    history = gen.load_history()
    test("Recent history loaded", "test theme alpha" in history["themes"],
         f"themes={history['themes']}")
    test("Recent verses loaded", "2:255" in history["verses"],
         f"verses={history['verses']}")
    test("Old history file cleaned up",
         not os.path.exists(os.path.join(tmpdir, f"{old_date}.json")))
finally:
    gen.HISTORY_DIR = old_history_dir
    shutil.rmtree(tmpdir)


# ── Summary ──
print(f"\n{'='*50}")
print(f"Results: {PASS} passed, {FAIL} failed out of {PASS + FAIL} tests")
if FAIL > 0:
    sys.exit(1)
else:
    print("All tests passed! ✓")
    sys.exit(0)
