/* ============================================
   QURANIQ - ROOT HIVE
   Build Quranic words from seven letters around a featured Arabic root.
   ============================================ */

// Each rank above Beginner earns one crescent, so 🌙 = rank index (0-5).
const HIVE_RANKS = [
    { name: 'Beginner', pct: 0 },
    { name: 'Seeker', pct: 0.05 },
    { name: 'Learner', pct: 0.15 },
    { name: 'Reader', pct: 0.30 },
    { name: 'Scholar', pct: 0.50 },
    { name: 'Root Master', pct: 0.70 },
];

const HIVE_MIN_LEN = 3;
const HIVE_FAMILY_BONUS = 2;
const HIVE_HINT_MEANING = 1;   // hint levels per word; each step costs 1 point on that word
const HIVE_HINT_LETTER = 2;
const HIVE_HINT_SHOWN = 3;     // word revealed: added to the list, scores 0

const VERB_FORMS = {
    1: ['I', 'فَعَلَ', 'the basic verb — the root’s core action'],
    2: ['II', 'فَعَّلَ', 'intensive or causative — doing it thoroughly, or making someone do it'],
    3: ['III', 'فاعَلَ', 'doing it with or towards someone else'],
    4: ['IV', 'أَفْعَلَ', 'causative — making it happen'],
    5: ['V', 'تَفَعَّلَ', 'taking the action on oneself, often gradually'],
    6: ['VI', 'تَفاعَلَ', 'doing it mutually, to one another'],
    7: ['VII', 'اِنْفَعَلَ', 'undergoing the action — a passive sense'],
    8: ['VIII', 'اِفْتَعَلَ', 'doing it for oneself, with effort'],
    9: ['IX', 'اِفْعَلَّ', 'becoming a colour or having a trait'],
    10: ['X', 'اِسْتَفْعَلَ', 'seeking or asking for it'],
};

const WORD_TYPES = {
    'active participle': ['Active participle', 'The one who does the action (فاعِل pattern), e.g. كاتِب “writer”.'],
    'passive participle': ['Passive participle', 'The one the action is done to (مَفْعُول pattern), e.g. مَكْتُوب “written”.'],
    'verbal noun': ['Verbal noun', 'The action itself as a noun (maṣdar).'],
    'noun': ['Noun', ''],
    'adjective': ['Adjective', ''],
    'proper noun': ['Proper name', ''],
};

const hive = {
    puzzle: null,
    words: new Map(),     // normalised word -> word entry
    found: [],            // normalised words, in the order found
    hints: {},            // normalised word -> hint level (HIVE_HINT_*)
    clue: null,           // word whose clue is shown under the input
    moons: 0,             // best crescents earned today (0-5)
    shown: {},            // result modals already shown: { master, complete, revealed }
    rootVerse: null,      // { ref, arabic, translation } for the result card
    revealed: false,      // player chose to reveal all answers
    input: [],
    outer: [],
    listTab: 'found',
    listOpen: null,
    lastFound: null,
    revealArmed: false,
    keyHandler: null,
};

function normalizeHive(str) {
    return (str || '')
        .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ؤ/g, 'و')
        .replace(/[ئى]/g, 'ي')
        .replace(/ة/g, 'ه');
}

function hiveEsc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function hiveStateKey() {
    return `roothive_${app.dayNumber}`;
}

function hiveSignature(p) {
    return p.center + [...p.outer].sort().join('');
}

/* ---------- Init & persistence ---------- */

function initRootHive() {
    loadDailyWithHolding('daily_roothive.json', 'roothive-game', 'Root Hive', (puzzle) => {
        hive.puzzle = puzzle;
        setupRootHive();
    });
}

function setupRootHive() {
    const p = hive.puzzle;
    hive.words = new Map(p.words.map(w => [w.w, w]));
    hive.outer = [...p.outer];

    const saved = app.state[hiveStateKey()];
    if (saved && saved.sig === hiveSignature(p)) {
        hive.found = (saved.found || []).filter(w => hive.words.has(w));
        hive.hints = saved.hints || {};
        hive.clue = saved.clue || null;
        hive.moons = saved.moons || 0;
        hive.shown = saved.shown || {};
        hive.revealed = !!saved.revealed;
    }
    if (hive.listOpen === null) hive.listOpen = window.matchMedia('(min-width: 700px)').matches;

    document.getElementById('rh-loading')?.remove();
    document.getElementById('rh-app')?.classList.remove('hidden');

    bindHiveControls();
    renderRootHive();
    updateHiveCrescents();  // sync saves made before crescents were tracked
    loadHiveRootVerse();
    restoreHiveResult();

    if (hive.keyHandler) document.removeEventListener('keydown', hive.keyHandler);
    hive.keyHandler = handleHiveKey;
    document.addEventListener('keydown', hive.keyHandler);
}

function saveHiveState() {
    app.state[hiveStateKey()] = {
        sig: hiveSignature(hive.puzzle),
        found: hive.found,
        hints: hive.hints,
        clue: hive.clue,
        moons: hive.moons,
        shown: hive.shown,
        revealed: hive.revealed,
    };
    saveState(app.state);
}

/* ---------- Scoring ---------- */

function hiveHintLevel(w) {
    return hive.hints[w] || 0;
}

function hiveWordPoints(entry) {
    const level = hiveHintLevel(entry.w);
    if (level >= HIVE_HINT_SHOWN) return 0;
    return Math.max(0, entry.points - level);
}

function hiveHintsUsed() {
    return Object.values(hive.hints).reduce((sum, l) => sum + l, 0);
}

function hiveScore() {
    return hive.found.reduce((sum, w) => sum + hiveWordPoints(hive.words.get(w)), 0);
}

