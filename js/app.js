/* ============================================
   QURANPUZZLE - APP INITIALIZATION
   ============================================ */

// ==================== APP STATE ====================
const app = {
    currentMode: 'connections',
    dayNumber: getDayNumber(),
    state: loadState(),
    stats: loadStats(),
    statsViewMode: 'connections'
};

// Cleanup old state entries (older than 7 days)
cleanupOldState(app.state);

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initModeSelector();
    initSidebar();
    initModals();
    initResetButton();
    initConnections();
    initWordle();
    initDeduction();
    initScramble();
    startCountdown();
});

// ==================== THEME ====================
function initTheme() {
    const saved = localStorage.getItem('quranpuzzle_theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    document.getElementById('theme-btn').addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('quranpuzzle_theme', isDark ? 'light' : 'dark');
        announce(isDark ? 'Switched to light mode' : 'Switched to dark mode');
    });
}

// ==================== MODE SELECTOR (with keyboard nav) ====================
function initModeSelector() {
    const tabs = [...document.querySelectorAll('.mode-tab')];
    tabs.forEach((tab, idx) => {
        tab.addEventListener('click', () => switchMode(tab.dataset.mode));
        // Arrow key navigation between tabs
        tab.addEventListener('keydown', (e) => {
            let newIdx = -1;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                newIdx = (idx + 1) % tabs.length;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                newIdx = (idx - 1 + tabs.length) % tabs.length;
            } else if (e.key === 'Home') {
                newIdx = 0;
            } else if (e.key === 'End') {
                newIdx = tabs.length - 1;
            }
            if (newIdx >= 0) {
                e.preventDefault();
                tabs[newIdx].focus();
                tabs[newIdx].click();
            }
        });
    });
}

function switchMode(mode) {
    app.currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(t => {
        const isActive = t.dataset.mode === mode;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        t.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    document.querySelectorAll('.game-mode').forEach(g => g.classList.toggle('active', g.id === `${mode}-game`));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.mode === mode));
    announce(`Switched to ${mode} mode`);
}

// ==================== SIDEBAR ====================
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const menuBtn = document.getElementById('menu-btn');

    menuBtn.addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('visible');
        overlay.classList.remove('hidden');
        menuBtn.setAttribute('aria-expanded', 'true');
        // Focus the close button
        document.getElementById('sidebar-close').focus();
    });

    const closeSidebar = () => {
        sidebar.classList.remove('visible');
        sidebar.classList.add('hidden');
        overlay.classList.add('hidden');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.focus();
    };

    document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Close sidebar on Escape
    sidebar.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSidebar();
    });

    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            switchMode(link.dataset.mode);
            closeSidebar();
        });
    });
}

// ==================== MODALS ====================
function initModals() {
    document.getElementById('stats-btn').addEventListener('click', () => showStatsModal());
    document.getElementById('stats-close').addEventListener('click', () => closeModal('stats-modal'));
    document.getElementById('help-btn').addEventListener('click', () => showHelpModal());
    document.getElementById('help-close').addEventListener('click', () => closeModal('help-modal'));
    document.getElementById('result-close').addEventListener('click', () => closeModal('result-modal'));

    // Close modals on overlay click
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
    });

    // Close modals on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach(m => closeModal(m.id));
        }
    });

    // Stats mode tabs
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            app.statsViewMode = tab.dataset.statsMode;
            document.querySelectorAll('.stats-tab').forEach(t => {
                const isActive = t.dataset.statsMode === app.statsViewMode;
                t.classList.toggle('active', isActive);
                t.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            renderStatsContent();
        });
    });
}

// ==================== RESET BUTTON ====================
function initResetButton() {
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (!confirm('Reset the current puzzle? Your progress will be lost.')) return;
        localStorage.removeItem(STATE_KEY);
        app.state = {};
        location.reload();
    });
}

