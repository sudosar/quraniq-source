#!/usr/bin/env python3
"""
Meta provider tests (Nov 2026).

Verifies the Meta fallback wiring added after the 3 Nov 2026 retest
proved api.meta.ai serves muse-spark-1.3: chain position, missing-key
skip, the exact payload the generator sends (temperature 0.6,
top_p 0.95, max_tokens 16384, response_format json_object,
reasoning_effort low -- all verified live 3 Nov 2026 via the
connector helper), the 300s timeout, continuation cost control, and
the workflow secret mapping. No real key is used: tests stub the HTTP
layer and set a fixture key value.
"""
import json
import os
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


class FakeResp:
    def __init__(self, text, status_code=200):
        self._text = text
        self.status_code = status_code
        self.text = text

    def json(self):
        return json.loads(self._text)

    def raise_for_status(self):
        return None


META_CFG = {"id": "muse-spark-1.3", "api": "meta", "label": "Meta Spark 1.3"}
PROMPT = "Return a JSON object."
FULL_JSON = '{"words": ["apple", "banana", "cherry"]}'


def run_meta(first_text, cont_text=None):
    """Run call_model with stubbed HTTP; return (result, captured, cont)."""
    captured = {}
    cont_captured = {}
    orig_key = gen.META_API_KEY

    def fake_post(url, headers, payload, timeout, label):
        captured.update(url=url, headers=headers, payload=payload,
                        timeout=timeout, label=label)
        body = json.dumps({"choices": [{"message": {"content": first_text}}],
                           "usage": {}})
        return FakeResp(body)

    old_post_with_retries = gen._post_with_retries
    old_requests_post = gen.requests.post
    gen._post_with_retries = fake_post
    gen.META_API_KEY = "test-meta-key"
    if cont_text is not None:
        def fake_requests_post(url, headers=None, timeout=None, **kw):
            cont_captured.update(url=url, headers=headers, payload=kw.get("json"),
                                 timeout=timeout)
            body = json.dumps({"choices": [{"message": {"content": cont_text}}],
                               "usage": {}})
            return FakeResp(body)
        gen.requests.post = fake_requests_post
    try:
        result = gen.call_model(PROMPT, META_CFG)
    finally:
        gen._post_with_retries = old_post_with_retries
        gen.requests.post = old_requests_post
        gen.META_API_KEY = orig_key
    return result, captured, cont_captured


def main():
    apis = [m["api"] for m in gen.MODEL_CHAIN]
    test("meta is last in chain with muse-spark-1.3 id",
         apis[-1] == "meta" and gen.MODEL_CHAIN[-1]["id"] == "muse-spark-1.3",
         str(apis))

    orig_key = gen.META_API_KEY
    gen.META_API_KEY = ""
    try:
        missing = gen.call_model(PROMPT, META_CFG)
    finally:
        gen.META_API_KEY = orig_key
    test("missing META_API_KEY skips with None (no HTTP attempted)",
         missing is None, repr(missing))

    result, cap, _ = run_meta(FULL_JSON)
    payload = cap.get("payload", {})
    test("call returns the message content",
         result == FULL_JSON, repr(result))
    test("meta uses the api.meta.ai chat completions endpoint",
         cap.get("url") == "https://api.meta.ai/v1/chat/completions",
         str(cap.get("url")))
    test("meta sends Bearer auth from META_API_KEY",
         cap.get("headers", {}).get("Authorization") == "Bearer test-meta-key")
    test("meta payload model is muse-spark-1.3",
         payload.get("model") == "muse-spark-1.3", str(payload.get("model")))
    test("meta payload temperature 0.6 and top_p 0.95 (shared payload)",
         payload.get("temperature") == 0.6 and payload.get("top_p") == 0.95,
         str({k: payload.get(k) for k in ("temperature", "top_p")}))
    test("meta payload max_tokens 16384",
         payload.get("max_tokens") == 16384, str(payload.get("max_tokens")))
    test("meta payload response_format json_object",
         payload.get("response_format") == {"type": "json_object"},
         str(payload.get("response_format")))
    test("meta payload reasoning_effort low (cost control)",
         payload.get("reasoning_effort") == "low",
         str(payload.get("reasoning_effort")))
    test("meta timeout is 300s (reasoning-model class, like Kimi)",
         cap.get("timeout") == 300, str(cap.get("timeout")))

    cont_result, _, cont_cap = run_meta(
        '{"words": ["apple", "banana", ', '"cherry"]}')
    cont_payload = cont_cap.get("payload", {})
    test("continuation carries reasoning_effort low",
         cont_payload.get("reasoning_effort") == "low",
         str(cont_payload.get("reasoning_effort")))
    test("continuation keeps max_tokens 16384",
         cont_payload.get("max_tokens") == 16384,
         str(cont_payload.get("max_tokens")))
    test("truncated JSON completes via continuation",
         cont_result is not None and json.loads(cont_result)["words"] == [
             "apple", "banana", "cherry"],
         repr(cont_result))

    wf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "..", ".github", "workflows",
                           "generate-daily-puzzle.yml")
    with open(wf_path, encoding="utf-8") as fh:
        wf_text = fh.read()
    test("workflow maps META_API_KEY from secrets",
         "META_API_KEY: ${{ secrets.META_API_KEY }}" in wf_text)

    print(f"\n{PASS} passed, {FAIL} failed")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
