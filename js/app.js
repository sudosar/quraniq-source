/* ============================================
   QURANIQ - APP INITIALIZATION
   ============================================ */

// ==================== APP STATE ====================
const app = {
    currentMode: 'connections',
    dayNumber: getDayNumber(),
    state: loadState(),
    stats: loadStats(),
    statsViewMode: 'connections',
    lastResults: {} // Cache result data per mode so it can be re-shown
};

// Cleanup old state entries (older than 7 days)
cleanupOldState(app.state);

document.addEventListener('DOMContentLoaded', () => {
    initTTS();
    initTheme();
    initModeSelector();
    initSidebar();
    initModals();
    initResetButton();
    initConnections();
    initWordle();
    initDeduction();
    initScramble();
    restoreViewResultsButtons();
    startCountdown();
    initNotifications();
    initBugReport();
    showOnboarding();

    // Hash-based deep linking (e.g., #shukr, #help, #stats)
    const hash = window.location.hash.replace('#', '');
    if (hash === 'shukr') openModal('shukr-modal');
    else if (hash === 'help') openModal('help-modal');
    else if (hash === 'stats') showStatsModal();
});

// ==================== THEME ====================
function initTheme() {
    const saved = localStorage.getItem('quraniq_theme') || localStorage.getItem('quranpuzzle_theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    document.getElementById('theme-btn').addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('quraniq_theme', isDark ? 'light' : 'dark');
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

    // Save progress button
    document.getElementById('save-progress-btn').addEventListener('click', async () => {
        closeSidebar();
        const saveCode = exportProgress();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'QuranIQ Save Code',
                    text: `My QuranIQ save code (keep this safe!):\n\n${saveCode}`
                });
            } catch {
                // User cancelled share, copy to clipboard instead
                await navigator.clipboard.writeText(saveCode);
                showToast('Save code copied to clipboard! Keep it safe.');
            }
        } else {
            await navigator.clipboard.writeText(saveCode);
            showToast('Save code copied to clipboard! Keep it safe.');
        }
    });

    // Restore progress button
    document.getElementById('restore-progress-btn').addEventListener('click', () => {
        closeSidebar();
        openModal('restore-modal');
    });

    // Shukr button
    document.getElementById('shukr-btn').addEventListener('click', () => {
        closeSidebar();
        openModal('shukr-modal');
    });
    document.getElementById('shukr-close').addEventListener('click', () => closeModal('shukr-modal'));

    // Restore modal handlers
    document.getElementById('restore-close').addEventListener('click', () => closeModal('restore-modal'));
    document.getElementById('restore-cancel-btn').addEventListener('click', () => closeModal('restore-modal'));
    document.getElementById('restore-confirm-btn').addEventListener('click', () => {
        const input = document.getElementById('restore-input').value.trim();
        if (!input) {
            showToast('Please paste your save code first.');
            return;
        }
        const result = importProgress(input);
        if (result.success) {
            closeModal('restore-modal');
            showToast(result.message);
            // Reload to apply restored data
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast(result.message);
        }
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

// ==================== HIDDEN DEV RESET (tap logo 5x) ====================
function initResetButton() {
    let tapCount = 0;
    let tapTimer = null;
    const logo = document.querySelector('.logo');
    if (!logo) return;
    logo.addEventListener('click', () => {
        tapCount++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => { tapCount = 0; }, 1500);
        if (tapCount >= 5) {
            tapCount = 0;
            if (!confirm('🔧 Dev Reset: Clear all puzzle state and reload?')) return;
            localStorage.removeItem(STATE_KEY);
            app.state = {};
            location.reload();
        }
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
    const insightsEl = document.getElementById('performance-insights');
    const statsGrid = document.querySelector('.stats-grid');
    const distHeading = document.getElementById('dist-heading');
    const distEl = document.getElementById('guess-distribution');

    if (app.statsViewMode === 'insights') {
        // Show insights, hide regular stats
        statsGrid.style.display = 'none';
        distHeading.style.display = 'none';
        distEl.style.display = 'none';
        insightsEl.style.display = 'block';
        renderPerformanceInsights();
        return;
    }

    // Show regular stats, hide insights
    statsGrid.style.display = '';
    distHeading.style.display = '';
    distEl.style.display = '';
    insightsEl.style.display = 'none';

    const s = app.stats[app.statsViewMode] || createDefaultModeStats();
    document.getElementById('stat-played').textContent = s.played;
    document.getElementById('stat-win-pct').textContent = s.played ? Math.round((s.won / s.played) * 100) : 0;
    document.getElementById('stat-streak').textContent = s.streak;
    document.getElementById('stat-max-streak').textContent = s.maxStreak;

    const maxDist = Math.max(1, ...Object.values(s.distribution));
    distEl.innerHTML = '';
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
    // Submit score to leaderboard (async, non-blocking)
    submitScore().catch(() => {});
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
            <h3>Harf by Harf</h3>
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
            <h3>Who Am I?</h3>
            <p>A Quranic figure speaks in first person through progressive clues. Tap to reveal clues one at a time and figure out who is speaking!</p>
            <p>Select your answers for each category, then submit. The fewer clues you need, the better your score!</p>
        `,
        scramble: `
            <h3>Ayah Scramble</h3>
            <p>The Arabic words of a Quranic verse have been scrambled. Tap the segments to place them in the correct order, rebuilding the verse right-to-left.</p>
            <p>Stuck? Use the <strong>Hint</strong> button to reveal the English translation of one segment. Each hint used will impact your final score.</p>
            <p>Tap a placed word to remove it from the answer zone. Try to solve it in as few moves as possible!</p>
        `
    };
    content.innerHTML = helps[app.currentMode] || helps.connections;
    openModal('help-modal');
}

// ==================== RESULT MODAL ====================
function showResultModal({ icon, title, verse, arabic, translation, emojiGrid, statsText, shareText, moons, verseRef }) {
    // Cache the result so it can be re-opened later
    app.lastResults[app.currentMode] = { icon, title, verse, arabic, translation, emojiGrid, statsText, shareText, moons, verseRef };
    // Show the "View Results" button in the game area
    showViewResultsButton(app.currentMode);

    document.getElementById('result-icon').textContent = icon;
    document.getElementById('result-title').textContent = title;

    const verseEl = document.getElementById('result-verse');
    // Try to extract a surah:ayah ref for linking
    const linkRef = verseRef || extractVerseRef(translation) || extractVerseRef(verse);
    const linkParsed = linkRef ? parseQuranRef(linkRef) : null;

    if (arabic || translation) {
        verseEl.style.display = 'block';
        let translationHtml = translation || '';
        // Make verse reference numbers clickable links to Quran.com
        if (linkParsed && translationHtml) {
            const refPattern = new RegExp(`(${linkParsed.surah}:${linkParsed.ayah}(?:-\\d+)?)`);
            translationHtml = translationHtml.replace(refPattern,
                `<a href="https://quran.com/${linkParsed.surah}/${linkParsed.ayah}" target="_blank" rel="noopener noreferrer" class="verse-ref-link" title="Read on Quran.com">$1</a>`);
        }
        verseEl.innerHTML = (arabic ? `<span>${arabic}</span>` : '') +
            (translationHtml ? `<span class="translation">${translationHtml}</span>` : '');
    } else {
        verseEl.style.display = 'none';
    }

    document.getElementById('result-grid').textContent = emojiGrid || '';
    const moonsEl = document.getElementById('result-stars');
    if (moons !== undefined && moons !== null) {
        moonsEl.textContent = '🌙'.repeat(moons) + '🌑'.repeat(5 - moons);
        moonsEl.style.display = 'block';
    } else {
        moonsEl.style.display = 'none';
    }
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

    // ===== Verse Audio Autoplay =====
    const audioContainer = document.getElementById('result-audio');
    const autoplayBtn = document.getElementById('result-autoplay-btn');
    const isMuted = localStorage.getItem('quraniq_audio_mute') === '1';
    const audioRef = linkRef;

    if (audioRef && linkParsed) {
        audioContainer.style.display = 'flex';

        // Autoplay toggle button
        const newAutoplayBtn = autoplayBtn.cloneNode(true);
        autoplayBtn.parentNode.replaceChild(newAutoplayBtn, autoplayBtn);
        newAutoplayBtn.id = 'result-autoplay-btn';

        const updateAutoplayState = (muted) => {
            if (muted) {
                newAutoplayBtn.textContent = '\uD83D\uDD07 Auto-play off';
                newAutoplayBtn.classList.remove('active');
            } else {
                newAutoplayBtn.textContent = '\uD83D\uDD0A Auto-play on';
                newAutoplayBtn.classList.add('active');
            }
        };
        updateAutoplayState(isMuted);

        newAutoplayBtn.addEventListener('click', () => {
            const nowMuted = localStorage.getItem('quraniq_audio_mute') === '1';
            if (nowMuted) {
                localStorage.removeItem('quraniq_audio_mute');
                updateAutoplayState(false);
                playQuranAudio(audioRef);
                showToast('Verse recitation auto-play enabled');
            } else {
                localStorage.setItem('quraniq_audio_mute', '1');
                updateAutoplayState(true);
                if (typeof stopQuranAudio === 'function') stopQuranAudio();
                showToast('Verse recitation auto-play disabled');
            }
        });

        // Autoplay if not muted
        if (!isMuted) {
            setTimeout(() => playQuranAudio(audioRef), 600);
        }
    } else {
        audioContainer.style.display = 'none';
    }

    openModal('result-modal');
}

// ==================== VIEW RESULTS BUTTON ====================
function showViewResultsButton(mode) {
    const containerId = `${mode}-game`;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove any existing button first
    const existing = container.querySelector('.view-results-btn');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary view-results-btn';
    btn.innerHTML = '📊 View Results & Share';
    btn.setAttribute('aria-label', 'View results and share');
    btn.addEventListener('click', () => {
        const cached = app.lastResults[mode];
        if (cached) {
            // Temporarily set currentMode so the result modal uses the right mode
            const prevMode = app.currentMode;
            app.currentMode = mode;
            showResultModal(cached);
            app.currentMode = prevMode;
        }
    });
    container.appendChild(btn);
}

// Restore "View Results" buttons on page load for completed games
function restoreViewResultsButtons() {
    // Each game mode's setup function now handles restoring the View Results button
    // after the async puzzle load completes. This function is kept for backward
    // compatibility but the actual restore happens in:
    //   - setupConnectionsGame()
    //   - setupWordleGame()
    //   - setupDeductionGame()
    //   - setupScrambleGame()
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

// ==================== PERFORMANCE INSIGHTS ====================

/**
 * Calculate a performance score (0-100) based on win rate, streak, and games played.
 * Balanced formula: 40% win rate, 30% best streak, 30% experience.
 * Rewards consistent daily play and long-term engagement.
 * This is a local-only score — no server needed.
 */
function calculateScore(winRate, maxStreak, played) {
    if (played === 0) return 0;
    const streakBonus = Math.min(maxStreak / 15, 1);
    const gamesBonus = Math.min(played / 30, 1);
    const raw = (winRate * 0.40) + (streakBonus * 0.30) + (gamesBonus * 0.30);
    return Math.max(1, Math.min(99, Math.round(raw * 100)));
}

function getScholarTitle(score, totalPlayed) {
    if (totalPlayed === 0) return { title: 'New Student', emoji: '📖', desc: 'Play your first game to begin your journey!' };
    if (score >= 85) return { title: 'Hafiz', emoji: '🌟', desc: 'Exceptional mastery across all challenges' };
    if (score >= 70) return { title: 'Quranic Scholar', emoji: '🏆', desc: 'Deep understanding and consistent excellence' };
    if (score >= 55) return { title: 'Dedicated Learner', emoji: '📚', desc: 'Strong performance with room to grow' };
    if (score >= 40) return { title: 'Rising Student', emoji: '🌱', desc: 'Building a solid foundation' };
    if (score >= 20) return { title: 'Eager Seeker', emoji: '🔍', desc: 'Every puzzle brings you closer to knowledge' };
    return { title: 'Beginner', emoji: '✨', desc: 'The journey of a thousand miles begins with a single step' };
}

function getGameInsight(mode, stats) {
    if (stats.played === 0) return null;
    const winRate = stats.won / stats.played;
    const score = calculateScore(winRate, stats.maxStreak, stats.played);

    const modeNames = {
        connections: 'Ayah Connections',
        wordle: 'Harf by Harf',
        deduction: 'Who Am I?',
        scramble: 'Ayah Scramble'
    };

    const modeEmojis = {
        connections: '🔗',
        wordle: '🔤',
        deduction: '🔎',
        scramble: '🧩'
    };

    // Determine strength descriptor
    let strength = '';
    if (score >= 70) strength = 'Excellent';
    else if (score >= 50) strength = 'Strong';
    else if (score >= 30) strength = 'Developing';
    else strength = 'Needs Practice';

    return {
        mode,
        name: modeNames[mode],
        emoji: modeEmojis[mode],
        score,
        winRate: Math.round(winRate * 100),
        strength,
        played: stats.played,
        streak: stats.streak,
        maxStreak: stats.maxStreak
    };
}

function renderPerformanceInsights() {
    const el = document.getElementById('performance-insights');
    const modes = ['connections', 'wordle', 'deduction', 'scramble'];

    // Calculate overall stats
    let totalPlayed = 0, totalWon = 0, bestStreak = 0;
    const gameInsights = [];

    modes.forEach(mode => {
        const s = app.stats[mode] || createDefaultModeStats();
        totalPlayed += s.played;
        totalWon += s.won;
        bestStreak = Math.max(bestStreak, s.maxStreak);
        const insight = getGameInsight(mode, s);
        if (insight) gameInsights.push(insight);
    });

    const overallWinRate = totalPlayed > 0 ? totalWon / totalPlayed : 0;
    const overallScore = calculateScore(overallWinRate, bestStreak, totalPlayed);
    const scholar = getScholarTitle(overallScore, totalPlayed);

    // Find strongest and weakest games
    let strongest = null, weakest = null;
    if (gameInsights.length >= 2) {
        gameInsights.sort((a, b) => b.score - a.score);
        strongest = gameInsights[0];
        weakest = gameInsights[gameInsights.length - 1];
    }

    // Backfill verse tracking from currently loaded puzzles
    // (covers games completed before verse tracking was added)
    try {
        const verseRefs = [];
        // Connections
        if (typeof conn !== 'undefined' && conn.puzzle && conn.puzzle.categories) {
            conn.puzzle.categories.forEach(cat => {
                if (cat.items) cat.items.forEach(item => {
                    if (item.ref) verseRefs.push(item.ref);
                });
                if (cat.verse && cat.verse.ref) verseRefs.push(cat.verse.ref);
            });
        }
        // Wordle
        if (typeof wordle !== 'undefined' && wordle.puzzle && wordle.puzzle.verse) {
            verseRefs.push(wordle.puzzle.verse);
        }
        // Deduction
        if (typeof ded !== 'undefined' && ded.puzzle && ded.puzzle.verse) {
            verseRefs.push(ded.puzzle.verse);
        }
        // Scramble
        if (typeof scr !== 'undefined' && scr.puzzle && scr.puzzle.reference) {
            verseRefs.push(scr.puzzle.reference);
        }
        if (verseRefs.length > 0) trackVerses(verseRefs);
    } catch (e) { console.warn('Verse backfill failed:', e); }

    // Get verse stats
    const verseStats = getVerseStats();

    // Build HTML
    let html = '';

    // Try to get real percentile from leaderboard
    let displayPercentile = overallScore;
    let totalPlayersOnline = 0;
    let percentileSource = 'estimated';

    // Check cached percentile first (instant)
    const cached = getCachedPercentile();
    if (cached && cached.percentile !== undefined) {
        displayPercentile = cached.percentile;
        totalPlayersOnline = cached.totalPlayers || 0;
        percentileSource = 'real';
    }

    // Submit score and get fresh percentile (async, updates UI when ready)
    if (totalPlayed > 0) {
        submitScore().then(result => {
            if (result && result.percentile !== undefined) {
                const label = el.querySelector('.percentile-label');
                const fill = el.querySelector('.percentile-fill');
                const playersCount = el.querySelector('.players-count');
                if (label) label.textContent = `Better than ${result.percentile}% of players`;
                if (fill) fill.style.width = `${result.percentile}%`;
                if (playersCount) playersCount.textContent = `${result.totalPlayers} players worldwide`;
            }
        }).catch(() => {});
    }

    const playersCountHtml = totalPlayersOnline > 0
        ? `<div class="players-count">${totalPlayersOnline} players worldwide</div>`
        : (SCORE_ENDPOINT ? '<div class="players-count">Connecting to leaderboard...</div>' : '');

    // Scholar rank card
    html += `
        <div class="insight-card scholar-card">
            <div class="scholar-emoji">${scholar.emoji}</div>
            <div class="scholar-title">${scholar.title}</div>
            <div class="scholar-desc">${scholar.desc}</div>
            <div class="percentile-bar-container">
                <div class="percentile-label">Better than ${displayPercentile}% of players</div>
                <div class="percentile-bar">
                    <div class="percentile-fill" style="width:${displayPercentile}%"></div>
                </div>
                ${playersCountHtml}
            </div>
        </div>
    `;

    // Quran Journey card (show if player has played any games OR has tracked verses)
    if (verseStats.totalVerses > 0 || totalPlayed > 0) {
        html += `
            <div class="insight-section-title">Quran Journey</div>
            <div class="insight-card quran-journey-card">
                <div class="quran-journey-stats">
                    <div class="quran-stat">
                        <div class="quran-stat-number">${verseStats.totalVerses}</div>
                        <div class="quran-stat-label">Verses Explored</div>
                    </div>
                    <div class="quran-stat">
                        <div class="quran-stat-number">${verseStats.uniqueSurahs}</div>
                        <div class="quran-stat-label">Surahs Touched</div>
                    </div>
                    <div class="quran-stat">
                        <div class="quran-stat-number">${verseStats.quranPercent}%</div>
                        <div class="quran-stat-label">of the Quran</div>
                    </div>
                </div>
                <div class="quran-progress-container">
                    <div class="quran-progress-label">Quran Progress</div>
                    <div class="quran-progress-bar">
                        <div class="quran-progress-fill" style="width:${Math.min(verseStats.quranPercent, 100)}%"></div>
                    </div>
                    <div class="quran-progress-text">${verseStats.totalVerses} of 6,236 verses</div>
                </div>
            </div>
        `;
    }

    // Per-game breakdown
    if (gameInsights.length > 0) {
        html += '<div class="insight-section-title">Game Performance</div>';
        html += '<div class="game-insights-grid">';
        gameInsights.forEach(g => {
            const barColor = g.score >= 70 ? 'var(--correct)' :
                             g.score >= 40 ? 'var(--present)' : 'var(--absent)';
            html += `
                <div class="game-insight-card">
                    <div class="game-insight-header">
                        <span class="game-insight-emoji">${g.emoji}</span>
                        <span class="game-insight-name">${g.name}</span>
                    </div>
                    <div class="game-insight-percentile">
                        <div class="mini-bar">
                            <div class="mini-bar-fill" style="width:${g.score}%;background:${barColor}"></div>
                        </div>
                        <span class="mini-pct">${g.score}%</span>
                    </div>
                    <div class="game-insight-stats">
                        <span>${g.winRate}% wins</span>
                        <span>${g.played} played</span>
                        <span>${g.maxStreak} best streak</span>
                    </div>
                    <div class="game-insight-strength ${g.strength.toLowerCase().replace(' ', '-')}">${g.strength}</div>
                </div>
            `;
        });
        html += '</div>';
    }

    // Strengths & tips
    if (strongest && weakest && strongest.mode !== weakest.mode) {
        html += `
            <div class="insight-section-title">Your Profile</div>
            <div class="insight-tips">
                <div class="insight-tip strength">
                    <span class="tip-icon">${strongest.emoji}</span>
                    <span>Your strongest game is <strong>${strongest.name}</strong> — keep it up!</span>
                </div>
                <div class="insight-tip growth">
                    <span class="tip-icon">${weakest.emoji}</span>
                    <span>Try focusing on <strong>${weakest.name}</strong> to improve your overall rank.</span>
                </div>
            </div>
        `;
    }

    // Share button
    if (totalPlayed > 0) {
        html += `
            <div class="insight-share-actions">
                <button id="share-insights-btn" class="btn btn-primary btn-share">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    Share My Journey
                </button>
                <button id="copy-insights-btn" class="btn btn-secondary">Copy to Clipboard</button>
            </div>
        `;
    }

    // No data message
    if (totalPlayed === 0) {
        html = `
            <div class="insight-card scholar-card">
                <div class="scholar-emoji">📖</div>
                <div class="scholar-title">Welcome!</div>
                <div class="scholar-desc">Play some games to unlock your performance insights and discover your Quranic Scholar rank.</div>
            </div>
        `;
    }

    el.innerHTML = html;

    // Attach share button event if present
    const shareInsightsBtn = el.querySelector('#share-insights-btn');
    const copyInsightsBtn = el.querySelector('#copy-insights-btn');
    if (shareInsightsBtn || copyInsightsBtn) {
        const shareText = generateInsightsShareText(scholar, displayPercentile, gameInsights, totalPlayed, bestStreak, totalPlayersOnline);
        if (shareInsightsBtn) {
            shareInsightsBtn.addEventListener('click', async () => {
                if (navigator.share) {
                    try { await navigator.share({ text: shareText }); } catch {}
                } else {
                    await navigator.clipboard.writeText(shareText);
                    showToast('Copied to clipboard!');
                }
            });
        }
        if (copyInsightsBtn) {
            copyInsightsBtn.addEventListener('click', async () => {
                await navigator.clipboard.writeText(shareText);
                showToast('Copied to clipboard!');
            });
        }
    }
}

/**
 * Generate a WhatsApp/social media friendly emoji share text for Insights.
 */
function generateInsightsShareText(scholar, overallScore, gameInsights, totalPlayed, bestStreak, totalPlayersOnline) {
    const progressBar = (pct) => {
        const filled = Math.round(pct / 10);
        return '█'.repeat(filled) + '░'.repeat(10 - filled);
    };

    let text = `📖 QuranIQ - My Journey\n\n`;
    text += `${scholar.emoji} ${scholar.title} | Better than ${overallScore}% of players\n`;
    if (totalPlayersOnline > 0) text += `👥 ${totalPlayersOnline} players worldwide\n`;
    text += `\n`;

    if (gameInsights.length > 0) {
        gameInsights.forEach(g => {
            text += `${g.emoji} ${g.name}: ${g.winRate}% wins ${progressBar(g.winRate)}\n`;
        });
        text += `\n`;
    }

    const verseStats = getVerseStats();
    if (verseStats.totalVerses > 0) {
        text += `📖 ${verseStats.totalVerses} Verses Explored | ${verseStats.uniqueSurahs} Surahs | ${verseStats.quranPercent}% of Quran\n`;
    }
    text += `🏆 Best Streak: ${bestStreak}\n`;
    text += `📊 Games Played: ${totalPlayed}\n\n`;
    text += `https://sudosar.github.io/quraniq/`;

    return text;
}
