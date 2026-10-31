#!/usr/bin/env python3
"""
Daily Puzzle Generator for QuranIQ - All 4 Games
Generates daily puzzles for:
  1. Connections (Ayah Connections)
  2. Harf by Harf (Word Guessing)
  3. Deduction (Who Am I?)
  4. Scramble (Ayah Scramble)

Model fallback chain (based on Feb 2026 benchmark)
──────────────────────────────────────────────────
1. Gemini 2.5 Flash (Google Gemini API - fastest, best verse avoidance)
2. DeepSeek-R1      (GitHub Models - perfect avoidance, slow but thorough)
3. GPT-4.1          (OpenAI - fast, great diversity, weaker avoidance)

Each game uses 1 API call (up to 5 retries), so worst case = 25 calls/day.
A 60-second pause between games respects rate limits.

Coverage strategy
─────────────────
- All games share a global "all_verses" set to prevent cross-game verse overlap
- Connections: 16 verse refs/day → covers ~93% of Quran in 365 days
- Wordle/Scramble: 1 verse ref/day each, tracked and deduplicated
- Deduction: 1 verse ref/day, 60-day cooldown (limited character pool)
- Combined: ~19 unique verses/day → full Quran coverage in ~1 year
"""
import json
import os
import sys
import re
import glob
import time
import requests
from datetime import datetime, timedelta
from tashaphyne.stemming import ArabicLightStemmer

_stemmer = ArabicLightStemmer()

# ── Arabic text helpers ────────────────────────────────────────────
def normalize_arabic(text):
    """Normalize Arabic text for comparison - handles Uthmani vs standard script.

    The Quran API returns Uthmani script which uses special Unicode characters
    (superscript alef, small waw/ya, alef wasla, etc.) that differ from the
    standard Arabic script that LLMs typically generate.
    """
    # Convert Uthmani-specific characters to standard equivalents
    text = text.replace('\u0670', '\u0627')  # superscript alef → alef
    text = text.replace('\u06E5', '\u0648')  # small waw → waw
    text = text.replace('\u06E6', '\u064A')  # small ya → ya
    # Remove all diacritics (tashkeel)
    text = re.sub(r'[\u0610-\u061A\u064B-\u065F]', '', text)
    # Remove tatweel
    text = text.replace('\u0640', '')
    # Normalize alef variants to plain alef
    text = re.sub(r'[\u0622\u0623\u0625\u0671\u0672\u0673\u0675]', '\u0627', text)
    # Normalize ya variants (Farsi ya to Arabic ya)
    text = text.replace('\u06CC', '\u064A')
    # Normalize teh marbuta to heh
    text = text.replace('\u0629', '\u0647')
    # Remove zero-width characters
    text = re.sub(r'[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]', '', text)
    # Remove Uthmani annotation marks and extended Arabic-B
    text = re.sub(r'[\u06D6-\u06FF]', '', text)
    text = re.sub(r'[\u06E0-\u06EF]', '', text)
    # Remove combining marks
    text = re.sub(r'[\u0300-\u036F]', '', text)
    # Collapse spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def extract_reliable_root(word):
    """Extract reliable root for Arabic word using multiple methods.
    Returns root string or None if uncertain.

    Verified by an ordered subsequence check to ensure the root characters
    actually appear in the word.
    """
    n = normalize_arabic(word)
    if not n or len(n) < 2:
        return None

    arabic_letters = set('ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأإؤئ')

    # Helper: ensure root letters appear in word in order
    def _is_root_in_word(r, w):
        it = iter(w)
        return all(c in it for c in r)

    # Method 1: Tashaphyne
    _stemmer.light_stem(n)
    tash_root = _stemmer.get_root()
    if tash_root:
        clean_root = ''.join(c for c in tash_root if c in arabic_letters)
        if 2 <= len(clean_root) <= 4:
            # ONLY trust if it's an ordered subsequence of the word
            if _is_root_in_word(clean_root, n):
                return clean_root

    # Method 2: Pattern matching for common forms
    common_affixes = [
        ('ي', ''), ('ت', ''), ('ن', ''), ('ا', ''), ('ال', ''), ('م', ''),
        ('است', ''), ('ان', ''), ('تفع', ''), ('تفاعل', ''),
        ('', 'ة'), ('', 'ا'), ('', 'ي'), ('', 'ون'), ('', 'ين'), ('', 'ات'),
        ('', 'ان'), ('', 'تان'), ('', 'ين'), ('', 'ون'), ('', 'ى'),
    ]

    for prefix, suffix in common_affixes:
        if n.startswith(prefix) and n.endswith(suffix):
            base = n[len(prefix):]
            if suffix:
                base = base[:-len(suffix)]
            if 2 <= len(base) <= 4 and all(c in arabic_letters for c in base):
                if len(base) >= 3 or base in ['ماء', 'أب']:
                    return base

    # Method 3: Manual mapping for common words (Logical Fallback)
    common_words = {
        'كتاب': 'كتب', 'يكتب': 'كتب', 'مكتب': 'كتب', 'كاتب': 'كتب',
        'ماء': 'ماء', 'سماء': 'سمو', 'نور': 'نور',
        'نار': 'نار', 'عين': 'عين', 'معين': 'عين', 'رحمة': 'رحم',
        'غفران': 'غفر', 'غافر': 'غفر',
    }

    if n in common_words:
        res = common_words[n]
        if len(res) >= 3 or res in ['ماء', 'أب']:
            return res

    return None

def meanings_are_distinct(en1, en2):
    """Heuristic to check if two English meanings are conceptually different."""
    if not en1 or not en2:
        return False

    def tokenize(s):
        s = s.lower()
        words = re.findall(r'\w+', s)
        stopwords = {'the', 'a', 'an', 'and', 'of', 'to', 'in', 'is', 'for', 'with', 'from', 'on', 'at', 'by'}
        return {w for w in words if w not in stopwords and len(w) > 2}

    s1 = tokenize(en1)
    s2 = tokenize(en2)
    if not s1 or not s2:
        return False
    return len(s1.intersection(s2)) == 0


def words_are_too_similar(word1, word2, label1=None, label2=None):
    """Check if two Arabic words are too similar for Connections gameplay.

    Returns True if words should NOT appear in different categories.
    Uses a multi-tier approach: manual rules, affixes, containment, and verified roots.
    Incorporates a 'Semantic Pardon' to allow distinct meanings despite root overlap.
    """
    n1 = normalize_arabic(word1)
    n2 = normalize_arabic(word2)
    if not n1 or not n2:
        return False

    # Strip common prefixes (Definite article + prepositions)
    # Order matters: try compound prefixes first
    def strip_all_prefixes(s):
        for p in ['وال', 'فال', 'بال', 'لال', 'ال', 'و', 'ف', 'ب', 'ل']:
            if s.startswith(p) and len(s) > len(p) + 1: # Ensure we don't strip the whole word
                return s[len(p):]
        return s

    s1 = strip_all_prefixes(n1)
    s2 = strip_all_prefixes(n2)

    def should_pardon():
        """Returns True if the words are visually similar but have distinct meanings."""
        if not label1 or not label2:
            return False
        if isinstance(label2, (set, list)):
            # History may have multiple meanings for one Arabic word
            return all(meanings_are_distinct(label1, l) for l in label2)
        return meanings_are_distinct(label1, label2)

    # TIER 1: Exact matches or common affixes
    if s1 == s2:
        return True

    common_affixes = [
        ('ي', ''), ('ت', ''), ('ن', ''), ('ا', ''), ('م', ''), ('است', ''), ('ان', ''),
        ('', 'ة'), ('', 'ا'), ('', 'ي'), ('', 'ون'), ('', 'ين'),
    ]

    for prefix, suffix in common_affixes:
        # word1 as derivation of word2
        if s1.startswith(prefix) and s1.endswith(suffix):
            base_s1 = s1[len(prefix):]
            if suffix:
                base_s1 = base_s1[:-len(suffix)]
            if base_s1 == s2:
                if should_pardon(): return False
                return True
        # word2 as derivation of word1
        if s2.startswith(prefix) and s2.endswith(suffix):
            base_s2 = s2[len(prefix):]
            if suffix:
                base_s2 = base_s2[:-len(suffix)]
            if base_s2 == s1:
                if should_pardon(): return False
                return True

    # TIER 2: Meaningful containment
    if len(s1) >= 3 and len(s2) >= 3:
        if s1 in s2 or s2 in s1:
            if abs(len(s1) - len(s2)) <= 2:
                if should_pardon(): return False
                return True

    # TIER 3: Verified Root Comparison
    root1 = extract_reliable_root(word1)
    root2 = extract_reliable_root(word2)

    if root1 and root2 and root1 == root2:
        if should_pardon(): return False
        return True

    # TIER 4: Character overlap fallback (Extreme similarity)
    if len(s1) >= 4 and len(s2) >= 4 and len(s1) == len(s2):
        set1, set2 = set(s1), set(s2)
        overlap = len(set1 & set2) / len(set1 | set2)
        if overlap > 0.9:
            if should_pardon(): return False
            return True

    return False

def word_in_verse(word, verse_text):
    """Check if an Arabic word appears in a verse, with Uthmani-aware normalization.

    Uses multiple strategies to match LLM-generated standard Arabic words
    against Uthmani script verse text from the Quran API.
    """
    w = normalize_arabic(word)
    v = normalize_arabic(verse_text)
    if not w or not v:
        return False
    # 1. Exact normalized substring match
    if w in v:
        return True
    # 2. Try without alef-lam prefix
    if w.startswith('\u0627\u0644') and w[2:] in v:
        return True
    # 3. Try adding alef-lam prefix
    if ('\u0627\u0644' + w) in v:
        return True
    # 4. Try without trailing alef (tanween accusative marker كتابًا → كتاب)
    if w.endswith('\u0627') and w[:-1] in v:
        return True
    # 5. Check if any verse word contains the search word (more specific than verse-wide)
    # Avoid tiny words matching as substrings (e.g. 'am' in 'ta'am')
    if len(w) >= 3:
        for vw in v.split():
            if w == vw or (len(w) >= 4 and w in vw):
                return True
    # 6. Morphological root overlap - matches roots instead of substrings
    w_root = extract_reliable_root(word)
    if w_root:
        for vw in v.split():
            vw_root = extract_reliable_root(vw)
            if vw_root and vw_root == w_root:
                return True

    # 7. Fallback: 3-letter substring match (always runs; catches same-root words
    #    whose root extractor returns different-length stems, e.g. صياح vs صيح)
    for vw in v.split():
        for i in range(len(w) - 2):
            sub = w[i:i+3]
            if sub in vw:
                return True
    return False



def get_roots_for_prompt(words):
    """
    Extract roots for display in prompt.
    Returns list of roots (with None for uncertain).
    """
    roots = []
    for word in words:
        root = extract_reliable_root(word)
        roots.append(root)
    return roots

# ── Configuration ──────────────────────────────────────────────────
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
MINIMAX_API_KEY = os.environ.get("MINIMAX_API_KEY", "")
KIMI_API_KEY = os.environ.get("KIMI_API_KEY", "")

# API endpoints
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
GITHUB_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
MINIMAX_M3_API_URL = "https://api.minimax.io/v1/chat/completions"
KIMI_API_URL = "https://api.moonshot.ai/v1/chat/completions"

# Model fallback chain: MiniMax M3 → Kimi K3 → DeepSeek V4 Pro
MODEL_CHAIN = [
    {"id": "MiniMax-M3",      "api": "minimax_m3", "label": "MiniMax M3"},
    {"id": "kimi-k3",         "api": "kimi",       "label": "Kimi K3"},
    {"id": "deepseek-v4-pro", "api": "deepseek",   "label": "DeepSeek V4 Pro"},
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")
HISTORY_DIR = os.path.join(DATA_DIR, "history")
FALLBACK_PUZZLES = os.path.join(SCRIPT_DIR, "..", "puzzles.js")

COOLING_DAYS = 365          # Default cooldown for most games
DEDUCTION_COOLING_DAYS = 60 # Shorter cooldown for Who Am I (limited character pool ~70-200)
THEME_COOLING_DAYS = 30     # Shorter cooldown for English themes to allow more flexibility
SURAH_COOLING_DAYS = 30    # Surah-level cooldown for single-verse games (Scramble, Wordle, Deduction)
CONNECTIONS_COOLING_DAYS = 60  # Shorter cooldown: Connections burns 16 verses/day
ROOT_HIVE_COOLING_DAYS = 180   # ~230 usable featured roots, so a year-long cooldown would exhaust them
ROOT_LEXICON_PATH = os.path.join(DATA_DIR, "root_lexicon.json")
MAX_RETRIES = 5
COLORS = ["yellow", "green", "blue", "purple"]

# Output files for each game type
OUTPUT_FILES = {
    "connections": os.path.join(DATA_DIR, "daily_puzzle.json"),
    "harf": os.path.join(DATA_DIR, "daily_harf.json"),
    "deduction": os.path.join(DATA_DIR, "daily_deduction.json"),
    "scramble": os.path.join(DATA_DIR, "daily_scramble.json"),
    "juz": os.path.join(DATA_DIR, "daily_juz.json"),
    "roothive": os.path.join(DATA_DIR, "daily_roothive.json"),
}

# Ramadan 2026 - Juz Journey launched Feb 17 evening (1 Ramadan 1447 AH)
RAMADAN_START = datetime(2026, 2, 17)
RAMADAN_END = datetime(2026, 3, 19)  # 30 days


# ── Utility: extract surah:ayah ref from various formats ──────────
def extract_ref(text):
    """Extract a 'surah:ayah' ref from text like 'Surah Al-Baqarah (2:152)' or '2:152'."""
    m = re.search(r'(\d{1,3}):(\d{1,3})', str(text))
    if m:
        return f"{m.group(1)}:{m.group(2)}"
    return None


# ── History Management ─────────────────────────────────────────────
def load_history(exclude_date=None):
    """Load puzzle history for cooldown enforcement.

    All games use a 365-day cooldown (except Deduction at 60 days)
    to maximize verse variety and cycle through the Quran's 6,236 verses.

    Returns a dict with sets for each game type's used content,
    plus a global 'all_verses' set that tracks ALL verse refs across ALL games.
    """
    cutoff_default = datetime.utcnow() - timedelta(days=COOLING_DAYS)
    cutoff_deduction = datetime.utcnow() - timedelta(days=DEDUCTION_COOLING_DAYS)
    cutoff_surah = datetime.utcnow() - timedelta(days=SURAH_COOLING_DAYS)
    cutoff_theme = datetime.utcnow() - timedelta(days=THEME_COOLING_DAYS)
    cutoff_connections = datetime.utcnow() - timedelta(days=CONNECTIONS_COOLING_DAYS)

    history = {
        "connections": {"themes": set(), "verses": set(), "words": set(), "meanings": {}},
        "harf": {"words": set(), "verses": set(), "hints": set(), "verseRefs": set(), "surahs": set()},
        "deduction": {"titles": set(), "characters": set(), "verseRefs": set(), "surahs": set()},
        "scramble": {"verses": set(), "references": set(), "surahs": set()},
        "juz": {"juz_numbers": set(), "verses": set()},
        "roothive": {"roots": set()},
        "all_verses": set(),  # Global cross-game verse deduplication
    }

    os.makedirs(HISTORY_DIR, exist_ok=True)
    for fpath in glob.glob(os.path.join(HISTORY_DIR, "*.json")):
        fname = os.path.basename(fpath)
        try:
            date_str = fname.replace(".json", "")
            fdate = datetime.strptime(date_str, "%Y-%m-%d")
            if exclude_date and date_str == exclude_date:
                continue
        except ValueError:
            continue

        # Only clean up files older than the longest cooldown
        if fdate < cutoff_default:
            os.remove(fpath)
            print(f"  Cleaned up old history: {fname}")
            continue

        try:
            with open(fpath) as f:
                data = json.load(f)
        except (json.JSONDecodeError, KeyError):
            continue

        # Connections history (120-day cooldown)
        conn = data.get("connections")
        if conn:
            for cat in conn.get("categories", []):
                # Only add theme to history if it's within the theme cooldown window
                if fdate >= cutoff_theme:
                    history["connections"]["themes"].add(cat.get("nameEn", "").lower().strip())
                for item in cat.get("items", []):
                    if item.get("ref"):
                        if fdate >= cutoff_connections:
                            history["connections"]["verses"].add(item["ref"])
                        history["all_verses"].add(item["ref"])
                    if item.get("ar"):
                        ar = item["ar"]
                        history["connections"]["words"].add(ar)
                        if item.get("en"):
                            if ar not in history["connections"]["meanings"]:
                                history["connections"]["meanings"][ar] = set()
                            history["connections"]["meanings"][ar].add(item["en"].lower().strip())

        # Harf history (legacy: wordle)
        wdl = data.get("harf") or data.get("wordle")
        if wdl:
            if wdl.get("word"):
                history["harf"]["words"].add(wdl["word"])
            if wdl.get("display"):
                history["harf"]["words"].add(wdl["display"])
            if wdl.get("hint"):
                history["harf"]["hints"].add(wdl.get("hint", "").lower().strip())
            if wdl.get("verse"):
                history["harf"]["verses"].add(wdl.get("verse", ""))

            wdl_ref = wdl.get("verseRef") or extract_ref(wdl.get("verse", ""))
            if wdl_ref:
                history["harf"]["verseRefs"].add(wdl_ref)
                history["all_verses"].add(wdl_ref)
                if fdate >= cutoff_surah:
                    surah_num = wdl_ref.split(":")[0]
                    history["harf"]["surahs"].add(surah_num)

        # Deduction history (60-day cooldown - only load within deduction window)
        ded = data.get("deduction")
        if ded and fdate >= cutoff_deduction:
            if ded.get("title"):
                history["deduction"]["titles"].add(ded["title"].lower().strip())
            cats = ded.get("categories", {})
            if isinstance(cats, dict):
                identity_cat = cats.get("identity", cats.get("prophet", {}))
                if identity_cat.get("answer"):
                    history["deduction"]["characters"].add(identity_cat["answer"])
            # Track verse ref (new field)
            ded_ref = ded.get("verseRef") or extract_ref(ded.get("verse", ""))
            if ded_ref:
                history["deduction"]["verseRefs"].add(ded_ref)
                history["all_verses"].add(ded_ref)
                # Surah-level cooldown (30 days)
                if fdate >= cutoff_surah:
                    surah_num = ded_ref.split(":")[0]
                    history["deduction"]["surahs"].add(surah_num)

        # Scramble history (365-day cooldown)
        scr = data.get("scramble")
        if scr:
            if scr.get("reference"):
                history["scramble"]["references"].add(scr["reference"])
            scr_ref = scr.get("verseRef") or extract_ref(scr.get("reference", ""))
            if scr_ref:
                history["all_verses"].add(scr_ref)
                # Surah-level cooldown (30 days)
                if fdate >= cutoff_surah:
                    surah_num = scr_ref.split(":")[0]
                    history["scramble"]["surahs"].add(surah_num)
            if scr.get("arabic"):
                history["scramble"]["verses"].add(scr["arabic"])

        # Juz Journey history
        juz = data.get("juz")
        if juz:
            if juz.get("juz_number"):
                history["juz"]["juz_numbers"].add(juz["juz_number"])
            verse = juz.get("verse", {})
            if verse.get("surah_number") and verse.get("ayah_number"):
                ref = f"{verse['surah_number']}:{verse['ayah_number']}"
                history["juz"]["verses"].add(ref)
                # Juz Journey is Ramadan-only and exempt from global cross-game cooldown
                # history["all_verses"].add(ref)

        # Root Hive history (featured-root cooldown; uses no verse refs)
        hive = data.get("roothive")
        if hive and hive.get("featuredRoot") and fdate >= datetime.utcnow() - timedelta(days=ROOT_HIVE_COOLING_DAYS):
            history["roothive"]["roots"].add(hive["featuredRoot"])

    return history


def save_to_history(all_puzzles, date_str):
    """Save all game puzzles to a single history file."""
    os.makedirs(HISTORY_DIR, exist_ok=True)
    with open(os.path.join(HISTORY_DIR, f"{date_str}.json"), "w") as f:
        json.dump(all_puzzles, f, ensure_ascii=False, indent=2)


# ── LLM API (OpenAI + GitHub Models + Gemini) ──────────────────────
MAX_CONTINUATIONS = 3  # Max continuation attempts for truncated JSON


def is_json_truncated(text):
    """Detect if a JSON response appears truncated (incomplete brackets)."""
    cleaned = text.strip()
    # Remove <think> blocks and markdown fences for analysis
    cleaned = re.sub(r'<think>.*?</think>', '', cleaned, flags=re.DOTALL).strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)
    # Count unmatched braces/brackets (ignoring those inside strings)
    depth_brace = 0
    depth_bracket = 0
    in_string = False
    escape = False
    for ch in cleaned:
        if escape:
            escape = False
            continue
        if ch == '\\':
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == '{':
            depth_brace += 1
        elif ch == '}':
            depth_brace -= 1
        elif ch == '[':
            depth_bracket += 1
        elif ch == ']':
            depth_bracket -= 1
    # If we opened more braces/brackets than we closed, it's truncated
    return depth_brace > 0 or depth_bracket > 0



