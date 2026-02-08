/* ============================================
   QURANPUZZLE - SHARED UTILITIES
   ============================================ */

// ==================== UTC DAY CALCULATION ====================
const EPOCH = Date.UTC(2025, 0, 1); // Jan 1 2025 UTC
const DAY_MS = 86400000;

function getDayNumber() {
    const now = Date.now();
    return Math.floor((now - EPOCH) / DAY_MS);
}

function getPuzzleIndex(arr) {
    return getDayNumber() % arr.length;
}

// ==================== VERSE COOLING PERIOD ====================
const VERSE_COOL_KEY = 'quranpuzzle_verse_history';
const COOLING_DAYS = 30;

/**
 * Extract all verse refs from a connections puzzle.
 * Returns a Set of normalized ref strings (e.g. "7:26", "59:23").
 */
function extractPuzzleVerseRefs(puzzle) {
    const refs = new Set();
    if (!puzzle || !puzzle.categories) return refs;
    for (const cat of puzzle.categories) {
        // Category-level verse
        if (cat.verse && cat.verse.ref) {
            const norm = normalizeRef(cat.verse.ref);
            if (norm) refs.add(norm);
        }
        // Item-level verses
        if (cat.items) {
            for (const item of cat.items) {
                if (item.ref) {
                    const norm = normalizeRef(item.ref);
                    if (norm) refs.add(norm);
                }
            }
        }
    }
    return refs;
}

/**
 * Normalize a ref to "surah:ayah" format for consistent comparison.
 * "7:26" → "7:26", "18:9-12" → "18:9", "التين:1-3" → "95:1"
 */
function normalizeRef(ref) {
    if (!ref) return null;
    const parsed = parseQuranRef(ref);
    if (parsed) return `${parsed.surah}:${parsed.ayah}`;
    return null;
}

/**
 * Load verse history from localStorage.
 * Returns { "surah:ayah": dayNumber, ... }
 */
function loadVerseHistory() {
    try {
        return JSON.parse(localStorage.getItem(VERSE_COOL_KEY)) || {};
    } catch { return {}; }
}

/**
 * Save verse history to localStorage.
 */
function saveVerseHistory(history) {
    localStorage.setItem(VERSE_COOL_KEY, JSON.stringify(history));
}

/**
 * Record that a puzzle's verses were shown today.
 */
function recordPuzzleVerses(puzzle) {
    const history = loadVerseHistory();
    const today = getDayNumber();
    const refs = extractPuzzleVerseRefs(puzzle);
    for (const ref of refs) {
        history[ref] = today;
    }
    // Prune entries older than COOLING_DAYS to keep storage lean
    for (const [ref, day] of Object.entries(history)) {
        if (today - day > COOLING_DAYS) {
            delete history[ref];
        }
    }
    saveVerseHistory(history);
}

/**
 * Check how many of a puzzle's verses are still in cooling period.
 * Returns the count of "hot" (recently shown) verses.
 */
function countHotVerses(puzzle, history, today) {
    const refs = extractPuzzleVerseRefs(puzzle);
    let hot = 0;
    for (const ref of refs) {
        const lastShown = history[ref];
        if (lastShown !== undefined && (today - lastShown) < COOLING_DAYS && (today - lastShown) > 0) {
            hot++;
        }
    }
    return hot;
}

/**
 * Select the best puzzle from an array using verse cooling.
 * Uses a seeded deterministic base index (so all users get the same puzzle),
 * then picks the candidate with the fewest cooling conflicts.
 * Falls back to the base index if all candidates have conflicts.
 */
function getConnectionsPuzzleIndex(arr) {
    const today = getDayNumber();
    const history = loadVerseHistory();
    const baseIdx = today % arr.length;

    // Score all puzzles by how many hot verses they have
    const candidates = arr.map((puzzle, i) => ({
        index: i,
        hotCount: countHotVerses(puzzle, history, today)
    }));

    // Sort: prefer 0 hot verses, then fewer hot verses.
    // Among ties, prefer puzzles closest to the base index (wrapping).
    candidates.sort((a, b) => {
        if (a.hotCount !== b.hotCount) return a.hotCount - b.hotCount;
        // Distance from base index (circular)
        const distA = (a.index - baseIdx + arr.length) % arr.length;
        const distB = (b.index - baseIdx + arr.length) % arr.length;
        return distA - distB;
    });

    return candidates[0].index;
}

// ==================== SHUFFLE ====================
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ==================== TOAST & ANNOUNCEMENTS ====================
function showToast(msg, duration = 1800) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duration);
}

/** Announce a message to screen readers via the live region */
function announce(msg) {
    const el = document.getElementById('sr-announce');
    if (el) {
        el.textContent = '';
        // Small delay to ensure the live region picks up the change
        requestAnimationFrame(() => { el.textContent = msg; });
    }
}

// ==================== STATE MANAGEMENT ====================
const STATE_KEY = 'quranpuzzle_state';
const STATS_KEY = 'quranpuzzle_stats_v2'; // v2 = per-mode stats

function loadState() {
    try {
        return JSON.parse(localStorage.getItem(STATE_KEY)) || {};
    } catch { return {}; }
}

