/* ============================================
   QURANIQ - AYAH SCRAMBLE GAME (ARABIC)
   ============================================
   Players arrange scrambled Arabic word segments
   of a Quranic verse into the correct order.

   Hint system:
     - FREE: Theme hint always visible at top
     - Hint 1 (1 moon): Reveal all English translations as tooltips
     - Hint 2 (1 moon): Lock one segment into correct position
     - Hint 3 (1 moon): Lock another segment into correct position

   Interaction: tap to place/remove + drag-and-drop reorder
   ============================================ */

const scr = {
    puzzle: null,
    placed: [],
    available: [],
    moves: 0,           // wrong guesses only
    maxMoves: 15,
    hintsUsed: 0,
    maxHints: 3,
    translationsRevealed: false,  // hint 1: all translations shown
    lockedPositions: {},          // index -> word for locked segments
    gameOver: false,
    won: false,
    lastChecked: null,   // prevent duplicate deductions
    dragSrcIndex: null   // drag-and-drop source index
};

function initScramble() {
    loadDailyWithHolding(
        'daily_scramble.json',
        'scramble-game',
        'Ayah Scramble',
        (puzzle) => {
            scr.puzzle = puzzle;
            setupScrambleGame();
        }
    );
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
    scr.maxMoves = Math.max(scr.puzzle.words.length, 3);
    scr.maxHints = 3;  // always 3: translations, lock, lock

    // Check saved state
    const saved = app.state[`scr_${app.dayNumber}`];
    if (saved) {
        scr.placed = saved.placed || [];
        scr.available = saved.available || [];
        scr.moves = saved.moves || 0;
        scr.hintsUsed = saved.hintsUsed || 0;
        scr.translationsRevealed = saved.translationsRevealed || false;
        scr.lockedPositions = saved.lockedPositions || {};
        scr.gameOver = saved.gameOver || false;
        scr.won = saved.won || false;
        scr.lastChecked = saved.lastChecked || null;
    } else {
        scr.available = shuffle([...scr.puzzle.words]);
        scr.placed = [];
        scr.translationsRevealed = false;
        scr.lockedPositions = {};
        scr.lastChecked = null;
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

    // Free theme hint — always visible
    let themeEl = document.getElementById('scramble-theme-hint');
    if (!themeEl) {
        themeEl = document.createElement('div');
        themeEl.id = 'scramble-theme-hint';
        themeEl.className = 'scramble-theme-hint';
        const refEl = document.getElementById('scramble-reference');
        refEl.parentNode.insertBefore(themeEl, refEl.nextSibling);
    }
    if (scr.puzzle.hint) {
        themeEl.innerHTML = `<span class="theme-icon">💡</span> ${scr.puzzle.hint}`;
        themeEl.style.display = '';
    } else {
        themeEl.style.display = 'none';
    }

    // Crescent meter
    const scrMeterEl = document.getElementById('scr-crescent-meter');
    if (scrMeterEl) {
        const currentMoons = scr.gameOver && !scr.won ? 0 : Math.max(1, 5 - scr.hintsUsed - scr.moves);
        const crescents = Array.from({ length: 5 }, (_, i) =>
            `<span class="ded-moon ${i < currentMoons ? 'active' : 'spent'}">${i < currentMoons ? '\u{1F319}' : '\u{1F311}'}</span>`
        ).join('');

        if (scr.gameOver) {
            scrMeterEl.innerHTML = `<div class="ded-meter-row">${crescents}</div>`;
        } else if (scr.hintsUsed < scr.maxHints) {
            scrMeterEl.innerHTML = `<div class="ded-meter-row">${crescents}</div>
                <div class="ded-meter-hint">Each hint costs a \u{1F319}</div>`;
        } else {
            scrMeterEl.innerHTML = `<div class="ded-meter-row">${crescents}</div>
                <div class="ded-meter-hint">All hints used</div>`;
        }
    }

    // Attempts & hints counter
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

    // Update hint button text with description of next hint
    const hintBtn = document.getElementById('scramble-hint');
    if (scr.hintsUsed >= scr.maxHints) {
        hintBtn.textContent = 'No Hints Left';
    } else if (scr.hintsUsed === 0) {
        hintBtn.textContent = 'Hint: Show Translations';
    } else {
        hintBtn.textContent = `Hint: Lock a Segment (${scr.maxHints - scr.hintsUsed} left)`;
    }
}

function createWordElement(word, index, isPlaced) {
    const el = document.createElement('div');
    const isLocked = isPlaced && isLockedAt(index);
    el.className = 'scramble-word' + (isPlaced ? ' in-zone' : '') + (isLocked ? ' locked' : '');
    el.setAttribute('role', 'listitem');
    el.setAttribute('dir', 'rtl');

    // Lock icon for locked segments
    if (isLocked) {
        const lockIcon = document.createElement('span');
        lockIcon.className = 'scramble-lock-icon';
        lockIcon.textContent = '🔒';
        el.appendChild(lockIcon);
    }

    // Arabic text
    const textSpan = document.createElement('span');
    textSpan.className = 'scramble-word-text';
    textSpan.textContent = word;
    el.appendChild(textSpan);

    // Show English translation tooltip if translations are revealed (hint 1)
    if (scr.translationsRevealed && scr.puzzle.translations) {
        const wordIdx = scr.puzzle.words.indexOf(word);
        if (wordIdx !== -1 && scr.puzzle.translations[wordIdx]) {
            const hintSpan = document.createElement('span');
            hintSpan.className = 'scramble-word-hint';
            hintSpan.textContent = scr.puzzle.translations[wordIdx];
            el.appendChild(hintSpan);
            el.classList.add('has-hint');
        }
    }

    if (!scr.gameOver) {
        if (isLocked) {
            // Locked segments can't be moved
            el.style.cursor = 'default';
            el.setAttribute('aria-label', `"${word}" is locked in position ${index + 1}`);
        } else {
            el.setAttribute('tabindex', '0');

            if (isPlaced) {
                el.setAttribute('aria-label', `Remove "${word}" from position ${index + 1}`);

                // Drag-and-drop for reordering within dropzone
                el.draggable = true;
                el.addEventListener('dragstart', (e) => {
                    scr.dragSrcIndex = index;
                    el.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', index.toString());
                });
                el.addEventListener('dragend', () => {
                    el.classList.remove('dragging');
                    scr.dragSrcIndex = null;
                    document.querySelectorAll('.scramble-word.drag-over').forEach(
                        el => el.classList.remove('drag-over')
                    );
                });
                el.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    el.classList.add('drag-over');
                });
                el.addEventListener('dragleave', () => {
                    el.classList.remove('drag-over');
                });
                el.addEventListener('drop', (e) => {
                    e.preventDefault();
                    el.classList.remove('drag-over');
                    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                    if (!isNaN(fromIdx) && fromIdx !== index) {
                        reorderPlaced(fromIdx, index);
                    }
                });

                // Touch drag support
                setupTouchDrag(el, index);

                // Tap to remove
                el.addEventListener('click', (e) => {
                    if (el.classList.contains('touch-dragging')) return; // don't remove during drag
                    scr.placed.splice(index, 1);
                    scr.available.push(word);
                    saveScrState();
                    renderScramble();
                    announce(`Removed word. ${scr.placed.length} words placed.`);
                });
            } else {
                el.setAttribute('aria-label', `Place "${word}"`);
                el.addEventListener('click', () => {
                    scr.available.splice(index, 1);
                    // Find the next available (non-locked) position to insert
                    const insertIdx = findNextUnlockedPosition();
                    scr.placed.splice(insertIdx, 0, word);
                    saveScrState();
                    renderScramble();
                    announce(`Placed word. ${scr.available.length} words remaining.`);
                });
            }
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
            });
        }
    }

    return el;
}