function hiveRankIndex(score) {
    const max = hive.puzzle.maxScore;
    let idx = 0;
    HIVE_RANKS.forEach((r, i) => { if (score >= Math.ceil(r.pct * max)) idx = i; });
    return idx;
}

function hiveFamily() {
    return hive.puzzle.words.filter(w => w.family);
}

function hiveMoonString(moons) {
    return '🌙'.repeat(moons) + '🌑'.repeat(5 - moons);
}

/** Record a newly earned crescent: Firebase leaderboard, local stats. Returns true on a gain. */
function updateHiveCrescents() {
    const moons = hiveRankIndex(hiveScore());
    if (moons <= hive.moons) return false;
    hive.moons = moons;
    saveHiveState();
    if (typeof submitFirebaseScore === 'function') submitFirebaseScore('roothive', moons).catch(() => { });
    recordHiveStats(moons);
    return true;
}

/** Stats: a day counts as played (and won) from the first crescent; the
 *  distribution tracks the best crescent count reached that day. */
function recordHiveStats(moons) {
    if (typeof isServingStale === 'function' && isServingStale()) return;
    const s = app.stats.roothive;
    if (!s) return;
    if (s.lastDay !== app.dayNumber) {
        updateModeStats('roothive', true, moons);
        s.todayMoons = moons;
    } else if ((s.todayMoons || 0) < moons) {
        if (s.todayMoons) s.distribution[s.todayMoons] = Math.max(0, (s.distribution[s.todayMoons] || 0) - 1);
        s.distribution[moons] = (s.distribution[moons] || 0) + 1;
        s.todayMoons = moons;
    }
    saveStats(app.stats);
}

/* ---------- Input ---------- */

function hiveLetters() {
    return [hive.puzzle.center, ...hive.outer];
}

function addHiveLetter(letter) {
    if (hive.revealed || hive.input.length >= 14) return;
    hive.input.push(letter);
    renderHiveInput();
}

function deleteHiveLetter() {
    if (hive.revealed || !hive.input.length) return;
    hive.input.pop();
    renderHiveInput();
}

function shuffleHive() {
    if (hive.revealed) return;
    const prev = hive.outer.join('');
    for (let i = 0; i < 5 && hive.outer.join('') === prev; i++) hive.outer = shuffle(hive.outer);
    const cells = document.querySelectorAll('.rh-cell.outer');
    cells.forEach(c => c.classList.add('rh-fade'));
    setTimeout(() => {
        renderHiveCells();
    }, 140);
}

function rejectHiveWord(msg) {
    const el = document.getElementById('rh-input');
    el.classList.remove('rh-shake');
    void el.offsetWidth;
    el.classList.add('rh-shake');
    showToast(msg);
    announce(msg);
    setTimeout(() => {
        hive.input = [];
        renderHiveInput();
    }, 550);
}

function submitHiveWord() {
    if (hive.revealed || !hive.input.length) return;
    const w = normalizeHive(hive.input.join(''));
    const center = hive.puzzle.center;

    if (w.length < HIVE_MIN_LEN) return rejectHiveWord(`Too short — at least ${HIVE_MIN_LEN} letters`);
    if (!w.includes(center)) return rejectHiveWord(`Missing the centre letter ${center}`);
    if (hive.found.includes(w)) return rejectHiveWord('Already found');

    const entry = hive.words.get(w);
    if (!entry) {
        if (w.startsWith('ال') && hive.words.has(w.slice(2))) {
            return rejectHiveWord('Drop the ال — use the plain dictionary form');
        }
        return rejectHiveWord('Not in today’s Quranic word list');
    }
    acceptHiveWord(entry);
}

function acceptHiveWord(entry) {
    const before = hiveRankIndex(hiveScore());
    hive.found.push(entry.w);
    hive.lastFound = entry.w;
    hive.input = [];
    if (hive.clue === entry.w) hive.clue = null;
    saveHiveState();

    const pts = hiveWordPoints(entry);
    const gloss = entry.senses[0]?.gloss || '';
    showToast(entry.family ? `Root word! +${pts}${gloss ? ' · ' + gloss : ''}` : `+${pts}${gloss ? ' · ' + gloss : ''}`, 2000);
    announce(`Found ${entry.senses[0]?.lemma || entry.w}, ${gloss}. ${pts} points.`);

    const inputEl = document.getElementById('rh-input');
    inputEl.classList.add('rh-good');
    setTimeout(() => inputEl.classList.remove('rh-good'), 450);

    const score = hiveScore();
    const after = hiveRankIndex(score);
    const family = hiveFamily();
    const familyDone = entry.family && family.every(f => hive.found.includes(f.w));
    const allDone = hive.found.length === hive.puzzle.words.length;

    updateHiveCrescents();
    if (allDone) {
        setTimeout(() => celebrateHive('Hive complete! “From their bellies comes a drink of varying colours, in which there is healing for people.” (16:69)', 3000), 700);
        if (!hive.shown.complete) setTimeout(() => showHiveResult('complete'), 1800);
    } else if (familyDone) {
        setTimeout(() => celebrateHive(`Root family complete 🍯 You found every ${hive.puzzle.root.display} word in the hive.`, 3200), 700);
    } else if (after > before) {
        if (after === HIVE_RANKS.length - 1 && !hive.shown.master) {
            // Play continues past Root Master, so don't interrupt with the modal — offer it instead.
            hive.shown.master = true;
            saveHiveState();
            setTimeout(() => {
                celebrateHive('Root Master! All 5 🌙 earned — keep going, or view & share your results below', 3200);
                restoreHiveResult();
            }, 700);
        } else {
            setTimeout(() => showToast(`${HIVE_RANKS[after].name} · +1 🌙`, 2200), 700);
        }
    }

    if (typeof trackEvent === 'function') {
        trackEvent('roothive_word', { family: entry.family, length: entry.w.length, found: hive.found.length });
    }

    renderRootHive();
}

