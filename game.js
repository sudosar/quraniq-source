/* ============================================
   QURANPUZZLE - GAME ENGINE
   ============================================ */

// ==================== UTILITY & STATE ====================
const EPOCH = new Date('2025-01-01').getTime();
const DAY_MS = 86400000;

function getDayNumber() {
    return Math.floor((Date.now() - EPOCH) / DAY_MS);
}

function getPuzzleIndex(arr) {
    return getDayNumber() % arr.length;
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function showToast(msg, duration = 1800) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duration);
}

// State management
const STATE_KEY = 'quranpuzzle_state';
const STATS_KEY = 'quranpuzzle_stats';

function loadState() {
    try {
        return JSON.parse(localStorage.getItem(STATE_KEY)) || {};
    } catch { return {}; }
}

function saveState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function loadStats() {
    try {
        return JSON.parse(localStorage.getItem(STATS_KEY)) || {
            played: 0, won: 0, streak: 0, maxStreak: 0, lastDay: -1,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        };
    } catch {
        return { played: 0, won: 0, streak: 0, maxStreak: 0, lastDay: -1, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } };
    }
}

function saveStats(stats) {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// ==================== APP INIT ====================
const app = {
    currentMode: 'connections',
    dayNumber: getDayNumber(),
    state: loadState(),
    stats: loadStats(),
};

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
    });
}

// ==================== MODE SELECTOR ====================
function initModeSelector() {
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', () => switchMode(tab.dataset.mode));
    });
}

function switchMode(mode) {
    app.currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    document.querySelectorAll('.game-mode').forEach(g => g.classList.toggle('active', g.id === `${mode}-game`));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.mode === mode));
}

// ==================== SIDEBAR ====================
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    document.getElementById('menu-btn').addEventListener('click', () => {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('visible');
        overlay.classList.remove('hidden');
    });
    const closeSidebar = () => {
        sidebar.classList.remove('visible');
        sidebar.classList.add('hidden');
        overlay.classList.add('hidden');
    };
    document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
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
    document.getElementById('stats-close').addEventListener('click', () => document.getElementById('stats-modal').classList.add('hidden'));
    document.getElementById('help-btn').addEventListener('click', () => showHelpModal());
    document.getElementById('help-close').addEventListener('click', () => document.getElementById('help-modal').classList.add('hidden'));
    document.getElementById('result-close').addEventListener('click', () => document.getElementById('result-modal').classList.add('hidden'));

    // Close modals on overlay click
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
    });
}

// ==================== RESET BUTTON ====================
function initResetButton() {
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (!confirm('Reset the current puzzle? Your progress will be lost.')) return;

        // Nuclear option: clear ALL saved state and reload
        localStorage.removeItem(STATE_KEY);
        app.state = {};
        location.reload();
    });
}

