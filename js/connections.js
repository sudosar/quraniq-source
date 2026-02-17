/* ============================================
   QURANIQ - CONNECTIONS GAME
   ============================================ */

/* Convert a Quranic reference like "7:26" or "18:95-96" to a quran.com URL */
function refToQuranLink(ref) {
    if (!ref) return '#';
    // Handle range refs like "18:95-96" → link to first verse "18:95"
    // Handle multi-verse refs like "112:1-4" → link to first verse "112:1"
    const match = ref.match(/(\d+):(\d+)/);
    if (match) {
        return `https://quran.com/${match[1]}/${match[2]}`;
    }
    // Fallback: just the surah number
    const surahMatch = ref.match(/(\d+)/);
    if (surahMatch) {
        return `https://quran.com/${surahMatch[1]}`;
    }
    return '#';
}

const conn = {
    puzzle: null,
    selected: [],
    solved: [],
    mistakes: 4,
    items: [],
    gameOver: false,
    exploredVerses: new Set(),  // Track verse refs explored this session (audio play or word tap)
    submittedGuesses: new Set(), // Track submitted wrong combinations (sorted keys joined by |)
    categoriesWithMistakes: new Set() // Track categories that were part of a wrong guess
};

function initConnections() {
    // Load daily puzzle with holding screen if not ready
    loadDailyWithHolding(
        'daily_puzzle.json',
        'connections-game',
        'Ayah Connections',
        (puzzle, stale) => {
            conn.puzzle = puzzle;
            conn.puzzleSource = stale ? 'stale' : 'daily';
            setupConnectionsGame();
        },
        (data) => ({ id: 'daily', categories: data.puzzle.categories })
    );
}

/**
 * Fetch today's daily puzzle with smart retry logic.
 * During the generation window (first 4 hours of the day UTC),
 * retries up to 3 times with increasing delays before falling back.
 * Outside the window, falls back immediately if stale.
 */
async function loadDailyPuzzleWithRetry() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    // Generation window: 00:00–04:00 UTC (workflow runs at ~00:05, deploys by ~00:10)
    const inGenerationWindow = utcHour < 4;
    const maxRetries = inGenerationWindow ? 3 : 0;
    const retryDelays = [15000, 30000, 60000]; // 15s, 30s, 60s

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const puzzle = await loadDailyPuzzle();
            return puzzle;
        } catch (e) {
            if (attempt < maxRetries) {
                // Wait before retrying
                await new Promise(r => setTimeout(r, retryDelays[attempt]));
            }
        }
    }
    throw new Error('Daily puzzle not available after retries');
}

async function loadDailyPuzzle() {
    const today = new Date().toISOString().slice(0, 10);
    const resp = await fetch(`data/daily_puzzle.json?t=${Date.now()}`);
    if (!resp.ok) throw new Error('No daily puzzle');
    const data = await resp.json();
    if (!data.generated || !data.puzzle || data.date !== today) {
        throw new Error('Daily puzzle not available or stale');
    }
    return { id: 'daily', categories: data.puzzle.categories };
}

