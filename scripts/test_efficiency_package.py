#!/usr/bin/env python3
"""
Tests for the efficiency package (Nov 2026, following the 2 Nov run).

Background: the 2 Nov generation took 2h1m (vs 68 min on 1 Nov).
The log showed four distinct time sinks:
  1. Two fully transport-failed Kimi attempts on one category (~39 min)
     before the run-level health rule (2 consecutive failures) sidelined
     Kimi. The HTTP layer already retried each call 3x with backoff, so
     a fully failed attempt is persistent, not transient.
  2. Three consecutive empty outputs (JSON parse errors) from Kimi on
     another category before DeepSeek accepted on its first try.
  3. Kimi re-proposing a theme the previous category had just had
     rejected for reuse (~12 min generation), because rejected-but-
     never-published themes do not propagate across categories (and
     the prompt's forbidden list is capped at 30, this-run themes first).
  4. A 60s sleep between games (~3 min total).

Fixes under test:
  - Transport/auth failure (call_model returns None) breaks to the next
    model immediately instead of burning that model's remaining retries
    this pass. The model gets a fresh chance on the next pass/category.
  - Three consecutive failures of the same kind break to the next model
    early (early switch). Rate limits keep their own handling.
  - Themes rejected for reuse are carried across categories in the same
    run, front-listed in the prompt's forbidden themes.
  - Inter-game sleep 60s -> 10s.

Offline: no API keys, no network. call_model, fetch_verse_text and the
grader are stubbed; validation, repair, prompt building and the
post-enrich check run for real.
"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_daily_puzzle as gen

PASS = 0
FAIL = 0


def test(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✓ {name}")
    else:
        FAIL += 1
        print(f"  ✗ {name} {detail}")


GOOD_ITEMS = [
    {"ar": "قُلُوبُهُم", "en": "their hearts", "ref": "16:22"},
    {"ar": "أَعْيُنِ", "en": "(the) eyes", "ref": "21:61"},
    {"ar": "عِظَامًا", "en": "and bones", "ref": "37:16"},
    {"ar": "أَيْدِينَا", "en": "our hands", "ref": "19:64"},
]


def good_cat(theme="Body parts mentioned in the Quran"):
    return {
        "name": "أَعْضَاءُ الْجَسَدِ",
        "nameEn": theme,
        "items": [dict(it) for it in GOOD_ITEMS],
    }


def fresh_history(themes=None):
    return {
        "connections": {"themes": set(themes or []), "verses": set(),
                        "words": set()},
        "all_verses": set(),
    }


class Stubs:
    """Context manager stubbing the network/grader edges of generation."""

    def __init__(self, model_fn):
        self.model_fn = model_fn
        self.prompts = []
        self.calls = {}
        self._orig = {}

    def __enter__(self):
        self._orig["call_model"] = gen.call_model
        self._orig["fetch"] = gen.fetch_verse_text
        self._orig["grade"] = gen.self_grade_category
        self._orig["cooldown"] = gen._SECOND_PASS_COOLDOWN_S

        def fake_call(prompt, model_config, system_msg=None):
            label = model_config["label"]
            self.calls[label] = self.calls.get(label, 0) + 1
            self.prompts.append(prompt)
            return self.model_fn(label, self.calls[label])

        def fake_fetch(ref):
            for it in GOOD_ITEMS:
                if it["ref"] == ref:
                    return {
                        "arabic": f"xx {it['ar']} yy",
                        "english": "verse translation",
                        "wbw": [{"arabic": it["ar"], "english": it["en"]}],
                    }
            return {"arabic": "xx yy", "english": "", "wbw": []}

        gen.call_model = fake_call
        gen.fetch_verse_text = fake_fetch
        gen.self_grade_category = lambda cat, m: ("pass", [], "", "stub")
        gen._SECOND_PASS_COOLDOWN_S = 0
        gen._RUN_REJECTED_THEMES.clear()
        return self

    def __exit__(self, *exc):
        gen.call_model = self._orig["call_model"]
        gen.fetch_verse_text = self._orig["fetch"]
        gen.self_grade_category = self._orig["grade"]
        gen._SECOND_PASS_COOLDOWN_S = self._orig["cooldown"]
        gen._RUN_REJECTED_THEMES.clear()
        return False


def main():
    # --- helpers ------------------------------------------------------
    test("extract: reused theme with apostrophe",
         gen._extract_reused_theme(
             "Theme 'prophets named in the qur'an' reused "
             "(cooldown or duplicate in puzzle)")
         == "prophets named in the qur'an")
    test("extract: duplicate-in-puzzle variant",
         gen._extract_reused_theme(
             "Theme 'birds mentioned in the qur'an' reused "
             "(cooldown or duplicate in puzzle)")
         == "birds mentioned in the qur'an")
    test("extract: ref reuse is not a theme",
         gen._extract_reused_theme(
             "Verse ref 2:25 reused (cooldown or already used in puzzle)")
         is None)
    test("extract: coherence violation is not a theme",
         gen._extract_reused_theme("Semantic coherence: foo") is None)
    test("extract: empty is None",
         gen._extract_reused_theme("") is None)

    test("three-same: empty is False",
         gen._three_same_in_a_row([]) is False)
    test("three-same: two is False",
         gen._three_same_in_a_row(["parse", "parse"]) is False)
    test("three-same: three identical is True",
         gen._three_same_in_a_row(["parse", "parse", "parse"]) is True)
    test("three-same: last three of four is True",
         gen._three_same_in_a_row(["validation", "parse", "parse", "parse"])
         is True)
    test("three-same: mixed is False",
         gen._three_same_in_a_row(["parse", "validation", "parse"]) is False)

    _k = []
    _a = gen._note_failure_kind(_k, "parse", "M")
    _b = gen._note_failure_kind(_k, "parse", "M")
    _c = gen._note_failure_kind(_k, "parse", "M")
    test("note-kind: switches only on third identical",
         _a is False and _b is False and _c is True and _k == ["parse"] * 3)
    _k2 = []
    _d = gen._note_failure_kind(_k2, "parse", "M")
    _e = gen._note_failure_kind(_k2, "validation", "M")
    _f = gen._note_failure_kind(_k2, "parse", "M")
    test("note-kind: mixed kinds never switch",
         _d is False and _e is False and _f is False)

    test("sleep constant is 10s",
         gen._INTER_GAME_SLEEP_S == 10)

    gen._RUN_REJECTED_THEMES.add("some theme")
    gen._reset_run_rejected_themes()
    test("reset helper clears the run set",
         len(gen._RUN_REJECTED_THEMES) == 0)

    # --- transport sideline ------------------------------------------
    def transport_fn(label, n):
        if label == "Kimi K3":
            return None
        return json.dumps(good_cat())

    with Stubs(transport_fn) as st:
        cat = gen._generate_single_category(
            0, [], fresh_history(), "2026-11-03")
        test("transport: category still accepted via next model",
             cat is not None and cat.get("nameEn") == good_cat()["nameEn"],
             str(cat)[:120])
        test("transport: dead model tried once, not 5 retries",
             st.calls.get("Kimi K3") == 1, str(st.calls))
        test("transport: next model tried once and accepted",
             st.calls.get("DeepSeek V4 Pro") == 1, str(st.calls))

    # --- parse early-switch ------------------------------------------
    def parse_fn(label, n):
        if label == "Kimi K3":
            return "this is not json at all"
        return json.dumps(good_cat())

    with Stubs(parse_fn) as st:
        cat = gen._generate_single_category(
            0, [], fresh_history(), "2026-11-03")
        test("parse: category still accepted via next model",
             cat is not None, str(cat)[:120] if cat else "None")
        test("parse: early switch after 3 identical failures, not 5",
             st.calls.get("Kimi K3") == 3, str(st.calls))

    # --- rejected-theme carryover -------------------------------------
    reused = "prophets named in the qur'an"

    def reused_fn(label, n):
        return json.dumps(good_cat("Prophets named in the Qur'an"))

    hist = fresh_history(themes=[reused])
    with Stubs(reused_fn) as st:
        cat = gen._generate_single_category(0, [], hist, "2026-11-03")
        test("carryover: exhausted category returns None",
             cat is None)
        test("carryover: rejected theme recorded for the run",
             reused in gen._RUN_REJECTED_THEMES,
             str(gen._RUN_REJECTED_THEMES))
        # Second category, good model: its prompt must forbid the theme.
        st.model_fn = lambda label, n: json.dumps(good_cat())
        st.prompts.clear()
        cat2 = gen._generate_single_category(1, [], hist, "2026-11-03")
        test("carryover: second category accepted",
             cat2 is not None)
        forbidden = [p for p in st.prompts
                     if "FORBIDDEN themes" in p and reused in p]
        test("carryover: rejected theme front-listed in next prompt",
             len(forbidden) >= 1, f"prompts={len(st.prompts)}")

    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
