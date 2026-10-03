/* ============================================
   QURANIQ - ROOT HIVE
   Build Quranic words from seven letters around a featured Arabic root.
   ============================================ */

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
    hinted: new Set(),    // root-family words whose meaning was revealed as a hint
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
        .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
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
        hive.hinted = new Set(saved.hinted || []);
        hive.revealed = !!saved.revealed;
    }
    if (hive.listOpen === null) hive.listOpen = window.matchMedia('(min-width: 700px)').matches;

    document.getElementById('rh-loading')?.remove();
    document.getElementById('rh-app')?.classList.remove('hidden');

    bindHiveControls();
    renderRootHive();

    if (hive.keyHandler) document.removeEventListener('keydown', hive.keyHandler);
    hive.keyHandler = handleHiveKey;
    document.addEventListener('keydown', hive.keyHandler);
}

function saveHiveState() {
    app.state[hiveStateKey()] = {
        sig: hiveSignature(hive.puzzle),
        found: hive.found,
        hinted: [...hive.hinted],
        revealed: hive.revealed,
    };
    saveState(app.state);
}

/* ---------- Scoring ---------- */

function hiveWordPoints(entry) {
    let pts = entry.points;
    if (entry.family && hive.hinted.has(entry.w)) pts -= HIVE_FAMILY_BONUS;
    return pts;
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

    if (allDone) {
        setTimeout(() => celebrateHive('Hive complete! “From their bellies comes a drink of varying colours, in which there is healing for people.” (16:69)', 5000), 700);
    } else if (familyDone) {
        setTimeout(() => celebrateHive(`Root family complete 🍯 You found every ${hive.puzzle.root.display} word in the hive.`, 3200), 700);
    } else if (after > before) {
        setTimeout(() => showToast(`New rank: ${HIVE_RANKS[after].name}`, 2200), 700);
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

function revealFamilyMeaning(w) {
    if (hive.revealed || hive.hinted.has(w) || hive.found.includes(w)) return;
    hive.hinted.add(w);
    saveHiveState();
    renderHiveList();
    if (typeof trackEvent === 'function') trackEvent('roothive_hint', {});
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
    if (typeof trackEvent === 'function') trackEvent('roothive_reveal', { found: hive.found.length });
}

/* ---------- Share ---------- */

async function shareHive() {
    const p = hive.puzzle;
    const score = hiveScore();
    const rank = HIVE_RANKS[hiveRankIndex(score)].name;
    const family = hiveFamily();
    const famFound = family.filter(f => hive.found.includes(f.w)).length;
    const text = [
        `Root Hive 🐝 ${typeof getActivePuzzleDate === 'function' && getActivePuzzleDate() ? getActivePuzzleDate() : ''}`.trim(),
        `Root ${p.root.display} (${p.root.translit})`,
        `${rank} · ${score}/${p.maxScore} points`,
        `${hive.found.length}/${p.words.length} words · root family ${famFound}/${family.length}${famFound === family.length ? ' 🍯' : ''}`,
        `${location.origin}${location.pathname}#roothive`,
    ].join('\n');
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
    const list = document.getElementById('rh-list-body');
    if (list && !list.dataset.bound) {
        list.dataset.bound = '1';
        list.addEventListener('click', (e) => {
            const hint = e.target.closest('[data-hint]');
            if (hint) {
                revealFamilyMeaning(hint.dataset.hint);
                return;
            }
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
    ['rh-delete', 'rh-shuffle', 'rh-enter'].forEach(id => {
        const b = document.getElementById(id);
        if (b) b.disabled = hive.revealed;
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
    document.getElementById('rh-progress').innerHTML = `
        <div class="rh-rank">
            <span class="rh-rank-name">${HIVE_RANKS[idx].name}</span>
            <span class="rh-rank-next">${hive.found.length === hive.puzzle.words.length ? 'Hive complete 🍯' : next ? `${toNext} to ${next.name}` : 'Top rank reached'}</span>
        </div>
        <div class="rh-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${score}" aria-label="Score ${score} of ${max}">
            <div class="rh-bar-fill" style="width:${fill}%"></div>
            ${HIVE_RANKS.map((rk, i) => {
                const pos = Math.min(100, (Math.ceil(rk.pct * max) / top) * 100);
                return `<span class="rh-bar-dot ${i <= idx ? 'on' : ''} ${i === idx ? 'current' : ''}" style="left:${pos}%" title="${rk.name}">${i === idx ? score : ''}</span>`;
            }).join('')}
        </div>`;
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
    });

    const body = document.getElementById('rh-list-body');
    if (!hive.listOpen) return;
    body.innerHTML = hive.listTab === 'family' ? renderHiveFamilyTab(family) : renderHiveFoundTab();
    if (hive.lastFound) {
        body.querySelector(`[data-word="${CSS.escape(hive.lastFound)}"]`)?.classList.add('rh-new');
        hive.lastFound = null;
    }
}

function hiveChip(entry, missed) {
    const sense = entry.senses[0];
    return `<button type="button" class="rh-chip ${entry.family ? 'family' : ''} ${missed ? 'missed' : ''}" data-word="${hiveEsc(entry.w)}">
        <span class="rh-chip-ar" dir="rtl" lang="ar">${hiveEsc(hiveDisplayLemma(entry))}</span>
        <span class="rh-chip-en">${hiveEsc(hiveGloss(sense))}</span>
    </button>`;
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
        const sense = entry.senses[0];
        const hinted = hive.hinted.has(entry.w);
        return `<div class="rh-slot">
            <span class="rh-slot-blanks" dir="rtl" aria-label="${entry.w.length} letters">${'<i></i>'.repeat(entry.w.length)}</span>
            ${hinted
                ? `<span class="rh-slot-hint">“${hiveEsc(hiveGloss(sense))}” · ${hiveEsc(WORD_TYPES[sense.type]?.[0] || 'Verb')}</span>`
                : `<button type="button" class="rh-slot-btn" data-hint="${hiveEsc(entry.w)}">Show meaning <small>(−${HIVE_FAMILY_BONUS} bonus)</small></button>`}
        </div>`;
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
