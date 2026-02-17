import json
import os
import glob
from collections import defaultdict

HISTORY_DIR = "data/history"

def analyze_history():
    verse_counts = defaultdict(list)
    word_counts = defaultdict(list)
    
    files = sorted(glob.glob(os.path.join(HISTORY_DIR, "*.json")))
    
    for fpath in files:
        date_str = os.path.basename(fpath).replace(".json", "")
        with open(fpath) as f:
            try:
                data = json.load(f)
            except:
                print(f"Error loading {fpath}")
                continue
            
            # Connections
            conn = data.get("connections")
            if conn:
                for cat in conn.get("categories", []):
                    ref = cat.get("verse", {}).get("ref")
                    if ref:
                        verse_counts[ref].append(f"{date_str} (conn category)")
                    for item in cat.get("items", []):
                        if item.get("ref"):
                            verse_counts[item["ref"]].append(f"{date_str} (conn item)")
                        if item.get("ar"):
                            word_counts[item["ar"]].append(f"{date_str} (conn word)")
            
            # Harf
            wdl = data.get("harf") or data.get("wordle")
            if wdl:
                ref = wdl.get("verseRef") or extract_ref(wdl.get("verse", ""))
                if ref:
                    verse_counts[ref].append(f"{date_str} (harf)")
                if wdl.get("word"):
                    word_counts[wdl["word"]].append(f"{date_str} (harf word)")
                    
            # Deduction
            ded = data.get("deduction")
            if ded:
                ref = ded.get("verseRef")
                if ref:
                    verse_counts[ref].append(f"{date_str} (deduction)")
                cats = ded.get("categories", {})
                if isinstance(cats, dict):
                    identity_cat = cats.get("identity", cats.get("prophet", {}))
                    if identity_cat.get("answer"):
                        word_counts[identity_cat["answer"]].append(f"{date_str} (deduction character)")

            # Scramble
            scr = data.get("scramble")
            if scr:
                ref = scr.get("verseRef")
                if ref:
                    verse_counts[ref].append(f"{date_str} (scramble)")
                if scr.get("arabic"):
                    word_counts[scr["arabic"]].append(f"{date_str} (scramble verse)")

    print("\n--- Verse Reproductions ---")
    for ref, dates in verse_counts.items():
        if len(dates) > 1:
            print(f"{ref}: {', '.join(dates)}")

    print("\n--- Word/Character Reproductions ---")
    for word, dates in word_counts.items():
        if len(dates) > 1:
            print(f"{word}: {', '.join(dates)}")

if __name__ == "__main__":
    analyze_history()
