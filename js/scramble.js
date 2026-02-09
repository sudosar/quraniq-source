/* ============================================
   QURANIQ - AYAH SCRAMBLE GAME (ARABIC)
   ============================================
   Players arrange scrambled Arabic word segments
   of a Quranic verse into the correct order.
   Hints reveal the English translation of a segment.
   ============================================ */

const scr = {
    puzzle: null,
    placed: [],
    available: [],
    moves: 0,        // now only counts wrong guesses
    maxMoves: 15,
    hintsUsed: 0,
    maxHints: 3,
    revealedHints: {},  // index -> true for segments whose English has been revealed
    gameOver: false,
    won: false
};

function initScramble() {
    // Try to load AI-generated daily puzzle, fall back to pre-made puzzles
    loadDailyScramble().then(puzzle => {
        scr.puzzle = puzzle;
        setupScrambleGame();
    }).catch(() => {
        // Fallback to pre-made puzzles
        const idx = getPuzzleIndex(PUZZLES.scramble);
        scr.puzzle = PUZZLES.scramble[idx];
        setupScrambleGame();
    });
}

async function loadDailyScramble() {
    const today = new Date().toISOString().slice(0, 10);
    const resp = await fetch(`data/daily_scramble.json?t=${today}`);
    if (!resp.ok) throw new Error('No daily scramble');
    const data = await resp.json();
    if (!data.generated || !data.puzzle || data.date !== today) {
        throw new Error('Daily scramble not available or stale');
    }
    return data.puzzle;
}

function setupScrambleGame() {
    // The puzzle now has:
    //   words: array of Arabic segments (correct order)
    //   translations: array of English translations (parallel to words)
    //   reference: verse reference
    //   arabic: full Arabic verse
    //   hint: general hint text
    scr.maxMoves = Math.max(scr.puzzle.words.length, 3);
    scr.maxHints = Math.min(3, Math.floor(scr.puzzle.words.length / 2));

    // Check saved state
    const saved = app.state[`scr_${app.dayNumber}`];
    if (saved) {
        scr.placed = saved.placed || [];
        scr.available = saved.available || [];
        scr.moves = saved.moves || 0;
        scr.hintsUsed = saved.hintsUsed || 0;
        scr.revealedHints = saved.revealedHints || {};
        scr.gameOver = saved.gameOver || false;
        scr.won = saved.won || false;
    } else {
        scr.available = shuffle([...scr.puzzle.words]);
        scr.placed = [];
        scr.revealedHints = {};
    }

    renderScramble();

    // Remove old listeners and re-attach
    const hintBtn = document.getElementById('scramble-hint');
    const resetBtn = document.getElementById('scramble-reset');
    const checkBtn = document.getElementById('scramble-check');
    hintBtn.replaceWith(hintBtn.cloneNode(true));
    resetBtn.replaceWith(resetBtn.cloneNode(true));
    checkBtn.replaceWith(checkBtn.cloneNode(true));
    document.getElementById('scramble-hint').addEventListener('click', useScrambleHint);
    document.getElementById('scramble-reset').addEventListener('click', resetScramble);
    document.getElementById('scramble-check').addEventListener('click', checkScramble);

    // Restore View Results button for completed games
    if (scr.gameOver && scr.placed.length > 0) {
        showScrResult(true);
    }
}

function renderScramble() {
    // Reference
    document.getElementById('scramble-reference').textContent = scr.puzzle.reference;

    // Attempts & hints counter — "Attempts" = wrong guesses only
    const movesEl = document.getElementById('scramble-moves');
    movesEl.innerHTML = `Attempts: <span>${scr.moves}</span> / <span>${scr.maxMoves}</span> &nbsp;|&nbsp; Hints: <span>${scr.hintsUsed}</span> / <span>${scr.maxHints}</span>`;

    // Drop zone (placed words)
    const dropzone = document.getElementById('scramble-dropzone');
    dropzone.innerHTML = '';
    dropzone.setAttribute('dir', 'rtl');
    if (scr.placed.length === 0) {
        dropzone.innerHTML = '<span style="color:var(--text-secondary);font-size:0.85rem">Tap words below to arrange the verse in order</span>';
    }
    scr.placed.forEach((word, i) => {
        const el = createWordElement(word, i, true);
        dropzone.appendChild(el);
    });

    // Available words (scrambled)
    const wordsEl = document.getElementById('scramble-words');
    wordsEl.innerHTML = '';
    wordsEl.setAttribute('dir', 'rtl');
    scr.available.forEach((word, i) => {
        const el = createWordElement(word, i, false);
        wordsEl.appendChild(el);
    });

    // Update button states
    document.getElementById('scramble-check').disabled = scr.available.length > 0 || scr.gameOver;
    document.getElementById('scramble-hint').disabled = scr.gameOver || scr.hintsUsed >= scr.maxHints;
    document.getElementById('scramble-reset').disabled = scr.gameOver;

    // Update hint button text
    const hintBtn = document.getElementById('scramble-hint');
    if (scr.hintsUsed >= scr.maxHints) {
        hintBtn.textContent = 'No Hints Left';
    } else {
        hintBtn.textContent = `Hint (${scr.maxHints - scr.hintsUsed} left)`;
    }
}

