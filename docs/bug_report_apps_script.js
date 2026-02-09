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
const GITHUB_TOKEN = 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN'; // Fine-grained PAT with Issues write permission
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
    const screenshot = data.screenshot || null; // base64 data URL
    
    // Build the issue body
    let body = `## Bug Report\n\n`;
    body += `**Description:** ${description}\n\n`;
    body += `---\n\n`;
    body += `### Environment\n`;
    body += `| Field | Value |\n`;
    body += `|-------|-------|\n`;
    body += `| **URL** | ${url} |\n`;
    body += `| **User Agent** | ${userAgent} |\n`;
    body += `| **Screen Size** | ${screenSize} |\n`;
    body += `| **Timestamp** | ${timestamp} |\n\n`;
    
    // If screenshot provided, upload to GitHub as an issue comment image
    if (screenshot) {
      // Upload screenshot to a gist for embedding
      const imageUrl = uploadScreenshotToGist(screenshot, timestamp);
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
 * Upload screenshot as a GitHub Gist and return the raw URL for embedding.
 */
function uploadScreenshotToGist(base64DataUrl, timestamp) {
  try {
    // Extract base64 data (remove "data:image/png;base64," prefix)
    const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
    
    const gistUrl = 'https://api.github.com/gists';
    const filename = `quraniq-bug-${timestamp.replace(/[:.]/g, '-')}.md`;
    
    const gistPayload = {
      description: `QuranIQ Bug Report Screenshot - ${timestamp}`,
      public: false,
      files: {}
    };
    gistPayload.files[filename] = {
      content: `![Screenshot](${base64DataUrl})`
    };
    
    const response = UrlFetchApp.fetch(gistUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      },
      payload: JSON.stringify(gistPayload)
    });
    
    const result = JSON.parse(response.getContentText());
    // Return the raw URL of the gist file
    const file = result.files[filename];
    return file.raw_url;
  } catch (e) {
    Logger.log('Screenshot upload failed: ' + e.message);
    return null;
  }
}
