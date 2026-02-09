/**
 * QuranIQ Bug Report → GitHub Issues Proxy
 * 
 * Deploy as a Google Apps Script Web App.
 * 
 * SETUP:
 * 1. Go to https://script.google.com and create a new project
 * 2. Paste this code
 * 3. Set the GITHUB_TOKEN and REPO variables below
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL and set it as BUG_REPORT_ENDPOINT in js/bugreport.js
 */

// ===== CONFIGURATION =====
const GITHUB_TOKEN = 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN'; // Fine-grained PAT with Issues write + Contents write permission
const REPO_OWNER = 'sudosar';
const REPO_NAME = 'quraniq';
// ==========================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    const description = data.description || 'No description provided';
    const userAgent = data.userAgent || 'Unknown';
    const screenSize = data.screenSize || 'Unknown';
    const url = data.url || 'Unknown';
    const timestamp = data.timestamp || new Date().toISOString();
    const gameMode = data.gameMode || 'Unknown';
    const theme = data.theme || 'Unknown';
    const screenshot = data.screenshot || null; // base64 data URL
    
    // Build the issue body
    let body = `## Bug Report\n\n`;
    body += `**Description:** ${description}\n\n`;
    body += `---\n\n`;
    body += `### Environment\n`;
    body += `| Field | Value |\n`;
    body += `|-------|-------|\n`;
    body += `| **URL** | ${url} |\n`;
    body += `| **Game Mode** | ${gameMode} |\n`;
    body += `| **Theme** | ${theme} |\n`;
    body += `| **Screen Size** | ${screenSize} |\n`;
    body += `| **User Agent** | \`${userAgent}\` |\n`;
    body += `| **Timestamp** | ${timestamp} |\n\n`;
    
    // If screenshot provided, upload to repo and embed
    if (screenshot) {
      const imageUrl = uploadScreenshotToRepo(screenshot, timestamp);
      if (imageUrl) {
        body += `### Screenshot\n\n![Bug Screenshot](${imageUrl})\n`;
      }
    }
    
    body += `\n---\n*Submitted via QuranIQ in-app bug reporter*`;
    
    // Create GitHub Issue
    const issueUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;
    const issuePayload = {
      title: `[Bug] ${description.substring(0, 80)}${description.length > 80 ? '...' : ''}`,
      body: body,
      labels: ['bug', 'user-reported']
    };
    
    const response = UrlFetchApp.fetch(issueUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      payload: JSON.stringify(issuePayload)
    });
    
    const result = JSON.parse(response.getContentText());
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, issueNumber: result.number, issueUrl: result.html_url }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'QuranIQ Bug Reporter' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Upload screenshot as a file to the repo's bug-screenshots branch and return the raw URL.
 */
function uploadScreenshotToRepo(base64DataUrl, timestamp) {
  try {
    // Extract pure base64 data (remove "data:image/png;base64," or "data:image/jpeg;base64," prefix)
    const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
    
    // Determine file extension
    const ext = base64DataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
    
    // Create a unique filename
    const safeTimestamp = timestamp.replace(/[:.]/g, '-').replace(/T/, '_').replace(/Z/, '');
    const filename = `bug-screenshots/${safeTimestamp}.${ext}`;
    
    // Upload file to repo via GitHub Contents API
    const uploadUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`;
    
    const uploadPayload = {
      message: `Bug report screenshot ${safeTimestamp}`,
      content: base64Data,
      branch: 'claude/quranic-puzzle-game-RWunP'
    };
    
    const response = UrlFetchApp.fetch(uploadUrl, {
      method: 'put',
      contentType: 'application/json',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      payload: JSON.stringify(uploadPayload)
    });
    
    const result = JSON.parse(response.getContentText());
    // Return the download URL which serves the raw image
    return result.content.download_url;
  } catch (e) {
    Logger.log('Screenshot upload failed: ' + e.message);
    return null;
  }
}
