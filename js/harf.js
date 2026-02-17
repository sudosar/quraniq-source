/* ============================================
   QURANIQ - HARF BY HARF GAME
   ============================================ */

const harf = {
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

function isValidHarfWord(guess) {
    // If word list didn't load, accept any word (graceful fallback)
    if (!harf.validWords) return true;
    return harf.validWords.has(guess);
}

function initHarf() {
    // Pre-load word list
    loadQuranWords();
    // Load daily puzzle with holding screen if not ready
    loadDailyWithHolding(
        'daily_harf.json',
        'harf-game',
        'Harf by Harf',
        (puzzle) => {
            harf.puzzle = puzzle;
            // Build valid word set for the target word's length
            const targetLen = normalizeArabic(puzzle.word).length;
            if (_quranWordsCache && _quranWordsCache[String(targetLen)]) {
                harf.validWords = new Set(_quranWordsCache[String(targetLen)]);
                harf.validWords.add(normalizeArabic(puzzle.word));
            }
            setupHarfGame();
        }
    );
}

async function loadDailyHarf() {
    const today = new Date().toISOString().slice(0, 10);
    const resp = await fetch(`data/daily_harf.json?t=${today}`);
    if (!resp.ok) throw new Error('No daily harf puzzle');
    const data = await resp.json();
    if (!data.generated || !data.puzzle || data.date !== today) {
        throw new Error('Daily harf puzzle not available or stale');
    }
    return data.puzzle;
}

function setupHarfGame() {
    harf.word = normalizeArabic(harf.puzzle.word);
    harf.wordLen = harf.word.length;

    // Check saved state
    const saved = app.state[`harf_${app.dayNumber}`];
    if (saved) {
        harf.board = saved.board || [];
        harf.currentRow = saved.currentRow || 0;
        harf.gameOver = saved.gameOver || false;
        harf.evaluations = saved.evaluations || [];
        harf.hintsUsed = saved.hintsUsed || 0;
        harf.hintRows = saved.hintRows || [];
    }

    renderHarfBoard();
    renderHarfKeyboard();
    renderHarfHintButton();
    const hintEl = document.getElementById('harf-hint');
    if (hintEl) hintEl.innerHTML = `<strong>Hint:</strong> ${harf.puzzle.hint}`;

    // Replay saved state
    if (saved && harf.evaluations.length > 0) {
        replayHarfState();
    }

    // Update hint button state after replay
    updateHarfHintButton();

    // Keyboard input — use a named handler so it can be properly managed
    if (harf.keydownHandler) {
        document.removeEventListener('keydown', harf.keydownHandler);
    }
    harf.keydownHandler = handleHarfKey;
    document.addEventListener('keydown', harf.keydownHandler);

    // Restore View Results button for completed games
    if (harf.gameOver && harf.evaluations.length > 0) {
        const won = normalizeArabic(harf.board[harf.evaluations.length - 1]?.join('') || '') === harf.word;
        showHarfResult(won, true);
    }
}

function renderHarfBoard() {
    const board = document.getElementById('harf-board');
    if (!board) return;
    board.innerHTML = '';
    board.setAttribute('dir', 'rtl');
    for (let r = 0; r < harf.maxRows; r++) {
        const row = document.createElement('div');
        row.className = 'harf-row';
        row.setAttribute('role', 'row');
        for (let c = 0; c < harf.wordLen; c++) {
            const cell = document.createElement('div');
            cell.className = 'harf-cell arabic-cell';
            cell.id = `hc-${r}-${c}`;
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}: empty`);
            row.appendChild(cell);
        }
        board.appendChild(row);
    }
}

function renderHarfKeyboard() {
    const kb = document.getElementById('harf-keyboard');
    if (!kb) return;
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
            btn.id = `hk-${key}`;
            if (key === '⏎') btn.setAttribute('aria-label', 'Submit guess');
            else if (key === '⌫') btn.setAttribute('aria-label', 'Delete letter');
            else btn.setAttribute('aria-label', key);
            btn.addEventListener('click', () => {
                if (key === '⏎') submitHarfGuess();
                else if (key === '⌫') deleteHarfLetter();
                else addHarfLetter(key);
            });
            rowEl.appendChild(btn);
        });
        kb.appendChild(rowEl);
    });
}

/* ---------- Hint Button ---------- */

function renderHarfHintButton() {
    // Insert hint button between the hint text and the keyboard
    const hintTextEl = document.getElementById('harf-hint');
    if (!hintTextEl) return;

    let hintBtn = document.getElementById('harf-hint-btn');
    if (!hintBtn) {
        hintBtn = document.createElement('button');
        hintBtn.id = 'harf-hint-btn';
        hintBtn.className = 'harf-hint-btn';
        hintBtn.setAttribute('aria-label', 'Use hint: reveals a letter, costs 1 turn and 1 crescent');
        hintBtn.addEventListener('click', useHarfHint);
        // Insert after the hint text div
        hintTextEl.parentNode.insertBefore(hintBtn, hintTextEl.nextSibling);
    }
    updateHarfHintButton();
}

function updateHarfHintButton() {
    const btn = document.getElementById('harf-hint-btn');
    if (!btn) return;

    const canHint = !harf.gameOver &&
        harf.currentRow < harf.maxRows - 1 && // Must have at least 1 row left to play after hint
        getUnrevealedHarfPositions().length > 0;

    btn.disabled = !canHint;
    btn.innerHTML = `<span class="hint-icon">💡</span> Reveal a Letter <span class="hint-cost">−1 turn, −1 🌙</span>`;

    if (harf.gameOver) {
        btn.style.display = 'none';
    } else {
        btn.style.display = '';
    }
}

/**
 * Get positions in the word that haven't been revealed as 'correct' yet
 * (either by a guess or a previous hint).
 */
function getUnrevealedHarfPositions() {
    const revealed = new Set();

    // Check all evaluated rows for correct positions
    for (let r = 0; r < harf.evaluations.length; r++) {
        for (let c = 0; c < harf.wordLen; c++) {
            if (harf.evaluations[r][c] === 'correct') {
                revealed.add(c);
            }
        }
    }

    // Return positions not yet revealed
    const unrevealed = [];
    for (let c = 0; c < harf.wordLen; c++) {
        if (!revealed.has(c)) unrevealed.push(c);
    }
    return unrevealed;
}

function useHarfHint() {
    if (harf.gameOver) return;

    // Need at least 1 row after the hint row to still play
    if (harf.currentRow >= harf.maxRows - 1) {
        showToast('No turns left for a hint');
        return;
    }

    const unrevealed = getUnrevealedHarfPositions();
    if (unrevealed.length === 0) {
        showToast('All letters already revealed');
        return;
    }

    // Clear any partially typed letters in the current row
    for (let c = 0; c < harf.wordLen; c++) {
        const cell = document.getElementById(`hc-${harf.currentRow}-${c}`);
        if (cell) {
            cell.textContent = '';
            cell.classList.remove('filled');
        }
    }
    harf.board[harf.currentRow] = [];
    harf.currentCol = 0;

    // Pick a random unrevealed position
    const pos = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const letter = harf.word[pos];

    // Fill the entire row with the correct word but mark it as a hint row
    // The hint row shows only the revealed letter; others are blank/absent
    const hintBoard = [];
    const hintEval = [];
    for (let c = 0; c < harf.wordLen; c++) {
        if (c === pos) {
            hintBoard.push(letter);
            hintEval.push('correct');
        } else {
            // Fill with the correct letter at that position (for board storage)
            // but mark as 'hint-blank' — we'll use a special marker
            hintBoard.push(harf.word[c]);
            hintEval.push('hint-blank');
        }
    }

    harf.board[harf.currentRow] = hintBoard;
    harf.evaluations.push(hintEval);
    harf.hintRows.push(harf.currentRow);
    harf.hintsUsed++;

    // Animate the hint reveal
    for (let c = 0; c < harf.wordLen; c++) {
        setTimeout(() => {
            const cell = document.getElementById(`hc-${harf.currentRow}-${c}`);
            if (cell) {
                if (c === pos) {
                    cell.textContent = letter;
                    cell.classList.add('filled', 'correct', 'hint-reveal');
                    cell.setAttribute('aria-label',
                        `Row ${harf.currentRow + 1}, Column ${c + 1}: ${letter}, hint revealed`);

                    // Update keyboard for the revealed letter
                    const keyBtn = document.getElementById(`hk-${letter}`);
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
                        `Row ${harf.currentRow + 1}, Column ${c + 1}: hint row`);
                }
            }
        }, c * 150);
    }

    setTimeout(() => {
        announce(`Hint used: letter ${letter} revealed at position ${pos + 1}. Turn consumed.`);

        harf.currentRow++;
        harf.currentCol = 0;

        // Check if this was the last available row (shouldn't happen due to guard, but just in case)
        if (harf.currentRow >= harf.maxRows) {
            harf.gameOver = true;
            const displayWord = harf.puzzle.display || harf.word;
            showToast(displayWord);
            announce(`Game over. The word was ${displayWord}.`);
            setTimeout(() => showHarfResult(false), 300);
        }

        saveHarfState();
        updateHarfHintButton();
    }, harf.wordLen * 150 + 100);
}

function addHarfLetter(letter) {
    if (harf.gameOver || harf.currentCol >= harf.wordLen) return;
    const cell = document.getElementById(`hc-${harf.currentRow}-${harf.currentCol}`);
    if (!cell) return;
    cell.textContent = letter;
    cell.classList.add('filled');
    cell.setAttribute('aria-label', `Row ${harf.currentRow + 1}, Column ${harf.currentCol + 1}: ${letter}`);
    if (!harf.board[harf.currentRow]) harf.board[harf.currentRow] = [];
    harf.board[harf.currentRow][harf.currentCol] = letter;
    harf.currentCol++;
}

function deleteHarfLetter() {
    if (harf.gameOver || harf.currentCol <= 0) return;
    harf.currentCol--;
    const cell = document.getElementById(`hc-${harf.currentRow}-${harf.currentCol}`);
    if (!cell) return;
    cell.textContent = '';
    cell.classList.remove('filled');
    cell.setAttribute('aria-label', `Row ${harf.currentRow + 1}, Column ${harf.currentCol + 1}: empty`);
    if (harf.board[harf.currentRow]) harf.board[harf.currentRow][harf.currentCol] = '';
}

function handleHarfKey(e) {
    if (app.currentMode !== 'harf') return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter') submitHarfGuess();
    else if (e.key === 'Backspace') deleteHarfLetter();
    else if (/^[\u0600-\u06FF]$/.test(e.key)) addHarfLetter(e.key);
}

function submitHarfGuess() {
    if (harf.gameOver || harf.currentCol < harf.wordLen) return;

    const guess = normalizeArabic(harf.board[harf.currentRow].join(''));

    if (guess.length !== harf.wordLen) {
        showToast('Word must be ' + harf.wordLen + ' letters');
        return;
    }

    // Validate against Quranic word list
    if (!isValidHarfWord(guess)) {
        showToast('Not a Quranic word');
        // Shake the current row to indicate invalid
        const row = document.querySelector(`#hc-${harf.currentRow}-0`)?.parentElement;
        if (row) {
            row.classList.add('shake');
            setTimeout(() => row.classList.remove('shake'), 600);
        }
        announce('Not a valid Quranic word. Try again.');
        return;
    }

    // Evaluate
    const evaluation = evaluateHarfGuess(guess);
    harf.evaluations.push(evaluation);
    const isCorrect = evaluation.every(e => e === 'correct');
    trackHarfGuess(harf.evaluations.length, isCorrect);

    // Animate reveal
    const statusLabels = { correct: 'correct position', present: 'wrong position', absent: 'not in word' };
    for (let c = 0; c < harf.wordLen; c++) {
        setTimeout(() => {
            const cell = document.getElementById(`hc-${harf.currentRow}-${c}`);
            if (cell) {
                cell.classList.add(evaluation[c]);
                cell.setAttribute('aria-label',
                    `Row ${harf.currentRow + 1}, Column ${c + 1}: ${harf.board[harf.currentRow][c]}, ${statusLabels[evaluation[c]]}`);
            }
            // Update keyboard
            const letter = harf.board[harf.currentRow][c];
            const keyBtn = document.getElementById(`hk-${letter}`);
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
        announce(`Row ${harf.currentRow + 1}: ${correctCount} correct, ${presentCount} in wrong position.`);

        // Check win
        if (guess === harf.word) {
            harf.gameOver = true;
            saveHarfState();
            announce('Congratulations! You guessed the word!');
            setTimeout(() => showHarfResult(true), 300);
            return;
        }

        harf.currentRow++;
        harf.currentCol = 0;

        if (harf.currentRow >= harf.maxRows) {
            harf.gameOver = true;
            saveHarfState();
            const displayWord = harf.puzzle.display || harf.word;
            showToast(displayWord);
            announce(`Game over. The word was ${displayWord}.`);
            setTimeout(() => showHarfResult(false), 300);
            return;
        }

        saveHarfState();
        updateHarfHintButton();
    }, harf.wordLen * 250 + 100);
}

function evaluateHarfGuess(guess) {
    const result = Array(harf.wordLen).fill('absent');
    const targetLetters = [...harf.word];
    const guessLetters = [...guess];

    // First pass: correct positions
    for (let i = 0; i < harf.wordLen; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            result[i] = 'correct';
            targetLetters[i] = null;
            guessLetters[i] = null;
        }
    }

    // Second pass: present but wrong position
    for (let i = 0; i < harf.wordLen; i++) {
        if (guessLetters[i] === null) continue;
        const idx = targetLetters.indexOf(guessLetters[i]);
        if (idx !== -1) {
            result[i] = 'present';
            targetLetters[idx] = null;
        }
    }

    return result;
}

function replayHarfState() {
    for (let r = 0; r < harf.evaluations.length; r++) {
        const isHintRow = harf.hintRows.includes(r);

        for (let c = 0; c < harf.wordLen; c++) {
            const cell = document.getElementById(`hc-${r}-${c}`);
            if (!cell) continue;
            const evalResult = harf.evaluations[r][c];

            if (isHintRow) {
                if (evalResult === 'correct') {
                    // Show the revealed letter
                    cell.textContent = harf.board[r][c];
                    cell.classList.add('filled', 'correct', 'hint-reveal');

                    // Update keyboard
                    const letter = harf.board[r][c];
                    const keyBtn = document.getElementById(`hk-${letter}`);
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
                const letter = harf.board[r][c];
                cell.textContent = letter;
                cell.classList.add('filled', evalResult);

                // Update keyboard
                const keyBtn = document.getElementById(`hk-${letter}`);
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

function saveHarfState() {
    app.state[`harf_${app.dayNumber}`] = {
        board: harf.board,
        currentRow: harf.currentRow,
        gameOver: harf.gameOver,
        evaluations: harf.evaluations,
        hintsUsed: harf.hintsUsed,
        hintRows: harf.hintRows
    };
    saveState(app.state);
}

function showHarfResult(won, cacheOnly) {
    const emojiMap = { correct: '🟩', present: '🟨', absent: '⬛' };
    let emojiGrid = '';
    harf.evaluations.forEach((row, r) => {
        if (harf.hintRows.includes(r)) {
            // Hint row: show 💡 for the revealed letter, ⬜ for blanks
            emojiGrid += row.map(e => e === 'correct' ? '💡' : '⬜').join('') + '\n';
        } else {
            emojiGrid += row.map(e => emojiMap[e] || '⬜').join('') + '\n';
        }
    });

    const puzzleNum = getPuzzleNumber();
    const guessRows = harf.evaluations.filter((_, r) => !harf.hintRows.includes(r)).length;
    const tries = won ? guessRows : 'X';
    const displayWord = harf.puzzle.display || harf.word;

    // Moon rating: fewer tries = more moons
    // Base: 1 try = 5 moons, 2 = 4, 3 = 3, 4 = 2, 5-6 = 1, loss = 0
    // Penalty: each hint costs 1 extra moon
    let moons = 0;
    if (won) {
        const totalRows = harf.evaluations.length; // includes hint rows
        const baseMoons = Math.max(1, 6 - totalRows);
        moons = Math.max(0, baseMoons - harf.hintsUsed);
    }
    const moonStr = '🌙'.repeat(moons) + '🌑'.repeat(5 - moons);

    const hintNote = harf.hintsUsed > 0 ? ` (${harf.hintsUsed} hint${harf.hintsUsed > 1 ? 's' : ''})` : '';
    const shareText = `QuranIQ - Harf by Harf #${puzzleNum}\n${tries}/${harf.maxRows}${hintNote}\n\n${emojiGrid}${moonStr}\n\nhttps://sudosar.github.io/quraniq/#harf`;

    const resultData = {
        icon: won ? '🌟' : '📖',
        title: won ? `Solved in ${guessRows}!${hintNote}` : `The word was: ${displayWord}`,
        arabic: harf.puzzle.arabicVerse || displayWord,
        translation: harf.puzzle.verse,
        emojiGrid: emojiGrid.trim(),
        moons: won ? moons : null,
        statsText: `${tries}/${harf.maxRows}${hintNote}`,
        shareText,
        verseRef: extractVerseRef(harf.puzzle.verse)
    };

    if (cacheOnly) {
        app.lastResults['harf'] = resultData;
        showViewResultsButton('harf');
        return;
    }

    showResultModal(resultData);
    trackGameComplete('harf', won, won ? guessRows : 0);
    updateModeStats('harf', won, won ? guessRows : 0);

    // Track the verse — completing Harf by Harf means engaging with the verse directly
    if (harf.puzzle && harf.puzzle.verse) {
        trackVerses([harf.puzzle.verse]);
    }
}