function celebrateHive(msg, duration) {
    showToast(msg, duration);
    announce(msg);
    const hiveEl = document.getElementById('rh-hive');
    hiveEl?.classList.add('rh-celebrate');
    setTimeout(() => hiveEl?.classList.remove('rh-celebrate'), 1400);
}

function handleHiveKey(e) {
    if (app.currentMode !== 'roothive' || !hive.puzzle || hive.revealed) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (document.querySelector('.modal:not(.hidden)')) return;
    const active = document.activeElement;
    const onControl = active && active !== document.body && /^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;

    if (e.key === 'Enter' && !onControl) {
        e.preventDefault();
        submitHiveWord();
    } else if (e.key === 'Backspace') {
        e.preventDefault();
        deleteHiveLetter();
    } else if (e.key === ' ' && !onControl) {
        e.preventDefault();
        shuffleHive();
    } else if (e.key === '?') {
        e.preventDefault();
        quickHiveHint();
    } else if (/^[1-7]$/.test(e.key)) {
        addHiveLetter(hiveLetters()[Number(e.key) - 1]);
        flashHiveCell(Number(e.key) - 1);
    } else if (/^[؀-ۿ]$/.test(e.key)) {
        const c = normalizeHive(e.key);
        const idx = hiveLetters().indexOf(c);
        if (idx >= 0) {
            addHiveLetter(c);
            flashHiveCell(idx);
        } else if (c) {
            const el = document.getElementById('rh-input');
            el.classList.remove('rh-nudge');
            void el.offsetWidth;
            el.classList.add('rh-nudge');
        }
    }
}

function flashHiveCell(idx) {
    const cell = document.querySelector(`.rh-cell[data-idx="${idx}"]`);
    if (!cell) return;
    cell.classList.add('rh-pressed');
    setTimeout(() => cell.classList.remove('rh-pressed'), 130);
}

/* ---------- Hints & reveal ---------- */

function hintHiveWord(w) {
    if (hive.revealed || hive.found.includes(w) || !hive.words.has(w)) return;
    const level = hiveHintLevel(w) + 1;
    if (level > HIVE_HINT_SHOWN) return;
    hive.hints[w] = level;
    hive.clue = w;
    const entry = hive.words.get(w);
    if (level === HIVE_HINT_SHOWN) {
        hive.found.push(w);
        hive.lastFound = w;
        hive.clue = null;
        const msg = `${hiveDisplayLemma(entry)} — ${hiveGloss(entry.senses[0])}`;
        showToast(msg, 2400);
        announce(`The word was ${msg}`);
    }
    saveHiveState();
    renderRootHive();
    if (typeof trackEvent === 'function') trackEvent('roothive_hint', { level, family: entry.family });
}

/** Mirrors gloss_key / glosses_overlap in scripts/root_hive.py. */
function hiveGlossKey(gloss) {
    const stems = (String(gloss || '').toLowerCase().match(/[a-z]+/g) || [])
        .filter(w => !['the', 'a', 'an', 'to', 'of'].includes(w))
        .map(w => w.replace(/(ing|ed|es|s)$/, '') || w);
    return [...new Set(stems)].sort().join(' ');
}

/** Found words whose meaning matches this word's — a clue must not be mistaken for them. */
function hiveGlossesOverlap(a, b) {
    const ka = new Set(hiveGlossKey(a).split(' ').filter(Boolean));
    const kb = new Set(hiveGlossKey(b).split(' ').filter(Boolean));
    if (!ka.size || !kb.size) return false;
    const within = (x, y) => [...x].every(t => y.has(t));
    return within(ka, kb) || within(kb, ka);
}

function hiveFoundTwins(entry) {
    const gloss = entry.senses[0]?.gloss;
    if (!gloss) return [];
    return hive.found
        .filter(w => w !== entry.w)
        .map(w => hive.words.get(w))
        .filter(e => e && hiveGlossesOverlap(e.senses[0]?.gloss, gloss));
}

function hiveTwinNote(entry) {
    const twins = hiveFoundTwins(entry);
    if (!twins.length) return '';
    return `<span class="rh-clue-not">a different word from <span lang="ar" dir="rtl">${twins.map(t => hiveEsc(hiveDisplayLemma(t))).join('، ')}</span></span>`;
}

/** Easiest useful word to hint: one already being hinted, then root-family words, then common short words. */
function pickHiveHintTarget() {
    if (hive.clue && hive.words.has(hive.clue) && !hive.found.includes(hive.clue)) return hive.clue;
    const unfound = hive.puzzle.words.filter(w => !hive.found.includes(w.w));
    unfound.sort((a, b) =>
        (hiveHintLevel(b.w) - hiveHintLevel(a.w)) ||
        // Prefer words that can't be confused with one already found
        (hiveFoundTwins(a).length - hiveFoundTwins(b).length) ||
        (Number(b.family) - Number(a.family)) ||
        ((b.senses[0]?.count || 0) - (a.senses[0]?.count || 0)) ||
        (a.w.length - b.w.length));
    return unfound[0]?.w || null;
}

function quickHiveHint() {
    if (hive.revealed) return;
    const w = pickHiveHintTarget();
    if (!w) return;
    const level = hiveHintLevel(w);
    if (hive.clue === w && level >= HIVE_HINT_LETTER) {
        showToast('Still stuck? Tap “Show word” in the hint, or try another word');
        return;
    }
    if (hive.clue === w || level === 0) {
        hintHiveWord(w);
    } else {
        hive.clue = w;  // resume a word hinted earlier without charging again
        saveHiveState();
        renderRootHive();
    }
}