function setupConnectionsGame() {
    // Check saved state — validate it matches the current puzzle
    const saved = app.state[`conn_${app.dayNumber}`];
    let stateValid = false;
    if (saved && saved.solved && saved.solved.length > 0) {
        // Verify saved groups belong to the current puzzle by checking category names
        const puzzleCatNames = new Set(conn.puzzle.categories.map(c => c.nameEn || c.name));
        stateValid = saved.solved.every(s => puzzleCatNames.has(s.nameEn || s.name));
    } else if (saved) {
        // No solved groups yet — state is valid (fresh game with saved mistakes etc.)
        stateValid = true;
    }

    if (saved && stateValid) {
        conn.solved = saved.solved || [];
        conn.mistakes = saved.mistakes ?? 4;
        conn.gameOver = saved.gameOver || false;
        conn.correctCount = saved.correctCount ?? conn.solved.length;
        conn.correctCount = saved.correctCount ?? conn.solved.length;
        conn.exploredVerses = new Set(saved.exploredVerses || []);
        conn.submittedGuesses = new Set(saved.submittedGuesses || []);
        conn.categoriesWithMistakes = new Set(saved.categoriesWithMistakes || []);
    } else {
        // Clear stale state from a different puzzle
        if (saved && !stateValid) {
            delete app.state[`conn_${app.dayNumber}`];
            saveState(app.state);
        }
        conn.solved = [];
        conn.mistakes = 4;
        conn.gameOver = false;
        conn.correctCount = 0;
        conn.correctCount = 0;
        conn.exploredVerses = new Set();
        conn.submittedGuesses = new Set();
        conn.categoriesWithMistakes = new Set();
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
        // Restore the View Results button for completed games
        const won = conn.solved.length === 4 && (4 - conn.mistakes) < 4;
        showConnResult(won, true);
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
                speakArabic(getConnItemDisplay(item), item.ref);
            }, 500);
        }, { passive: true });
        tile.addEventListener('touchend', () => clearTimeout(holdTimer));
        tile.addEventListener('touchmove', () => clearTimeout(holdTimer));
        // Right-click / long-press on desktop: speak Arabic
        tile.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            speakArabic(getConnItemDisplay(item), item.ref);
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

    // Sort selected keys to create a unique signature for this combination
    const selectedKeys = conn.selected.map(i => getConnItemKey(i)).sort();
    const guessKey = selectedKeys.join('|');

    if (conn.submittedGuesses.has(guessKey)) {
        showToast('Already guessed!');

        // Shake animation to indicate rejection
        document.querySelectorAll('.conn-tile.selected').forEach(t => {
            t.classList.add('shake');
            setTimeout(() => t.classList.remove('shake'), 500);
        });
        return;
    }

    // Check if selection matches any unsolved category
    const selectedKeysSet = new Set(selectedKeys);
    const match = conn.puzzle.categories.find(cat =>
        !conn.solved.some(s => s.name === cat.name) &&
        cat.items.every(i => selectedKeysSet.has(getConnItemKey(i))) &&
        cat.items.length === conn.selected.length
    );

    if (match) {
        // Correct!
        trackConnGuess(true, match.nameEn || match.name);
        conn.solved.push({ name: match.name, nameEn: match.nameEn, items: match.items, color: match.color, verse: match.verse || null });
        const matchKeys = new Set(match.items.map(i => getConnItemKey(i)));
        conn.items = conn.items.filter(i => !matchKeys.has(getConnItemKey(i)));
        conn.selected = [];
        renderSolvedRows();
        renderConnections();
        announce(`Correct! Found group: ${match.nameEn || match.name}. ${conn.solved.length} of 4 groups found.`);

        // Auto-expand the just-solved row and play the verse
        const solvedIdx = conn.solved.length - 1;
        const isLastRow = conn.solved.length === 4;
        setTimeout(() => {
            toggleCarousel(solvedIdx);
        }, 500);

        if (isLastRow) {
            conn.gameOver = true;
            conn.correctCount = 4;
            saveConnState();
            // Delay result modal so player can hear the last verse
            setTimeout(() => showConnResult(true), 6000);
        }
    } else {
        // Wrong guess - track it
        conn.submittedGuesses.add(guessKey);

        // Check for one-away and track mistakes for all categories involved
        let oneAway = false;
        const currentSelectedKeys = new Set(conn.selected.map(i => getConnItemKey(i)));

        conn.puzzle.categories.forEach(cat => {
            if (!conn.solved.some(s => s.name === cat.name)) {
                const catKeys = new Set(cat.items.map(i => getConnItemKey(i)));
                const overlap = conn.selected.filter(i => catKeys.has(getConnItemKey(i))).length;

                if (overlap > 0) {
                    // If even one item from this category was in a wrong guess, it's a "mistaken" category
                    conn.categoriesWithMistakes.add(cat.nameEn || cat.name);
                }

                if (overlap === 3) oneAway = true;
            }
        });

        if (oneAway) {
            showToast('One away!');
            announce('One away! 3 of 4 items are from the same group.');
        } else {
            announce('Incorrect guess.');
        }

        trackConnGuess(false, null);
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
            // First try to recover from the current daily puzzle (self-healing)
            if (conn.puzzle && conn.puzzle.categories) {
                const dailyCat = conn.puzzle.categories.find(c => (c.nameEn || c.name) === (s.nameEn || s.name));
                if (dailyCat && dailyCat.items && dailyCat.items[0]?.verse) {
                    items = dailyCat.items;
                    // Auto-heal the stored state for next time
                    s.items = items;
                    if (dailyCat.verse) s.verse = dailyCat.verse;
                    saveConnState();
                }
            }

            // Fallback to static puzzles if still missing
            if (!items[0]?.verse) {
                for (const p of PUZZLES.connections) {
                    const cat = p.categories.find(c => (c.nameEn || c.name) === (s.nameEn || s.name));
                    if (cat) { items = cat.items; break; }
                }
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
            const enRaw = typeof item === 'object' ? item.en : '';
            const verse = typeof item === 'object' ? item.verse : '';
            const verseEn = typeof item === 'object' ? (item.verseEn || '') : '';
            const ref = typeof item === 'object' ? item.ref : '';
            // Strip any embedded ref like "(7:26)" from en text since we add it separately
            const en = enRaw.replace(/\s*\(\d+:\d+(?:-\d+)?\)\s*$/, '').trim();
            const refLink = refToQuranLink(ref);
            const refHTML = ref ? `<a href="${refLink}" class="verse-ref-link" target="_blank" rel="noopener noreferrer">(${ref})</a>` : '';
            return `<div class="verse-slide${i === 0 ? ' active' : ''}" data-index="${i}" data-ref="${ref}">
                <div class="verse-slide-word">${ar}</div>
                <div class="verse-slide-meaning">${en} ${refHTML}</div>
                ${verse ? `<div class="verse-card" data-row="${idx}" data-word="${i}">
                    <div class="wbw-container" data-ref="${ref}">
                        <div class="verse-slide-ayah wbw-fallback">${verse}</div>
                        <div class="wbw-words" style="display:none;"></div>
                        <div class="wbw-loading" style="display:none;">Loading word-by-word...</div>
                    </div>
                    <div class="wbw-tooltip" style="display:none;"></div>
                    <div class="verse-slide-ref-row">
                        <button class="verse-play-btn" data-ref="${ref}" aria-label="Play recitation">&#9654;</button>
                    </div>
                    <div class="verse-reveal-hint">TAP ANY WORD TO SEE ITS MEANING</div>
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
                    // Track this verse as explored in this session
                    if (ref) {
                        conn.exploredVerses.add(ref);
                        saveConnState();
                    }
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
        const tileNorm = normalizeForMatch(tileWord);
        const tileWords = tileWord.split(/\s+/).map(w => normalizeForMatch(w));
        const tileRoots = tileWords.map(w => stripSuffixes(stripPrefixes(w)));

        // Build tappable word spans, marking the tile word
        wordsDiv.innerHTML = words.map((w, i) => {
            const wordNorm = normalizeForMatch(w.arabic);
            const wordRoot = stripSuffixes(stripPrefixes(wordNorm));

            // Check if this WBW word matches any part of the tile word
            let isMatch = false;
            if (tileNorm) {
                // Direct normalized match
                if (wordNorm === tileNorm) isMatch = true;
                // Root-to-root match (stripped of prefixes and suffixes)
                if (!isMatch && wordRoot.length >= 2) {
                    const tileFullRoot = stripSuffixes(stripPrefixes(tileNorm));
                    if (tileFullRoot.length >= 2 && wordRoot === tileFullRoot) isMatch = true;
                }
                // Check each tile word individually (for multi-word tiles like "ناقة صالح")
                if (!isMatch && wordRoot.length >= 2) {
                    for (const tr of tileRoots) {
                        if (tr.length >= 2 && wordRoot === tr) {
                            isMatch = true;
                            break;
                        }
                    }
                }
                // Substring/startsWith match — only if both roots are 3+ chars
                if (!isMatch && wordRoot.length >= 3) {
                    for (const tr of tileRoots) {
                        if (tr.length >= 3 && (wordRoot.startsWith(tr) || tr.startsWith(wordRoot))) {
                            isMatch = true;
                            break;
                        }
                    }
                }
                // Deep normalize fallback: remove all hamza carriers and compare
                if (!isMatch) {
                    const wordDeep = deepNormalize(wordRoot);
                    for (const tr of tileRoots) {
                        const tileDeep = deepNormalize(tr);
                        if (tileDeep.length >= 2 && wordDeep.length >= 2 &&
                            (wordDeep === tileDeep || wordDeep.startsWith(tileDeep) || tileDeep.startsWith(wordDeep))) {
                            isMatch = true;
                            break;
                        }
                    }
                    // Also try full normalized forms
                    if (!isMatch) {
                        const tileDeepFull = deepNormalize(stripPrefixes(tileNorm));
                        const wordDeepFull = deepNormalize(stripPrefixes(wordNorm));
                        if (tileDeepFull.length >= 2 && wordDeepFull.length >= 2 &&
                            (wordDeepFull === tileDeepFull || wordDeepFull.startsWith(tileDeepFull) || tileDeepFull.startsWith(wordDeepFull))) {
                            isMatch = true;
                        }
                    }
                }
            }
            // Handle verse separator marker
            if (w.isSeparator) {
                return `<span class="wbw-separator" data-idx="${i}" data-translation="${w.translation.replace(/"/g, '&quot;')}"><span class="wbw-ar">${w.arabic}</span></span>`;
            }
            return `<span class="wbw-word${isMatch ? ' wbw-highlight' : ''}" data-idx="${i}" data-translation="${w.translation.replace(/"/g, '&quot;')}"><span class="wbw-en"></span><span class="wbw-ar">${w.arabic}</span></span>`;
        }).join(' ');
        wordsDiv.style.display = 'flex';
        fallback.style.display = 'none';
        container.dataset.wbwLoaded = 'true';

        // Attach tap handlers to each word — toggle English above the tapped word
        wordsDiv.querySelectorAll('.wbw-word').forEach(wordEl => {
            wordEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const translation = wordEl.dataset.translation;
                const enEl = wordEl.querySelector('.wbw-en');
                const wasActive = wordEl.classList.contains('wbw-active');
                if (wasActive) {
                    // Toggle off this word
                    wordEl.classList.remove('wbw-active');
                    if (enEl) { enEl.textContent = ''; enEl.style.display = 'none'; }
                } else {
                    // Toggle on — English stays visible until row is collapsed
                    wordEl.classList.add('wbw-active');
                    if (enEl) {
                        enEl.textContent = translation;
                        enEl.style.display = 'block';
                    }
                    // Track this verse as explored (user engaged with word meaning)
                    const wbwContainer = wordEl.closest('.wbw-container');
                    if (wbwContainer && wbwContainer.dataset.ref) {
                        trackVerses([wbwContainer.dataset.ref]);
                        conn.exploredVerses.add(wbwContainer.dataset.ref);
                        saveConnState();
                    }
                }
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
        // Collapsing — stop any playing audio and reset all visible English translations
        stopQuranAudio();
        carousel.querySelectorAll('.wbw-word.wbw-active').forEach(w => {
            w.classList.remove('wbw-active');
            const en = w.querySelector('.wbw-en');
            if (en) { en.textContent = ''; en.style.display = 'none'; }
        });
    } else {
        // Expanding — autoplay the recitation for the active slide
        const activeSlide = carousel.querySelector('.verse-slide.active');
        if (activeSlide) {
            const playBtn = activeSlide.querySelector('.verse-play-btn');
            if (playBtn) {
                const ref = playBtn.dataset.ref;
                setTimeout(() => playQuranAudio(ref, playBtn), 300);
                // Track this verse as explored in this session
                if (ref) {
                    conn.exploredVerses.add(ref);
                    saveConnState();
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

    // Load WBW data for the new slide if not already loaded
    const activeSlide = carousel.querySelectorAll('.verse-slide')[slideIdx];
    if (activeSlide) {
        const wbwContainer = activeSlide.querySelector('.wbw-container');
        if (wbwContainer && !wbwContainer.dataset.wbwLoaded) {
            loadWBW(wbwContainer);
        }

        // Autoplay the new slide's verse recitation (with delay for smooth transition)
        const playBtn = activeSlide.querySelector('.verse-play-btn');
        if (playBtn) {
            const ref = playBtn.dataset.ref;
            setTimeout(() => playQuranAudio(ref, playBtn), 300);
            // Track this verse as explored in this session
            if (ref) {
                conn.exploredVerses.add(ref);
                saveConnState();
            }
        }
    }

    // Hide any visible WBW tooltip from previous slide
    carousel.querySelectorAll('.wbw-word.wbw-active').forEach(w => {
        w.classList.remove('wbw-active');
        const en = w.querySelector('.wbw-en');
        if (en) { en.textContent = ''; en.style.display = 'none'; }
    });
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
        correctCount: conn.correctCount ?? conn.solved.length,
        exploredVerses: Array.from(conn.exploredVerses),
        submittedGuesses: Array.from(conn.submittedGuesses),
        categoriesWithMistakes: Array.from(conn.categoriesWithMistakes),
        puzzleSource: conn.puzzleSource || 'unknown'
    };
    saveState(app.state);

    // Update cached result data and sync to Firebase if game is over
    if (conn.gameOver && app.lastResults['connections']) {
        const { crescentRow, totalExplored, totalVerses } = getConnCrescentData();
        const res = app.lastResults['connections'];

        // Refresh cache so "View Results" modal is always current
        res.crescentRow = crescentRow;
        res.exploredCount = totalExplored;
        res.totalVerses = totalVerses;
        res.shareText = getConnShareText(); // Update share text template

        // Re-calculate moons for Firebase (count of all solved groups: 🌕 or 🌙)
        if (typeof submitFirebaseScore === 'function') {
            const fbMoons = (crescentRow.match(/[🌕🌙]/g) || []).length;
            submitFirebaseScore('connections', fbMoons).catch(() => { });
        }
    }
}

/**
 * Compute crescent data for each row based on current exploration state.
 * Returns { crescentRow, totalExplored, totalVerses, perRow[] }
 *
 * Per-row crescent logic:
 *   🌕 Full Moon  = row solved correctly AND all 4 verses in that row explored
 *   🌙 Crescent   = row solved correctly (not all verses explored)
 *   🌑 Dark Moon  = row was auto-revealed (failed)
 */
function getConnCrescentData() {
    const correctCount = conn.solved.length === 4 && conn.mistakes > 0 ? 4 : (conn.correctCount ?? 0);
    const explored = conn.exploredVerses;
    let totalExplored = 0;
    let totalVerses = 0;
    const perRow = [];

    conn.solved.forEach((s, i) => {
        const wasSolved = i < correctCount;
        // Use unique refs per row (some rows share the same verse for all items)
        const items = s.items || [];
        const uniqueRefs = new Set();
        items.forEach(item => {
            const ref = typeof item === 'object' ? item.ref : '';
            if (ref) uniqueRefs.add(ref);
        });
        const rowTotal = uniqueRefs.size || items.length;
        let rowExplored = 0;
        uniqueRefs.forEach(ref => {
            if (explored.has(ref)) rowExplored++;
        });
        totalVerses += rowTotal;
        totalExplored += rowExplored;

        let crescent;
        if (!wasSolved) {
            crescent = '🌑'; // Failed / auto-revealed
        } else if (rowExplored >= rowTotal) {
            const catName = s.nameEn || s.name;
            const hadMistake = conn.categoriesWithMistakes.has(catName);
            crescent = hadMistake ? '🌗' : '🌕'; // Half Moon if mistake + all explored, else Full Moon
        } else {
            crescent = '🌙'; // Solved but not all explored (Crescent)
        }
        perRow.push({ crescent, explored: rowExplored, total: rowTotal, wasSolved });
    });

    const crescentRow = perRow.map(r => r.crescent).join('');
    return { crescentRow, totalExplored, totalVerses, perRow };
}

/**
 * Generate share text dynamically based on current exploration state.
 * Called at the moment the user taps Share/Copy, not at result time.
 */
function getConnShareText() {
    const colorMap = { yellow: '🟨', green: '🟩', blue: '🟦', purple: '🟪' };
    const correctCount = conn.solved.length === 4 && conn.mistakes > 0 ? 4 : (conn.correctCount ?? 0);
    const mistakesUsed = 4 - conn.mistakes;
    const puzzleNum = getPuzzleNumber();

    let emojiGrid = '';
    conn.solved.forEach((s, i) => {
        if (i < correctCount) {
            emojiGrid += colorMap[s.color].repeat(4) + '\n';
        } else {
            emojiGrid += '⬛⬛⬛⬛\n';
        }
    });

    const { crescentRow, totalExplored, totalVerses } = getConnCrescentData();

    return `QuranIQ - Connections #${puzzleNum}\n${emojiGrid.trim()}\n${crescentRow}\nVerses explored: ${totalExplored}/${totalVerses}\nGroups: ${correctCount}/4 | Mistakes: ${mistakesUsed}/4\n\nhttps://sudosar.github.io/quraniq/`;
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
            emojiGrid += '⬛⬛⬛⬛\n';
        }
    });

    const mistakesUsed = 4 - conn.mistakes;

    // Compute current crescent state
    const { crescentRow, totalExplored, totalVerses } = getConnCrescentData();

    const resultData = {
        icon: won ? '🎉' : '📖',
        title: won ? 'Excellent!' : 'Keep Learning!',
        verse: null,
        arabic: null,
        translation: null,
        emojiGrid: emojiGrid.trim(),
        moons: null, // We use crescentRow instead of old moon system for connections
        crescentRow,
        exploredCount: totalExplored,
        totalVerses,
        statsText: `Groups: ${correctCount}/4 | Mistakes: ${mistakesUsed}/4`,
        shareText: getConnShareText(), // Initial share text (will be regenerated at share time)
        dynamicShareFn: getConnShareText // Function to get fresh share text at share time
    };

    if (cacheOnly) {
        // Just cache the result and show the button, don't open the modal
        app.lastResults['connections'] = resultData;
        showViewResultsButton('connections');
        return;
    }

    // First time: show encouragement modal (no share buttons)
    showConnEncouragementModal(resultData, won, correctCount, mistakesUsed);
    trackGameComplete('connections', won, correctCount);
    updateModeStats('connections', won, won ? (4 - mistakesUsed) : 0);
}

/**
 * Show the encouragement modal after game ends.
 * This modal has no share/copy buttons — it encourages the user to explore verses.
 * After closing, all rows expand for exploration.
 * The "View Results & Share" button will show the full result with dynamic crescents.
 */
function showConnEncouragementModal(resultData, won, correctCount, mistakesUsed) {
    // Cache the result for later "View Results & Share"
    app.lastResults['connections'] = resultData;
    showViewResultsButton('connections');

    document.getElementById('result-icon').textContent = resultData.icon;
    document.getElementById('result-title').textContent = resultData.title;

    // Show explore prompt
    const verseEl = document.getElementById('result-verse');
    verseEl.style.display = 'block';
    verseEl.innerHTML = `<span class="translation conn-explore-tap" style="cursor:pointer;">
        <span style="font-size:1.1rem;font-style:normal;">📖 Explore the ayahs to earn full moons!</span><br>
        <span style="font-size:0.85rem;color:var(--text-secondary);">🌙 = solved &nbsp; 🌕 = solved + all 4 verses explored &nbsp; 🌑 = missed</span><br>
        <span style="font-size:0.9rem;margin-top:8px;display:inline-block;">Tap to start exploring ▼</span>
    </span>`;
    verseEl.querySelector('.conn-explore-tap').addEventListener('click', () => {
        trackExplorePromptTap();
        closeModal('result-modal');
        setTimeout(() => expandAllConnRows(), 300);
    });

    document.getElementById('result-grid').textContent = resultData.emojiGrid;

    // Show current crescents (will be mostly 🌙/🌑 at this point)
    const moonsEl = document.getElementById('result-stars');
    moonsEl.innerHTML = resultData.crescentRow;
    moonsEl.style.display = 'block';

    document.getElementById('result-stats').textContent = `Groups: ${correctCount}/4 | Mistakes: ${mistakesUsed}/4`;

    // Hide share buttons in encouragement modal
    const actionsEl = document.querySelector('#result-modal .result-actions');
    if (actionsEl) actionsEl.style.display = 'none';

    // Hide audio row
    document.getElementById('result-audio').style.display = 'none';

    openModal('result-modal');
}

// Expand all solved rows and autoplay first verse (called when closing result modal)
function expandAllConnRows() {
    conn.solved.forEach((_, idx) => {
        const carousel = document.getElementById(`carousel-${idx}`);
        if (carousel && !carousel.classList.contains('expanded')) {
            // Only toggleCarousel for first row triggers autoplay via its built-in logic
            // For others, just expand without autoplay to avoid audio overlap
            if (idx === 0) {
                toggleCarousel(idx);
            } else {
                const header = carousel.parentElement.querySelector('.conn-solved-header');
                header.setAttribute('aria-expanded', 'true');
                carousel.setAttribute('aria-hidden', 'false');
                carousel.classList.add('expanded');
                header.querySelector('.conn-expand-icon').textContent = '\u25B2';
            }
        }
    });
}

// Get the first verse ref from the puzzle for playback on result modal
function getFirstConnVerseRef() {
    if (!conn.puzzle || !conn.puzzle.categories) return null;
    for (const cat of conn.puzzle.categories) {
        if (cat.items) {
            for (const item of cat.items) {
                if (item.ref) return item.ref;
            }
        }
    }
    return null;
}
