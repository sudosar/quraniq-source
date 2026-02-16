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
    initJuzJourney();
    restoreViewResultsButtons();
    startCountdown();
    initNotifications();
    initBugReport();
    initLeaderboard();
    showOnboarding();

    // Hash-based deep linking (e.g., #shukr, #help, #stats, #juz, #join=CODE)
    const hash = window.location.hash.replace('#', '');
    if (hash === 'shukr') openModal('shukr-modal');
    else if (hash === 'help') openModal('help-modal');
    else if (hash === 'stats') showStatsModal();
    else if (hash === 'juz') switchMode('juz');
    else if (hash === 'leaderboard') openModal('leaderboard-modal');
    else if (hash.startsWith('join=')) {
        // Auto-join group from invite link: #join=UMBFUF
        const joinCode = hash.replace('join=', '').trim().toUpperCase();
        if (joinCode.length === 6) {
            // Store pending join code — will be processed after Firebase initializes
            window._pendingJoinCode = joinCode;
            // Clear the hash so it doesn't re-trigger on refresh
            history.replaceState(null, '', window.location.pathname);
        }
    }

    // PWA install prompt
    initPWAInstall();

    // Track if app is running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        trackEvent('pwa_launch', { mode: 'standalone' });
    }
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
        const newTheme = isDark ? 'light' : 'dark';
        announce(isDark ? 'Switched to light mode' : 'Switched to dark mode');
        trackThemeToggle(newTheme);
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
    trackModeSwitch(mode);
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
        document.getElementById('sidebar-close').focus();
        trackSidebarOpen();
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
            trackSidebarLink(link.dataset.mode);
            switchMode(link.dataset.mode);
            closeSidebar();
        });
    });

    // Save progress button
    document.getElementById('save-progress-btn').addEventListener('click', async () => {
        closeSidebar();
        trackSaveProgress();
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
        trackShukrOpen();
        openModal('shukr-modal');
    });
    document.getElementById('shukr-close').addEventListener('click', () => closeModal('shukr-modal'));

    // Sidebar leaderboard button
    document.getElementById('sidebar-leaderboard-btn')?.addEventListener('click', () => {
        closeSidebar();
        if (typeof openLeaderboard === 'function') openLeaderboard();
    });

    // Dhikr counter
    initDhikrCounter();

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
            trackRestoreProgress(true);
            closeModal('restore-modal');
            showToast(result.message);
            setTimeout(() => location.reload(), 1500);
        } else {
            trackRestoreProgress(false);
            showToast(result.message);
        }
    });
}