# ── Provider resilience (Oct 2026) ──────────────────────────────────
# Transport failures (connection drops, timeouts, 5xx) and rate limits are
# the flaky part of generation; content failures (bad verses, incoherent
# themes) are not. Two rules keep flakiness from eating the content budget:
#  1. Transport/rate-limit retries happen INSIDE the HTTP layer with
#     exponential backoff, and only a *persistent* failure is reported up.
#  2. A provider that fails twice in a row is marked unhealthy and skipped
#     for the rest of the run, instead of being re-tried every category.

_TRANSPORT_BACKOFF_S = (5, 15, 45)      # per transport attempt, in seconds
_RATE_LIMIT_BACKOFF_S = (30, 60, 120)    # per rate-limit wait, in seconds
_PROVIDER_UNHEALTHY_AFTER = 2            # consecutive failures before skip
_SECOND_PASS_COOLDOWN_S = 300            # wait before a category's 2nd full-chain pass
_MAX_CATEGORY_PASSES = 2                 # full MODEL_CHAIN passes per category, max
_NARROW_PASS_SURAHS = 6                  # surahs advertised on a 2nd pass (vs 20 normally)
_PROVIDER_FAILURES = {}                  # label -> consecutive failure count


def _provider_is_unhealthy(label):
    return _PROVIDER_FAILURES.get(label, 0) >= _PROVIDER_UNHEALTHY_AFTER


def _note_provider_success(label):
    _PROVIDER_FAILURES[label] = 0


def _note_provider_failure(label):
    _PROVIDER_FAILURES[label] = _PROVIDER_FAILURES.get(label, 0) + 1
    if _provider_is_unhealthy(label):
        print(f"  ⚠ {label} marked unhealthy after "
              f"{_PROVIDER_FAILURES[label]} consecutive failures — skipping for the rest of this run")


def _post_with_retries(api_url, headers, payload, timeout, label):
    """POST with transport-level retries.

    Returns the response object, the string "RATE_LIMITED" if the provider
    stayed rate-limited after backoff, or None if transport kept failing.
    Never raises for transport problems.
    """
    for attempt, wait in enumerate([0] + list(_TRANSPORT_BACKOFF_S)):
        if attempt:
            print(f"  ↻ Transport retry {attempt}/3 for {label} after {wait}s backoff...")
            time.sleep(wait)
        try:
            resp = requests.post(api_url, headers=headers, json=payload, timeout=timeout)
        except requests.exceptions.RequestException as e:
            print(f"  ✗ Transport error calling {label}: {e}")
            continue
        if resp.status_code == 429:
            # Log the 429 body once: the provider's error.type names the cause
            # (quota exhaustion vs overload vs tier limit). Previously the body
            # was never printed, so chronic Kimi 429s stayed undiagnosed.
            try:
                _body = resp.json()
                _etype = _body.get("error", {}).get("type") if isinstance(_body, dict) else None
            except Exception:
                _etype = None
            print(f"  ⚠ Rate limited on {label} (error.type={_etype}; body: {resp.text[:300]!r})")
            _retry_after = resp.headers.get("Retry-After") if resp.headers else None
            try:
                _retry_after_s = int(_retry_after) if _retry_after is not None else None
            except (TypeError, ValueError):
                _retry_after_s = None
            if _retry_after_s is not None:
                _waits = [min(_retry_after_s, 300)] + list(_RATE_LIMIT_BACKOFF_S[1:])
            else:
                _waits = list(_RATE_LIMIT_BACKOFF_S)
            for rl_wait in _waits:
                print(f"  ⚠ Rate limited on {label}; waiting {rl_wait}s before retry...")
                time.sleep(rl_wait)
                try:
                    resp = requests.post(api_url, headers=headers, json=payload, timeout=timeout)
                except requests.exceptions.RequestException as e:
                    print(f"  ✗ Transport error during rate-limit retry for {label}: {e}")
                    resp = None
                    break
                if resp.status_code != 429:
                    break
            if resp is None:
                continue  # transport trouble during the rate-limit wait: retry at transport level
            if resp.status_code == 429:
                return "RATE_LIMITED"
            return resp
        if 500 <= resp.status_code < 600:
            print(f"  ✗ Server error (HTTP {resp.status_code}) from {label}")
            continue
        return resp
    return None


def call_model(prompt, model_config, system_msg=None):
    """Call an LLM API and return the response text.

    If the response contains truncated JSON, automatically sends continuation
    requests (up to MAX_CONTINUATIONS) to get the complete output.

    model_config: dict with 'id', 'api' ('openai', 'github', 'gemini', or 'deepseek'), 'label'
    """
    model_id = model_config["id"]
    api_type = model_config["api"]

    # Fix 3: skip a provider already proven flaky this run.
    if _provider_is_unhealthy(model_config["label"]):
        print(f"  ⚠ Skipping {model_config['label']} (marked unhealthy earlier this run)")
        return "SKIP"

    # Select endpoint and auth based on API type
    if api_type == "openai":
        if not OPENAI_API_KEY:
            print(f"  ⚠ OPENAI_API_KEY not set, skipping {model_config['label']}")
            return None
        api_url = OPENAI_API_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}"
        }
    elif api_type == "gemini":
        if not GEMINI_API_KEY:
            print(f"  ⚠ GEMINI_API_KEY not set, skipping {model_config['label']}")
            return None
        api_url = GEMINI_API_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GEMINI_API_KEY}"
        }
    elif api_type == "deepseek":
        if not DEEPSEEK_API_KEY:
            print(f"  ⚠ DEEPSEEK_API_KEY not set, skipping {model_config['label']}")
            return None
        api_url = DEEPSEEK_API_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }
    elif api_type == "minimax_m3":
        if not MINIMAX_API_KEY:
            print(f"  ⚠ MINIMAX_API_KEY not set, skipping {model_config['label']}")
            return None
        api_url = MINIMAX_M3_API_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {MINIMAX_API_KEY}"
        }
    elif api_type == "kimi":
        if not KIMI_API_KEY:
            print(f"  ⚠ KIMI_API_KEY not set, skipping {model_config['label']}")
            return None
        api_url = KIMI_API_URL
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {KIMI_API_KEY}"
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
        system_msg = ("You are a precise data engine for Quranic category generation. "
                      "You always respond with valid JSON only, no markdown.")

    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.6,
        "top_p": 0.95,
    }
    # M3 and DeepSeek are reasoning models — give them a larger token budget so
    # chain-of-thought doesn't crowd out the JSON answer (seen at exactly 16384 out).
    # M3 gets MiniMax's recommended 131072: on the tricky Connections category it
    # burned the whole 32768 budget in reasoning and returned empty content
    # (29 Oct 2026, 4 attempts). Thinking tokens count toward max_tokens.
    if api_type == "minimax_m3":
        payload["max_tokens"] = 131072
    elif api_type == "deepseek":
        payload["max_tokens"] = 32768
    else:
        payload["max_tokens"] = 16384

    # response_format JSON mode — not all models support it; Kimi K3 returns 400 with it
    if model_id.lower().startswith("gpt-") or api_type in ("deepseek", "gemini", "minimax_m3"):
        payload["response_format"] = {"type": "json_object"}

    # Reasoning models need more wall-clock time; Kimi K3 is also a reasoning model.
    # M3 gets 900s: a 131072-token budget cannot complete inside 300s at typical
    # throughput, and a timeout would burn the attempt the same way an empty
    # answer does.
    if api_type == "minimax_m3":
        request_timeout = 900
    elif api_type == "kimi":
        request_timeout = 300
    else:
        request_timeout = 180
    try:
        # Fix 2: transport/rate-limit retries live inside the HTTP layer, so
        # a dropped connection or a 429 no longer burns a content retry.
        resp = _post_with_retries(api_url, headers, payload, request_timeout, model_config["label"])
        if resp is None:
            _note_provider_failure(model_config["label"])
            print(f"  ✗ Transport failed for {model_config['label']} after retries")
            return None
        if resp == "RATE_LIMITED":
            _note_provider_failure(model_config["label"])
            return "RATE_LIMITED"
        if resp.status_code == 401:
            print(f"  ✗ Authentication failed for {model_config['label']}")
            return None
        if resp.status_code == 400:
            print(f"  ✗ Bad request for {model_config['label']}: {resp.text[:400]}")
            return None

        resp.raise_for_status()
        try:
            data = resp.json()
        except ValueError as je:
            # Non-JSON body (e.g. proxy HTML error page) — retrying won't help
            print(f"  ✗ Non-JSON response from {model_config['label']}: {je}")
            print(f"    Body: {resp.text[:200]!r}")
            return "SKIP"
        try:
            msg = data["choices"][0]["message"]
        except (KeyError, IndexError, TypeError) as ke:
            # Malformed payload (no 'choices' key, empty list, or wrong shape).
            # Retrying with the same model is pointless — surface the raw body
            # so we can diagnose, then skip to the next model in the chain.
            print(f"  ✗ Malformed response from {model_config['label']}: {ke}")
            print(f"    Keys present: {list(data.keys()) if isinstance(data, dict) else type(data).__name__}")
            print(f"    Body: {json.dumps(data)[:300] if isinstance(data, (dict, list)) else str(data)[:300]}")
            return "SKIP"
        # Reasoning models (M3, Kimi K3) may put the answer in reasoning_content
        # and leave content empty when the thinking budget is exhausted.
        text = msg.get("content") or msg.get("reasoning_content", "")
        usage = data.get("usage", {})
        print(f"  Tokens: {usage.get('prompt_tokens', '?')} in, "
              f"{usage.get('completion_tokens', '?')} out, "
              f"{usage.get('total_tokens', '?')} total")

        # Check for truncated JSON and attempt continuation
        if is_json_truncated(text):
            print(f"  ⚠ Truncated JSON detected, attempting continuation...")
            accumulated = text
            for cont in range(1, MAX_CONTINUATIONS + 1):
                print(f"  → Continuation {cont}/{MAX_CONTINUATIONS}...")
                cont_payload = {
                    "model": model_id,
                    "messages": [
                        {"role": "system", "content": system_msg},
                        {"role": "user", "content": prompt},
                        {"role": "assistant", "content": accumulated},
                        {"role": "user", "content": "Your JSON response was cut off. Continue EXACTLY from where you stopped. Output ONLY the remaining JSON, no repetition, no explanation."}
                    ],
                    "temperature": 0.3,
                    "top_p": 0.95,
                }
                if api_type == "minimax_m3":
                    cont_payload["max_tokens"] = 131072
                elif api_type == "deepseek":
                    cont_payload["max_tokens"] = 32768
                else:
                    cont_payload["max_tokens"] = 16384
                try:
                    cont_resp = requests.post(api_url, headers=headers, json=cont_payload, timeout=request_timeout)
                    if cont_resp.status_code != 200:
                        print(f"  ✗ Continuation failed (HTTP {cont_resp.status_code})")
                        break
                    cont_data = cont_resp.json()
                    cont_text = cont_data["choices"][0]["message"]["content"]
                    cont_usage = cont_data.get("usage", {})
                    print(f"  Continuation tokens: {cont_usage.get('completion_tokens', '?')} out")

                    # Clean up continuation text (often models prepend ```json again or add a leading space)
                    cleaned_cont = cont_text.strip()
                    if cleaned_cont.startswith("```"):
                        cleaned_cont = re.sub(r'^```(?:json)?\s*', '', cleaned_cont)

                    accumulated += cleaned_cont
                    if not is_json_truncated(accumulated):
                        print(f"  ✓ JSON completed after {cont} continuation(s)")
                        _note_provider_success(model_config["label"])
                        return accumulated
                except Exception as ce:
                    print(f"  ✗ Continuation error: {ce}")
                    break
            # Return whatever we accumulated even if still truncated
            print(f"  ⚠ Returning accumulated response ({len(accumulated)} chars)")
            _note_provider_success(model_config["label"])
            return accumulated

        _note_provider_success(model_config["label"])
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
    """Parse JSON from model response, handling <think> tags, markdown fences,
    and common LLM JSON formatting issues (trailing commas, unescaped chars)."""
    cleaned = raw.strip()
    # Remove <think> blocks (DeepSeek reasoning)
    cleaned = re.sub(r'<think>.*?</think>', '', cleaned, flags=re.DOTALL).strip()
    # Remove markdown code fences
    if cleaned.startswith("```"):
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)
    # Extract the outermost JSON object
    json_match = re.search(r'\{[\s\S]*\}', cleaned)
    if json_match:
        cleaned = json_match.group(0)

    # Try parsing as-is first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Fix 1: Remove trailing commas before } or ]
    fixed = re.sub(r',\s*([}\]])', r'\1', cleaned)
    try:
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # Fix 2: Try to fix unescaped newlines inside string values
    fixed2 = re.sub(r'(?<!\\)\n(?=(?:[^"]*"[^"]*")*[^"]*"[^"]*$)', r'\\n', fixed)
    try:
        return json.loads(fixed2)
    except json.JSONDecodeError:
        pass

    # Fix 3: Extract array if the top-level is an array (some models wrap in [])
    arr_match = re.search(r'\[[\s\S]*\]', cleaned)
    if arr_match:
        try:
            arr = json.loads(arr_match.group(0))
            if isinstance(arr, list) and len(arr) > 0 and isinstance(arr[0], dict):
                return arr[0]
        except json.JSONDecodeError:
            pass

    # Last resort: raise the original error for logging
    return json.loads(cleaned)


# ═══════════════════════════════════════════════════════════════════
# CONNECTIONS GENERATOR - category-by-category
# ═══════════════════════════════════════════════════════════════════
DIFFICULTY_LABELS = ["easy", "medium", "hard", "tricky"]
DIFFICULTY_DESCRIPTIONS = {
    "easy":   "Straightforward - a clear, well-known connection that most players will find",
    "medium": "Requires some Quranic knowledge to identify the connection",
    "hard":   "Requires deeper Islamic knowledge; the link is specific or scholarly",
    "tricky": "Deliberately misleading - items seem to belong elsewhere; the connection is unexpected",
}


def _narrow_offered_ranges(offered, count):
    """Evenly-spaced deterministic subset of the ranked offered ranges.

    A 2nd pass advertises only a handful of passages instead of the full
    ~20-surah allowlist: fewer, concrete options are harder for a model to
    skim past on its way back to famous verses from memory. The validator
    accepts any ref in the FULL offered set, so narrowing is guidance only
    — a model that picks another free range still passes validation.
    """
    items = list(offered.items())
    if len(items) <= count:
        return dict(items)
    stride = len(items) / count
    return dict(items[int(i * stride)] for i in range(count))