function showStatsModal() {
    const s = app.stats;
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
        distEl.innerHTML += `<div class="dist-row"><div class="dist-label">${i}</div><div class="dist-bar" style="width:${pct}%">${count}</div></div>`;
    }
    document.getElementById('stats-modal').classList.remove('hidden');
}

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
            <p>You have 15 moves maximum. Try to solve it in as few moves as possible!</p>
            <p>Tap a placed word to remove it from the answer zone.</p>
        `
    };
    content.innerHTML = helps[app.currentMode] || helps.connections;
    document.getElementById('help-modal').classList.remove('hidden');
}

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
        setTimeout(() => toast.classList.add('hidden'), 2000);
    });

    document.getElementById('result-modal').classList.remove('hidden');
}

// ==================== COUNTDOWN TIMER ====================
function startCountdown() {
    const el = document.getElementById('countdown-timer');
    const update = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setHours(24, 0, 0, 0);
        const diff = tomorrow - now;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    update();
    setInterval(update, 1000);
}

// ====================================================================
//  CONNECTIONS GAME
// ====================================================================
const conn = {
    puzzle: null,
    selected: [],
    solved: [],
    mistakes: 4,
    items: [],
    gameOver: false
};

function initConnections() {
    const idx = getPuzzleIndex(PUZZLES.connections);
    conn.puzzle = PUZZLES.connections[idx];

    // Check saved state
    const saved = app.state[`conn_${app.dayNumber}`];
    if (saved) {
        conn.solved = saved.solved || [];
        conn.mistakes = saved.mistakes ?? 4;
        conn.gameOver = saved.gameOver || false;
    }

    // Flatten items, removing solved ones
    const solvedItems = new Set(conn.solved.flatMap(s => s.items));
    conn.items = shuffle(
        conn.puzzle.categories.flatMap(c => c.items).filter(i => !solvedItems.has(i))
    );

    renderConnections();
    renderSolvedRows();
    updateMistakes();

    document.getElementById('conn-shuffle').addEventListener('click', () => {
        conn.items = shuffle(conn.items);
        conn.selected = [];
        renderConnections();
    });

    document.getElementById('conn-deselect').addEventListener('click', () => {
        conn.selected = [];
        renderConnections();
    });

    document.getElementById('conn-submit').addEventListener('click', submitConnections);

    if (conn.gameOver) {
        revealAllConnections();
    }
}

function renderConnections() {
    const grid = document.getElementById('connections-grid');
    grid.innerHTML = '';
    conn.items.forEach(item => {
        const tile = document.createElement('button');
        tile.className = 'conn-tile' + (conn.selected.includes(item) ? ' selected' : '');
        tile.textContent = item;
        tile.disabled = conn.gameOver;
        tile.addEventListener('click', () => toggleConnTile(item));
        grid.appendChild(tile);
    });
    document.getElementById('conn-submit').disabled = conn.selected.length !== 4;
}

function toggleConnTile(item) {
    if (conn.gameOver) return;
    const idx = conn.selected.indexOf(item);
    if (idx >= 0) {
        conn.selected.splice(idx, 1);
    } else if (conn.selected.length < 4) {
        conn.selected.push(item);
    }
    renderConnections();
}

function updateMistakes() {
    const dots = document.getElementById('mistakes-dots');
    dots.textContent = '●'.repeat(conn.mistakes) + '○'.repeat(4 - conn.mistakes);
}

function submitConnections() {
    if (conn.selected.length !== 4 || conn.gameOver) return;

    // Check if selection matches any unsolved category
    const match = conn.puzzle.categories.find(cat =>
        !conn.solved.some(s => s.name === cat.name) &&
        cat.items.every(i => conn.selected.includes(i)) &&
        conn.selected.every(i => cat.items.includes(i))
    );

    if (match) {
        // Correct!
        conn.solved.push({ name: match.name, items: match.items, color: match.color });
        conn.items = conn.items.filter(i => !match.items.includes(i));
        conn.selected = [];
        renderSolvedRows();
        renderConnections();

        if (conn.solved.length === 4) {
            conn.gameOver = true;
            saveConnState();
            setTimeout(() => showConnResult(true), 600);
        }
    } else {
        // Check for one-away
        let oneAway = false;
        conn.puzzle.categories.forEach(cat => {
            if (!conn.solved.some(s => s.name === cat.name)) {
                const overlap = conn.selected.filter(i => cat.items.includes(i)).length;
                if (overlap === 3) oneAway = true;
            }
        });

        if (oneAway) showToast('One away!');

        conn.mistakes--;
        updateMistakes();

        // Shake animation
        document.querySelectorAll('.conn-tile.selected').forEach(t => {
            t.classList.add('shake');
            setTimeout(() => t.classList.remove('shake'), 500);
        });

        if (conn.mistakes <= 0) {
            conn.gameOver = true;
            conn.selected = [];
            renderConnections();
            revealAllConnections();
            saveConnState();
            setTimeout(() => showConnResult(false), 1000);
        }
    }
    saveConnState();
}

function renderSolvedRows() {
    const container = document.getElementById('connections-solved');
    container.innerHTML = '';
    conn.solved.forEach(s => {
        const row = document.createElement('div');
        row.className = `conn-solved-row ${s.color}`;
        row.innerHTML = `<div class="conn-solved-category">${s.name}</div><div class="conn-solved-items">${s.items.join(', ')}</div>`;
        container.appendChild(row);
    });
}

function revealAllConnections() {
    conn.puzzle.categories.forEach(cat => {
        if (!conn.solved.some(s => s.name === cat.name)) {
            conn.solved.push({ name: cat.name, items: cat.items, color: cat.color });
        }
    });
    conn.items = [];
    renderSolvedRows();
    renderConnections();
}

function saveConnState() {
    app.state[`conn_${app.dayNumber}`] = {
        solved: conn.solved,
        mistakes: conn.mistakes,
        gameOver: conn.gameOver
    };
    saveState(app.state);
}

function showConnResult(won) {
    const colorMap = { yellow: '🟨', green: '🟩', blue: '🟦', purple: '🟪' };
    const order = ['yellow', 'green', 'blue', 'purple'];

    // Build emoji grid based on solve order
    let emojiGrid = '';
    conn.solved.forEach(s => {
        emojiGrid += colorMap[s.color].repeat(4) + '\n';
    });

    const mistakesUsed = 4 - conn.mistakes;
    const puzzleNum = getPuzzleIndex(PUZZLES.connections) + 1;

    const shareText = `QuranPuzzle - Connections #${puzzleNum}\n${emojiGrid}Mistakes: ${mistakesUsed}/4\n\n📖 quranpuzzle.app`;

    showResultModal({
        icon: won ? '🎉' : '📖',
        title: won ? 'Excellent!' : 'Keep Learning!',
        verse: null,
        arabic: null,
        translation: won ? '"And We have certainly made the Quran easy for remembrance" - 54:17' : '"So verily, with hardship, there is relief" - 94:5',
        emojiGrid: emojiGrid.trim(),
        statsText: `Mistakes: ${mistakesUsed}/4`,
        shareText
    });

    updateGlobalStats(won, won ? (4 - mistakesUsed) : 0);
}


