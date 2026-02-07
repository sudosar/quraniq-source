/* ============================================
   QURANPUZZLE - CONNECTIONS GAME
   ============================================ */

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
    const solvedKeys = new Set(conn.solved.flatMap(s => s.items.map(i => getConnItemKey(i))));
    conn.items = shuffle(
        conn.puzzle.categories.flatMap(c => c.items).filter(i => !solvedKeys.has(getConnItemKey(i)))
    );

    renderConnections();
    renderSolvedRows();
    updateMistakes();

    document.getElementById('conn-shuffle').addEventListener('click', () => {
        conn.items = shuffle(conn.items);
        conn.selected = [];
        renderConnections();
        announce('Tiles shuffled');
    });

    document.getElementById('conn-deselect').addEventListener('click', () => {
        conn.selected = [];
        renderConnections();
        announce('All tiles deselected');
    });

    document.getElementById('conn-submit').addEventListener('click', submitConnections);

    if (conn.gameOver) {
        revealAllConnections();
    }
}

function getConnItemKey(item) {
    return typeof item === 'object' ? item.ar : item;
}

function getConnItemDisplay(item) {
    return typeof item === 'object' ? item.ar : item;
}

function getConnItemTooltip(item) {
    return typeof item === 'object' ? item.en : '';
}

function renderConnections() {
    const grid = document.getElementById('connections-grid');
    grid.innerHTML = '';
    conn.items.forEach((item, idx) => {
        const key = getConnItemKey(item);
        const tile = document.createElement('button');
        const isSelected = conn.selected.some(i => getConnItemKey(i) === key);
        tile.className = 'conn-tile conn-tile-ar' + (isSelected ? ' selected' : '');
        tile.textContent = getConnItemDisplay(item);
        const tip = getConnItemTooltip(item);
        if (tip) {
            tile.setAttribute('data-tooltip', tip);
            tile.setAttribute('aria-label', `${getConnItemDisplay(item)} (${tip})`);
        }
        tile.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        tile.disabled = conn.gameOver;
        tile.addEventListener('click', () => toggleConnTile(item));
        // Long-press tooltip for mobile
        let holdTimer;
        tile.addEventListener('touchstart', () => {
            holdTimer = setTimeout(() => {
                if (tip) showToast(tip, 1500);
            }, 500);
        }, { passive: true });
        tile.addEventListener('touchend', () => clearTimeout(holdTimer));
        tile.addEventListener('touchmove', () => clearTimeout(holdTimer));
        grid.appendChild(tile);
    });
    document.getElementById('conn-submit').disabled = conn.selected.length !== 4;
}

function toggleConnTile(item) {
    if (conn.gameOver) return;
    const idx = conn.selected.findIndex(i => getConnItemKey(i) === getConnItemKey(item));
    if (idx >= 0) {
        conn.selected.splice(idx, 1);
    } else if (conn.selected.length < 4) {
        conn.selected.push(item);
    }
    renderConnections();
    announce(`${conn.selected.length} of 4 selected`);
}

function updateMistakes() {
    const dots = document.getElementById('mistakes-dots');
    dots.textContent = '●'.repeat(conn.mistakes) + '○'.repeat(4 - conn.mistakes);
    dots.setAttribute('aria-label', `${conn.mistakes} mistakes remaining`);
}

function submitConnections() {
    if (conn.selected.length !== 4 || conn.gameOver) return;

    // Check if selection matches any unsolved category
    const selectedKeys = new Set(conn.selected.map(i => getConnItemKey(i)));
    const match = conn.puzzle.categories.find(cat =>
        !conn.solved.some(s => s.name === cat.name) &&
        cat.items.every(i => selectedKeys.has(getConnItemKey(i))) &&
        cat.items.length === conn.selected.length
    );

    if (match) {
        // Correct!
        conn.solved.push({ name: match.name, nameEn: match.nameEn, items: match.items, color: match.color });
        const matchKeys = new Set(match.items.map(i => getConnItemKey(i)));
        conn.items = conn.items.filter(i => !matchKeys.has(getConnItemKey(i)));
        conn.selected = [];
        renderSolvedRows();
        renderConnections();
        announce(`Correct! Found group: ${match.nameEn || match.name}. ${conn.solved.length} of 4 groups found.`);

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
                const catKeys = new Set(cat.items.map(i => getConnItemKey(i)));
                const overlap = conn.selected.filter(i => catKeys.has(getConnItemKey(i))).length;
                if (overlap === 3) oneAway = true;
            }
        });

        if (oneAway) {
            showToast('One away!');
            announce('One away! 3 of 4 items are from the same group.');
        } else {
            announce('Incorrect guess.');
        }

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
        row.setAttribute('role', 'status');
        const catName = s.nameEn || s.name;
        const itemsText = s.items.map(i => typeof i === 'object' ? i.ar : i).join('، ');
        row.innerHTML = `<div class="conn-solved-category">${catName}</div><div class="conn-solved-items conn-solved-items-ar">${itemsText}</div>`;
        container.appendChild(row);
    });
}

function revealAllConnections() {
    conn.puzzle.categories.forEach(cat => {
        if (!conn.solved.some(s => s.name === cat.name)) {
            conn.solved.push({ name: cat.name, nameEn: cat.nameEn, items: cat.items, color: cat.color });
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

    // Build emoji grid based on solve order
    let emojiGrid = '';
    conn.solved.forEach(s => {
        emojiGrid += colorMap[s.color].repeat(4) + '\n';
    });

    const mistakesUsed = 4 - conn.mistakes;
    const puzzleNum = getPuzzleIndex(PUZZLES.connections) + 1;

    const shareText = `QuranPuzzle - Connections #${puzzleNum}\n${emojiGrid}Mistakes: ${mistakesUsed}/4\n\nhttps://sudosar.github.io/quranpuzz/`;

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

    updateModeStats('connections', won, won ? (4 - mistakesUsed) : 0);
}