def build_single_category_prompt(history, today, cat_index, accumulated_cats, previous_violations=None, force_pivot=False, narrow_pass=False):
    """Build prompt for ONE Connections category (cat_index 0-3)."""
    color = COLORS[cat_index]
    difficulty = DIFFICULTY_LABELS[cat_index]

    # Avoidance: history + already-generated categories
    # Use same verse set as validation (connections + all cross-game refs).
    avoided_themes_set = set(history["connections"]["themes"])
    all_avoided_verses = history["connections"]["verses"] | history["all_verses"]
    # Only pass current-puzzle words in the prompt — 806-word history list bloats the prompt
    # to 12k+ tokens (causes MiniMax timeouts). Validation still enforces historical root overlap.
    all_prev_words = []

    for prev_cat in accumulated_cats:
        theme = prev_cat.get("nameEn", "").lower().strip()
        avoided_themes_set.add(theme)
        cat_ref = prev_cat.get("verse", {}).get("ref")
        if cat_ref:
            all_avoided_verses.add(cat_ref)
        for item in prev_cat.get("items", []):
            if item.get("ref"):
                all_avoided_verses.add(item["ref"])
            if item.get("ar"):
                all_prev_words.append(item["ar"])

    # Only actively-cooled themes are worth forbidding. load_history() already
    # limits history["connections"]["themes"] to the theme-cooldown window;
    # that set can still reach ~120 names (~5.7k chars), which is more list
    # than a model will attend to. Cap it and always keep this run's picks,
    # which are the ones a repeat would actually be visible to a player.
    this_run_themes = {
        pc.get("nameEn", "").lower().strip() for pc in accumulated_cats
    } - {""}
    cooled = set(history["connections"]["themes"])
    kept = sorted(this_run_themes) + sorted(cooled - this_run_themes)
    avoided_themes = ", ".join(kept[:30]) or "(none)"

    # ── Cooldown constraint: POSITIVE allowlist, not a negative blocklist ──
    # Listing every forbidden ref cost ~5,600 tokens and the model ignored
    # it, then kept re-picking the famous verses it had memorised
    # (2:255, 7:176, 72:1), burning 11-13 retries per category.
    # Offering the surahs/ayah-ranges that are still free is ~90 tokens
    # and gives the model something it can actually act on.
    from surah_ranges import offered_ranges, format_allowed_ranges
    blocked_refs = history["connections"]["verses"] | history["all_verses"]
    for prev_cat in accumulated_cats:
        cr = prev_cat.get("verse", {}).get("ref")
        if cr:
            blocked_refs.add(cr)
        for item in prev_cat.get("items", []):
            if item.get("ref"):
                blocked_refs.add(item["ref"])
    # offered_ranges is the SINGLE source of truth: the prompt renders these
    # ranges and the validator accepts refs from exactly these ranges, so the
    # model is never offered a neighbourhood it is then punished for using.
    offered = offered_ranges(blocked_refs)
    if narrow_pass:
        allowed_ranges = format_allowed_ranges(
            _narrow_offered_ranges(offered, _NARROW_PASS_SURAHS)
        )
    else:
        allowed_ranges = format_allowed_ranges(offered)
    # NOTE: the previous implementation built a comma-joined list of every
    # blocked ref (~22k chars / ~5.6k tokens) and interpolated it into
    # RULES below. That single line was 98% of the prompt and the model
    # did not comply with it. We now pass `allowed_ranges` instead.

    # Summary of categories already chosen in this puzzle run
    chosen_block = ""
    if accumulated_cats:
        lines = []
        for i, prev_cat in enumerate(accumulated_cats):
            words_list = [item.get("ar", "") for item in prev_cat.get("items", [])]
            refs_list  = [item.get("ref", "") for item in prev_cat.get("items", [])]
            roots_list = [r for r in get_roots_for_prompt(words_list) if r]
            prev_items = prev_cat.get("items", [])
            dom_field, dom_count = _get_dominant_field(prev_items)
            dom_str = f" (dominant field: {dom_field})" if dom_field else ""
            lines.append(
                f"  Category {i+1} ({COLORS[i]}, {DIFFICULTY_LABELS[i]}): \"{prev_cat.get('nameEn')}\"{dom_str}\n"
                f"    Words : {', '.join(words_list)}\n"
                f"    Roots : {', '.join(roots_list)}\n"
                f"    Refs  : {', '.join(refs_list)}"
            )
        chosen_block = (
            "\n\nALREADY CHOSEN CATEGORIES (do NOT reuse their refs, themes, or word roots):\n"
            + "\n\n".join(lines)
            + "\n\nDo NOT pick a theme whose items overlap in dominant semantic field with any previous category."
            + "\nCRITICAL: Your 4 Arabic words must NOT share roots with ANY of the roots listed above."
        )

        # Grammar cap (issue #238): if this puzzle's one grammatical slot is
        # already taken, say so where the model reads the chosen list.
        _gram_prev = [pc for pc in accumulated_cats if is_grammatical_category(pc)]
        if _gram_prev:
            chosen_block += (
                "\n\n⚠ GRAMMAR LIMIT ALREADY USED: "
                f"\"{_gram_prev[0].get('nameEn')}\" is this puzzle's ONE allowed "
                "grammatical category. Your category MUST be thematic (what the "
                "words are, mean, or do) — NOT a grammar or morphology pattern "
                "(no verb forms, participles, plurals, tense/person forms, or "
                "wazn patterns). A grammatical category will be rejected."
            )

    violation_block = ""
    if previous_violations:
        verse_mismatches = [v for v in previous_violations if "NOT found in verse" in v]
        other_violations = [v for v in previous_violations if "NOT found in verse" not in v]
        parts = []
        if other_violations:
            parts.append(
                "PREVIOUS ATTEMPT REUSED THESE (FORBIDDEN):\n"
                + "\n".join("  ✗ " + v for v in other_violations)
                + "\nYou MUST NOT repeat these. Choose completely different verses and themes."
            )
        if verse_mismatches:
            parts.append(
                "CRITICAL - VERIFIED FALSEHOODS (DO NOT USE):\n"
                + "\n".join("  ✗ " + v for v in verse_mismatches)
                + "\nThe word-verse pairs listed above were checked against the Quran database and found to be WRONG. "
                "Do NOT guess or attempt to use them again. Choose NEW words from NEW verses."
            )
        violation_block = "\n\n" + "\n\n".join(parts)

    pivot_block = ""
    if force_pivot:
        pivot_block = (
            "\n\nCRITICAL: Your previous attempts were rejected multiple times. "
            "ABANDON YOUR CURRENT THEME AND VERSES. Choose a COMPLETELY DIFFERENT theme and different words."
        )

    narrow_block = ""
    if narrow_pass:
        narrow_block = (
            "\n\nNARROWED SCOPE FOR THIS ATTEMPT: previous attempts kept reusing "
            "verses from memory instead of the passages above. For THIS attempt, "
            "use ONLY the passages listed in rule 4 — pick your 4 words from "
            "those passages and nowhere else. Do not fall back to famous verses "
            "you remember."
        )

    return f"""You are a precise data engine for Quranic category generation.

DATE: {today}
TASK: Generate Category {cat_index + 1} of 4 (Color: {color}, Difficulty: {difficulty}).
Difficulty guidance: {DIFFICULTY_DESCRIPTIONS[difficulty]}

WHAT IS AYAH CONNECTIONS:
16 Arabic words (4 categories of 4) from real Quranic verses.
The player sees ONLY the 16 Arabic words and their English meanings,
shuffled. They never see the verses, refs, or surah names while playing.
A category is therefore valid ONLY if the connection between its 4 words
is visible from the words and meanings themselves. A shared verse,
passage, surah, or story setting is NOT a connection — the player cannot
see it. (Fixes #235.)
Rule: Each word MUST physically exist in the Uthmani script of the cited verse.

VERIFICATION STEP (INTERNAL ONLY):
1. Select a PATTERN first: one property the 4 words themselves share
   (what they are, mean, or do) that a knowledgeable player could state
   in one sentence without seeing any verse.
2. Verify each of the 4 words exists in its cited verse.
3. SOLVABILITY TEST: hide the refs and verse text. Read only the 4 words,
   their English meanings, and the theme name. If you could not group
   these 4 words and name the pattern from that alone, DISCARD the
   category and start again with a different pattern.
4. Avoid root overlap with already-used Arabic words: {', '.join(all_prev_words) if all_prev_words else 'None'}.
   Exception: same-root words ARE allowed if their English meanings are clearly distinct
   (e.g. كِتَاب "book" vs كَتَبَ "to write" — different meanings, same root, allowed).
5. If using <think> tags, show your internal verse verification.

RULES:
1. Provide EXACTLY 4 items. {pivot_block}
2. Theme (nameEn) MUST state the pattern itself, specifically
   (e.g., "Birds mentioned in the Qur'an", "Things Allah swears by",
   "Angels named in the Qur'an"). It must NOT name a surah, juz, or
   passage, and must NOT be an empty container: no "Aspects of…",
   "Elements of…", "Dialogue of…", "Words from/in…", or "… in Surah X".
   Those describe WHERE words appear, not a pattern between them,
   and categories named that way will be rejected.
   FORBIDDEN themes (used recently - do NOT reuse): {avoided_themes}
3. CRITICAL: Every word must actually appear in its cited verse. No guessing.
4. CHOOSE YOUR 4 REFS FROM THESE AVAILABLE PASSAGES (already filtered to exclude
   everything on cooldown — verses outside this list will be rejected):
   {allowed_ranges}
   Spread the 4 refs across DIFFERENT passages that exhibit your pattern.
   A category whose 4 words all come from one short passage (same surah,
   within 20 ayahs) will be rejected: its only link is the passage.
5. Words must not share roots with each other or previous categories.
6. GRAMMAR LIMIT: At most ONE of this puzzle's 4 categories may be
   grammatical — a pattern of Arabic grammar or morphology (verb tense
   or person forms, participles, plural/dual forms, derived verb forms,
   wazn patterns such as فاعل or مفعول, pronoun suffixes). Grammatical
   categories are the hardest in the game: most players have no formal
   Arabic grammar training and cannot see the pattern from the words
   alone. Prefer THEMATIC patterns — what the words are, mean, or do.

{narrow_block}{chosen_block}{violation_block}

OUTPUT FORMAT: Return ONLY a valid JSON object for this single category (if not using <think> tags):
{{
  "name": "Arabic category name with tashkeel",
  "nameEn": "English category name (specific!)",
  "color": "{color}",
  "items": [
    {{"ar": "Arabic word with tashkeel", "en": "English meaning", "ref": "surah:ayah"}},
    {{"ar": "Arabic word with tashkeel", "en": "English meaning", "ref": "surah:ayah"}},
    {{"ar": "Arabic word with tashkeel", "en": "English meaning", "ref": "surah:ayah"}},
    {{"ar": "Arabic word with tashkeel", "en": "English meaning", "ref": "surah:ayah"}}
  ]
}}

IMPORTANT:
- Return the JSON object - no markdown (except code fences), no extra text outside JSON or <think> tags.
- Arabic words must include full tashkeel/diacritics."""


