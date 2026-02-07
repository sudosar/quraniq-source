/* ============================================
   QURANPUZZLE - SCRAMBLE GAME
   ============================================ */

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
        el.setAttribute('role', 'listitem');
        if (!scr.gameOver) {
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', `Remove "${word}" from position ${i + 1}`);
            el.addEventListener('click', () => {
                scr.placed.splice(i, 1);
                scr.available.push(word);
                scr.moves++;
                saveScrState();
                renderScramble();
                announce(`Removed "${word}". ${scr.placed.length} words placed.`);
            });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
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
        el.setAttribute('role', 'listitem');
        if (!scr.gameOver) {
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', `Place "${word}"`);
            el.addEventListener('click', () => {
                scr.available.splice(i, 1);
                scr.placed.push(word);
                scr.moves++;
                saveScrState();
                renderScramble();
                announce(`Placed "${word}". ${scr.available.length} words remaining.`);
                // Auto-check if all placed
                if (scr.available.length === 0) {
                    setTimeout(() => checkScramble(), 300);
                }
            });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
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
    announce(`Hint used: ${scr.puzzle.hint}`);
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
    announce('Puzzle reset. All words moved back to available.');
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
        announce('Correct! Verse complete!');
        setTimeout(() => showScrResult(), 800);
    } else {
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

    const shareText = `QuranPuzzle - Scramble #${puzzleNum}\n${scr.puzzle.reference}\n${emojiGrid}\n${starStr}\nMoves: ${scr.moves}/${scr.maxMoves}\n\nhttps://sudosar.github.io/quranpuzz/`;

    showResultModal({
        icon: scr.won ? '✨' : '📖',
        title: scr.won ? 'Verse Complete!' : 'Nice Try!',
        arabic: scr.puzzle.arabic,
        translation: scr.puzzle.words.join(' '),
        emojiGrid: `${emojiGrid}\n${starStr}`,
        statsText: `Moves: ${scr.moves}/${scr.maxMoves} | Hints: ${scr.hintsUsed}`,
        shareText
    });

    updateModeStats('scramble', scr.won, scr.won ? Math.max(1, 6 - scr.hintsUsed) : 0);
}
