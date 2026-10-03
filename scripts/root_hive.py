"""
Root Hive — daily puzzle builder.

Seven Arabic letters in a honeycomb: one centre letter (always a radical of the
day's featured root) plus six outer letters. Players build Quranic words
(dictionary forms from the Quranic Arabic Corpus) from those letters, and every
word must use the centre letter. Words from the featured root form its "family".

Spelling is matched loosely, the way Arabic word games usually are: tashkeel and
hamza seats are ignored, ة counts as ه and ى as ي. js/roothive.js
(normalizeHive) applies the same rules and must stay in step with this file.
"""
import random
import re
from collections import Counter
from itertools import combinations

_DIACRITICS = re.compile("[ؐ-ًؚ-ٰٟۖ-ۭـ]")
_FOLD = str.maketrans({
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا",  # أ إ آ ٱ -> ا
    "ؤ": "و",  # ؤ -> و
    "ئ": "ي",  # ئ -> ي
    "ى": "ي",  # ى -> ي
    "ة": "ه",  # ة -> ه
})

ARABIC_LETTERS = "ءابتثجحخدذرزسشصضطظعغفقكلمنهوي"

TRANSLIT = {
    "ء": "ʾ", "ا": "ʾ", "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "ḥ", "خ": "kh",
    "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "ṣ", "ض": "ḍ",
    "ط": "ṭ", "ظ": "ẓ", "ع": "ʿ", "غ": "gh", "ف": "f", "ق": "q", "ك": "k", "ل": "l",
    "م": "m", "ن": "n", "ه": "h", "و": "w", "ي": "y",
}

MIN_WORD_LEN = 3
MIN_LEMMA_COUNT = 2        # non-family words must occur at least this often in the Quran
TARGET_WORDS = 26          # aim for roughly this many valid words per hive
MIN_WORDS, MAX_WORDS = 12, 45
MIN_FAMILY = 4             # featured-root words that must be makeable from the hive
MIN_ROOT_OCCURRENCES = 20  # keep featured roots recognisable


def hive_normalize(text):
    return _DIACRITICS.sub("", text or "").translate(_FOLD)


def root_letters(root):
    """Distinct normalised radicals of a corpus root, e.g. 'أمن' -> ['ا', 'م', 'ن']."""
    return list(dict.fromkeys(hive_normalize(root).replace("ء", "ا")))


def translit_root(root):
    return "-".join(TRANSLIT.get(c, c) for c in hive_normalize(root))


def _mask(word):
    m = 0
    for c in word:
        i = ARABIC_LETTERS.find(c)
        if i < 0:
            return None
        m |= 1 << i
    return m


def _bit(c):
    return 1 << ARABIC_LETTERS.index(c)


def _is_imperfect_lemma(lem):
    """The corpus lists some verbs by an imperfect form (يَتَّكِئُ); players won't guess those."""
    if lem["type"] != "verb":
        return False
    first = lem["norm"][0]
    return first in "ين" or (first == "ت" and lem.get("form") not in (5, 6))


def _acceptable(lem, featured_root):
    if len(lem["norm"]) < MIN_WORD_LEN or _is_imperfect_lemma(lem):
        return False
    return lem["root"] == featured_root or lem["count"] >= MIN_LEMMA_COUNT


def index_lexicon(lexicon):
    """Group lemmas by normalised spelling: {norm: {"mask": int, "lemmas": [...]}}."""
    forms = {}
    for lem in lexicon["lemmas"]:
        if len(lem["norm"]) < MIN_WORD_LEN:
            continue
        m = _mask(lem["norm"])
        if m is not None:
            forms.setdefault(lem["norm"], {"mask": m, "lemmas": []})["lemmas"].append(lem)
    return forms


def _family_norms(root, lexicon, forms):
    norms = set()
    for i in lexicon["roots"][root]["lemmas"]:
        lem = lexicon["lemmas"][i]
        if lem["norm"] in forms and _acceptable(lem, root):
            norms.add(lem["norm"])
    return norms


def _valid_forms(forms, hive_mask, center_bit, featured_root):
    out = []
    for norm, f in forms.items():
        if not f["mask"] & center_bit or f["mask"] & ~hive_mask:
            continue
        if any(_acceptable(l, featured_root) for l in f["lemmas"]):
            out.append(norm)
    return out


def candidate_roots(lexicon, forms):
    """Roots common enough, and with enough derived words, to anchor a puzzle."""
    out = []
    for root, info in lexicon["roots"].items():
        if info["count"] < MIN_ROOT_OCCURRENCES:
            continue
        radicals = root_letters(root)
        if len(radicals) < 2 or len(radicals) > 4 or any(c not in ARABIC_LETTERS for c in radicals):
            continue
        if len(_family_norms(root, lexicon, forms)) >= MIN_FAMILY:
            out.append(root)
    return sorted(out)