// ==================== MODALS ====================
function initModals() {
    document.getElementById('stats-btn').addEventListener('click', () => { trackModalOpen('stats'); showStatsModal(); });
    document.getElementById('stats-close').addEventListener('click', () => closeModal('stats-modal'));
    document.getElementById('help-btn').addEventListener('click', () => { trackModalOpen('help'); showHelpModal(); });
    document.getElementById('help-close').addEventListener('click', () => closeModal('help-modal'));
    document.getElementById('leaderboard-btn')?.addEventListener('click', () => { if (typeof openLeaderboard === 'function') openLeaderboard(); });
    document.getElementById('lb-close')?.addEventListener('click', () => closeModal('leaderboard-modal'));
    document.getElementById('result-close').addEventListener('click', () => {
        closeModal('result-modal');
        // Expand all solved rows when closing connections result
        if (app.currentMode === 'connections' && typeof expandAllConnRows === 'function') {
            setTimeout(() => expandAllConnRows(), 300);
        }
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => {
            if (e.target === m) {
                closeModal(m.id);
                if (m.id === 'result-modal' && app.currentMode === 'connections' && typeof expandAllConnRows === 'function') {
                    setTimeout(() => expandAllConnRows(), 300);
                }
            }
        });
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
            trackStatsTabSwitch(tab.dataset.statsMode);
            if (tab.dataset.statsMode === 'insights') trackInsightsView();
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

    // Don't record stats when serving yesterday's stale puzzle
    if (typeof isServingStale === 'function' && isServingStale()) return;

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
    submitScore().catch(() => { });
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
            <p>The segments of a Quranic verse have been scrambled. Tap segments to place them in the answer zone, or <strong>drag</strong> them to reorder. Rebuild the verse in the correct order!</p>
            <p>A free <strong>theme hint</strong> is always shown at the top to give you context about the verse.</p>
            <p><strong>Hints</strong> (each costs 1🌙):</p>
            <ul style="text-align:left;margin:8px auto;max-width:280px">
                <li>Hint 1: Reveals English translations for <em>all</em> segments</li>
                <li>Hints 2–3: Locks a segment in its correct position</li>
            </ul>
            <p>You have <strong>5 attempts</strong> to arrange the verse correctly. Tap a placed segment to remove it, or drag to swap positions.</p>
        `,
        juz: `
            <h3>Juz Journey</h3>
            <p>Explore one Juz of the Quran each day of Ramadan through 4 rounds:</p>
            <ul style="text-align:left;margin:8px auto;max-width:300px">
                <li><strong>📖 Verse Discovery</strong> — Listen to a verse and tap words for English meanings (each costs 1🌙)</li>
                <li><strong>🎯 Theme</strong> — Identify the verse's theme (2 attempts)</li>
                <li><strong>📜 Surah</strong> — Name which Surah the verse belongs to (2 attempts)</li>
                <li><strong>📊 Order</strong> — Arrange the Surahs of the Juz in correct order</li>
            </ul>
            <p>Earn up to <strong>5🌙</strong> per Juz. Hints reduce your score, so use them wisely!</p>
        `
    };
    content.innerHTML = helps[app.currentMode] || helps.connections;
    openModal('help-modal');
}

// ==================== RESULT MODAL ====================
function showResultModal({ icon, title, verse, arabic, translation, emojiGrid, statsText, shareText, moons, verseRef, crescentRow, exploredCount, totalVerses, dynamicShareFn }) {
    // Cache the result so it can be re-opened later
    app.lastResults[app.currentMode] = { icon, title, verse, arabic, translation, emojiGrid, statsText, shareText, moons, verseRef, crescentRow, exploredCount, totalVerses, dynamicShareFn };
    // Show the "View Results" button in the game area
    showViewResultsButton(app.currentMode);

    // Submit score to Firebase group leaderboard (non-blocking)
    if (typeof submitFirebaseScore === 'function') {
        let fbMoons = 0;
        if (moons !== undefined && moons !== null) {
            fbMoons = moons;
        } else if (crescentRow) {
            // Connections: count solved groups (full moons + crescents) in crescent row
            fbMoons = (crescentRow.match(/[🌕🌙]/g) || []).length;
        }
        submitFirebaseScore(app.currentMode, fbMoons).catch(() => { });
    }

    document.getElementById('result-icon').textContent = icon;
    document.getElementById('result-title').textContent = title;

    const verseEl = document.getElementById('result-verse');
    // Try to extract a surah:ayah ref for linking
    const linkRef = verseRef || extractVerseRef(translation) || extractVerseRef(verse);
    const linkParsed = linkRef ? parseQuranRef(linkRef) : null;

    if (arabic || translation) {
        verseEl.style.display = 'block';
        let translationHtml = translation || '';
        // Strip the numeric ref from the translation text (we'll show it in the title instead)
        if (linkParsed && translationHtml) {
            const refPattern = new RegExp(`\\s*${linkParsed.surah}:${linkParsed.ayah}(?:-\\d+)?\\s*[—–-]?\\s*`);
            translationHtml = translationHtml.replace(refPattern, '').trim();
            // Also strip leading "— " if the ref was at the start
            translationHtml = translationHtml.replace(/^[—–-]\s*/, '').trim();
        }
        // Build Surah name title
        const surahName = linkParsed ? getSurahName(linkParsed.surah) : null;
        const surahTitle = surahName
            ? `Surah ${surahName} (${linkParsed.surah}:${linkParsed.ayah})`
            : (linkRef || '');
        const quranUrl = linkParsed
            ? `https://quran.com/${linkParsed.surah}/${linkParsed.ayah}`
            : null;
        // Build the verse card as a clickable link
        const titleHtml = surahTitle
            ? `<div class="result-verse-title">${surahTitle}</div>`
            : '';
        const arabicHtml = arabic ? `<span class="result-verse-arabic">${arabic}</span>` : '';
        const transHtml = translationHtml ? `<span class="translation">— ${translationHtml}</span>` : '';
        if (quranUrl) {
            verseEl.innerHTML = `<a href="${quranUrl}" target="_blank" rel="noopener noreferrer" class="result-verse-link" title="Read on Quran.com">${titleHtml}${arabicHtml}${transHtml}</a>`;
        } else {
            verseEl.innerHTML = `${titleHtml}${arabicHtml}${transHtml}`;
        }
    } else if (app.currentMode === 'connections' && crescentRow) {
        // For connections: show exploration stats and encourage more exploration
        verseEl.style.display = 'block';
        const freshData = typeof getConnCrescentData === 'function' ? getConnCrescentData() : { totalExplored: exploredCount || 0, totalVerses: totalVerses || 16 };
        const allExplored = freshData.totalExplored >= freshData.totalVerses;
        verseEl.innerHTML = `<div class="conn-explore-stats" style="cursor:pointer;">
            <div class="explore-count">Verses explored: <strong>${freshData.totalExplored}/${freshData.totalVerses}</strong></div>
            ${!allExplored ? '<div class="explore-hint">\uD83C\uDF15 Tap rows below to explore more verses and earn full moons</div>' : '<div class="explore-hint explore-complete">\u2728 All verses explored! Ma sha Allah! \u2728</div>'}
        </div>`;
        if (!allExplored) {
            verseEl.querySelector('.conn-explore-stats').addEventListener('click', () => {
                trackExplorePromptTap();
                closeModal('result-modal');
                setTimeout(() => expandAllConnRows(), 300);
            });
        }
    } else if (app.currentMode === 'connections') {
        // Tappable prompt that closes modal and expands rows
        verseEl.style.display = 'block';
        verseEl.innerHTML = '<span class="translation conn-explore-tap" style="font-style:italic; cursor:pointer;">Tap to explore the ayahs from today\'s puzzle \u25BC</span>';
        verseEl.querySelector('.conn-explore-tap').addEventListener('click', () => {
            trackExplorePromptTap();
            closeModal('result-modal');
            setTimeout(() => expandAllConnRows(), 300);
        });
    } else {
        verseEl.style.display = 'none';
    }

    document.getElementById('result-grid').textContent = emojiGrid || '';

    // Crescent / Moon display
    const moonsEl = document.getElementById('result-stars');
    if (crescentRow) {
        // Connections mode: show dynamic crescent row
        const freshData = typeof getConnCrescentData === 'function' ? getConnCrescentData() : null;
        moonsEl.textContent = freshData ? freshData.crescentRow : crescentRow;
        moonsEl.style.display = 'block';
    } else if (moons !== undefined && moons !== null) {
        moonsEl.textContent = '\uD83C\uDF19'.repeat(moons) + '\uD83C\uDF11'.repeat(5 - moons);
        moonsEl.style.display = 'block';
    } else {
        moonsEl.style.display = 'none';
    }
    document.getElementById('result-stats').textContent = statsText || '';

    // Ensure share actions are visible (may have been hidden by encouragement modal)
    const actionsEl = document.querySelector('#result-modal .result-actions');
    if (actionsEl) actionsEl.style.display = '';

    // Share buttons — use dynamicShareFn if available (for connections)
    const shareBtn = document.getElementById('share-btn');
    const copyBtn = document.getElementById('copy-btn');
    const toast = document.getElementById('share-toast');

    const newShareBtn = shareBtn.cloneNode(true);
    shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
    newShareBtn.id = 'share-btn';

    const newCopyBtn = copyBtn.cloneNode(true);
    copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
    newCopyBtn.id = 'copy-btn';

    const getShareText = () => {
        // If there's a dynamic share function, call it for fresh data
        if (typeof dynamicShareFn === 'function') return dynamicShareFn();
        return shareText;
    };

    const doShare = async () => {
        const text = getShareText();
        if (navigator.share) {
            try {
                await navigator.share({ text });
                trackShare(app.currentMode, 'native_share');
            } catch { }
        } else {
            await navigator.clipboard.writeText(text);
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 2000);
            trackShare(app.currentMode, 'clipboard');
        }
    };

    newShareBtn.addEventListener('click', doShare);
    newCopyBtn.addEventListener('click', async () => {
        const text = getShareText();
        await navigator.clipboard.writeText(text);
        toast.classList.remove('hidden');
        announce('Copied to clipboard');
        setTimeout(() => toast.classList.add('hidden'), 2000);
        trackShare(app.currentMode, 'clipboard');
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

    // Hide game controls to declutter UI
    if (mode === 'connections') {
        const controls = container.querySelector('.connections-controls');
        if (controls) controls.style.display = 'none';
    } else if (mode === 'scramble') {
        const controls = container.querySelector('.scramble-controls');
        if (controls) controls.style.display = 'none';
    }
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
 * Calculate a performance score (0-100) based on 5 factors:
 * 25% win rate, 15% best streak, 20% games played, 20% Quran % explored, 20% days active.
 * Rewards skill, consistency, volume, and Quranic exploration.
 * This is a local-only score — no server needed.
 */
function calculateScore(winRate, maxStreak, played, quranPercent, daysActive) {
    if (played === 0) return 0;
    const streakFactor = Math.min(maxStreak / 15, 1);
    const gamesFactor = Math.min(played / 100, 1);
    const quranFactor = Math.min((quranPercent || 0) / 100, 1);
    const daysFactor = Math.min((daysActive || 0) / 60, 1);
    const raw = (winRate * 0.25) + (streakFactor * 0.15) + (gamesFactor * 0.20) + (quranFactor * 0.20) + (daysFactor * 0.20);
    return Math.max(1, Math.min(99, Math.round(raw * 100)));
}

/**
 * Determine the scholar title based on score AND minimum milestone requirements.
 * Each tier requires both a minimum score and minimum engagement thresholds.
 */
function getScholarTitle(score, totalPlayed, maxStreak, quranPercent, daysActive) {
    if (totalPlayed === 0) return { title: 'New Student', emoji: '📖', desc: 'Play your first game to begin your journey!' };
    if (score >= 85 && totalPlayed >= 200 && daysActive >= 60 && quranPercent >= 10 && maxStreak >= 15)
        return { title: 'Hafiz', emoji: '🌟', desc: 'Exceptional mastery across all challenges' };
    if (score >= 70 && totalPlayed >= 100 && daysActive >= 30 && quranPercent >= 5 && maxStreak >= 10)
        return { title: 'Quranic Scholar', emoji: '🏆', desc: 'Deep understanding and consistent excellence' };
    if (score >= 55 && totalPlayed >= 40 && daysActive >= 14 && quranPercent >= 2 && maxStreak >= 5)
        return { title: 'Dedicated Learner', emoji: '📚', desc: 'Strong performance with room to grow' };
    if (score >= 35 && totalPlayed >= 16 && daysActive >= 7 && quranPercent >= 0.5 && maxStreak >= 3)
        return { title: 'Rising Student', emoji: '🌱', desc: 'Building a solid foundation' };
    if (score >= 20 && totalPlayed >= 4 && daysActive >= 2 && maxStreak >= 1)
        return { title: 'Eager Seeker', emoji: '🔍', desc: 'Every puzzle brings you closer to knowledge' };
    return { title: 'Beginner', emoji: '✨', desc: 'The journey of a thousand miles begins with a single step' };
}

function getGameInsight(mode, stats) {
    if (stats.played === 0) return null;
    const winRate = stats.won / stats.played;
    const score = calculateScore(winRate, stats.maxStreak, stats.played, 0, 0);

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
    const verseStats = getVerseStats();
    const daysActive = Math.ceil(totalPlayed / 4); // approximate: 4 games per day
    const overallScore = calculateScore(overallWinRate, bestStreak, totalPlayed, verseStats.quranPercent, daysActive);
    const scholar = getScholarTitle(overallScore, totalPlayed, bestStreak, verseStats.quranPercent, daysActive);

    // Find strongest and weakest games
    let strongest = null, weakest = null;
    if (gameInsights.length >= 2) {
        gameInsights.sort((a, b) => b.score - a.score);
        strongest = gameInsights[0];
        weakest = gameInsights[gameInsights.length - 1];
    }

    // Verses are tracked only on active engagement (audio play, word tap)
    // Cooling period uses server-side history in data/history/, not client-side tracking

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
        }).catch(() => { });
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
                    try { await navigator.share({ text: shareText }); } catch { }
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


// ═══════════════════════════════════════════════════════════════════
// DHIKR COUNTER — Community-synced
// ═══════════════════════════════════════════════════════════════════
// Uses the same Apps Script endpoint as bug reports
const DHIKR_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzU3zTnouQtg354xUSUXVaNXwRn2H1i3kt99jVofled3cwPXjZ6vhqUezXhmaY7Fm8i/exec';
const DHIKR_RAW_URL = 'https://raw.githubusercontent.com/sudosar/quraniq/claude/quranic-puzzle-game-RWunP/data/dhikr.json';

function initDhikrCounter() {
    const DHIKR_KEY = 'quraniq_dhikr';
    const tapBtn = document.getElementById('dhikr-tap');
    const countEl = document.getElementById('dhikr-count');
    const communityEl = document.getElementById('dhikr-community-count');
    const resetBtn = document.getElementById('dhikr-reset');
    const picker = document.getElementById('dhikr-picker');

    if (!tapBtn) return;

    // Load saved state
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(DHIKR_KEY)) || {}; } catch (e) { }
    if (!saved.counts) saved.counts = {};
    if (!saved.pending) saved.pending = {};
    if (!saved.phrase) saved.phrase = 'subhanallah';

    let currentPhrase = saved.phrase;
    let currentCount = saved.counts[currentPhrase] || 0;
    let syncTimer = null;
    let communityTotal = saved.communityTotal || 0;

    function save() {
        saved.counts[currentPhrase] = currentCount;
        saved.phrase = currentPhrase;
        saved.communityTotal = communityTotal;
        localStorage.setItem(DHIKR_KEY, JSON.stringify(saved));
    }

    function render() {
        countEl.textContent = currentCount;
        communityEl.textContent = communityTotal > 0 ? communityTotal.toLocaleString() : '—';
    }

    // Sync pending taps to the server (batched, debounced)
    function scheduleSyncToServer() {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => flushPending(), 3000); // 3s debounce
    }

    async function flushPending() {
        const pending = { ...saved.pending };
        const toSend = Object.entries(pending).filter(([, v]) => v > 0);
        if (toSend.length === 0) return;

        for (const [phrase, count] of toSend) {
            try {
                const resp = await fetch(DHIKR_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ action: 'dhikr', phrase, count })
                });
                if (resp.ok) {
                    const result = await resp.json();
                    saved.pending[phrase] = (saved.pending[phrase] || 0) - count;
                    if (saved.pending[phrase] <= 0) delete saved.pending[phrase];
                    if (result.total) communityTotal = result.total;
                }
            } catch (e) {
                console.warn('Dhikr sync failed:', e);
            }
        }
        save();
        render();
    }

    // Fetch all-time community total from GitHub raw (fast CDN)
    async function fetchCommunityTotal() {
        try {
            const resp = await fetch(DHIKR_RAW_URL + '?t=' + Date.now()); // cache-bust
            if (resp.ok) {
                const data = await resp.json();
                communityTotal = data.total || 0;
                save();
                render();
            }
        } catch (e) {
            console.warn('Dhikr fetch failed:', e);
        }
    }

    // Phrase picker
    picker.addEventListener('click', (e) => {
        const btn = e.target.closest('.dhikr-phrase');
        if (!btn) return;
        saved.counts[currentPhrase] = currentCount;
        currentPhrase = btn.dataset.phrase;
        currentCount = saved.counts[currentPhrase] || 0;
        picker.querySelectorAll('.dhikr-phrase').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        save();
        render();
    });

    // Tap counter
    tapBtn.addEventListener('click', () => {
        currentCount++;
        communityTotal++;
        saved.pending[currentPhrase] = (saved.pending[currentPhrase] || 0) + 1;
        save();
        render();
        if (navigator.vibrate) navigator.vibrate(15);
        tapBtn.classList.remove('dhikr-tap-ripple');
        void tapBtn.offsetWidth;
        tapBtn.classList.add('dhikr-tap-ripple');
        trackDhikrTap(currentPhrase, currentCount);
        if (currentCount === 33 || currentCount === 99 || currentCount === 100) {
            showToast(`${currentCount}× MashaAllah! 🤲`);
            trackDhikrMilestone(currentPhrase, currentCount);
        }
        scheduleSyncToServer();
    });

    // Reset (local only)
    resetBtn.addEventListener('click', () => {
        currentCount = 0;
        save();
        render();
    });

    // Flush pending when user leaves
    window.addEventListener('beforeunload', () => flushPending());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushPending();
    });

    // Set initial active phrase
    picker.querySelectorAll('.dhikr-phrase').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.phrase === currentPhrase);
    });

    render();
    fetchCommunityTotal();
    flushPending();
}


