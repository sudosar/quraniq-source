#!/usr/bin/env python3
"""
Daily Puzzle Generator for QuranIQ — All 4 Games
Generates daily puzzles for:
  1. Connections (Ayah Connections)
  2. Harf by Harf (Word Guessing)
  3. Deduction (Who Am I?)
  4. Scramble (Ayah Scramble)

Model fallback chain
────────────────────
1. DeepSeek-R1    (GitHub Models — free, best reasoning)
2. Gemini Flash   (Google Gemini API — free tier, strong Arabic/Quranic)
3. Phi-4          (GitHub Models — free, last resort)

Each game uses 1 API call (up to 5 retries), so worst case = 20 calls/day.
A 60-second pause between games respects DeepSeek-R1's 1 req/min rate limit.
"""
import json
import os
import sys
import re
import glob
import time
import requests
from datetime import datetime, timedelta

# ── Configuration ──────────────────────────────────────────────────
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# API endpoints
GITHUB_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

# Model fallback chain: DeepSeek-R1 → Gemini Flash → Phi-4
MODEL_CHAIN = [
    {"id": "DeepSeek-R1", "api": "github", "label": "DeepSeek-R1 (GitHub Models)"},
    {"id": "gemini-2.5-flash", "api": "gemini", "label": "Gemini 2.5 Flash (Google)"},
    {"id": "Phi-4", "api": "github", "label": "Phi-4 (GitHub Models)"},
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")
HISTORY_DIR = os.path.join(DATA_DIR, "history")
FALLBACK_PUZZLES = os.path.join(SCRIPT_DIR, "..", "puzzles.js")

COOLING_DAYS = 365  # 365-day cooldown for all games to maximize verse variety
MAX_RETRIES = 5
COLORS = ["yellow", "green", "blue", "purple"]

# Output files for each game type
OUTPUT_FILES = {
    "connections": os.path.join(DATA_DIR, "daily_puzzle.json"),
    "wordle": os.path.join(DATA_DIR, "daily_wordle.json"),
    "deduction": os.path.join(DATA_DIR, "daily_deduction.json"),
    "scramble": os.path.join(DATA_DIR, "daily_scramble.json"),
    "juz": os.path.join(DATA_DIR, "daily_juz.json"),
}

# Ramadan 2026 dates (1 Ramadan 1447 AH = Feb 18, 2026)
RAMADAN_START = datetime(2026, 2, 18)
RAMADAN_END = datetime(2026, 3, 20)  # 30 days


# ── History Management ─────────────────────────────────────────────
def load_history():
    """Load puzzle history for cooldown enforcement.

    All games use a 365-day cooldown to maximize verse variety
    and cycle through the Quran's 6,236 verses.
    Returns a dict with sets for each game type's used content.
    """
    cutoff = datetime.utcnow() - timedelta(days=COOLING_DAYS)

    history = {
        "connections": {"themes": set(), "verses": set(), "words": set()},
        "wordle": {"words": set(), "verses": set(), "hints": set()},
        "deduction": {"titles": set(), "characters": set()},
        "scramble": {"verses": set(), "references": set()},
        "juz": {"juz_numbers": set(), "verses": set()},
    }

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
                data = json.load(f)
        except (json.JSONDecodeError, KeyError):
            continue

        # Connections history
        conn = data.get("connections")
        if conn:
            for cat in conn.get("categories", []):
                history["connections"]["themes"].add(cat.get("nameEn", "").lower().strip())
                if cat.get("verse", {}).get("ref"):
                    history["connections"]["verses"].add(cat["verse"]["ref"])
                for item in cat.get("items", []):
                    if item.get("ref"):
                        history["connections"]["verses"].add(item["ref"])
                    if item.get("ar"):
                        history["connections"]["words"].add(item["ar"])

        # Harf by Harf history
        wdl = data.get("wordle")
        if wdl:
            if wdl.get("word"):
                history["wordle"]["words"].add(wdl["word"])
            if wdl.get("display"):
                history["wordle"]["words"].add(wdl["display"])
            if wdl.get("hint"):
                history["wordle"]["hints"].add(wdl["hint"].lower().strip())
            if wdl.get("verse"):
                history["wordle"]["verses"].add(wdl.get("verse", ""))

        # Deduction history
        ded = data.get("deduction")
        if ded:
            if ded.get("title"):
                history["deduction"]["titles"].add(ded["title"].lower().strip())
            cats = ded.get("categories", {})
            if isinstance(cats, dict):
                identity_cat = cats.get("identity", cats.get("prophet", {}))
                if identity_cat.get("answer"):
                    history["deduction"]["characters"].add(identity_cat["answer"])

        # Scramble history
        scr = data.get("scramble")
        if scr:
            if scr.get("reference"):
                history["scramble"]["references"].add(scr["reference"])
            if scr.get("arabic"):
                history["scramble"]["verses"].add(scr["arabic"])

        # Juz Journey history
        juz = data.get("juz")
        if juz:
            if juz.get("juz_number"):
                history["juz"]["juz_numbers"].add(juz["juz_number"])
            verse = juz.get("verse", {})
            if verse.get("surah_number") and verse.get("ayah_number"):
                history["juz"]["verses"].add(f"{verse['surah_number']}:{verse['ayah_number']}")

    return history


def save_to_history(all_puzzles, date_str):
    """Save all game puzzles to a single history file."""
    os.makedirs(HISTORY_DIR, exist_ok=True)
    with open(os.path.join(HISTORY_DIR, f"{date_str}.json"), "w") as f:
        json.dump(all_puzzles, f, ensure_ascii=False, indent=2)


# ── LLM API (GitHub Models + Gemini) ──────────────────────────────
def call_model(prompt, model_config, system_msg=None):
    """Call an LLM API and return the response text.
    
    model_config: dict with 'id', 'api' ('github' or 'gemini'), 'label'
    """
    model_id = model_config["id"]
    api_type = model_config["api"]

    # Select endpoint and auth based on API type
    if api_type == "gemini":
        if not GEMINI_API_KEY:
            print(f"  ⚠ GEMINI_API_KEY not set, skipping {model_config['label']}")
            return None
        api_url = GEMINI_API_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GEMINI_API_KEY}"
        }
    else:  # github
        if not GITHUB_TOKEN:
            print(f"  ⚠ GITHUB_TOKEN not set, skipping {model_config['label']}")
            return None
        api_url = GITHUB_MODELS_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GITHUB_TOKEN}"
        }

    if system_msg is None:
        system_msg = ("You are an expert Islamic scholar and Quran teacher. "
                      "You always respond with valid JSON only, no markdown.")

    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.6,
        "top_p": 0.95,
        "max_tokens": 8192,
    }

    # Only GPT models support response_format
    if model_id.lower().startswith("gpt-"):
        payload["response_format"] = {"type": "json_object"}

    try:
        resp = requests.post(api_url, headers=headers, json=payload, timeout=180)

        if resp.status_code == 429:
            print(f"  ⚠ Rate limited on {model_config['label']}")
            return "RATE_LIMITED"
        if resp.status_code == 401:
            print(f"  ✗ Authentication failed for {model_config['label']}")
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
        print(f"  ✗ Request timed out for {model_config['label']}")
        return None
    except requests.exceptions.HTTPError as e:
        try:
            err_body = resp.text[:500]
        except Exception:
            err_body = "(could not read response body)"
        print(f"  ✗ HTTP error for {model_config['label']}: {e}")
        print(f"  Response body: {err_body}")
        return None
    except Exception as e:
        print(f"  ✗ Unexpected error calling {model_config['label']}: {e}")
        return None