// ====================================================================
//  VERSE WORDLE GAME
// ====================================================================
const wordle = {
    puzzle: null,
    board: [],
    currentRow: 0,
    currentCol: 0,
    gameOver: false,
    word: '',
    maxRows: 6,
    wordLen: 5,
    evaluations: []
};

function initWordle() {
    const idx = getPuzzleIndex(PUZZLES.wordle);
    wordle.puzzle = PUZZLES.wordle[idx];
    wordle.word = normalizeArabic(wordle.puzzle.word);
    wordle.wordLen = wordle.word.length;

    // Check saved state
    const saved = app.state[`wordle_${app.dayNumber}`];
    if (saved) {
        wordle.board = saved.board || [];
        wordle.currentRow = saved.currentRow || 0;
        wordle.gameOver = saved.gameOver || false;
        wordle.evaluations = saved.evaluations || [];
    }

    renderWordleBoard();
    renderWordleKeyboard();
    document.getElementById('wordle-hint').innerHTML = `<strong>Hint:</strong> ${wordle.puzzle.hint}`;

    // Replay saved state
    if (saved && wordle.evaluations.length > 0) {
        replayWordleState();
    }

    // Keyboard input
    document.addEventListener('keydown', handleWordleKey);
}

// Strip Arabic diacritics (tashkeel) for comparison
function normalizeArabic(str) {
    return str.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '');
}

function renderWordleBoard() {
    const board = document.getElementById('wordle-board');
    board.innerHTML = '';
    board.setAttribute('dir', 'rtl');
    for (let r = 0; r < wordle.maxRows; r++) {
        const row = document.createElement('div');
        row.className = 'wordle-row';
        for (let c = 0; c < wordle.wordLen; c++) {
            const cell = document.createElement('div');
            cell.className = 'wordle-cell arabic-cell';
            cell.id = `wc-${r}-${c}`;
            row.appendChild(cell);
        }
        board.appendChild(row);
    }
}

