# QuranIQ Daily Juz Puzzle Generation Prompt

## Objective

Generate a daily Juz Puzzle for Ramadan. Each puzzle focuses on one of the 30 Juz of the Quran and consists of four rounds. The output must be a valid JSON object.

## Instructions

1.  **Select a Juz:** For each day of Ramadan, select a Juz from 1 to 30 in sequential order.
2.  **Select a Verse:** From the selected Juz, choose a short, impactful, and representative verse. The verse should be suitable for a puzzle and have a clear theme.
3.  **Create Theme Question:** Formulate a multiple-choice question about the main theme of the selected verse. Provide one correct answer and three plausible but incorrect options.
4.  **Create Surah Question:** Formulate a multiple-choice question to identify the Surah of the selected verse. Provide the correct Surah and three other Surahs from the same Juz or nearby Juz as distractors.
5.  **List Surahs in Juz:** Provide a list of all Surahs that appear in the selected Juz, in the correct order.
6.  **Write Educational Notes:** Provide concise and insightful notes about the verse, theme, and Surah. These notes will be shown to the user at the end of the puzzle.
7.  **Format Output:** The final output must be a single JSON object, following the structure and format of the example below.

## JSON Output Structure

```json
{
  "date": "YYYY-MM-DD",
  "juz_number": <number>,
  "juz_name": "<string>",
  "juz_name_ar": "<string>",
  "verse": {
    "surah_number": <number>,
    "surah_name": "<string>",
    "surah_name_ar": "<string>",
    "ayah_number": <number>,
    "arabic_text": "<string>",
    "translation": "<string>",
    "audio_url": "<string>"
  },
  "theme_question": {
    "correct": "<string>",
    "options": [
      "<string>",
      "<string>",
      "<string>",
      "<string>"
    ]
  },
  "surah_question": {
    "correct_surah": <number>,
    "options": [
      { "num": <number>, "name": "<transliteration>", "name_ar": "<arabic>", "name_en": "<english meaning>" },
      { "num": <number>, "name": "<transliteration>", "name_ar": "<arabic>", "name_en": "<english meaning>" },
      { "num": <number>, "name": "<transliteration>", "name_ar": "<arabic>", "name_en": "<english meaning>" },
      { "num": <number>, "name": "<transliteration>", "name_ar": "<arabic>", "name_en": "<english meaning>" }
    ]
  },
  "surah_order": {
    "surahs": [
      { "num": <number>, "name": "<transliteration>", "name_ar": "<arabic>", "name_en": "<english meaning>" },
      { "num": <number>, "name": "<transliteration>", "name_ar": "<arabic>", "name_en": "<english meaning>" },
      // ... all surahs in the juz
    ]
  },
  "educational_notes": {
    "verse_context": "<string>",
    "theme_explanation": "<string>",
    "surah_overview": "<string>"
  }
}
```

## Example Output (for Juz 1)

```json
{
  "date": "2026-03-01",
  "juz_number": 1,
  "juz_name": "Alif Lam Meem",
  "juz_name_ar": "الم",
  "verse": {
    "surah_number": 2,
    "surah_name": "Al-Baqarah",
    "surah_name_ar": "البقرة",
    "ayah_number": 45,
    "arabic_text": "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ",
    "translation": "And seek help through patience and prayer. Indeed, it is difficult except for the humbly submissive.",
    "audio_url": "https://cdn.islamic.network/quran/audio/128/ar.alafasy/52.mp3"
  },
  "theme_question": {
    "correct": "Seeking help through patience and prayer",
    "options": [
      "Seeking help through patience and prayer",
      "Rules of fasting in Ramadan",
      "Story of Prophet Musa and Pharaoh",
      "Description of the rewards of Paradise"
    ]
  },
  "surah_question": {
    "correct_surah": 2,
    "options": [
      { "num": 1, "name": "Al-Fatiha", "name_ar": "الفاتحة", "name_en": "The Opening" },
      { "num": 2, "name": "Al-Baqarah", "name_ar": "البقرة", "name_en": "The Cow" },
      { "num": 3, "name": "Aal-E-Imran", "name_ar": "آل عمران", "name_en": "The Family of Imran" },
      { "num": 67, "name": "Al-Mulk", "name_ar": "الملك", "name_en": "The Sovereignty" }
    ]
  },
  "surah_order": {
    "surahs": [
      { "num": 1, "name": "Al-Fatiha", "name_ar": "الفاتحة", "name_en": "The Opening" },
      { "num": 2, "name": "Al-Baqarah", "name_ar": "البقرة", "name_en": "The Cow" }
    ]
  },
  "educational_notes": {
    "verse_context": "This verse comes in the context of Allah addressing the Children of Israel, reminding them of His favors and urging them to seek help through patience and prayer. It highlights that true submission to Allah makes even the most difficult acts of worship feel light.",
    "theme_explanation": "Patience (sabr) and prayer (salah) are presented as the two essential tools for a believer facing any difficulty. The Quran pairs them together because sabr strengthens the heart while salah connects it to Allah.",
    "surah_overview": "Al-Baqarah is the longest surah in the Quran with 286 verses. It covers a wide range of topics including faith, law, stories of previous nations, and guidance for the Muslim community. It was revealed in Madinah."
  }
}
```
