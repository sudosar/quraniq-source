/**
 * QuranIQ — Community Dhikr Counter (Google Apps Script)
 * 
 * SETUP:
 * 1. Create a new Google Sheet named "QuranIQ Dhikr"
 * 2. Rename Sheet1 to "DhikrLog"
 * 3. Add headers in row 1: Date | SubhanAllah | Alhamdulillah | AllahuAkbar | Astaghfirullah | LaIlahaIllallah | Total
 * 4. Open Extensions > Apps Script, paste this code
 * 5. Deploy > New deployment > Web app > Anyone can access > Deploy
 * 6. Copy the URL and set it as DHIKR_ENDPOINT in the frontend
 */

const SHEET_NAME = 'DhikrLog';
const PHRASE_COLS = {
  subhanallah: 2,     // Column B
  alhamdulillah: 3,   // Column C
  allahuakbar: 4,     // Column D
  astaghfirullah: 5,  // Column E
  lailahaillallah: 6  // Column F
};
const TOTAL_COL = 7;  // Column G

/**
 * Get today's row, creating it if needed.
 */
function getTodayRow(sheet) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const rowDate = Utilities.formatDate(new Date(data[i][0]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (rowDate === today) return i + 1; // 1-indexed
  }
  
  // Create new row for today
  const newRow = data.length + 1;
  sheet.getRange(newRow, 1).setValue(today);
  // Initialize all phrase counts to 0
  for (let col = 2; col <= 7; col++) {
    sheet.getRange(newRow, col).setValue(0);
  }
  return newRow;
}

/**
 * Handle POST — increment dhikr count
 * Body: { phrase: "subhanallah", count: 10 }
 */
function doPost(e) {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    
    const payload = JSON.parse(e.postData.contents);
    const phrase = payload.phrase;
    const count = Math.min(Math.max(parseInt(payload.count) || 1, 1), 1000); // Cap at 1000 per request
    
    if (!PHRASE_COLS[phrase]) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid phrase' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const row = getTodayRow(sheet);
    const col = PHRASE_COLS[phrase];
    
    // Increment the phrase count
    const currentVal = sheet.getRange(row, col).getValue() || 0;
    sheet.getRange(row, col).setValue(currentVal + count);
    
    // Update total
    let total = 0;
    for (const c of Object.values(PHRASE_COLS)) {
      total += sheet.getRange(row, c).getValue() || 0;
    }
    sheet.getRange(row, TOTAL_COL).setValue(total);
    
    lock.releaseLock();
    
    // Return updated community totals
    const totals = {};
    for (const [key, c] of Object.entries(PHRASE_COLS)) {
      totals[key] = sheet.getRange(row, c).getValue() || 0;
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      today: total,
      phrases: totals
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET — return today's community totals
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const row = getTodayRow(sheet);
    
    const totals = {};
    for (const [key, c] of Object.entries(PHRASE_COLS)) {
      totals[key] = sheet.getRange(row, c).getValue() || 0;
    }
    const total = sheet.getRange(row, TOTAL_COL).getValue() || 0;
    
    // Also get all-time total
    const data = sheet.getDataRange().getValues();
    let allTime = 0;
    for (let i = 1; i < data.length; i++) {
      allTime += data[i][TOTAL_COL - 1] || 0;
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      today: total,
      allTime: allTime,
      phrases: totals
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