function createWordElement(word, index, isPlaced) {
    const el = document.createElement('div');
    el.className = 'scramble-word' + (isPlaced ? ' in-zone' : '');
    el.setAttribute('role', 'listitem');
    el.setAttribute('dir', 'rtl');

    // Arabic text
    const textSpan = document.createElement('span');
    textSpan.className = 'scramble-word-text';
    textSpan.textContent = word;
    el.appendChild(textSpan);

    // Check if this word has a revealed hint
    const wordIdx = scr.puzzle.words.indexOf(word);
    if (wordIdx !== -1 && scr.revealedHints[wordIdx] && scr.puzzle.translations) {
        const hintSpan = document.createElement('span');
        hintSpan.className = 'scramble-word-hint';
        hintSpan.textContent = scr.puzzle.translations[wordIdx];
        el.appendChild(hintSpan);
        el.classList.add('has-hint');
    }

    if (!scr.gameOver) {
        el.setAttribute('tabindex', '0');
        if (isPlaced) {
            el.setAttribute('aria-label', `Remove "${word}" from position ${index + 1}`);
            el.addEventListener('click', () => {
                scr.placed.splice(index, 1);
                scr.available.push(word);
                // No move increment — placing/removing is free
                saveScrState();
                renderScramble();
                announce(`Removed word. ${scr.placed.length} words placed.`);
            });
        } else {
            el.setAttribute('aria-label', `Place "${word}"`);
            el.addEventListener('click', () => {
                scr.available.splice(index, 1);
                scr.placed.push(word);
                // No move increment — placing/removing is free
                saveScrState();
                renderScramble();
                announce(`Placed word. ${scr.available.length} words remaining.`);
                // Auto-check if all placed
                if (scr.available.length === 0) {
                    setTimeout(() => checkScramble(), 300);
                }
            });
        }
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
        });
    }

    return el;
}

function useScrambleHint() {
    if (scr.gameOver || scr.hintsUsed >= scr.maxHints) return;

    // Find a word that hasn't had its translation revealed yet
    const translations = scr.puzzle.translations || [];
    if (translations.length === 0) {
        // Fallback: use the old hint behavior (place next correct word)
        useScrambleHintFallback();
        return;
    }

    // Find an unrevealed word — prioritize words in the available pool
    let targetIdx = -1;

    // First try: find an unrevealed word in the available pool
    for (const word of scr.available) {
        const idx = scr.puzzle.words.indexOf(word);
        if (idx !== -1 && !scr.revealedHints[idx]) {
            targetIdx = idx;
            break;
        }
    }

    // Second try: find any unrevealed word
    if (targetIdx === -1) {
        for (let i = 0; i < scr.puzzle.words.length; i++) {
            if (!scr.revealedHints[i]) {
                targetIdx = i;
                break;
            }
        }
    }

    if (targetIdx === -1) {
        showToast('All translations already revealed');
        return;
    }

    scr.hintsUsed++;
    scr.revealedHints[targetIdx] = true;

    const word = scr.puzzle.words[targetIdx];
    const translation = translations[targetIdx] || '...';
    showToast(`${word} = "${translation}"`);
    announce(`Hint: ${word} means "${translation}"`);

    saveScrState();
    renderScramble();
}

function useScrambleHintFallback() {
    // Old behavior: place the next correct word in position
    scr.hintsUsed++;
    const correctWords = scr.puzzle.words;
    for (let i = 0; i < correctWords.length; i++) {
        if (scr.placed[i] !== correctWords[i]) {
            const word = correctWords[i];
            const availIdx = scr.available.indexOf(word);
            const placedIdx = scr.placed.indexOf(word);

            if (availIdx >= 0) {
                scr.available.splice(availIdx, 1);
            } else if (placedIdx >= 0) {
                scr.placed.splice(placedIdx, 1);
            }

            scr.placed.splice(i, 0, word);
            // No move increment for hints — hints have their own counter
            break;
        }
    }

    showToast(`Hint: ${scr.puzzle.hint}`);
    announce(`Hint used: ${scr.puzzle.hint}`);
    saveScrState();
    renderScramble();
}

function resetScramble() {
    if (scr.gameOver) return;
    scr.available = shuffle([...scr.placed, ...scr.available]);
    scr.placed = [];
    // No move increment — reset is free, only wrong guesses cost attempts
    saveScrState();
    renderScramble();
    announce('Puzzle reset. All words moved back to available.');
}

