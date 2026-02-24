import json

data = {
  "solved": [
    {
      "name": "المَوَاقِعُ الجُغْرَافِيَّةُ المَذْكُورَةُ بِٱسْمِهَا",
      "nameEn": "Geographical Locations Mentioned by Name",
      "items": [
        {"ar": "مَكَّةَ", "en": "Makkah", "ref": "48:24"},
        {"ar": "مِصْرَ", "en": "Egypt", "ref": "10:87"},
        {"ar": "بَابِلَ", "en": "Babylon", "ref": "2:102"},
        {"ar": "يَثْرِبَ", "en": "Yathrib", "ref": "33:13"}
      ]
    },
    {
      "name": "مُصْطَلَحَاتُ المَنْهَجِ وَٱلسُّلُوكِ",
      "nameEn": "Terms Specifying a Path or Method of Conduct",
      "items": [
        {"ar": "صِرَٰطٍۢ", "en": "A path", "ref": "6:161"},
        {"ar": "ٱلسَّبِيلَ", "en": "The way", "ref": "76:3"},
        {"ar": "طَرِيقَةً", "en": "A method/conduct", "ref": "20:104"},
        {"ar": "مِنْهَاجًۭا", "en": "A clear program", "ref": "5:48"}
      ]
    },
    {
      "name": "أَشْيَاءُ مَادِّيَّةٌ فِى قَصَصِ ٱلأَنْبِيَاءِ",
      "nameEn": "Physical Objects Involved in Prophetic Narratives",
      "items": [
        {"ar": "ٱلْمِحْرَابَ", "en": "The sanctuary/chamber", "ref": "38:21"},
        {"ar": "ٱلتَّابُوتِ", "en": "The chest/ark", "ref": "20:39"},
        {"ar": "قَمِيصَهُ", "en": "His shirt", "ref": "12:28"},
        {"ar": "ٱلْفُلْكِ", "en": "The ship/ark", "ref": "11:37"}
      ]
    },
    {
      "name": "أَسْمَاءُ جَمَاعَاتٍ أَوْ أَلْقَابٍ مَذْكُورَةٍ",
      "nameEn": "Names of Specific Groups or Titles Mentioned",
      "items": [
        {"ar": "ٱلْحَوَارِيُّونَ", "en": "The disciples", "ref": "3:52"},
        {"ar": "ٱلْأَسْبَاطِ", "en": "The tribes", "ref": "2:136"},
        {"ar": "نَقِيبًۭا", "en": "A leader/overseer", "ref": "5:12"},
        {"ar": "ٱلْأُخْدُودِ", "en": "The trench (people of)", "ref": "85:4"}
      ]
    }
  ],
  "mistakes": 4,
  "gameOver": True,
  "correctCount": 4,
  "exploredVerses": [
    "48:24", "10:87", "2:102", "33:13", "6:161", "76:3", "20:104", "5:48",
    "38:21", "20:39", "12:28", "3:52", "2:136", "5:12", "85:4", "11:37"
  ]
}

def calc_score(connState):
    if not connState.get('gameOver'):
        return 0
    
    connScore = 0
    exploredSet = set(connState.get('exploredVerses', []))
    
    correctCount = 4 if len(connState.get('solved', [])) == 4 and connState.get('mistakes', 0) > 0 else connState.get('correctCount', 0)
    
    print(f"Evaluated correctCount: {correctCount}")
    
    for i, s in enumerate(connState.get('solved', [])):
        if i < correctCount:
            connScore += 1
            items = s.get('items', [])
            uniqueRefs = set()
            for item in items:
                ref = item.get('ref', '') if isinstance(item, dict) else ''
                if ref:
                    uniqueRefs.add(ref)
            
            rowTotal = len(uniqueRefs) if uniqueRefs else len(items)
            rowExplored = 0
            for ref in uniqueRefs:
                if ref in exploredSet:
                    rowExplored += 1
            
            print(f"Row {i} - Explored: {rowExplored}/{rowTotal}")
            if rowExplored >= rowTotal:
                connScore += 1
            
    return connScore

print(f"Total Connections Score: {calc_score(data)}")

# JUZ
print(f"Juz Score: 4 (from scores: round2:2, round3:1, round4:1)")
# SCRAMBLE
print(f"Scramble Score: 3 (1 moves, 1 hints, won)")
# DEDUCTION
print(f"Deduction Score: 5 (1 clue, won)")

total = calc_score(data) + 4 + 3 + 5
print(f"Calculated Total: {total}")
