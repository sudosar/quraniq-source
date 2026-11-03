#!/usr/bin/env python3
"""
Chain-order tests (Nov 2026).

Kimi first, DeepSeek second, M3 third, Meta last. This is a speed
decision, not an accuracy ranking: acceptance criteria are unchanged,
so reordering only changes which model's success is found first.
Evidence: in the 1 Nov 2026 live test Kimi accepted Connections cat 1
first try (10k tokens) while M3 burned 30k-58k tokens per attempt and
failed 5/5. M3 keeps its 131072 budget (29 Oct 2026: it burned the
whole 32768 budget in reasoning and returned empty content) -- capping
it would reintroduce that failure, so its cost is only paid when Kimi
and DeepSeek fail. Meta is last (3 Nov 2026): muse-spark-1.3 runs only
when Kimi, DeepSeek and M3 have all failed, so its $4.25/M output
price is paid rarely.
"""
import sys
import os

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


def main():
    apis = [m["api"] for m in gen.MODEL_CHAIN]
    ids = [m["id"] for m in gen.MODEL_CHAIN]
    test("chain order is kimi, deepseek, minimax_m3, meta",
         apis == ["kimi", "deepseek", "minimax_m3", "meta"], str(apis))
    test("chain model ids in order",
         ids == ["kimi-k3", "deepseek-v4-pro", "MiniMax-M3", "muse-spark-1.3"], str(ids))
    test("chain still has all four providers",
         set(apis) == {"kimi", "deepseek", "minimax_m3", "meta"})
    test("kimi is first (fast accurate model tried before slow M3)",
         apis[0] == "kimi")
    test("M3 is third, not last (its cost paid only when kimi/deepseek fail)",
         apis[2] == "minimax_m3")
    test("Meta is last (only paid when all others fail)",
         apis[-1] == "meta")
    test("Meta entry uses muse-spark-1.3 Standard id",
         gen.MODEL_CHAIN[-1]["id"] == "muse-spark-1.3")
    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