function hiveHintButton(entry) {
    const level = hiveHintLevel(entry.w);
    const w = hiveEsc(entry.w);
    if (level === 0) return `<button type="button" class="rh-hint-btn" data-hint="${w}">Meaning <small>−1</small></button>`;
    if (level === HIVE_HINT_MEANING) return `<button type="button" class="rh-hint-btn" data-hint="${w}">First letter <small>−1</small></button>`;
    return `<button type="button" class="rh-hint-btn strong" data-hint="${w}">Show word <small>0 pts</small></button>`;
}

function hiveClueParts(entry) {
    const level = hiveHintLevel(entry.w);
    const sense = entry.senses[0];
    const parts = [`${entry.w.length} letters`];
    if (level >= HIVE_HINT_MEANING) {
        parts.push(`“${hiveEsc(hiveGloss(sense))}” <span class="rh-clue-type">(${hiveEsc(hiveTypeInfo(sense).label)})</span>`);
        const note = hiveTwinNote(entry);
        if (note) parts.push(note);
    }
    if (level >= HIVE_HINT_LETTER) parts.push(`starts <b lang="ar">${hiveEsc(entry.w[0])}</b>`);
    return parts;
}

function revealAllHiveWords() {
    const btn = document.getElementById('rh-reveal');
    if (!hive.revealArmed) {
        hive.revealArmed = true;
        btn.textContent = 'Tap again to reveal every word';
        btn.classList.add('armed');
        setTimeout(() => {
            hive.revealArmed = false;
            if (!hive.revealed) {
                btn.textContent = 'Reveal all words';
                btn.classList.remove('armed');
            }
        }, 3500);
        return;
    }
    hive.revealed = true;
    hive.input = [];
    hive.listOpen = true;
    hive.listTab = 'found';
    saveHiveState();
    renderRootHive();
    showHiveResult('revealed');
    if (typeof trackEvent === 'function') trackEvent('roothive_reveal', { found: hive.found.length });
}

/* ---------- Share ---------- */

function hiveShareText() {
    const p = hive.puzzle;
    const family = hiveFamily();
    const famFound = family.filter(f => hive.found.includes(f.w)).length;
    const hints = hiveHintsUsed();
    const num = typeof getPuzzleNumber === 'function' ? ` #${getPuzzleNumber()}` : '';
    return [
        `QuranIQ - Root Hive${num}`,
        `Root ${p.root.display} (${p.root.translit})`,
        `${hiveMoonString(hive.moons)} ${HIVE_RANKS[hive.moons].name}`,
        `Words: ${hive.found.length}/${p.words.length} | Root family: ${famFound}/${family.length}${famFound === family.length ? ' 🍯' : ''} | Hints: ${hints}`,
        '',
        'https://sudosar.github.io/quraniq/#roothive',
    ].join('\n');
}

async function shareHive() {
    const text = hiveShareText();
    try {
        if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
            await navigator.share({ text });
            return;
        }
        await navigator.clipboard.writeText(text);
        showToast('Result copied to clipboard');
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        try {
            await navigator.clipboard.writeText(text);
            showToast('Result copied to clipboard');
        } catch (_) {
            showToast('Could not share');
        }
    }
}

/* ---------- Result card (shared result modal) ---------- */

/** The featured root's most frequent word supplies the verse on the result card. */
async function loadHiveRootVerse() {
    const top = hiveFamily().slice().sort((a, b) => (b.senses[0]?.count || 0) - (a.senses[0]?.count || 0))[0];
    const sense = top?.senses[0];
    if (!sense) return;
    try {
        const resp = await fetch(`https://api.quran.com/api/v4/verses/by_key/${encodeURIComponent(sense.ref)}?fields=text_uthmani&translations=20`);
        const data = await resp.json();
        const raw = data.verse?.translations?.[0]?.text || '';
        hive.rootVerse = {
            ref: sense.ref,
            lemma: sense.lemma,
            gloss: hiveGloss(sense),
            arabic: data.verse?.text_uthmani || '',
            translation: raw.replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').trim(),
        };
        if (app.lastResults.roothive) restoreHiveResult();
    } catch (e) { /* the result card simply shows no verse */ }
}

function hiveResultData(kind) {
    const p = hive.puzzle;
    const family = hiveFamily();
    const famFound = family.filter(f => hive.found.includes(f.w)).length;
    const titles = {
        master: ['🐝', 'Root Master!'],
        complete: ['🍯', 'Hive Complete!'],
        revealed: ['📖', 'Words Revealed'],
    };
    const [icon, title] = titles[kind] || titles.master;
    const v = hive.rootVerse;
    return {
        icon,
        title,
        arabic: v?.arabic || '',
        translation: v?.translation || '',
        verseRef: v?.ref,
        emojiGrid: family.map(f => hive.found.includes(f.w) ? '🟨' : '⬜').join(''),
        moons: hive.moons,
        statsText: `Root ${p.root.display} | Words: ${hive.found.length}/${p.words.length} | Root family: ${famFound}/${family.length} | Hints: ${hiveHintsUsed()}`,
        shareText: hiveShareText(),
        dynamicShareFn: hiveShareText,
    };
}

function showHiveResult(kind) {
    hive.shown[kind] = true;
    saveHiveState();
    if (app.currentMode !== 'roothive') {
        restoreHiveResult();
        return;
    }
    showResultModal(hiveResultData(kind));
}

/** After a reload (or a background result), offer the "View Results & Share" button again. */
function restoreHiveResult() {
    const kind = hive.shown.revealed ? 'revealed' : hive.shown.complete ? 'complete' : hive.shown.master ? 'master' : null;
    if (!kind) return;
    app.lastResults.roothive = hiveResultData(kind);
    showViewResultsButton('roothive');
}

