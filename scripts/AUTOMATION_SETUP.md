# QuranIQ Daily Puzzle Automation Setup

This guide explains how to set up automated daily puzzle generation using Google Apps Script and GitHub Actions.

## Architecture Overview

```
┌─────────────────────────┐
│  Google Apps Script     │  Daily trigger (12am-1am UTC)
│  (Time-based trigger)   │
└────────────┬────────────┘
             │
             ├─1─> Trigger: generate-daily-puzzle.yml (quraniq-source)
             │              ├─ Generates puzzles using AI
             │              ├─ Commits to quraniq-source/main
             │              └─ Auto-triggers publish-app.yml ✓
             │
             └─2─> Trigger: publish-app.yml (quraniq-source) [backup]
                            ├─ Copies public files
                            └─ Pushes to quraniq/main → GitHub Pages
```

## Step 1: Create GitHub Personal Access Token

### Required Token Permissions

You need a **Fine-Grained Personal Access Token** with these settings:

1. Go to https://github.com/settings/tokens?type=beta
2. Click **Generate new token** → **Fine-grained token**
3. Configure:
   - **Token name**: `QuranIQ Daily Automation`
   - **Expiration**: 90 days (or custom)
   - **Repository access**: `Only select repositories`
     - ✅ `sudosar/quraniq-source`
   - **Permissions**:
     - Repository permissions:
       - **Actions**: `Read and write` (required for `workflow_dispatch`)
       - **Contents**: `Read-only` (to verify commits)

