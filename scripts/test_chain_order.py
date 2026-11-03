#!/usr/bin/env python3
"""
Chain-order tests (Nov 2026).

Cheapest-first by list price (user direction, 3 Nov 2026): Meta
contributor first ($0.20/M out, $0.10/M in), MiniMax M3 second
($1.20/M out, $0.30/M in), DeepSeek third ($1.98/M out off-peak,
$3.96/M peak), Kimi last ($15.00/M out). The order is the same on
input prices. M3 sits second despite the user's MiniMax token plan:
the plan quota is prepaid but finite (it bound on 1 Nov 2026), and
list-price order is what was asked for. Order only changes which
model's success is found first, never whether a category is accepted.
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
    test("chain order is meta, minimax_m3, deepseek, kimi",
         apis == ["meta", "minimax_m3", "deepseek", "kimi"], str(apis))
    test("chain model ids in order",
         ids == ["muse-spark-1.3-contributor", "MiniMax-M3",
                 "deepseek-v4-pro", "kimi-k3"], str(ids))
    test("chain still has all four providers",
         set(apis) == {"kimi", "deepseek", "minimax_m3", "meta"})
    test("Meta contributor is first (cheapest per token)",
         apis[0] == "meta" and ids[0] == "muse-spark-1.3-contributor")
    test("M3 is second (token plan quota is prepaid but finite)",
         apis[1] == "minimax_m3")
    test("Kimi is last (most expensive output by far)",
         apis[-1] == "kimi")
    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
