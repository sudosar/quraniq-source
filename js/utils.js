/* ============================================
   QURANIQ - SHARED UTILITIES
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
const STATE_KEY = 'quraniq_state';
const STATS_KEY = 'quraniq_stats_v2'; // v2 = per-mode stats

// Migrate old QuranPuzzle keys to QuranIQ keys
(function migrateKeys() {
    if (!localStorage.getItem('quraniq_state') && localStorage.getItem('quranpuzzle_state')) {
        localStorage.setItem('quraniq_state', localStorage.getItem('quranpuzzle_state'));
        localStorage.removeItem('quranpuzzle_state');
    }
    if (!localStorage.getItem('quraniq_stats_v2') && localStorage.getItem('quranpuzzle_stats_v2')) {
        localStorage.setItem('quraniq_stats_v2', localStorage.getItem('quranpuzzle_stats_v2'));
        localStorage.removeItem('quranpuzzle_stats_v2');
    }
})();

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
        const name = arMatch[1].trim();
        if (surahNames[name]) {
            return { surah: surahNames[name], ayah: parseInt(arMatch[2]) };
        }
    }
    return null;
}

/**
 * Play a Quranic verse audio from EveryAyah CDN.
 * @param {string} ref - Quranic reference like "59:23"
 * @param {HTMLElement} [btn] - Optional play button to update icon
 */
function playQuranAudio(ref, btn) {
    return playVerseAudio(ref, btn);
}

function stopQuranAudio() {
    if (quranAudio.current) {
        quranAudio.current.pause();
        quranAudio.current.currentTime = 0;
        quranAudio.playing = false;
        document.querySelectorAll('.verse-play-btn').forEach(b => {
            b.textContent = '\u25B6';
            b.classList.remove('playing');
        });
    }
}

function playVerseAudio(ref, btn) {
    const parsed = parseQuranRef(ref);
    if (!parsed) return;

    const { surah, ayah } = parsed;
    const key = `${surah}:${ayah}`;

    // If already playing this verse, stop it
    if (quranAudio.playing && quranAudio.current && quranAudio.current._key === key) {
        quranAudio.current.pause();
        quranAudio.current.currentTime = 0;
        quranAudio.playing = false;
        if (btn) btn.textContent = '▶';
        return;
    }

    // Stop any currently playing audio
    if (quranAudio.current) {
        quranAudio.current.pause();
        quranAudio.current.currentTime = 0;
        // Reset previous button
        document.querySelectorAll('.verse-play-btn').forEach(b => b.textContent = '▶');
    }

    // Build EveryAyah URL: padded surah (3 digits) + padded ayah (3 digits)
    const surahPad = String(surah).padStart(3, '0');
    const ayahPad = String(ayah).padStart(3, '0');
    const url = `${quranAudio.baseUrl}${quranAudio.reciter}/${surahPad}${ayahPad}.mp3`;

    let audio = quranAudio.cache[key];
    if (!audio) {
        audio = new Audio(url);
        audio._key = key;
        quranAudio.cache[key] = audio;
    }

    if (btn) btn.textContent = '⏸';
    quranAudio.current = audio;
    quranAudio.playing = true;

    audio.onended = () => {
        quranAudio.playing = false;
        if (btn) btn.textContent = '▶';
    };
    audio.onerror = () => {
        quranAudio.playing = false;
        if (btn) btn.textContent = '▶';
    };

    audio.currentTime = 0;
    audio.play().catch(() => {
        quranAudio.playing = false;
        if (btn) btn.textContent = '▶';
    });
}

// ==================== WORD-BY-WORD API ====================
const wbwCache = {}; // Cache word-by-word data by verse key

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

// ==================== VERSE TRACKING ====================
const VERSES_KEY = 'quraniq_verses';

/**
 * Load the set of unique verse references the player has encountered.
 * Returns { refs: ['3:3', '19:7', ...], surahs: Set([3, 19, ...]) }
 */
