#!/usr/bin/env python3
"""
Tests for the Connections verse-repair pass (Nov 2026).

Repair replaces model-cited refs that are in cooldown / outside the
offered allowlist with code-chosen free verses containing the same
word, from the vendored Uthmani corpus. Offline: no API keys, no
network -- the corpus file and the generator's own normalization are
the only inputs.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_daily_puzzle as gen
from surah_ranges import offered_ranges

PASS = 0
FAIL = 0


def test(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  \u2713 {name}")
    else:
        FAIL += 1
        print(f"  \u2717 {name}")
        if detail:
            print(f"    \u2192 {detail}")


def make_history(blocked):
    return {
        "connections": {"verses": set(blocked), "themes": set(), "words": set(), "meanings": {}},
        "all_verses": set(),
    }


def in_allowlist(ref, blocked):
    ranges = offered_ranges(blocked)
    try:
        s, a = ref.split(":")
        s, a = int(s), int(a)
    except ValueError:
        return False
    return any(lo <= a <= hi for lo, hi in ranges.get(s, ()))


def main():
    index, texts = gen._load_verse_corpus()
    test("corpus loads 6236 verses", len(texts) == 6236, f"got {len(texts)}")
    test("index non-empty", len(index) > 10000, f"got {len(index)} tokens")

    # NOTE: the corpus is Uthmani script, and normalize_arabic maps the
    # superscript alef (U+0670) to a plain alef, so the Basmala token is
    # "al-rahman" with an extra alef (al-r-h-m-a-n), not the standard
    # spelling. The lookup must use the same normalized form the
    # validator sees -- this is the pre-existing word contract, and the
    # repair agrees with it by construction (same normalize function).
    refs = gen._verses_for_word("\u0627\u0644\u0631\u062d\u0645\u0627\u0646")
    test("word lookup finds 1:1 for Uthmani-normalized al-rahman", "1:1" in refs, f"first refs: {refs[:5]}")
    test("standard spelling finds nothing (validator would reject it too)",
         gen._verses_for_word("\u0627\u0644\u0631\u062d\u0645\u0646") == [])

    blocked = {"6:99", "95:1", "16:11", "55:68", "2:67"}
    hist = make_history(blocked)
    # Reconstructed 1 Nov failure shape: 4 items citing famous cooldown refs
    words = ["\u0627\u0644\u0646\u0627\u0633", "\u0627\u0644\u0633\u0645\u0627\u0621",
             "\u0627\u0644\u0623\u0631\u0636", "\u0627\u0644\u0645\u0624\u0645\u0646\u064a\u0646"]
    old_refs = ["6:99", "95:1", "16:11", "55:68"]
    cat = {"nameEn": "Test theme", "name": "\u0627\u062e\u062a\u0628\u0627\u0631", "items": [
        {"ar": w, "en": "", "ref": r} for w, r in zip(words, old_refs)
    ]}
    n, unplaceable = gen.repair_category_refs(cat, hist, [])
    new_refs = [it["ref"] for it in cat["items"]]
    test("failure shape: all 4 refs repaired", n == 4 and not unplaceable,
         f"n={n} unplaceable={unplaceable} refs={new_refs}")
    test("repaired refs are distinct", len(set(new_refs)) == 4, str(new_refs))
    test("repaired refs inside allowlist", all(in_allowlist(r, blocked) for r in new_refs), str(new_refs))
    test("repaired refs avoid blocked", all(r not in blocked for r in new_refs), str(new_refs))
    test("word present in repaired verse (local text)", all(
        gen.word_in_verse(w, texts[r]) for w, r in zip(words, new_refs)
    ), str(list(zip(words, new_refs))))

    # Good ref kept untouched
    good_word = words[0]
    good_cands = [r for r in gen._verses_for_word(good_word)
                  if r not in blocked and in_allowlist(r, blocked)]
    good_ref = good_cands[0]
    cat2 = {"nameEn": "T", "name": "\u062a", "items": [
        {"ar": good_word, "en": "", "ref": good_ref},
        {"ar": words[1], "en": "", "ref": "6:99"},
        {"ar": words[2], "en": "", "ref": "95:1"},
        {"ar": words[3], "en": "", "ref": "16:11"},
    ]}
    n2, _ = gen.repair_category_refs(cat2, hist, [])
    test("good ref kept untouched", cat2["items"][0]["ref"] == good_ref, cat2["items"][0]["ref"])
    test("other three repaired", n2 == 3, f"n2={n2}")

    # Duplicate refs: first kept, second repaired
    cat3 = {"nameEn": "T", "name": "\u062a", "items": [
        {"ar": good_word, "en": "", "ref": good_ref},
        {"ar": good_word, "en": "", "ref": good_ref},
        {"ar": words[1], "en": "", "ref": "6:99"},
        {"ar": words[2], "en": "", "ref": "95:1"},
    ]}
    gen.repair_category_refs(cat3, hist, [])
    refs3 = [it["ref"] for it in cat3["items"]]
    test("duplicate ref: first kept, second repaired distinct",
         refs3[0] == good_ref and refs3[1] != good_ref and len(set(refs3)) == 4, str(refs3))

    # Unplaceable: word that exists nowhere
    unknown = "\u0632\u0632\u0632\u0632\u063a\u064a\u0631\u0645\u0648\u062c\u0648\u062f"
    cat4 = {"nameEn": "T", "name": "\u062a", "items": [
        {"ar": unknown, "en": "", "ref": "6:99"},
        {"ar": words[0], "en": "", "ref": "95:1"},
        {"ar": words[1], "en": "", "ref": "16:11"},
        {"ar": words[2], "en": "", "ref": "55:68"},
    ]}
    n4, unp4 = gen.repair_category_refs(cat4, hist, [])
    test("unknown word reported unplaceable, ref left alone",
         unknown in unp4 and cat4["items"][0]["ref"] == "6:99" and n4 == 3,
         f"n4={n4} unp={unp4}")

    # Unplaceable: word whose only verses are all blocked
    single = None
    for token, token_refs in index.items():
        if len(token_refs) == 1:
            single = (token, token_refs[0])
            break
    assert single, "no single-verse token found"
    token, only_ref = single
    hist2 = make_history({only_ref})
    cat5 = {"nameEn": "T", "name": "\u062a", "items": [
        {"ar": token, "en": "", "ref": only_ref},
        {"ar": words[0], "en": "", "ref": "6:99"},
        {"ar": words[1], "en": "", "ref": "95:1"},
        {"ar": words[2], "en": "", "ref": "16:11"},
    ]}
    n5, unp5 = gen.repair_category_refs(cat5, hist2, [])
    test("word with only blocked verses reported unplaceable",
         token in unp5 and cat5["items"][0]["ref"] == only_ref,
         f"token={token} ref={only_ref} unp={unp5}")

    # Missing ref repaired via lookup
    cat6 = {"nameEn": "T", "name": "\u062a", "items": [
        {"ar": words[0], "en": "", "ref": ""},
        {"ar": words[1], "en": "", "ref": "6:99"},
        {"ar": words[2], "en": "", "ref": "95:1"},
        {"ar": words[3], "en": "", "ref": "16:11"},
    ]}
    n6, _ = gen.repair_category_refs(cat6, hist, [])
    test("missing ref repaired", n6 == 4 and all(it["ref"] for it in cat6["items"]),
         str([it["ref"] for it in cat6["items"]]))

    # Malformed category: no crash
    n7, unp7 = gen.repair_category_refs({"items": [{"ar": words[0]}]}, hist, [])
    test("malformed category no-ops", (n7, unp7) == (0, []), f"{n7} {unp7}")

    # Determinism: identical input -> identical repair
    def fresh_cat():
        return {"nameEn": "T", "name": "\u062a", "items": [
            {"ar": w, "en": "", "ref": r} for w, r in zip(words, old_refs)
        ]}
    c_a, c_b = fresh_cat(), fresh_cat()
    gen.repair_category_refs(c_a, hist, [])
    gen.repair_category_refs(c_b, hist, [])
    test("repair is deterministic",
         [it["ref"] for it in c_a["items"]] == [it["ref"] for it in c_b["items"]])

    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