function saveState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function cleanupOldState(state) {
    const today = getDayNumber();
    const keysToRemove = [];
    for (const key of Object.keys(state)) {
        const match = key.match(/_(\d+)$/);
        if (match) {
            const dayNum = parseInt(match[1], 10);
            if (today - dayNum > 7) {
                keysToRemove.push(key);
            }
        }
    }
    keysToRemove.forEach(k => delete state[k]);
    if (keysToRemove.length > 0) saveState(state);
}

function createDefaultModeStats() {
    return {
        played: 0, won: 0, streak: 0, maxStreak: 0, lastDay: -1,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    };
}

function loadStats() {
    try {
        const raw = JSON.parse(localStorage.getItem(STATS_KEY));
        if (raw && raw.connections) return raw;
        // Return fresh per-mode stats
        return {
            connections: createDefaultModeStats(),
            wordle: createDefaultModeStats(),
            deduction: createDefaultModeStats(),
            scramble: createDefaultModeStats()
        };
    } catch {
        return {
            connections: createDefaultModeStats(),
            wordle: createDefaultModeStats(),
            deduction: createDefaultModeStats(),
            scramble: createDefaultModeStats()
        };
    }
}

function saveStats(stats) {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// ==================== MODAL FOCUS MANAGEMENT ====================
let _lastFocusedElement = null;

function openModal(modalId) {
    _lastFocusedElement = document.activeElement;
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    // Focus the close button inside the modal
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) setTimeout(() => closeBtn.focus(), 50);
    // Trap focus inside modal
    modal.addEventListener('keydown', trapFocus);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
    modal.removeEventListener('keydown', trapFocus);
    // Restore focus
    if (_lastFocusedElement) {
        _lastFocusedElement.focus();
        _lastFocusedElement = null;
    }
}

function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const modal = e.currentTarget;
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
}

// ==================== QURANIC AUDIO (EveryAyah CDN) ====================
const quranAudio = {
    reciter: 'Alafasy_128kbps',
    baseUrl: 'https://everyayah.com/data/',
    cache: {},       // Cache Audio objects by ref key
    current: null,   // Currently playing Audio
    playing: false
};

/** No-op kept for backward compatibility (was initTTS) */
function initTTS() { /* replaced by quranAudio */ }

/**
 * Parse a Quranic reference string into surah:ayah.
 * Handles formats: "59:23", "12:1-4", "112:1-4", "الإخلاص:4"
 * Returns { surah, ayah } or null if unparseable.
 */
function parseQuranRef(ref) {
    if (!ref) return null;
    // Try numeric format first: "59:23" or "12:1-4"
    const numMatch = ref.match(/(\d+):(\d+)/);
    if (numMatch) {
        return { surah: parseInt(numMatch[1]), ayah: parseInt(numMatch[2]) };
    }
    // Arabic surah name mapping (for refs like "الإخلاص:4")
    const surahNames = {
        'الفاتحة': 1, 'البقرة': 2, 'آل عمران': 3, 'النساء': 4, 'المائدة': 5,
        'الأنعام': 6, 'الأعراف': 7, 'الأنفال': 8, 'التوبة': 9, 'يونس': 10,
        'هود': 11, 'يوسف': 12, 'الرعد': 13, 'إبراهيم': 14, 'الحجر': 15,
        'النحل': 16, 'الإسراء': 17, 'الكهف': 18, 'مريم': 19, 'طه': 20,
        'الأنبياء': 21, 'الحج': 22, 'المؤمنون': 23, 'النور': 24, 'الفرقان': 25,
        'الشعراء': 26, 'النمل': 27, 'القصص': 28, 'العنكبوت': 29, 'الروم': 30,
        'لقمان': 31, 'السجدة': 32, 'الأحزاب': 33, 'سبأ': 34, 'فاطر': 35,
        'يس': 36, 'الصافات': 37, 'ص': 38, 'الزمر': 39, 'غافر': 40,
        'فصلت': 41, 'الشورى': 42, 'الزخرف': 43, 'الدخان': 44, 'الجاثية': 45,
        'الأحقاف': 46, 'محمد': 47, 'الفتح': 48, 'الحجرات': 49, 'ق': 50,
        'الذاريات': 51, 'الطور': 52, 'النجم': 53, 'القمر': 54, 'الرحمن': 55,
        'الواقعة': 56, 'الحديد': 57, 'المجادلة': 58, 'الحشر': 59, 'الممتحنة': 60,
        'الصف': 61, 'الجمعة': 62, 'المنافقون': 63, 'التغابن': 64, 'الطلاق': 65,
        'التحريم': 66, 'الملك': 67, 'القلم': 68, 'الحاقة': 69, 'المعارج': 70,
        'نوح': 71, 'الجن': 72, 'المزمل': 73, 'المدثر': 74, 'القيامة': 75,
        'الإنسان': 76, 'المرسلات': 77, 'النبأ': 78, 'النازعات': 79, 'عبس': 80,
        'التكوير': 81, 'الانفطار': 82, 'المطففين': 83, 'الانشقاق': 84, 'البروج': 85,
        'الطارق': 86, 'الأعلى': 87, 'الغاشية': 88, 'الفجر': 89, 'البلد': 90,
        'الشمس': 91, 'الليل': 92, 'الضحى': 93, 'الشرح': 94, 'التين': 95,
        'العلق': 96, 'القدر': 97, 'البينة': 98, 'الزلزلة': 99, 'العاديات': 100,
        'القارعة': 101, 'التكاثر': 102, 'العصر': 103, 'الهمزة': 104, 'الفيل': 105,
        'قريش': 106, 'الماعون': 107, 'الكوثر': 108, 'الكافرون': 109, 'النصر': 110,
        'المسد': 111, 'الإخلاص': 112, 'الفلق': 113, 'الناس': 114
    };
    const arMatch = ref.match(/([^:]+):(\d+)/);
    if (arMatch) {
        const surahNum = surahNames[arMatch[1].trim()];
        if (surahNum) return { surah: surahNum, ayah: parseInt(arMatch[2]) };
    }
    return null;
}

