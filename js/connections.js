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
        conn.correctCount = saved.correctCount ?? conn.solved.length;
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
        // Long-press: show tooltip + speak Arabic (mobile)
        let holdTimer;
        tile.addEventListener('touchstart', () => {
            holdTimer = setTimeout(() => {
                if (tip) showToast(tip, 1500);
                speakArabic(getConnItemDisplay(item));
            }, 500);
        }, { passive: true });
        tile.addEventListener('touchend', () => clearTimeout(holdTimer));
        tile.addEventListener('touchmove', () => clearTimeout(holdTimer));
        // Right-click / long-press on desktop: speak Arabic
        tile.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            speakArabic(getConnItemDisplay(item));
            if (tip) showToast(tip, 1500);
        });
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
        conn.solved.push({ name: match.name, nameEn: match.nameEn, items: match.items, color: match.color, verse: match.verse || null });
        const matchKeys = new Set(match.items.map(i => getConnItemKey(i)));
        conn.items = conn.items.filter(i => !matchKeys.has(getConnItemKey(i)));
        conn.selected = [];
        renderSolvedRows();
        renderConnections();
        announce(`Correct! Found group: ${match.nameEn || match.name}. ${conn.solved.length} of 4 groups found.`);

        if (conn.solved.length === 4) {
            conn.gameOver = true;
            conn.correctCount = 4;
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
            conn.correctCount = conn.solved.length; // Track how many were correctly guessed before reveal
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
    conn.solved.forEach((s, idx) => {
        const row = document.createElement('div');
        row.className = `conn-solved-row ${s.color}`;
        row.setAttribute('role', 'region');
        row.setAttribute('aria-label', s.nameEn || s.name);
        const catName = s.nameEn || s.name;

        // Look up full item data from puzzle definition (with per-word verses)
        let items = s.items;
        if (!items[0]?.verse) {
            for (const p of PUZZLES.connections) {
                const cat = p.categories.find(c => (c.nameEn || c.name) === (s.nameEn || s.name));
                if (cat) { items = cat.items; break; }
            }
        }

        const itemsText = items.map(i => typeof i === 'object' ? i.ar : i).join('\u060C ');

        // Build word pill indicators
        const pillsHTML = items.map((item, i) => {
            const ar = typeof item === 'object' ? item.ar : item;
            return `<button class="verse-pill${i === 0 ? ' active' : ''}" data-row="${idx}" data-word="${i}" aria-label="${ar}">${ar}</button>`;
        }).join('');

        // Build carousel slides
        const slidesHTML = items.map((item, i) => {
            const ar = typeof item === 'object' ? item.ar : item;
            const en = typeof item === 'object' ? item.en : '';
            const verse = typeof item === 'object' ? item.verse : '';
            const verseEn = typeof item === 'object' ? (item.verseEn || '') : '';
            const ref = typeof item === 'object' ? item.ref : '';
            return `<div class="verse-slide${i === 0 ? ' active' : ''}" data-index="${i}" data-ref="${ref}">
                <div class="verse-slide-word">${ar}</div>
                <div class="verse-slide-meaning">${en}</div>
                ${verse ? `<div class="verse-card" data-row="${idx}" data-word="${i}">
                    <div class="wbw-container" data-ref="${ref}">
                        <div class="verse-slide-ayah wbw-fallback">${verse}</div>
                        <div class="wbw-words" style="display:none;"></div>
                        <div class="wbw-loading" style="display:none;">Loading word-by-word...</div>
                    </div>
                    <div class="wbw-tooltip" style="display:none;"></div>
                    <div class="verse-slide-ref-row">
                        <button class="verse-play-btn" data-ref="${ref}" aria-label="Play recitation">&#9654;</button>
                        <span class="verse-slide-ref">— ${ref}</span>
                    </div>
                    <div class="verse-reveal-hint">Tap any word to see its meaning</div>
                </div>` : ''}
            </div>`;
        }).join('');

        row.innerHTML = `<div class="conn-solved-header" tabindex="0" role="button" aria-expanded="false" data-row="${idx}">
            <div class="conn-solved-category">${catName}</div>
            <span class="conn-expand-icon" aria-hidden="true">▼</span>
        </div>
        <div class="conn-solved-items conn-solved-items-ar">${itemsText}</div>
        <div class="verse-carousel" id="carousel-${idx}" aria-hidden="true">
            <div class="verse-pills">${pillsHTML}</div>
            <div class="verse-slides-container">
                <button class="verse-nav verse-nav-prev" data-row="${idx}" aria-label="Previous word">‹</button>
                <div class="verse-slides">${slidesHTML}</div>
                <button class="verse-nav verse-nav-next" data-row="${idx}" aria-label="Next word">›</button>
            </div>
            <div class="verse-dots">${items.map((_, i) => `<span class="verse-dot${i === 0 ? ' active' : ''}" data-row="${idx}" data-word="${i}"></span>`).join('')}</div>
        </div>`;

        container.appendChild(row);

        // Attach event listeners
        const header = row.querySelector('.conn-solved-header');
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCarousel(idx);
        });
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleCarousel(idx);
            }
        });

        // Nav buttons
        row.querySelector('.verse-nav-prev').addEventListener('click', (e) => {
            e.stopPropagation();
            navigateCarousel(idx, -1);
        });
        row.querySelector('.verse-nav-next').addEventListener('click', (e) => {
            e.stopPropagation();
            navigateCarousel(idx, 1);
        });

        // Pill clicks
        row.querySelectorAll('.verse-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.stopPropagation();
                const wordIdx = parseInt(pill.dataset.word);
                goToSlide(idx, wordIdx);
            });
        });

        // Play button clicks
        row.querySelectorAll('.verse-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ref = btn.dataset.ref;
                if (quranAudio.playing && btn.classList.contains('playing')) {
                    stopQuranAudio();
                } else {
                    playQuranAudio(ref, btn);
                }
            });
        });

        // Word-by-word: load data when carousel is first expanded
        row.querySelectorAll('.wbw-container').forEach(container => {
            // Store the tile word on the container for highlighting
            const slideEl = container.closest('.verse-slide');
            if (slideEl) {
                const tileWord = slideEl.querySelector('.verse-slide-word')?.textContent || '';
                container.dataset.tileWord = tileWord;
            }
            loadWBW(container);
        });

        // Dot clicks
        row.querySelectorAll('.verse-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const wordIdx = parseInt(dot.dataset.word);
                goToSlide(idx, wordIdx);
            });
        });

        // Touch swipe support
        setupSwipe(row.querySelector('.verse-slides'), idx, items.length);
    });
}

