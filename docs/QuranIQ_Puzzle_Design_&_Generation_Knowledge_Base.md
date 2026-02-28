# QuranIQ Puzzle Design & Generation Knowledge Base

This document summarizes the comprehensive set of rules, logic, and user-driven design principles established for the QuranIQ daily puzzle games. It serves as a central knowledge base for maintaining and extending the puzzle generation system.

---

## 1. Global Puzzle Generation Philosophy

The overarching goal is to create engaging, high-quality, and Quranically accurate puzzles that encourage learning and reflection. The system is designed for full automation, with robust validation and fallback mechanisms to ensure a new puzzle is successfully generated every day.

### 1.1. Cooldown & Deduplication System

To ensure content variety and maximize Quranic coverage, a multi-layered cooldown and deduplication system is in place.

| Cooldown Type | Duration | Applies To | Description |
| :--- | :--- | :--- | :--- |
| **Global Verse Cooldown** | 365 Days | All Games | A verse reference used in any game cannot be used in any other game for one year. |
| **Connection Theme Cooldown** | 30 Days | Connections | English category names cannot be reused for 30 days to ensure thematic freshness. |
| **Game-Specific Cooldown** | 365 Days | All Games | Core items (specific words, verse references) cannot be reused for one year. |
| **Deduction Character Cooldown** | 60 Days | Who Am I? | A character featured in a puzzle cannot be featured again for 60 days. |
| **Surah Cooldown** | 30 Days | Wordle, Scramble, Deduction | These single-verse games cannot use a Surah featured in the last 30 days. |

### 1.2. LLM & Technical Implementation

| Aspect | Implementation Details |
| :--- | :--- |
| **Model Fallback Chain** | The system uses a chain of models to ensure successful generation, trying them in order of performance and cost-effectiveness: 1. `gemini-2.5-flash`, 2. `DeepSeek-R1`, 3. `gpt-4.1`. |
| **Retry Logic** | Each game generation attempt is retried up to 5 times per model before moving to the next model in the chain. |
| **Partial History Saving** | If a multi-game generation run fails (e.g., 3 of 4 games succeed), the successful games are saved to history. The next run will only attempt to generate the failed games. |
| **JSON Continuation** | If a model's JSON output is truncated, the system automatically sends a continuation request with the partial output to complete the response. |
| **Arabic Normalization** | A `normalize_arabic()` function standardizes different script forms (Uthmani vs. standard) for reliable validation. |
| **Semantic Pardon** | If words are visually or morphologically similar (e.g., *Al-ibil* vs *Iblis*), they are "pardoned" and allowed if their English meanings are conceptually distinct. |
| **Prefix Hardening** | Similarity checks strip common Arabic prepositions (`bi`, `wa`, `fa`, `li`) and their combinations with the definite article (`al`) to correctly catch derivations. |
| **Regeneration Logic** | During generation, the system excludes today's existing history file from cooldown checks. This allows for manual or automatic regenerations of the current day's puzzles without them being blocked by their own previous attempts. |
| **Validation Handling** | Enhanced validation for root words to account for weak letters (Waw, Ya, Alif) and hamza variations. |

---

## 2. Game-Specific Design & Rules

Each game has a unique set of rules and generation logic tailored to its format.

### 2.1. Ayah Connections

This is the most complex game to generate, requiring strict validation.

| Rule | Description |
| :--- | :--- |
| **Structure** | A 4x4 grid with 4 distinct categories of 4 items each. |
| **Difficulty** | Categories are generated with increasing difficulty: 1 easy, 1 medium, 1 hard, 1 tricky. |
| **Word-in-Verse (Critical)** | The **exact** Arabic word form for each item must be present in its cited Quranic verse. This is verified against a live Quran API. |
| **Unique Words** | All 16 words must be unique. Reuse from history triggers a **Warning** (not a hard failure) to allow for common Quranic concepts. |
| **Unique Roots (Critical)** | All 16 words must come from different Arabic roots. The system prevents variations of the same root (e.g., `وَعْدَ` and `مَوْعِدًا`) within the same puzzle, unless pardoned by the **Semantic Pardon** logic. |
| **Generation Method** | Puzzles are generated **row-by-row** (one category at a time) to improve reliability. The prompt for each new category is updated with the words, roots, meanings, and themes used in the previous categories to ensure uniqueness. |
| **Item-Level Repair** | If a generated category has 1-2 items that fail validation (e.g., word-in-verse mismatch), the system attempts to repair only those specific items instead of regenerating the entire category. |