def parse_json_response(raw):
    """Parse JSON from model response, handling <think> tags and markdown fences."""
    cleaned = raw.strip()
    cleaned = re.sub(r'<think>.*?</think>', '', cleaned, flags=re.DOTALL).strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)
    json_match = re.search(r'\{[\s\S]*\}', cleaned)
    if json_match:
        cleaned = json_match.group(0)
    return json.loads(cleaned)


# ═══════════════════════════════════════════════════════════════════
# CONNECTIONS GENERATOR
# ═══════════════════════════════════════════════════════════════════
def build_connections_prompt(history, previous_violations=None):
    avoided_themes = "\n".join(f"  - {t}" for t in sorted(history["connections"]["themes"])) or "  (none)"
    avoided_verses = ", ".join(sorted(history["connections"]["verses"])) or "(none)"

    violation_block = ""
    if previous_violations:
        violation_block = f"""

CRITICAL — PREVIOUS ATTEMPT FAILED BECAUSE IT REUSED THESE:
{chr(10).join('  ✗ ' + v for v in previous_violations)}
You MUST NOT use any of the above. Choose completely different verses and themes."""

    return f"""You are an expert Islamic scholar creating a daily puzzle game called "Ayah Connections".

TASK: Generate exactly 4 groups of 4 related Quranic/Islamic items.
The goal is to expose players to Quranic verses — each item is a word that appears in a real verse.

RULES:
1. Each group MUST have exactly 4 items
2. All 4 groups should be from DIFFERENT areas of Islamic knowledge
3. Items within a group must clearly belong together under the stated theme
4. The Arabic word/phrase for each item MUST actually appear in the referenced Quranic verse
5. Verse references MUST be real and accurate (surah:ayah format like "2:255")
6. Each group needs a category-level representative verse reference
7. Make the puzzle challenging but fair

DIFFICULTY: 1 easy, 1 medium, 1 hard, 1 tricky group.

STRICTLY FORBIDDEN themes (used in last 30 days):
{avoided_themes}

STRICTLY FORBIDDEN verse references (used in last 30 days):
{avoided_verses}
{violation_block}

OUTPUT FORMAT: Return ONLY a valid JSON object. Do NOT include full verse text — only the reference.
{{
  "categories": [
    {{
      "name": "Arabic group name with tashkeel",
      "nameEn": "English group name",
      "color": "yellow",
      "items": [
        {{"ar": "Arabic word with tashkeel", "en": "English meaning", "ref": "surah:ayah"}},
        {{"ar": "Arabic word with tashkeel", "en": "English meaning", "ref": "surah:ayah"}},
        {{"ar": "Arabic word with tashkeel", "en": "English meaning", "ref": "surah:ayah"}},
        {{"ar": "Arabic word with tashkeel", "en": "English meaning", "ref": "surah:ayah"}}
      ],
      "verse": {{"ref": "surah:ayah"}}
    }},
    ... (4 categories, colors: yellow, green, blue, purple)
  ]
}}

IMPORTANT:
- Return ONLY the JSON object, no markdown, no explanation
- Do NOT include any verse text — only refs. Verse text will be looked up separately.
- EVERY verse reference MUST be unique — 16 different refs for 16 items
- The 4 category-level verse refs should also be unique (can overlap with item refs)
- Arabic words must include full tashkeel/diacritics
- Verify each verse reference is a real Quranic verse"""