// Track current slide per row
const carouselState = {};

/**
 * Load word-by-word data for a verse container.
 * Fetches from Quran.com API, replaces the static verse text
 * with individually tappable Arabic words.
 */
async function loadWBW(container) {
    const ref = container.dataset.ref;
    if (!ref || container.dataset.wbwLoaded) return;

    const fallback = container.querySelector('.wbw-fallback');
    const wordsDiv = container.querySelector('.wbw-words');
    const loadingDiv = container.querySelector('.wbw-loading');
    const tooltip = container.parentElement.querySelector('.wbw-tooltip');

    // Show loading state
    loadingDiv.style.display = 'block';
    container.dataset.wbwLoaded = 'pending';

    const words = await fetchWordByWord(ref);

    loadingDiv.style.display = 'none';

    if (words && words.length > 0) {
        // Get the tile word to highlight it in the verse
        const tileWord = container.dataset.tileWord || '';
        const tileRoot = tileWord.replace(/[\u064B-\u065F\u0670]/g, ''); // strip diacritics

        // Build tappable word spans, marking the tile word
        wordsDiv.innerHTML = words.map((w, i) => {
            const wordRoot = w.arabic.replace(/[\u064B-\u065F\u0670]/g, '');
            const isMatch = tileRoot && (wordRoot.includes(tileRoot) || tileRoot.includes(wordRoot));
            return `<span class="wbw-word${isMatch ? ' wbw-highlight' : ''}" data-idx="${i}" data-translation="${w.translation.replace(/"/g, '&quot;')}">${w.arabic}</span>`;
        }).join(' ');
        wordsDiv.style.display = 'flex';
        fallback.style.display = 'none';
        container.dataset.wbwLoaded = 'true';

        // Attach tap handlers to each word
        wordsDiv.querySelectorAll('.wbw-word').forEach(wordEl => {
            wordEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const translation = wordEl.dataset.translation;
                // Remove active from all siblings
                wordsDiv.querySelectorAll('.wbw-word').forEach(w => w.classList.remove('wbw-active'));
                wordEl.classList.add('wbw-active');
                // Show tooltip
                tooltip.textContent = translation;
                tooltip.style.display = 'block';
                // Auto-hide after 3 seconds
                clearTimeout(tooltip._hideTimer);
                tooltip._hideTimer = setTimeout(() => {
                    tooltip.style.display = 'none';
                    wordEl.classList.remove('wbw-active');
                }, 3000);
            });
        });
    } else {
        // API failed — keep the static verse text as fallback
        container.dataset.wbwLoaded = 'fallback';
    }
}