/* ---------- Rendering ---------- */

function bindHiveControls() {
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el && !el.dataset.bound) {
            el.addEventListener('click', fn);
            el.dataset.bound = '1';
        }
    };
    bind('rh-delete', deleteHiveLetter);
    bind('rh-shuffle', shuffleHive);
    bind('rh-enter', submitHiveWord);
    bind('rh-hint', quickHiveHint);
    bind('rh-reveal', revealAllHiveWords);
    bind('rh-share', shareHive);
    bind('rh-root', () => {
        const el = document.getElementById('rh-root');
        el.classList.toggle('open');
        el.setAttribute('aria-expanded', el.classList.contains('open') ? 'true' : 'false');
    });
    bind('rh-list-toggle', () => {
        hive.listOpen = !hive.listOpen;
        renderHiveList();
    });
    document.querySelectorAll('.rh-tab').forEach(tab => {
        if (tab.dataset.bound) return;
        tab.dataset.bound = '1';
        tab.addEventListener('click', () => {
            hive.listTab = tab.dataset.tab;
            hive.listOpen = true;
            renderHiveList();
        });
    });
    const game = document.getElementById('roothive-game');
    if (game && !game.dataset.hintsBound) {
        game.dataset.hintsBound = '1';
        game.addEventListener('click', (e) => {
            const hint = e.target.closest('[data-hint]');
            if (hint) hintHiveWord(hint.dataset.hint);
            if (e.target.closest('[data-clue-close]')) {
                hive.clue = null;
                saveHiveState();
                renderHiveClue();
            }
        });
    }
    const list = document.getElementById('rh-list-body');
    if (list && !list.dataset.bound) {
        list.dataset.bound = '1';
        list.addEventListener('click', (e) => {
            if (e.target.closest('[data-hint]')) return;
            const chip = e.target.closest('[data-word]');
            if (chip) openHiveWord(chip.dataset.word);
            const other = e.target.closest('[data-other]');
            if (other) openHiveSense(hive.puzzle.otherFamily[Number(other.dataset.other)]);
        });
    }
    const hiveEl = document.getElementById('rh-hive');
    if (hiveEl && !hiveEl.dataset.bound) {
        hiveEl.dataset.bound = '1';
        hiveEl.addEventListener('click', (e) => {
            const cell = e.target.closest('.rh-cell');
            if (!cell) return;
            addHiveLetter(cell.dataset.letter);
            flashHiveCell(Number(cell.dataset.idx));
        });
    }
    document.getElementById('rh-word-close')?.addEventListener('click', () => closeModal('roothive-word-modal'));
}

function renderRootHive() {
    renderHiveRoot();
    renderHiveProgress();
    renderHiveInput();
    renderHiveClue();
    renderHiveCells();
    renderHiveList();
    const app_ = document.getElementById('rh-app');
    app_?.classList.toggle('rh-revealed', hive.revealed);
    const reveal = document.getElementById('rh-reveal');
    if (reveal) {
        reveal.hidden = hive.revealed || hive.found.length === hive.puzzle.words.length;
        reveal.textContent = 'Reveal all words';
        reveal.classList.remove('armed');
    }
    const share = document.getElementById('rh-share');
    if (share) share.hidden = hive.found.length === 0;
    const complete = hive.found.length === hive.puzzle.words.length;
    ['rh-delete', 'rh-shuffle', 'rh-enter', 'rh-hint'].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.disabled = hive.revealed || (id === 'rh-hint' && complete);
    });
}

function renderHiveRoot() {
    const r = hive.puzzle.root;
    const family = hiveFamily();
    const famFound = family.filter(f => hive.found.includes(f.w)).length;
    const el = document.getElementById('rh-root');
    el.setAttribute('aria-expanded', el.classList.contains('open') ? 'true' : 'false');
    el.innerHTML = `
        <div class="rh-root-top">
            <div class="rh-root-label">Today’s root</div>
            <div class="rh-root-letters" dir="rtl" lang="ar" aria-label="Today’s root ${hiveEsc(r.display)}">
                ${[...r.letters].map(c => `<span class="rh-root-letter">${hiveEsc(c)}</span>`).join('')}
            </div>
            <div class="rh-root-info">
                <div class="rh-root-translit">Root ${hiveEsc(r.translit)} · ${r.occurrences.toLocaleString()} times in the Quran</div>
                <div class="rh-root-family" aria-label="Root family words found: ${famFound} of ${family.length}">
                    <span>Root family</span>
                    <span class="rh-pips">${family.map(f => `<span class="rh-pip ${hive.found.includes(f.w) ? 'on' : ''}"></span>`).join('')}</span>
                    <span class="rh-root-family-count">${famFound}/${family.length}</span>
                </div>
            </div>
            <span class="rh-root-chev" aria-hidden="true">▾</span>
        </div>
        <p class="rh-root-meaning">${hiveEsc(r.meaning)}</p>`;
}