function loadVerseTracker() {
    try {
        const data = JSON.parse(localStorage.getItem(VERSES_KEY));
        if (data && Array.isArray(data.refs)) return data;
        return { refs: [] };
    } catch { return { refs: [] }; }
}

/**
 * Track new verse references encountered during a game.
 * @param {string[]} newRefs - Array of reference strings like '3:3', '19:7', 'Surah Al-Fatihah (1:5)'
 */
function trackVerses(newRefs) {
    const tracker = loadVerseTracker();
    const existing = new Set(tracker.refs);
    let added = 0;
    newRefs.forEach(ref => {
        // Normalize: extract surah:ayah from various formats
        const parsed = parseQuranRef(ref);
        if (parsed) {
            const key = `${parsed.surah}:${parsed.ayah}`;
            if (!existing.has(key)) {
                existing.add(key);
                added++;
            }
        }
    });
    if (added > 0) {
        tracker.refs = Array.from(existing);
        localStorage.setItem(VERSES_KEY, JSON.stringify(tracker));
    }
    return { total: existing.size, added };
}

/**
 * Get verse stats for display in Insights.
 * Returns { totalVerses, uniqueSurahs, quranPercent }
 */
function getVerseStats() {
    const tracker = loadVerseTracker();
    const surahs = new Set();
    tracker.refs.forEach(ref => {
        const match = ref.match(/(\d+):/);
        if (match) surahs.add(parseInt(match[1]));
    });
    return {
        totalVerses: tracker.refs.length,
        uniqueSurahs: surahs.size,
        quranPercent: Math.round((tracker.refs.length / 6236) * 1000) / 10 // 1 decimal
    };
}

// ==================== ANONYMOUS LEADERBOARD ====================
const PLAYER_ID_KEY = 'quraniq_player_id';
const SCORE_ENDPOINT = 'https://script.google.com/macros/s/AKfycbylXgj7bNBzWfq4Nxwz0jEOP1mLF-jvy_ngxC_lctnJCro2j6a-AUQujB4xxeTKw6XEqA/exec';

/**
 * Get or create a persistent anonymous player ID.
 * This is a random hash — no personal info.
 */
function getPlayerId() {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
        // Generate a random 8-char hex ID
        const arr = new Uint8Array(4);
        crypto.getRandomValues(arr);
        id = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
}

/**
 * Calculate the player's overall score (0-100) based on their stats.
 * Formula: 40% win rate + 30% streak (cap 15) + 30% games played (cap 30)
 */
function calculatePlayerScore() {
    const stats = loadStats();
    const modes = ['connections', 'wordle', 'deduction', 'scramble'];
    let totalPlayed = 0, totalWon = 0, bestStreak = 0;
    modes.forEach(m => {
        const s = stats[m];
        totalPlayed += s.played;
        totalWon += s.won;
        bestStreak = Math.max(bestStreak, s.maxStreak);
    });
    const winRate = totalPlayed > 0 ? totalWon / totalPlayed : 0;
    const streakFactor = Math.min(bestStreak / 15, 1);
    const gamesFactor = Math.min(totalPlayed / 30, 1);
    return Math.round(winRate * 40 + streakFactor * 30 + gamesFactor * 30);
}

/**
 * Submit the player's score to the leaderboard and get real percentile.
 * Returns { percentile, totalPlayers } or null if endpoint not configured.
 */
