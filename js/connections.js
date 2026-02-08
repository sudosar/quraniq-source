/* ============================================
   QURANPUZZLE - CONNECTIONS GAME
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
    gameOver: false
};

function initConnections() {
    // Try to load AI-generated daily puzzle, fall back to pre-made puzzles
    loadDailyPuzzle().then(puzzle => {
        conn.puzzle = puzzle;
        setupConnectionsGame();
    }).catch(() => {
        // Fallback to pre-made puzzles
        const idx = getPuzzleIndex(PUZZLES.connections);
        conn.puzzle = PUZZLES.connections[idx];
        setupConnectionsGame();
    });
}

async function loadDailyPuzzle() {
    const today = new Date().toISOString().slice(0, 10);
    const resp = await fetch(`data/daily_puzzle.json?t=${today}`);
    if (!resp.ok) throw new Error('No daily puzzle');
    const data = await resp.json();
    if (!data.generated || !data.puzzle || data.date !== today) {
        throw new Error('Daily puzzle not available or stale');
    }
    return { id: 'daily', categories: data.puzzle.categories };
}

function setupConnectionsGame() {
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

        // Advanced Arabic normalization for matching
        function normalizeForMatch(str) {
            return str
                .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '') // strip tashkeel/diacritics
                .replace(/\u0670/g, '\u0627') // superscript alef -> regular alef (e.g. كِتَـٰب -> كتاب)
                .replace(/[\u0671]/g, '\u0627') // alef wasla -> alef
                .replace(/[\u0622\u0623\u0625]/g, '\u0627') // alef variants -> alef
                .replace(/[\u0624]/g, '\u0648') // waw hamza -> waw
                .replace(/[\u0626]/g, '\u064A') // ya hamza -> ya
                .replace(/[\u0629]/g, '\u0647') // taa marbuta -> ha
                .replace(/[\u0649]/g, '\u064A') // alef maqsura -> ya
                .replace(/\u0621/g, '') // remove standalone hamza
                .replace(/\u0640/g, '') // remove tatweel
                .replace(/[\u064E\u064F\u0650\u0651\u0652\u0653\u0654\u0655\u0656\u0657\u0658]/g, '') // extra diacritics cleanup
                .replace(/\u06E5|\u06E6/g, '') // remove small waw/ya
                .replace(/[\u06DF-\u06E2]/g, '') // remove Quranic annotation marks
                .replace(/\s*[\u06D6-\u06DE]\s*/g, '') // remove Quranic stop signs
                .trim();
        }

        // Further simplify for fuzzy matching - remove hamza carriers and normalize away differences
        function deepNormalize(str) {
            return str
                .replace(/[\u0621\u0623\u0625\u0624\u0626\u0622]/g, '') // remove all hamza forms
                .replace(/\u0648(?=[\u064A\u0627])/g, ''); // remove و before ي/ا (handles رؤيا vs ريا)
        }

        // Strip common prefixes for root comparison - only for words long enough
        function stripPrefixes(str) {
            // Don't strip from very short words (3 chars or less after stripping would be too short)
            const prefixes = ['وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ل', 'ك'];
            for (const p of prefixes) {
                if (str.startsWith(p) && str.length > p.length + 2) {
                    return str.slice(p.length);
                }
            }
            return str;
        }

        // Strip common suffixes - only for words long enough
        function stripSuffixes(str) {
            if (str.length <= 3) return str; // don't strip from very short words
            return str.replace(/(ون|ين|ات|ها|هم|هن|كم|نا|ى|ه|ا)$/, '');
        }

        // Get all tile word variants for matching
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
                    // Toggle on this word
                    wordEl.classList.add('wbw-active');
                    if (enEl) {
                        enEl.textContent = translation;
                        enEl.style.display = 'block';
                    }
                    // Auto-hide after 6 seconds
                    const timer = setTimeout(() => {
                        wordEl.classList.remove('wbw-active');
                        if (enEl) { enEl.textContent = ''; enEl.style.display = 'none'; }
                    }, 6000);
                    wordEl._hideTimer = timer;
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
        // Collapsing — stop any playing audio
        stopQuranAudio();
    } else {
        // Expanding — autoplay the recitation for the active slide
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
    const puzzleNum = conn.puzzle.id === 'daily' ? app.dayNumber : getPuzzleIndex(PUZZLES.connections) + 1;

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