function renderWordleKeyboard() {
    const kb = document.getElementById('wordle-keyboard');
    kb.innerHTML = '';
    kb.setAttribute('dir', 'rtl');
    const rows = [
        ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج'],
        ['ش','س','ي','ب','ل','ا','ت','ن','م','ك'],
        ['⏎','ئ','ء','ؤ','ر','ى','ة','و','ز','د','ذ','⌫'],
        ['ظ','ط','أ','إ','آ']
    ];
    rows.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'keyboard-row';
        row.forEach(key => {
            const btn = document.createElement('button');
            const isAction = key === '⏎' || key === '⌫';
            btn.className = 'key' + (isAction ? ' wide' : '');
            btn.textContent = key;
            btn.id = `wk-${key}`;
            btn.addEventListener('click', () => {
                if (key === '⏎') submitWordleGuess();
                else if (key === '⌫') deleteWordleLetter();
                else addWordleLetter(key);
            });
            rowEl.appendChild(btn);
        });
        kb.appendChild(rowEl);
    });
}

function addWordleLetter(letter) {
    if (wordle.gameOver || wordle.currentCol >= wordle.wordLen) return;
    const cell = document.getElementById(`wc-${wordle.currentRow}-${wordle.currentCol}`);
    cell.textContent = letter;
    cell.classList.add('filled');
    if (!wordle.board[wordle.currentRow]) wordle.board[wordle.currentRow] = [];
    wordle.board[wordle.currentRow][wordle.currentCol] = letter;
    wordle.currentCol++;
}

function deleteWordleLetter() {
    if (wordle.gameOver || wordle.currentCol <= 0) return;
    wordle.currentCol--;
    const cell = document.getElementById(`wc-${wordle.currentRow}-${wordle.currentCol}`);
    cell.textContent = '';
    cell.classList.remove('filled');
    if (wordle.board[wordle.currentRow]) wordle.board[wordle.currentRow][wordle.currentCol] = '';
}

function handleWordleKey(e) {
    if (app.currentMode !== 'wordle') return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter') submitWordleGuess();
    else if (e.key === 'Backspace') deleteWordleLetter();
    else if (/^[\u0600-\u06FF]$/.test(e.key)) addWordleLetter(e.key);
}

function submitWordleGuess() {
    if (wordle.gameOver || wordle.currentCol < wordle.wordLen) return;

    const guess = normalizeArabic(wordle.board[wordle.currentRow].join(''));

    // Validate word - check against valid Arabic words
    if (!VALID_WORDS.has(guess)) {
        showToast('Not a recognized word - try a Quranic term');
        const row = document.getElementById('wordle-board').children[wordle.currentRow];
        row.classList.add('jiggle');
        setTimeout(() => row.classList.remove('jiggle'), 300);
        return;
    }

    // Evaluate
    const evaluation = evaluateWordleGuess(guess);
    wordle.evaluations.push(evaluation);

    // Animate reveal
    for (let c = 0; c < wordle.wordLen; c++) {
        setTimeout(() => {
            const cell = document.getElementById(`wc-${wordle.currentRow}-${c}`);
            cell.classList.add(evaluation[c]);
            // Update keyboard
            const letter = wordle.board[wordle.currentRow][c];
            const keyBtn = document.getElementById(`wk-${letter}`);
            if (keyBtn) {
                const priority = { correct: 3, present: 2, absent: 1 };
                const current = keyBtn.classList.contains('correct') ? 3 :
                    keyBtn.classList.contains('present') ? 2 :
                    keyBtn.classList.contains('absent') ? 1 : 0;
                if (priority[evaluation[c]] > current) {
                    keyBtn.classList.remove('correct', 'present', 'absent');
                    keyBtn.classList.add(evaluation[c]);
                }
            }
        }, c * 250);
    }

    setTimeout(() => {
        // Check win
        if (guess === wordle.word) {
            wordle.gameOver = true;
            saveWordleState();
            setTimeout(() => showWordleResult(true), 300);
            return;
        }

        wordle.currentRow++;
        wordle.currentCol = 0;

        if (wordle.currentRow >= wordle.maxRows) {
            wordle.gameOver = true;
            saveWordleState();
            showToast(wordle.puzzle.display || wordle.word);
            setTimeout(() => showWordleResult(false), 300);
            return;
        }

        saveWordleState();
    }, wordle.wordLen * 250 + 100);
}