### 2.2. Harf by Harf (Wordle)

A simple word-guessing game with specific constraints.

| Rule | Description |
| :--- | :--- |
| **Word Length** | The target word must be 3-5 Arabic letters long (after removing diacritics). |
| **Content** | Words should be meaningful Quranic concepts, nouns, or verb roots. |
| **Hint** | A clever but fair English hint must be provided. In the UI, revealing a letter costs 1 turn/row. It is intentionally disabled if the user has < 1 turn left. |
| **Cooldown** | Enforces a 365-day cooldown on words and hints, and a 30-day cooldown on the Surah of the source verse. |

### 2.3. Who Am I? (Deduction)

A mystery-figure guessing game with a strong emphasis on narrative and preventing spoilers.

| Rule | Description |
| :--- | :--- |
| **Gender Neutrality (Critical)** | The main title and introductory paragraph **must not** reveal the gender of the figure. This is enforced by a validation check that rejects any text containing gendered pronouns or nouns (e.g., "he", "she", "king", "mother"). |
| **First-Person Clues** | The 6 progressive clues must be written in the first person ("I..." or "We..."), as if the character is speaking. |
| **Structure** | The puzzle consists of a title, intro, 6 clues, and 4 guessing categories (Identity, Trial/Event, Key Element, Outcome), each with 5 options. |
| **Cooldown** | Enforces a 60-day cooldown on the featured character/figure and a 30-day cooldown on the Surah of the source verse. |

### 2.4. Ayah Scramble

A verse-reconstruction puzzle.

| Rule | Description |
| :--- | :--- |
| **Verse Selection** | Verses should be significant and well-known, between 5 and 15 words long. |
| **Segmentation** | The verse is broken into 4-7 consecutive segments for the player to rearrange. |
| **Cooldown** | Enforces a 30-day cooldown on the Surah of the chosen verse. |

### 2.5. Ayah Sequencer
 A sequencing puzzle focusing on verse order and context.

| Rule | Description |
| :--- | :--- |
| **Objective** | Arrange 3-5 verses in correct chronological or surah order. |
| **Difficulty Scaling** | Level 1: Consecutive verses. Level 2: Consecutive from mid-surah. Level 3: Non-consecutive but thematic. Level 4: Chronological revelation order. |
| **Validation** | Checks integer sequence of verse numbers. |
| **Educational Value** | Teaches continuity, context, and Hifz retention. |

---

## 3. Player-Facing UI/UX & Ranking

These preferences and systems were designed based on direct user feedback.

### 3.1. Player Ranking System

A 5-factor formula calculates a player's score (0-100), which determines their title.

| Factor | Weight | Capped At | Description |
| :--- | :--- | :--- | :--- |
| **Win Rate** | 25% | 100% | Rewards skill and accuracy. |
| **Best Streak** | 15% | 15 games | Rewards consistency. |
| **Games Played** | 20% | 100 games | Rewards engagement volume. |
| **Quran % Explored** | 20% | 100% | Rewards breadth of Quranic learning. |
| **Days Active** | 20% | 60 days | Rewards long-term commitment. |

Titles are awarded based on achieving both a minimum score and minimum engagement milestones, making higher ranks feel earned.

| Title | Min Score | Min Games | Min Days | Min Quran % | Min Streak |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hafiz** | 85 | 200 | 60 | 10% | 15 |
| **Quranic Scholar** | 70 | 100 | 30 | 5% | 10 |
| **Dedicated Learner** | 55 | 40 | 14 | 2% | 5 |
| **Rising Student** | 35 | 16 | 7 | 0.5% | 3 |
| **Eager Seeker** | 20 | 4 | 2 | — | 1 |

### 3.2. UI/UX Preferences

| Feature | Implementation |
| :--- | :--- |
| **Verse Display** | On results screens, the small numeric verse link was replaced with a prominent title displaying the Surah name (e.g., "Surah Al-Baqarah (2:255)"). The entire verse card is now a clickable hyperlink to Quran.com. |
| **Rating Emojis** | Crescent moon emojis (e.g., 🌙) are preferred over stars for displaying ratings or achievements. |
| **Percentile Phrasing** | Comparative performance is displayed as "Better than X% of players". |
| **Streak Protection** | A "Freeze" item allows players to miss a day without losing their streak. Purchasable with in-game currency. |
| **Social Sharing** | Standardized sharing format with deep links to specific puzzles, including score summary (e.g., "I solved QuranIQ #123 in 45s! 🌙"). |
