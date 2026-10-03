#!/usr/bin/env python3
"""
Build data/root_lexicon.json for the Root Hive game.

Sources
  - Quranic Arabic Corpus morphology v0.4 (corpus.quran.com, GNU GPL), via the
    cleaned fork at github.com/mustafa0x/quran-morphology: root, lemma and
    part-of-speech for every word segment in the Quran.
  - quran.com API v4 word-by-word English translations, used to give each
    lemma a short English gloss and an example verse.

Run once (or whenever the lexicon format changes):
    python3 scripts/build_root_lexicon.py [--cache DIR]

The output is committed; the daily generator only reads it.
"""
import argparse
import json
import os
import re
import sys
import time
from collections import Counter, defaultdict

import requests

MORPH_URL = "https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt"
WBW_URL = ("https://api.quran.com/api/v4/verses/by_chapter/{ch}"
           "?words=true&word_fields=text_uthmani&per_page=50&page={page}")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(SCRIPT_DIR, "..", "data", "root_lexicon.json")

sys.path.insert(0, SCRIPT_DIR)
from root_hive import hive_normalize  # noqa: E402


def fetch(url, retries=4):
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=30)
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            if attempt == retries - 1:
                raise
            print(f"  retry {attempt + 1} for {url}: {e}")
            time.sleep(2 ** attempt)


def load_morphology(cache_dir):
    path = os.path.join(cache_dir, "quran-morphology.txt")
    if not os.path.exists(path):
        print("Downloading morphology...")
        with open(path, "w", encoding="utf-8") as f:
            f.write(fetch(MORPH_URL).content.decode("utf-8"))
    with open(path, encoding="utf-8") as f:
        return f.read().splitlines()


def load_wbw(cache_dir):
    """Return {(surah, ayah, word_pos): english_gloss}."""
    path = os.path.join(cache_dir, "wbw_en.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        return {tuple(map(int, k.split(":"))): v for k, v in raw.items()}

    print("Downloading word-by-word translations (114 chapters)...")
    out = {}
    for ch in range(1, 115):
        page = 1
        while page:
            data = fetch(WBW_URL.format(ch=ch, page=page)).json()
            for v in data["verses"]:
                s, a = map(int, v["verse_key"].split(":"))
                for w in v["words"]:
                    if w.get("char_type_name") == "word":
                        out[(s, a, w["position"])] = (w.get("translation") or {}).get("text") or ""
            page = data["pagination"].get("next_page")
        print(f"  chapter {ch} done", end="\r")
    print()
    with open(path, "w", encoding="utf-8") as f:
        json.dump({f"{s}:{a}:{p}": t for (s, a, p), t in out.items()}, f, ensure_ascii=False)
    return out


_LEADING = re.compile(
    r"^(?:(?:and|so|then|but|or|indeed|surely|verily|certainly|nay|that|which|who|"
    r"a|an|the|he|she|they|we|you|i|it|will|shall|do|does|did|not|"
    r"my|our|your|his|her|their|its|for|with|of|in|from|by|those)\s+)+",
    re.IGNORECASE)
_TRAILING = re.compile(r"\s+(?:me|us|you|him|her|them|it)$", re.IGNORECASE)


def clean_gloss(text):
    t = re.sub(r"\([^)]*\)|\[[^\]]*\]", " ", text or "")
    t = re.sub(r"\s+", " ", t).strip(" ,;.\"'")
    # Strip conjunctions, articles and subject pronouns so inflected occurrences
    # ("and the book", "we endure") pool into one dictionary-style gloss.
    stripped = _TRAILING.sub("", _LEADING.sub("", t)).strip()
    return stripped or t


def word_type(pos, feats):
    if "ACT_PCPL" in feats:
        return "active participle"
    if "PASS_PCPL" in feats:
        return "passive participle"
    if "VN" in feats:
        return "verbal noun"
    if pos == "V":
        return "verb"
    if "PN" in feats:
        return "proper noun"
    if "ADJ" in feats:
        return "adjective"
    return "noun"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.environ.get("ROOT_LEXICON_CACHE", "/tmp/root_lexicon_cache"))
    args = ap.parse_args()
    os.makedirs(args.cache, exist_ok=True)

    morph = load_morphology(args.cache)
    wbw = load_wbw(args.cache)

    # Group morphology segments into words: (s, a, w) -> list of segments
    words = defaultdict(list)
    for line in morph:
        parts = line.split("\t")
        if len(parts) != 4:
            continue
        loc, form, pos, feats = parts
        s, a, w, _seg = map(int, loc.split(":"))
        words[(s, a, w)].append((form, pos, feats.split("|")))

    lemmas = {}  # (root, lemma) -> info
    for key, segs in words.items():
        # A Quranic word may carry prefixes/suffixes; the stem is the segment with a ROOT.
        stems = [(f, p, ft) for f, p, ft in segs if any(x.startswith("ROOT:") for x in ft)]
        if not stems:
            continue
        form, pos, feats = stems[0]
        root = next(x[5:] for x in feats if x.startswith("ROOT:"))
        lemma = next((x[4:] for x in feats if x.startswith("LEM:")), None)
        if not lemma:
            continue
        vf = next((int(x[3:]) for x in feats if x.startswith("VF:") and x[3:].isdigit()), None)
        info = lemmas.setdefault((root, lemma), {
            "lemma": lemma, "root": root, "type": word_type(pos, feats), "vf": vf,
            "count": 0, "bare_glosses": Counter(), "glosses": Counter(), "examples": [],
        })
        info["count"] += 1
        gloss = clean_gloss(wbw.get(key, ""))
        bare = len(segs) == 1  # no attached prefix/suffix, so the gloss is the lemma's own
        if gloss:
            info["glosses"][gloss.lower()] += 1
            if bare:
                info["bare_glosses"][gloss.lower()] += 1
        # Example verse: first occurrence, upgraded to the first bare occurrence if one exists
        if not info["examples"]:
            info["examples"] = [key, bare]
        elif bare and not info["examples"][1]:
            info["examples"] = [key, True]

    out_lemmas = []
    roots = defaultdict(lambda: {"count": 0, "lemmas": []})
    for (root, lemma), info in sorted(lemmas.items(), key=lambda kv: (kv[0][0], -kv[1]["count"])):
        norm = hive_normalize(lemma)
        if len(norm) < 2:
            continue
        top = (info["bare_glosses"] or info["glosses"]).most_common(3)
        s, a, w = info["examples"][0]
        entry = {
            "lemma": lemma,
            "norm": norm,
            "root": root,
            "type": info["type"],
            "count": info["count"],
            "gloss": top[0][0] if top else "",
            "alt": [g for g, _ in top[1:]],
            "ref": f"{s}:{a}",
            "pos": w,
        }
        if info["vf"] and info["type"] == "verb":
            entry["form"] = info["vf"]
        roots[root]["count"] += info["count"]
        roots[root]["lemmas"].append(len(out_lemmas))
        out_lemmas.append(entry)

    out = {
        "source": ("Quranic Arabic Corpus morphology v0.4 (corpus.quran.com, GNU GPL) via "
                   "github.com/mustafa0x/quran-morphology; English glosses from quran.com word-by-word."),
        "lemmas": out_lemmas,
        "roots": roots,
    }
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {len(out_lemmas)} lemmas across {len(roots)} roots to {OUT_PATH}")


if __name__ == "__main__":
    main()