function evaluateWordleGuess(guess) {
    const result = Array(wordle.wordLen).fill('absent');
    const targetLetters = [...wordle.word];
    const guessLetters = [...guess];

    // First pass: correct positions
    for (let i = 0; i < wordle.wordLen; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            result[i] = 'correct';
            targetLetters[i] = null;
            guessLetters[i] = null;
        }
    }

    // Second pass: present but wrong position
    for (let i = 0; i < wordle.wordLen; i++) {
        if (guessLetters[i] === null) continue;
        const idx = targetLetters.indexOf(guessLetters[i]);
        if (idx !== -1) {
            result[i] = 'present';
            targetLetters[idx] = null;
        }
    }

    return result;
}

function replayWordleState() {
    for (let r = 0; r < wordle.evaluations.length; r++) {
        for (let c = 0; c < wordle.wordLen; c++) {
            const cell = document.getElementById(`wc-${r}-${c}`);
            const letter = wordle.board[r][c];
            cell.textContent = letter;
            cell.classList.add('filled', wordle.evaluations[r][c]);

            // Update keyboard
            const keyBtn = document.getElementById(`wk-${letter}`);
            if (keyBtn) {
                const priority = { correct: 3, present: 2, absent: 1 };
                const current = keyBtn.classList.contains('correct') ? 3 :
                    keyBtn.classList.contains('present') ? 2 :
                    keyBtn.classList.contains('absent') ? 1 : 0;
                if (priority[wordle.evaluations[r][c]] > current) {
                    keyBtn.classList.remove('correct', 'present', 'absent');
                    keyBtn.classList.add(wordle.evaluations[r][c]);
                }
            }
        }
    }
}

function saveWordleState() {
    app.state[`wordle_${app.dayNumber}`] = {
        board: wordle.board,
        currentRow: wordle.currentRow,
        gameOver: wordle.gameOver,
        evaluations: wordle.evaluations
    };
    saveState(app.state);
}

function showWordleResult(won) {
    const emojiMap = { correct: '🟩', present: '🟨', absent: '⬛' };
    let emojiGrid = '';
    wordle.evaluations.forEach(row => {
        emojiGrid += row.map(e => emojiMap[e]).join('') + '\n';
    });

    const puzzleNum = getPuzzleIndex(PUZZLES.wordle) + 1;
    const tries = won ? wordle.evaluations.length : 'X';
    const displayWord = wordle.puzzle.display || wordle.word;

    const shareText = `QuranPuzzle - Verse Wordle #${puzzleNum}\n${tries}/${wordle.maxRows}\n\n${emojiGrid}\n📖 quranpuzzle.app`;

    showResultModal({
        icon: won ? '🌟' : '📖',
        title: won ? `Solved in ${wordle.evaluations.length}!` : `The word was: ${displayWord}`,
        arabic: wordle.puzzle.arabicVerse || displayWord,
        translation: wordle.puzzle.verse,
        emojiGrid: emojiGrid.trim(),
        statsText: `${tries}/${wordle.maxRows}`,
        shareText
    });

    if (won) {
        updateGlobalStats(true, wordle.evaluations.length);
    } else {
        updateGlobalStats(false, 0);
    }
}


// ====================================================================
//  DEDUCTION GAME
// ====================================================================
const ded = {
    puzzle: null,
    cluesRevealed: 0,
    selections: {},
    gameOver: false,
    won: false
};

function initDeduction() {
    const idx = getPuzzleIndex(PUZZLES.deduction);
    ded.puzzle = PUZZLES.deduction[idx];

    // Check saved state
    const saved = app.state[`ded_${app.dayNumber}`];
    if (saved) {
        ded.cluesRevealed = saved.cluesRevealed || 0;
        ded.selections = saved.selections || {};
        ded.gameOver = saved.gameOver || false;
        ded.won = saved.won || false;
    }

    renderDeduction();
}