def validate_connections(puzzle, history):
    errors, cooldown_violations, warnings = [], [], []
    cats = puzzle.get("categories", [])
    if len(cats) != 4:
        errors.append(f"Expected 4 categories, got {len(cats)}")
        return errors, cooldown_violations, warnings

    all_words = set()
    cross_cat_refs = set()

    for i, cat in enumerate(cats):
        items = cat.get("items", [])
        if len(items) != 4:
            errors.append(f"Category {i+1} has {len(items)} items, expected 4")
        if not cat.get("name") or not cat.get("nameEn"):
            errors.append(f"Category {i+1} missing name or nameEn")
        if not cat.get("verse", {}).get("ref"):
            errors.append(f"Category {i+1} missing category verse ref")

        cat["color"] = COLORS[i]

        theme = cat.get("nameEn", "").lower().strip()
        if theme in history["connections"]["themes"]:
            cooldown_violations.append(f"Theme '{theme}' reused (30-day cooldown)")

        # Collect all refs in this category (including duplicates)
        cat_ref_list = []
        cat_ref = cat.get("verse", {}).get("ref", "")
        if cat_ref:
            cat_ref_list.append(cat_ref)
        for item in items:
            if item.get("ref"):
                cat_ref_list.append(item["ref"])

        # Check for duplicate refs WITHIN this category
        seen_in_cat = set()
        for ref in cat_ref_list:
            if ref in seen_in_cat:
                cooldown_violations.append(f"Duplicate ref within category {i+1}: {ref}")
            seen_in_cat.add(ref)

        cat_refs = set(cat_ref_list)
        for ref in cat_refs:
            if ref in cross_cat_refs:
                cooldown_violations.append(f"Duplicate ref across categories: {ref}")
        for ref in cat_refs:
            if ref in history["connections"]["verses"]:
                cooldown_violations.append(f"Verse ref {ref} reused (30-day cooldown)")
        cross_cat_refs.update(cat_refs)

        for j, item in enumerate(items):
            if not item.get("ar") or not item.get("en"):
                errors.append(f"Cat {i+1} item {j+1} missing ar or en")
            if not item.get("ref"):
                errors.append(f"Cat {i+1} item {j+1} missing ref")
            ar = item.get("ar", "")
            if ar in all_words:
                warnings.append(f"Duplicate word: {ar}")
            all_words.add(ar)
            if ar in history["connections"]["words"]:
                warnings.append(f"Word '{ar}' used in last 30 days")
            # Ensure optional fields exist for downstream compatibility
            if "verse" not in item:
                item["verse"] = ""
            if "verseEn" not in item:
                item["verseEn"] = ""

        # Ensure category verse has required fields
        if "verse" not in cat or not isinstance(cat["verse"], dict):
            cat["verse"] = {"ref": "", "ayah": "", "en": ""}
        if "en" not in cat["verse"]:
            cat["verse"]["en"] = ""
        if "ayah" not in cat["verse"]:
            cat["verse"]["ayah"] = ""

    return errors, cooldown_violations, warnings


# ═══════════════════════════════════════════════════════════════════
# WORDLE GENERATOR
# ═══════════════════════════════════════════════════════════════════
def build_wordle_prompt(history, previous_violations=None):
    avoided_words = ", ".join(sorted(history["wordle"]["words"])) or "(none)"
    avoided_hints = "\n".join(f"  - {h}" for h in sorted(history["wordle"]["hints"])) or "  (none)"

    violation_block = ""
    if previous_violations:
        violation_block = f"""

CRITICAL — PREVIOUS ATTEMPT FAILED:
{chr(10).join('  ✗ ' + v for v in previous_violations)}
Choose a completely different word."""

    return f"""You are an expert Islamic scholar creating a daily "Harf by Harf" puzzle.

TASK: Generate ONE Arabic Quranic word for a Harf-by-Harf style guessing game.

RULES:
1. The word MUST be a meaningful Quranic Arabic word (noun, verb root, or concept)
2. The word (without diacritics) MUST be 3-5 Arabic letters long
3. The word MUST appear in a real Quranic verse
4. Provide the word both WITH and WITHOUT diacritics (tashkeel)
5. Provide an English hint that helps guess the word without giving it away directly
6. Provide the full Quranic verse (Arabic with diacritics) where the word appears
7. Provide the English translation/context of the verse

STRICTLY FORBIDDEN words (used in last 30 days):
{avoided_words}

STRICTLY FORBIDDEN hints (used in last 30 days):
{avoided_hints}
{violation_block}

OUTPUT FORMAT: Return a valid JSON object:
{{
  "word": "Arabic word WITHOUT diacritics (for matching, e.g. رحمة)",
  "display": "Arabic word WITH diacritics (for display, e.g. رَحْمَة)",
  "hint": "English hint that helps guess the word",
  "verse": "Surah Name surah:ayah — English translation of the verse",
  "arabicVerse": "Full Arabic verse text with diacritics"
}}

IMPORTANT:
- Return ONLY the JSON object, no markdown
- The word without diacritics must be 3-5 letters
- The hint should be clever but not too obscure
- Choose words that are meaningful Islamic concepts"""


def validate_wordle(puzzle, history):
    errors, cooldown_violations, warnings = [], [], []

    word = puzzle.get("word", "")
    display = puzzle.get("display", "")
    hint = puzzle.get("hint", "")
    verse = puzzle.get("verse", "")
    arabic_verse = puzzle.get("arabicVerse", "")

    if not word:
        errors.append("Missing 'word' field")
    if not display:
        errors.append("Missing 'display' field")
    if not hint:
        errors.append("Missing 'hint' field")
    if not verse:
        errors.append("Missing 'verse' field")
    if not arabic_verse:
        errors.append("Missing 'arabicVerse' field")

    # Check word length (strip diacritics for counting)
    stripped = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', word)
    if len(stripped) < 3 or len(stripped) > 5:
        errors.append(f"Word '{word}' is {len(stripped)} letters (need 3-5)")

    # Cooldown checks
    if word in history["wordle"]["words"] or display in history["wordle"]["words"]:
        cooldown_violations.append(f"Word '{word}' reused (30-day cooldown)")
    if hint.lower().strip() in history["wordle"]["hints"]:
        cooldown_violations.append(f"Hint reused (30-day cooldown)")

    return errors, cooldown_violations, warnings


