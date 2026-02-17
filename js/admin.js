/**
 * QURANIQ - ADMIN DASHBOARD LOGIC
 * Handles authentication, health checks, and historical data aggregation.
 */

const ADMIN_PIN = "2026"; // Default PIN
const PUZZLE_FILES = {
    connections: 'data/daily_puzzle.json',
    harf: 'data/daily_harf.json',
    deduction: 'data/daily_deduction.json',
    scramble: 'data/daily_scramble.json',
    juz: 'data/daily_juz.json'
};

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

// --- Authentication ---
function initAuth() {
    const authOverlay = document.getElementById('auth-overlay');
    const adminMain = document.getElementById('admin-main');
    const pinInput = document.getElementById('admin-pin');
    const authBtn = document.getElementById('auth-btn');
    const authError = document.getElementById('auth-error');
    const logoutBtn = document.getElementById('logout-btn');

    // Check session
    if (sessionStorage.getItem('admin_authorized') === 'true') {
        showDashboard();
    }

    authBtn.addEventListener('click', authorize);
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') authorize();
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('admin_authorized');
        location.reload();
    });

    function authorize() {
        if (pinInput.value === ADMIN_PIN) {
            sessionStorage.setItem('admin_authorized', 'true');
            showDashboard();
        } else {
            authError.textContent = "Invalid administrator PIN.";
            pinInput.value = "";
            pinInput.focus();
        }
    }

    function showDashboard() {
        authOverlay.style.display = 'none';
        adminMain.style.display = 'block';
        updateClock();
        setInterval(updateClock, 1000);
        loadDashboardData();
    }
}

function updateClock() {
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleString();
}

// --- Data Loading ---
async function loadDashboardData() {
    logIntegrity("Starting system diagnostics...", "info");

    // 1. Check Today's Puzzles
    const health = await checkTodayHealth();
    renderHealth(health);

    // 2. Fetch History (Simulation of directory listing for static environment)
    // Note: In a real static build, we would need a manifest.json.
    // For this implementation, we attempt to fetch recent dates.
    await loadHistoryMetrics();
}

async function checkTodayHealth() {
    const results = {};
    const today = new Date().toISOString().split('T')[0];
    let loadedCount = 0;

    logIntegrity(`Checking puzzles for ${today}...`, "info");

    for (const [key, path] of Object.entries(PUZZLE_FILES)) {
        try {
            const resp = await fetch(`${path}?t=${Date.now()}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();

            // Validate date and structure
            const puzzleData = data.date ? data : (data[0] || {});
            const puzzleDate = puzzleData.date || "Unknown";

            const isToday = puzzleDate === today;
            const hasRequired = validateGameStructure(key, puzzleData);

            results[key] = {
                status: (isToday && hasRequired) ? 'ok' : 'warning',
                date: puzzleDate,
                error: !isToday ? "Outdated Puzzle" : (!hasRequired ? "Structure Error" : null)
            };

            if (results[key].status === 'ok') {
                logIntegrity(`✓ ${key}: Validated for today`, "success");
                loadedCount++;
            } else {
                logIntegrity(`⚠ ${key}: ${results[key].error} (${puzzleDate})`, "warning");
            }
        } catch (e) {
            results[key] = { status: 'error', error: e.message };
            logIntegrity(`✗ ${key}: Load failed - ${e.message}`, "error");
        }
    }

    document.getElementById('puzzles-status').textContent = `${loadedCount}/${Object.keys(PUZZLE_FILES).length}`;
    document.getElementById('app-health').textContent = loadedCount === 5 ? "Optimal" : (loadedCount > 0 ? "Degraded" : "Critical");

    return results;
}

function validateGameStructure(type, data) {
    if (!data) return false;
    switch (type) {
        case 'connections': return !!data.categories;
        case 'harf': return !!data.word || (Array.isArray(data) && data[0].word);
        case 'deduction': return !!data.clues;
        case 'scramble': return !!data.arabic;
        case 'juz': return !!data.juz_number;
        default: return true;
    }
}

function renderHealth(health) {
    const list = document.getElementById('health-list');
    list.innerHTML = '';

    for (const [key, info] of Object.entries(health)) {
        const item = document.createElement('div');
        item.className = 'health-item';

        const badgeClass = info.status === 'ok' ? 'status-ok' : (info.status === 'error' ? 'status-error' : 'status-warning');
        const statusText = info.status === 'ok' ? 'Active' : (info.status === 'error' ? 'Error' : 'Warning');
        const icon = info.status === 'ok' ? '✓' : '⚠';

        item.innerHTML = `
            <div class="health-name">
                <span class="label">${key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <span class="meta">${info.date || 'No Data'}</span>
            </div>
            <div class="health-status ${badgeClass}">
                <span>${icon}</span>
                <span>${statusText}</span>
            </div>
        `;
        list.appendChild(item);
    }
}

async function loadHistoryMetrics() {
    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = '';

    // In a production env, we'd fetch a list of history files.
    // For now, we'll scan the last 7 days.
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }

    let totalHistory = 0;

    for (const date of dates) {
        try {
            const resp = await fetch(`data/history/${date}.json`);
            if (!resp.ok) continue;
            const data = await resp.json();
            totalHistory++;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${date}</strong></td>
                <td>${data.connections ? '✓' : '-'}</td>
                <td>${(data.harf || data.wordle) ? '✓' : '-'}</td>
                <td>${data.deduction ? '✓' : '-'}</td>
                <td>${data.scramble ? '✓' : '-'}</td>
                <td>${data.juz ? '✓' : '-'}</td>
                <td><span class="status-ok" style="padding: 2px 8px; border-radius: 4px; font-size: 0.7rem;">Verified</span></td>
            `;
            tableBody.appendChild(row);
        } catch (e) {
            // Skip missing files
        }
    }

    document.getElementById('total-days').textContent = `${totalHistory} Recent Days`;
}

function logIntegrity(msg, type = 'info') {
    const log = document.getElementById('integrity-log');
    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    item.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.prepend(item);
}
