
import json
import requests
import re
import os

def fetch_quran_chapter_data():
    url = "https://api.quran.com/api/v4/chapters?language=en"
    response = requests.get(url)
    response.raise_for_status()
    data = response.json()
    return {chapter['id']: chapter['verses_count'] for chapter in data['chapters']}

def calculate_expected_offsets(chapter_verse_counts):
    expected_offsets = {1: 0}
    cumulative_verses = 0
    for i in range(1, 114):
        cumulative_verses += chapter_verse_counts.get(i, 0)
        expected_offsets[i + 1] = cumulative_verses
    return expected_offsets

def get_current_offsets_from_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    match = re.search(r'SURAH_AYAH_OFFSET = ({[^}]+})', content, re.DOTALL)
    if not match:
        raise ValueError("SURAH_AYAH_OFFSET dictionary not found in the file.")

    current_offsets_str = match.group(1)
    return eval(current_offsets_str)

def main():
    script_path = os.path.join(os.path.dirname(__file__), 'generate_daily_puzzle.py')

    print("Fetching actual verse counts from Quran.com API...")
    chapter_verse_counts = fetch_quran_chapter_data()
    
    print("Calculating expected SURAH_AYAH_OFFSET...")
    expected_offsets = calculate_expected_offsets(chapter_verse_counts)
    
    # Print the full expected_offsets dictionary for easy copy-pasting
    print("\n--- Expected SURAH_AYAH_OFFSET Dictionary ---")
    print(json.dumps(expected_offsets, indent=4))
    print("--------------------------------------------")

    # The rest of the validation logic can remain, but the primary goal is to get the updated dict
    print(f"Loading current SURAH_AYAH_OFFSET from {script_path}...")
    current_offsets = get_current_offsets_from_file(script_path)

    discrepancies = {}
    for surah_num, expected_offset in expected_offsets.items():
        if surah_num in current_offsets:
            if current_offsets[surah_num] != expected_offset:
                discrepancies[surah_num] = {
                    "current": current_offsets[surah_num],
                    "expected": expected_offset
                }
        else:
            discrepancies[surah_num] = {
                "current": "MISSING",
                "expected": expected_offset
            }
    
    for surah_num in current_offsets:
        if surah_num not in expected_offsets:
            discrepancies[surah_num] = {
                "current": current_offsets[surah_num],
                "expected": "EXTRA"
            }

    if discrepancies:
        print("\n!!! DISCREPANCIES FOUND in SURAH_AYAH_OFFSET !!!")
        for surah_num, data in discrepancies.items():
            if data["expected"] == "EXTRA":
                print(f"  Surah {surah_num}: EXTRA entry in script (value: {data['current']})")
            elif data["current"] == "MISSING":
                print(f"  Surah {surah_num}: MISSING from script (expected: {data['expected']})")
            else:
                print(f"  Surah {surah_num}: Current={data['current']}, Expected={data['expected']}")
        print("\nPlease update the SURAH_AYAH_OFFSET dictionary in generate_daily_puzzle.py using the 'Expected SURAH_AYAH_OFFSET Dictionary' above.")
        return 1
    else:
        print("\n✓ All SURAH_AYAH_OFFSET values are correct and match Quran.com API.")
        return 0

if __name__ == "__main__":
    exit(main())