/**
 * Build the CDN URL for a specific ayah.
 * Format: https://everyayah.com/data/{reciter}/{surah3}{ayah3}.mp3
 */
function getAyahAudioUrl(surah, ayah) {
    const s = String(surah).padStart(3, '0');
    const a = String(ayah).padStart(3, '0');
    return `${quranAudio.baseUrl}${quranAudio.reciter}/${s}${a}.mp3`;
}

/**
 * Play Quranic recitation for a given ref string (e.g. "59:23").
 * Uses cached Audio objects for instant replay.
 * Returns the Audio element (or null if ref is unparseable).
 */
function playQuranAudio(ref, btnElement) {
    // Stop any currently playing audio
    stopQuranAudio();

    const parsed = parseQuranRef(ref);
    if (!parsed) return null;

    const key = `${parsed.surah}:${parsed.ayah}`;
    let audio = quranAudio.cache[key];

    if (!audio) {
        audio = new Audio(getAyahAudioUrl(parsed.surah, parsed.ayah));
        audio.preload = 'auto';
        quranAudio.cache[key] = audio;
    }

    // Update button state if provided
    if (btnElement) {
        btnElement.classList.add('loading');
        btnElement.setAttribute('aria-label', 'Loading recitation...');
    }

    audio.oncanplaythrough = () => {
        if (btnElement) {
            btnElement.classList.remove('loading');
            btnElement.classList.add('playing');
            btnElement.setAttribute('aria-label', 'Playing recitation');
        }
    };

    audio.onended = () => {
        quranAudio.playing = false;
        quranAudio.current = null;
        if (btnElement) {
            btnElement.classList.remove('playing', 'loading');
            btnElement.setAttribute('aria-label', 'Play recitation');
        }
    };

    audio.onerror = () => {
        quranAudio.playing = false;
        quranAudio.current = null;
        if (btnElement) {
            btnElement.classList.remove('playing', 'loading');
            btnElement.setAttribute('aria-label', 'Play recitation');
        }
    };

    audio.currentTime = 0;
    audio.play().catch(() => {
        // Autoplay blocked — user interaction required (already handled by click)
        if (btnElement) btnElement.classList.remove('loading');
    });

    quranAudio.current = audio;
    quranAudio.playing = true;
    return audio;
}

/** Stop any currently playing Quran audio */
function stopQuranAudio() {
    if (quranAudio.current) {
        quranAudio.current.pause();
        quranAudio.current.currentTime = 0;
        quranAudio.playing = false;
        quranAudio.current = null;
    }
    // Also remove playing/loading classes from any buttons
    document.querySelectorAll('.verse-play-btn.playing, .verse-play-btn.loading').forEach(btn => {
        btn.classList.remove('playing', 'loading');
    });
}

/**
 * Legacy speakArabic — now a no-op for tile long-press.
 * Tile pronunciation is handled by quranAudio for verses only.
 */
function speakArabic(text) {
    // No-op: replaced by playQuranAudio for verse recitation
}

// ==================== WORD-BY-WORD API (Quran.com) ====================
const wbwCache = {}; // Cache word-by-word data by verse key

/**
 * Fetch word-by-word data for a verse from the Quran.com API.
 * Returns an array of { arabic, translation } objects.
 * Caches results to avoid repeat API calls.
 */
async function fetchWordByWord(ref) {
    const parsed = parseQuranRef(ref);
    if (!parsed) return null;
    const key = `${parsed.surah}:${parsed.ayah}`;
    if (wbwCache[key]) return wbwCache[key];

    try {
        const resp = await fetch(
            `https://api.quran.com/api/v4/verses/by_key/${key}?language=en&words=true&word_fields=text_uthmani,translation`
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        const words = (data.verse?.words || []).filter(w => w.char_type_name === 'word').map(w => ({
            arabic: w.text_uthmani || w.text,
            translation: w.translation?.text || ''
        }));
        if (words.length > 0) {
            wbwCache[key] = words;
            return words;
        }
    } catch (e) {
        console.warn('WBW fetch failed for', key, e);
    }
    return null;
}

// ==================== ARABIC NORMALIZATION ====================
function normalizeArabic(str) {
    return str.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '');
}
