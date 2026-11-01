#!/usr/bin/env python3
"""
Chain-order tests (Nov 2026).

Kimi first, DeepSeek second, M3 last. This is a speed decision, not an
accuracy ranking: acceptance criteria are unchanged, so reordering only
changes which model's success is found first. Evidence: in the 1 Nov
2026 live test Kimi accepted Connections cat 1 first try (10k tokens)
while M3 burned 30k-58k tokens per attempt and failed 5/5. M3 keeps its
131072 budget (29 Oct 2026: it burned the whole 32768 budget in
reasoning and returned empty content) — capping it would reintroduce
that failure, so its cost is only paid when Kimi and DeepSeek fail.
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
        print(f"  \u2713 {name}")
    else:
        FAIL += 1
        print(f"  \u2717 {name}")
        if detail:
            print(f"    \u2192 {detail}")


def main():
    apis = [m["api"] for m in gen.MODEL_CHAIN]
    test("chain order is kimi, deepseek, minimax_m3",
         apis == ["kimi", "deepseek", "minimax_m3"], str(apis))
    test("chain still has all three providers",
         set(apis) == {"kimi", "deepseek", "minimax_m3"})
    test("kimi is first (fast accurate model tried before slow M3)",
         apis[0] == "kimi")
    test("M3 is last (its cost paid only when others fail)",
         apis[-1] == "minimax_m3")
    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
