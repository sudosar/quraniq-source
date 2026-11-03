#!/usr/bin/env python3
"""
Chain-order tests (Nov 2026).

MiniMax M3 first (user direction, 3 Nov 2026), DeepSeek second, Meta
contributor third, Kimi last. Order is a cost/speed trade, not an
accuracy ranking: acceptance criteria are unchanged, so order only
changes which model's success is found first. M3 is cheapest
pay-as-you-go output ($1.20/M) but slow and verbose (30k-58k tokens
per grinding attempt); the round-robin cycles mean a slow M3 never
blocks the other models forever. Meta uses the contributor tier
(user consented to Meta training on prompts, 3 Nov 2026):
muse-spark-1.3-contributor at $0.10/M in, $0.20/M out -- cheapest per
token in the chain, kept third because M3 was asked first. Kimi last:
$15.00/M output, the most expensive by far.
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
    test("chain order is minimax_m3, deepseek, meta, kimi",
         apis == ["minimax_m3", "deepseek", "meta", "kimi"], str(apis))
    test("chain model ids in order",
         ids == ["MiniMax-M3", "deepseek-v4-pro",
                 "muse-spark-1.3-contributor", "kimi-k3"], str(ids))
    test("chain still has all four providers",
         set(apis) == {"kimi", "deepseek", "minimax_m3", "meta"})
    test("M3 is first (user direction, cheapest pay-as-you-go output)",
         apis[0] == "minimax_m3")
    test("Meta is third with the contributor id",
         apis[2] == "meta" and ids[2] == "muse-spark-1.3-contributor")
    test("Kimi is last (most expensive output by far)",
         apis[-1] == "kimi")
    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
