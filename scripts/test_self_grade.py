#!/usr/bin/env python3
"""
Test the conditional semantic self-grader (fixes #227).

Design (cost-controlled):
  - `_resolve_theme_field` maps the theme name to a semantic field and
    counts how many of the 4 items match it vs the strongest competitor.
  - `_should_self_grade` is the cost gate: the grader only fires when the
    keyword check is INCONCLUSIVE (named field weak, a competitor close
    behind). When the keyword check is decisive, zero API tokens are spent.
  - `self_grade_category` makes the small LLM call and is fail-OPEN.

All model calls are mocked — no API cost in tests.
"""
import sys
import os
import json
import glob
from unittest.mock import patch

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


MODEL = {"id": "test", "api": "test", "label": "Test Model"}


def mk(theme, items):
    return {
        "nameEn": theme,
        "items": [
            {"ref": f"1:{i}", "ar": ar, "en": en, "verse": "", "verseEn": ""}
            for i, (ar, en) in enumerate(items, 1)
        ],
    }


# ── _resolve_theme_field ──────────────────────────────────────────
c = mk("Worldly Luxuries and Provisions in Surah Az-Zukhruf", [
    ("الْقَرْيَتَيْنِ", "the two towns"),
    ("مَعِيشَتَهُمْ", "their livelihood"),
    ("أَبْوَابًا", "doors"),
    ("زُخْرُفًا", "ornaments of gold"),
])
f, named, other, other_n = gen._resolve_theme_field(c)
test("resolve: #227 theme maps to 'luxury' field", f == "luxury", f"got {f!r}")
test("resolve: #227 has 2/4 luxury matches", named == 2, f"got {named}")
test("resolve: #227 has no competing field stronger than the named one",
     other_n <= named, f"got {other!r}={other_n} vs named={named}")
test("resolve: #227 named field is weak (below GATE_HIGH) so the grader must fire",
     named < gen.SELF_GRADE_GATE_HIGH,
     f"named={named} GATE_HIGH={gen.SELF_GRADE_GATE_HIGH}")

c2 = mk("Family Members in the Quran", [
    ("أب", "father"), ("أم", "mother"), ("ابن", "son"), ("بنت", "daughter"),
])
f2, n2, o2, on2 = gen._resolve_theme_field(c2)
test("resolve: family theme -> family_relation, 4/4", f2 == "family_relation" and n2 == 4,
     f"got {f2!r}={n2}")

c3 = mk("Some Completely Unrecognisable Theme", [
    ("x", "alpha"), ("y", "beta"), ("z", "gamma"), ("w", "delta"),
])
f3, n3, o3, on3 = gen._resolve_theme_field(c3)
test("resolve: unrecognisable theme -> None", f3 is None, f"got {f3!r}")


# ── _should_self_grade — THE COST GATE ────────────────────────────
c_clear = mk("Worldly Luxuries", [
    ("ذهب", "gold ornaments"), ("فضة", "silver"), ("زينة", "adornment"), ("نعيم", "delight"),
])
go, why = gen._should_self_grade(c_clear)
test("gate: dominant named field (4/4) -> SKIP (zero tokens)", go is False,
     f"got go={go} why={why!r}")

go2, why2 = gen._should_self_grade(c)
test("gate: #227 ambiguous split -> FIRE grader", go2 is True, f"got go={go2} why={why2!r}")

go3, why3 = gen._should_self_grade(c3)
test("gate: unrecognisable theme -> SKIP grader", go3 is False, f"got go={go3} why={why3!r}")

gen.SELF_GRADE_ENABLED = False
go4, why4 = gen._should_self_grade(c)
gen.SELF_GRADE_ENABLED = True
test("gate: SELF_GRADE_ENABLED=False -> SKIP", go4 is False, f"got go={go4} why={why4!r}")

c_three = mk("Worldly Luxuries", [
    ("ذهب", "gold"), ("فضة", "silver"), ("زينة", "ornament"), ("x", "some town"),
])
go5, why5 = gen._should_self_grade(c_three)
test("gate: 3/4 named field -> SKIP (decisive enough)", go5 is False,
     f"got go={go5} why={why5!r}")

c_one = mk("Worldly Luxuries", [
    ("ذهب", "gold"), ("شمس", "sun"), ("قمر", "moon"), ("نجم", "star"),
])
go6, why6 = gen._should_self_grade(c_one)
test("gate: 1/4 named -> FIRE grader", go6 is True, f"go={go6} why={why6!r}")


# ── _build_grade_prompt — SIZE (cost control A) ───────────────────
p = gen._build_grade_prompt(c)
test("prompt: contains the theme", "Worldly Luxuries" in p)
test("prompt: contains each English gloss",
     all(g in p for g in ["the two towns", "their livelihood", "doors", "ornaments of gold"]))
