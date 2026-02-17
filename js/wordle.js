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
    validWords: null,  // Set of valid Quranic words for current length
    hintsUsed: 0,      // Number of hints used (each costs 1 turn + 1 extra crescent)
    hintRows: []       // Which rows were hint reveals (for emoji grid)
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
    // Pre-load word list
    loadQuranWords();
    // Load daily puzzle with holding screen if not ready
    loadDailyWithHolding(
        'daily_wordle.json',
        'wordle-game',
        'Harf by Harf',
        (puzzle) => {
            wordle.puzzle = puzzle;
            // Build valid word set for the target word's length
            const targetLen = normalizeArabic(puzzle.word).length;
            if (_quranWordsCache && _quranWordsCache[String(targetLen)]) {
                wordle.validWords = new Set(_quranWordsCache[String(targetLen)]);
                wordle.validWords.add(normalizeArabic(puzzle.word));
            }
            setupWordleGame();
        }
    );
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
        wordle.hintsUsed = saved.hintsUsed || 0;
        wordle.hintRows = saved.hintRows || [];
    }

    renderWordleBoard();
    renderWordleKeyboard();
    renderHintButton();
    document.getElementById('wordle-hint').innerHTML = `<strong>Hint:</strong> ${wordle.puzzle.hint}`;

    // Replay saved state
    if (saved && wordle.evaluations.length > 0) {
        replayWordleState();
    }

    // Update hint button state after replay
    updateHintButton();

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
        ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج'],
        ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك'],
        ['⏎', 'ئ', 'ء', 'ؤ', 'ر', 'ى', 'ة', 'و', 'ز', 'د', 'ذ', '⌫'],
        ['ظ', 'ط', 'أ', 'إ', 'آ']
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

/* ---------- Hint Button ---------- */

function renderHintButton() {
    // Insert hint button between the hint text and the keyboard
    const hintTextEl = document.getElementById('wordle-hint');
    let hintBtn = document.getElementById('wordle-hint-btn');
    if (!hintBtn) {
        hintBtn = document.createElement('button');
        hintBtn.id = 'wordle-hint-btn';
        hintBtn.className = 'wordle-hint-btn';
        hintBtn.setAttribute('aria-label', 'Use hint: reveals a letter, costs 1 turn and 1 crescent');
        hintBtn.addEventListener('click', useWordleHint);
        // Insert after the hint text div
        hintTextEl.parentNode.insertBefore(hintBtn, hintTextEl.nextSibling);
    }
    updateHintButton();
}

function updateHintButton() {
    const btn = document.getElementById('wordle-hint-btn');
    if (!btn) return;

    const canHint = !wordle.gameOver &&
        wordle.currentRow < wordle.maxRows - 1 && // Must have at least 1 row left to play after hint
        getUnrevealedPositions().length > 0;

    btn.disabled = !canHint;
    btn.innerHTML = `<span class="hint-icon">💡</span> Reveal a Letter <span class="hint-cost">−1 turn, −1 🌙</span>`;

    if (wordle.gameOver) {
        btn.style.display = 'none';
    } else {
        btn.style.display = '';
    }
}

/**
 * Get positions in the word that haven't been revealed as 'correct' yet
 * (either by a guess or a previous hint).
 */
function getUnrevealedPositions() {
    const revealed = new Set();

    // Check all evaluated rows for correct positions
    for (let r = 0; r < wordle.evaluations.length; r++) {
        for (let c = 0; c < wordle.wordLen; c++) {
            if (wordle.evaluations[r][c] === 'correct') {
                revealed.add(c);
            }
        }
    }

    // Return positions not yet revealed
    const unrevealed = [];
    for (let c = 0; c < wordle.wordLen; c++) {
        if (!revealed.has(c)) unrevealed.push(c);
    }
    return unrevealed;
}

