#!/usr/bin/env python3
"""
Deduction shuffle tests (Nov 2026, issue #266).

The model emits "Who Am I?" options with the correct answer first, and
js/deduction.js rendered them in stored order, so the correct pill was
always first. The generator now shuffles each category's options after
validation (and the frontend shuffles once per puzzle at render). The
shuffle must preserve the option set and the answer; it must move the
answer off first place (checked across seeds, since one shuffle of five
items can leave the answer first by chance).
"""
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_daily_puzzle as gen

PASS = 0
FAIL = 0


def test(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name}")
        if detail:
            print(f"    -> {detail}")


def fake_deduction():
    # Answer-first options, exactly the shape the model returns (the bug).
    cats = {}
    for key, label, ans in [
        ("identity", "Who Am I?", "Correct Identity"),
        ("trial", "Trial/Event", "Correct Trial"),
        ("location", "Key Element", "Correct Place"),
        ("outcome", "Outcome", "Correct End"),
    ]:
        cats[key] = {
            "label": label,
            "options": [ans, "Wrong A", "Wrong B", "Wrong C", "Wrong D"],
            "answer": ans,
        }
    return {
        "title": "The Loyal Household",
        "intro": "A figure close to prophethood chose a different loyalty.",
        "clues": ["c1", "c2", "c3", "c4", "c5", "c6"],
        "categories": cats,
        "verseRef": "66:10",
    }


def fresh_history():
    return {
        "deduction": {"titles": set(), "characters": set(),
                      "verseRefs": set(), "surahs": set()},
        "all_verses": set(),
    }


def main():
    # The bug, reproduced on the input: the model puts the answer first.
    p = fake_deduction()
    test("bug repro: model input has the answer first in every category",
         all(c["options"][0] == c["answer"] for c in p["categories"].values()))

    # Helper: set + answer preserved, order actually moves (across seeds).
    if not hasattr(gen, "_shuffle_deduction_options"):
        test("generator exposes _shuffle_deduction_options", False, "missing")
    else:
        expected = {k: (set(c["options"]), c["answer"])
                    for k, c in fake_deduction()["categories"].items()}
        preserved = True
        positions = []
        for seed in range(20):
            q = fake_deduction()
            random.seed(seed)
            gen._shuffle_deduction_options(q)
            for key, c in q["categories"].items():
                exp_opts, exp_ans = expected[key]
                if set(c["options"]) != exp_opts or c["answer"] != exp_ans:
                    preserved = False
                positions.append(c["options"].index(c["answer"]))
        test("shuffle preserves every option and the answer", preserved)
        test("shuffle moves the answer off first place",
             any(pos != 0 for pos in positions), str(positions[:12]))
        test("shuffle does not always land the answer in the same slot",
             len(set(positions)) > 1, str(sorted(set(positions))))

    # End to end: generate_game applies the shuffle to accepted puzzles.
    orig_call = gen.call_model
    orig_enrich = gen.enrich_deduction_with_verses
    gen.call_model = lambda prompt, cfg: json.dumps(fake_deduction())
    gen.enrich_deduction_with_verses = lambda puzzle: puzzle
    try:
        positions = []
        preserved = True
        got_puzzle = True
        for seed in range(5):
            random.seed(seed)
            out = gen.generate_game("deduction", fresh_history(), "2026-11-08")
            if out is None:
                got_puzzle = False
                break
            exp = fake_deduction()["categories"]
            for key, c in out["categories"].items():
                if set(c["options"]) != set(exp[key]["options"]):
                    preserved = False
                if c["answer"] != exp[key]["answer"]:
                    preserved = False
                positions.append(c["options"].index(c["answer"]))
            errors, _, _ = gen.validate_deduction(out, fresh_history())
            if errors:
                preserved = False
        test("generate_game returns a deduction puzzle", got_puzzle)
        test("generate_game output keeps options and answers", preserved)
        test("generate_game output has the answer off first place",
             any(pos != 0 for pos in positions), str(positions))
    finally:
        gen.call_model = orig_call
        gen.enrich_deduction_with_verses = orig_enrich

    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
