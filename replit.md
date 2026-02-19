# QuranIQ - Daily Quranic Puzzle Challenge

## Overview
QuranIQ is a Progressive Web App (PWA) that offers daily Quranic puzzle challenges. It features 4 interactive game modes:
- **Ayah Connections** - Group 16 Quranic items into 4 categories
- **Harf by Harf** - Guess the Arabic word in 6 tries
- **Who Am I?** - Guess the Quranic figure from first-person clues
- **Ayah Scramble** - Arrange words to complete a verse

## Project Architecture
- **Type**: Static website / PWA (no build system, no backend)
- **Languages**: HTML, CSS, JavaScript (vanilla)
- **External Services**: Firebase (authentication, groups/leaderboard)
- **Data**: JSON files in `data/` directory for daily puzzles
- **Puzzle Definitions**: `puzzles.js` contains puzzle data

## Project Structure
```
index.html          - Main entry point
admin.html          - Admin interface
test.html           - Test page
server.py           - Simple Python HTTP server for development
js/                 - JavaScript modules (app, games, utils, Firebase)
css/                - Stylesheets
data/               - Daily puzzle JSON data
icons/              - PWA icons
docs/               - Documentation
bug-screenshots/    - Bug report screenshots
manifest.json       - PWA manifest
sw.js               - Service worker
firebase-rules.json - Firebase security rules
```

## Running the App
- Development: `python server.py` (serves on port 5000)
- Deployment: Static file hosting (configured as static deployment)

## Recent Changes
- 2026-02-19: Initial Replit setup - added Python dev server, configured static deployment