function renderHiveProgress() {
    const score = hiveScore();
    const idx = hiveRankIndex(score);
    const max = hive.puzzle.maxScore;
    const top = Math.ceil(HIVE_RANKS[HIVE_RANKS.length - 1].pct * max);
    const fill = Math.min(100, (score / top) * 100);
    const next = HIVE_RANKS[idx + 1];
    const toNext = next ? Math.ceil(next.pct * max) - score : 0;
    const complete = hive.found.length === hive.puzzle.words.length;
    const moons = Array.from({ length: 5 }, (_, i) =>
        `<span class="ded-moon ${i < idx ? 'active' : 'spent'}">${i < idx ? '🌙' : '🌑'}</span>`).join('');
    document.getElementById('rh-progress').innerHTML = `
        <div class="rh-rank">
            <span class="rh-rank-name">${HIVE_RANKS[idx].name}</span>
            <span class="rh-moons" role="img" aria-label="${idx} of 5 crescents">${moons}</span>
        </div>
        <div class="rh-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${score}" aria-label="Score ${score} of ${max}">
            <div class="rh-bar-fill" style="width:${fill}%"></div>
            ${HIVE_RANKS.map((rk, i) => {
                const pos = Math.min(100, (Math.ceil(rk.pct * max) / top) * 100);
                return `<span class="rh-bar-dot ${i <= idx ? 'on' : ''} ${i === idx ? 'current' : ''}" style="left:${pos}%" title="${rk.name}${i ? ` · ${i} 🌙` : ''}">${i === idx ? score : ''}</span>`;
            }).join('')}
        </div>
        <div class="rh-rank-next">${complete ? 'Hive complete 🍯' : next ? `${toNext} point${toNext === 1 ? '' : 's'} to ${next.name} · next 🌙` : 'All 5 🌙 earned — keep going for the full hive'}</div>`;
}

function renderHiveInput() {
    const el = document.getElementById('rh-input');
    if (!el) return;
    if (hive.revealed) {
        el.innerHTML = '<span class="rh-input-placeholder">Answers revealed — explore the words below</span>';
        return;
    }
    if (!hive.input.length) {
        el.innerHTML = '<span class="rh-input-placeholder">Tap letters to build a word</span><span class="rh-caret"></span>';
        return;
    }
    const center = hive.puzzle.center;
    el.innerHTML = `<span class="rh-input-word" dir="rtl" lang="ar">${hive.input.map(c =>
        c === center ? `<span class="rh-c">${hiveEsc(c)}</span>` : hiveEsc(c)).join('')}</span><span class="rh-caret"></span>`;
}

function renderHiveClue() {
    const el = document.getElementById('rh-clue');
    if (!el) return;
    const entry = hive.clue && hive.words.get(hive.clue);
    const show = !!entry && !hive.revealed && !hive.found.includes(entry.w);
    document.getElementById('rh-app')?.classList.toggle('has-clue', show);
    if (!show) {
        el.hidden = true;
        el.innerHTML = '';
        return;
    }
    el.hidden = false;
    el.innerHTML = `<span class="rh-clue-text"><span aria-hidden="true">💡</span> ${entry.family ? '<span class="rh-clue-root">Root word</span> ' : ''}${hiveClueParts(entry).join(' · ')}</span>
        ${hiveHintButton(entry)}
        <button type="button" class="rh-clue-close" data-clue-close aria-label="Hide hint">×</button>`;
}

function renderHiveCells() {
    const wrap = document.getElementById('rh-hive');
    if (!wrap) return;
    const letters = hiveLetters();
    const rootLetters = new Set(hive.puzzle.root.letters);
    const showKeys = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    wrap.innerHTML = `<div class="rh-hive-inner">${letters.map((c, i) => `
        <button type="button" class="rh-cell ${i === 0 ? 'center' : 'outer'} ${rootLetters.has(c) ? 'radical' : ''}"
                data-idx="${i}" data-letter="${hiveEsc(c)}" style="--slot:${i}"
                aria-label="${hiveEsc(c)}${i === 0 ? ', centre letter' : ''}${rootLetters.has(c) ? ', root letter' : ''}"
                ${hive.revealed ? 'disabled' : ''}>
            <span class="rh-cell-letter" lang="ar">${hiveEsc(c)}</span>
            ${showKeys ? `<span class="rh-cell-key" aria-hidden="true">${i + 1}</span>` : ''}
        </button>`).join('')}</div>`;
}

function hiveDisplayLemma(entry) {
    return entry.senses[0]?.lemma || entry.w;
}

function hiveGloss(sense) {
    if (!sense) return '';
    const g = sense.gloss || '';
    return sense.type === 'proper noun' ? g.replace(/\b\w/g, m => m.toUpperCase()) : g;
}

function renderHiveList() {
    const p = hive.puzzle;
    const family = hiveFamily();
    const famFound = family.filter(f => hive.found.includes(f.w)).length;

    const toggle = document.getElementById('rh-list-toggle');
    const panel = document.getElementById('rh-list-panel');
    toggle.setAttribute('aria-expanded', hive.listOpen ? 'true' : 'false');
    panel.hidden = !hive.listOpen;
    const recent = [...hive.found].reverse().slice(0, 6).map(w => hiveDisplayLemma(hive.words.get(w)));
    toggle.innerHTML = `
        <span class="rh-list-count">${hive.revealed ? `You found ${hive.found.length} of ${p.words.length} words`
            : `You have found ${hive.found.length} word${hive.found.length === 1 ? '' : 's'}`}</span>
        ${!hive.listOpen && recent.length ? `<span class="rh-list-preview" dir="rtl" lang="ar">${recent.map(hiveEsc).join('، ')}</span>` : ''}
        <span class="rh-list-chevron" aria-hidden="true">${hive.listOpen ? '▴' : '▾'}</span>`;

    document.querySelectorAll('.rh-tab').forEach(t => {
        const active = t.dataset.tab === hive.listTab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
        if (t.dataset.tab === 'family') t.textContent = `Root family ${famFound}/${family.length}`;
        if (t.dataset.tab === 'found') t.textContent = hive.revealed ? 'All words' : 'Words found';
        if (t.dataset.tab === 'hints') t.hidden = hive.revealed;
    });

    const body = document.getElementById('rh-list-body');
    if (!hive.listOpen) return;
    if (hive.revealed && hive.listTab === 'hints') hive.listTab = 'found';
    body.innerHTML = hive.listTab === 'family' ? renderHiveFamilyTab(family)
        : hive.listTab === 'hints' ? renderHiveHintsTab()
        : renderHiveFoundTab();
    if (hive.lastFound) {
        body.querySelector(`[data-word="${CSS.escape(hive.lastFound)}"]`)?.classList.add('rh-new');
        hive.lastFound = null;
    }
}