def build_connections_prompt(history, previous_violations=None):
    """Backwards-compatible wrapper: build a prompt for category 0 with no accumulated categories."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    return build_single_category_prompt(
        history, today, cat_index=0, accumulated_cats=[], previous_violations=previous_violations
    )

# ── Semantic field networks ────────────────────────────────────────
# Each field is a cluster of related concepts. Items in the same field
# share a coherent Quranic theme even if they use different words.
# The LLM picks 4 words from verses, finds a common theme among them,
# and this check verifies that theme actually fits the words.
SEMANTIC_FIELDS = {
    'paradise': {
        'keywords': [
            'paradise', 'heaven', 'jannah', 'gardens', 'garden', 'eternal', 'eternity',
            'bliss', 'reward', 'everlasting', 'lasting', 'forever', 'immortal',
            'mercy', 'comfort', 'peace', 'light', 'fruit', 'shade',
            'rivers', 'river', 'wine', 'honey', 'silk', 'golden', 'crystal',
            'palace', 'throne', 'crown', 'servant', 'mate', 'companion',
            'أجر', 'جنة', 'فردوس', 'نعي', 'خالد', 'باق', 'دائم', 'خلود',
            'جَنَّات', 'نَعِيم', 'رَحْمَة', 'غُرْفة', 'حَوْض', 'كَأْس', 'عَسَل',
            # Common items mentioned in paradise descriptions
            'eden', 'refuge', 'delight', 'fruits', 'flesh', 'fair', 'pearls',
            'success', 'well-matched', 'cup', 'gift', 'blessings', 'happiness',
            'reward', 'young', 'boys', 'immortal', 'youth', 'متع', 'نعيم',
        ],
    },
    'hell': {
        'keywords': [
            'hell', 'fire', 'torment', 'chastisement', 'punishment', 'chains',
            'shackles', 'boiling', 'scalding', 'smoke', 'burn', 'fuel',
            'عذاب', 'نار', 'جهنم', 'عقوبة', 'قيد', 'حَدِيد',
            'حر', 'سموم', 'غسلين', 'زقوم', 'حميم', 'غساق',
        ],
    },
    'divine': {
        'keywords': [
            'god', 'lord', 'almighty', 'deity', 'divine', 'creator',
            'merciful', 'compassion', 'gracious', 'forgiving', 'generous',
            'wise', 'knowing', 'all-seeing', 'all-hearing', 'mighty',
            'رحم', 'غفر', 'عفو', 'لطف', 'كرم', 'غفور', 'رحيم',
            'حكيم', 'عليم', 'سميع', 'بصير', 'عزيز', 'قوي',
        ],
    },
    'prayer': {
        'keywords': [
            'prayer', 'pray', 'worship', 'prostrate', 'bow', 'kneel', 'sujud',
            'صلو', 'سجد', 'ركع', 'عبادة', 'حمد', 'سبح', 'دعاء', 'تضرع',
            'praise', 'glorify', 'thank', 'remember', 'ذكرو', 'استغفار',
        ],
    },
    'trial': {
        'keywords': [
            'trial', 'test', 'prove', 'examine', 'challenge', 'hardship',
            'affliction', 'suffering', 'patience', 'perseverance',
            'امتح', 'ختبر', 'بلا', 'فتن', 'عسرة', 'ضراء', 'بلاء',
            'صبر', 'ابتلاء', 'مصيبة', 'رزق', 'فقر',
        ],
    },
    'guidance': {
        'keywords': [
            'guidance', 'guide', 'straight', 'path', 'way', 'هُدًى', 'اهتد',
            'سبيل', 'صراط', 'نور', 'ضياء', 'آية', 'دليل', 'برهان',
            'تذكير', 'موعظة', 'understand', 'know', 'realize', 'learn',
            'علم', 'عرف', 'فهم', 'اعتبر', 'اتعظ',
        ],
    },
    'creation': {
        'keywords': [
            'create', 'creation', 'make', 'form', 'shape', 'design',
            'خالق', 'صور', 'خلق', 'كون', 'صنع',
            'earth', 'sky', 'heaven', 'sun', 'moon', 'star', 'mountain',
            'أرض', 'سماء', 'شمس', 'قمر', 'نجم', 'جبل', 'بحر',
            'vegetation', 'plant', 'rain', 'water', 'life', 'نبات', 'ماء', 'مطر',
            # Celestial/cosmic creation themes
            'night', 'day', 'pair', 'pairs', 'jinn', 'celestial', 'astronomical',
        ],
    },
    'revelation': {
        'keywords': [
            'revelation', 'reveal', 'send', 'scripture', 'book', 'quran',
            'torah', 'psalms', 'gospel', 'أنزل', 'كشف', 'رسل', 'كتب',
            'قرآن', 'توراة', 'زبور', 'انجيل',
            'messenger', 'prophet', 'apostle', 'warn',
            'رسول', 'نبي', 'مرسل', 'أنذر', 'بلّغ',
        ],
    },
    'mercy': {
        'keywords': [
            'mercy', 'merciful', 'compassion', 'forgive', 'pardon', 'gracious',
            'رحم', 'غفر', 'عفو', 'لطف', 'كرم', 'غفور', 'رحيم',
            'راض', 'رضوان', 'محبة', 'إنعام',
        ],
    },
    'earth': {
        'keywords': [
            'earth', 'land', 'ground', 'soil', 'dust', 'mountain',
            'valley', 'plain', 'desert', 'island', 'city',
            'أرض', 'تراب', 'طين', 'جبل', 'واد', 'صحراء', 'بلدة',
            'settle', 'dwell', 'habitat', 'foundation', 'استقر', 'سكن', 'ملك',
        ],
    },
    'water': {
        'keywords': [
            'water', 'rain', 'sea', 'river', 'ocean', 'wave', 'foam',
            'ماء', 'مطر', 'بحر', 'نهر', 'محيط', 'موج', 'زبد',
            'life', 'living', 'drink', 'thirst', 'quench', 'حياة', 'عطش', 'ري',
        ],
    },
    'food': {
        'keywords': [
            'food', 'eat', 'drink', 'fruit', 'meat', 'bread', 'grain',
            'date', 'honey', 'milk', 'طعام', 'أكل', 'شرب', 'فاكهة',
            'لحم', 'خبز', 'تمر', 'عسل', 'حليب',
        ],
    },
    'signs': {
        'keywords': [
            'sign', 'signs', 'proof', 'evidence', 'wonder', 'creation',
            'آية', 'دليل', 'برهان', 'علامة', 'حجة', 'عجب', 'عظمة', 'تمجيد',
        ],
    },
    'light': {
        'keywords': [
            'light', 'illumination', 'radiance', 'gleam', 'shining',
            'نور', 'ضياء', 'بدع', 'إشراق', 'مشع', 'ضيء',
            'guidance', 'proof', 'clear', 'manifest',
        ],
    },
    'heart': {
        'keywords': [
            'heart', 'hearts', 'soul', 'spirit', 'chest', 'breast',
            'قلب', 'صدور', 'نفس', 'روح', 'ضمير',
            'firm', 'steadfast', 'certain', 'submit',
            '确信', 'يَقِين', 'خشي', 'أناب',
        ],
    },
    'authority': {
        'keywords': [
            'kingdom', 'kingship', 'rule', 'reign', 'sovereignty',
            'ملك', 'ملَك', 'سلطان', 'حكم', 'تصرف',
            'king', 'ruler', 'master', 'lord', 'ملك', 'سلطان',
            'submission', 'servant', 'slave', 'عبادة', 'عبد',
        ],
    },
    'time': {
        'keywords': [
            'time', 'moment', 'period', 'hour', 'day', 'night',
            'زمان', 'وقت', 'أوان', 'ساعة', 'يوم', 'ليلة',
            'last', 'later', 'after', 'before', 'beginning', 'end',
            'أول', 'آخر', 'قبل', 'بعد', 'منتصف',
        ],
    },
    'speech': {
        'keywords': [
            'say', 'speak', 'call', 'command', 'promise', 'reveal',
            'قال', 'كلم', 'حمد', 'دعا', 'أمر', 'نهي', 'وعد', 'هدد',
            'order', 'forbid', 'permit', 'allow',
            'أمر', 'نهي', 'أحل', 'حرم',
        ],
    },
    'journey': {
        'keywords': [
            'travel', 'journey', 'depart', 'arrive', 'departure', 'arrival',
            'سفر', 'رحيل', 'قدوم', 'المسير', 'رحبة',
            'move', 'go', 'come', 'enter', 'exit',
            'ذهب', 'جاء', 'دخل', 'خرج', 'انتقل',
        ],
    },
    # New fields added for #227 (off-theme items under a fancy name like
    # "Worldly Luxuries and Provisions in Surah Az-Zukhruf"). Each new
    # field has a tight, audit-able keyword set focused on the most common
    # recurring theme patterns in the last 90 days of history.
    'luxury': {
        'keywords': [
            'luxury', 'luxuries', 'gold', 'silver', 'ornament', 'ornaments',
            'adornment', 'splendor', 'treasure', 'riches', 'comfort', 'delicacy',
            'delicacies', 'pleasure', 'abundance', 'provision', 'provisions',
            'livelihood', 'blessing', 'blessings', 'delight', 'delights',
            'fine', 'silk', 'crystal', 'pearl', 'متع', 'ترف', 'رخاء', 'نعيم',
            'بركة', 'خيرات', 'أرزاق', 'ذهب', 'فضة', 'زينة', 'زخرف', 'حلية',
        ],
    },
    'legal_term': {
        'keywords': [
            'legal', 'judicial', 'oath', 'oaths', 'bequest', 'wills', 'will',
            'inheritance', 'inherit', 'witness', 'testimony', 'judge', 'ruling',
            'verdict', 'contract', 'covenant', 'pledge', 'decree', 'law',
            'retribution', 'قضاء', 'قسم', 'أيمان', 'وصية', 'ميراث', 'ورث',
            'شهادة', 'شاهد', 'حكم', 'عقد', 'عهد', 'ميثاق', 'فريضة', 'حد',
        ],
    },
    'prophet_story': {
        'keywords': [
            'moses', 'abraham', 'noah', 'muhammad', 'jesus', 'david', 'solomon',
            'job', 'joseph', 'aaron', 'hud', 'salih', 'ishaq', 'ismail', 'yaqub',
            'lut', 'shuayb', 'idris', 'ilyas', 'al-yasa', 'jonah', 'zulkifl',
            'dhul-qarnayn', 'thamud', 'elephant', 'musa', 'ibrahim', 'ayyub',
            'yusuf', 'aaron', 'prophet', 'prophets', 'messenger', 'apostle',
            'نبي', 'أنبياء', 'رسول', 'رسل', 'موسى', 'إبراهيم', 'نوح', 'محمد',
            'عيسى', 'داود', 'سليمان', 'أيوب', 'يوسف', 'هارون', 'هود', 'صالح',
            'إسحاق', 'إسماعيل', 'يعقوب', 'لوط', 'شعيب', 'إدريس', 'يونس',
        ],
    },
    'family_relation': {
        'keywords': [
            'father', 'mother', 'son', 'sons', 'daughter', 'daughters', 'brother',
            'brothers', 'sister', 'sisters', 'wife', 'wives', 'husband',
            'husbands', 'parent', 'parents', 'child', 'children', 'offspring',
            'descendant', 'kin', 'family', 'spouse', 'spouses', 'مربية', 'أب',
            'أم', 'ابن', 'بنت', 'أخ', 'أخت', 'زوج', 'زوجة', 'والد', 'والدة',
            'طفل', 'ولد', 'ذرية', 'نسل', 'عشيرة', 'قبيلة', 'أهل', 'عائلة',
        ],
    },
    'place': {
        'keywords': [
            'land', 'lands', 'earth', 'city', 'cities', 'town', 'towns',
            'village', 'region', 'country', 'mountain', 'valley', 'river',
            'sea', 'seas', 'ocean', 'desert', 'garden', 'gardens', 'house',
            'houses', 'home', 'place', 'places', 'location', 'mosque', 'temple',
            'kaaba', 'mecca', 'medina', 'egypt', 'sinai', 'sham', 'arabs',
            'أرض', 'بلد', 'مدينة', 'قرية', 'جبل', 'واد', 'نهر', 'بحر',
            'صحراء', 'بستان', 'بيت', 'منزل', 'مسجد', 'حرم', 'كعبة', 'مكة',
            'مصر', 'طور', 'سينا', 'شام', 'يمن', 'مكان', 'بقعة',
        ],
    },
    'thing_noble': {
        'keywords': [
            'noble', 'honorable', 'honored', 'praiseworthy', 'righteous',
            'good', 'best', 'excellent', 'virtuous', 'pure', 'clean', 'lofty',
            'high', 'great', 'sublime', 'glorious', 'exalted', 'sacred',
            'believer', 'believers', 'servants', 'pious', 'hypocrites',
            'مؤمن', 'مؤمنون', 'صالح', 'صالحين', 'صالحون', 'عابد', 'عابدون',
            'بار', 'أبرار', 'تقي', 'أتقيا', 'منافق', 'منافقون', 'فاسق',
            'فاسقون', 'كريم', 'أكرم', 'عظيم', 'مجيد', 'كريم',
            # Behavioral qualities of believers (Surah Al-Mu'minun style)
            'purification', 'modesty', 'trusts', 'prayers', 'prayer',
            'pray', 'obey', 'turn', 'fear', 'liars', 'deceive', 'deceit',
            'disease', 'diseases', 'hypocrite', 'متّق', 'صادق', 'أمين',
            # Things demanded of the disbelievers
            'parchment', 'spring', 'garden', 'ornament', 'provisions',
        ],
    },
    'thing_clear': {
        'keywords': [
            'clear', 'clearly', 'evident', 'manifest', 'mubin', 'mubīn',
            'bayyinah', 'explicit', 'apparent', 'obvious', 'visible', 'plain',
            'واضح', 'واضحة', 'بيّن', 'بينة', 'جلي', 'جليّ', 'ظاهر', 'ظاهرة',
            'بين', 'مبين', 'صريح', 'جلي',
        ],
    },
    'quranic_term': {
        'keywords': [
            'revelation', 'reveal', 'scripture', 'scriptures', 'book', 'quran',
            'recitation', 'ayah', 'reminder', 'torah', 'psalms', 'gospel',
            'furkan', 'dhikr', 'wisdom', 'guidance', 'verse', 'verses',
            'surah', 'told', 'sent down', 'inspired', 'enjoin', 'commandment',
            'وحي', 'كتاب', 'كتب', 'قرآن', 'تلاوة', 'آية', 'تذكير',
            'توراة', 'زبور', 'إنجيل', 'فرقان', 'ذكر', 'حكمة', 'هدى',
            'آيات', 'سورة', 'تنزيل', 'إلهام', 'أمر', 'وصية',
        ],
    },
}


# Theme-name → field triggers. When a Connections theme name contains any
# of these trigger phrases, we require the items to actually match that
# field's keyword set (≥3 of 4 items). Built from analysis of the last
# 90 days of generated puzzles: 99% of category themes map to one of
# these fields, so the validator can actively enforce coherence instead
# of relying on the model's accuracy. Fixes #227 ("Worldly Luxuries and
# Provisions in Surah Az-Zukhruf" with off-theme items like "two towns"
# and "doors").
#
# Important: triggers target the HEAD NOUN of the theme, not the meta
# structure. "Quranic Terms for Sin" → field is "sin", not "quranic terms".
# Meta-categories like "words", "terms", "vocabulary", "names" are NOT
# triggers — they're handled by the surah-coherence check (#228).
THEME_FIELD_TRIGGERS = {
    'luxury': [
        'luxury', 'luxuries', 'worldly luxury', 'worldly luxuries',
        'ornament', 'ornaments', 'gold', 'silver', 'splendor', 'riches',
        'delicacy', 'delicacies', 'fine things',
    ],
    'punishment': [
        'punishment', 'torment', 'hellfire', 'scalding', 'boiling',
        'chastisement', 'instruments of punishment', 'instruments of divine punishment',
        'denier', 'deniers', 'denying', 'sinners', 'evildoers',
        'elements of the sinners', 'elements of the deniers',
    ],
    'legal_term': [
        'legal', 'judicial', 'oath', 'oaths', 'bequest', 'wills', 'wills',
        'inheritance', 'inherit', 'witness', 'testimony', 'judge', 'ruling',
        'verdict', 'contract', 'covenant', 'pledge', 'decree', 'retribution',
    ],
    'prophet_story': [
        'story of', 'miracles of prophet', 'miracles of',
        'prophet musa', 'prophet ibrahim', 'prophet noah', 'prophet david',
        'prophet solomon', 'prophet joseph', 'prophet ayyub',
        'people of the ditch', 'people of the elephant', 'people of thamud',
        'prophets who received', 'prophets addressed',
    ],
    'paradise': [
        'paradise', 'gardens of paradise', 'epithets of the gardens',
        'jannah', 'eden', 'companions of the right', 'those of the right',
        'delights of the companions', 'rewards of the',
    ],
    'hell': [
        'hellfire', 'hell', 'jahannam', 'names of the hellfire', 'abyss',
    ],
    'divine': [
        'names of allah', 'beautiful names', 'divine names', 'attributes of allah',
        'names related to mercy', 'names related to power', 'names related to knowledge',
        'names of might', 'four divine names', 'epithets of allah',
    ],
    'quranic_term': [
        # Only triggers when the field IS the Quran/scripture itself, not
        # when the Quran is just the source of vocabulary about something else.
        'names of the revealed scriptures', 'revealed scriptures',
        'names of the revealed', 'revelation', 'scripture', 'scriptures',
        'quranic sources of light',
    ],
    'creation': [
        'celestial objects', 'celestial', 'astronomical', 'mountains',
        'rivers', 'seas', 'oceans', 'natural landscape', 'landscape features',
        'created in pairs', 'paired creations', 'pairs',
        'classical elements', 'four elements', 'elements of nature',
        'four classical elements', 'pairs of', 'natural landscape features',
    ],
    'family_relation': [
        'family', 'family members', 'father', 'mother', 'son', 'daughter',
        'brother', 'sister', 'wife', 'wives', 'husband', 'parent', 'child',
        'children', 'offspring', 'kin', 'spouse',
    ],
    'time': [
        'times of day', 'morning', 'evening', 'noon', 'night',
        'day', 'dawn', 'sunrise', 'sunset', 'midday', 'twilight', 'hour',
        'stages of the afterlife', 'stages of human creation', 'stages of',
        'hereafter', 'afterlife', 'resurrection',
        'day of judgment', 'day of resurrection', 'day of reckoning',
        'origination', 'means of restraint',
    ],
    'place': [
        'lands', 'cities', 'towns', 'villages', 'regions', 'countries',
        'mountains', 'valleys', 'rivers', 'seas', 'deserts', 'places',
        'locations', 'lands of', 'natural landscape',
    ],
    'number': [
        'numbers', 'one to', 'two to', 'three to', 'four to', 'first to',
        'dual', 'pair', 'pairs', 'twice', 'thrice', 'indefinite accusative',
        'accusative nouns', 'plural active participles', 'plural', 'participles',
    ],
    'action': [
        'actions of', 'commands to', 'imperative', 'proclaims', 'demands of',
        'demands to', 'weighing of', 'weighing', 'sealed organs', 'sealed',
        'organs of', 'prostrates to', 'what prostrates', 'demands', 'challenged',
        'challenged to', 'sent down', 'descended',
        'manner of receiving', 'methods of divine',
    ],
    'thing_noble': [
        'noble', 'honorable', 'honored', 'praiseworthy', 'righteous', 'excellent',
        'virtuous', 'pious', 'glorious', 'exalted', 'sacred', 'believer',
        'believers', 'servants', 'hypocrites', 'supported by allah', 'restraint',
        'prostrates', 'qualities of the believers', 'qualities of the servants',
        'servants of the most merciful', 'servants of the',
        'qualities of', 'characteristics of', 'traits of',
    ],
    'thing_clear': [
        'clear', 'mubin', 'mubīn', 'bayyinah', 'evident', 'manifest',
        'things described as clear',
    ],
    'heart': [
        'sealed organs', 'organs of the', 'organ of', 'heart', 'soul', 'spirit',
    ],
}


def _strip_tashkeel(text):
    """Remove Arabic diacritical marks (tashkeel) for comparison."""
    import unicodedata
    return ''.join(c for c in text if unicodedata.category(c) != 'Mn')


def _fuzzy_english_match(word, meaning):
    """Check if an English keyword matches meaning via inflection normalization."""
    w = word.lower().strip()
    m = meaning.lower()
    if w in m:
        return True
    IRREGULAR = {
        'took': 'take', 'gave': 'give', 'found': 'find',
        'got': 'get', 'spent': 'spend', 'sent': 'send',
        'left': 'leave', 'sat': 'sit', 'fell': 'fall',
        'told': 'tell', 'sold': 'sell', 'held': 'hold',
        'brought': 'bring', 'thought': 'think', 'caught': 'catch',
        'made': 'make', 'said': 'say', 'saw': 'see',
        'came': 'come', 'went': 'go', 'knew': 'know',
        'won': 'win', 'ran': 'run', 'stood': 'stand',
        'grew': 'grow', 'led': 'lead',
        'heard': 'hear', 'felt': 'feel', 'became': 'become',
        'understood': 'understand', 'wrote': 'write', 'read': 'read',
        'lost': 'lose', 'paid': 'pay', 'met': 'meet',
        'passed': 'pass', 'failed': 'fail', 'died': 'die',
        'lived': 'live', 'believed': 'believe', 'hoped': 'hope',
        'feared': 'fear', 'watched': 'watch', 'worked': 'work',
        'needed': 'need', 'wanted': 'want', 'liked': 'like',
        'helped': 'help', 'started': 'start', 'looked': 'look',
        'turned': 'turn', 'called': 'call', 'asked': 'ask',
    }
    m_normalized = m
    for past, base in IRREGULAR.items():
        if past in m:
            m_normalized = m.replace(past, base)
            break
    for suffix in ['ed', 'ing', 's', 'ly']:
        if len(w) > 3 and w.endswith(suffix):
            base = w[:-len(suffix)]
            if len(base) > 2 and (base in m_normalized or m_normalized.startswith(base)):
                return True
    return False


def _item_in_field(item, field_keywords):
    """Return True if item matches any keyword in the field."""
    import re
    meaning = item.get('en', '').lower()
    ar_word = _strip_tashkeel(item.get('ar', ''))
    tokens = set(re.findall(r'\w+', meaning))
    for kw in field_keywords:
        if len(kw) < 3:
            continue
        if kw in tokens or kw in meaning or _fuzzy_english_match(kw, meaning):
            return True
        if kw in ar_word:
            return True
    return False


def _count_field_matches(items, field_keywords):
    """Count how many of the 4 items match this field."""
    return sum(1 for item in items if _item_in_field(item, field_keywords))


# Surah name (lowercased) → number. Mirrors parseQuranRef() in js/utils.js.
_SURAH_NAMES = {
    'al-fatihah': 1, 'al-baqarah': 2, "ali 'imran": 3, 'an-nisa': 4, "al-ma'idah": 5,
    "al-an'am": 6, "al-a'raf": 7, 'al-anfal': 8, 'at-tawbah': 9, 'yunus': 10,
    'hud': 11, 'yusuf': 12, "ar-ra'd": 13, 'ibrahim': 14, 'al-hijr': 15,
    'an-nahl': 16, 'al-isra': 17, 'al-kahf': 18, 'maryam': 19, 'ta-ha': 20,
    'al-anbiya': 21, 'al-hajj': 22, "al-mu'minun": 23, 'an-nur': 24, 'al-furqan': 25,
    'ash-shu\'ara': 26, 'an-naml': 27, 'al-qasas': 28, "al-'ankabut": 29, 'ar-rum': 30,
    'luqman': 31, 'as-sajdah': 32, 'al-ahzab': 33, 'saba': 34, 'fatir': 35,
    'ya-sin': 36, 'as-saffat': 37, 'sad': 38, 'az-zumar': 39, 'ghafir': 40,
    'fussilat': 41, 'ash-shura': 42, 'az-zukhruf': 43, 'ad-dukhan': 44, 'al-jathiyah': 45,
    'al-ahqaf': 46, 'muhammad': 47, 'al-fath': 48, 'al-hujurat': 49, 'qaf': 50,
    'adh-dhariyat': 51, 'at-tur': 52, 'an-najm': 53, 'al-qamar': 54, 'ar-rahman': 55,
    "al-waqi'ah": 56, 'al-hadid': 57, 'al-mujadilah': 58, 'al-hashr': 59, 'al-mumtahanah': 60,
    'as-saff': 61, "al-jumu'ah": 62, 'al-munafiqun': 63, 'at-taghabun': 64, 'at-talaq': 65,
    'at-tahrim': 66, 'al-mulk': 67, 'al-qalam': 68, 'al-haqqah': 69, "al-ma'arij": 70,
    'nuh': 71, 'al-jinn': 72, 'al-muzzammil': 73, 'al-muddaththir': 74, 'al-qiyamah': 75,
    'al-insan': 76, 'al-mursalat': 77, 'an-naba': 78, "an-nazi'at": 79, "'abasa": 80,
    'at-takwir': 81, 'al-infitar': 82, 'al-mutaffifin': 83, 'al-inshiqaq': 84, 'al-buruj': 85,
    'at-tariq': 86, "al-a'la": 87, 'al-ghashiyah': 88, 'al-fajr': 89, 'al-balad': 90,
    'ash-shams': 91, 'al-layl': 92, 'ad-duha': 93, 'ash-sharh': 94, 'at-tin': 95,
    "al-'alaq": 96, 'al-qadr': 97, 'al-bayyinah': 98, 'az-zalzalah': 99, "al-'adiyat": 100,
    "al-qari'ah": 101, 'at-takathur': 102, "al-'asr": 103, 'al-humazah': 104, 'al-fil': 105,
    'quraysh': 106, "al-ma'un": 107, 'al-kawthar': 108, 'al-kafirun': 109, 'an-nasr': 110,
    'al-masad': 111, 'al-ikhlas': 112, 'al-falaq': 113, 'an-nas': 114,
}


def _extract_surah_from_theme(theme_en):
    """If the theme names a surah, return its number. Otherwise None.

    Matches patterns like:
      "Words from Iblis's Address in Surah Al-Hijr"
      "Worldly Luxuries in Surah Az-Zukhruf"
      "The Story of the People of the Ditch (Surah Al-Buruj)"
    """
    import re
    m = re.search(r'\(?\s*[Ss]urah\s+([A-Za-z\'\-\u2019]+(?:\s+[A-Za-z\'\-\u2019]+)*)\s*\)?', theme_en)
    if not m:
        return None
    name = m.group(1).lower().strip()
    # Strip leading articles / prepositions that wouldn't appear in a surah name
    name = re.sub(r'^(the\s+|surah\s+)', '', name)
    return _SURAH_NAMES.get(name)


def _item_verses_in_surah(items, surah_num):
    """Return list of (ref, ayah) tuples for items whose ref is in the given surah.

    Items whose ref is malformed or in a different surah are returned with None
    so the caller can flag the mismatch.
    """
    import re
    out = []
    for item in items:
        ref = item.get('ref', '')
        m = re.match(r'^(\d{1,3}):(\d{1,3})$', ref or '')
        if not m:
            out.append((ref, None))
            continue
        s = int(m.group(1))
        a = int(m.group(2))
        out.append((ref, a if s == surah_num else None))
    return out


def _surah_proximity_violation(items, surah_num, max_span=20):
    """For a theme anchored to a specific surah, verify the 4 items are
    actually in that surah and within `max_span` verses of each other.

    Returns None if the category is fine, or a string explaining the violation.
    Fixes #226 (item from outside Iblis's address) and #227 (purple items
    scattered across an unrelated surah with off-theme words).
    """
    refs = _item_verses_in_surah(items, surah_num)
    off_surah = [r for r, a in refs if a is None]
    if off_surah:
        return (f"Theme names Surah #{surah_num} but {len(off_surah)} item(s) "
                f"are from other surahs: {off_surah}")
    ayahs = sorted(a for _, a in refs)
    span = ayahs[-1] - ayahs[0] + 1
    if span > max_span:
        return (f"Theme names Surah #{surah_num} but items span {span} verses "
                f"({ayahs[0]}..{ayahs[-1]}). For a single coherent theme the "
                f"items should cluster within {max_span} verses.")
    return None


# ── Pattern-anchor check (fixes #235) ─────────────────────────────
# The #226/#227-era checks treated "the items really are in the named
# surah, close together" as coherence. #235 showed that this IS the bug:
# a category mined from one short passage has no pattern between the
# words themselves — heavens / earth / Hour / intercession (43:82-86)
# share nothing a player can see from the shuffled grid, where verses,
# refs and surah names are hidden. The checks below reject that shape
# deterministically, before any LLM grader is consulted:
#   1. the theme names a surah/juz/hizb (the "connection" is a place);
#   2. the theme is an empty container ("Aspects of…", "Elements of…",
#      "Dialogue of…", "Words from…") that any 4 words taken from a
#      single passage would fit;
#   3. all 4 refs sit in one short passage (same surah, span ≤ 20
#      ayahs), whatever the theme claims.
_PASSAGE_ANCHOR_MAX_SPAN = 20

_VACUOUS_THEME_OPENERS = (
    "aspects of", "elements of", "dialogue of", "words from", "words in",
    "verses from", "items from", "things from", "things in", "parts of",
)


def passage_anchor_violation(cat):
    """Return a violation string if a Connections category is anchored
    to a passage instead of to a pattern in the words, else None."""
    theme_en = (cat.get("nameEn") or "").lower().strip()
    items = cat.get("items") or []
    if theme_en:
        if re.search(r"\b(surah|juz|hizb|para)\b", theme_en):
            return (
                f"Theme '{cat.get('nameEn')}' names a surah/juz — appearing "
                f"in the same passage is not a pattern a player can see "
                f"from the words. Name the pattern the 4 words themselves "
                f"share instead."
            )
        if theme_en.startswith(_VACUOUS_THEME_OPENERS):
            return (
                f"Theme '{cat.get('nameEn')}' is an empty container — any "
                f"4 words from one passage would fit it. Name the specific "
                f"pattern the 4 words themselves share instead."
            )
    refs = []
    for item in items:
        m = re.match(r"^(\d{1,3}):(\d{1,3})$", str(item.get("ref", "")))
        if m:
            refs.append((int(m.group(1)), int(m.group(2))))
    if len(refs) == 4 and len({s for s, _ in refs}) == 1:
        ayahs = [a for _, a in refs]
        span = max(ayahs) - min(ayahs) + 1
        if span <= _PASSAGE_ANCHOR_MAX_SPAN:
            return (
                f"All 4 items come from one passage (Surah {refs[0][0]}, "
                f"ayahs {min(ayahs)}-{max(ayahs)}) — their only link is "
                f"the passage, which the player cannot see. Pick words "
                f"that share a pattern and come from at least two "
                f"different passages."
            )
    return None


def semantic_coherence_check(cat):
    """Check if the 4 items coherently fit the category theme.

    Layer 0 — Pattern anchor (fixes #235): the category must be built on
    a pattern in the words themselves, not on a shared passage. See
    passage_anchor_violation.

    Layer 1 — Explicit theme claim: If the theme name says "Verbs of X/Y/Z",
    "Attributes of X", or uses descriptive semantic keywords, verify items
    actually match those claims. Prevents "random grouping under a fancy
    name" bug.

    Layer 2 — Coherent group: If no explicit claim, verify items share a
    semantic field (3+ match a field) or don't scatter across 3+ unrelated fields.
    """
    import re
    theme_en = cat.get('nameEn', '').lower().strip()
    items = cat.get('items', [])

    if not items:
        return True, None

    # Layer 0 runs first: a passage-anchored category is rejected even
    # if its items happen to sit in the surah its name claims (the old
    # structural branch below is now unreachable for such themes and is
    # kept only as defence-in-depth for direct callers).
    anchor_violation = passage_anchor_violation(cat)
    if anchor_violation:
        return False, anchor_violation

    theme_words = set(re.findall(r'\w+', theme_en))

    # ── Layer 1a: Theme-name → field trigger (fixes #227) ─────────
    # When a theme name contains a phrase that names a semantic field
    # (e.g. "Worldly Luxuries and Provisions"), check whether the items
    # cluster in that field. Built from analysis of the last 90 days
    # of generated categories — 99% of themes map to one of these
    # fields.
    #
    # The hard signal: if the named field is empty AND another field
    # has 3+ matches, the items are clearly about the other field.
    # This catches the most obvious cases (e.g. "names luxury" with
    # 0 luxury items but 3 place items).
    #
    # The soft signal: items split between the named field and a
    # competitor. We use the caller's `previous_violations` machinery
    # to surface this as a warning rather than a hard reject, because
    # narrative themes (e.g. "Story of Prophet Musa") often have
    # items that don't match any curated keyword set. Hard rejection
    # at this level caused 35% false-positive rejection on the 90-day
    # history. As a warning, the signal feeds back to the LLM on
    # retry, which empirically fixes most cases without a strict gate.
    # Trade-off: #227 (luxury 2/2 vs place 2/2) is a tied split that
    # the strict check can't reliably catch — the warning path
    # surfaces it as a hint to the model instead.
    for field_name, triggers in THEME_FIELD_TRIGGERS.items():
        if not any(trig in theme_en for trig in triggers):
            continue
        field_data = SEMANTIC_FIELDS.get(field_name, {})
        field_kws = field_data.get('keywords', [])
        if not field_kws:
            continue
        named_count = sum(1 for item in items if _item_in_field(item, field_kws))

        # Find the strongest competitor field.
        best_other_field = None
        best_other_count = named_count
        for other_field, other_data in SEMANTIC_FIELDS.items():
            if other_field == field_name:
                continue
            other_count = sum(1 for item in items
                              if _item_in_field(item, other_data.get('keywords', [])))
            if other_count > best_other_count:
                best_other_count = other_count
                best_other_field = other_field

        # Hard-reject: named field is empty AND a competitor has 3+ matches.
        # This is the unambiguous case — items cluster elsewhere.
        if named_count == 0 and best_other_count >= 3:
            return False, (
                f"Theme '{theme_en}' names the '{field_name}' field but none "
                f"of the 4 items match it; {best_other_count} match "
                f"'{best_other_field}' instead. Items should each be a "
                f"concrete example of the stated theme."
            )

        # Soft check: tie at 2-2 with another field, or named field has
        # only 1-2 matches. Surface as a violation (not a hard reject)
        # so the model's retry feedback includes the signal but the
        # category still passes the first try. The retry will then
        # pick better items.
        if named_count <= 2 and best_other_count >= 3:
            return False, (
                f"Theme '{theme_en}' names the '{field_name}' field but "
                f"only {named_count}/4 items match it; "
                f"{best_other_count}/4 match '{best_other_field}' instead. "
                f"Items should each be a concrete example of the stated theme."
            )

        # Acceptable: fall through to Layer 2 for cluster analysis.
        break

    # ── Detect theme type ─────────────────────────────────────────
    # Structural: "Words from Surah X", "Verses of Juz Y" — but don't just
    # pass on the name's keyword; verify the items are actually in the
    # named surah. Fixes #226 (item from outside Iblis's address) and
    # #227 (purple items scattered across an unrelated passage).
    if any(kw in theme_words for kw in ['surah', 'juz', 'hizb', 'para', "juz'"]):
        # Juz/Hizb/Para range is not yet implemented — keep the lenient
        # pass for those, but only after the surah check below.
        claimed_surah = _extract_surah_from_theme(theme_en)
        if claimed_surah is None:
            return True, None
        violation = _surah_proximity_violation(items, claimed_surah, max_span=20)
        if violation:
            return False, violation
        return True, None

    # Verb theme: "Verbs of X, Y, Z" — collect all semantic keywords in the name
    IS_VERB_THEME = any(t in theme_words for t in [
        'verb', 'verbs', 'action', 'actions', 'doing', 'act'
    ])
    IS_ATTR_THEME = any(t in theme_words for t in [
        'attribute', 'attributes', 'quality', 'qualities', 'trait', 'traits',
        'property', 'properties'
    ])

    if IS_VERB_THEME or IS_ATTR_THEME:
        # Theme explicitly claims semantic fields — collect all semantic keyword
        # triggers from the theme name itself
        SEMANTIC_TRIGGERS = {
            'acquisition': ['acquisition', 'acquire', 'receiving', 'receive', 'gain', 'taking', 'take'],
            'bestowal': ['bestowal', 'bestow', 'giving', 'give', 'grant', 'gift'],
            'duration': ['duration', 'remain', 'remain', 'stay', 'linger', 'dwell', 'abide'],
            'motion': ['motion', 'move', 'movement', 'travel', 'journey'],
            'knowledge': ['knowledge', 'knowing', 'learn', 'understand'],
            'speech': ['speech', 'speaking', 'say', 'speak'],
            'creation': ['creation', 'create', 'making', 'make'],
            'worship': ['worship', 'worshipping', 'pray', 'praise'],
            'trial': ['trial', 'test', 'testing', 'prove'],
            'guidance': ['guidance', 'guide', 'direct', 'lead'],
            'paradise': ['paradise', 'heaven', 'jannah'],
            'hell': ['hell', 'fire', 'punishment'],
            'divine': ['divine', 'god', 'lord', 'lord\'s', 'almighty'],
            'mercy': ['mercy', 'merciful', 'compassion', 'forgive'],
            'creation': ['create', 'creation', 'earth', 'sky', 'heaven', 'cosmic'],
            'heart': ['heart', 'soul', 'spirit', 'inner'],
            'authority': ['kingdom', 'rule', 'sovereignty', 'kingship'],
        }
        # Collect claimed fields from theme name
        claimed = []
        for field_name, triggers in SEMANTIC_TRIGGERS.items():
            if any(tw in triggers for tw in theme_words):
                claimed.append(field_name)

        if claimed:
            # Reject only if NO items match any claimed field (fully off-topic category)
            matched = 0
            for item in items:
                for cf in claimed:
                    kws = SEMANTIC_FIELDS.get(cf, {}).get('keywords', [])
                    if _item_in_field(item, kws):
                        matched += 1
                        break
                    for trigger in SEMANTIC_TRIGGERS.get(cf, []):
                        if trigger in item.get('en', '').lower():
                            matched += 1
                            break
                    else:
                        continue
                    break
            if matched == 0:
                return False, (
                    f"No items match theme '{theme_en}' (claimed fields: {claimed}). "
                    f"Category appears entirely off-topic."
                )
            return True, None

    # ── Layer 2: No explicit claim — verify coherent grouping ──
    field_counts = []
    for field_name, field_data in SEMANTIC_FIELDS.items():
        count = _count_field_matches(items, field_data['keywords'])
        if count >= 1:
            field_counts.append((field_name, count))

    if not field_counts:
        return True, None  # No matches — can't verify, pass

    field_counts.sort(key=lambda x: x[1], reverse=True)
    best_field, best_count = field_counts[0]

    # Reject if items scatter across 4+ fields with no dominant field (2+ items in one field)
    if len(field_counts) >= 4 and best_count < 2:
        return False, (
            f"Items scatter across {len(field_counts)} unrelated fields "
            f"({[f for f, c in field_counts[:5]]}) with no dominant field ({best_field}={best_count}/4). "
            f"Items must share a common Quranic concept."
        )

    return True, None


# ── Semantic self-grader (fixes #227) ─────────────────────────────
# A Connections theme can pass every structural check (right surah, no
# duplicate refs, 4 valid items) while its items simply don't match the
# stated theme — e.g. "Worldly Luxuries" containing "two towns" and
# "doors". Curated keyword sets catch most of these for free, but they
# cannot tell a *tied* split (2 items match the named field, 2 match a
# competing field) from a genuinely ambiguous one.
#
# The self-grader is a small LLM call that resolves exactly that case.
# It is deliberately CONDITIONAL (cost control — see _should_self_grade):
# it only fires when the cheap keyword check is inconclusive, so on a
# typical day it costs zero extra tokens.
SELF_GRADE_ENABLED = True     # Master switch
SELF_GRADE_MAX_RETRIES = 2    # Grader attempts on unparseable output
SELF_GRADE_GATE_LOW = 2       # Named-field matches at/below this → ambiguous
SELF_GRADE_GATE_HIGH = 3      # Named-field matches at/above this → clear, skip


def _resolve_theme_field(cat):
    """Return (field_name, named_count, best_other_field, best_other_count).

    Uses THEME_FIELD_TRIGGERS to decide which semantic field the theme
    name claims, then counts how many of the 4 items actually match that
    field vs the strongest competing field. Returns (None, 0, None, 0)
    when the theme doesn't name a recognisable field.
    """
    import re as _re
    theme_en = (cat.get("nameEn") or "").lower().strip()
    items = cat.get("items") or []
    if not theme_en or not items:
        return None, 0, None, 0

    field_name = None
    for fname, triggers in THEME_FIELD_TRIGGERS.items():
        if not fname or fname == "action_synonym":
            continue
        if SEMANTIC_FIELDS.get(fname, {}).get("keywords") and \
                any(t in theme_en for t in triggers):
            field_name = fname
            break
    if not field_name:
        return None, 0, None, 0

    kws = SEMANTIC_FIELDS[field_name]["keywords"]
    named = sum(1 for it in items if _item_in_field(it, kws))

    best_other, best_other_n = None, 0
    for other, data in SEMANTIC_FIELDS.items():
        if other == field_name:
            continue
        n = sum(1 for it in items if _item_in_field(it, data.get("keywords", [])))
        if n > best_other_n:
            best_other, best_other_n = other, n

    return field_name, named, best_other, best_other_n


def _should_self_grade(cat):
    """Cost gate: only spend an API call when the cheap checks can't decide.

    Returns (bool, reason). Skips the grader when:
      - the flag is off, or the theme names no recognisable field
        (no signal to grade against — nothing to learn)
      - the named field is clearly dominant (named >= GATE_HIGH), so the
        keyword check already agrees with the theme
    Fires when the keyword check is inconclusive: the named field is
    weak (named <= GATE_LOW) and another field is competing. That is the
    #227 shape — a tied or lopsided split the keyword set cannot resolve.
    """
    if not SELF_GRADE_ENABLED:
        return False, "self-grade disabled"
    field_name, named, other, other_n = _resolve_theme_field(cat)
    if not field_name:
        return False, "theme names no recognisable field"
    if named >= SELF_GRADE_GATE_HIGH:
        return False, f"named field '{field_name}' is dominant ({named}/4)"
    return True, (
        f"ambiguous: theme claims '{field_name}' ({named}/4 match)"
        + (f" but '{other}' has {other_n}/4" if other else "")
    )


def _build_grade_prompt(cat):
    """Minimal grader prompt: theme + English glosses only.

    Deliberately terse (~80 tokens vs ~290 for a verbose prompt). The
    English gloss is the primary signal for semantic fit; the Arabic word
    and verse ref are dropped because the grader judges theme coherence,
    not verse alignment (which enrich_single_category already verifies).
    """
    theme = cat.get("nameEn", "")
    glosses = []
    for it in cat.get("items", []):
        en = (it.get("en") or "").strip()
        ar = (it.get("ar") or "").strip()
        glosses.append(f"- {en}" + (f" ({ar})" if ar else ""))
    body = "\n".join(glosses)

    return (
        f'Theme: "{theme}"\n'
        f"Items:\n{body}\n\n"
        "Does EVERY item fit the theme? Reply JSON only:\n"
        '{"bad":[<1-based indices of items that do NOT fit>],"why":"<6 words max>"}'
    )


def self_grade_category(cat, model_config):
    """Grade one category's semantic coherence with a small LLM call.

    Returns (verdict, bad_indices, reason, raw) where:
      verdict: 'pass' | 'fail' | 'skipped'
      bad_indices: sorted 1-based indices of off-theme items ([] on pass/skipped)
      reason: model's short explanation ('' if absent)
      raw: raw model output, for debugging

    Fail-OPEN: any grader error (rate limit, malformed JSON, unexpected
    shape) returns 'skipped' so a flaky grader never blocks generation.
    The structural validator's verdict stands.
    """
    items = cat.get("items") or []
    theme = cat.get("nameEn") or ""
    if not theme or len(items) != 4:
        return "skipped", [], "", ""

    prompt = _build_grade_prompt(cat)
    system_msg = "You grade Connections-puzzle categories. Reply with JSON only."

    for attempt in range(1, SELF_GRADE_MAX_RETRIES + 1):
        try:
            raw = call_model(prompt, model_config, system_msg=system_msg)
        except Exception as e:
            print(f"      \u26a0\ufe0f self-grade call exception: {e}")
            continue

        if raw == "RATE_LIMITED":
            print(f"      \u26a0\ufe0f self-grade rate-limited; trusting keyword check")
            return "skipped", [], "", raw or ""
        if raw in (None, "", "SKIP"):
            if attempt < SELF_GRADE_MAX_RETRIES:
                print(f"      \u26a0\ufe0f self-grade attempt {attempt} -> {raw!r}, retrying...")
                time.sleep(2)
                continue
            return "skipped", [], "", raw or ""

        try:
            parsed = parse_json_response(raw)
        except Exception as e:
            if attempt < SELF_GRADE_MAX_RETRIES:
                print(f"      \u26a0\ufe0f self-grade parse failed ({e}); retrying...")
                continue
            print(f"      \u26a0\ufe0f self-grade unparseable; trusting keyword check")
            return "skipped", [], "", raw

        if not isinstance(parsed, dict):
            if attempt < SELF_GRADE_MAX_RETRIES:
                continue
            return "skipped", [], "", raw

        bad = parsed.get("bad")
        # Accept a bare list too: some models return ["2","4"] without the key.
        if bad is None and isinstance(parsed.get("items"), list):
            bad = parsed["items"]
        reason = parsed.get("why") or parsed.get("overall_reason") or ""
        if not isinstance(reason, str):
            reason = str(reason)
        reason = reason.strip()[:120]

        if not isinstance(bad, list):
            if attempt < SELF_GRADE_MAX_RETRIES:
                continue
            return "skipped", [], "", raw

        # Normalise indices: accept ints and numeric strings, clamp to 1..4
        idx = set()
        for b in bad:
            try:
                n = int(str(b).strip())
            except (TypeError, ValueError):
                continue
            if 1 <= n <= 4:
                idx.add(n)

        if not idx:
            return "pass", [], reason, raw
        return "fail", sorted(idx), reason, raw

    return "skipped", [], "", ""



# ── Grammatical-category detection (issue #238) ─────────────────────
# A category is "grammatical" when its stated pattern is a fact of Arabic
# grammar/morphology — verb tense or person forms, participles, plural/dual
# morphology, derived verb forms, wazn patterns, pronoun suffixes — rather
# than a theme in what the words are, mean, or do. Such categories are the
# hardest in the game: a player without formal Arabic grammar training
# cannot see the pattern from the words and meanings alone. The 28 Oct 2026
# puzzle had THREE of them (fa'il participles, past-tense "we" verbs,
# passive participles in sound masculine plural), which is what issue #238
# reports. Cap: at most ONE grammatical category per Connections puzzle.

_GRAMMAR_TERMS_EN = (
    "participle", "past tense", "present tense", "future tense",
    "conjugation", "conjugated", "verb form", "derived form",
    "verbal noun", "masdar", "maṣdar", "morpholog", "wazn",
    "broken plural", "sound plural", "masculine plural", "feminine plural",
    "plural form", "dual form", "first person", "second person",
    "third person", "passive voice", "active voice", "imperative",
    "subjunctive", "jussive", "declension", "accusative", "nominative",
    "genitive", "attached pronoun", "pronoun suffix", "object pronoun",
    "possessive suffix", "on the pattern", "sarf", "ṣarf",
)

# Arabic grammatical markers, matched against the tashkeel-stripped name.
_GRAMMAR_TERMS_AR = (
    "وزن", "صيغة", "اسم فاعل", "اسم مفعول", "جمع مذكر", "جمع مؤنث",
    "افعال ماضية", "فعل ماض", "فعل مضارع", "المتكلمين",
)


def is_grammatical_category(cat):
    """True if the category's pattern is Arabic grammar/morphology (#238)."""
    name_en = (cat.get("nameEn") or "").lower()
    if any(term in name_en for term in _GRAMMAR_TERMS_EN):
        return True
    name_ar = _strip_tashkeel(cat.get("name") or "")
    return any(term in name_ar for term in _GRAMMAR_TERMS_AR)


def validate_single_category(cat, cat_index, history, accumulated_cats):
    """Validate one category against history and already-accumulated categories."""
    errors, violations, warnings = [], [], []

    items = cat.get("items", [])
    if len(items) != 4:
        errors.append(f"Expected 4 items, got {len(items)}")
        return errors, violations, warnings

    if not cat.get("name") or not cat.get("nameEn"):
        errors.append("Missing 'name' or 'nameEn'")
        return errors, violations, warnings

    cat["color"] = COLORS[cat_index]

    # Build avoidance sets from history + all prior categories in this run
    all_avoided_verses = history["connections"]["verses"] | history["all_verses"]
    all_avoided_themes = set(history["connections"]["themes"])

    # Build list of (arabic, meaning_context) from history + prior categories
    # History data uses sets of meanings; current categories use strings.
    all_prev_word_data = []
    for ar in history["connections"]["words"]:
        m_set = history["connections"].get("meanings", {}).get(ar, set())
        all_prev_word_data.append((ar, m_set))

    for prev_cat in accumulated_cats:
        all_avoided_themes.add(prev_cat.get("nameEn", "").lower().strip())
        for item in prev_cat.get("items", []):
            if item.get("ref"):
                all_avoided_verses.add(item["ref"])
            if item.get("ar"):
                all_prev_word_data.append((item["ar"], item.get("en", "")))

    # Theme cooldown
    theme = cat.get("nameEn", "").lower().strip()
    if theme in all_avoided_themes:
        violations.append(f"Theme '{theme}' reused (cooldown or duplicate in puzzle)")

    # Grammar cap (issue #238): at most ONE grammatical category per puzzle.
    if is_grammatical_category(cat):
        for prev_cat in accumulated_cats:
            if is_grammatical_category(prev_cat):
                violations.append(
                    "Grammatical-category limit (max one per puzzle): this puzzle already has a "
                    f"grammatical category (\"{prev_cat.get('nameEn')}\"). This category "
                    f"(\"{cat.get('nameEn')}\") is also grammatical. Choose a THEMATIC pattern "
                    "instead — what the words are, mean, or do (things, beings, places, actions, "
                    "events in the Qur'an's message), not a grammar pattern. "
                    "Pick a completely different, non-grammatical theme."
                )
                break

    # Semantic coherence check - items must actually fit the theme
    is_coherent, coherence_violation = semantic_coherence_check(cat)
    if not is_coherent:
        violations.append(coherence_violation)

    # Collect the 4 item refs
    item_refs = []
    for item in items:
        if item.get("ref"):
            item_refs.append(item["ref"])

    # Duplicates within category
    seen = set()
    for ref in item_refs:
        if ref in seen:
            violations.append(f"Duplicate ref within category: {ref}")
        seen.add(ref)

    # Against history + accumulated
    for ref in seen:
        if ref in all_avoided_verses:
            violations.append(f"Verse ref {ref} reused (cooldown or already used in puzzle)")

    # Enforce the allowlist the prompt offered. Without this the model can
    # pick any verse it likes and only discover the mistake here, wasting a
    # full retry. Naming the nearby free alternatives makes the violation
    # actionable in the same round.
    #
    # Uses the SAME offered_ranges() the prompt rendered. Testing against
    # raw free_ayah_ranges() would reject refs inside runs the prompt had
    # filtered out for being too short — advertising surah 26 [19-27] and
    # then refusing 26:20 would be worse than not checking at all.
    if items:
        from surah_ranges import offered_ranges, format_allowed_ranges
        _blocked = set(history["connections"]["verses"]) | set(history["all_verses"])
        for _pc in accumulated_cats:
            _cr = _pc.get("verse", {}).get("ref")
            if _cr:
                _blocked.add(_cr)
            for _it in _pc.get("items", []):
                if _it.get("ref"):
                    _blocked.add(_it["ref"])
        _ranges = offered_ranges(_blocked)

        def _in_allowlist(ref):
            if ":" not in str(ref):
                return False
            try:
                s, a = str(ref).split(":")
                s, a = int(s), int(a)
            except ValueError:
                return False
            return any(lo <= a <= hi for lo, hi in _ranges.get(s, ()))

        stray = sorted(r for r in seen if not _in_allowlist(r))
        if stray and _ranges:
            violations.append(
                f"Refs {', '.join(stray)} are outside the available passages offered. "
                f"Pick from: {format_allowed_ranges(_ranges)}"
            )

        # Items
    new_word_data = []  # List of (ar, en)
    for j, item in enumerate(items):
        if not item.get("ar") or not item.get("en"):
            errors.append(f"Item {j+1} missing 'ar' or 'en'")
        if not item.get("ref"):
            errors.append(f"Item {j+1} missing 'ref'")
        else:
            _m = re.match(r'^(\d{1,3}):(\d{1,3})$', item["ref"])
            if not _m:
                errors.append(f"Item {j+1} has malformed ref '{item['ref']}' (expected 'surah:ayah')")
            elif not (1 <= int(_m.group(1)) <= 114):
                errors.append(f"Item {j+1} ref '{item['ref']}' has invalid surah number")
        ar = item.get("ar", "")
        en = item.get("en", "")
        # WORD-ROOT DEDUP DISABLED for Connections: too aggressive, blocks generation
        # for prev_ar, prev_en in all_prev_word_data + new_word_data:
        #     if ar and words_are_too_similar(ar, prev_ar, en, prev_en):
        #         violations.append(
        #             f"Word ... shares root with ...")
        #         break
        pass  # word-root check disabled
        new_word_data.append((ar, en))
        if ar in history["connections"]["words"]:
            warnings.append(f"Word '{ar}' reused (cooldown)")
        item.setdefault("verse", "")
        item.setdefault("verseEn", "")

    return errors, violations, warnings


def _get_dominant_field(items):
    """Return the dominant semantic field for a category's items, or None if no dominant field.
    
    Dominant = top field with count >= 2. Returns (field_name, count) or (None, 0).
    """
    field_counts = []
    for field_name, field_data in SEMANTIC_FIELDS.items():
        count = _count_field_matches(items, field_data['keywords'])
        if count >= 1:
            field_counts.append((field_name, count))
    if not field_counts:
        return None, 0
    field_counts.sort(key=lambda x: x[1], reverse=True)
    best_field, best_count = field_counts[0]
    if best_count >= 2:
        return best_field, best_count
    return None, 0


def validate_connections(puzzle, history):
    errors, cooldown_violations, warnings = [], [], []
    cats = puzzle.get("categories", [])
    if len(cats) != 4:
        errors.append(f"Expected 4 categories, got {len(cats)}")
        return errors, cooldown_violations, warnings

    all_word_data = []  # list of (ar, en) tuples seen so far
    cross_cat_refs = set()
    cat_dominant_fields = []  # [(field_name, count), ...] per category

    for i, cat in enumerate(cats):
        items = cat.get("items", [])
        if len(items) != 4:
            errors.append(f"Category {i+1} has {len(items)} items, expected 4")
        if not cat.get("name") or not cat.get("nameEn"):
            errors.append(f"Category {i+1} missing name or nameEn")

        cat["color"] = COLORS[i]

        theme = cat.get("nameEn", "").lower().strip()
        if theme in history["connections"]["themes"]:
            cooldown_violations.append(f"Theme '{theme}' reused (cooldown)")

        # Collect the 4 item refs
        item_refs = [item["ref"] for item in items if item.get("ref")]

        # Duplicates within category
        seen_in_cat = set()
        for ref in item_refs:
            if ref in seen_in_cat:
                cooldown_violations.append(f"Duplicate ref within category {i+1}: {ref}")
            seen_in_cat.add(ref)

        # Duplicates across categories + cooldown
        for ref in seen_in_cat:
            if ref in cross_cat_refs:
                cooldown_violations.append(f"Duplicate ref across categories: {ref}")
            elif ref in history["connections"]["verses"]:
                cooldown_violations.append(f"Verse ref {ref} reused (connections cooldown)")
            # CROSS-GAME COOLDOWN RELAXED for Connections (other games still block Connections)
            # elif ref in history["all_verses"]:
            #     cooldown_violations.append(f"Verse ref {ref} reused (cross-game cooldown)")

        for j, item in enumerate(items):
            if not item.get("ar") or not item.get("en"):
                errors.append(f"Cat {i+1} item {j+1} missing ar or en")
            if not item.get("ref"):
                errors.append(f"Cat {i+1} item {j+1} missing ref")
            ar = item.get("ar", "")
            en = item.get("en", "")
            # WORD-ROOT DEDUP DISABLED for Connections: too aggressive, blocks generation
            # for prev_ar, prev_en in all_word_data:
            #     if ar and words_are_too_similar(ar, prev_ar, en, prev_en):
            #         cooldown_violations.append(f"Same-root word across categories: ...")
            #         break
            if ar in history["connections"]["words"]:
                warnings.append(f"Word '{ar}' reused (cooldown)")
            item.setdefault("verse", "")
            item.setdefault("verseEn", "")

        # Track dominant field for cross-category overlap check
        dom_field, dom_count = _get_dominant_field(items)
        cat_dominant_fields.append((dom_field, dom_count))

    # ── Cross-category semantic overlap check ──────────────────────
    # Reject if any two categories share the same dominant field
    for i in range(len(cats)):
        for j in range(i + 1, len(cats)):
            field_i, count_i = cat_dominant_fields[i]
            field_j, count_j = cat_dominant_fields[j]
            if field_i and field_i == field_j:
                cooldown_violations.append(
                    f"Categories {i+1} and {j+1} both focus on '{field_i}' "
                    f"({count_i}/4 and {count_j}/4 items) — choose different themes."
                )

    # Grammar cap visibility (issue #238): per-category validation enforces
    # the one-grammatical-category limit during generation; if a puzzle
    # still arrives here over the cap, surface it in the run log.
    _gram_count = sum(1 for c in cats if is_grammatical_category(c))
    if _gram_count > 1:
        warnings.append(
            f"{_gram_count} grammatical categories in one puzzle (limit is 1) — issue #238"
        )

    return errors, cooldown_violations, warnings


# ═══════════════════════════════════════════════════════════════════
# WORDLE GENERATOR (Harf by Harf)
# ═══════════════════════════════════════════════════════════════════
def build_harf_prompt(history, today, previous_violations=None):
    avoided_words = ", ".join(sorted(history["harf"]["words"])) or "(none)"
    # Merge game-specific + global verse refs
    all_avoided = history["harf"]["verseRefs"] | history["all_verses"]
    avoided_refs = ", ".join(sorted(all_avoided)) or "(none)"
    avoided_surahs = ", ".join(sorted(history["harf"]["surahs"], key=lambda x: int(x))) or "(none)"

    violation_block = ""
    if previous_violations:
        violation_block = f"""

CRITICAL - PREVIOUS ATTEMPT FAILED:
{chr(10).join('  ✗ ' + v for v in previous_violations)}
Choose a completely different word."""

    return f"""You are an expert Islamic scholar creating a daily "Harf by Harf" puzzle.

DATE: {today}
TASK: Generate ONE Arabic Quranic word for a Harf-by-Harf style guessing game.

RULES:
1. The word MUST be a meaningful Quranic Arabic word (noun, verb root, or concept)
2. The word (without diacritics) MUST be 3-5 Arabic letters long
3. The word MUST appear in a real Quranic verse
4. Provide the word both WITH and WITHOUT diacritics (tashkeel)
5. Provide an English hint that helps guess the word without giving it away directly
6. Provide the verse reference in surah:ayah format (e.g. "2:255")

FORBIDDEN words (used recently): {avoided_words}

FORBIDDEN verse refs (used recently - includes ALL games): {avoided_refs}

FORBIDDEN surahs (used in last 30 days - pick a DIFFERENT surah): {avoided_surahs}
{violation_block}

OUTPUT FORMAT: Return a valid JSON object:
{{
  "word": "Arabic word WITHOUT diacritics (for matching, e.g. رحمة)",
  "display": "Arabic word WITH diacritics (for display, e.g. رَحْمَة)",
  "hint": "English hint that helps guess the word",
  "verseRef": "surah:ayah (e.g. 2:255)"
}}

IMPORTANT:
- Return ONLY the JSON object, no markdown
- The word without diacritics must be 3-5 letters
- The hint should be clever but not too obscure
- The hint MUST NOT directly reveal or contain the Arabic word (e.g. if the word is "hear", the hint must not be "hear" or "the word is hear")
- Choose words that are meaningful Islamic concepts
- The verse MUST be from a surah NOT in the forbidden surahs list
- Do NOT include full verse text - only the ref. Verse text will be looked up separately."""


def validate_harf(puzzle, history):
    errors, cooldown_violations, warnings = [], [], []

    word = puzzle.get("word", "")
    display = puzzle.get("display", "")
    hint = puzzle.get("hint", "")
    verse_ref = puzzle.get("verseRef", "")

    if not word:
        errors.append("Missing 'word' field")
    if not display:
        errors.append("Missing 'display' field")
    if not hint:
        errors.append("Missing 'hint' field")
    if not verse_ref:
        errors.append("Missing 'verseRef' field")

    # Check word length (strip diacritics for counting)
    stripped = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', word)
    if len(stripped) < 3 or len(stripped) > 5:
        errors.append(f"Word '{word}' is {len(stripped)} letters (need 3-5)")

    # Cooldown checks
    if word in history["harf"]["words"] or display in history["harf"]["words"]:
        cooldown_violations.append(f"Word '{word}' reused (cooldown)")
    if hint.lower().strip() in history["harf"]["hints"]:
        cooldown_violations.append(f"Hint reused (cooldown)")
    # Hint must not directly reveal the word or contain it as a substring
    hint_lower = hint.lower().strip()
    word_stripped = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', word).lower()
    if hint_lower == word_stripped:
        cooldown_violations.append(f"Hint directly reveals the word '{word_stripped}'")
    elif hint_lower in word_stripped or word_stripped in hint_lower:
        cooldown_violations.append(f"Hint '{hint_lower}' contains or is contained by word '{word_stripped}'")
    # Check verse ref against game-specific AND global cooldown
    if verse_ref:
        if verse_ref in history["harf"]["verseRefs"]:
            cooldown_violations.append(f"Verse ref '{verse_ref}' reused (harf cooldown)")
        elif verse_ref in history["all_verses"]:
            cooldown_violations.append(f"Verse ref '{verse_ref}' reused (cross-game cooldown)")
        # Surah-level cooldown (30 days)
        surah_num = verse_ref.split(":")[0]
        if surah_num in history["harf"]["surahs"]:
            cooldown_violations.append(f"Surah {surah_num} reused (30-day surah cooldown)")

    return errors, cooldown_violations, warnings


# ═══════════════════════════════════════════════════════════════════
# DEDUCTION GENERATOR (Who Am I?)
# ═══════════════════════════════════════════════════════════════════
def build_deduction_prompt(history, today, previous_violations=None):
    avoided_titles = ", ".join(sorted(history["deduction"]["titles"])) or "(none)"
    avoided_characters = ", ".join(sorted(history["deduction"].get("characters", set()))) or "(none)"
    # Merge game-specific + global verse refs
    all_avoided = history["deduction"]["verseRefs"] | history["all_verses"]
    avoided_refs = ", ".join(sorted(all_avoided)) or "(none)"
    avoided_surahs = ", ".join(sorted(history["deduction"]["surahs"], key=lambda x: int(x))) or "(none)"

    violation_block = ""
    if previous_violations:
        violation_block = f"""

CRITICAL - PREVIOUS ATTEMPT FAILED:
{chr(10).join('  ✗ ' + v for v in previous_violations)}
Choose a completely different story/character."""

    return f"""You are an expert Islamic scholar creating a daily "Who Am I?" puzzle for QuranIQ.

DATE: {today}
TASK: Create a mystery-style "Who Am I?" puzzle about ANY figure, character, or group mentioned in the Quran.
This can be a prophet, a ruler (e.g. Pharaoh, Namrud), a righteous person (e.g. Maryam, Luqman), a group (e.g. People of the Cave, People of the Elephant), or even a notable figure like Qarun, Iblis, etc.

RULES:
1. Create an engaging title and intro paragraph that sets the scene WITHOUT revealing the answer
2. The title and intro MUST be completely GENDER-NEUTRAL:
   - NEVER use gendered pronouns (he/she/him/her/his/hers) in the title or intro
   - NEVER use gendered nouns (king/queen, man/woman, mother/father, son/daughter, wife/husband) in the title or intro
   - Use neutral terms: "figure", "soul", "individual", "ruler", "leader", "servant of Allah", "one who...", "this person", "they"
   - BAD: "A powerful queen embarked on a journey that would change her destiny"
   - GOOD: "A powerful ruler embarked on a journey that would change the course of their destiny"
3. Provide exactly 6 progressive clues written in FIRST PERSON (as if the character is speaking about themselves)
   - Example: "I was thrown into a fire, but Allah made it cool and peaceful for me" (not "He was thrown...")
   - For groups, use "We" instead of "I"
   - Clues MAY reveal gender gradually (since the player is actively solving), but the intro and title MUST NOT
4. Create exactly 4 categories for the player to guess, each with exactly 5 options and 1 correct answer
5. The 4 categories should cover: the identity (who am I?), the trial/event, a key element (place/object), and the outcome
6. Include a relevant Quranic verse reference in surah:ayah format
7. All clues and answers must be Quranically accurate
8. Vary the character types - don't always use prophets. Include rulers, righteous people, groups, and other Quranic figures
9. **CRITICAL** All 4 INCORRECT options (distractors) in each category MUST be DEFINITELY FALSE for the chosen character/figure.
   - Do NOT use facts that are actually true about the character as distractors.
   - Example (Prophet Ibrahim): If the answer is "Prophet Ibrahim", do NOT use "Built a sacred house" as an incorrect option, because he did build the Kaaba. That makes the puzzle confusing and unfair. Every distractor must unequivocally belong to someone else.

FORBIDDEN titles (used recently): {avoided_titles}

FORBIDDEN characters (used recently): {avoided_characters}

FORBIDDEN verse refs (used recently - includes ALL games): {avoided_refs}

FORBIDDEN surahs (used in last 30 days - pick a DIFFERENT surah): {avoided_surahs}
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
  "verseRef": "surah:ayah (e.g. 27:44)"
}}

IMPORTANT:
- Return ONLY the JSON object, no markdown
- Do NOT include full verse text - only the ref. Verse text will be looked up separately.
- ALL clues MUST be in first person ("I was...", "I did...", "My people...") - the character is speaking
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
        # Reject empty or blank options (LLM sometimes generates null/empty slots)
        for i, opt in enumerate(opts):
            if not opt or not str(opt).strip():
                errors.append(f"Category '{key}' has empty/whitespace option at position {i+1}")
        if not cat.get("answer"):
            errors.append(f"Category '{key}' missing answer")
        elif cat["answer"] not in opts:
            errors.append(f"Category '{key}' answer '{cat['answer']}' not in options")

    # Require verseRef (new format) - accept verse field for backwards compat
    verse_ref = puzzle.get("verseRef", "")
    if not verse_ref:
        # Try to extract from legacy 'verse' field
        verse_ref = extract_ref(puzzle.get("verse", ""))
        if verse_ref:
            puzzle["verseRef"] = verse_ref
        else:
            errors.append("Missing 'verseRef' field")

    # Gender-leak check in title and intro (using word boundaries to avoid false positives)
    gender_patterns = [
        r'\bhe\b', r'\bshe\b', r'\bhim\b', r'\bher\b', r'\bhis\b', r'\bhers\b',
        r'\bking\b', r'\bqueen\b', r'\bmother\b', r'\bfather\b', r'\bson\b', r'\bdaughter\b',
        r'\bwife\b', r'\bhusband\b', r'\bwoman\b', r'\bman\b', r'\bprince\b', r'\bprincess\b',
        r'\bboy\b', r'\bgirl\b', r'\bbrother\b', r'\bsister\b',
    ]
    title_lower = puzzle.get("title", "").lower()
    intro_lower = puzzle.get("intro", "").lower()
    for gp in gender_patterns:
        match = re.search(gp, title_lower)
        if match:
            warnings.append(f"Title may reveal gender (contains '{match.group()}')")
            break
    for gp in gender_patterns:
        match = re.search(gp, intro_lower)
        if match:
            cooldown_violations.append(f"Intro reveals gender (contains '{match.group()}'). Must be gender-neutral.")
            break

    # Cooldown
    title = puzzle.get("title", "").lower().strip()
    if title in history["deduction"]["titles"]:
        cooldown_violations.append(f"Title '{title}' reused (cooldown)")

    # Check cooldown for character identity (supports both 'identity' and 'prophet' keys)
    identity_cat = cats.get("identity", cats.get("prophet", {}))
    character_answer = identity_cat.get("answer", "")
    characters_history = history["deduction"].get("characters", set())
    if character_answer in characters_history:
        cooldown_violations.append(f"Character '{character_answer}' reused (cooldown)")

    # Check verse ref against game-specific AND global cooldown
    if verse_ref:
        if verse_ref in history["deduction"]["verseRefs"]:
            cooldown_violations.append(f"Verse ref '{verse_ref}' reused (deduction cooldown)")
        elif verse_ref in history["all_verses"]:
            cooldown_violations.append(f"Verse ref '{verse_ref}' reused (cross-game cooldown)")
        # Surah-level cooldown (30 days)
        surah_num = verse_ref.split(":")[0]
        if surah_num in history["deduction"]["surahs"]:
            cooldown_violations.append(f"Surah {surah_num} reused (30-day surah cooldown)")

    return errors, cooldown_violations, warnings


# ═══════════════════════════════════════════════════════════════════
# SCRAMBLE GENERATOR
# ═══════════════════════════════════════════════════════════════════
def build_scramble_prompt(history, today, previous_violations=None):
    # Merge game-specific + global verse refs
    all_avoided = set()
    for ref in history["scramble"]["references"]:
        all_avoided.add(ref)
        extracted = extract_ref(ref)
        if extracted:
            all_avoided.add(extracted)
    all_avoided |= history["all_verses"]
    avoided_refs = ", ".join(sorted(all_avoided)) or "(none)"
    avoided_surahs = ", ".join(sorted(history["scramble"]["surahs"], key=lambda x: int(x))) or "(none)"

    violation_block = ""
    if previous_violations:
        violation_block = f"""

CRITICAL - PREVIOUS ATTEMPT FAILED:
{chr(10).join('  ✗ ' + v for v in previous_violations)}
Choose a completely different verse from a DIFFERENT surah."""

    return f"""You are an expert Islamic scholar creating a daily "Ayah Scramble" puzzle.

DATE: {today}
TASK: Choose a significant, well-known Quranic verse for a scramble game.
Players will rearrange Arabic segments to reconstruct the original verse.

VERSE SELECTION GUIDANCE:
Pick verses of significance - ones that Muslims commonly memorize, reflect upon, or cite.
Examples of the kind of verses to choose (DO NOT use these exact ones if forbidden):
- Verses about Allah's attributes (e.g. Ayat al-Kursi style, Surah Ikhlas style)
- Verses with powerful promises or warnings
- Verses about patience, gratitude, tawakkul, or taqwa
- Verses telling key moments in prophetic stories
- Verses with well-known du'as (supplications)
- Verses about the signs of creation (sun, moon, mountains, seas)
- Verses about justice, charity, or family
Avoid obscure legal/inheritance detail verses or repetitive transitional phrases.

RULES:
1. Choose a meaningful, significant Quranic verse (5-15 words long)
2. Provide the verse reference in surah:ayah format (e.g. "2:152")
3. Split the verse into 4-7 consecutive segments (1-3 words each)
4. For each segment, provide its English translation
5. Provide a hint about the verse's theme
6. The verse MUST be from a surah NOT in the forbidden surahs list

FORBIDDEN verse refs (used recently - includes ALL games): {avoided_refs}

FORBIDDEN surahs (used in last 30 days - pick a DIFFERENT surah): {avoided_surahs}
{violation_block}

OUTPUT FORMAT: Return a valid JSON object:
{{
  "verseRef": "surah:ayah (e.g. 2:152)",
  "reference": "Surah Name (surah:ayah)",
  "segments": ["segment boundary description 1", "segment boundary description 2", ...],
  "translations": ["English for segment 1", "English for segment 2", ...],
  "hint": "A hint about the verse's theme or context"
}}

IMPORTANT:
- Return ONLY the JSON object, no markdown
- Do NOT include full Arabic verse text - it will be looked up from the Quran API
- The "segments" array describes how to split the verse (e.g. ["words 1-2", "words 3-4", "words 5-7"])
  OR provide the Arabic segments directly - they will be verified against the API
- translations array must have same length as segments array
- The verse reference must be real and accurate
- The verse MUST be from a surah NOT in the forbidden surahs list"""


def validate_scramble(puzzle, history):
    errors, cooldown_violations, warnings = [], [], []

    # Accept both new format (verseRef) and legacy (reference)
    verse_ref = puzzle.get("verseRef", "")
    if not verse_ref:
        verse_ref = extract_ref(puzzle.get("reference", ""))
        if verse_ref:
            puzzle["verseRef"] = verse_ref

    if not verse_ref and not puzzle.get("reference"):
        errors.append("Missing 'verseRef' or 'reference'")
    if not puzzle.get("hint"):
        errors.append("Missing 'hint'")

    # Validate translations
    translations = puzzle.get("translations", [])
    segments = puzzle.get("segments", puzzle.get("words", []))
    if translations and segments and len(translations) != len(segments):
        errors.append(f"translations length ({len(translations)}) must match segments length ({len(segments)})")
    if segments and (len(segments) < 4 or len(segments) > 7):
        errors.append(f"Scramble must have 4-7 segments, got {len(segments)}")

    # Cooldown - check both game-specific and global
    ref_str = puzzle.get("reference", "")
    if ref_str in history["scramble"]["references"]:
        cooldown_violations.append(f"Reference '{ref_str}' reused (scramble cooldown)")
    if verse_ref:
        if verse_ref in history["all_verses"]:
            cooldown_violations.append(f"Verse ref '{verse_ref}' reused (cross-game cooldown)")
        # Surah-level cooldown (30 days)
        surah_num = verse_ref.split(":")[0]
        if surah_num in history["scramble"]["surahs"]:
            cooldown_violations.append(f"Surah {surah_num} reused (30-day surah cooldown)")

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


def build_juz_prompt(history, today=None, previous_violations=None):
    """Build the LLM prompt for Juz Journey puzzle generation."""
    if today is None:
        today = datetime.utcnow().strftime("%Y-%m-%d")
    juz_number = get_juz_number_for_today(today)

    # Juz Journey only avoids its own used verses (30-day Ramadan window)
    avoided_verses = ", ".join(sorted(history["juz"]["verses"])) or "(none)"

    violation_block = ""
    if previous_violations:
        violation_block = f"""

CRITICAL - PREVIOUS ATTEMPT FAILED:
{chr(10).join('  ✗ ' + v for v in previous_violations)}
Fix these issues in your next attempt."""

    return f"""You are an expert Islamic scholar creating a daily "Juz Journey" puzzle for Ramadan.

TASK: Generate a puzzle for JUZ {juz_number} of the Quran.

RULES:
1. Choose a short, impactful, representative verse from Juz {juz_number}
2. The verse MUST actually be in Juz {juz_number} - verify the surah and ayah numbers
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

FORBIDDEN verse refs (used recently - includes ALL games): {avoided_verses}
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

    # Cooldown - verse reuse check (game-specific only)
    if verse.get("surah_number") and verse.get("ayah_number"):
        ref = f"{verse['surah_number']}:{verse['ayah_number']}"
        if ref in history["juz"]["verses"]:
            cooldown_violations.append(f"Verse {ref} reused (juz cooldown)")
        # Juz Journey is exempt from cross-game cooldown
        # elif ref in history["all_verses"]:
        #     cooldown_violations.append(f"Verse {ref} reused (cross-game cooldown)")

    return errors, cooldown_violations, warnings


# ═══════════════════════════════════════════════════════════════════
# QURAN API - VERSE TEXT LOOKUP
# ═══════════════════════════════════════════════════════════════════
QURAN_API_BASE = "https://api.quran.com/api/v4"


def fetch_verse_text(ref, max_retries=3):
    """Fetch the Arabic text (Uthmani script) and English translation for a verse ref.

    Uses the Quran.com API to get:
    - Arabic text from word-by-word endpoint (Uthmani script)
    - English from Sahih International translation (resource_id=20)

    Args:
        ref: Verse reference in "surah:ayah" format (e.g. "2:255")
        max_retries: Number of retry attempts on failure (default 3)
    Returns:
        dict with 'arabic' and 'english' keys, or None on failure
    """
    key = ref.strip()

    for attempt in range(max_retries):
        try:
            # Fetch Arabic (Uthmani) + Sahih International translation in one call
            url = f"{QURAN_API_BASE}/verses/by_key/{key}?language=en&words=true&word_fields=text_uthmani,translation&translations=20"
            resp = requests.get(url, timeout=20)
            if resp.status_code != 200:
                print(f"    ⚠ Quran API returned {resp.status_code} for {ref} (attempt {attempt+1}/{max_retries})")
                time.sleep(2 * (attempt + 1))  # exponential backoff
                continue
            data = resp.json()
            verse_data = data.get("verse", {})
            words = verse_data.get("words", [])

            if not words:
                print(f"    ⚠ No words returned for {ref} (attempt {attempt+1}/{max_retries})")
                time.sleep(2 * (attempt + 1))
                continue

            # Build Arabic text from Uthmani script words
            arabic = " ".join(w.get("text_uthmani", "") for w in words if w.get("text_uthmani"))

            # Get proper English translation (Sahih International)
            english = ""
            translations = verse_data.get("translations", [])
            if translations:
                raw_en = translations[0].get("text", "")
                # Strip footnote <sup> tags and their content, then any remaining HTML tags
                cleaned = re.sub(r'<sup[^>]*>[^<]*</sup>', '', raw_en)  # remove footnotes entirely
                english = re.sub(r'<[^>]+>', '', cleaned).strip()  # remove any remaining HTML tags

            if not arabic:
                print(f"    ⚠ Empty Arabic text for {ref} (attempt {attempt+1}/{max_retries})")
                time.sleep(2 * (attempt + 1))
                continue

            # Strip verse number markers (e.g. ١٥٢) that the API appends at the end
            arabic = re.sub(r'\s*[\u0660-\u0669]+\s*$', '', arabic).strip()

            # Build word-by-word translations list (excluding end markers)
            wbw = []
            for w in words:
                if w.get("char_type_name") == "end":
                    continue
                text = w.get("text_uthmani", "")
                trans = w.get("translation", {})
                en_text = trans.get("text", "") if isinstance(trans, dict) else ""
                wbw.append({"arabic": text, "english": en_text})

            return {"arabic": arabic, "english": english, "wbw": wbw}
        except Exception as e:
            print(f"    ⚠ Quran API error for {ref} (attempt {attempt+1}/{max_retries}): {e}")
            time.sleep(2 * (attempt + 1))

    print(f"    ✗ Failed to fetch verse {ref} after {max_retries} attempts")
    return None


def enrich_single_category(cat):
    """Fetch verse text for the 4 item refs in a single Connections category.

    Validates word-in-verse for each item immediately after fetching.
    Returns (cat, mismatches) - mismatches is non-empty if any word fails verification.
    Called per-category inside _generate_single_category so failures only cost 4 API calls.
    """
    mismatches = []

    for item in cat.get("items", []):
        ref = item.get("ref", "")
        if not ref:
            continue
        verse_data = fetch_verse_text(ref)
        if verse_data:
            item["verse"] = verse_data["arabic"]
            item["verseEn"] = verse_data["english"]
            # Overwrite LLM-generated en with authoritative word-by-word translation
            # from the Quran API. This fixes hallucinated/wrong word meanings.
            ar_word = item.get("ar", "")
            if ar_word and verse_data.get("wbw"):
                wbw = verse_data["wbw"]
                # Find the best matching wbw entry for this word
                from difflib import SequenceMatcher
                best_en = None
                best_score = 0.0
                norm_ar = normalize_arabic(ar_word)
                for wbw_entry in wbw:
                    wbw_ar_norm = normalize_arabic(wbw_entry.get("arabic", ""))
                    if wbw_ar_norm and len(wbw_ar_norm) >= 3 and len(norm_ar) >= 3:
                        score = SequenceMatcher(None, wbw_ar_norm, norm_ar).ratio()
                        if score > best_score and score >= 0.75:
                            best_score = score
                            best_en = wbw_entry.get("english", "")
                if best_en:
                    item["en"] = best_en
            if ar_word and not word_in_verse(ar_word, verse_data["arabic"]):
                snippet = verse_data["arabic"][:120]
                msg = (
                    f"Word '{ar_word}' ({item.get('en', '')}) NOT found in verse {ref}. "
                    f"Verse text: {snippet}..."
                )
                mismatches.append(msg)
                print(f"      ✗ {msg}")
            else:
                print(f"      ✓ '{ar_word}' found in {ref}")
        else:
            item["verse"] = ""
            item["verseEn"] = ""
            mismatches.append(f"Could not fetch verse text for '{item.get('ar')}' ({ref})")
        time.sleep(0.3)

    return cat, mismatches


def enrich_harf_with_verses(puzzle):
    """Post-process a Harf puzzle: look up full verse text from Quran API.

    Fetches the Arabic verse and English translation using the verseRef field,
    replacing any LLM-generated verse text with authoritative Quran API data.
    Also validates that the puzzle word actually appears in the cited verse.
    Returns None if word-in-verse validation fails.
    """
    ref = puzzle.get("verseRef", "")
    if not ref:
        print("  ⚠ No verseRef in harf puzzle, skipping verse lookup")
        return puzzle

    print(f"\n  📖 Looking up verse text for Harf by Harf ({ref})...")
    verse_data = fetch_verse_text(ref)
    if verse_data:
        # Extract surah name from ref for display
        surah_num = ref.split(":")[0]
        puzzle["arabicVerse"] = verse_data["arabic"]
        puzzle["verse"] = f"{ref} - {verse_data['english']}"
        print(f"  ✓ Verse text fetched from Quran API")

        # CRITICAL: Validate word-in-verse
        word = puzzle.get("word", "")
        if word:
            if word_in_verse(word, verse_data["arabic"]):
                print(f"  ✓ Word '{word}' verified in verse {ref}")
            else:
                # Also try display field (with diacritics)
                display_word = puzzle.get("display", "")
                if display_word and word_in_verse(display_word, verse_data["arabic"]):
                    print(f"  ✓ Word '{display_word}' (display) verified in verse {ref}")
                else:
                    print(f"  ✗ HARF VALIDATION FAILED: Word '{word}' NOT found in verse {ref}")
                    print(f"  ✗ Verse text: {verse_data['arabic'][:100]}...")
                    print(f"  ✗ Puzzle rejected - will retry with different word/verse")
                    return None
        else:
            print(f"  ⚠ No 'word' field in puzzle, skipping word-in-verse validation")
    else:
        print(f"  ⚠ Could not fetch verse text for {ref}")
        # Keep any LLM-generated text as fallback
        if not puzzle.get("arabicVerse"):
            puzzle["arabicVerse"] = ""
        if not puzzle.get("verse"):
            puzzle["verse"] = ref

    return puzzle
def enrich_scramble_with_verses(puzzle):
    """Post-process a Scramble puzzle: look up full verse text from Quran API.

    Fetches the Arabic verse from the Quran API and splits it into segments,
    replacing any LLM-generated Arabic text with authoritative data.
    """
    ref = puzzle.get("verseRef", "")
    if not ref:
        ref = extract_ref(puzzle.get("reference", ""))
        if ref:
            puzzle["verseRef"] = ref

    if not ref:
        print("  ⚠ No verse ref in scramble puzzle, skipping verse lookup")
        return puzzle

    print(f"\n  📖 Looking up verse text for Scramble ({ref})...")
    verse_data = fetch_verse_text(ref)
    if not verse_data:
        print(f"  ⚠ Could not fetch verse text for {ref}")
        return puzzle

    arabic_from_api = verse_data["arabic"]
    print(f"  ✓ Arabic text fetched: {arabic_from_api[:80]}...")

    # Use word-by-word data from API for both segments and translations
    # This ensures perfect 1:1 alignment between Arabic chunks and English tooltips
    wbw = verse_data.get("wbw", [])
    translations_llm = puzzle.get("translations", [])
    target_segments = len(translations_llm) if translations_llm else 5

    if wbw and len(wbw) >= 3:
        num_words = len(wbw)
        target_segments = max(3, min(7, target_segments, num_words))
        base_size = num_words // target_segments
        remainder = num_words % target_segments

        segments = []
        segment_translations = []
        idx = 0
        for i in range(target_segments):
            size = base_size + (1 if i < remainder else 0)
            if size > 0:
                ar_parts = [wbw[j]["arabic"] for j in range(idx, idx + size)]
                en_parts = [wbw[j]["english"] for j in range(idx, idx + size)]
                segments.append(" ".join(ar_parts))
                segment_translations.append(" ".join(en_parts))
                idx += size

        puzzle["arabic"] = arabic_from_api
        puzzle["words"] = segments
        puzzle["translations"] = segment_translations

        print(f"  ✓ Built {len(segments)} segments from {num_words} wbw entries")
        for i, (seg, trans) in enumerate(zip(segments, segment_translations)):
            print(f"    [{i}] {seg[:50]} → {trans[:60]}")
    else:
        # Fallback: split raw Arabic text (no wbw translations available)
        print(f"  ⚠ No word-by-word data, falling back to raw text split")
        arabic_words = arabic_from_api.split()
        num_words = len(arabic_words)

        if num_words < 3:
            print(f"  ⚠ Verse too short ({num_words} words), keeping as-is")
            puzzle["arabic"] = arabic_from_api
            puzzle["words"] = [arabic_from_api]
            return puzzle

        target_segments = max(3, min(7, target_segments, num_words))
        base_size = num_words // target_segments
        remainder = num_words % target_segments

        segments = []
        idx = 0
        for i in range(target_segments):
            size = base_size + (1 if i < remainder else 0)
            if size > 0:
                segments.append(" ".join(arabic_words[idx:idx + size]))
                idx += size

        puzzle["arabic"] = arabic_from_api
        puzzle["words"] = segments
        # Adjust LLM translations to match segment count
        if len(translations_llm) != len(segments):
            if len(translations_llm) > len(segments):
                puzzle["translations"] = translations_llm[:len(segments)]
            else:
                while len(translations_llm) < len(segments):
                    translations_llm.append("")
                puzzle["translations"] = translations_llm

    # Store full English translation from API for result display
    english_from_api = verse_data.get("english", "")
    if english_from_api:
        puzzle["verseEn"] = english_from_api
        print(f"  ✓ Full English translation stored: {english_from_api[:80]}...")

    print(f"  ✓ Scramble enriched: {len(segments)} segments")
    return puzzle


def enrich_deduction_with_verses(puzzle):
    """Post-process a Deduction puzzle: look up full verse text from Quran API.

    Fetches the Arabic verse and English translation using the verseRef field.
    """
    ref = puzzle.get("verseRef", "")
    if not ref:
        ref = extract_ref(puzzle.get("verse", ""))
        if ref:
            puzzle["verseRef"] = ref

    if not ref:
        print("  ⚠ No verse ref in deduction puzzle, skipping verse lookup")
        return puzzle

    print(f"\n  📖 Looking up verse text for Who Am I? ({ref})...")
    verse_data = fetch_verse_text(ref)
    if verse_data:
        puzzle["arabic"] = verse_data["arabic"]
        puzzle["verse"] = f"{verse_data['english']} ({ref})"
        print(f"  ✓ Verse text fetched from Quran.com API")
    else:
        # Fallback: try alquran.cloud (supports range refs like 40:36-37)
        print(f"  ⚠ Quran.com failed for {ref}, trying alquran.cloud fallback...")
        try:
            alt_resp = requests.get(
                f"https://api.alquran.cloud/v1/ayah/{ref}/en.sahih",
                timeout=20
            )
            if alt_resp.status_code == 200:
                alt_data = alt_resp.json()
                ayah_data = alt_data.get("data", {})
                # alquran.cloud returns English in 'text' for en.sahih edition
                english = ayah_data.get("text", "") or ayah_data.get("translation", "") or ""
                if english:
                    puzzle["verse"] = f"{english} ({ref})"
                    print(f"  ✓ Verse text fetched from alquran.cloud fallback")
                else:
                    raise ValueError("Empty english from alquran.cloud")
            else:
                raise ValueError(f"alquran.cloud returned {alt_resp.status_code}")
        except Exception as e:
            print(f"  ⚠ All verse APIs failed for {ref}: {e}")
        # Last resort: at minimum, store the ref so the UI shows something
        if not puzzle.get("arabic"):
            puzzle["arabic"] = ""
        if not puzzle.get("verse"):
            puzzle["verse"] = ref

    return puzzle


# ═══════════════════════════════════════════════════════════════════
# UNIFIED GENERATION LOOP (harf / deduction / scramble / juz)
# Connections uses generate_connections() - its own category-by-category loop.
# ═══════════════════════════════════════════════════════════════════
GAME_CONFIGS = {
    "connections": {
        "label": "Ayah Connections",
    },
    "harf": {
        "build_prompt": build_harf_prompt,
        "validate": validate_harf,
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
    "roothive": {
        "label": "Root Hive",
    },
}


def describe_root(root, family_words):
    """Ask the model chain for a short, learner-friendly explanation of a root.

    Optional enrichment: returns None on any failure so the caller can fall back
    to the data-driven description. One attempt per model keeps this cheap.
    """
    words = ", ".join(f"{w['lemma']} ({w['gloss']})" for w in family_words[:8])
    prompt = (
        f"The Arabic root {' '.join(root)} appears in the Quran in words such as: {words}.\n"
        "In 2 short sentences for a learner (max 240 characters total), explain the core idea this "
        "root carries and how its derived words grow out of it. Plain English, no Arabic script, "
        "no transliteration of the root letters, no lists.\n"
        'Return JSON only: {"meaning": "..."}'
    )
    for model_config in MODEL_CHAIN:
        raw = call_model(prompt, model_config)
        if not raw or raw in ("RATE_LIMITED", "SKIP"):
            continue
        try:
            meaning = str(parse_json_response(raw).get("meaning", "")).strip()
        except (json.JSONDecodeError, AttributeError):
            continue
        if 40 <= len(meaning) <= 320 and not re.search(r"[\u0600-\u06FF]", meaning):
            return meaning
        print(f"  ⚠ Root description rejected ({len(meaning)} chars)")
    return None


def generate_roothive(history, today):
    """Root Hive is built deterministically from the corpus lexicon; the model is only
    asked for an optional plain-English description of the featured root."""
    from root_hive import index_lexicon, pick_root, build_puzzle

    print(f"\n{'═'*60}")
    print("  Generating: Root Hive")
    print(f"{'═'*60}")
    try:
        with open(ROOT_LEXICON_PATH, encoding="utf-8") as f:
            lexicon = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"  ✗ Could not load root lexicon: {e}")
        return None

    forms = index_lexicon(lexicon)
    root, design = pick_root(lexicon, forms, history["roothive"]["roots"], seed=today)
    if not root:
        print("  ⚠ Every candidate root is in cooldown; allowing repeats")
        root, design = pick_root(lexicon, forms, set(), seed=today)
    if not root:
        print("  ✗ No root could be designed into a hive")
        return None

    family = sorted((lexicon["lemmas"][i] for i in lexicon["roots"][root]["lemmas"]), key=lambda l: -l["count"])
    meaning = describe_root(root, family)
    puzzle = build_puzzle(root, design, lexicon, forms, meaning)
    puzzle["featuredRoot"] = root
    fam = [w["w"] for w in puzzle["words"] if w["family"]]
    print(f"  ✓ Root {puzzle['root']['display']} ({puzzle['root']['translit']}): "
          f"{len(puzzle['words'])} words, {len(fam)} in the root family, max score {puzzle['maxScore']}")
    print(f"    Meaning ({'model' if meaning else 'fallback'}): {puzzle['root']['meaning']}")
    return puzzle


def generate_game(game_type, history, today):
    """Generate a single game puzzle with retries and model fallback chain.

    Fallback chain: GPT-4.1 → DeepSeek-R1 → Gemini Flash → Phi-4
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

            prompt = config["build_prompt"](history, today, previous_violations)
            raw = call_model(prompt, model_config)

            # Rate limited → wait 30s and retry once before falling back
            if raw == "RATE_LIMITED":
                if retry < MAX_RETRIES:
                    print(f"  → Rate limited on {model_label}, waiting 30s before retry...")
                    time.sleep(30)
                    continue  # Retry same model after backoff
                else:
                    print(f"  → Rate limited on {model_label} (no retries left), falling back to next model...")
                    break

            # Malformed/unparseable response → skip this model entirely
            # (retrying with the same model returns the same broken shape)
            if raw == "SKIP":
                print(f"  → Skipping {model_label} (malformed response, won't improve with retry)")
                break

            # Other failure (timeout, auth, etc.) → try next model
            if not raw:
                print(f"  → Failed, trying next attempt/model...")
                continue # Retry same model if attempts left, else loop finishes

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

            # Post-process: enrich with authoritative verse text from Quran API
            if game_type == "scramble":
                enriched = enrich_scramble_with_verses(puzzle)
                if not enriched.get("arabic") or not enriched.get("words"):
                    print(f"  ✗ SCRAMBLE ENRICHMENT FAILED (rejecting): Could not fetch verse text")
                    previous_violations = (previous_violations or []) + ["Could not fetch verse text from API"]
                    continue
                puzzle = enriched
            elif game_type == "harf":
                enriched = enrich_harf_with_verses(puzzle)
                if enriched is None:
                    # Faulty word/verse combination - trigger retry
                    previous_violations = (previous_violations or []) + ["Word NOT found in cited verse (LLM hallucinated the reference)"]
                    continue
                puzzle = enriched
            elif game_type == "deduction":
                puzzle = enrich_deduction_with_verses(puzzle)

            print(f"\n  ✓ {config['label']} generated successfully using {model_label}")
            return puzzle

        # All retries exhausted for this model, try next
        print(f"  → Exhausted retries for {model_label}")

    print(f"\n  ✗ All models failed for {config['label']} after {total_attempt} total attempts.")
    return None


# ═══════════════════════════════════════════════════════════════════
# CONNECTIONS - CATEGORY-BY-CATEGORY GENERATION
# ═══════════════════════════════════════════════════════════════════

def _generate_single_category(cat_index, accumulated_cats, history, today):
    """Generate one Connections category with full model-chain + retry logic.

    Immediately validates structure, cooldown, and word-in-verse (5 API calls)
    before accepting the category.  Returns the enriched category dict, or None
    if every model and every retry was exhausted.
    """
    color = COLORS[cat_index]
    difficulty = DIFFICULTY_LABELS[cat_index]
    previous_violations = None
    total_attempt = 0

    for pass_no in range(1, _MAX_CATEGORY_PASSES + 1):
        narrow_pass = pass_no > 1
        if narrow_pass:
            print(f"  ↻ Second pass for category {cat_index+1} after {_SECOND_PASS_COOLDOWN_S}s cooldown (narrowed passages)...")
            time.sleep(_SECOND_PASS_COOLDOWN_S)
            _PROVIDER_FAILURES.clear()
        for model_config in MODEL_CHAIN:
            model_label = model_config["label"]
            print(f"    Trying: {model_label}")

            for retry in range(1, MAX_RETRIES + 1):
                total_attempt += 1
                print(f"    Attempt {total_attempt} (retry {retry}/{MAX_RETRIES})...")

                # Inject theme pivot logic if we've failed multiple times or the last failure was a theme violation
                force_pivot = (retry > 2) or bool(
                    previous_violations and
                    any("theme" in str(v).lower() for v in previous_violations)
                )
                prompt = build_single_category_prompt(
                    history, today, cat_index, accumulated_cats, previous_violations, force_pivot=force_pivot, narrow_pass=narrow_pass
                )
                raw = call_model(prompt, model_config)

                if raw == "RATE_LIMITED":
                    if retry < MAX_RETRIES:
                        print(f"    Rate limited on {model_label}, waiting 30s...")
                        time.sleep(30)
                        continue
                    else:
                        print(f"    Rate limited on {model_label} (no retries left), falling back...")
                        break

                if raw == "SKIP":
                    if _provider_is_unhealthy(model_label):
                        print(f"    Skipping {model_label} (marked unhealthy earlier this run)")
                    else:
                        print(f"    Skipping {model_label} (malformed response, won't improve with retry)")
                    break

                if not raw:
                    print(f"    Failed ({model_label}), trying next attempt/model...")
                    continue

                try:
                    cat = parse_json_response(raw)
                except json.JSONDecodeError as e:
                    print(f"    ✗ JSON parse error: {e}")
                    continue

                errors, violations, warnings = validate_single_category(
                    cat, cat_index, history, accumulated_cats
                )

                if errors:
                    print(f"    ✗ Structural errors: {errors}")
                    continue

                if violations:
                    print(f"    ✗ Violations: {violations}")
                    previous_violations = violations
                    continue

                if warnings:
                    print(f"    ⚠ Warnings (accepted): {warnings}")

                # Conditional self-grade (cost gate): only spend an API call
                # when the cheap keyword check cannot decide. On a typical day
                # this is a no-op; it fires on the ambiguous #227 shape.
                sg_go, sg_why = _should_self_grade(cat)
                if sg_go:
                    print(f"    \U0001f9d0 Self-grading ({sg_why})...")
                    sg_verdict, sg_bad, sg_reason, _sg_raw = self_grade_category(cat, model_config)
                    if sg_verdict == "fail" and sg_bad:
                        off_theme = [
                            f"Item {i} ({cat['items'][i-1].get('en','')!r}) doesn't fit "
                            f"the '{cat.get('nameEn')}' theme"
                            for i in sg_bad
                        ]
                        detail = f" ({sg_reason})" if sg_reason else ""
                        grade_violations = [
                            f"Semantic coherence: {cat.get('nameEn')}{detail}. "
                            + "; ".join(off_theme)
                            + ". Pick items that are each a concrete example of the theme."
                        ]
                        print(f"    \u2717 Self-grade FAILED: items {sg_bad} off-theme")
                        for v in grade_violations:
                            print(f"        {v}")
                        previous_violations = grade_violations
                        continue
                    if sg_verdict == "pass":
                        print(f"    \u2713 Self-grade passed (all 4 items fit theme)")
                    else:
                        print(f"    \u26a0\ufe0f Self-grade skipped; trusting keyword check")
                else:
                    print(f"    \u2713 Self-grade not needed ({sg_why})")

                # Verify words appear in their cited verses (only 5 refs - fast feedback)
                print(f"    📖 Verifying {len(cat.get('items', []))+1} verse refs...")
                cat, mismatches = enrich_single_category(cat)

                if mismatches:
                    print(f"    ✗ Word-in-verse failed ({len(mismatches)} issue(s)):")
                    for m in mismatches:
                        print(f"        {m}")
                    _seen = set(previous_violations or [])
                    previous_violations = (previous_violations or []) + [v for v in mismatches if v not in _seen]
                    continue

                print(
                    f"    ✓ Category {cat_index+1} ({color}, {difficulty}) accepted: "
                    f"\"{cat.get('nameEn')}\""
                )
                return cat

            print(f"    Exhausted retries for {model_label}")

    print(f"  ✗ All models failed for category {cat_index+1} after {total_attempt} attempts.")
    return None



# ── Connections per-category checkpointing (Oct 2026) ────────────────
# A Connections run can take hours and be killed (e.g. GitHub's 6h job
# timeout) after categories 1–3 were accepted. Previously those accepted
# categories lived only in memory, so every retry regenerated the whole
# game. Now each accepted category is checkpointed the moment it is
# accepted, and a later run resumes from it instead of starting over.
# The checkpoint lives in data/checkpoints/ (NOT data/history/, so
# load_history() never sees it) and under data/ so the workflow's
# `git add data/` step (if: always()) commits it even when the job is
# cancelled — verified on the 29 Oct timeout kill, where the always()
# commit step still ran after the cancellation.
CHECKPOINT_DIR = os.path.join(DATA_DIR, "checkpoints")


def _connections_checkpoint_path(today):
    return os.path.join(CHECKPOINT_DIR, f"{today}-connections.json")


def _category_refs(cat):
    refs = set()
    if isinstance(cat, dict):
        for item in cat.get("items", []):
            if isinstance(item, dict) and item.get("ref"):
                refs.add(item["ref"])
    return refs


def _collect_today_refs(today_puzzles):
    """All verse refs already used by today's other games. Scans
    recursively for 'surah:ayah' strings, excluding any connections entry
    itself. Those games were built without knowledge of the checkpointed
    categories, so their refs win on collision."""
    refs = set()
    verse_re = re.compile(r"^\d+:\d+$")

    def walk(node):
        if isinstance(node, dict):
            for key, value in node.items():
                if key == "connections":
                    continue
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)
        elif isinstance(node, str) and verse_re.match(node):
            refs.add(node)

    walk(today_puzzles or {})
    return refs


def _valid_checkpoint_category(cat):
    if not isinstance(cat, dict):
        return False
    items = cat.get("items")
    if not isinstance(items, list) or not items:
        return False
    return all(isinstance(i, dict) and i.get("verse") and i.get("ref") for i in items)


def _load_connections_checkpoint(today, today_puzzles=None):
    """Return resumed categories (possibly empty). Drops structurally
    invalid categories and any category whose refs collide with today's
    already-generated games."""
    path = _connections_checkpoint_path(today)
    if not os.path.exists(path):
        return []
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"  ⚠ Ignoring unreadable Connections checkpoint: {e}")
        return []
    if data.get("date") != today:
        return []
    cats = data.get("categories", [])
    if not isinstance(cats, list):
        return []
    taken = _collect_today_refs(today_puzzles)
    resumed = []
    for cat in cats:
        # Truncate (don't skip) at the first bad category: colors and
        # difficulties are tied to category position, so resuming must
        # always be a prefix of the list, never a gappy subset.
        if not _valid_checkpoint_category(cat):
            name = cat.get("nameEn", "?") if isinstance(cat, dict) else "?"
            print(f"  ⚠ Truncating checkpoint at invalid category: {name}")
            break
        if _category_refs(cat) & taken:
            print(f"  ⚠ Truncating checkpoint at category {cat.get('nameEn', '?')!r}: verse refs already used by today's other games")
            break
        resumed.append(cat)
    if resumed:
        print(f"  ↻ Resuming Connections from checkpoint: {len(resumed)}/4 categories already accepted")
    return resumed


def _save_connections_checkpoint(today, cats):
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    tmp = _connections_checkpoint_path(today) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"date": today, "categories": cats}, f, ensure_ascii=False, indent=2)
    os.replace(tmp, _connections_checkpoint_path(today))


def _clear_connections_checkpoint(today):
    try:
        os.remove(_connections_checkpoint_path(today))
    except OSError:
        pass


def generate_connections(history, today, today_puzzles=None, resume=True):
    """Generate the full Connections puzzle one category at a time.

    Each category is a focused LLM call (not one-shot for all 16 items).
    Accumulated context is passed forward so later categories automatically
    avoid refs, themes, and word-roots already chosen in earlier ones.
    Word-in-verse verification fires per category (5 API calls) rather than
    after all 16 items are generated, so bad refs are caught and fixed early.
    """
    print(f"\n{'═'*60}")
    print(f"  Generating: Ayah Connections (category-by-category)")
    print(f"{'═'*60}")

    # Seed the global verse-avoidance set with today's already-generated
    # games, so fresh categories steer clear of their refs too (on a retry
    # day those games were built without knowledge of this game).
    history["all_verses"] |= _collect_today_refs(today_puzzles)

    accumulated_cats = _load_connections_checkpoint(today, today_puzzles) if resume else []

    for cat_index in range(len(accumulated_cats), 4):
        color = COLORS[cat_index]
        difficulty = DIFFICULTY_LABELS[cat_index]
        print(f"\n  ── Category {cat_index+1}/4 ({color}, {difficulty}) ──")

        cat = _generate_single_category(cat_index, accumulated_cats, history, today)
        if cat is None:
            print(f"  ✗ Could not generate category {cat_index+1} - Connections failed.")
            return None

        accumulated_cats.append(cat)
        _save_connections_checkpoint(today, accumulated_cats)

    puzzle = {"categories": accumulated_cats}

    # Final structural sanity check across all 4 categories
    errors, cooldown_violations, warnings = validate_connections(puzzle, history)
    if errors:
        print(f"  ✗ Final cross-category validation errors: {errors}")
        # A validation failure means the set as a whole is bad; drop the
        # checkpoint so the next run regenerates from scratch instead of
        # re-validating the same failing set forever.
        _clear_connections_checkpoint(today)
        return None
    if cooldown_violations:
        # Shouldn't happen if per-category validation worked, but log it
        print(f"  ⚠ Final validation warnings (puzzle accepted): {cooldown_violations}")

    print(f"\n  ✓ Ayah Connections generated successfully (4 categories, 20 verses verified)")
    _clear_connections_checkpoint(today)
    return puzzle


def main():
    import sys
    today = datetime.utcnow().strftime("%Y-%m-%d")
    force_regen = False

    if "--date" in sys.argv:
        try:
            today = sys.argv[sys.argv.index("--date") + 1]
        except IndexError:
            pass

    if "--force" in sys.argv:
        force_regen = True

    # Check if already generated today (supports partial regeneration)
    today_file = os.path.join(HISTORY_DIR, f"{today}.json")
    existing_puzzles = {}
    if os.path.exists(today_file):
        try:
            with open(today_file) as f:
                existing_puzzles = json.load(f)
        except (json.JSONDecodeError, KeyError):
            existing_puzzles = {}

        # Check which core games already exist
        core_games = ["connections", "harf", "deduction", "scramble", "juz", "roothive"]
        missing_games = [g for g in core_games if g not in existing_puzzles]

        if not missing_games and not force_regen:
            # Validate loaded puzzles to ensure they are not corrupted (e.g. empty verses)
            valid_history = True
            for g in core_games:
                if g == "connections":
                    cats = existing_puzzles[g].get("categories", [])
                    for cat in cats:
                        for item in cat.get("items", []):
                            if not item.get("verse"):
                                print(f"  ⚠ Found corrupt data in history (empty item verse): {g}")
                                valid_history = False
                                break
                        if not valid_history: break
                if not valid_history: break

            if not valid_history:
                print("  ⚠ History contains corrupted data. Will regenerate affected games.")
                existing_puzzles = {} # Force full regeneration
                force_regen = True
            else:
                print(f"All puzzles for {today} already exist and are valid. Skipping generation.")
                # Still write output files from history
                try:
                    for game_type, output_path in OUTPUT_FILES.items():
                        puzzle_data = existing_puzzles.get(game_type)
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
                return

        if not force_regen:
            print(f"Partial history found for {today}. Missing: {', '.join(missing_games)}")
            print(f"Will regenerate only missing games.")
        else:
            print(f"Partial history found for {today}. Missing: {', '.join(missing_games)}")
            print(f"Will regenerate only missing games.")

    if not MINIMAX_API_KEY and not KIMI_API_KEY and not DEEPSEEK_API_KEY:
        print("ERROR: No API credentials set.")
        print("  Set at least one of: MINIMAX_API_KEY, KIMI_API_KEY, DEEPSEEK_API_KEY.")
        return 1

    print(f"Available APIs:")
    if MINIMAX_API_KEY:
        print(f"  ✓ MiniMax API (M3)")
    else:
        print(f"  ✗ MiniMax API (MINIMAX_API_KEY not set)")
    if KIMI_API_KEY:
        print(f"  ✓ Kimi API (kimi-k3)")
    else:
        print(f"  ✗ Kimi API (KIMI_API_KEY not set)")
    if DEEPSEEK_API_KEY:
        print(f"  ✓ DeepSeek API (deepseek-v4-pro)")
    else:
        print(f"  ✗ DeepSeek API (DEEPSEEK_API_KEY not set)")

    # Load history for cooldown enforcement (exclude today to allow replacing buggy attempts)
    history = load_history(exclude_date=today)
    print(f"\nHistory loaded:")
    print(f"  Connections: {len(history['connections']['themes'])} themes, "
          f"{len(history['connections']['verses'])} verses")
    print(f"  Harf by Harf: {len(history['harf']['words'])} words, "
          f"{len(history['harf']['verseRefs'])} verse refs, "
          f"{len(history['harf']['surahs'])} surahs blocked (30-day)")
    print(f"  Deduction: {len(history['deduction']['titles'])} titles, "
          f"{len(history['deduction']['characters'])} characters, "
          f"{len(history['deduction']['verseRefs'])} verse refs, "
          f"{len(history['deduction']['surahs'])} surahs blocked (30-day)")
    print(f"  Scramble: {len(history['scramble']['references'])} references, "
          f"{len(history['scramble']['surahs'])} surahs blocked (30-day)")
    print(f"  Juz Journey: {len(history['juz']['juz_numbers'])} juz, "
          f"{len(history['juz']['verses'])} verses")
    print(f"  Global: {len(history['all_verses'])} unique verse refs across ALL games")

    # Determine which games to generate
    # Juz Journey only generates during Ramadan (Feb 18 - Mar 20, 2026)
    game_types = ["connections", "harf", "deduction", "scramble"]
    today_dt = datetime.strptime(today, "%Y-%m-%d")
    if RAMADAN_START <= today_dt <= RAMADAN_END:
        game_types.append("juz")
        juz_num = get_juz_number_for_today(today)
        print(f"\n  \U0001f319 Ramadan mode: Generating Juz Journey (Juz {juz_num})")
    else:
        print(f"\n  Juz Journey: Skipped (not during Ramadan)")
    game_types.append("roothive")  # no rate-limited generation, so it runs last

    # Generate all games (skip games already in partial history)
    all_puzzles = dict(existing_puzzles)  # Start with any existing puzzles
    failed_games = []
    generated_count = 0

    for i, game_type in enumerate(game_types):
        # Skip games that already exist in today's history
        if game_type in existing_puzzles:
            print(f"\n  ✓ {GAME_CONFIGS[game_type]['label']}: already generated, skipping")
            continue

        # Wait 60s between API calls to respect rate limits
        if generated_count > 0 and game_type != "roothive":
            print(f"\n  ⏳ Waiting 60 seconds before next game (rate limit)...")
            time.sleep(60)

        if game_type == "connections":
            puzzle = generate_connections(history, today, today_puzzles=existing_puzzles, resume=not force_regen)
        elif game_type == "roothive":
            puzzle = generate_roothive(history, today)
        else:
            puzzle = generate_game(game_type, history, today)
        generated_count += 1
        if puzzle:
            # (Enrichment/validation for other games is handled inside generate_game)

            all_puzzles[game_type] = puzzle

            # Update the global all_verses set so subsequent games avoid these refs
            if game_type == "connections":
                for cat in puzzle.get("categories", []):
                    cat_ref = cat.get("verse", {}).get("ref")
                    if cat_ref:
                        history["all_verses"].add(cat_ref)
                    for item in cat.get("items", []):
                        if item.get("ref"):
                            history["all_verses"].add(item["ref"])
            elif game_type == "harf":
                ref = puzzle.get("verseRef")
                if ref:
                    history["all_verses"].add(ref)
            elif game_type == "deduction":
                ref = puzzle.get("verseRef")
                if ref:
                    history["all_verses"].add(ref)
            elif game_type == "scramble":
                ref = puzzle.get("verseRef")
                if ref:
                    history["all_verses"].add(ref)
            elif game_type == "juz":
                # Juz Journey is Ramadan-only and exempt from global cross-game cooldown
                pass
        else:
            failed_games.append(game_type)

    # Print summary
    sep = '=' * 60
    print(f"\n{sep}")
    print(f"  GENERATION SUMMARY for {today}")
    print(f"{sep}")
    for game_type in game_types:
        status = "\u2713" if game_type in all_puzzles else "\u2717 FAILED"
        print(f"  {status} {GAME_CONFIGS[game_type]['label']}")

    # Always save successful puzzles to history (enables partial regeneration on retry)
    if all_puzzles:
        save_to_history(all_puzzles, today)
        successful = [g for g in game_types if g in all_puzzles]
        print(f"\n  ✓ Saved {len(successful)} puzzle(s) to history/{today}.json")
        print(f"    Saved: {', '.join(successful)}")
        if failed_games:
            print(f"    Missing: {', '.join(failed_games)} (will retry on next run)")

    # ALL games must succeed before writing output files and deploying
    if failed_games:
        print(f"\n  \u2717 {len(failed_games)} game(s) failed: {', '.join(failed_games)}")
        print(f"  \u2717 NOT writing output files - page will NOT be updated.")
        print(f"  \u2717 Previous day's puzzles remain live until all games succeed.")
        print(f"  i Successful puzzles saved to history - next run will only regenerate failed games.")
        return 1

    # All games succeeded - write output files
    for game_type, puzzle in all_puzzles.items():
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

    print(f"\n{sep}")
    print(f"  ✓ ALL {len(game_types)} puzzles generated and saved!")
    print(f"  ✓ History saved to history/{today}.json")
    print(f"  ✓ Global verse coverage: {len(history['all_verses'])} unique verses tracked")
    print(f"  ✓ Page will be updated with today's puzzles.")
    print(f"{sep}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