# ═══════════════════════════════════════════════════════════════════
# DEDUCTION GENERATOR
# ═══════════════════════════════════════════════════════════════════
def build_deduction_prompt(history, previous_violations=None):
    avoided_titles = "\n".join(f"  - {t}" for t in sorted(history["deduction"]["titles"])) or "  (none)"
    avoided_characters = ", ".join(sorted(history["deduction"].get("characters", history["deduction"].get("prophets", set())))) or "(none)"

    violation_block = ""
    if previous_violations:
        violation_block = f"""

CRITICAL — PREVIOUS ATTEMPT FAILED:
{chr(10).join('  ✗ ' + v for v in previous_violations)}
Choose a completely different story/character."""

    return f"""You are an expert Islamic scholar creating a daily "Who Am I?" puzzle for QuranIQ.

TASK: Create a mystery-style "Who Am I?" puzzle about ANY figure, character, or group mentioned in the Quran.
This can be a prophet, a ruler (e.g. Pharaoh, Namrud), a righteous person (e.g. Maryam, Luqman), a group (e.g. People of the Cave, People of the Elephant), or even a notable figure like Qarun, Iblis, etc.

RULES:
1. Create an engaging title and intro paragraph that sets the scene WITHOUT revealing the answer
2. Provide exactly 6 progressive clues written in FIRST PERSON (as if the character is speaking about themselves)
   - Example: "I was thrown into a fire, but Allah made it cool and peaceful for me" (not "He was thrown...")
   - For groups, use "We" instead of "I"
3. Create exactly 4 categories for the player to guess, each with exactly 5 options and 1 correct answer
4. The 4 categories should cover: the identity (who am I?), the trial/event, a key element (place/object), and the outcome
5. Include a relevant Quranic verse (Arabic with diacritics) and its English translation
6. All clues and answers must be Quranically accurate
7. Vary the character types — don't always use prophets. Include rulers, righteous people, groups, and other Quranic figures

STRICTLY FORBIDDEN titles/stories (used in last 30 days):
{avoided_titles}

STRICTLY FORBIDDEN characters as main answer (used in last 30 days):
{avoided_characters}
{violation_block}

OUTPUT FORMAT: Return a valid JSON object:
{{
  "title": "The Mystery Title",
  "intro": "An engaging intro paragraph (in second person, setting the scene)...",
  "clues": ["I ... (vaguest, first person)", "I ...", "I ...", "I ...", "I ...", "I ... (most specific, first person)"],
  "categories": {{
    "identity": {{ "label": "Who Am I?", "options": ["opt1", "opt2", "opt3", "opt4", "opt5"], "answer": "correct" }},
    "trial": {{ "label": "Trial/Event", "options": ["opt1", "opt2", "opt3", "opt4", "opt5"], "answer": "correct" }},
    "location": {{ "label": "Key Element", "options": ["opt1", "opt2", "opt3", "opt4", "opt5"], "answer": "correct" }},
    "outcome": {{ "label": "Outcome", "options": ["opt1", "opt2", "opt3", "opt4", "opt5"], "answer": "correct" }}
  }},
  "verse": "English translation with reference (surah:ayah)",
  "arabic": "Arabic verse with full diacritics"
}}

IMPORTANT:
- Return ONLY the JSON object, no markdown
- ALL clues MUST be in first person ("I was...", "I did...", "My people...") — the character is speaking
- For groups, use "We" instead of "I"
- Clues must go from vague to specific (early clues should be solvable by scholars, later clues by beginners)
- Each category must have exactly 5 plausible options
- The correct answer must be among the 5 options
- All facts must be Quranically accurate"""


def validate_deduction(puzzle, history):
    errors, cooldown_violations, warnings = [], [], []

    if not puzzle.get("title"):
        errors.append("Missing 'title'")
    if not puzzle.get("intro"):
        errors.append("Missing 'intro'")

    clues = puzzle.get("clues", [])
    if len(clues) != 6:
        errors.append(f"Expected 6 clues, got {len(clues)}")

    cats = puzzle.get("categories", {})
    if not isinstance(cats, dict):
        errors.append("'categories' must be a dict")
        return errors, cooldown_violations, warnings

    # Accept both 'identity' (new) and 'prophet' (legacy) as the first category
    identity_key = "identity" if "identity" in cats else "prophet"
    for key in [identity_key, "trial", "location", "outcome"]:
        cat = cats.get(key)
        if not cat:
            errors.append(f"Missing category '{key}'")
            continue
        if not cat.get("label"):
            errors.append(f"Category '{key}' missing label")
        opts = cat.get("options", [])
        if len(opts) != 5:
            errors.append(f"Category '{key}' has {len(opts)} options, expected 5")
        if not cat.get("answer"):
            errors.append(f"Category '{key}' missing answer")
        elif cat["answer"] not in opts:
            errors.append(f"Category '{key}' answer '{cat['answer']}' not in options")

    if not puzzle.get("verse"):
        errors.append("Missing 'verse'")
    if not puzzle.get("arabic"):
        errors.append("Missing 'arabic'")

    # Cooldown
    title = puzzle.get("title", "").lower().strip()
    if title in history["deduction"]["titles"]:
        cooldown_violations.append(f"Title '{title}' reused (30-day cooldown)")

    # Check cooldown for character identity (supports both 'identity' and 'prophet' keys)
    identity_cat = cats.get("identity", cats.get("prophet", {}))
    character_answer = identity_cat.get("answer", "")
    characters_history = history["deduction"].get("characters", history["deduction"].get("prophets", set()))
    if character_answer in characters_history:
        cooldown_violations.append(f"Character '{character_answer}' reused (30-day cooldown)")

    return errors, cooldown_violations, warnings


# ═══════════════════════════════════════════════════════════════════
# SCRAMBLE GENERATOR
# ═══════════════════════════════════════════════════════════════════
def build_scramble_prompt(history, previous_violations=None):
    avoided_refs = "\n".join(f"  - {r}" for r in sorted(history["scramble"]["references"])) or "  (none)"

    violation_block = ""
    if previous_violations:
        violation_block = f"""

CRITICAL — PREVIOUS ATTEMPT FAILED:
{chr(10).join('  ✗ ' + v for v in previous_violations)}
Choose a completely different verse."""

    return f"""You are an expert Islamic scholar creating a daily "Ayah Scramble" puzzle.

TASK: Choose a well-known Quranic verse and split its ARABIC text into word segments for a scramble game.
Players will rearrange the Arabic segments to reconstruct the original verse.
They can use hints to reveal the English translation of individual segments.

RULES:
1. Choose a meaningful, well-known Quranic verse (5-15 words long)
2. Write the FULL Arabic verse first in the "arabic" field
3. Split EXACTLY that Arabic text into 4-7 consecutive segments
4. The "words" array MUST be in the CORRECT reading order of the verse
5. CRITICAL: Joining all segments with a single space MUST exactly reproduce the "arabic" field
   Example: if arabic = "A B C D E F", then words could be ["A B", "C D", "E F"]
   And " ".join(words) MUST equal the arabic field exactly
6. For each Arabic segment, provide its English translation in the same index position
7. Provide the verse reference in "Surah Name (surah:ayah)" format
8. Provide a hint about the verse's theme

STRICTLY FORBIDDEN verse references (used in last 30 days):
{avoided_refs}
{violation_block}

OUTPUT FORMAT: Return a valid JSON object:
{{
  "reference": "Surah Name (surah:ayah)",
  "words": ["first Arabic segment", "second Arabic segment", "third Arabic segment", "fourth Arabic segment"],
  "translations": ["English for segment 1", "English for segment 2", "English for segment 3", "English for segment 4"],
  "arabic": "Full Arabic verse with diacritics (MUST equal words joined by spaces)",
  "hint": "A hint about the verse's theme or context"
}}

VERIFICATION CHECKLIST (you MUST verify before responding):
- [ ] words[0] + " " + words[1] + " " + ... + words[N] == arabic  (EXACT MATCH)
- [ ] words are in correct sequential reading order (not scrambled)
- [ ] Each segment is 1-3 consecutive Arabic words from the verse
- [ ] translations array has same length as words array
- [ ] The verse reference is real and accurate
- [ ] Arabic text has full tashkeel/diacritics

IMPORTANT:
- Return ONLY the JSON object, no markdown
- DO NOT scramble the words array — it must be in correct order
- The game code will scramble them for the player"""