4. Click **Generate token** and **copy it immediately** (you won't see it again)

### Security Notes

⚠️ **NEVER commit your token to git**
⚠️ **NEVER share your token in public messages**
⚠️ **Revoke old tokens immediately if exposed**

## Step 2: Set Up Google Apps Script

1. Go to https://script.google.com/
2. Create a new project: **QuranIQ Daily Trigger**
3. Copy the contents of `google-apps-script-trigger.js` into the editor
4. **Replace `YOUR_TOKEN_HERE`** with your actual GitHub token
5. Save the script (Ctrl+S or Cmd+S)

### Set Up Daily Trigger

1. Click the **clock icon** (Triggers) in the left sidebar
2. Click **+ Add Trigger** (bottom right)
3. Configure:
   - Choose which function to run: `triggerDailyPuzzle`
   - Choose which deployment should run: `Head`
   - Select event source: `Time-driven`
   - Select type of time based trigger: `Day timer`
   - Select time of day: `Midnight to 1am` (UTC)
4. Click **Save**

### Optional: Add Status Check Trigger

For redundancy, you can also set up a status check trigger:

1. Add another trigger for function: `checkWorkflowStatus`
2. Configure:
   - Event source: `Time-driven`
   - Type: `Day timer`
   - Time: `1am to 2am` (runs 1 hour after generation)

## Step 3: Configure GitHub Secrets

The workflows need these secrets in your **quraniq-source** repository:

1. Go to https://github.com/sudosar/quraniq-source/settings/secrets/actions
2. Add these secrets:

| Secret Name | Description | How to get it |
|------------|-------------|---------------|
| `GEMINI_API_KEY` | Google Gemini API key (primary model) | https://aistudio.google.com/apikey |
| `OPENAI_API_KEY` | OpenAI API key (fallback) | https://platform.openai.com/api-keys |
| `MODELS_PAT` | GitHub Models access (DeepSeek fallback) | Use same token as above |
| `DEPLOY_TOKEN` | Token to push to quraniq repo | Create separate token with `quraniq` write access |

### Creating the DEPLOY_TOKEN

This token needs **different permissions** than the automation trigger token:

1. Go to https://github.com/settings/tokens?type=beta
2. Create **Fine-grained token**: `QuranIQ Deployment`
3. Configure:
   - Repository access: `Only select repositories`
     - ✅ `sudosar/quraniq` (public repo)
   - Permissions:
     - **Contents**: `Read and write` (to push updates)
4. Add this token as the `DEPLOY_TOKEN` secret

## Testing Your Setup

### Test the Puzzle Generation Trigger

Run this in Google Apps Script (Run → `triggerDailyPuzzle`):

```javascript
triggerDailyPuzzle();
```

Expected output in **Execution log**:
```
✅ Puzzle generation workflow triggered successfully
✅ Deployment workflow triggered successfully
```

### Verify on GitHub

1. Check workflow runs: https://github.com/sudosar/quraniq-source/actions
2. Both workflows should appear:
   - ✅ **Generate Daily Puzzle** (status: success)
   - ✅ **Publish App to Public Repo** (status: success)

3. Verify files updated:
   - Source repo: `data/daily_puzzle.json` should have today's date
   - Public repo: https://github.com/sudosar/quraniq should have new commit

4. Test the live site: https://sudosar.github.io/quraniq

## Troubleshooting

### Error: HTTP 403 "Resource not accessible by personal access token"

**Cause**: Token doesn't have `Actions: Read and write` permission

**Fix**:
1. Go to https://github.com/settings/tokens
2. Find your token → Click **Edit**
3. Under **Repository permissions** → **Actions** → Select `Read and write`
4. Update your token in Google Apps Script

### Error: HTTP 404 "Not Found"

**Cause**: Trying to trigger workflow on wrong repository

**Fix**: Verify these constants in your script:
```javascript
const SOURCE_REPO = 'quraniq-source';  // Must be 'quraniq-source', not 'quraniq'
const BRANCH = 'main';                 // Must match your default branch
```

### Puzzle Generated but Not Deployed

**Symptoms**: `quraniq-source` has new puzzle, but `quraniq` is outdated

**Possible causes**:
1. Missing `DEPLOY_TOKEN` secret
2. `DEPLOY_TOKEN` lacks write permission to `quraniq` repo
3. Deployment workflow failed

**Debug steps**:
1. Check https://github.com/sudosar/quraniq-source/actions/workflows/publish-app.yml
2. Look for error messages in the failed run
3. Verify `DEPLOY_TOKEN` secret exists and has correct permissions
4. Manually trigger: Actions → Publish App to Public Repo → Run workflow

### Deployment Workflow Not Triggering Automatically

**Symptoms**: Generate Daily Puzzle succeeds, but Publish App doesn't auto-trigger

**Cause**: GitHub Actions default GITHUB_TOKEN can't trigger other workflows

**Fix**: Already implemented! The Google Apps Script now triggers both workflows explicitly.

## Monitoring and Logs

### Daily Logs (Google Apps Script)

1. Go to https://script.google.com
2. Open your project
3. View → **Execution log** (or click **Executions** in left sidebar)
4. Check today's run for any errors

### Workflow Logs (GitHub Actions)

1. Source repo: https://github.com/sudosar/quraniq-source/actions
2. Public repo: https://github.com/sudosar/quraniq/actions
3. Click on any workflow run to see detailed logs

### Expected Daily Flow

```
12:00 AM UTC ─┬─> Google trigger fires
              │
12:00:15      ├─> Trigger generate-daily-puzzle.yml
              │
12:00:30      ├─> Workflow starts running
              │   ├─ Fetch verse data from Quran API
              │   ├─ Generate puzzles with AI (Gemini/DeepSeek/GPT)
              │   └─ Commit to quraniq-source/main
              │
12:02:00      ├─> Puzzle generation complete ✅
              │
12:02:10      ├─> Auto-trigger publish-app.yml (via push)
              │   OR explicit trigger from Apps Script (backup)
              │
12:02:30      ├─> Deployment workflow starts
              │   ├─ Copy public files (js, css, data, html)
              │   └─ Push to quraniq/main
              │
12:03:00      └─> Public site updated ✅
                  https://sudosar.github.io/quraniq
```

## Security Best Practices

1. ✅ Use Fine-Grained tokens (not Classic tokens)
2. ✅ Set token expiration (90 days recommended)
3. ✅ Limit token to specific repositories only
4. ✅ Use minimal required permissions
5. ✅ Never commit tokens to git
6. ✅ Rotate tokens regularly (before expiration)
7. ✅ Revoke immediately if exposed

## Future Improvements

- [ ] Add Slack/Discord notifications for failures
- [ ] Set up status dashboard (uptimerobot, etc.)
- [ ] Add retry logic with exponential backoff
- [ ] Cache AI responses to reduce API costs
- [ ] Add puzzle quality validation before deployment
