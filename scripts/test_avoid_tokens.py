#!/usr/bin/env python3
"""
Test the avoid_tokens parameter of _distinguish_glosses.

Triggered by #221: a player found بَيَان, مِبين, بَين from the ب-ي-ن
root. The hint then suggested 'بينه' with the clue '4 letters · "clear"
(Noun)'. The user read 'clear' as matching the words they had already
found, and complained that the hint was useless.

Root cause: the root description ('...become clear or evident...') used
the word 'clear', and the new unfound word's gloss was also 'clear'.
The old _distinguish_glosses only checked overlap against OTHER words'
glosses, not against the root description.

Fix: pass the meaning's tokens as `avoid_tokens` so any word whose
gloss shares a token with the description is forced to pick a
non-overlapping alternative.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from root_hive import _distinguish_glosses, _meaning_tokens, gloss_key

PASS = 0
FAIL = 0


def test(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✓ {name}")
    else:
        FAIL += 1
        print(f"  ✗ {name}")
        if detail:
            print(f"    → {detail}")


def make_word(gloss, alts=None, count=0):
    s = {"gloss": gloss, "alt": alts or [], "type": "noun", "root": "x", "ref": "1:1", "pos": 0, "count": count}
    return {"w": "x", "family": False, "points": 1, "senses": [s]}


# --- 1. _meaning_tokens extracts stemmed tokens from a description ---
tokens = _meaning_tokens("Words from this root carry the sense of: clear, evident, between, interval.")
# After gloss_key stemming: 'this'→'thi', but 'from' is NOT in the stopword
# list, so it stays. The test should only assert on the corpus-meaningful
# words (clear, evident, between).
test("meaning_tokens extracts clear/evident/between",
     "clear" in tokens and "evident" in tokens and "between" in tokens,
     f"got {tokens!r}")
test("meaning_tokens drops 'the' (a documented stopword)",
     "the" not in tokens,
     f"got {tokens!r}")
test("meaning_tokens keeps 'from' (NOT in the stopword list — corpus limitation)",
     "from" in tokens,
     f"got {tokens!r}")


# --- 2. without avoid_tokens: bug repro. All three words share 'clear' ---
words = [
    make_word("clear", ["manifest", "evident"]),
    make_word("evident"),
    make_word("clear statement", ["explicit declaration"]),  # overlaps with "clear"
]
_distinguish_glosses(words)
# First word: "clear" — no other word's primary is "clear" in the
# un-overlapped sense, but "clear statement" contains "clear".
# "manifest" and "evident" are the alternates. The function should pick one.
test("without avoid_tokens: first word still picks a non-overlapping gloss",
     words[0]["senses"][0]["gloss"] != "clear",
     f"first word gloss = {words[0]['senses'][0]['gloss']!r}")


# --- 3. with avoid_tokens = {clear, evident}: now both must be avoided ---
# This is the bug #221 scenario: the root description says 'clear' and
# 'evident', and the unfound hint word also wants 'clear'.
words2 = [
    make_word("clear", ["manifest", "distinct", "lucid"]),
    make_word("evident", ["manifest", "obvious"]),
    make_word("clear statement", ["explicit declaration"]),
]
_distinguish_glosses(words2, avoid_tokens={"clear", "evident"})
test("avoid_tokens forces first word off 'clear'",
     words2[0]["senses"][0]["gloss"] != "clear",
     f"got {words2[0]['senses'][0]['gloss']!r}")
test("avoid_tokens forces second word off 'evident'",
     words2[1]["senses"][0]["gloss"] != "evident",
     f"got {words2[1]['senses'][0]['gloss']!r}")


# --- 4. avoid_tokens with no available alternative: gloss stays, by design ---
# The 2-pass loop may end with no word able to claim a clean alternative if
# the corpus alternatives all chain-overlap with each other or with the
# description. In that case the original gloss is kept and the client
# labels the overlap. This is preferable to cascading reverts.
words3 = [
    make_word("clear", ["clarity itself"]),  # 'clarity' stems to 'clariti' (no s-strip applies), so doesn't hit 'clear'
    make_word("obvious"),
]
_distinguish_glosses(words3, avoid_tokens={"clear"})
# 'clarity itself' → gloss_key stems: 'clariti' (no s/ing/ed/es to strip because
# 'clarity' ends in 'y' not in our suffix list), 'itself' is a content word.
# Neither is 'clear'. So the function should pick it.
test("alternative with no shared stemmed token is picked",
     words3[0]["senses"][0]["gloss"] == "clarity itself",
     f"got {words3[0]['senses'][0]['gloss']!r}")

# Now: when every alternative also shares a stemmed token with the avoid set,
# the original stays. Simulate this with an alternative that stems to 'clear'.
words3c = [
    make_word("clear", ["clear vision"]),  # 'clear' is in both
    make_word("obvious"),
]
_distinguish_glosses(words3c, avoid_tokens={"clear"})
test("alternative sharing the avoid token → original stays",
     words3c[0]["senses"][0]["gloss"] == "clear",
     f"got {words3c[0]['senses'][0]['gloss']!r} (expected 'clear' — no clean alternative)")


# --- 5. mixed scenario: avoid_tokens excludes some but not all ---
words4 = [
    make_word("clear evidence", ["obvious proof"]),
    make_word("manifest truth", ["evident fact"]),
]
_distinguish_glosses(words4, avoid_tokens={"clear"})
# "clear evidence" contains 'clear' → must change.
# "obvious proof" doesn't contain 'clear' or 'evident' → safe.
test("mixed scenario: 'clear evidence' is swapped",
     "clear" not in words4[0]["senses"][0]["gloss"].lower(),
     f"got {words4[0]['senses'][0]['gloss']!r}")


# --- 6. avoid_tokens=None is the same as no arg (back-compat) ---
words5 = [
    make_word("clear", ["manifest"]),
    make_word("obvious"),
]
before = [w["senses"][0]["gloss"] for w in words5]
_distinguish_glosses(words5, avoid_tokens=None)
after = [w["senses"][0]["gloss"] for w in words5]
test("avoid_tokens=None preserves backward-compatible behavior",
     before == after,
     f"before={before} after={after}")


# --- 7. real-ish repro of the ب-ي-ن bug from #221 ---
# Build a mini-puzzle: the ب-ي-ن root with words whose glosses all
# include 'clear' or 'evident', and a meaning string that uses those
# same words. The post-fix _distinguish_glosses should pick alternates
# that avoid the description's tokens AND don't chain-overlap with
# each other.
bayn_words = [
    make_word("clear", ["explicit", "manifest", "lucid"]),
    make_word("evident", ["obvious", "apparent"]),  # alternatives don't share 'clear'
    make_word("between", ["interval", "among"]),  # doesn't share 'clear' or 'evident'
    make_word("indication", ["sign", "pointer"]),  # independent, not in description
]
bayn_meaning = "This root centers on becoming clear or distinct. Built words stretch that idea."
bayn_tokens = _meaning_tokens(bayn_meaning)
_distinguish_glosses(bayn_words, avoid_tokens=bayn_tokens)
for i, w in enumerate(bayn_words):
    gloss = w["senses"][0]["gloss"].lower()
    has_clear = "clear" in gloss
    test(f"bayn word[{i}] '{w['senses'][0]['gloss']}' avoids 'clear'",
         not has_clear,
         f"gloss still contains 'clear'")


print()
if FAIL:
    print(f"  {FAIL} test(s) FAILED")
    sys.exit(1)
print(f"  All {PASS} tests passed ✓")
