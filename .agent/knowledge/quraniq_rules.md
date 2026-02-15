# QuranIQ Project Rules & Workflows

This document defines the persistent operational rules for the QuranIQ project. These rules must be followed for all code changes and documentation tasks.

## 1. Documentation Source of Truth
- **File**: `docs/QuranIQ_Puzzle_Design_&_Generation_Knowledge_Base.md`
- **Rule**: This file must be updated simultaneously with any changes to the game logic, cooldowns, or validation rules. No logic change is complete without a corresponding documentation update.

## 2. Commit & Push Protocol
- **Rule**: All changes (code, documentation, and research scripts) must be staged, committed, and pushed to GitHub immediately upon completion of a task. Avoid leaving uncommitted changes in the workspace.
- **Commit Format**: Use descriptive commit messages (e.g., `fix(logic): ...`, `feat(docs): ...`).

## 3. Harmonic Cooldown Windows
The following cooldown periods are established for the daily puzzle generator:
- **Global Verse Cooldown**: 365 Days (no verse reuse across ANY games).
- **Game-Specific Items**: 365 Days (Words, specific Ayah Scramble refs).
- **Deduction Characters**: 60 Days.
- **Connection Themes**: 30 Days (for English category names).
- **Surah-Level Cooldown**: 30 Days (for single-verse games).

## 4. Regeneration Safeguard
- When regenerating puzzles for the current day, always exclude today's history file from the `load_history` call to prevent the generator from blocking its own previous attempts (avoiding self-collision).