/* ---- Global cleanup for stuck drag clones ---- */
function cleanupDragClones() {
    document.querySelectorAll('.dragging-clone').forEach(c => c.remove());
    document.querySelectorAll('.scramble-word.touch-dragging').forEach(el => {
        el.classList.remove('touch-dragging');
        el.style.opacity = '';
    });
    document.querySelectorAll('.scramble-word.dragging').forEach(el => {
        el.classList.remove('dragging');
        el.style.opacity = '';
    });
    document.querySelectorAll('.scramble-word.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
}

// Clean up on visibility change (tab switch, app switch)
document.addEventListener('visibilitychange', cleanupDragClones);
// Clean up when any overlay/modal opens (leaderboard, stats, etc.)
document.addEventListener('click', (e) => {
    if (e.target.closest('.modal, .overlay, [data-modal], .leaderboard-toggle, .stats-btn, .nav-icon')) {
        cleanupDragClones();
    }
});

/* ---- Touch drag support for mobile ---- */
function setupTouchDrag(el, index) {
    let touchStartY = 0;
    let touchStartX = 0;
    let isDragging = false;
    let clone = null;

    el.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = false;
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
        const dx = Math.abs(e.touches[0].clientX - touchStartX);
        const dy = Math.abs(e.touches[0].clientY - touchStartY);

        if (!isDragging && (dx > 10 || dy > 10)) {
            isDragging = true;
            el.classList.add('touch-dragging');
            // Create floating clone
            clone = el.cloneNode(true);
            clone.className = 'scramble-word dragging-clone';
            clone.style.position = 'fixed';
            clone.style.zIndex = '9999';
            clone.style.pointerEvents = 'none';
            clone.style.width = el.offsetWidth + 'px';
            clone.style.opacity = '0.85';
            document.body.appendChild(clone);
            el.style.opacity = '0.3';
        }

        if (isDragging && clone) {
            e.preventDefault();
            clone.style.left = (e.touches[0].clientX - clone.offsetWidth / 2) + 'px';
            clone.style.top = (e.touches[0].clientY - clone.offsetHeight / 2) + 'px';

            // Highlight drop target
            document.querySelectorAll('#scramble-dropzone .scramble-word').forEach(w => {
                w.classList.remove('drag-over');
            });
            const target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
            if (target) {
                const wordEl = target.closest('.scramble-word.in-zone');
                if (wordEl && wordEl !== el) {
                    wordEl.classList.add('drag-over');
                }
            }
        }
    }, { passive: false });

    el.addEventListener('touchcancel', () => {
        if (clone) { clone.remove(); clone = null; }
        el.style.opacity = '';
        el.classList.remove('touch-dragging');
        isDragging = false;
        document.querySelectorAll('.scramble-word.drag-over').forEach(
            w => w.classList.remove('drag-over')
        );
    });

    el.addEventListener('touchend', (e) => {
        if (isDragging && clone) {
            // Find drop target
            const touch = e.changedTouches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target) {
                const wordEl = target.closest('.scramble-word.in-zone');
                if (wordEl && wordEl !== el) {
                    const dropzoneChildren = Array.from(
                        document.getElementById('scramble-dropzone').children
                    );
                    const toIdx = dropzoneChildren.indexOf(wordEl);
                    if (toIdx !== -1 && toIdx !== index) {
                        reorderPlaced(index, toIdx);
                    }
                }
            }
            clone.remove();
            clone = null;
            el.style.opacity = '';
            document.querySelectorAll('.scramble-word.drag-over').forEach(
                w => w.classList.remove('drag-over')
            );
        }
        // Delay removing touch-dragging flag so click handler can check it
        setTimeout(() => {
            el.classList.remove('touch-dragging');
            isDragging = false;
        }, 50);
    });
}