def validate_scramble(puzzle, history):
    errors, cooldown_violations, warnings = [], [], []

    if not puzzle.get("reference"):
        errors.append("Missing 'reference'")
    words = puzzle.get("words", [])
    if len(words) < 3 or len(words) > 8:
        errors.append(f"Expected 4-7 word segments, got {len(words)}")
    if not puzzle.get("arabic"):
        errors.append("Missing 'arabic'")
    if not puzzle.get("hint"):
        errors.append("Missing 'hint'")

    # Validate translations array
    translations = puzzle.get("translations", [])
    if len(translations) != len(words):
        errors.append(f"translations array length ({len(translations)}) must match words array length ({len(words)})")

    # Check that words are Arabic (contain Arabic characters)
    for i, w in enumerate(words):
        if not re.search(r'[\u0600-\u06FF]', w):
            errors.append(f"Word segment {i} ('{w}') doesn't contain Arabic characters")

    # CRITICAL: Verify that joining words reproduces the arabic field
    arabic = puzzle.get("arabic", "")
    if words and arabic:
        joined = " ".join(words)
        # Normalize whitespace for comparison
        norm_joined = re.sub(r'\s+', ' ', joined).strip()
        norm_arabic = re.sub(r'\s+', ' ', arabic).strip()
        if norm_joined != norm_arabic:
            errors.append(
                f"Words joined don't match arabic field.\n"
                f"  Joined:  '{norm_joined}'\n"
                f"  Arabic:  '{norm_arabic}'"
            )

    # Cooldown
    ref = puzzle.get("reference", "")
    if ref in history["scramble"]["references"]:
        cooldown_violations.append(f"Reference '{ref}' reused (30-day cooldown)")
    arabic = puzzle.get("arabic", "")
    if arabic in history["scramble"]["verses"]:
        cooldown_violations.append(f"Verse reused (30-day cooldown)")

    return errors, cooldown_violations, warnings


# ═══════════════════════════════════════════════════════════════════
# JUZ JOURNEY GENERATOR (Ramadan-only)
# ═══════════════════════════════════════════════════════════════════

# Cumulative ayah count before each surah (for audio URL calculation)
# surah_number -> total ayahs before it. Surah 1 has 0 before it.
SURAH_AYAH_OFFSET = {
    1: 0, 2: 7, 3: 293, 4: 493, 5: 669, 6: 789, 7: 954, 8: 1160, 9: 1235, 10: 1364,
    11: 1473, 12: 1596, 13: 1707, 14: 1750, 15: 1802, 16: 1850, 17: 1978, 18: 2089,
    19: 2198, 20: 2296, 21: 2431, 22: 2519, 23: 2597, 24: 2715, 25: 2779, 26: 2856,
    27: 3083, 28: 3176, 29: 3264, 30: 3333, 31: 3393, 32: 3427, 33: 3457, 34: 3530,
    35: 3584, 36: 3629, 37: 3712, 38: 3794, 39: 3882, 40: 3957, 41: 4042, 42: 4096,
    43: 4149, 44: 4238, 45: 4297, 46: 4334, 47: 4369, 48: 4407, 49: 4436, 50: 4462,
    51: 4507, 52: 4567, 53: 4616, 54: 4678, 55: 4733, 56: 4811, 57: 4907, 58: 4936,
    59: 4958, 60: 4982, 61: 5007, 62: 5021, 63: 5032, 64: 5043, 65: 5061, 66: 5073,
    67: 5085, 68: 5115, 69: 5167, 70: 5219, 71: 5263, 72: 5291, 73: 5319, 74: 5339,
    75: 5395, 76: 5435, 77: 5466, 78: 5516, 79: 5556, 80: 5602, 81: 5644, 82: 5673,
    83: 5692, 84: 5728, 85: 5753, 86: 5775, 87: 5792, 88: 5811, 89: 5837, 90: 5867,
    91: 5887, 92: 5902, 93: 5923, 94: 5934, 95: 5942, 96: 5950, 97: 5969, 98: 5974,
    99: 5982, 100: 5990, 101: 5999, 102: 6010, 103: 6018, 104: 6021, 105: 6030,
    106: 6035, 107: 6039, 108: 6046, 109: 6049, 110: 6055, 111: 6058, 112: 6063,
    113: 6067, 114: 6072
}

def get_audio_url(surah_number, ayah_number):
    """Calculate the EveryAyah audio URL for a given surah:ayah."""
    absolute_ayah = SURAH_AYAH_OFFSET.get(surah_number, 0) + ayah_number
    return f"https://cdn.islamic.network/quran/audio/128/ar.alafasy/{absolute_ayah}.mp3"


def get_juz_number_for_today(today_str):
    """Calculate which Juz to generate based on the date (Day 1 of Ramadan = Juz 1)."""
    today_dt = datetime.strptime(today_str, "%Y-%m-%d")
    day_of_ramadan = (today_dt - RAMADAN_START).days + 1
    return max(1, min(30, day_of_ramadan))


def build_juz_prompt(history, previous_violations=None):
    """Build the LLM prompt for Juz Journey puzzle generation."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    juz_number = get_juz_number_for_today(today)

    avoided_verses = ", ".join(sorted(history["juz"]["verses"])) or "(none)"

    violation_block = ""
    if previous_violations:
        violation_block = f"""