function useWordleHint() {
    if (wordle.gameOver) return;

    // Need at least 1 row after the hint row to still play
    if (wordle.currentRow >= wordle.maxRows - 1) {
        showToast('No turns left for a hint');
        return;
    }

    const unrevealed = getUnrevealedPositions();
    if (unrevealed.length === 0) {
        showToast('All letters already revealed');
        return;
    }

    // Clear any partially typed letters in the current row
    for (let c = 0; c < wordle.wordLen; c++) {
        const cell = document.getElementById(`wc-${wordle.currentRow}-${c}`);
        cell.textContent = '';
        cell.classList.remove('filled');
    }
    wordle.board[wordle.currentRow] = [];
    wordle.currentCol = 0;

    // Pick a random unrevealed position
    const pos = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const letter = wordle.word[pos];

    // Fill the entire row with the correct word but mark it as a hint row
    // The hint row shows only the revealed letter; others are blank/absent
    const hintBoard = [];
    const hintEval = [];
    for (let c = 0; c < wordle.wordLen; c++) {
        if (c === pos) {
            hintBoard.push(letter);
            hintEval.push('correct');
        } else {
            // Fill with the correct letter at that position (for board storage)
            // but mark as 'hint-blank' — we'll use a special marker
            hintBoard.push(wordle.word[c]);
            hintEval.push('hint-blank');
        }
    }

    wordle.board[wordle.currentRow] = hintBoard;
    wordle.evaluations.push(hintEval);
    wordle.hintRows.push(wordle.currentRow);
    wordle.hintsUsed++;

    // Animate the hint reveal
    for (let c = 0; c < wordle.wordLen; c++) {
        setTimeout(() => {
            const cell = document.getElementById(`wc-${wordle.currentRow}-${c}`);
            if (c === pos) {
                cell.textContent = letter;
                cell.classList.add('filled', 'correct', 'hint-reveal');
                cell.setAttribute('aria-label',
                    `Row ${wordle.currentRow + 1}, Column ${c + 1}: ${letter}, hint revealed`);

                // Update keyboard for the revealed letter
                const keyBtn = document.getElementById(`wk-${letter}`);
                if (keyBtn) {
                    const priority = { correct: 3, present: 2, absent: 1 };
                    const current = keyBtn.classList.contains('correct') ? 3 :
                        keyBtn.classList.contains('present') ? 2 :
                            keyBtn.classList.contains('absent') ? 1 : 0;
                    if (priority['correct'] > current) {
                        keyBtn.classList.remove('correct', 'present', 'absent');
                        keyBtn.classList.add('correct');
                    }
                }
            } else {
                // Empty cell for non-revealed positions
                cell.textContent = '';
                cell.classList.add('hint-empty');
                cell.setAttribute('aria-label',
                    `Row ${wordle.currentRow + 1}, Column ${c + 1}: hint row`);
            }
        }, c * 150);
    }

    setTimeout(() => {
        announce(`Hint used: letter ${letter} revealed at position ${pos + 1}. Turn consumed.`);

        wordle.currentRow++;
        wordle.currentCol = 0;

        // Check if this was the last available row (shouldn't happen due to guard, but just in case)
        if (wordle.currentRow >= wordle.maxRows) {
            wordle.gameOver = true;
            const displayWord = wordle.puzzle.display || wordle.word;
            showToast(displayWord);
            announce(`Game over. The word was ${displayWord}.`);
            setTimeout(() => showWordleResult(false), 300);
        }

        saveWordleState();
        updateHintButton();
    }, wordle.wordLen * 150 + 100);
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
        updateHintButton();
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
        const isHintRow = wordle.hintRows.includes(r);

        for (let c = 0; c < wordle.wordLen; c++) {
            const cell = document.getElementById(`wc-${r}-${c}`);
            const evalResult = wordle.evaluations[r][c];

            if (isHintRow) {
                if (evalResult === 'correct') {
                    // Show the revealed letter
                    cell.textContent = wordle.board[r][c];
                    cell.classList.add('filled', 'correct', 'hint-reveal');

                    // Update keyboard
                    const letter = wordle.board[r][c];
                    const keyBtn = document.getElementById(`wk-${letter}`);
                    if (keyBtn) {
                        keyBtn.classList.remove('correct', 'present', 'absent');
                        keyBtn.classList.add('correct');
                    }
                } else {
                    // hint-blank: empty cell
                    cell.textContent = '';
                    cell.classList.add('hint-empty');
                }
            } else {
                // Normal guess row
                const letter = wordle.board[r][c];
                cell.textContent = letter;
                cell.classList.add('filled', evalResult);

                // Update keyboard
                const keyBtn = document.getElementById(`wk-${letter}`);
                if (keyBtn) {
                    const priority = { correct: 3, present: 2, absent: 1 };
                    const current = keyBtn.classList.contains('correct') ? 3 :
                        keyBtn.classList.contains('present') ? 2 :
                            keyBtn.classList.contains('absent') ? 1 : 0;
                    if (priority[evalResult] > current) {
                        keyBtn.classList.remove('correct', 'present', 'absent');
                        keyBtn.classList.add(evalResult);
                    }
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
        evaluations: wordle.evaluations,
        hintsUsed: wordle.hintsUsed,
        hintRows: wordle.hintRows
    };
    saveState(app.state);
}

function showWordleResult(won, cacheOnly) {
    const emojiMap = { correct: '🟩', present: '🟨', absent: '⬛' };
    let emojiGrid = '';
    wordle.evaluations.forEach((row, r) => {
        if (wordle.hintRows.includes(r)) {
            // Hint row: show 💡 for the revealed letter, ⬜ for blanks
            emojiGrid += row.map(e => e === 'correct' ? '💡' : '⬜').join('') + '\n';
        } else {
            emojiGrid += row.map(e => emojiMap[e] || '⬜').join('') + '\n';
        }
    });

    const puzzleNum = getPuzzleNumber();
    const guessRows = wordle.evaluations.filter((_, r) => !wordle.hintRows.includes(r)).length;
    const tries = won ? guessRows : 'X';
    const displayWord = wordle.puzzle.display || wordle.word;

    // Moon rating: fewer tries = more moons
    // Base: 1 try = 5 moons, 2 = 4, 3 = 3, 4 = 2, 5-6 = 1, loss = 0
    // Penalty: each hint costs 1 extra moon
    let moons = 0;
    if (won) {
        const totalRows = wordle.evaluations.length; // includes hint rows
        const baseMoons = Math.max(1, 6 - totalRows);
        moons = Math.max(0, baseMoons - wordle.hintsUsed);
    }
    const moonStr = '🌙'.repeat(moons) + '🌑'.repeat(5 - moons);

    const hintNote = wordle.hintsUsed > 0 ? ` (${wordle.hintsUsed} hint${wordle.hintsUsed > 1 ? 's' : ''})` : '';
    const shareText = `QuranIQ - Harf by Harf #${puzzleNum}\n${tries}/${wordle.maxRows}${hintNote}\n\n${emojiGrid}${moonStr}\n\nhttps://sudosar.github.io/quraniq/#wordle`;

    const resultData = {
        icon: won ? '🌟' : '📖',
        title: won ? `Solved in ${guessRows}!${hintNote}` : `The word was: ${displayWord}`,
        arabic: wordle.puzzle.arabicVerse || displayWord,
        translation: wordle.puzzle.verse,
        emojiGrid: emojiGrid.trim(),
        moons: won ? moons : null,
        statsText: `${tries}/${wordle.maxRows}${hintNote}`,
        shareText,
        verseRef: extractVerseRef(wordle.puzzle.verse)
    };

    if (cacheOnly) {
        app.lastResults['wordle'] = resultData;
        showViewResultsButton('wordle');
        return;
    }

    showResultModal(resultData);
    trackGameComplete('wordle', won, won ? guessRows : 0);
    updateModeStats('wordle', won, won ? guessRows : 0);

    // Track the verse — completing Harf by Harf means engaging with the verse directly
    if (wordle.puzzle && wordle.puzzle.verse) {
        trackVerses([wordle.puzzle.verse]);
    }
}
