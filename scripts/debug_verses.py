
import sys
import os

# Add the script directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from generate_daily_puzzle import fetch_verse_text

refs_to_test = [
    "59:23", 
    "54:42", 
    "72:13", 
    "43:53", 
    "59:22", 
    "6:59",
    "35:27" # This one was NOT empty in the file, good control
]

print("Testing verse fetching...")
for ref in refs_to_test:
    print(f"\nTesting {ref}:")
    data = fetch_verse_text(ref)
    if data:
        print(f"  Success!")
        print(f"  Arabic length: {len(data['arabic'])}")
        print(f"  English length: {len(data['english'])}")
        print(f"  Arabic start: {data['arabic'][:30]}...")
    else:
        print("  FAILED to fetch.")