CRITICAL — PREVIOUS ATTEMPT FAILED:
{chr(10).join('  ✗ ' + v for v in previous_violations)}
Fix these issues in your next attempt."""

    return f"""You are an expert Islamic scholar creating a daily "Juz Journey" puzzle for Ramadan.

TASK: Generate a puzzle for JUZ {juz_number} of the Quran.

RULES:
1. Choose a short, impactful, representative verse from Juz {juz_number}
2. The verse MUST actually be in Juz {juz_number} — verify the surah and ayah numbers
3. Arabic text MUST have full diacritics (tashkeel)
4. Create a theme question with 1 correct answer and 3 plausible distractors
5. Create a surah identification question with the correct surah and 3 distractors
   - Distractors should be from the same Juz or nearby Juz
   - Each surah option needs: num, name (transliteration), name_ar (Arabic), name_en (English meaning)
6. List ALL surahs that appear in Juz {juz_number} in correct order
   - Include surahs that start in this Juz OR continue from the previous Juz
   - Each surah needs: num, name, name_ar, name_en
7. Write educational notes about the verse context, theme, and surah overview
8. The audio_url field should follow this pattern:
   https://cdn.islamic.network/quran/audio/128/ar.alafasy/ABSOLUTE_AYAH.mp3
   where ABSOLUTE_AYAH is the sequential ayah number across the entire Quran

STRICTLY FORBIDDEN verses (used recently):
{avoided_verses}
{violation_block}

OUTPUT FORMAT: Return a valid JSON object:
{{{{
  "date": "{today}",
  "juz_number": {juz_number},
  "juz_name": "<transliterated name of the Juz>",
  "juz_name_ar": "<Arabic name of the Juz>",
  "verse": {{{{
    "surah_number": <number>,
    "surah_name": "<transliteration>",
    "surah_name_ar": "<Arabic>",
    "ayah_number": <number>,
    "arabic_text": "<full Arabic with diacritics>",
    "translation": "<English translation>",
    "audio_url": "<EveryAyah CDN URL>"
  }}}},
  "theme_question": {{{{
    "correct": "<correct theme description>",
    "options": ["<option1>", "<option2>", "<option3>", "<option4>"]
  }}}},
  "surah_question": {{{{
    "correct_surah": <surah number>,
    "options": [
      {{{{ "num": <n>, "name": "<transliteration>", "name_ar": "<Arabic>", "name_en": "<English meaning>" }}}},
      {{{{ "num": <n>, "name": "<transliteration>", "name_ar": "<Arabic>", "name_en": "<English meaning>" }}}},
      {{{{ "num": <n>, "name": "<transliteration>", "name_ar": "<Arabic>", "name_en": "<English meaning>" }}}},
      {{{{ "num": <n>, "name": "<transliteration>", "name_ar": "<Arabic>", "name_en": "<English meaning>" }}}}
    ]
  }}}},
  "surah_order": {{{{
    "surahs": [
      {{{{ "num": <n>, "name": "<transliteration>", "name_ar": "<Arabic>", "name_en": "<English meaning>" }}}}
    ]
  }}}},
  "educational_notes": {{{{
    "verse_context": "<context about the verse>",
    "theme_explanation": "<explanation of the theme>",
    "surah_overview": "<overview of the surah>"
  }}}}
}}}}

