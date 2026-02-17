/* ============================================
   QURANIQ - DEDUCTION GAME
   ============================================ */

const ded = {
    puzzle: null,
    cluesRevealed: 0,
    selections: {},
    gameOver: false,
    won: false
};

function initDeduction() {
    // Load daily puzzle with holding screen if not ready
    loadDailyWithHolding(
        'daily_deduction.json',
        'deduction-game',
        'Who Am I?',
        (puzzle) => {
            ded.puzzle = puzzle;
            setupDeductionGame();
        }
    );
}

async function loadDailyDeduction() {
    const today = new Date().toISOString().slice(0, 10);
    const resp = await fetch(`data/daily_deduction.json?t=${today}`);
    if (!resp.ok) throw new Error('No daily deduction');
    const data = await resp.json();
    if (!data.generated || !data.puzzle || data.date !== today) {
        throw new Error('Daily deduction not available or stale');
    }
    return data.puzzle;
}

function setupDeductionGame() {
    // Check saved state
    const saved = app.state[`ded_${app.dayNumber}`];
    if (saved) {
        ded.cluesRevealed = saved.cluesRevealed || 0;
        ded.selections = saved.selections || {};
        ded.gameOver = saved.gameOver || false;
        ded.won = saved.won || false;
    }

    renderDeduction();

    // Restore View Results button for completed games
    if (ded.gameOver) {
        showDedResult(true);
    }
}