/* ---- Reorder placed segments (drag-and-drop) ---- */
function reorderPlaced(fromIdx, toIdx) {
    // Don't move to/from locked positions
    if (isLockedAt(fromIdx) || isLockedAt(toIdx)) {
        showToast('Cannot move locked segments');
        return;
    }
    const item = scr.placed.splice(fromIdx, 1)[0];
    scr.placed.splice(toIdx, 0, item);
    saveScrState();
    renderScramble();
    announce(`Moved segment to position ${toIdx + 1}`);
}

/* ---- Helper: check if position is locked ---- */
function isLockedAt(index) {
    return scr.lockedPositions.hasOwnProperty(index.toString());
}

/* ---- Helper: find next available position for placing a word ---- */
function findNextUnlockedPosition() {
    // Place at end by default
    return scr.placed.length;
}

/* ---- NEW HINT SYSTEM ---- */
function useScrambleHint() {
    if (scr.gameOver || scr.hintsUsed >= scr.maxHints) return;

    if (scr.hintsUsed === 0) {
        // Hint 1: Reveal ALL English translations at once
        useHintTranslations();
    } else {
        // Hint 2 & 3: Lock a segment into correct position
        useHintLockPosition();
    }
}

function useHintTranslations() {
    const translations = scr.puzzle.translations || [];
    if (translations.length === 0) {
        // No translations available — fall back to lock
        useHintLockPosition();
        return;
    }

    scr.hintsUsed++;
    scr.translationsRevealed = true;

    showToast('English translations revealed for all segments!');
    announce('Hint: English translations now shown on all segments');

    saveScrState();
    renderScramble();
}