// ═══════════════════════════════════════════════════════════════════
// PWA INSTALL PROMPT — Subtle re-prompt for dismissed users
// ═══════════════════════════════════════════════════════════════════
const PWA_DISMISS_KEY = 'quraniq_pwa_dismiss';
const PWA_DISMISS_COOLDOWN = 7 * 24 * 60 * 60 * 1000; // 7 days
const PWA_BANNER_DELAY = 45000; // 45 seconds before showing banner

let deferredInstallPrompt = null;

function initPWAInstall() {
    // Already running as installed PWA — no need for install prompts
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
        return;
    }

    // Capture the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the default mini-infobar on mobile
        e.preventDefault();
        deferredInstallPrompt = e;

        trackInstallPrompt('shown');

        // Always show the sidebar install button when installable
        showSidebarInstallButton();

        // Show the subtle banner after a delay (if not recently dismissed)
        scheduleBanner();
    });

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        trackInstallPrompt('accepted');
        hidePWABanner();
        hideSidebarInstallButton();
        showToast('QuranIQ installed! ✨ Jazak Allahu Khairan');
    });
}

function showSidebarInstallButton() {
    const btn = document.getElementById('sidebar-install-btn');
    if (btn) {
        btn.classList.remove('hidden');
        btn.addEventListener('click', () => {
            triggerInstallPrompt('sidebar');
        });
    }
}