function normalizeArabicForCompare(text) {
    // Normalize whitespace and trim
    return text.replace(/\s+/g, ' ').trim();
}

function checkScramble() {
    if (scr.available.length > 0 || scr.gameOver) return;

    const correct = scr.puzzle.words;
    // Primary check: exact match by position
    let isCorrect = scr.placed.length === correct.length &&
        scr.placed.every((w, i) => w === correct[i]);

    // Fallback: compare the joined result against the full arabic verse
    if (!isCorrect && scr.puzzle.arabic) {
        const placedJoined = normalizeArabicForCompare(scr.placed.join(' '));
        const verseNorm = normalizeArabicForCompare(scr.puzzle.arabic);
        isCorrect = placedJoined === verseNorm;
    }

    if (isCorrect) {
        scr.won = true;
        scr.gameOver = true;
        // Animate correct
        document.querySelectorAll('#scramble-dropzone .scramble-word').forEach(el => {
            el.classList.add('correct-pos');
        });
        document.getElementById('scramble-dropzone').classList.add('correct');
        saveScrState();
        announce('Correct! Verse complete!');
        setTimeout(() => showScrResult(), 800);
    } else {
        // Wrong guess — this costs an attempt
        scr.moves++;

        // Show which are correct/wrong
        const dropWords = document.querySelectorAll('#scramble-dropzone .scramble-word');
        let correctCount = 0;
        dropWords.forEach((el, i) => {
            if (scr.placed[i] === correct[i]) {
                el.classList.add('correct-pos');
                correctCount++;
            } else {
                el.classList.add('wrong-pos');
            }
        });
        showToast('Not quite right - try again!');
        announce(`${correctCount} of ${correct.length} words in correct position.`);

        // Check if out of attempts
        if (scr.moves >= scr.maxMoves) {
            scr.gameOver = true;
            saveScrState();
            setTimeout(() => showScrResult(), 800);
        } else {
            saveScrState();
        }

        // Update display to show new attempt count
        renderScramble();

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
        revealedHints: scr.revealedHints,
        gameOver: scr.gameOver,
        won: scr.won
    };
    saveState(app.state);
}

function showScrResult(cacheOnly) {
    const total = scr.puzzle.words.length;
    const correctCount = scr.placed.filter((w, i) => w === scr.puzzle.words[i]).length;

    let emojiGrid = '';
    scr.placed.forEach((w, i) => {
        emojiGrid += w === scr.puzzle.words[i] ? '🟩' : '🟥';
    });

    const puzzleNum = getPuzzleIndex(PUZZLES.scramble) + 1;
    // Moon rating based on hints used only (matches the score system)
    // 0 hints = 5 moons, 1 hint = 4 moons, 2 hints = 3 moons, 3 hints = 2 moons
    // Attempts (wrong guesses) are just a gameplay limit, not a rating factor
    const moons = scr.won ? Math.max(1, 5 - scr.hintsUsed) : 0;
    const moonStr = '🌙'.repeat(moons) + '🌑'.repeat(5 - moons);

    const shareText = `QuranIQ - Ayah Scramble #${puzzleNum}\n${scr.puzzle.reference}\n${emojiGrid}\n${moonStr}\nAttempts: ${scr.moves}/${scr.maxMoves} | Hints: ${scr.hintsUsed}/${scr.maxHints}\n\nhttps://sudosar.github.io/quraniq/`;

    // Show the full verse translation in the result
    const translationText = scr.puzzle.translations
        ? scr.puzzle.translations.join(' ')
        : (scr.puzzle.english || scr.puzzle.words.join(' '));

    const resultData = {
        icon: scr.won ? '✨' : '📖',
        title: scr.won ? 'Verse Complete!' : 'Nice Try!',
        arabic: scr.puzzle.arabic || scr.puzzle.words.join(' '),
        translation: translationText,
        emojiGrid: emojiGrid,
        moons: scr.won ? moons : null,
        statsText: `Attempts: ${scr.moves}/${scr.maxMoves} | Hints: ${scr.hintsUsed}/${scr.maxHints}`,
        shareText,
        verseRef: extractVerseRef(scr.puzzle.reference)
    };

    if (cacheOnly) {
        app.lastResults['scramble'] = resultData;
        showViewResultsButton('scramble');
        return;
    }

    showResultModal(resultData);
    // Score: fewer hints = better score (1=best, 6=worst)
    // 0 hints → score 1, 1 hint → score 2, 2 hints → score 3, 3 hints → score 4
    const score = scr.won ? Math.min(6, Math.max(1, scr.hintsUsed + 1)) : 0;
    updateModeStats('scramble', scr.won, score);

    // Track the verse reference from this puzzle
    if (scr.puzzle && scr.puzzle.reference) {
        trackVerses([scr.puzzle.reference]);
    }
}