function hiveChip(entry, missed) {
    const sense = entry.senses[0];
    const level = hiveHintLevel(entry.w);
    const badge = missed ? '' : level >= HIVE_HINT_SHOWN ? 'shown' : `+${hiveWordPoints(entry)}${level ? ' 💡' : ''}`;
    return `<button type="button" class="rh-chip ${entry.family ? 'family' : ''} ${missed ? 'missed' : ''} ${level >= HIVE_HINT_SHOWN ? 'given' : ''}" data-word="${hiveEsc(entry.w)}">
        ${badge ? `<span class="rh-chip-pts">${badge}</span>` : ''}
        <span class="rh-chip-ar" dir="rtl" lang="ar">${hiveEsc(hiveDisplayLemma(entry))}</span>
        <span class="rh-chip-en">${hiveEsc(hiveGloss(sense))}</span>
    </button>`;
}

function hiveSlot(entry) {
    const level = hiveHintLevel(entry.w);
    const blanks = [...entry.w].map((c, i) =>
        i === 0 && level >= HIVE_HINT_LETTER ? `<b>${hiveEsc(c)}</b>` : '<i></i>').join('');
    const sense = entry.senses[0];
    return `<div class="rh-slot ${entry.family ? 'family' : ''}">
        <span class="rh-slot-blanks" dir="rtl" lang="ar" aria-label="${entry.w.length} letters">${blanks}</span>
        ${level >= HIVE_HINT_MEANING ? `<span class="rh-slot-hint">“${hiveEsc(hiveGloss(sense))}” · ${hiveEsc(hiveTypeInfo(sense).label)}${hiveTwinNote(entry) ? `<br>${hiveTwinNote(entry)}` : ''}</span>` : ''}
        ${hiveHintButton(entry)}
    </div>`;
}

function renderHiveHintsTab() {
    const words = hive.puzzle.words;
    const unfound = words.filter(w => !hive.found.includes(w.w));
    if (!unfound.length) return '<p class="rh-empty">You found every word — no hints needed!</p>';

    const lengths = [...new Set(words.map(w => w.w.length))].sort((a, b) => a - b);
    const starts = [...new Set(words.map(w => w.w[0]))].sort((a, b) => a.localeCompare(b, 'ar'));
    const left = (pred) => unfound.filter(pred).length;
    const cell = (n, total) => total === 0 ? '<td class="none">·</td>' : n === 0 ? '<td class="done">✓</td>' : `<td>${n}</td>`;
    const rows = starts.map(c => {
        const inRow = (w) => w.w[0] === c;
        return `<tr><th scope="row" lang="ar">${hiveEsc(c)}</th>${lengths.map(L =>
            cell(left(w => inRow(w) && w.w.length === L), words.filter(w => inRow(w) && w.w.length === L).length)).join('')}
            <td class="sum">${left(inRow)}</td></tr>`;
    }).join('');
    const map = `<table class="rh-map">
        <caption>Words left, by first letter and length</caption>
        <thead><tr><th scope="col"></th>${lengths.map(L => `<th scope="col">${L}</th>`).join('')}<th scope="col">Σ</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><th scope="row">Σ</th>${lengths.map(L => `<td>${left(w => w.w.length === L)}</td>`).join('')}<td class="sum">${unfound.length}</td></tr></tfoot>
    </table>`;

    const groups = lengths.map(L => {
        const group = unfound.filter(w => w.w.length === L);
        if (!group.length) return '';
        group.sort((a, b) => (Number(b.family) - Number(a.family)) || ((b.senses[0]?.count || 0) - (a.senses[0]?.count || 0)));
        return `<h4 class="rh-subhead">${L} letters</h4><div class="rh-slots">${group.map(hiveSlot).join('')}</div>`;
    }).join('');

    return `<p class="rh-subnote"><strong class="rh-free">Free:</strong> the map counts the words you still need. Want a clue? Each step — meaning, then first letter — costs 1 point on that word, so lean on them too much and you may miss a 🌙. “Show word” adds it for 0 points.</p>
        ${map}${groups}`;
}

function renderHiveFoundTab() {
    const entries = hive.revealed
        ? hive.puzzle.words
        : hive.found.map(w => hive.words.get(w));
    if (!entries.length) {
        return `<p class="rh-empty">Words you find appear here with their meanings. Tap any word to learn its root, pattern and where it appears in the Quran.</p>`;
    }
    const sorted = [...entries].sort((a, b) => a.w.localeCompare(b.w, 'ar'));
    return `<div class="rh-chips">${sorted.map(e => hiveChip(e, hive.revealed && !hive.found.includes(e.w))).join('')}</div>
        <p class="rh-legend"><span class="rh-legend-swatch"></span> Words from today’s root</p>`;
}

