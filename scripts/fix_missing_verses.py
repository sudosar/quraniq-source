#!/usr/bin/env python3
import json
import os
import sys
import time
from datetime import datetime

# Add script directory to path to import from generate_daily_puzzle
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from generate_daily_puzzle import fetch_verse_text, word_in_verse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")
HISTORY_DIR = os.path.join(DATA_DIR, "history")
DAILY_PUZZLE_PATH = os.path.join(DATA_DIR, "daily_puzzle.json")
HISTORY_FILE_PATH = os.path.join(HISTORY_DIR, "2026-02-15.json")

def repair_connections(data):
    """Repair missing verses in Connections data."""
    print("Repairing Connections data...")
    categories = data.get("connections", {}).get("categories", [])
    
    # If passed just the puzzle object (daily_puzzle.json structure)
    if "puzzle" in data and "categories" in data["puzzle"]:
         categories = data["puzzle"]["categories"]
    
    modified = False
    for cat in categories:
        # 1. Check/Fix Category Verse
        cat_verse = cat.get("verse", {})
        if cat_verse and cat_verse.get("ref") and (not cat_verse.get("ayah") or not cat_verse.get("en")):
            print(f"  Fixing category verse {cat_verse['ref']}...")
            verse_data = fetch_verse_text(cat_verse["ref"])
            if verse_data:
                cat["verse"]["ayah"] = verse_data["arabic"]
                cat["verse"]["en"] = verse_data["english"]
                modified = True
                print("    -> Fixed.")
            else:
                print("    -> Failed to fetch.")
        
        # 2. Check/Fix Item Verses
        for item in cat.get("items", []):
            if item.get("ref") and (not item.get("verse") or not item.get("verseEn")):
                print(f"  Fixing item verse {item['ref']} for word {item.get('ar')}...")
                verse_data = fetch_verse_text(item["ref"])
                if verse_data:
                    item["verse"] = verse_data["arabic"]
                    item["verseEn"] = verse_data["english"]
                    modified = True
                    print("    -> Fixed.")
                else:
                    print("    -> Failed to fetch.")
    return modified

def main():
    # 1. Fix History File
    if os.path.exists(HISTORY_FILE_PATH):
        print(f"Processing history file: {HISTORY_FILE_PATH}")
        with open(HISTORY_FILE_PATH, 'r') as f:
            history_data = json.load(f)
        
        if repair_connections(history_data):
            print("  Saving repaired history file...")
            with open(HISTORY_FILE_PATH, 'w') as f:
                json.dump(history_data, f, ensure_ascii=False, indent=2)
        else:
            print("  No changes needed for history file.")
    else:
        print(f"History file not found: {HISTORY_FILE_PATH}")

    # 2. Fix Daily Puzzle File
    if os.path.exists(DAILY_PUZZLE_PATH):
        print(f"\nProcessing daily puzzle file: {DAILY_PUZZLE_PATH}")
        with open(DAILY_PUZZLE_PATH, 'r') as f:
            daily_data = json.load(f)
        
        # daily_puzzle.json has a different structure: root -> puzzle -> categories
        # but repair_connections handles determining structure or we pass the right part.
        # Actually daily_puzzle.json structure is:
        # { "date": "...", "puzzle": { "categories": [...] }, ... }
        # repair_connections expects the object containing "categories" usually under "connections" key in history,
        # or we can pass the daily_data and let it find "puzzle" -> "categories".
        
        # Let's handle it explicitly to be safe
        categories = daily_data.get("puzzle", {}).get("categories", [])
        modified = False
        
        print("Repairing Daily Puzzle Connections...")
        for cat in categories:
             # 1. Category Verse
            cat_verse = cat.get("verse", {})
            if cat_verse and cat_verse.get("ref") and (not cat_verse.get("ayah") or not cat_verse.get("en")):
                print(f"  Fixing category verse {cat_verse['ref']}...")
                verse_data = fetch_verse_text(cat_verse["ref"])
                if verse_data:
                    cat["verse"]["ayah"] = verse_data["arabic"]
                    cat["verse"]["en"] = verse_data["english"]
                    modified = True
                    print("    -> Fixed.")
            
            # 2. Item Verses
            for item in cat.get("items", []):
                if item.get("ref") and (not item.get("verse") or not item.get("verseEn")):
                    print(f"  Fixing item verse {item['ref']} for word {item.get('ar')}...")
                    verse_data = fetch_verse_text(item["ref"])
                    if verse_data:
                        item["verse"] = verse_data["arabic"]
                        item["verseEn"] = verse_data["english"]
                        modified = True
                        print("    -> Fixed.")

        if modified:
            print("  Saving repaired daily puzzle file...")
            with open(DAILY_PUZZLE_PATH, 'w') as f:
                json.dump(daily_data, f, ensure_ascii=False, indent=2)
        else:
            print("  No changes needed for daily puzzle file.")

if __name__ == "__main__":
    main()