function useHintLockPosition() {
    scr.hintsUsed++;

    const correctWords = scr.puzzle.words;
    let lockedIdx = -1;

    // Find a segment that is NOT already locked and NOT in correct position
    // First: try to lock one that's in the placed array but wrong position
    for (let i = 0; i < correctWords.length; i++) {
        if (isLockedAt(i)) continue;
        // This position needs the correct word placed here
        const correctWord = correctWords[i];

        // Find where this word currently is
        const inPlacedIdx = scr.placed.indexOf(correctWord);
        const inAvailIdx = scr.available.indexOf(correctWord);

        if (inAvailIdx >= 0) {
            // Word is in available pool — move it to correct position
            scr.available.splice(inAvailIdx, 1);
            // Make room at position i: shift existing word out if needed
            if (i < scr.placed.length && scr.placed[i] !== correctWord) {
                const displaced = scr.placed.splice(i, 1, correctWord);
                if (displaced.length > 0 && displaced[0]) {
                    scr.available.push(displaced[0]);
                }
            } else if (i >= scr.placed.length) {
                // Pad with available words if needed
                while (scr.placed.length < i) {
                    if (scr.available.length > 0) {
                        scr.placed.push(scr.available.shift());
                    } else break;
                }
                scr.placed.splice(i, 0, correctWord);
            }
            lockedIdx = i;
            break;
        } else if (inPlacedIdx >= 0 && inPlacedIdx !== i) {
            // Word is placed but in wrong position — swap
            const otherWord = scr.placed[i];
            scr.placed[i] = correctWord;
            scr.placed[inPlacedIdx] = otherWord;
            lockedIdx = i;
            break;
        } else if (inPlacedIdx === i) {
            // Already in correct position — just lock it
            lockedIdx = i;
            break;
        }
    }

    if (lockedIdx === -1) {
        // All positions either locked or correct — find any unlocked correct one
        for (let i = 0; i < correctWords.length; i++) {
            if (!isLockedAt(i) && scr.placed[i] === correctWords[i]) {
                lockedIdx = i;
                break;
            }
        }
    }

    if (lockedIdx >= 0) {
        scr.lockedPositions[lockedIdx.toString()] = scr.placed[lockedIdx];
        const word = scr.placed[lockedIdx];
        showToast(`🔒 Locked "${word}" in position ${lockedIdx + 1}`);
        announce(`Hint: Locked segment "${word}" into correct position`);
    } else {
        showToast('No more segments to lock');
    }

    saveScrState();
    renderScramble();


}

function resetScramble() {
    if (scr.gameOver) return;

    // Collect all non-locked words
    const lockedIndices = Object.keys(scr.lockedPositions).map(Number);
    const nonLockedWords = [];

    scr.placed.forEach((word, i) => {
        if (!isLockedAt(i)) nonLockedWords.push(word);
    });
    nonLockedWords.push(...scr.available);

    // Shuffle non-locked words
    const shuffled = shuffle(nonLockedWords);

    // Rebuild placed array preserving locked positions
    if (lockedIndices.length > 0) {
        const newPlaced = new Array(scr.puzzle.words.length).fill(null);
        // Place locked words
        lockedIndices.forEach(i => {
            newPlaced[i] = scr.lockedPositions[i.toString()];
        });
        // Fill remaining with shuffled words — put them in available
        scr.placed = [];
        scr.available = shuffled;
        // Actually keep locked in placed
        const maxLocked = Math.max(...lockedIndices) + 1;
        scr.placed = newPlaced.slice(0, maxLocked).map((w, i) => {
            if (w !== null) return w;
            if (scr.available.length > 0) return scr.available.shift();
            return null;
        }).filter(w => w !== null);
    } else {
        scr.available = shuffled;
        scr.placed = [];
    }

    saveScrState();
    renderScramble();
    announce('Puzzle reset. Non-locked words shuffled.');
}

