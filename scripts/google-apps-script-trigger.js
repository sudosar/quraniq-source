// ============================================
// QuranIQ Daily Puzzle — GitHub Workflow Trigger
// ============================================
//
// SETUP INSTRUCTIONS:
// 1. Create a Fine-Grained Personal Access Token at https://github.com/settings/tokens
//    - Repository access: sudosar/quraniq-source
//    - Permissions: Actions (Read and write)
// 2. Store the token in GITHUB_PAT below (replace YOUR_TOKEN_HERE)
// 3. Set up daily trigger in Google Apps Script:
//    - Triggers → Add Trigger → triggerDailyPuzzle → Time-driven → Day timer → 12am-1am

const GITHUB_PAT = 'YOUR_TOKEN_HERE';  // ⚠️ REPLACE WITH YOUR ACTUAL TOKEN
const REPO_OWNER = 'sudosar';
const SOURCE_REPO = 'quraniq-source';  // Private source repo
const PUZZLE_WORKFLOW = 'generate-daily-puzzle.yml';
const DEPLOY_WORKFLOW = 'publish-app.yml';
const BRANCH = 'main';

/**
 * Trigger the GitHub Actions workflow via the workflow_dispatch API.
 * This is idempotent — the workflow script skips generation if
 * today's puzzle already exists.
 */
function triggerDailyPuzzle() {
  // Step 1: Trigger puzzle generation
  const generateResult = triggerWorkflow(PUZZLE_WORKFLOW);

  if (generateResult.success) {
    Logger.log('✅ Puzzle generation workflow triggered successfully');

    // Wait 60 seconds for puzzle generation to complete
    Utilities.sleep(60000);

    // Step 2: Trigger deployment to public repo
    const deployResult = triggerWorkflow(DEPLOY_WORKFLOW);

    if (deployResult.success) {
      Logger.log('✅ Deployment workflow triggered successfully');
    } else {
      Logger.log(`⚠️ Deployment trigger failed: ${deployResult.message}`);
      Logger.log('💡 The deployment may still happen automatically via push trigger');
    }
  } else {
    Logger.log(`❌ Failed to trigger puzzle generation: ${generateResult.message}`);
  }
}

/**
 * Generic function to trigger a workflow via workflow_dispatch API
 */
function triggerWorkflow(workflowFile) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${SOURCE_REPO}/actions/workflows/${workflowFile}/dispatches`;

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

  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();

    if (code === 204) {
      return { success: true };
    } else {
      const errorBody = response.getContentText();
      return {
        success: false,
        message: `HTTP ${code}: ${errorBody}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Verify the workflow ran successfully by checking recent runs.
 * If no successful run found for today, retriggers the workflow.
 */
function checkWorkflowStatus() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${SOURCE_REPO}/actions/workflows/${PUZZLE_WORKFLOW}/runs?per_page=1`;

  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${GITHUB_PAT}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    if (data.workflow_runs && data.workflow_runs.length > 0) {
      const run = data.workflow_runs[0];
      const today = new Date().toISOString().slice(0, 10);
      const runDate = run.created_at.slice(0, 10);

      if (runDate === today && run.conclusion === 'success') {
        Logger.log(`✅ Today's puzzle generated successfully (Run #${run.run_number})`);

        // Verify deployment also succeeded
        checkDeploymentStatus();
      } else if (runDate === today && run.status === 'in_progress') {
        Logger.log(`⏳ Workflow is still running (Run #${run.run_number})`);
      } else {
        Logger.log(`⚠️ No successful run found for today. Latest: ${runDate} — ${run.conclusion}`);
        triggerDailyPuzzle();
      }
    } else {
      Logger.log('⚠️ No workflow runs found. Triggering now...');
      triggerDailyPuzzle();
    }
  } catch (error) {
    Logger.log(`❌ Error checking workflow status: ${error}`);
  }
}

/**
 * Check if deployment to public repo succeeded
 */
function checkDeploymentStatus() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/quraniq/commits/main`;

  const options = {
    method: 'GET',
    headers: {
      'Accept': 'application/vnd.github.v3+json'
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    const commitDate = data.commit.author.date.slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    if (commitDate === today) {
      Logger.log(`✅ Public repo updated today: ${data.commit.message}`);
    } else {
      Logger.log(`⚠️ Public repo not updated today. Last update: ${commitDate}`);
      Logger.log('💡 Triggering deployment workflow...');
      triggerWorkflow(DEPLOY_WORKFLOW);
    }
  } catch (error) {
    Logger.log(`⚠️ Could not verify public repo status: ${error}`);
  }
}