function renderDeduction() {
    // Story
    const storyEl = document.getElementById('deduction-story');
    storyEl.innerHTML = `<div class="story-title">${ded.puzzle.title}</div><p>${ded.puzzle.intro}</p>`;

    // Moon rating helper: 0-1 clues = 5, 2 = 4, 3 = 3, 4 = 2, 5+ = 1
    const moonsForClues = (n) => n <= 1 ? 5 : n === 2 ? 4 : n === 3 ? 3 : n === 4 ? 2 : 1;

    // Crescent meter — shows remaining crescents and cost warning
    const meterEl = document.getElementById('ded-crescent-meter');
    if (meterEl) {
        const totalClues = ded.puzzle.clues.length;
        const currentMoons = moonsForClues(ded.cluesRevealed);
        const crescents = Array.from({ length: 5 }, (_, i) =>
            `<span class="ded-moon ${i < currentMoons ? 'active' : 'spent'}">${i < currentMoons ? '🌙' : '🌑'}</span>`
        ).join('');

        if (ded.gameOver) {
            meterEl.innerHTML = `<div class="ded-meter-row">${crescents}</div>`;
        } else if (ded.cluesRevealed < totalClues) {
            const nextMoons = moonsForClues(ded.cluesRevealed + 1);
            const willLose = currentMoons - nextMoons;
            const hintMsg = willLose > 0
                ? `Next clue costs a 🌙`
                : `Next clue is free — no crescent lost`;
            meterEl.innerHTML = `<div class="ded-meter-row">${crescents}</div>
                <div class="ded-meter-hint">${hintMsg}</div>`;
        } else {
            meterEl.innerHTML = `<div class="ded-meter-row">${crescents}</div>
                <div class="ded-meter-hint">All clues revealed</div>`;
        }
    }

    // Clues — after game over, reveal ALL clues
    const cluesEl = document.getElementById('deduction-clues');
    cluesEl.innerHTML = '';
    ded.puzzle.clues.forEach((clue, i) => {
        const isRevealed = i < ded.cluesRevealed;
        const isPostGameReveal = ded.gameOver && !isRevealed;
        const showClue = isRevealed || ded.gameOver;

        const card = document.createElement('div');
        card.className = 'clue-card' + (isRevealed ? ' revealed' : '') + (isPostGameReveal ? ' post-game-reveal' : '');
        card.setAttribute('role', 'listitem');
        card.innerHTML = `
            <div class="clue-number">${i + 1}</div>
            <div class="clue-text">${showClue ? clue : '<span class="clue-hidden">Tap to reveal clue ' + (i + 1) + '</span>'}</div>
        `;
        if (!ded.gameOver && i === ded.cluesRevealed) {
            card.addEventListener('click', () => {
                ded.cluesRevealed++;
                trackDeductionClueReveal(ded.cluesRevealed);
                saveDedState();
                renderDeduction();
                announce(`Clue ${ded.cluesRevealed} revealed`);
            });
            card.style.cursor = 'pointer';
            card.setAttribute('tabindex', '0');
            const nextMoons = moonsForClues(ded.cluesRevealed + 1);
            const clueWillCost = moonsForClues(ded.cluesRevealed) - nextMoons > 0;
            card.setAttribute('aria-label', `Reveal clue ${i + 1}.${clueWillCost ? ' This will cost a crescent.' : ' This clue is free.'}`);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
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
        catEl.innerHTML = `<h4>${cat.label}</h4><div class="deduction-options" data-cat="${key}" role="radiogroup" aria-label="${cat.label}"></div>`;
        const optsEl = catEl.querySelector('.deduction-options');

        cat.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'deduction-opt';
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-checked', ded.selections[key] === opt ? 'true' : 'false');
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
                announce(`Selected ${opt} for ${cat.label}`);
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
    Object.keys(cats).forEach(k => {
        trackDeductionGuess(k, ded.selections[k] === cats[k].answer);
    });
    ded.gameOver = true;
    saveDedState();
    renderDeduction();

    announce(ded.won ? 'Correct! All answers are right!' : 'Not quite right. Keep learning!');
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

function showDedResult(cacheOnly) {
    const cats = ded.puzzle.categories;
    let emojiGrid = '';
    let correct = 0;
    Object.keys(cats).forEach(k => {
        const isCorrect = ded.selections[k] === cats[k].answer;
        emojiGrid += `${cats[k].label}: ${isCorrect ? '✅' : '❌'}\n`;
        if (isCorrect) correct++;
    });

    const puzzleNum = getPuzzleNumber();
    const cluesUsed = ded.cluesRevealed;

    // Moon rating: perfect (4/4) uses clue-based scoring, partial gives 1🌙 per correct
    // Won with 0-1 clues = 5, 2 = 4, 3 = 3, 4 = 2, 5-6 = 1; partial = correct count
    let moons = 0;
    if (ded.won) {
        if (cluesUsed <= 1) moons = 5;
        else if (cluesUsed === 2) moons = 4;
        else if (cluesUsed === 3) moons = 3;
        else if (cluesUsed === 4) moons = 2;
        else moons = 1;
    } else {
        moons = correct;
    }
    const moonStr = '🌙'.repeat(moons) + '🌑'.repeat(5 - moons);

    const shareText = `QuranIQ - Who Am I? #${puzzleNum}\n"${ded.puzzle.title}"\n${emojiGrid}${moonStr}\n${correct}/4 correct | ${cluesUsed} clues used\n\nhttps://sudosar.github.io/quraniq/#deduction`;

    const resultData = {
        icon: ded.won ? '🕵️' : '📖',
        title: ded.won ? 'Mystery Solved!' : `${correct}/4 Correct`,
        arabic: ded.puzzle.arabic,
        translation: ded.puzzle.verse,
        emojiGrid: emojiGrid.trim(),
        moons: moons || null,
        statsText: `${correct}/4 correct using ${cluesUsed} clues`,
        shareText,
        verseRef: extractVerseRef(ded.puzzle.verse)
    };

    if (cacheOnly) {
        app.lastResults['deduction'] = resultData;
        showViewResultsButton('deduction');
        return;
    }

    showResultModal(resultData);
    trackGameComplete('deduction', ded.won, cluesUsed);
    // Score: fewer clues = better score (1=best, 6=worst)
    // 0 clues → score 1, 1 clue → score 2, ..., 5+ clues → score 6
    const score = ded.won ? Math.min(6, Math.max(1, cluesUsed + 1)) : (correct > 0 ? 7 - correct : 0);
    updateModeStats('deduction', ded.won, score);

    // Track the verse — completing Who Am I? means engaging with the verse directly
    if (ded.puzzle && ded.puzzle.verse) {
        trackVerses([ded.puzzle.verse]);
    }
}
