# Quran text provenance: data/quran-uthmani.txt

- Source: AlQuranCloud public API, bulk edition endpoint
  https://api.alquran.cloud/v1/quran/quran-uthmani
- Edition: `quran-uthmani` (Uthmani script), fetched 2026-11-01.
- Format: one verse per line, `surah|ayah|text` (Tanzil-style).
- Verified: 114 surahs, 6236 verses (surah 1: 7, surah 2: 286,
  surah 114: 6). Leading BOM stripped at build time.
- SHA-256: 5e6accd845ed3668a0ed45937a4626957b1f38d05598e3df573c6ad39fb45621
- Use: local word-to-verse index for the Connections verse-repair pass
  (scripts/generate_daily_puzzle.py). The Quran text itself is in the
  public domain; this copy is vendored so generation never depends on a
  network lookup to find a verse containing a word.
