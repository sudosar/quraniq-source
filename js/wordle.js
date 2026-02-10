/* ============================================
   QURANIQ - VERSE WORDLE GAME
   ============================================ */

const wordle = {
    puzzle: null,
    board: [],
    currentRow: 0,
    currentCol: 0,
    gameOver: false,
    word: '',
    maxRows: 6,
    wordLen: 5,
    evaluations: [],
    keydownHandler: null,
    validWords: null  // Set of valid Quranic words for current length
};

/* ---------- Quranic word list loader ---------- */
let _quranWordsCache = null;

async function loadQuranWords() {
    if (_quranWordsCache) return _quranWordsCache;
    try {
        const resp = await fetch('data/quran_words.json');
        if (!resp.ok) throw new Error('Failed to load word list');
        _quranWordsCache = await resp.json();
        return _quranWordsCache;
    } catch (e) {
        console.warn('Could not load Quranic word list:', e);
        return null;
    }
}

function isValidQuranWord(guess) {
    // If word list didn't load, accept any word (graceful fallback)
    if (!wordle.validWords) return true;
    return wordle.validWords.has(guess);
}

function initWordle() {
    // Load word list and puzzle in parallel
    Promise.all([
        loadQuranWords(),
        loadDailyWordle().catch(() => {
            const idx = getPuzzleIndex(PUZZLES.wordle);
            return PUZZLES.wordle[idx];
        })
    ]).then(([wordData, puzzle]) => {
        wordle.puzzle = puzzle;
        // Build valid word set for the target word's length
        const targetLen = normalizeArabic(puzzle.word).length;
        if (wordData && wordData[String(targetLen)]) {
            wordle.validWords = new Set(wordData[String(targetLen)]);
            // Also ensure the answer itself is in the valid set
            wordle.validWords.add(normalizeArabic(puzzle.word));
        }
        setupWordleGame();
    });
}

async function loadDailyWordle() {
    const today = new Date().toISOString().slice(0, 10);
    const resp = await fetch(`data/daily_wordle.json?t=${today}`);
    if (!resp.ok) throw new Error('No daily wordle');
    const data = await resp.json();
    if (!data.generated || !data.puzzle || data.date !== today) {
        throw new Error('Daily wordle not available or stale');
    }
    return data.puzzle;
}

function setupWordleGame() {
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

    // Keyboard input — use a named handler so it can be properly managed
    if (wordle.keydownHandler) {
        document.removeEventListener('keydown', wordle.keydownHandler);
    }
    wordle.keydownHandler = handleWordleKey;
    document.addEventListener('keydown', wordle.keydownHandler);

    // Restore View Results button for completed games
    if (wordle.gameOver && wordle.evaluations.length > 0) {
        const won = normalizeArabic(wordle.board[wordle.evaluations.length - 1]?.join('') || '') === wordle.word;
        showWordleResult(won, true);
    }
}

