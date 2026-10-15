#!/usr/bin/env python3
"""
Test that call_model() returns the 'SKIP' sentinel when the API returns
a non-JSON body or a JSON body without a 'choices' key. This is the
exact failure mode that burned 5 retries on DeepSeek during the
2026-10-15 00:49 UTC puzzle generation run.
"""
import sys
import os
from unittest.mock import patch, MagicMock

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
        print(f"  ✗ {name}")
        if detail:
            print(f"    → {detail}")


# Set fake API keys so call_model() reaches the HTTP path
os.environ["MINIMAX_API_KEY"] = "fake-m3-key-for-tests"
os.environ["KIMI_API_KEY"] = "fake-kimi-key-for-tests"
os.environ["DEEPSEEK_API_KEY"] = "fake-deepseek-key-for-tests"
# Re-import to pick up env vars (module loaded at top)
import importlib
importlib.reload(gen)


# --- case 1: non-JSON body (e.g. proxy HTML error page) ---
mock_resp = MagicMock()
mock_resp.status_code = 200
mock_resp.raise_for_status = MagicMock()
mock_resp.json.side_effect = ValueError("not json")
mock_resp.text = "<html>cloudflare error</html>"

m3 = {"id": "MiniMax-M3", "api": "minimax_m3", "label": "MiniMax M3"}
with patch.object(gen.requests, "post", return_value=mock_resp):
    out = gen.call_model("hi", m3, "sys")
test("non-JSON 200 → SKIP", out == "SKIP", f"got {out!r}")


# --- case 2: JSON without 'choices' key (DeepSeek's actual failure) ---
mock_resp2 = MagicMock()
mock_resp2.status_code = 200
mock_resp2.raise_for_status = MagicMock()
mock_resp2.json.return_value = {"error": {"message": "rate limit"}}
mock_resp2.text = '{"error":{"message":"rate limit"}}'

ds = {"id": "deepseek-v4-pro", "api": "deepseek", "label": "DeepSeek V4 Pro"}
with patch.object(gen.requests, "post", return_value=mock_resp2):
    out = gen.call_model("hi", ds, "sys")
test("JSON without 'choices' → SKIP", out == "SKIP", f"got {out!r}")


# --- case 3: JSON with empty 'choices' list (IndexError) ---
mock_resp3 = MagicMock()
mock_resp3.status_code = 200
mock_resp3.raise_for_status = MagicMock()
mock_resp3.json.return_value = {"choices": []}
mock_resp3.text = '{"choices":[]}'

with patch.object(gen.requests, "post", return_value=mock_resp3):
    out = gen.call_model("hi", m3, "sys")
test("JSON with empty 'choices' → SKIP", out == "SKIP", f"got {out!r}")


# --- case 4: 429 still returns 'RATE_LIMITED' (unchanged) ---
mock_resp4 = MagicMock()
mock_resp4.status_code = 429
mock_resp4.raise_for_status = MagicMock()

with patch.object(gen.requests, "post", return_value=mock_resp4):
    out = gen.call_model("hi", m3, "sys")
test("429 → RATE_LIMITED (unchanged)", out == "RATE_LIMITED", f"got {out!r}")


# --- case 5: real-shape response still works (smoke check) ---
mock_resp5 = MagicMock()
mock_resp5.status_code = 200
mock_resp5.raise_for_status = MagicMock()
mock_resp5.json.return_value = {
    "choices": [{"message": {"content": '{"meaning": "test"}'}}],
    "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
}

with patch.object(gen.requests, "post", return_value=mock_resp5):
    out = gen.call_model("hi", m3, "sys")
test("valid response → JSON string", out == '{"meaning": "test"}', f"got {out!r}")


print()
if FAIL:
    print(f"  {FAIL} test(s) FAILED")
    sys.exit(1)
print(f"  All {PASS} tests passed ✓")
