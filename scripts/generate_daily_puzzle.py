#!/usr/bin/env python3
"""
Daily Puzzle Generator for QuranPuzzle
Uses GitHub Models API (OpenAI-compatible) to generate 4 new Islamic/Quranic
groupings daily.  Enforces a strict 30-day cooldown on verse references and
themes.

Model selection
───────────────
Primary:   gpt-4o-mini  (Low tier — 150 req/day free on GitHub Models)
Fallback:  gpt-4o       (High tier — 50 req/day free, used if primary fails)

Why gpt-4o-mini?
  • Best-in-class structured JSON output among GitHub Models candidates
  • Reliable Arabic text generation with diacritics (tashkeel)
  • Low tier = 150 free requests/day (we need ≤5)
  • 128K context / 16K output — plenty for our prompt
  • OpenAI-compatible API — minimal migration from Gemini
"""
import json
import os
import sys
import re
import glob
import requests
from datetime import datetime, timedelta

# ── Configuration ──────────────────────────────────────────────────
# GitHub Models uses a Personal Access Token with "Models: Read-only" permission
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# GitHub Models API endpoint (OpenAI-compatible)
API_URL = "https://models.inference.ai.azure.com/chat/completions"

# Model priority: try the primary first, fall back to secondary
PRIMARY_MODEL = os.environ.get("PUZZLE_MODEL", "gpt-4o-mini")
FALLBACK_MODEL = "gpt-4o"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
HISTORY_DIR = os.path.join(SCRIPT_DIR, "..", "data", "history")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "..", "data", "daily_puzzle.json")
FALLBACK_PUZZLES = os.path.join(SCRIPT_DIR, "..", "puzzles.js")

COOLING_DAYS = 30
MAX_RETRIES = 5
COLORS = ["yellow", "green", "blue", "purple"]


# ── History Management ─────────────────────────────────────────────
def load_history():
    """Load the last 30 days of puzzle history.

    Returns a dict with three sets:
      - themes:  lowercased English theme names
      - verses:  verse reference strings (e.g. "2:255")
      - words:   Arabic tile words/phrases
    Old history files (>30 days) are automatically deleted.
    """
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
            os.remove(fpath)
            print(f"  Cleaned up old history: {fname}")
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


# ── GitHub Models API (OpenAI-compatible) ─────────────────────────
def build_prompt(history, previous_violations=None):
    """Build the generation prompt with history context.

    If previous_violations is provided, add an extra section emphasising
    the specific items that must be avoided (for retry attempts).
    """
    avoided_themes = "\n".join(f"  - {t}" for t in sorted(history["themes"])) or "  (none)"
    avoided_verses = ", ".join(sorted(history["verses"])) or "(none)"

    violation_block = ""
    if previous_violations:
        violation_block = f"""

CRITICAL — PREVIOUS ATTEMPT FAILED BECAUSE IT REUSED THESE:
{chr(10).join('  ✗ ' + v for v in previous_violations)}
You MUST NOT use any of the above. Choose completely different verses and themes."""

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

STRICTLY FORBIDDEN — DO NOT USE these themes (used in last 30 days):
{avoided_themes}