function toggleCarousel(idx) {
    const carousel = document.getElementById(`carousel-${idx}`);
    if (!carousel) return;
    const header = carousel.parentElement.querySelector('.conn-solved-header');
    const isExpanded = header.getAttribute('aria-expanded') === 'true';
    header.setAttribute('aria-expanded', String(!isExpanded));
    carousel.setAttribute('aria-hidden', String(isExpanded));
    carousel.classList.toggle('expanded');
    header.querySelector('.conn-expand-icon').textContent = isExpanded ? '▼' : '▲';

    if (isExpanded) {
        // Collapsing — stop any playing audio
        stopQuranAudio();
    } else {
        // Expanding — autoplay the recitation for the active slide on first open
        if (!carousel.dataset.autoPlayed) {
            carousel.dataset.autoPlayed = 'true';
            const activeSlide = carousel.querySelector('.verse-slide.active');
            if (activeSlide) {
                const playBtn = activeSlide.querySelector('.verse-play-btn');
                if (playBtn) {
                    const ref = playBtn.dataset.ref;
                    setTimeout(() => playQuranAudio(ref, playBtn), 300);
                }
            }
        }
    }
}

function goToSlide(rowIdx, slideIdx) {
    const carousel = document.getElementById(`carousel-${rowIdx}`);
    if (!carousel) return;

    carouselState[rowIdx] = slideIdx;

    // Update slides
    carousel.querySelectorAll('.verse-slide').forEach((slide, i) => {
        slide.classList.toggle('active', i === slideIdx);
    });

    // Update pills
    carousel.querySelectorAll('.verse-pill').forEach((pill, i) => {
        pill.classList.toggle('active', i === slideIdx);
    });

    // Update dots
    carousel.querySelectorAll('.verse-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === slideIdx);
    });

    // Stop any playing audio when switching slides
    stopQuranAudio();
}

function navigateCarousel(rowIdx, direction) {
    const carousel = document.getElementById(`carousel-${rowIdx}`);
    if (!carousel) return;
    const slides = carousel.querySelectorAll('.verse-slide');
    const current = carouselState[rowIdx] || 0;
    const next = (current + direction + slides.length) % slides.length;
    goToSlide(rowIdx, next);
}

function setupSwipe(container, rowIdx, totalSlides) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;

    container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = startX - endX;
        const diffY = Math.abs(startY - endY);

        // Only register horizontal swipes (not vertical scrolling)
        if (Math.abs(diffX) > 40 && diffY < 80) {
            if (diffX > 0) {
                // Swipe left -> next (RTL: previous word)
                navigateCarousel(rowIdx, 1);
            } else {
                // Swipe right -> prev (RTL: next word)
                navigateCarousel(rowIdx, -1);
            }
        }
    }, { passive: true });
}

function revealAllConnections() {
    conn.puzzle.categories.forEach(cat => {
        if (!conn.solved.some(s => s.name === cat.name)) {
            conn.solved.push({ name: cat.name, nameEn: cat.nameEn, items: cat.items, color: cat.color, verse: cat.verse || null });
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
        gameOver: conn.gameOver,
        correctCount: conn.correctCount ?? conn.solved.length
    };
    saveState(app.state);
}

function showConnResult(won, cacheOnly) {
    const colorMap = { yellow: '🟨', green: '🟩', blue: '🟦', purple: '🟪' };

    // Only show groups the player actually guessed correctly (not auto-revealed ones)
    const correctCount = won ? 4 : (conn.correctCount ?? 0);
    let emojiGrid = '';
    conn.solved.forEach((s, i) => {
        if (i < correctCount) {
            emojiGrid += colorMap[s.color].repeat(4) + '\n';
        } else {
            // Auto-revealed groups shown as grey/missed
            emojiGrid += '⬛⬛⬛⬛\n';
        }
    });

    const mistakesUsed = 4 - conn.mistakes;
    const puzzleNum = getPuzzleIndex(PUZZLES.connections) + 1;

    const shareText = `QuranPuzzle - Connections #${puzzleNum}\n${emojiGrid}Groups found: ${correctCount}/4\nMistakes: ${mistakesUsed}/4\n\nhttps://sudosar.github.io/quranpuzz/`;

    const resultData = {
        icon: won ? '🎉' : '📖',
        title: won ? 'Excellent!' : 'Keep Learning!',
        verse: null,
        arabic: null,
        translation: won ? '"And We have certainly made the Quran easy for remembrance" - 54:17' : '"So verily, with hardship, there is relief" - 94:5',
        emojiGrid: emojiGrid.trim(),
        statsText: `Groups found: ${correctCount}/4 | Mistakes: ${mistakesUsed}/4`,
        shareText
    };

    if (cacheOnly) {
        // Just cache the result and show the button, don't open the modal
        app.lastResults['connections'] = resultData;
        showViewResultsButton('connections');
        return;
    }

    showResultModal(resultData);
    updateModeStats('connections', won, won ? (4 - mistakesUsed) : 0);
}
