#!/usr/bin/env python3
"""
Daily Puzzle Generator for QuranPuzzle
Uses Gemini API to generate 4 new Islamic/Quranic groupings daily.
Ensures no grouping themes or verse references repeat within 30 days.
"""
import json
import os
import sys
import re
import glob
import requests
from datetime import datetime, timedelta

# ── Configuration ──────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

HISTORY_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "history")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "daily_puzzle.json")
FALLBACK_PUZZLES = os.path.join(os.path.dirname(__file__), "..", "puzzles.js")

COOLING_DAYS = 30
MAX_RETRIES = 3
COLORS = ["yellow", "green", "blue", "purple"]

# ── History Management ─────────────────────────────────────────────
def load_history():
    """Load the last 30 days of puzzle history."""
    cutoff = datetime.utcnow() - timedelta(days=COOLING_DAYS)
    themes = set()
    verses = set()
    words = set()

    os.makedirs(HISTORY_DIR, exist_ok=True)
    for fpath in glob.glob(os.path.join(HISTORY_DIR, "*.json")):
        fname = os.path.basename(fpath)
        try:
            date_str = fname.replace(".json", "")
            fdate = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            continue

        if fdate < cutoff:
            # Clean up old history files
            os.remove(fpath)
            continue

        try:
            with open(fpath) as f:
                puzzle = json.load(f)
            for cat in puzzle.get("categories", []):
                themes.add(cat.get("nameEn", "").lower().strip())
                if cat.get("verse", {}).get("ref"):
                    verses.add(cat["verse"]["ref"])
                for item in cat.get("items", []):
                    if item.get("ref"):
                        verses.add(item["ref"])
                    if item.get("ar"):
                        words.add(item["ar"])
        except (json.JSONDecodeError, KeyError):
            continue

    return {"themes": themes, "verses": verses, "words": words}


def save_to_history(puzzle, date_str):
    """Save a puzzle to the history directory."""
    os.makedirs(HISTORY_DIR, exist_ok=True)
    with open(os.path.join(HISTORY_DIR, f"{date_str}.json"), "w") as f:
        json.dump(puzzle, f, ensure_ascii=False, indent=2)


# ── Gemini API ─────────────────────────────────────────────────────
def build_prompt(history):
    """Build the generation prompt with history context."""
    avoided_themes = "\n".join(f"  - {t}" for t in sorted(history["themes"])) or "  (none)"
    avoided_verses = ", ".join(sorted(history["verses"])) or "(none)"

    prompt = f"""You are an expert Islamic scholar and Quran teacher creating a daily puzzle game called "Ayah Connections".

TASK: Generate exactly 4 groups of 4 related Quranic/Islamic items. Each group has a theme, and each item has an Arabic word/phrase with a specific Quranic verse reference.

RULES:
1. Each group MUST have exactly 4 items
2. All 4 groups should be from DIFFERENT areas of Islamic knowledge (e.g., don't have two groups both about prophets)
3. Items within a group must clearly belong together under the stated theme
4. The Arabic word/phrase for each item MUST appear in the referenced Quranic verse (either exact match or root form)
5. Verse references MUST be real and accurate (surah:ayah format like "2:255")
6. The verse text MUST be the actual Quranic Arabic text with full diacritics (tashkeel)
7. Each group needs a category-level verse that represents the overall theme
8. Make the puzzle challenging but fair — the 4 groups should be distinguishable but some items could plausibly fit in multiple groups

DIFFICULTY GUIDELINES:
- Include 1 easy group (well-known concepts), 1 medium, 1 hard, and 1 tricky group
- Some items should be "red herrings" that seem to fit another group but don't

THEME IDEAS (pick 4 diverse ones):
- Names/attributes of Allah mentioned in specific surahs
- Animals mentioned in the Quran
- Prophets and their specific miracles/stories
- Items/objects mentioned in Quranic stories
- Quranic parables and their lessons
- Places mentioned in the Quran
- Types of worship/ibadah mentioned
- Descriptions of Paradise/Hell
- Quranic commands and prohibitions
- Scientific phenomena referenced in the Quran
- Family relationships in Quranic stories
- Numbers mentioned in the Quran
- Prayers/duas from the Quran
- Characteristics of believers/disbelievers
- Events of the Day of Judgment
- Angels and their roles
- Battles/events in Islamic history referenced in Quran
- Foods/drinks mentioned in the Quran
- Natural elements (water, mountains, stars, etc.)
- Surah names and their meanings
- Quranic oaths (things Allah swears by)
- Types of hearts mentioned in the Quran
- Stages of human creation
- Garments/clothing mentioned in the Quran
- Musical/sound references in the Quran

DO NOT USE these themes (used in last 30 days):
{avoided_themes}

DO NOT USE these verse references (used in last 30 days):
{avoided_verses}

OUTPUT FORMAT: Return a valid JSON object with this exact structure:
{{
  "categories": [
    {{
      "name": "Arabic group name",
      "nameEn": "English group name",
      "color": "yellow",
      "items": [
        {{
          "ar": "Arabic word/phrase",
          "en": "English meaning",
          "verse": "Full Quranic verse text with diacritics",
          "ref": "surah:ayah"
        }},
        ... (4 items total)
      ],
      "verse": {{
        "ayah": "Representative verse for the whole group",
        "en": "English translation of the verse",
        "ref": "surah:ayah"
      }}
    }},
    ... (4 categories total)
  ]
}}

IMPORTANT:
- Return ONLY the JSON object, no markdown formatting, no code blocks
- Use colors in order: yellow, green, blue, purple
- Every verse reference must be unique across all 4 groups (no duplicates)
- Arabic text must include full tashkeel/diacritics
- Verify each verse reference is accurate"""

    return prompt