// ==================== PER-MODE STATS ====================
function showStatsModal() {
    // Default to current game mode
    app.statsViewMode = app.currentMode;
    document.querySelectorAll('.stats-tab').forEach(t => {
        const isActive = t.dataset.statsMode === app.statsViewMode;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    renderStatsContent();
    openModal('stats-modal');
}

function renderStatsContent() {
    const s = app.stats[app.statsViewMode] || createDefaultModeStats();
    document.getElementById('stat-played').textContent = s.played;
    document.getElementById('stat-win-pct').textContent = s.played ? Math.round((s.won / s.played) * 100) : 0;
    document.getElementById('stat-streak').textContent = s.streak;
    document.getElementById('stat-max-streak').textContent = s.maxStreak;

    const distEl = document.getElementById('guess-distribution');
    distEl.innerHTML = '';
    const maxDist = Math.max(1, ...Object.values(s.distribution));
    for (let i = 1; i <= 6; i++) {
        const count = s.distribution[i] || 0;
        const pct = Math.max(8, (count / maxDist) * 100);
        distEl.innerHTML += `<div class="dist-row"><div class="dist-label">${i}</div><div class="dist-bar" style="width:${pct}%" role="progressbar" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${maxDist}">${count}</div></div>`;
    }
}

function updateModeStats(mode, won, guessNum) {
    const s = app.stats[mode];
    if (!s) return;
    const today = app.dayNumber;

    // Prevent double-counting same day for same mode
    if (s.lastDay === today) return;

    s.played++;
    if (won) {
        s.won++;
        s.streak = (s.lastDay === today - 1 || s.lastDay === -1) ? s.streak + 1 : 1;
        s.maxStreak = Math.max(s.maxStreak, s.streak);
        if (guessNum >= 1 && guessNum <= 6) {
            s.distribution[guessNum] = (s.distribution[guessNum] || 0) + 1;
        }
    } else {
        s.streak = 0;
    }
    s.lastDay = today;
    saveStats(app.stats);
}

// ==================== HELP MODAL ====================
function showHelpModal() {
    const content = document.getElementById('help-content');
    const helps = {
        connections: `
            <h3>Ayah Connections</h3>
            <p>Find four groups of four related Quranic items. Select four items you think belong together, then tap Submit.</p>
            <p>Difficulty increases with each group:</p>
            <p>🟨 Easiest &rarr; 🟩 &rarr; 🟦 &rarr; 🟪 Hardest</p>
            <p>You have 4 mistakes before the game ends. Each incorrect guess costs one attempt.</p>
        `,
        wordle: `
            <h3>Verse Wordle</h3>
            <p>Guess the Arabic Quranic word in 6 tries. Use the on-screen Arabic keyboard to type letters.</p>
            <div class="example-row" style="direction:rtl">
                <div class="example-cell" style="background:var(--correct)">ر</div>
                <div class="example-cell" style="background:var(--absent)">ح</div>
                <div class="example-cell" style="background:var(--present)">م</div>
                <div class="example-cell" style="background:var(--absent)">ة</div>
            </div>
            <p><strong style="color:var(--correct)">Green</strong> = correct letter & position. <strong style="color:var(--present)">Yellow</strong> = correct letter, wrong position. <strong style="color:var(--absent)">Gray</strong> = not in the word.</p>
            <p>An English hint is shown to help you guess the Arabic word!</p>
        `,
        deduction: `
            <h3>Prophet Deduction</h3>
            <p>Read the story clues and deduce the correct answers in each category. Click on clues to reveal them one at a time.</p>
            <p>Select your answers for each category, then submit. The fewer clues you need, the better your score!</p>
        `,
        scramble: `
            <h3>Ayah Scramble</h3>
            <p>The words of a Quranic verse have been scrambled. Tap words to place them in order, rebuilding the verse.</p>
            <p>You have a limited number of moves. Try to solve it in as few moves as possible!</p>
            <p>Tap a placed word to remove it from the answer zone.</p>
        `
    };
    content.innerHTML = helps[app.currentMode] || helps.connections;
    openModal('help-modal');
}

// ==================== RESULT MODAL ====================
function showResultModal({ icon, title, verse, arabic, translation, emojiGrid, statsText, shareText }) {
    document.getElementById('result-icon').textContent = icon;
    document.getElementById('result-title').textContent = title;

    const verseEl = document.getElementById('result-verse');
    if (arabic || translation) {
        verseEl.style.display = 'block';
        verseEl.innerHTML = (arabic ? `<span>${arabic}</span>` : '') +
            (translation ? `<span class="translation">${translation}</span>` : '');
    } else {
        verseEl.style.display = 'none';
    }

    document.getElementById('result-grid').textContent = emojiGrid || '';
    document.getElementById('result-stats').textContent = statsText || '';

    // Share buttons
    const shareBtn = document.getElementById('share-btn');
    const copyBtn = document.getElementById('copy-btn');
    const toast = document.getElementById('share-toast');

    const newShareBtn = shareBtn.cloneNode(true);
    shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
    newShareBtn.id = 'share-btn';

    const newCopyBtn = copyBtn.cloneNode(true);
    copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
    newCopyBtn.id = 'copy-btn';

    const doShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ text: shareText });
            } catch {}
        } else {
            await navigator.clipboard.writeText(shareText);
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 2000);
        }
    };

    newShareBtn.addEventListener('click', doShare);
    newCopyBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(shareText);
        toast.classList.remove('hidden');
        announce('Copied to clipboard');
        setTimeout(() => toast.classList.add('hidden'), 2000);
    });

    openModal('result-modal');
}

// ==================== COUNTDOWN TIMER (UTC-based) ====================
function startCountdown() {
    const el = document.getElementById('countdown-timer');
    const update = () => {
        const now = Date.now();
        const todayStart = Math.floor(now / DAY_MS) * DAY_MS;
        const tomorrowStart = todayStart + DAY_MS;
        const diff = tomorrowStart - now;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    update();
    setInterval(update, 1000);
}
