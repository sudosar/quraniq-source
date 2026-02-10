# Google Apps Script — Daily Puzzle Workflow Trigger

This script acts as an external cron backup to trigger the GitHub Actions
`Generate Daily Puzzle` workflow reliably every day, even when GitHub's
built-in cron scheduler is delayed or skipped.

## How It Works

1. Google Apps Script runs a time-driven trigger at **00:01 UTC** daily
2. It sends a `POST` request to the GitHub API to dispatch the workflow
3. A retry trigger at **01:00 UTC** fires as a safety net
4. The workflow's `generate_daily_puzzle.py` script is idempotent — if
   today's puzzle already exists in `history/`, it skips generation and
   just re-deploys

## Setup Instructions

### Step 1: Create a GitHub Personal Access Token (PAT)

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
2. Create a new token with:
   - **Token name:** `QuranIQ Daily Puzzle Trigger`
   - **Expiration:** 1 year (or custom)
   - **Repository access:** Only select repositories → `sudosar/quraniq`
   - **Permissions:**
     - **Actions:** Read and write (to trigger workflows)
     - **Contents:** Read (to access the repo)
3. Copy the token — you'll need it in Step 3

### Step 2: Create the Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click **New project**
3. Name it: `QuranIQ Puzzle Trigger`
4. Replace the default code with the script below

### Step 3: Add the Script

Paste this into the Apps Script editor:

```javascript
// ============================================
// QuranIQ Daily Puzzle — GitHub Workflow Trigger
// ============================================

// CONFIGURATION — Replace with your actual token
const GITHUB_PAT = 'YOUR_GITHUB_PAT_HERE';
const REPO_OWNER = 'sudosar';
const REPO_NAME = 'quraniq';
const WORKFLOW_FILE = 'generate-daily-puzzle.yml';
const BRANCH = 'claude/quranic-puzzle-game-RWunP';

/**
 * Trigger the GitHub Actions workflow via the workflow_dispatch API.
 * This is idempotent — the workflow script skips generation if
 * today's puzzle already exists.
 */
function triggerDailyPuzzle() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_PAT}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ ref: BRANCH }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();

  if (code === 204) {
    Logger.log('✅ Workflow triggered successfully');
  } else {
    Logger.log(`❌ Failed to trigger workflow: HTTP ${code}`);
    Logger.log(response.getContentText());
  }
}

/**
 * Verify the workflow ran successfully by checking recent runs.
 * Call this ~10 minutes after triggering to confirm.
 */
function checkWorkflowStatus() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=1`;

  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${GITHUB_PAT}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());

  if (data.workflow_runs && data.workflow_runs.length > 0) {
    const run = data.workflow_runs[0];
    const today = new Date().toISOString().slice(0, 10);
    const runDate = run.created_at.slice(0, 10);

    if (runDate === today && run.conclusion === 'success') {
      Logger.log(`✅ Today's puzzle generated successfully (Run #${run.run_number})`);
    } else if (runDate === today && run.status === 'in_progress') {
      Logger.log(`⏳ Workflow is still running (Run #${run.run_number})`);
    } else {
      Logger.log(`⚠️ No successful run found for today. Latest: ${runDate} — ${run.conclusion}`);
      // Retry trigger
      triggerDailyPuzzle();
    }
  }
}
```

### Step 4: Set Up Time-Driven Triggers

1. In the Apps Script editor, click the **clock icon** (Triggers) in the left sidebar
2. Click **+ Add Trigger**
3. Set up the **primary trigger**:
   - Function: `triggerDailyPuzzle`
   - Event source: Time-driven
   - Type: Day timer
   - Time of day: **12am to 1am** (this is UTC if your script timezone is UTC)
4. Click **Save**
5. Add a **retry trigger**:
   - Function: `checkWorkflowStatus`
   - Event source: Time-driven
   - Type: Day timer
   - Time of day: **1am to 2am**
6. Click **Save**

### Step 5: Set the Script Timezone to UTC

1. Click the **gear icon** (Project Settings) in the left sidebar
2. Under **Script Properties**, check the timezone
3. Change it to **(GMT+00:00) UTC** if it's not already

### Step 6: Test It

1. In the script editor, select `triggerDailyPuzzle` from the function dropdown
2. Click **Run** (▶)
3. Check the **Execution log** — you should see "✅ Workflow triggered successfully"
4. Go to [GitHub Actions](https://github.com/sudosar/quraniq/actions/workflows/generate-daily-puzzle.yml) to verify the run started

## Security Notes

- The GitHub PAT is stored in the Apps Script source code. For better security,
  use [Script Properties](https://developers.google.com/apps-script/guides/properties)
  to store the token:
  ```javascript
  // In Project Settings → Script Properties, add: GITHUB_PAT = your_token
  const GITHUB_PAT = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
  ```
- The PAT only needs `actions:write` and `contents:read` on the single repository
- Set the PAT expiration to 1 year and add a calendar reminder to renew it

## Troubleshooting

| Issue | Solution |
|-------|----------|
| HTTP 404 | Check the workflow file name and repo owner/name |
| HTTP 403 | PAT doesn't have `actions:write` permission |
| HTTP 422 | Branch name is wrong |
| Trigger not firing | Check Apps Script timezone is UTC |
| Puzzle still stale | Check GitHub Actions run status; deploy job may have failed |