function renderWordleBoard() {
    const board = document.getElementById('wordle-board');
    board.innerHTML = '';
    board.setAttribute('dir', 'rtl');
    for (let r = 0; r < wordle.maxRows; r++) {
        const row = document.createElement('div');
        row.className = 'wordle-row';
        row.setAttribute('role', 'row');
        for (let c = 0; c < wordle.wordLen; c++) {
            const cell = document.createElement('div');
            cell.className = 'wordle-cell arabic-cell';
            cell.id = `wc-${r}-${c}`;
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}: empty`);
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
            if (key === '⏎') btn.setAttribute('aria-label', 'Submit guess');
            else if (key === '⌫') btn.setAttribute('aria-label', 'Delete letter');
            else btn.setAttribute('aria-label', key);
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
    cell.setAttribute('aria-label', `Row ${wordle.currentRow + 1}, Column ${wordle.currentCol + 1}: ${letter}`);
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
    cell.setAttribute('aria-label', `Row ${wordle.currentRow + 1}, Column ${wordle.currentCol + 1}: empty`);
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

    if (guess.length !== wordle.wordLen) {
        showToast('Word must be ' + wordle.wordLen + ' letters');
        return;
    }

    // Validate against Quranic word list
    if (!isValidQuranWord(guess)) {
        showToast('Not a Quranic word');
        // Shake the current row to indicate invalid
        const row = document.querySelector(`#wc-${wordle.currentRow}-0`)?.parentElement;
        if (row) {
            row.classList.add('shake');
            setTimeout(() => row.classList.remove('shake'), 600);
        }
        announce('Not a valid Quranic word. Try again.');
        return;
    }

    // Evaluate
    const evaluation = evaluateWordleGuess(guess);
    wordle.evaluations.push(evaluation);
    const isCorrect = evaluation.every(e => e === 'correct');
    trackHarfGuess(wordle.evaluations.length, isCorrect);

    // Animate reveal
    const statusLabels = { correct: 'correct position', present: 'wrong position', absent: 'not in word' };
    for (let c = 0; c < wordle.wordLen; c++) {
        setTimeout(() => {
            const cell = document.getElementById(`wc-${wordle.currentRow}-${c}`);
            cell.classList.add(evaluation[c]);
            cell.setAttribute('aria-label',
                `Row ${wordle.currentRow + 1}, Column ${c + 1}: ${wordle.board[wordle.currentRow][c]}, ${statusLabels[evaluation[c]]}`);
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
        // Announce result to screen reader
        const correctCount = evaluation.filter(e => e === 'correct').length;
        const presentCount = evaluation.filter(e => e === 'present').length;
        announce(`Row ${wordle.currentRow + 1}: ${correctCount} correct, ${presentCount} in wrong position.`);

        // Check win
        if (guess === wordle.word) {
            wordle.gameOver = true;
            saveWordleState();
            announce('Congratulations! You guessed the word!');
            setTimeout(() => showWordleResult(true), 300);
            return;
        }

        wordle.currentRow++;
        wordle.currentCol = 0;

        if (wordle.currentRow >= wordle.maxRows) {
            wordle.gameOver = true;
            saveWordleState();
            const displayWord = wordle.puzzle.display || wordle.word;
            showToast(displayWord);
            announce(`Game over. The word was ${displayWord}.`);
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

function showWordleResult(won, cacheOnly) {
    const emojiMap = { correct: '🟩', present: '🟨', absent: '⬛' };
    let emojiGrid = '';
    wordle.evaluations.forEach(row => {
        emojiGrid += row.map(e => emojiMap[e]).join('') + '\n';
    });

    const puzzleNum = getPuzzleIndex(PUZZLES.wordle) + 1;
    const tries = won ? wordle.evaluations.length : 'X';
    const displayWord = wordle.puzzle.display || wordle.word;

    // Moon rating: fewer tries = more moons
    // 1 try = 5 moons, 2 = 4, 3 = 3, 4 = 2, 5-6 = 1, loss = 0
    let moons = 0;
    if (won) {
        const numTries = wordle.evaluations.length;
        moons = Math.max(1, 6 - numTries);
    }
    const moonStr = '🌙'.repeat(moons) + '🌑'.repeat(5 - moons);

    const shareText = `QuranIQ - Harf by Harf #${puzzleNum}\n${tries}/${wordle.maxRows}\n\n${emojiGrid}${moonStr}\n\nhttps://sudosar.github.io/quraniq/`;

    const resultData = {
        icon: won ? '🌟' : '📖',
        title: won ? `Solved in ${wordle.evaluations.length}!` : `The word was: ${displayWord}`,
        arabic: wordle.puzzle.arabicVerse || displayWord,
        translation: wordle.puzzle.verse,
        emojiGrid: emojiGrid.trim(),
        moons: won ? moons : null,
        statsText: `${tries}/${wordle.maxRows}`,
        shareText,
        verseRef: extractVerseRef(wordle.puzzle.verse)
    };

    if (cacheOnly) {
        app.lastResults['wordle'] = resultData;
        showViewResultsButton('wordle');
        return;
    }

    showResultModal(resultData);
    trackGameComplete('wordle', won, won ? wordle.evaluations.length : 0);
    updateModeStats('wordle', won, won ? wordle.evaluations.length : 0);

    // Verses are now tracked only on active engagement (audio play, word tap)
}