function renderDeduction() {
    // Story
    const storyEl = document.getElementById('deduction-story');
    storyEl.innerHTML = `<div class="story-title">${ded.puzzle.title}</div><p>${ded.puzzle.intro}</p>`;

    // Clues
    const cluesEl = document.getElementById('deduction-clues');
    cluesEl.innerHTML = '';
    ded.puzzle.clues.forEach((clue, i) => {
        const card = document.createElement('div');
        card.className = 'clue-card' + (i < ded.cluesRevealed ? ' revealed' : '');
        card.innerHTML = `
            <div class="clue-number">${i + 1}</div>
            <div class="clue-text">${i < ded.cluesRevealed ? clue : '<span class="clue-hidden">Tap to reveal clue ' + (i + 1) + '</span>'}</div>
        `;
        if (!ded.gameOver && i === ded.cluesRevealed) {
            card.addEventListener('click', () => {
                ded.cluesRevealed++;
                saveDedState();
                renderDeduction();
            });
            card.style.cursor = 'pointer';
        }
        cluesEl.appendChild(card);
    });

    // Categories
    const gridEl = document.getElementById('deduction-grid');
    gridEl.innerHTML = '<div class="deduction-categories"></div>';
    const catContainer = gridEl.querySelector('.deduction-categories');

    Object.entries(ded.puzzle.categories).forEach(([key, cat]) => {
        const catEl = document.createElement('div');
        catEl.className = 'deduction-category';
        catEl.innerHTML = `<h4>${cat.label}</h4><div class="deduction-options" data-cat="${key}"></div>`;
        const optsEl = catEl.querySelector('.deduction-options');

        cat.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'deduction-opt';
            if (ded.selections[key] === opt) btn.classList.add('selected');
            if (ded.gameOver) {
                if (opt === cat.answer) btn.classList.add('selected');
                else if (ded.selections[key] === opt && opt !== cat.answer) {
                    btn.style.background = '#e74c3c';
                    btn.style.color = 'white';
                    btn.style.borderColor = '#e74c3c';
                }
            }
            btn.textContent = opt;
            btn.disabled = ded.gameOver;
            btn.addEventListener('click', () => {
                ded.selections[key] = opt;
                saveDedState();
                renderDeduction();
            });
            optsEl.appendChild(btn);
        });

        catContainer.appendChild(catEl);
    });

    // Answer button
    const ansEl = document.getElementById('deduction-answer');
    if (ded.gameOver) {
        ansEl.innerHTML = `<p style="color:var(--accent);font-weight:600;margin-top:12px">${ded.won ? 'Correct! MashaAllah!' : 'Not quite - keep learning!'}</p>`;
    } else {
        const allSelected = Object.keys(ded.puzzle.categories).every(k => ded.selections[k]);
        ansEl.innerHTML = `<button class="btn btn-primary" id="ded-submit" ${!allSelected ? 'disabled' : ''}>Submit Answer</button>
            <p style="font-size:0.8rem;color:var(--text-secondary);margin-top:8px">Reveal clues for hints, then select one answer per category</p>`;
        if (allSelected) {
            document.getElementById('ded-submit').addEventListener('click', submitDeduction);
        }
    }
}

function submitDeduction() {
    if (ded.gameOver) return;

    const cats = ded.puzzle.categories;
    ded.won = Object.keys(cats).every(k => ded.selections[k] === cats[k].answer);
    ded.gameOver = true;
    saveDedState();
    renderDeduction();

    setTimeout(() => showDedResult(), 600);
}

function saveDedState() {
    app.state[`ded_${app.dayNumber}`] = {
        cluesRevealed: ded.cluesRevealed,
        selections: ded.selections,
        gameOver: ded.gameOver,
        won: ded.won
    };
    saveState(app.state);
}

function showDedResult() {
    const cats = ded.puzzle.categories;
    let emojiGrid = '';
    let correct = 0;
    Object.keys(cats).forEach(k => {
        const isCorrect = ded.selections[k] === cats[k].answer;
        emojiGrid += `${cats[k].label}: ${isCorrect ? '✅' : '❌'}\n`;
        if (isCorrect) correct++;
    });

    const puzzleNum = getPuzzleIndex(PUZZLES.deduction) + 1;
    const cluesUsed = ded.cluesRevealed;

    const shareText = `QuranPuzzle - Deduction #${puzzleNum}\n"${ded.puzzle.title}"\n${emojiGrid}${correct}/4 correct | ${cluesUsed} clues used\n\n📖 quranpuzzle.app`;

    showResultModal({
        icon: ded.won ? '🕵️' : '📖',
        title: ded.won ? 'Mystery Solved!' : `${correct}/4 Correct`,
        arabic: ded.puzzle.arabic,
        translation: ded.puzzle.verse,
        emojiGrid: emojiGrid.trim(),
        statsText: `${correct}/4 correct using ${cluesUsed} clues`,
        shareText
    });

    updateGlobalStats(ded.won, ded.won ? Math.max(1, 7 - cluesUsed) : 0);
}