test("prompt: compact (under 400 chars)", len(p) < 400, f"got {len(p)} chars")
tok = len(p) / 4
test("prompt: under ~100 tokens", tok < 100, f"got ~{tok:.0f} tokens")


# ── self_grade_category — mocked grader ───────────────────────────
mock_227 = json.dumps({"bad": [1, 3], "why": "towns and doors are not luxuries"})
with patch.object(gen, "call_model", return_value=mock_227):
    v, bad, why, raw = gen.self_grade_category(c, MODEL)
test("grade #227: verdict='fail'", v == "fail", f"got {v!r}")
test("grade #227: bad indices = [1, 3]", bad == [1, 3], f"got {bad}")
test("grade #227: reason captured", "luxur" in why.lower(), f"got {why!r}")

mock_pass = json.dumps({"bad": [], "why": "all fit"})
with patch.object(gen, "call_model", return_value=mock_pass):
    v, bad, why, raw = gen.self_grade_category(c2, MODEL)
test("grade clean: verdict='pass', no bad", v == "pass" and bad == [], f"got {v!r} bad={bad}")

mock_fenced = "```json\n" + json.dumps({"bad": [2], "why": "not a family word"}) + "\n```"
with patch.object(gen, "call_model", return_value=mock_fenced):
    v, bad, why, raw = gen.self_grade_category(c, MODEL)
test("grade: markdown fence parsed", v == "fail" and bad == [2], f"got {v!r} bad={bad}")

mock_strs = json.dumps({"bad": ["1", "4"], "why": "two off"})
with patch.object(gen, "call_model", return_value=mock_strs):
    v, bad, why, raw = gen.self_grade_category(c, MODEL)
test("grade: numeric-string indices normalised", v == "fail" and bad == [1, 4], f"got {bad}")

mock_oob = json.dumps({"bad": [0, 5, 9, 2], "why": "x"})
with patch.object(gen, "call_model", return_value=mock_oob):
    v, bad, why, raw = gen.self_grade_category(c, MODEL)
test("grade: out-of-range indices dropped", bad == [2], f"got {bad}")

with patch.object(gen, "call_model", return_value="not json"):
    v, bad, why, raw = gen.self_grade_category(c, MODEL)
test("grade: malformed JSON -> skipped (fail-open)", v == "skipped", f"got {v!r}")

with patch.object(gen, "call_model", return_value="RATE_LIMITED"):
    v, bad, why, raw = gen.self_grade_category(c, MODEL)
test("grade: RATE_LIMITED -> skipped (fail-open)", v == "skipped", f"got {v!r}")

with patch.object(gen, "call_model", return_value="SKIP"):
    v, bad, why, raw = gen.self_grade_category(c, MODEL)
test("grade: SKIP sentinel -> skipped", v == "skipped", f"got {v!r}")

with patch.object(gen, "call_model", return_value=None):
    v, bad, why, raw = gen.self_grade_category(c, MODEL)
test("grade: None response -> skipped", v == "skipped", f"got {v!r}")

calls = []
with patch.object(gen, "call_model", side_effect=lambda *a, **k: calls.append(1) or "{}"):
    v, bad, why, raw = gen.self_grade_category({"nameEn": "X", "items": []}, MODEL)
test("grade: 0 items -> skipped, no API call", v == "skipped" and not calls,
     f"calls={len(calls)}")

mock_long = json.dumps({"bad": [1], "why": "y" * 500})
with patch.object(gen, "call_model", return_value=mock_long):
    v, bad, why, raw = gen.self_grade_category(c, MODEL)
test("grade: long reason truncated to 120 chars", len(why) <= 120, f"got {len(why)}")


# ── END-TO-END COST: how often does the grader actually fire? ─────
hist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "history")
fires = 0
total = 0
for f in sorted(glob.glob(os.path.join(hist_dir, "*.json")))[-90:]:
    try:
        d = json.load(open(f, encoding="utf-8"))
    except Exception:
        continue
    conn = d.get("connections") or {}
    for k in conn.get("categories", []):
        if not k.get("nameEn") or len(k.get("items", [])) != 4:
            continue
        total += 1
        g, _ = gen._should_self_grade(k)
        if g:
            fires += 1

pct = 100 * fires / total if total else 0
print()
print("  -- Grader fire rate over last 90 days --")
print(f"     {fires}/{total} categories ({pct:.1f}%) would trigger an API call")
print(f"     -> {100-pct:.1f}% of categories cost ZERO extra tokens")

print()
if FAIL:
    print(f"  {FAIL} test(s) FAILED")
    sys.exit(1)
print(f"  All {PASS} tests passed \u2713")