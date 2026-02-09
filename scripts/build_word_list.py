#!/usr/bin/env python3
"""
Build a Quranic word list for Harf by Harf validation.

Fetches the Quran text surah-by-surah from alquran.cloud API (Uthmani script),
extracts all unique words, normalizes them (strip diacritics), and
groups them by character length.

Output: data/quran_words.json — a compact lookup file used by wordle.js
to validate that guesses are real Quranic words.
"""
import json
import re
import requests
import os
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "..", "data", "quran_words.json")


def strip_diacritics(text):
    """Remove Arabic diacritics (tashkeel) from text."""
    diacritics = re.compile(
        r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC'
        r'\u06DF-\u06E8\u06EA-\u06ED\u0640]'
    )
    return diacritics.sub('', text)


def normalize_word(word):
    """Normalize an Arabic word for comparison."""
    word = strip_diacritics(word)
    word = word.replace('\u0640', '')  # Remove tatweel
    word = re.sub(r'[^\u0621-\u064A]', '', word)  # Keep only Arabic letters
    return word


def fetch_surah(surah_num, max_retries=3):
    """Fetch a single surah with retries."""
    url = f"https://api.alquran.cloud/v1/surah/{surah_num}/quran-uthmani"
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if data.get("code") == 200:
                return data["data"]["ayahs"]
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(1)
            else:
                print(f"  Failed to fetch surah {surah_num}: {e}")
    return None


def main():
    print("Fetching Quran text surah-by-surah...")

    all_words = set()
    total_ayahs = 0

    for surah_num in range(1, 115):  # 114 surahs
        ayahs = fetch_surah(surah_num)
        if not ayahs:
            print(f"  WARNING: Skipped surah {surah_num}")
            continue

        total_ayahs += len(ayahs)
        for ayah in ayahs:
            text = ayah["text"]
            words = text.split()
            for w in words:
                # Clean: keep only Arabic letters and diacritics
                w = re.sub(
                    r'[^\u0621-\u064A\u064B-\u065F\u0610-\u061A'
                    r'\u0670\u06D6-\u06ED\u0640]', '', w
                )
                if not w:
                    continue
                normalized = normalize_word(w)
                if len(normalized) >= 2:
                    all_words.add(normalized)

        if surah_num % 10 == 0:
            print(f"  Processed {surah_num}/114 surahs ({len(all_words)} unique words so far)")

    print(f"\nProcessed {total_ayahs} ayahs from 114 surahs")
    print(f"Found {len(all_words)} unique normalized words")

    # Group by length
    by_length = {}
    for word in sorted(all_words):
        length = len(word)
        if length not in by_length:
            by_length[length] = []
        by_length[length].append(word)

    # Print stats
    print("\nWord count by length:")
    for length in sorted(by_length.keys()):
        count = len(by_length[length])
        print(f"  {length} letters: {count} words")

    # Build output: include lengths 2-9
    output = {}
    total_included = 0
    for length in range(2, 10):
        if length in by_length:
            output[str(length)] = sorted(by_length[length])
            total_included += len(by_length[length])

    print(f"\nIncluded {total_included} words (lengths 2-9)")

    # Save
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    file_size = os.path.getsize(OUTPUT_FILE)
    print(f"Saved to {OUTPUT_FILE} ({file_size:,} bytes / {file_size/1024:.1f} KB)")

    return 0


if __name__ == "__main__":
    exit(main())