// ====================================================================
//  SCRAMBLE GAME
// ====================================================================
const scr = {
    puzzle: null,
    placed: [],
    available: [],
    moves: 0,
    maxMoves: 15,
    hintsUsed: 0,
    gameOver: false,
    won: false
};

function initScramble() {
    const idx = getPuzzleIndex(PUZZLES.scramble);
    scr.puzzle = PUZZLES.scramble[idx];
    scr.maxMoves = Math.max(scr.puzzle.words.length * 3, 10);

    // Check saved state
    const saved = app.state[`scr_${app.dayNumber}`];
    if (saved) {
        scr.placed = saved.placed || [];
        scr.available = saved.available || [];
        scr.moves = saved.moves || 0;
        scr.hintsUsed = saved.hintsUsed || 0;
        scr.gameOver = saved.gameOver || false;
        scr.won = saved.won || false;
    } else {
        scr.available = shuffle([...scr.puzzle.words]);
        scr.placed = [];
    }

    renderScramble();

    document.getElementById('scramble-hint').addEventListener('click', useScrambleHint);
    document.getElementById('scramble-reset').addEventListener('click', resetScramble);
    document.getElementById('scramble-check').addEventListener('click', checkScramble);
}

function renderScramble() {
    // Reference
    document.getElementById('scramble-reference').textContent = scr.puzzle.reference;

    // Moves counter
    const movesEl = document.getElementById('scramble-moves');
    movesEl.innerHTML = `Moves: <span>${scr.moves}</span> / <span>${scr.maxMoves}</span>`;

    // Drop zone
    const dropzone = document.getElementById('scramble-dropzone');
    dropzone.innerHTML = '';
    if (scr.placed.length === 0) {
        dropzone.innerHTML = '<span style="color:var(--text-secondary);font-size:0.85rem">Tap words below to arrange the verse</span>';
    }
    scr.placed.forEach((word, i) => {
        const el = document.createElement('div');
        el.className = 'scramble-word in-zone';
        el.textContent = word;
        if (!scr.gameOver) {
            el.addEventListener('click', () => {
                scr.placed.splice(i, 1);
                scr.available.push(word);
                scr.moves++;
                saveScrState();
                renderScramble();
            });
        }
        dropzone.appendChild(el);
    });

    // Available words
    const wordsEl = document.getElementById('scramble-words');
    wordsEl.innerHTML = '';
    scr.available.forEach((word, i) => {
        const el = document.createElement('div');
        el.className = 'scramble-word';
        el.textContent = word;
        if (!scr.gameOver) {
            el.addEventListener('click', () => {
                scr.available.splice(i, 1);
                scr.placed.push(word);
                scr.moves++;
                saveScrState();
                renderScramble();
                // Auto-check if all placed
                if (scr.available.length === 0) {
                    setTimeout(() => checkScramble(), 300);
                }
            });
        }
        wordsEl.appendChild(el);
    });

    // Update button states
    document.getElementById('scramble-check').disabled = scr.available.length > 0 || scr.gameOver;
    document.getElementById('scramble-hint').disabled = scr.gameOver;
    document.getElementById('scramble-reset').disabled = scr.gameOver;
}