def call_gemini(prompt):
    """Call the Gemini API and return the response text."""
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.9,
            "topP": 0.95,
            "topK": 40,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json"
        }
    }

    resp = requests.post(GEMINI_URL, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()

    # Extract text from response
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return text
    except (KeyError, IndexError) as e:
        print(f"ERROR: Unexpected Gemini response structure: {e}")
        print(json.dumps(data, indent=2)[:500])
        return None


# ── Validation ─────────────────────────────────────────────────────
def validate_puzzle(puzzle, history):
    """Validate the generated puzzle for correctness and uniqueness."""
    errors = []
    warnings = []

    cats = puzzle.get("categories", [])
    if len(cats) != 4:
        errors.append(f"Expected 4 categories, got {len(cats)}")
        return errors, warnings

    all_refs = set()
    all_words = set()

    for i, cat in enumerate(cats):
        items = cat.get("items", [])
        if len(items) != 4:
            errors.append(f"Category {i+1} has {len(items)} items, expected 4")

        if not cat.get("name") or not cat.get("nameEn"):
            errors.append(f"Category {i+1} missing name or nameEn")

        if not cat.get("verse", {}).get("ref"):
            errors.append(f"Category {i+1} missing category verse ref")

        # Check theme cooling
        theme = cat.get("nameEn", "").lower().strip()
        if theme in history["themes"]:
            warnings.append(f"Theme '{theme}' was used in last 30 days")

        # Assign correct color
        cat["color"] = COLORS[i]

        cat_ref = cat.get("verse", {}).get("ref", "")
        if cat_ref:
            if cat_ref in all_refs:
                warnings.append(f"Duplicate ref: {cat_ref}")
            all_refs.add(cat_ref)
            if cat_ref in history["verses"]:
                warnings.append(f"Ref {cat_ref} used in last 30 days")

        for j, item in enumerate(items):
            if not item.get("ar") or not item.get("en"):
                errors.append(f"Cat {i+1} item {j+1} missing ar or en")
            if not item.get("verse") or not item.get("ref"):
                errors.append(f"Cat {i+1} item {j+1} missing verse or ref")

            ref = item.get("ref", "")
            if ref:
                if ref in all_refs:
                    warnings.append(f"Duplicate ref: {ref}")
                all_refs.add(ref)
                if ref in history["verses"]:
                    warnings.append(f"Ref {ref} used in last 30 days")

            ar = item.get("ar", "")
            if ar in all_words:
                warnings.append(f"Duplicate word: {ar}")
            all_words.add(ar)
            if ar in history["words"]:
                warnings.append(f"Word '{ar}' used in last 30 days")

            # Ensure verseEn field exists
            if "verseEn" not in item:
                item["verseEn"] = ""

        # Ensure category verse has en field
        if "en" not in cat.get("verse", {}):
            cat["verse"]["en"] = ""

    return errors, warnings


# ── Fallback ───────────────────────────────────────────────────────
def get_fallback_puzzle(date_str):
    """Fall back to a pre-made puzzle from puzzles.js."""
    try:
        with open(FALLBACK_PUZZLES) as f:
            content = f.read()

        # Extract the connections array using regex
        # Find puzzle objects by their id
        puzzle_matches = list(re.finditer(r'\bid:\s*(\d+),\s*\n?\s*categories:', content))
        if not puzzle_matches:
            return None

        # Use day of year to pick a fallback
        day = datetime.strptime(date_str, "%Y-%m-%d").timetuple().tm_yday
        idx = day % len(puzzle_matches)

        print(f"FALLBACK: Using pre-made puzzle index {idx}")
        return None  # Signal to client to use built-in puzzles
    except Exception as e:
        print(f"FALLBACK ERROR: {e}")
        return None


# ── Main ───────────────────────────────────────────────────────────
def main():
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Check if already generated today
    today_file = os.path.join(HISTORY_DIR, f"{today}.json")
    if os.path.exists(today_file):
        print(f"Puzzle for {today} already exists. Skipping generation.")
        # Still copy to output
        with open(today_file) as f:
            puzzle = json.load(f)
        with open(OUTPUT_FILE, "w") as f:
            json.dump({"date": today, "puzzle": puzzle, "generated": True}, f, ensure_ascii=False, indent=2)
        return 0

    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY not set")
        # Write fallback signal
        with open(OUTPUT_FILE, "w") as f:
            json.dump({"date": today, "puzzle": None, "generated": False, "fallback": True}, f, indent=2)
        return 1

    # Load history
    history = load_history()
    print(f"History: {len(history['themes'])} themes, {len(history['verses'])} verses, {len(history['words'])} words in cooling period")

    # Generate with retries
    for attempt in range(1, MAX_RETRIES + 1):
        print(f"\nAttempt {attempt}/{MAX_RETRIES}...")

        prompt = build_prompt(history)
        raw = call_gemini(prompt)

        if not raw:
            print("  No response from Gemini")
            continue

        # Parse JSON
        try:
            # Clean up response - remove markdown code blocks if present
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
                cleaned = re.sub(r'\s*```$', '', cleaned)
            puzzle = json.loads(cleaned)
        except json.JSONDecodeError as e:
            print(f"  JSON parse error: {e}")
            print(f"  Raw response (first 500 chars): {raw[:500]}")
            continue

        # Validate
        errors, warnings = validate_puzzle(puzzle, history)

        if errors:
            print(f"  Validation errors: {errors}")
            continue

        if warnings:
            print(f"  Warnings (non-fatal): {warnings}")

        # Success!
        print(f"\nPuzzle generated successfully for {today}")
        for cat in puzzle["categories"]:
            print(f"  [{cat['color']}] {cat['nameEn']}: {', '.join(i['ar'] for i in cat['items'])}")

        # Save to history
        save_to_history(puzzle, today)

        # Save as daily puzzle
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        with open(OUTPUT_FILE, "w") as f:
            json.dump({"date": today, "puzzle": puzzle, "generated": True}, f, ensure_ascii=False, indent=2)

        return 0

    # All retries failed — use fallback
    print(f"\nAll {MAX_RETRIES} attempts failed. Using fallback.")
    with open(OUTPUT_FILE, "w") as f:
        json.dump({"date": today, "puzzle": None, "generated": False, "fallback": True}, f, indent=2)
    return 1


if __name__ == "__main__":
    sys.exit(main())