def design_hive(root, lexicon, forms):
    """Choose centre + outer letters for a root. Returns a design dict or None."""
    radicals = root_letters(root)
    family = _family_norms(root, lexicon, forms)
    extras_needed = 7 - len(radicals)

    # Letters used by the root's family are the most useful extras; common affix
    # letters keep the wider word list healthy.
    pool = Counter(c for w in family for c in set(w) if c not in radicals)
    candidates = [c for c, _ in pool.most_common(9)]
    for c in "اوينمتله":
        if c not in candidates and c not in radicals:
            candidates.append(c)

    base_mask = 0
    for c in radicals:
        base_mask |= _bit(c)

    best = None
    for combo in combinations(candidates, extras_needed):
        hive_mask = base_mask
        for c in combo:
            hive_mask |= _bit(c)
        for center in radicals:
            valid = _valid_forms(forms, hive_mask, _bit(center), root)
            if not (MIN_WORDS <= len(valid) <= MAX_WORDS):
                continue
            fam = [v for v in valid if v in family]
            if len(fam) < MIN_FAMILY:
                continue
            score = len(fam) * 10 - abs(len(valid) - TARGET_WORDS)
            if best is None or score > best["score"]:
                best = {
                    "score": score,
                    "center": center,
                    "outer": [r for r in radicals if r != center] + list(combo),
                    "valid": valid,
                    "family": fam,
                }
    return best


def _word_points(norm, is_family):
    return max(1, len(norm) - 2) + (2 if is_family else 0)


def _sense(lem):
    out = {k: lem[k] for k in ("lemma", "gloss", "type", "root", "count", "ref", "pos")}
    if lem.get("alt"):
        out["alt"] = lem["alt"]
    if lem.get("form"):
        out["form"] = lem["form"]
    return out


def gloss_key(gloss):
    """Loose identity for an English gloss: "spreading corruption" == "spread corruption"."""
    words = re.findall(r"[a-z]+", (gloss or "").lower())
    stems = {re.sub(r"(ing|ed|es|s)$", "", w) or w for w in words if w not in ("the", "a", "an", "to", "of")}
    return " ".join(sorted(stems))


def glosses_overlap(a, b):
    """True when one gloss's meaning words contain the other's ("corruption" vs "spreading corruption")."""
    ka, kb = set(gloss_key(a).split()), set(gloss_key(b).split())
    return bool(ka) and bool(kb) and (ka <= kb or kb <= ka)


def _distinguish_glosses(words):
    """Give each word in a puzzle its own English gloss where the data allows.

    The corpus often glosses related forms identically (فَساد and مُفْسِد are both
    "spreading corruption"), which makes clues look like a word already found.
    Words take turns, most frequent first, switching to an alternative gloss
    that clashes with no other word's current gloss.
    """
    ordered = sorted(words, key=lambda w: -w["senses"][0]["count"])
    for _ in range(2):  # a second pass lets earlier words yield once later ones are settled
        for w in ordered:
            sense = w["senses"][0]
            others = [o["senses"][0]["gloss"] for o in ordered if o is not w]
            if not any(glosses_overlap(sense["gloss"], g) for g in others):
                continue
            options = [sense["gloss"]] + sense.get("alt", [])
            choice = next((g for g in options if g and not any(glosses_overlap(g, o) for o in others)), None)
            if choice and choice != sense["gloss"]:
                sense["alt"] = [g for g in options if g != choice]
                sense["gloss"] = choice


def default_meaning(root, lexicon):
    """Data-driven fallback description built from the root's commonest glosses."""
    lemmas = sorted((lexicon["lemmas"][i] for i in lexicon["roots"][root]["lemmas"]), key=lambda l: -l["count"])
    glosses, seen_words = [], set()
    for l in lemmas:
        words = set(l["gloss"].split())
        if l["gloss"] and not words & seen_words:  # skip near-duplicates like "spread corruption"
            glosses.append(l["gloss"])
            seen_words |= words
    return "Words from this root carry the sense of: " + ", ".join(glosses[:4]) + "."


def build_puzzle(root, design, lexicon, forms, meaning=None):
    family = set(design["family"])
    words = []
    for norm in sorted(design["valid"], key=lambda n: (len(n), n)):
        is_family = norm in family
        lemmas = [l for l in forms[norm]["lemmas"] if _acceptable(l, root)]
        lemmas.sort(key=lambda l: (l["root"] != root, -l["count"]))
        words.append({
            "w": norm,
            "family": is_family,
            "points": _word_points(norm, is_family),
            "senses": [_sense(l) for l in lemmas],
        })

    _distinguish_glosses(words)

    root_info = lexicon["roots"][root]
    family_all = sorted((lexicon["lemmas"][i] for i in root_info["lemmas"]), key=lambda l: -l["count"])
    others = [_sense(l) for l in family_all if l["norm"] not in family][:10]

    outer = design["outer"][:]
    random.Random(root).shuffle(outer)
    return {
        "center": design["center"],
        "outer": outer,
        "root": {
            "letters": hive_normalize(root),
            "display": " ".join(hive_normalize(root)),
            "translit": translit_root(root),
            "meaning": meaning or default_meaning(root, lexicon),
            "occurrences": root_info["count"],
            "lemmaCount": len(root_info["lemmas"]),
        },
        "words": words,
        "otherFamily": others,
        "maxScore": sum(w["points"] for w in words),
    }


def pick_root(lexicon, forms, avoid_roots, seed):
    """Deterministically pick a featured root not used recently and design its hive."""
    roots = [r for r in candidate_roots(lexicon, forms) if r not in avoid_roots]
    random.Random(seed).shuffle(roots)
    for root in roots[:60]:
        design = design_hive(root, lexicon, forms)
        if design:
            return root, design
    return None, None