function renderHiveFamilyTab(family) {
    const r = hive.puzzle.root;
    const slots = family.map(entry => {
        const found = hive.found.includes(entry.w);
        if (found || hive.revealed) return hiveChip(entry, !found);
        return hiveSlot(entry);
    }).join('');

    const others = hive.puzzle.otherFamily || [];
    const othersHtml = others.length ? `
        <h4 class="rh-subhead">More from ${hiveEsc(r.display)} in the Quran</h4>
        <p class="rh-subnote">These can’t be spelled with today’s letters, but they share the same root.</p>
        <div class="rh-chips">${others.map((s, i) => `
            <button type="button" class="rh-chip other" data-other="${i}">
                <span class="rh-chip-ar" dir="rtl" lang="ar">${hiveEsc(s.lemma)}</span>
                <span class="rh-chip-en">${hiveEsc(hiveGloss(s))}</span>
            </button>`).join('')}</div>` : '';

    return `<p class="rh-subnote">Every word below is built from <strong dir="rtl" lang="ar">${hiveEsc(r.display)}</strong>. Root words score a +${HIVE_FAMILY_BONUS} bonus.</p>
        <div class="rh-slots">${slots}</div>${othersHtml}`;
}

/* ---------- Word detail sheet ---------- */

function openHiveWord(w) {
    const entry = hive.words.get(w);
    if (!entry) return;
    renderHiveSheet(entry.senses);
}

function openHiveSense(sense) {
    if (sense) renderHiveSheet([sense]);
}

function hiveTypeInfo(sense) {
    if (sense.type === 'verb') {
        const f = VERB_FORMS[sense.form || 1];
        return { label: `Verb · Form ${f[0]}`, pattern: f[1], note: f[2] };
    }
    const t = WORD_TYPES[sense.type] || ['Word', ''];
    return { label: t[0], pattern: '', note: t[1] };
}

function renderHiveSheet(senses) {
    const root = hive.puzzle.root;
    const body = document.getElementById('rh-word-body');
    body.innerHTML = senses.map((s, i) => {
        const info = hiveTypeInfo(s);
        const sameRoot = normalizeHive(s.root) === root.letters;
        const rootDisplay = [...normalizeHive(s.root)].join(' ');
        const [surah, ayah] = s.ref.split(':');
        const surahName = typeof getSurahName === 'function' ? getSurahName(Number(surah)) : `Surah ${surah}`;
        return `<article class="rh-sense">
            ${senses.length > 1 ? `<div class="rh-sense-num">Meaning ${i + 1} of ${senses.length}</div>` : ''}
            <div class="rh-sense-word" dir="rtl" lang="ar">${hiveEsc(s.lemma)}</div>
            <div class="rh-sense-gloss">${hiveEsc(hiveGloss(s))}${s.alt && s.alt.length ? `<span class="rh-sense-alt"> · also “${s.alt.map(hiveEsc).join('”, “')}”</span>` : ''}</div>
            <div class="rh-tags">
                <span class="rh-tag">${hiveEsc(info.label)}</span>
                <span class="rh-tag ${sameRoot ? 'gold' : ''}">Root <span dir="rtl" lang="ar">${hiveEsc(rootDisplay)}</span>${sameRoot ? ' · today’s root' : ''}</span>
                <span class="rh-tag">${s.count}× in the Quran</span>
            </div>
            ${info.note ? `<p class="rh-pattern">${info.pattern ? `<span dir="rtl" lang="ar" class="rh-pattern-ar">${hiveEsc(info.pattern)}</span> ` : ''}${hiveEsc(info.note)}</p>` : ''}
            <div class="rh-example" data-ref="${hiveEsc(s.ref)}" data-pos="${s.pos}">
                <div class="rh-example-head">
                    <span>${hiveEsc(surahName)} ${hiveEsc(s.ref)}</span>
                    <button type="button" class="rh-play" aria-label="Listen to ${hiveEsc(s.ref)}">▶</button>
                </div>
                <div class="rh-example-ar" dir="rtl" lang="ar"><span class="rh-loading-dots">Loading verse…</span></div>
                <div class="rh-example-en"></div>
                <a class="rh-example-link" href="https://quran.com/${Number(surah)}/${Number(ayah)}" target="_blank" rel="noopener">Read on Quran.com ↗</a>
            </div>
        </article>`;
    }).join('');

    body.querySelectorAll('.rh-example').forEach(ex => {
        ex.querySelector('.rh-play').addEventListener('click', (e) => playVerseAudio(ex.dataset.ref, e.currentTarget));
        loadHiveExample(ex);
    });
    openModal('roothive-word-modal');
}

const hiveTranslationCache = {};

async function loadHiveExample(ex) {
    const ref = ex.dataset.ref;
    const pos = Number(ex.dataset.pos) - 1;
    const arEl = ex.querySelector('.rh-example-ar');
    const enEl = ex.querySelector('.rh-example-en');

    fetchWordByWord(ref).then(words => {
        if (!words) {
            arEl.textContent = '';
            return;
        }
        arEl.textContent = '';
        let idx = 0;
        words.forEach(w => {
            if (w.isSeparator) return;
            if (idx > 0) arEl.append(' ');
            const span = document.createElement('span');
            span.textContent = w.arabic;
            if (idx === pos) {
                span.className = 'rh-hl';
                span.title = w.translation;
            }
            arEl.append(span);
            idx++;
        });
        const hl = arEl.querySelector('.rh-hl');
        if (hl && words[pos]) {
            const tip = document.createElement('div');
            tip.className = 'rh-example-wbw';
            tip.innerHTML = `<span dir="rtl" lang="ar">${hiveEsc(words[pos].arabic)}</span> — ${hiveEsc(words[pos].translation)}`;
            arEl.after(tip);
        }
    });

    try {
        if (!hiveTranslationCache[ref]) {
            const resp = await fetch(`https://api.quran.com/api/v4/quran/translations/20?verse_key=${encodeURIComponent(ref)}`);
            const data = await resp.json();
            const raw = data.translations?.[0]?.text || '';
            hiveTranslationCache[ref] = raw.replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').trim();
        }
        enEl.textContent = hiveTranslationCache[ref] ? `“${hiveTranslationCache[ref]}”` : '';
    } catch (e) {
        enEl.textContent = '';
    }
}
