/**
 * QuranIQ - Anonymous Score Collection Endpoint
 * 
 * Deploy this as a Google Apps Script Web App attached to a Google Sheet.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet called "QuranIQ Scores"
 * 2. Rename the first sheet tab to "Scores"
 * 3. Add headers in row 1: id | score | games | wins | streak | versesExplored | timestamp
 * 4. Go to Extensions > Apps Script
 * 5. Paste this entire code
 * 6. Click Deploy > New Deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy the Web App URL and paste it into js/utils.js as SCORE_ENDPOINT
 */

// Handle POST requests (score submissions)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.id || typeof data.score !== 'number') {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid data' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Scores');
    
    // Check if this player ID already exists (update instead of duplicate)
    const ids = sheet.getRange('A2:A' + sheet.getLastRow()).getValues().flat();
    const existingRow = ids.indexOf(data.id);
    
    const row = [
      data.id,
      Math.min(Math.max(Math.round(data.score), 0), 100), // clamp 0-100
      data.games || 0,
      data.wins || 0,
      data.streak || 0,
      data.versesExplored || 0,
      new Date().toISOString()
    ];
    
    if (existingRow >= 0) {
      // Update existing row
      sheet.getRange(existingRow + 2, 1, 1, 7).setValues([row]);
    } else {
      // Append new row
      sheet.appendRow(row);
    }
    
    // Calculate percentiles from all scores
    const allScores = sheet.getRange('B2:B' + sheet.getLastRow()).getValues()
      .flat()
      .filter(s => typeof s === 'number' && s >= 0);
    
    allScores.sort((a, b) => a - b);
    
    const totalPlayers = allScores.length;
    
    // Calculate percentile brackets (10th, 20th, ... 90th percentile values)
    const brackets = [];
    for (let p = 10; p <= 90; p += 10) {
      const idx = Math.floor((p / 100) * totalPlayers);
      brackets.push(allScores[Math.min(idx, totalPlayers - 1)]);
    }
    
    // Calculate this player's percentile
    const playerScore = Math.round(data.score);
    const belowCount = allScores.filter(s => s < playerScore).length;
    const percentile = totalPlayers > 0 ? Math.round((belowCount / totalPlayers) * 100) : 50;
    
    const response = {
      success: true,
      percentile: percentile,
      totalPlayers: totalPlayers,
      brackets: brackets,
      updated: new Date().toISOString().split('T')[0]
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (fetch current percentiles)
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Scores');
    const lastRow = sheet.getLastRow();
    
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        totalPlayers: 0,
        brackets: [],
        updated: new Date().toISOString().split('T')[0]
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const allScores = sheet.getRange('B2:B' + lastRow).getValues()
      .flat()
      .filter(s => typeof s === 'number' && s >= 0);
    
    allScores.sort((a, b) => a - b);
    
    const totalPlayers = allScores.length;
    const brackets = [];
    for (let p = 10; p <= 90; p += 10) {
      const idx = Math.floor((p / 100) * totalPlayers);
      brackets.push(allScores[Math.min(idx, totalPlayers - 1)]);
    }
    
    // Also return basic stats
    const allData = sheet.getRange('A2:F' + lastRow).getValues();
    const totalGames = allData.reduce((sum, row) => sum + (row[2] || 0), 0);
    const totalVerses = allData.reduce((max, row) => Math.max(max, row[5] || 0), 0);
    
    const response = {
      totalPlayers: totalPlayers,
      totalGamesPlayed: totalGames,
      brackets: brackets,
      avgScore: totalPlayers > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / totalPlayers) : 0,
      updated: new Date().toISOString().split('T')[0]
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
