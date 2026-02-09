# QuranIQ Leaderboard Setup Guide

## Overview
This sets up a free anonymous leaderboard using Google Sheets as a database and Google Apps Script as the API endpoint.

## Step-by-Step Setup

### 1. Create the Google Sheet
1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it **"QuranIQ Scores"**
3. Rename the first sheet tab (bottom) to **"Scores"**
4. In row 1, add these headers:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| id | score | games | wins | streak | versesExplored | timestamp |

### 2. Add the Apps Script
1. In the spreadsheet, go to **Extensions → Apps Script**
2. Delete any existing code in the editor
3. Copy and paste the entire contents of `docs/google_apps_script.js`
4. Click **Save** (💾 icon)

### 3. Deploy as Web App
1. Click **Deploy → New deployment**
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**
3. Set:
   - **Description:** "QuranIQ Score API"
   - **Execute as:** "Me"
   - **Who has access:** "Anyone"
4. Click **Deploy**
5. **Authorize** the app when prompted (click through the "unsafe" warning — it's your own script)
6. **Copy the Web App URL** — it will look like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

### 4. Add the URL to QuranIQ
1. Open `js/utils.js` in the repo
2. Find the line: `const SCORE_ENDPOINT = '';`
3. Paste your Web App URL between the quotes
4. Commit and push

### 5. Test
- Open the Web App URL in a browser — you should see:
  ```json
  {"totalPlayers":0,"brackets":[],"updated":"2026-02-09"}
  ```
- Play a game on QuranIQ — check the Google Sheet for a new row

## How It Works
- **Anonymous:** Each player gets a random hash ID (no personal info collected)
- **Real-time percentiles:** After each score submission, the API returns the player's actual percentile among all players
- **Free forever:** Google Sheets + Apps Script has no usage limits for this scale
- **You can see all data:** Just open the Google Sheet to see all player scores

## Updating the Script
If you need to update the Apps Script code:
1. Go to the spreadsheet → Extensions → Apps Script
2. Edit the code
3. Click **Deploy → Manage deployments**
4. Click the pencil icon ✏️ on the active deployment
5. Set **Version** to "New version"
6. Click **Deploy**