async function submitScore() {
    if (!SCORE_ENDPOINT) return null;
    try {
        const stats = loadStats();
        const verseStats = getVerseStats();
        const modes = ['connections', 'wordle', 'deduction', 'scramble'];
        let totalPlayed = 0, totalWon = 0, bestStreak = 0;
        modes.forEach(m => {
            totalPlayed += stats[m].played;
            totalWon += stats[m].won;
            bestStreak = Math.max(bestStreak, stats[m].maxStreak);
        });
        const score = calculatePlayerScore();
        const payload = {
            id: getPlayerId(),
            score: score,
            games: totalPlayed,
            wins: totalWon,
            streak: bestStreak,
            versesExplored: verseStats.totalVerses
        };
        const resp = await fetch(SCORE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // Apps Script requires text/plain for CORS
            body: JSON.stringify(payload)
        });
        if (!resp.ok) return null;
        const result = await resp.json();
        // Cache the result locally
        localStorage.setItem('quraniq_percentile', JSON.stringify({
            percentile: result.percentile,
            totalPlayers: result.totalPlayers,
            updated: new Date().toISOString()
        }));
        return result;
    } catch (e) {
        console.warn('Score submission failed:', e);
        return null;
    }
}

/**
 * Get the cached percentile data (from last submission).
 * Returns { percentile, totalPlayers, updated } or null.
 */
function getCachedPercentile() {
    try {
        return JSON.parse(localStorage.getItem('quraniq_percentile'));
    } catch { return null; }
}

/**
 * Fetch current leaderboard stats (GET request).
 * Returns { totalPlayers, brackets, avgScore } or null.
 */
async function fetchLeaderboard() {
    if (!SCORE_ENDPOINT) return null;
    try {
        const resp = await fetch(SCORE_ENDPOINT);
        if (!resp.ok) return null;
        return await resp.json();
    } catch { return null; }
}

// ==================== PROGRESS SAVE/RESTORE ====================

/**
 * Export all player data as a compact Base64 string.
 * Includes: stats, verses, player ID, theme.
 */
function exportProgress() {
    const data = {
        v: 1, // version for future compatibility
        stats: JSON.parse(localStorage.getItem(STATS_KEY) || '{}'),
        verses: JSON.parse(localStorage.getItem(VERSES_KEY) || '{"refs":[]}'),
        playerId: getPlayerId(),
        theme: localStorage.getItem('quraniq_theme') || 'dark',
        percentile: JSON.parse(localStorage.getItem('quraniq_percentile') || 'null'),
        exported: new Date().toISOString()
    };
    const json = JSON.stringify(data);
    // Encode to Base64 (handle Unicode)
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return 'QIQ:' + encoded;
}

/**
 * Import player data from a Base64 save string.
 * Returns { success: boolean, message: string }
 */
function importProgress(saveString) {
    try {
        if (!saveString || !saveString.startsWith('QIQ:')) {
            return { success: false, message: 'Invalid save code. It should start with QIQ:' };
        }
        const encoded = saveString.substring(4); // Remove 'QIQ:' prefix
        const json = decodeURIComponent(escape(atob(encoded)));
        const data = JSON.parse(json);

        if (!data.v || !data.stats) {
            return { success: false, message: 'Invalid or corrupted save data.' };
        }

        // Restore stats
        if (data.stats) {
            localStorage.setItem(STATS_KEY, JSON.stringify(data.stats));
        }
        // Restore verses
        if (data.verses) {
            // Merge with existing verses (don't lose any)
            const existing = loadVerseTracker();
            const merged = new Set([...existing.refs, ...(data.verses.refs || [])]);
            localStorage.setItem(VERSES_KEY, JSON.stringify({ refs: Array.from(merged) }));
        }
        // Restore player ID
        if (data.playerId) {
            localStorage.setItem(PLAYER_ID_KEY, data.playerId);
        }
        // Restore theme
        if (data.theme) {
            localStorage.setItem('quraniq_theme', data.theme);
        }
        // Restore cached percentile
        if (data.percentile) {
            localStorage.setItem('quraniq_percentile', JSON.stringify(data.percentile));
        }

        return { success: true, message: `Progress restored! Stats from ${data.exported ? new Date(data.exported).toLocaleDateString() : 'backup'} loaded.` };
    } catch (e) {
        return { success: false, message: 'Failed to restore: ' + e.message };
    }
}

// ==================== ARABIC NORMALIZATION ====================
function normalizeArabic(str) {
    return str.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '');
}