function normalizeArabicForCompare(text) {
    return text.replace(/\s+/g, ' ').trim();
}

function checkScramble() {
    if (scr.available.length > 0 || scr.gameOver) return;

    const correct = scr.puzzle.words;
    let isCorrect = scr.placed.length === correct.length &&
        scr.placed.every((w, i) => w === correct[i]);

    if (!isCorrect && scr.puzzle.arabic) {
        const placedJoined = normalizeArabicForCompare(scr.placed.join(' '));
        const verseNorm = normalizeArabicForCompare(scr.puzzle.arabic);
        isCorrect = placedJoined === verseNorm;
    }

    if (isCorrect) {
        scr.won = true;
        scr.gameOver = true;
        scr.lastChecked = null;
        document.querySelectorAll('#scramble-dropzone .scramble-word').forEach(el => {
            el.classList.add('correct-pos');
        });
        document.getElementById('scramble-dropzone').classList.add('correct');
        saveScrState();
        announce('Correct! Verse complete!');
        setTimeout(() => showScrResult(), 800);
    } else {
        // Prevent duplicate deductions for same arrangement
        const currentArrangement = scr.placed.join('|');
        if (scr.lastChecked === currentArrangement) {
            showToast('Rearrange the words before checking again');
            return;
        }
        scr.lastChecked = currentArrangement;

        scr.moves++;

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

        if (scr.moves >= scr.maxMoves) {
            scr.gameOver = true;
            saveScrState();
            setTimeout(() => showScrResult(), 800);
        } else {
            saveScrState();
        }

        renderScramble();

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
        translationsRevealed: scr.translationsRevealed,
        lockedPositions: scr.lockedPositions,
        gameOver: scr.gameOver,
        won: scr.won,
        lastChecked: scr.lastChecked
    };
    saveState(app.state);
}

function resetScrambleProgress() {
    if (!confirm('Reset your Scramble progress for today? This cannot be undone.')) return;
    delete app.state[`scr_${app.dayNumber}`];
    saveState(app.state);
    // Reset all state
    scr.placed = [];
    scr.available = shuffle([...scr.puzzle.words]);
    scr.moves = 0;
    scr.hintsUsed = 0;
    scr.translationsRevealed = false;
    scr.lockedPositions = {};
    scr.gameOver = false;
    scr.won = false;
    scr.lastChecked = null;
    // Remove any View Results button
    delete app.lastResults['scramble'];
    const vrBtn = document.querySelector('#scramble-game .view-results-btn');
    if (vrBtn) vrBtn.remove();
    renderScramble();
    showToast('Scramble progress reset');
}

function showScrResult(cacheOnly) {
    const total = scr.puzzle.words.length;
    const correctCount = scr.placed.filter((w, i) => w === scr.puzzle.words[i]).length;

    let emojiGrid = '';
    scr.placed.forEach((w, i) => {
        emojiGrid += w === scr.puzzle.words[i] ? '🟩' : '🟥';
    });

    const puzzleNum = getPuzzleNumber();
    const moons = scr.won ? Math.max(1, 5 - scr.hintsUsed - scr.moves) : 0;
    const moonStr = '🌙'.repeat(moons) + '🌑'.repeat(5 - moons);

    const shareText = `QuranIQ - Ayah Scramble #${puzzleNum}\n${scr.puzzle.reference}\n${emojiGrid}\n${moonStr}\nAttempts: ${scr.moves}/${scr.maxMoves} | Hints: ${scr.hintsUsed}/${scr.maxHints}\n\nhttps://sudosar.github.io/quraniq/`;

    const translationText = scr.puzzle.verseEn
        || (scr.puzzle.translations ? scr.puzzle.translations.join(' ') : '')
        || scr.puzzle.english
        || scr.puzzle.words.join(' ');

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
    trackGameComplete('scramble', scr.won, scr.hintsUsed);
    const score = scr.won ? Math.min(6, Math.max(1, scr.hintsUsed + 1)) : 0;
    updateModeStats('scramble', scr.won, score);

    if (scr.puzzle && scr.puzzle.reference) {
        trackVerses([scr.puzzle.reference]);
    }
}