function useScrambleHint() {
    if (scr.gameOver) return;
    scr.hintsUsed++;

    // Find the first incorrect position
    const correctWords = scr.puzzle.words;
    for (let i = 0; i < correctWords.length; i++) {
        if (scr.placed[i] !== correctWords[i]) {
            // Remove this word from wherever it is and place it correctly
            const word = correctWords[i];
            const availIdx = scr.available.indexOf(word);
            const placedIdx = scr.placed.indexOf(word);

            if (availIdx >= 0) {
                scr.available.splice(availIdx, 1);
            } else if (placedIdx >= 0) {
                scr.placed.splice(placedIdx, 1);
            }

            // Insert at correct position
            scr.placed.splice(i, 0, word);
            scr.moves++;
            break;
        }
    }

    showToast(`Hint: ${scr.puzzle.hint}`);
    saveScrState();
    renderScramble();
}

function resetScramble() {
    if (scr.gameOver) return;
    scr.available = shuffle([...scr.placed, ...scr.available]);
    scr.placed = [];
    scr.moves++;
    saveScrState();
    renderScramble();
}

function checkScramble() {
    if (scr.available.length > 0 || scr.gameOver) return;

    const correct = scr.puzzle.words;
    const isCorrect = scr.placed.length === correct.length &&
        scr.placed.every((w, i) => w === correct[i]);

    if (isCorrect) {
        scr.won = true;
        scr.gameOver = true;
        // Animate correct
        document.querySelectorAll('#scramble-dropzone .scramble-word').forEach(el => {
            el.classList.add('correct-pos');
        });
        document.getElementById('scramble-dropzone').classList.add('correct');
        saveScrState();
        setTimeout(() => showScrResult(), 800);
    } else {
        // Show which are correct/wrong
        const dropWords = document.querySelectorAll('#scramble-dropzone .scramble-word');
        dropWords.forEach((el, i) => {
            if (scr.placed[i] === correct[i]) {
                el.classList.add('correct-pos');
            } else {
                el.classList.add('wrong-pos');
            }
        });
        showToast('Not quite right - try again!');

        // Check if out of moves
        if (scr.moves >= scr.maxMoves) {
            scr.gameOver = true;
            saveScrState();
            setTimeout(() => showScrResult(), 800);
        }

        // Remove feedback after a moment
        setTimeout(() => {
            dropWords.forEach(el => {
                el.classList.remove('correct-pos', 'wrong-pos');
            });
        }, 1500);
    }
}

function saveScrState() {
    app.state[`scr_${app.dayNumber}`] = {
        placed: scr.placed,
        available: scr.available,
        moves: scr.moves,
        hintsUsed: scr.hintsUsed,
        gameOver: scr.gameOver,
        won: scr.won
    };
    saveState(app.state);
}

function showScrResult() {
    const total = scr.puzzle.words.length;
    const correctCount = scr.placed.filter((w, i) => w === scr.puzzle.words[i]).length;

    let emojiGrid = '';
    scr.placed.forEach((w, i) => {
        emojiGrid += w === scr.puzzle.words[i] ? '🟩' : '🟥';
    });

    const puzzleNum = getPuzzleIndex(PUZZLES.scramble) + 1;
    const stars = scr.won ? Math.max(1, 5 - Math.floor(scr.moves / (scr.maxMoves / 5))) : 0;
    const starStr = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

    const shareText = `QuranPuzzle - Scramble #${puzzleNum}\n${scr.puzzle.reference}\n${emojiGrid}\n${starStr}\nMoves: ${scr.moves}/${scr.maxMoves}\n\n📖 quranpuzzle.app`;

    showResultModal({
        icon: scr.won ? '✨' : '📖',
        title: scr.won ? 'Verse Complete!' : 'Nice Try!',
        arabic: scr.puzzle.arabic,
        translation: scr.puzzle.words.join(' '),
        emojiGrid: `${emojiGrid}\n${starStr}`,
        statsText: `Moves: ${scr.moves}/${scr.maxMoves} | Hints: ${scr.hintsUsed}`,
        shareText
    });

    updateGlobalStats(scr.won, scr.won ? Math.max(1, 6 - scr.hintsUsed) : 0);
}


// ====================================================================
//  GLOBAL STATS
// ====================================================================
function updateGlobalStats(won, guessNum) {
    const s = app.stats;
    const today = app.dayNumber;

    // Prevent double-counting same day
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
    saveStats(s);
    app.stats = s;
}
