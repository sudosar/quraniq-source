/**
 * QuranIQ Backend — Bug Reports + Community Dhikr Counter
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
const BRANCH = 'claude/quranic-puzzle-game-RWunP';
const DHIKR_PATH = 'data/dhikr.json';
// ==========================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Route: dhikr counter
    if (data.action === 'dhikr') {
      return handleDhikr(data);
    }
    
    // Route: bug report (default)
    return handleBugReport(data);
    
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'QuranIQ Backend' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== DHIKR COUNTER =====

function handleDhikr(data) {
  const phrase = data.phrase;
  const count = Math.min(Math.max(parseInt(data.count) || 1, 1), 1000); // Cap at 1000
  const validPhrases = ['subhanallah', 'alhamdulillah', 'allahuakbar', 'astaghfirullah', 'lailahaillallah'];
  
  if (!validPhrases.includes(phrase)) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid phrase' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Read current dhikr.json from repo
  const fileUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DHIKR_PATH}?ref=${BRANCH}`;
  const getResp = UrlFetchApp.fetch(fileUrl, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  
  const fileData = JSON.parse(getResp.getContentText());
  const sha = fileData.sha;
  const content = JSON.parse(Utilities.newBlob(Utilities.base64Decode(fileData.content)).getDataAsString());
  
  // Increment (all-time counter, no daily reset)
  content[phrase] = (content[phrase] || 0) + count;
  content.total = validPhrases.reduce((sum, p) => sum + (content[p] || 0), 0);
  
  // Write back to repo
  const newContent = Utilities.base64Encode(JSON.stringify(content, null, 2) + '\n');
  UrlFetchApp.fetch(fileUrl.split('?')[0], {
    method: 'put',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({
      message: 'Update dhikr count',
      content: newContent,
      sha: sha,
      branch: BRANCH
    })
  });
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    total: content.total,
    phrases: {
      subhanallah: content.subhanallah,
      alhamdulillah: content.alhamdulillah,
      allahuakbar: content.allahuakbar,
      astaghfirullah: content.astaghfirullah,
      lailahaillallah: content.lailahaillallah
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

// ===== BUG REPORT =====

function handleBugReport(data) {
  const description = data.description || 'No description provided';
  const userAgent = data.userAgent || 'Unknown';
  const screenSize = data.screenSize || 'Unknown';
  const url = data.url || 'Unknown';
  const timestamp = data.timestamp || new Date().toISOString();
  const gameMode = data.gameMode || 'Unknown';
  const theme = data.theme || 'Unknown';
  const screenshot = data.screenshot || null;
  
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
  
  if (screenshot) {
    const imageUrl = uploadScreenshotToRepo(screenshot, timestamp);
    if (imageUrl) {
      body += `### Screenshot\n\n![Bug Screenshot](${imageUrl})\n`;
    }
  }
  
  body += `\n---\n*Submitted via QuranIQ in-app bug reporter*`;
  
  const issueUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;
  const response = UrlFetchApp.fetch(issueUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({
      title: `[Bug] ${description.substring(0, 80)}${description.length > 80 ? '...' : ''}`,
      body: body,
      labels: ['bug', 'user-reported']
    })
  });
  
  const result = JSON.parse(response.getContentText());
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, issueNumber: result.number, issueUrl: result.html_url }))
    .setMimeType(ContentService.MimeType.JSON);
}

function uploadScreenshotToRepo(base64DataUrl, timestamp) {
  try {
    const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
    const ext = base64DataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
    const safeTimestamp = timestamp.replace(/[:.]/g, '-').replace(/T/, '_').replace(/Z/, '');
    const filename = `bug-screenshots/${safeTimestamp}.${ext}`;
    
    const uploadUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`;
    const response = UrlFetchApp.fetch(uploadUrl, {
      method: 'put',
      contentType: 'application/json',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      payload: JSON.stringify({
        message: `Bug report screenshot ${safeTimestamp}`,
        content: base64Data,
        branch: BRANCH
      })
    });
    
    const result = JSON.parse(response.getContentText());
    return result.content.download_url;
  } catch (e) {
    Logger.log('Screenshot upload failed: ' + e.message);
    return null;
  }
}
