
import json
import re

def normalize_arabic(text):
    # Strip diacritics including distinct Quranic marks
    text = re.sub(r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]', '', text)
    # Normalize Alefis
    text = re.sub(r'[آأإ]', 'ا', text)
    # Normalize Hamzas on carriers to just the carrier or remove standalone
    # (Aligning with js/utils.js helper which might be more aggressive, but let's stick to standard normalization first)
    # Actually, let's match js/utils.js normalizeArabic exactly:
    # return str.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '');
    # The JS function ONLY strips diacritics and special marks. It DOES NOT normalize alefs or hamzas.
    # So we should strictly follow that to ensure input matching works.
    return text

def main():
    source_file = 'quran_source.json'
    output_file = 'data/quran_words.json'

    print(f"Loading {source_file}...")
    with open(source_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # Handle dictionary wrapper if present (checked via head command: it starts with { not [)
    # Actually `head` output showed `{"1":{"id":1...` or similar? 
    # Wait, `head -n 2` output will confirm.
    # If it is a dict with keys as IDs, we need data.values()
    if isinstance(data, dict):
        if 'quran' in data: # Common wrapper
            data = data['quran']
        elif 'data' in data: # Another common wrapper
            data = data['data']
        # If it's a dict of verses keyed by ID (e.g. "1": {...})
        elif all(k.isdigit() for k in list(data.keys())[:5]):
             data = list(data.values())
             
    if not isinstance(data, list):
         print(f"Error: Expected list of verses, got {type(data)}")
         # Fallback for some formats: maybe it is just the dict?
         # Let's verify with the command output first.
         return

    words_by_length = {}
    
    print("Processing verses...")
    # Adjust based on structure of risan/quran-json
    # It usually has a flat array or simple structure. Let's inspect the first item logic in loop.
    # The file from risan/quran-json is a list of objects usually.
    
    # Structure of risan/quran-json: [{ "id": 1, "verse_key": "1:1", "text_uthmani": "..." }, ...]
    # OR maybe just "text". output of `head` showed: `[{"id":1,"verse_key":"1:1","text_uthmani":"بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ"},`
    
    count = 0
    all_words = set()

    for item in data:
        # Check if item is a Surah with verses
        if 'verses' in item and isinstance(item['verses'], list):
            for verse in item['verses']:
                text = verse.get('text_uthmani') or verse.get('text')
                if not text:
                    continue
                    
                raw_words = text.split()
                for w in raw_words:
                    norm = normalize_arabic(w)
                    if not norm: continue
                    all_words.add(norm)
                    
                    # Also add stripped versions (remove prefixes/suffixes)
                    # Common prefixes: Al, Wa, Fa, Bi, Li, Ka
                    # This aligns with game logic where users might guess base forms
                    prefixes = ['وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ل', 'ك']
                    for p in prefixes:
                        if norm.startswith(p) and len(norm) > len(p) + 2:
                            stripped = norm[len(p):]
                            # Before adding, check for common suffixes too
                            # Common suffixes: un, in, at, ha, hum, kum, na
                            suffixes = ['ون', 'ين', 'ات', 'ها', 'هم', 'هن', 'كم', 'نا', 'ى', 'ه', 'ا']
                            for s in suffixes:
                                if stripped.endswith(s) and len(stripped) > len(s) + 2:
                                    stripped_suffix = stripped[:-len(s)]
                                    all_words.add(stripped_suffix)
                                    break
                            
                            all_words.add(stripped)
                            break # Only strip one level of prefix for now to be safe
                            
                    count += 1
        else:
            # Fallback for flat list of verses
            text = item.get('text_uthmani') or item.get('text')
            if not text: continue
            raw_words = text.split()
            for w in raw_words:
                norm = normalize_arabic(w)
                if not norm: continue
                all_words.add(norm)
                count += 1

    print(f"Total words processed: {count}")
    print(f"Unique words found: {len(all_words)}")

    # Group by length
    for w in all_words:
        length = str(len(w))
        if length not in words_by_length:
            words_by_length[length] = []
        words_by_length[length].append(w)

    # Sort each list
    for length in words_by_length:
        words_by_length[length].sort()

    print(f"Writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(words_by_length, f, ensure_ascii=False, separators=(',', ':'))

    print("Checking for 'فجر'...")
    if '3' in words_by_length and 'فجر' in words_by_length['3']:
        print("SUCCESS: 'فجر' found in list.")
    else:
        print("WARNING: 'فجر' NOT found in list.")
        # Debug: check adjacent words
        # Fajr might be standardized differently? e.g. with AL-Fajr? 
        # But Harf by Harf often takes exact verse words.
        # "الفجر" would be length 5.
        if '5' in words_by_length and 'الفجر' in words_by_length['5']:
             print("Found 'الفجر' (with Al).")

if __name__ == "__main__":
    main()