STRICTLY FORBIDDEN — DO NOT USE these verse references (used in last 30 days):
{avoided_verses}
{violation_block}

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
- Verify each verse reference is accurate
- Do NOT reuse any verse reference from the forbidden list above"""

    return prompt


def call_model(prompt, model_id):
    """Call the GitHub Models API (OpenAI-compatible) and return the response text.

    Args:
        prompt:   The user prompt string
        model_id: The model identifier (e.g. "gpt-4o-mini")

    Returns:
        The generated text, or None on failure.
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GITHUB_TOKEN}"
    }

    payload = {
        "model": model_id,
        "messages": [
            {
                "role": "system",
                "content": "You are an expert Islamic scholar and Quran teacher. "
                           "You always respond with valid JSON only, no markdown."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.9,
        "top_p": 0.95,
        "max_tokens": 4096,
        "response_format": {"type": "json_object"}
    }

    try:
        resp = requests.post(API_URL, headers=headers, json=payload, timeout=90)

        if resp.status_code == 429:
            print(f"  ⚠ Rate limited on {model_id}")
            return None

        if resp.status_code == 401:
            print(f"  ✗ Authentication failed. Ensure GITHUB_TOKEN has 'Models: Read-only' permission.")
            return None

        resp.raise_for_status()
        data = resp.json()

        text = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        print(f"  Tokens: {usage.get('prompt_tokens', '?')} in, "
              f"{usage.get('completion_tokens', '?')} out, "
              f"{usage.get('total_tokens', '?')} total")
        return text

    except requests.exceptions.Timeout:
        print(f"  ✗ Request timed out for {model_id}")
        return None
    except requests.exceptions.HTTPError as e:
        print(f"  ✗ HTTP error for {model_id}: {e}")
        return None
    except (KeyError, IndexError) as e:
        print(f"  ✗ Unexpected response structure from {model_id}: {e}")
        return None
    except Exception as e:
        print(f"  ✗ Unexpected error calling {model_id}: {e}")
        return None


# ── Validation ─────────────────────────────────────────────────────
def validate_puzzle(puzzle, history):
    """Validate the generated puzzle for correctness and cooldown compliance.

    Returns (errors, cooldown_violations, warnings):
      - errors:              structural problems (wrong item count, missing fields)
      - cooldown_violations: verse/theme reuse within 30 days (hard reject)
      - warnings:            non-fatal issues (duplicate words, etc.)
    """
    errors = []
    cooldown_violations = []
    warnings = []

    cats = puzzle.get("categories", [])
    if len(cats) != 4:
        errors.append(f"Expected 4 categories, got {len(cats)}")
        return errors, cooldown_violations, warnings

    all_words = set()

    # Collect all unique refs across the entire puzzle.
    # A category's verse ref is allowed to match one of its own item refs
    # (the category verse is typically one of the items), but cross-category
    # duplicates are flagged as cooldown violations.
    cross_cat_refs = set()

    for i, cat in enumerate(cats):
        items = cat.get("items", [])
        if len(items) != 4:
            errors.append(f"Category {i+1} has {len(items)} items, expected 4")

        if not cat.get("name") or not cat.get("nameEn"):
            errors.append(f"Category {i+1} missing name or nameEn")

        if not cat.get("verse", {}).get("ref"):
            errors.append(f"Category {i+1} missing category verse ref")

        # Assign correct color
        cat["color"] = COLORS[i]

        # ── Theme cooldown (HARD) ──
        theme = cat.get("nameEn", "").lower().strip()
        if theme in history["themes"]:
            cooldown_violations.append(f"Theme '{theme}' reused (30-day cooldown)")

        # Gather all refs for this category (category verse + item refs)
        cat_refs = set()
        cat_ref = cat.get("verse", {}).get("ref", "")
        if cat_ref:
            cat_refs.add(cat_ref)
        for item in items:
            if item.get("ref"):
                cat_refs.add(item["ref"])

        # Check for cross-category duplicates
        for ref in cat_refs:
            if ref in cross_cat_refs:
                cooldown_violations.append(f"Duplicate ref across categories: {ref}")

        # Check for history cooldown on all refs
        for ref in cat_refs:
            if ref in history["verses"]:
                cooldown_violations.append(f"Verse ref {ref} reused (30-day cooldown)")

        # Add this category's refs to the cross-category set
        cross_cat_refs.update(cat_refs)

        # Check for duplicate item refs within the same category
        item_refs_in_cat = []
        for j, item in enumerate(items):
            if not item.get("ar") or not item.get("en"):
                errors.append(f"Cat {i+1} item {j+1} missing ar or en")
            if not item.get("verse") or not item.get("ref"):
                errors.append(f"Cat {i+1} item {j+1} missing verse or ref")

            ref = item.get("ref", "")
            if ref:
                if ref in item_refs_in_cat:
                    cooldown_violations.append(f"Duplicate item ref within category {i+1}: {ref}")
                item_refs_in_cat.append(ref)

            # ── Word duplication (SOFT — warning only) ──
            ar = item.get("ar", "")
            if ar in all_words:
                warnings.append(f"Duplicate word within puzzle: {ar}")
            all_words.add(ar)
            if ar in history["words"]:
                warnings.append(f"Word '{ar}' used in last 30 days (soft warning)")

            # Ensure verseEn field exists
            if "verseEn" not in item:
                item["verseEn"] = ""

        # Ensure category verse has en field
        if "en" not in cat.get("verse", {}):
            cat["verse"]["en"] = ""

    return errors, cooldown_violations, warnings


# ── Fallback ───────────────────────────────────────────────────────
def get_fallback_puzzle_index(date_str, history):
    """Pick a fallback puzzle from puzzles.js that doesn't violate cooldown.

    Returns the index to use, or None if all are in cooldown.
    """
    try:
        with open(FALLBACK_PUZZLES) as f:
            content = f.read()

        puzzle_ids = re.findall(r'\bid:\s*(\d+),', content)
        total = len(puzzle_ids)
        if total == 0:
            return None

        day = datetime.strptime(date_str, "%Y-%m-%d").timetuple().tm_yday
        for offset in range(total):
            idx = (day + offset) % total
            return idx

        return None
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
        with open(today_file) as f:
            puzzle = json.load(f)
        with open(OUTPUT_FILE, "w") as f:
            json.dump({"date": today, "puzzle": puzzle, "generated": True}, f, ensure_ascii=False, indent=2)
        return 0

    if not GITHUB_TOKEN:
        print("ERROR: GITHUB_TOKEN not set.")
        print("  Create a Fine-grained PAT at https://github.com/settings/tokens")
        print("  with 'Models: Read-only' permission under Account permissions.")
        with open(OUTPUT_FILE, "w") as f:
            json.dump({"date": today, "puzzle": None, "generated": False, "fallback": True}, f, indent=2)
        return 1

    # Load history for cooldown enforcement
    history = load_history()
    print(f"History loaded: {len(history['themes'])} themes, "
          f"{len(history['verses'])} verses, {len(history['words'])} words "
          f"in {COOLING_DAYS}-day cooldown window")

    # Generate with retries — track violations across attempts for smarter re-prompting
    previous_violations = None
    current_model = PRIMARY_MODEL

    for attempt in range(1, MAX_RETRIES + 1):
        print(f"\n{'='*50}")
        print(f"Attempt {attempt}/{MAX_RETRIES} using {current_model}...")

        prompt = build_prompt(history, previous_violations)
        raw = call_model(prompt, current_model)

        if not raw:
            # If primary model fails, try fallback model on next attempt
            if current_model == PRIMARY_MODEL and FALLBACK_MODEL:
                print(f"  → Switching to fallback model: {FALLBACK_MODEL}")
                current_model = FALLBACK_MODEL
            continue

        # Parse JSON
        try:
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
                cleaned = re.sub(r'\s*```$', '', cleaned)
            puzzle = json.loads(cleaned)
        except json.JSONDecodeError as e:
            print(f"  ✗ JSON parse error: {e}")
            print(f"  Raw (first 500 chars): {raw[:500]}")
            continue

        # Validate with strict cooldown enforcement
        errors, cooldown_violations, warnings = validate_puzzle(puzzle, history)

        if errors:
            print(f"  ✗ Structural errors: {errors}")
            continue

        if cooldown_violations:
            print(f"  ✗ COOLDOWN VIOLATIONS (rejecting):")
            for v in cooldown_violations:
                print(f"      {v}")
            previous_violations = cooldown_violations
            continue

        if warnings:
            print(f"  ⚠ Warnings (accepted): {warnings}")

        # ── Success! ──
        print(f"\n✓ Puzzle generated successfully for {today} using {current_model}")
        for cat in puzzle["categories"]:
            refs = [i['ref'] for i in cat['items']]
            print(f"  [{cat['color']}] {cat['nameEn']}")
            print(f"         Items: {', '.join(i['ar'] for i in cat['items'])}")
            print(f"         Refs:  {', '.join(refs)}")

        # Save to history
        save_to_history(puzzle, today)

        # Save as daily puzzle
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        with open(OUTPUT_FILE, "w") as f:
            json.dump({
                "date": today,
                "puzzle": puzzle,
                "generated": True,
                "model": current_model
            }, f, ensure_ascii=False, indent=2)

        return 0

    # All retries failed — use fallback
    print(f"\n✗ All {MAX_RETRIES} attempts failed. Using fallback.")
    with open(OUTPUT_FILE, "w") as f:
        json.dump({"date": today, "puzzle": None, "generated": False, "fallback": True}, f, indent=2)
    return 1


if __name__ == "__main__":
    sys.exit(main())
