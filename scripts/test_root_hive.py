#!/usr/bin/env python3
"""Invariant tests for the Root Hive puzzle builder (run: python3 scripts/test_root_hive.py)."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import root_hive as rh

LEXICON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "root_lexicon.json")

passed = failed = 0


def check(cond, label):
    global passed, failed
    if cond:
        passed += 1
        print(f"  ✓ {label}")
    else:
        failed += 1
        print(f"  ✗ {label}")


print("Normalisation")
check(rh.hive_normalize("رَحْمَة") == "رحمه", "tashkeel stripped, ة -> ه")
check(rh.hive_normalize("إِيمان") == "ايمان", "hamza on alif folded")
check(rh.hive_normalize("مُؤْمِن") == "مومن", "ؤ -> و")
check(rh.hive_normalize("هُدَى") == "هدي", "ى -> ي")
check(rh.hive_normalize("ٱلرَّحْمٰنِ") == "الرحمن", "wasla folded, dagger alif dropped (standard spelling)")
check(rh.root_letters("أمن") == ["ا", "م", "ن"], "root letters normalised")
check(rh.root_letters("ربب") == ["ر", "ب"], "repeated radical de-duplicated")

with open(LEXICON, encoding="utf-8") as f:
    lex = json.load(f)
forms = rh.index_lexicon(lex)

print("\nPuzzle invariants (featured root كتب and 15 seeded picks)")
puzzles = []
design = rh.design_hive("كتب", lex, forms)
check(design is not None, "كتب can be designed into a hive")
puzzles.append(("كتب", rh.build_puzzle("كتب", design, lex, forms)))
for seed in range(15):
    root, d = rh.pick_root(lex, forms, set(), seed=f"seed-{seed}")
    puzzles.append((root, rh.build_puzzle(root, d, lex, forms)))

ok = {k: True for k in ("letters", "center", "family", "size", "score", "senses", "roots_in_hive", "len")}
for root, p in puzzles:
    letters = set([p["center"]] + p["outer"])
    ok["letters"] &= len(p["outer"]) == 6 and len(letters) == 7
    ok["center"] &= all(p["center"] in w["w"] for w in p["words"])
    ok["len"] &= all(len(w["w"]) >= rh.MIN_WORD_LEN for w in p["words"])
    ok["family"] &= sum(w["family"] for w in p["words"]) >= rh.MIN_FAMILY
    ok["size"] &= rh.MIN_WORDS <= len(p["words"]) <= rh.MAX_WORDS
    ok["score"] &= p["maxScore"] == sum(w["points"] for w in p["words"])
    ok["senses"] &= all(w["senses"] and all(s["gloss"] for s in w["senses"]) for w in p["words"])
    ok["roots_in_hive"] &= set(rh.root_letters(root)) <= letters
    for w in p["words"]:
        if not set(w["w"]) <= letters:
            ok["letters"] = False
check(ok["letters"], "7 distinct letters and every word spelled only from them")
check(ok["center"], "every word contains the centre letter")
check(ok["len"], f"every word is at least {rh.MIN_WORD_LEN} letters")
check(ok["family"], f"at least {rh.MIN_FAMILY} root-family words per hive")
check(ok["size"], f"word count within {rh.MIN_WORDS}-{rh.MAX_WORDS}")
check(ok["score"], "maxScore equals the sum of word points")
check(ok["senses"], "every word has at least one glossed sense")
check(ok["roots_in_hive"], "featured root letters are all in the hive")

print("\nDistinct clues")
fsd = rh.build_puzzle("فسد", rh.design_hive("فسد", lex, forms), lex, forms) if rh.design_hive("فسد", lex, forms) else None
if fsd:
    g = {w["w"]: w["senses"][0]["gloss"] for w in fsd["words"]}
    check(g.get("فساد") and g.get("مفسد"), "فساد and مفسد are both in the فسد hive")
check(rh.gloss_key("spreading corruption") == rh.gloss_key("spread corruption"), "gloss_key treats inflections as equal")
check(rh.glosses_overlap("corruption", "spreading corruption"), "a contained meaning counts as overlapping")
check(not rh.glosses_overlap("book", "scribe"), "different meanings do not overlap")
dups = 0
for root, p in puzzles:
    gl = [w["senses"][0]["gloss"] for w in p["words"]]
    dups += sum(rh.glosses_overlap(gl[i], gl[j]) for i in range(len(gl)) for j in range(i + 1, len(gl)))
print(f"  {dups} overlapping gloss pairs left across {len(puzzles)} sample puzzles (the client labels these)")

print("\nCooldown")
root_a, _ = rh.pick_root(lex, forms, set(), seed="2026-10-03")
root_b, _ = rh.pick_root(lex, forms, {root_a}, seed="2026-10-03")
check(root_a and root_b and root_a != root_b, "a root in cooldown is not picked again")
check(rh.pick_root(lex, forms, set(), seed="x")[0] == rh.pick_root(lex, forms, set(), seed="x")[0],
      "picking is deterministic for a seed")
print(f"  {len(rh.candidate_roots(lex, forms))} candidate featured roots")

print(f"\nResults: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