function hideSidebarInstallButton() {
    const btn = document.getElementById('sidebar-install-btn');
    if (btn) btn.classList.add('hidden');
}

function scheduleBanner() {
    // Check if user recently dismissed the banner
    const dismissedAt = localStorage.getItem(PWA_DISMISS_KEY);
    if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        if (elapsed < PWA_DISMISS_COOLDOWN) return; // Still in cooldown
    }

    // Show banner after delay
    setTimeout(() => {
        if (!deferredInstallPrompt) return; // No longer installable
        showPWABanner();
    }, PWA_BANNER_DELAY);
}

function showPWABanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (!banner) return;

    banner.classList.remove('hidden');
    // Trigger animation after a frame
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            banner.classList.add('visible');
        });
    });

    // Install button
    const installBtn = document.getElementById('pwa-install-btn');
    installBtn.addEventListener('click', () => {
        triggerInstallPrompt('banner');
    }, { once: true });

    // Dismiss button
    const dismissBtn = document.getElementById('pwa-dismiss-btn');
    dismissBtn.addEventListener('click', () => {
        dismissPWABanner();
    }, { once: true });

    // Auto-hide after 15 seconds if not interacted with
    setTimeout(() => {
        if (banner.classList.contains('visible')) {
            hidePWABanner();
        }
    }, 15000);

    trackEvent('pwa_banner', { action: 'shown' });
}

function hidePWABanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (!banner) return;
    banner.classList.remove('visible');
    setTimeout(() => banner.classList.add('hidden'), 400);
}

function dismissPWABanner() {
    localStorage.setItem(PWA_DISMISS_KEY, Date.now().toString());
    hidePWABanner();
    trackEvent('pwa_banner', { action: 'dismissed' });
}

async function triggerInstallPrompt(source) {
    if (!deferredInstallPrompt) return;

    try {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        trackInstallPrompt(outcome === 'accepted' ? 'accepted' : 'dismissed');
        trackEvent('pwa_install_trigger', { source, outcome });

        if (outcome === 'accepted') {
            hidePWABanner();
            hideSidebarInstallButton();
        } else {
            // User dismissed the native prompt — set cooldown
            localStorage.setItem(PWA_DISMISS_KEY, Date.now().toString());
            hidePWABanner();
        }
    } catch (err) {
        // Fallback: prompt may have already been used
        console.warn('Install prompt error:', err);
    }

    deferredInstallPrompt = null;
}