IMPORTANT:
- Return ONLY the JSON object, no markdown
- The correct theme MUST be in the options array
- The correct surah MUST be in the surah_question options
- surah_order.surahs MUST list ALL surahs in Juz {juz_number} in correct order
- All Arabic text must have full tashkeel/diacritics
- Verify the verse is actually in Juz {juz_number}"""


def validate_juz(puzzle, history):
    """Validate a Juz Journey puzzle."""
    errors, cooldown_violations, warnings = [], [], []

    # Required top-level fields
    for field in ["juz_number", "juz_name", "juz_name_ar"]:
        if not puzzle.get(field):
            errors.append(f"Missing '{field}'")

    juz_num = puzzle.get("juz_number")
    if juz_num and (juz_num < 1 or juz_num > 30):
        errors.append(f"Invalid juz_number: {juz_num} (must be 1-30)")

    # Verse validation
    verse = puzzle.get("verse", {})
    if not isinstance(verse, dict):
        errors.append("'verse' must be a dict")
    else:
        for field in ["surah_number", "surah_name", "surah_name_ar", "ayah_number", "arabic_text", "translation"]:
            if not verse.get(field):
                errors.append(f"verse missing '{field}'")
        # Auto-fix audio_url if missing or wrong
        if verse.get("surah_number") and verse.get("ayah_number"):
            expected_url = get_audio_url(verse["surah_number"], verse["ayah_number"])
            if verse.get("audio_url") != expected_url:
                warnings.append(f"Auto-fixing audio_url to {expected_url}")
                puzzle["verse"]["audio_url"] = expected_url

    # Theme question validation
    theme = puzzle.get("theme_question", {})
    if not isinstance(theme, dict):
        errors.append("'theme_question' must be a dict")
    else:
        if not theme.get("correct"):
            errors.append("theme_question missing 'correct'")
        opts = theme.get("options", [])
        if len(opts) != 4:
            errors.append(f"theme_question has {len(opts)} options, expected 4")
        if theme.get("correct") and theme["correct"] not in opts:
            errors.append("theme_question correct answer not in options")

    # Surah question validation
    sq = puzzle.get("surah_question", {})
    if not isinstance(sq, dict):
        errors.append("'surah_question' must be a dict")
    else:
        if not sq.get("correct_surah"):
            errors.append("surah_question missing 'correct_surah'")
        opts = sq.get("options", [])
        if len(opts) != 4:
            errors.append(f"surah_question has {len(opts)} options, expected 4")
        for i, opt in enumerate(opts):
            if not isinstance(opt, dict):
                errors.append(f"surah_question option {i} must be a dict")
            else:
                for field in ["num", "name", "name_ar", "name_en"]:
                    if not opt.get(field):
                        errors.append(f"surah_question option {i} missing '{field}'")
        # Check correct surah is in options
        correct_num = sq.get("correct_surah")
        if correct_num and opts:
            found = any(o.get("num") == correct_num for o in opts if isinstance(o, dict))
            if not found:
                errors.append(f"correct_surah {correct_num} not found in surah_question options")

    # Surah order validation
    so = puzzle.get("surah_order", {})
    if not isinstance(so, dict):
        errors.append("'surah_order' must be a dict")
    else:
        surahs = so.get("surahs", [])
        if len(surahs) < 1:
            errors.append("surah_order has no surahs")
        for i, s in enumerate(surahs):
            if not isinstance(s, dict):
                errors.append(f"surah_order surah {i} must be a dict")
            else:
                for field in ["num", "name", "name_ar", "name_en"]:
                    if not s.get(field):
                        errors.append(f"surah_order surah {i} missing '{field}'")

    # Educational notes
    notes = puzzle.get("educational_notes", {})
    if not isinstance(notes, dict):
        errors.append("'educational_notes' must be a dict")
    else:
        for field in ["verse_context", "theme_explanation", "surah_overview"]:
            if not notes.get(field):
                errors.append(f"educational_notes missing '{field}'")

    # Cooldown — verse reuse check
    if verse.get("surah_number") and verse.get("ayah_number"):
        ref = f"{verse['surah_number']}:{verse['ayah_number']}"
        if ref in history["juz"]["verses"]:
            cooldown_violations.append(f"Verse {ref} reused (30-day cooldown)")

    return errors, cooldown_violations, warnings


# ═══════════════════════════════════════════════════════════════════
# QURAN API — VERSE TEXT LOOKUP
# ═══════════════════════════════════════════════════════════════════
QURAN_API_BASE = "https://api.quran.com/api/v4"


def fetch_verse_text(ref):
    """Fetch the Arabic text (Uthmani script) and English translation for a verse ref.
    
    Uses the Quran.com API word-by-word endpoint to get both Arabic (Uthmani)
    and English word-by-word translations.
    
    Args:
        ref: Verse reference in "surah:ayah" format (e.g. "2:255")
    Returns:
        dict with 'arabic' and 'english' keys, or None on failure
    """
    try:
        key = ref.strip()
        url = f"{QURAN_API_BASE}/verses/by_key/{key}?language=en&words=true&word_fields=text_uthmani,translation"
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            print(f"    ⚠ Quran API returned {resp.status_code} for {ref}")
            return None
        data = resp.json()
        verse_data = data.get("verse", {})
        words = verse_data.get("words", [])
        
        if not words:
            print(f"    ⚠ No words returned for {ref}")
            return None
        
        # Build Arabic text from Uthmani script words
        arabic = " ".join(w.get("text_uthmani", "") for w in words if w.get("text_uthmani"))
        
        # Build English from word-by-word translations
        en_parts = []
        for w in words:
            t = w.get("translation", {})
            if isinstance(t, dict) and t.get("text"):
                en_parts.append(t["text"].strip())
        english = " ".join(en_parts)
        
        if not arabic:
            print(f"    ⚠ Empty Arabic text for {ref}")
            return None
        
        return {"arabic": arabic, "english": english}
    except Exception as e:
        print(f"    ⚠ Quran API error for {ref}: {e}")
        return None


def enrich_connections_with_verses(puzzle):
    """Post-process a Connections puzzle: look up full verse text from Quran API.
    
    For each item, fetches the Arabic verse text and English translation
    using the ref field. Also enriches category-level verses.
    """
    print("\n  📖 Looking up verse text from Quran API...")
    cats = puzzle.get("categories", [])
    total_refs = 0
    found_refs = 0
    
    for cat in cats:
        # Enrich each item's verse
        for item in cat.get("items", []):
            ref = item.get("ref", "")
            if not ref:
                continue
            total_refs += 1
            verse_data = fetch_verse_text(ref)
            if verse_data:
                item["verse"] = verse_data["arabic"]
                item["verseEn"] = verse_data["english"]
                found_refs += 1
            else:
                item["verse"] = ""
                item["verseEn"] = ""
            # Small delay to be respectful to the API
            time.sleep(0.3)
        
        # Enrich category-level verse
        cat_verse = cat.get("verse", {})
        if isinstance(cat_verse, dict) and cat_verse.get("ref"):
            cat_ref = cat_verse["ref"]
            verse_data = fetch_verse_text(cat_ref)
            if verse_data:
                cat_verse["ayah"] = verse_data["arabic"]
                cat_verse["en"] = verse_data["english"]
            else:
                cat_verse["ayah"] = ""
                cat_verse["en"] = ""
            time.sleep(0.3)
    
    print(f"  ✓ Verse lookup complete: {found_refs}/{total_refs} verses found")
    return puzzle


# ═══════════════════════════════════════════════════════════════════
# UNIFIED GENERATION LOOP
# ═══════════════════════════════════════════════════════════════════
GAME_CONFIGS = {
    "connections": {
        "build_prompt": build_connections_prompt,
        "validate": validate_connections,
        "label": "Ayah Connections",
    },
    "wordle": {
        "build_prompt": build_wordle_prompt,
        "validate": validate_wordle,
        "label": "Harf by Harf",
    },
    "deduction": {
        "build_prompt": build_deduction_prompt,
        "validate": validate_deduction,
        "label": "Who Am I?",
    },
    "scramble": {
        "build_prompt": build_scramble_prompt,
        "validate": validate_scramble,
        "label": "Ayah Scramble",
    },
    "juz": {
        "build_prompt": build_juz_prompt,
        "validate": validate_juz,
        "label": "Juz Journey",
    },
}


def generate_game(game_type, history, today):
    """Generate a single game puzzle with retries and model fallback chain.
    
    Fallback chain: DeepSeek-R1 → Gemini Flash → Phi-4
    Each model gets up to MAX_RETRIES attempts before falling back.
    Rate limiting immediately triggers fallback to the next model.
    """
    config = GAME_CONFIGS[game_type]
    print(f"\n{'═'*60}")
    print(f"  Generating: {config['label']}")
    print(f"{'═'*60}")

    previous_violations = None
    total_attempt = 0

    for model_config in MODEL_CHAIN:
        model_label = model_config["label"]
        print(f"\n  Trying model: {model_label}")

        for retry in range(1, MAX_RETRIES + 1):
            total_attempt += 1
            print(f"\n  Attempt {total_attempt} (retry {retry}/{MAX_RETRIES}) using {model_label}...")

            prompt = config["build_prompt"](history, previous_violations)
            raw = call_model(prompt, model_config)

            # Rate limited → immediately fall back to next model
            if raw == "RATE_LIMITED":
                print(f"  → Rate limited, falling back to next model...")
                break

            # Other failure (timeout, auth, etc.) → try next model
            if not raw:
                print(f"  → Failed, falling back to next model...")
                break

            try:
                puzzle = parse_json_response(raw)
            except json.JSONDecodeError as e:
                print(f"  ✗ JSON parse error: {e}")
                print(f"  Raw (first 500 chars): {raw[:500]}")
                continue  # Retry same model (might be a fluke)

            errors, cooldown_violations, warnings = config["validate"](puzzle, history)

            if errors:
                print(f"  ✗ Structural errors: {errors}")
                continue  # Retry same model

            if cooldown_violations:
                print(f"  ✗ COOLDOWN VIOLATIONS (rejecting):")
                for v in cooldown_violations:
                    print(f"      {v}")
                previous_violations = cooldown_violations
                continue  # Retry same model with violation feedback

            if warnings:
                print(f"  ⚠ Warnings (accepted): {warnings}")

            print(f"\n  ✓ {config['label']} generated successfully using {model_label}")
            return puzzle

        # All retries exhausted for this model, try next
        print(f"  → Exhausted retries for {model_label}")

    print(f"\n  ✗ All models failed for {config['label']} after {total_attempt} total attempts.")
    return None


def main():
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Check if already generated today
    today_file = os.path.join(HISTORY_DIR, f"{today}.json")
    if os.path.exists(today_file):
        print(f"Puzzles for {today} already exist. Skipping generation.")
        # Still write output files from history
        try:
            with open(today_file) as f:
                all_puzzles = json.load(f)
            for game_type, output_path in OUTPUT_FILES.items():
                puzzle_data = all_puzzles.get(game_type)
                if puzzle_data:
                    os.makedirs(os.path.dirname(output_path), exist_ok=True)
                    with open(output_path, "w") as f:
                        json.dump({
                            "date": today,
                            "puzzle": puzzle_data,
                            "generated": True,
                        }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Warning: Could not restore output files: {e}")
        return 0

    if not GITHUB_TOKEN and not GEMINI_API_KEY:
        print("ERROR: No API credentials set.")
        print("  Set GITHUB_TOKEN (GitHub Models PAT) and/or GEMINI_API_KEY.")
        return 1

    print(f"Available APIs:")
    if GITHUB_TOKEN:
        print(f"  ✓ GitHub Models (DeepSeek-R1, Phi-4)")
    else:
        print(f"  ✗ GitHub Models (GITHUB_TOKEN not set)")
    if GEMINI_API_KEY:
        print(f"  ✓ Gemini API (gemini-2.5-flash)")
    else:
        print(f"  ✗ Gemini API (GEMINI_API_KEY not set)")

    # Load history for cooldown enforcement
    history = load_history()
    print(f"History loaded:")
    print(f"  Connections: {len(history['connections']['themes'])} themes, "
          f"{len(history['connections']['verses'])} verses")
    print(f"  Harf by Harf: {len(history['wordle']['words'])} words")
    print(f"  Deduction: {len(history['deduction']['titles'])} titles, "
          f"{len(history['deduction']['characters'])} characters")
    print(f"  Scramble: {len(history['scramble']['references'])} references")
    print(f"  Juz Journey: {len(history['juz']['juz_numbers'])} juz, "
          f"{len(history['juz']['verses'])} verses")

    # Determine which games to generate
    # Juz Journey only generates during Ramadan (Feb 18 - Mar 20, 2026)
    game_types = ["connections", "wordle", "deduction", "scramble"]
    today_dt = datetime.strptime(today, "%Y-%m-%d")
    if RAMADAN_START <= today_dt <= RAMADAN_END:
        game_types.append("juz")
        juz_num = get_juz_number_for_today(today)
        print(f"\n  \U0001f319 Ramadan mode: Generating Juz Journey (Juz {juz_num})")
    else:
        print(f"\n  Juz Journey: Skipped (not during Ramadan)")

    # Generate all games
    all_puzzles = {}
    any_success = False

    for i, game_type in enumerate(game_types):
        # Wait 60s between games to respect DeepSeek-R1's 1 req/min rate limit
        if i > 0:
            print(f"\n  ⏳ Waiting 60 seconds before next game (DeepSeek rate limit: 1 req/min)...")
            time.sleep(60)

        puzzle = generate_game(game_type, history, today)
        if puzzle:
            # Post-process: enrich Connections with verse text from Quran API
            if game_type == "connections":
                puzzle = enrich_connections_with_verses(puzzle)

            all_puzzles[game_type] = puzzle
            any_success = True

            # Write individual output file
            output_path = OUTPUT_FILES[game_type]
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w") as f:
                json.dump({
                    "date": today,
                    "puzzle": puzzle,
                    "generated": True,
                    "model": "auto (chain)",
                }, f, ensure_ascii=False, indent=2)
            print(f"  → Saved to {os.path.basename(output_path)}")
        else:
            # Write fallback marker
            output_path = OUTPUT_FILES[game_type]
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w") as f:
                json.dump({
                    "date": today,
                    "puzzle": None,
                    "generated": False,
                    "fallback": True,
                }, f, indent=2)

    # Save all puzzles to history
    if any_success:
        save_to_history(all_puzzles, today)
        print(f"\n{'═'*60}")
        print(f"  ✓ Daily puzzles saved to history/{today}.json")
        print(f"  Games generated: {', '.join(all_puzzles.keys())}")
        print(f"{'═'*60}")

    # Print summary
    print(f"\n{'═'*60}")
    print(f"  GENERATION SUMMARY for {today}")
    print(f"{'═'*60}")
    for game_type in game_types:
        status = "\u2713" if game_type in all_puzzles else "\u2717 (fallback)"
        print(f"  {status} {GAME_CONFIGS[game_type]['label']}")

    return 0 if any_success else 1


if __name__ == "__main__":
    sys.exit(main())
