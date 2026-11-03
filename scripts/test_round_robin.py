#!/usr/bin/env python3
"""
Round-robin tests (Nov 2026).

Chain is cheapest-first by list price (user direction, 3 Nov 2026):
Meta contributor, MiniMax M3, DeepSeek, Kimi, cycling round robin. A category
gets up to 3 full cycles; giving up after 3 writes a bug report file
under data/bug-reports (committed by the workflow's always() step) and
the run fails, which the workflow's Notify step turns into a GitHub
issue. Per-model retries inside a cycle are unchanged (up to 5,
early switch after 3 same-kind failures, immediate break on transport
failure) -- the cycle count is about full passes through the chain.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_daily_puzzle as gen
from test_efficiency_package import Stubs, fresh_history, good_cat

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


REUSED = "prophets named in the qur'an"


def main():
    test("max cycles is 3",
         gen._MAX_CATEGORY_PASSES == 3, str(gen._MAX_CATEGORY_PASSES))
    test("chain is cheapest-first",
         [m["api"] for m in gen.MODEL_CHAIN] == ["meta", "minimax_m3",
                                                "deepseek", "kimi"],
         str([m["api"] for m in gen.MODEL_CHAIN]))

    # Meta tried first on a clean category.
    with Stubs(lambda label, n: json.dumps(good_cat())) as st:
        cat = gen._generate_single_category(0, [], fresh_history(), "2026-11-03")
        test("Meta first: clean category accepted on the first call",
             cat is not None and st.calls == {"Meta Spark 1.3 Contributor": 1}, str(st.calls))
        test("no bug file on success",
             os.listdir(st.bug_dir) == [], str(os.listdir(st.bug_dir)))

    # Cycle 1 transport-fails on every model, cycle 2 succeeds on Meta.
    state = {"n": 0}

    def cycle_fn(label, n):
        state["n"] += 1
        if state["n"] <= 4:
            return None
        return json.dumps(good_cat())

    with Stubs(cycle_fn) as st:
        cat = gen._generate_single_category(0, [], fresh_history(), "2026-11-03")
        test("round robin: cycle-1 wipeout still succeeds on cycle 2",
             cat is not None, "None" if cat is None else "")
        test("round robin: Meta retried on cycle 2, others once",
             st.calls.get("Meta Spark 1.3 Contributor") == 2
             and st.calls.get("MiniMax M3") == 1
             and st.calls.get("DeepSeek V4 Pro") == 1
             and st.calls.get("Kimi K3") == 1, str(st.calls))

    # Validation-fails forever: 3 cycles, then give up + bug file.
    def reused_fn(label, n):
        return json.dumps(good_cat("Prophets named in the Qur'an"))

    hist = fresh_history(themes=[REUSED])
    with Stubs(reused_fn) as st:
        cat = gen._generate_single_category(0, [], hist, "2026-11-03")
        test("give-up: exhausted category returns None", cat is None)
        test("give-up: each model visited 3 times (3 cycles)",
             all(st.calls.get(lbl) == 9 for lbl in
                 ["Meta Spark 1.3 Contributor", "MiniMax M3",
                  "DeepSeek V4 Pro", "Kimi K3"]),
             str(st.calls))
        test("give-up: 36 attempts total (12 visits x early switch at 3)",
             sum(st.calls.values()) == 36, str(sum(st.calls.values())))
        files = os.listdir(st.bug_dir)
        test("give-up: exactly one bug report file",
             len(files) == 1, str(files))
        if len(files) == 1:
            with open(os.path.join(st.bug_dir, files[0]), encoding="utf-8") as fh:
                rep = json.load(fh)
            test("bug file: name pins date and category",
                 files[0] == "2026-11-03-connections-cat1.json", files[0])
            test("bug file: attempts and cycles recorded",
                 rep.get("attempts") == 36 and rep.get("cycles") == 3, str(rep))
            test("bug file: chain labels in order",
                 rep.get("chain") == ["Meta Spark 1.3 Contributor", "MiniMax M3",
                                      "DeepSeek V4 Pro", "Kimi K3"],
                 str(rep.get("chain")))
            test("bug file: last violations recorded",
                 bool(rep.get("last_violations")), str(rep.get("last_violations")))

    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
