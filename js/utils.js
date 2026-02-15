/* ============================================
   QURANIQ - SHARED UTILITIES
   ============================================ */

// ==================== UTC DAY CALCULATION ====================
const EPOCH = Date.UTC(2025, 0, 1); // Jan 1 2025 UTC
const LAUNCH_DATE = Date.UTC(2026, 1, 8); // Feb 8 2026 UTC — first daily puzzle
const DAY_MS = 86400000;

function getDayNumber() {
    const now = Date.now();
    return Math.floor((now - EPOCH) / DAY_MS);
}

/**
 * Sequential puzzle number starting from #1 on launch day (Feb 8 2026).
 * All 4 games share the same number for a given day.
 */
function getPuzzleNumber() {
    const now = Date.now();
    return Math.floor((now - LAUNCH_DATE) / DAY_MS) + 1;
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
    // Don't persist game state when serving yesterday's stale puzzle.
    // This prevents stale data from conflicting when the fresh puzzle arrives.
    if (typeof isServingStale === 'function' && isServingStale()) return;
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
    const alreadyOpen = document.querySelectorAll('.modal:not(.hidden)');

    // If no modal is open, save the current focus
    if (alreadyOpen.length === 0) {
        _lastFocusedElement = document.activeElement;
    }

    // Close any other open modals first
    alreadyOpen.forEach(m => {
        if (m.id !== modalId) {
            m.classList.add('hidden');
            m.removeEventListener('keydown', trapFocus);
            // Stop audio if it was a result modal
            if (m.id === 'result-modal' && typeof stopQuranAudio === 'function') {
                stopQuranAudio();
            }
        }
    });

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
    // Stop audio when closing result modal
    if (modalId === 'result-modal' && typeof stopQuranAudio === 'function') {
        stopQuranAudio();
    }
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
 * Advanced Arabic normalization for matching words.
 * Strips diacritics, normalizes alef variants, hamzas, etc.
 */
function normalizeForMatch(str) {
    if (!str) return '';
    return str
        .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '') // strip tashkeel/diacritics
        .replace(/\u0670/g, '\u0627') // superscript alef -> regular alef
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

/**
 * Further simplify for fuzzy matching - remove hamza carriers and normalize away differences.
 */
function deepNormalize(str) {
    if (!str) return '';
    return str
        .replace(/[\u0621\u0623\u0625\u0624\u0626\u0622]/g, '') // remove all hamza forms
        .replace(/\u0648(?=[\u064A\u0627])/g, ''); // remove و before ي/ا (handles رؤيا vs ريا)
}

/**
 * Strip common prefixes for root comparison - only for words long enough.
 */
function stripPrefixes(str) {
    if (!str) return '';
    // Don't strip from very short words (3 chars or less after stripping would be too short)
    const prefixes = ['وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ل', 'ك'];
    for (const p of prefixes) {
        if (str.startsWith(p) && str.length > p.length + 2) {
            return str.slice(p.length);
        }
    }
    return str;
}

/**
 * Strip common suffixes - only for words long enough.
 */
function stripSuffixes(str) {
    if (!str || str.length <= 3) return str || ''; // don't strip from very short words
    return str.replace(/(ون|ين|ات|ها|هم|هن|كم|نا|ى|ه|ا)$/, '');
}

/**
 * Speak Arabic text using Quranic word-by-word audio if a reference is provided,
 * otherwise falling back to client-side Text-to-Speech (Web Speech API).
 * @param {string} text - The Arabic text to speak (usually a single word)
 * @param {string} [ref] - Optional Quranic reference for high-quality audio
 */
async function speakArabic(text, ref) {
    if (!text) return;
    const cleanText = normalizeForMatch(text);

    // 1. Try high-quality word-by-word audio if ref is available
    if (ref) {
        try {
            const words = await fetchWordByWord(ref);
            if (words && words.length > 0) {
                const cleanRoot = stripSuffixes(stripPrefixes(cleanText));

                // Find the word in the verse that matches our text
                const match = words.find(w => {
                    if (w.isSeparator) return false;
                    const wNorm = normalizeForMatch(w.arabic);
                    if (wNorm === cleanText) return true;

                    // Root-to-root match
                    const wRoot = stripSuffixes(stripPrefixes(wNorm));
                    return wRoot === cleanRoot && wRoot.length >= 2;
                });

                if (match && match.audio_url) {
                    const audioUrl = `https://audio.quran.com/${match.audio_url}`;
                    const audio = new Audio(audioUrl);
                    audio.play().catch(e => {
                        console.warn('WBW audio play failed, falling back to TTS', e);
                        speakWithTTS(text);
                    });
                    return;
                }
            }
        } catch (e) {
            console.warn('WBW audio fetch failed', e);
        }
    }

    // 2. Fallback to client-side TTS
    speakWithTTS(text);
}

/** 
 * Internal helper for browser-based Arabic TTS 
 * Handles diacritics better by stripping them if needed, or keeping them
 * depending on browser support.
 */
function speakWithTTS(text) {
    if (!window.speechSynthesis) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA'; // Standard Arabic
    utterance.rate = 0.9;     // Slightly slower for clarity

    // Try to find a high-quality Arabic voice if available
    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find(v => v.lang.startsWith('ar')) || voices.find(v => v.name.includes('Arabic'));
    if (arVoice) utterance.voice = arVoice;

    window.speechSynthesis.speak(utterance);
}

/**
 * Extract a surah:ayah reference from a text string.
 * Handles patterns like: "(21:87)", "7:156", "Surah Al-Fatiha (1:1)"
 * Returns the first match as "surah:ayah" string or null.
 */
function extractVerseRef(text) {
    if (!text) return null;
    const m = text.match(/(\d{1,3}):(\d{1,3})/);
    return m ? `${m[1]}:${m[2]}` : null;
}

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
 * Get the English transliterated Surah name from a surah number.
 * Returns the name string or null if not found.
 */
function getSurahName(surahNum) {
    const names = {
        1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali \'Imran', 4: 'An-Nisa', 5: 'Al-Ma\'idah',
        6: 'Al-An\'am', 7: 'Al-A\'raf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
        11: 'Hud', 12: 'Yusuf', 13: 'Ar-Ra\'d', 14: 'Ibrahim', 15: 'Al-Hijr',
        16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
        21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Mu\'minun', 24: 'An-Nur', 25: 'Al-Furqan',
        26: 'Ash-Shu\'ara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-\'Ankabut', 30: 'Ar-Rum',
        31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
        36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
        41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiyah',
        46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
        51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
        56: 'Al-Waqi\'ah', 57: 'Al-Hadid', 58: 'Al-Mujadila', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
        61: 'As-Saff', 62: 'Al-Jumu\'ah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
        66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Ma\'arij',
        71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
        76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Nazi\'at', 80: '\'Abasa',
        81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
        86: 'At-Tariq', 87: 'Al-A\'la', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
        91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
        96: 'Al-\'Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-\'Adiyat',
        101: 'Al-Qari\'ah', 102: 'At-Takathur', 103: 'Al-\'Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
        106: 'Quraysh', 107: 'Al-Ma\'un', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
        111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas'
    };
    return names[surahNum] || null;
}

/**
 * Play a Quranic verse audio from EveryAyah CDN.
 * @param {string} ref - Quranic reference like "59:23"
 * @param {HTMLElement} [btn] - Optional play button to update icon
 */
function playQuranAudio(ref, btn) {
    trackVerseAudioPlay(ref, 'user');
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
    audio.play().then(() => {
        // Track this verse as actively explored (user heard the recitation)
        trackVerses([ref]);
    }).catch(() => {
        quranAudio.playing = false;
        if (btn) btn.textContent = '▶';
    });
}

// ==================== WORD-BY-WORD API ====================
const wbwCache = {}; // Cache word-by-word data by verse key

/**
 * Fetch word-by-word data for a verse. If the verse is short (3 words or fewer),
 * automatically fetches the next verse too and appends it for context.
 * A visual separator (۝) is inserted between the two verses.
 */
async function fetchWordByWord(ref) {
    const parsed = parseQuranRef(ref);
    if (!parsed) return null;
    const key = `${parsed.surah}:${parsed.ayah}`;
    if (wbwCache[key]) return wbwCache[key];
    try {
        const resp = await fetch(
            `https://api.quran.com/api/v4/verses/by_key/${key}?language=en&words=true&word_fields=text_uthmani,translation,audio_url`
        );
        if (!resp.ok) return null;
        const data = await resp.json();
        let words = (data.verse?.words || []).filter(w => w.char_type_name === 'word').map(w => ({
            arabic: w.text_uthmani || w.text,
            translation: w.translation?.text || '',
            audio_url: w.audio_url
        }));

        // If the verse is short (3 words or fewer), fetch the next verse for context
        if (words.length > 0 && words.length <= 3) {
            const nextAyah = parsed.ayah + 1;
            const nextKey = `${parsed.surah}:${nextAyah}`;
            try {
                const nextResp = await fetch(
                    `https://api.quran.com/api/v4/verses/by_key/${nextKey}?language=en&words=true&word_fields=text_uthmani,translation,audio_url`
                );
                if (nextResp.ok) {
                    const nextData = await nextResp.json();
                    const nextWords = (nextData.verse?.words || []).filter(w => w.char_type_name === 'word').map(w => ({
                        arabic: w.text_uthmani || w.text,
                        translation: w.translation?.text || '',
                        audio_url: w.audio_url
                    }));
                    if (nextWords.length > 0) {
                        // Add a verse separator marker, then append next verse words
                        words.push({ arabic: '۝', translation: `— ${nextKey} —`, isSeparator: true });
                        words = words.concat(nextWords);
                    }
                }
            } catch (e) {
                // Silently ignore — showing just the short verse is fine
            }
        }

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
 * Formula: 25% win rate + 15% streak (cap 15) + 20% games (cap 100) + 20% Quran% + 20% days active (cap 60)
 */
function calculatePlayerScore() {
    const stats = loadStats();
    const verseStats = getVerseStats();
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
    const gamesFactor = Math.min(totalPlayed / 100, 1);
    const quranFactor = Math.min((verseStats.quranPercent || 0) / 100, 1);
    const daysActive = Math.ceil(totalPlayed / 4);
    const daysFactor = Math.min(daysActive / 60, 1);
    return Math.round(winRate * 25 + streakFactor * 15 + gamesFactor * 20 + quranFactor * 20 + daysFactor * 20);
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
    // Collect Firebase group data for restore
    let fbData = null;
    try {
        const fbGroups = JSON.parse(localStorage.getItem('quraniq_fb_groups') || '{}');
        const fbUid = (typeof FB_STATE !== 'undefined' && FB_STATE.user) ? FB_STATE.user.uid : null;
        const displayName = localStorage.getItem('quraniq_display_name') || '';
        if (fbUid || (fbGroups.groups && Object.keys(fbGroups.groups).length > 0)) {
            fbData = {
                uid: fbUid,
                displayName: displayName,
                groups: fbGroups.groups || {},
                activeGroupCode: fbGroups.activeGroupCode || null
            };
        }
    } catch (e) {
        console.warn('[Export] Could not collect Firebase data:', e);
    }

    const data = {
        v: 2, // version 2: includes Firebase group data
        stats: JSON.parse(localStorage.getItem(STATS_KEY) || '{}'),
        verses: JSON.parse(localStorage.getItem(VERSES_KEY) || '{"refs":[]}'),
        playerId: getPlayerId(),
        theme: localStorage.getItem('quraniq_theme') || 'dark',
        percentile: JSON.parse(localStorage.getItem('quraniq_percentile') || 'null'),
        firebase: fbData,
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

        // Restore Firebase group data (v2+)
        if (data.firebase) {
            const fb = data.firebase;
            // Restore display name
            if (fb.displayName) {
                localStorage.setItem('quraniq_display_name', fb.displayName);
            }
            // Restore local group cache for instant UI
            if (fb.groups && Object.keys(fb.groups).length > 0) {
                localStorage.setItem('quraniq_fb_groups', JSON.stringify({
                    groups: fb.groups,
                    activeGroupCode: fb.activeGroupCode
                }));
            }
            // Set pending migration: old UID + group codes
            // On next Firebase init, the new UID will re-join these groups
            if (fb.uid && fb.groups) {
                localStorage.setItem('quraniq_fb_migration', JSON.stringify({
                    oldUid: fb.uid,
                    groupCodes: Object.keys(fb.groups),
                    displayName: fb.displayName || '',
                    timestamp: new Date().toISOString()
                }));
            }
        }

        return { success: true, message: `Progress restored! Stats and groups from ${data.exported ? new Date(data.exported).toLocaleDateString() : 'backup'} loaded.` };
    } catch (e) {
        return { success: false, message: 'Failed to restore: ' + e.message };
    }
}

// ==================== ARABIC NORMALIZATION ====================
function normalizeArabic(str) {
    return str.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '');
}

// ==================== DAILY PUZZLE LOADING (STALE-TOLERANT) ====================

// Global flag: set to true when serving stale (yesterday's) puzzles.
// When true, stats should NOT be recorded to avoid double-counting.
let _servingStale = false;
function isServingStale() { return _servingStale; }

// The date of the puzzle currently being served (YYYY-MM-DD).
// Used by Firebase score submission to ensure scores are written under
// the correct date key (the puzzle's date, not the current UTC date).
let _activePuzzleDate = null;
function getActivePuzzleDate() { return _activePuzzleDate; }

/**
 * Convert a date string (YYYY-MM-DD) to the dayNumber used for state keys.
 * This ensures stale puzzles use the original day's state key.
 */
function dateToDayNumber(dateStr) {
    const d = new Date(dateStr + 'T00:00:00Z');
    return Math.floor((d.getTime() - EPOCH) / DAY_MS);
}

/**
 * Shared daily puzzle loader.
 * 1. Tries to load today's puzzle from the data file.
 * 2. If today's isn't ready yet, serves yesterday's puzzle (the stale one)
 *    and starts background polling every 60s.
 * 3. When the fresh puzzle finally arrives, reloads the page so all games
 *    pick up the new data cleanly.
 *
 * @param {string} dataFile - JSON file name (e.g., 'daily_puzzle.json')
 * @param {Function} onLoaded - Callback with puzzle data when loaded
 * @param {Function} [extractPuzzle] - Optional transform on the raw JSON data
 */
function loadDailyWithHolding(dataFile, sectionId, gameName, onLoaded, extractPuzzle) {
    const today = new Date().toISOString().slice(0, 10);

    fetch(`data/${dataFile}?t=${Date.now()}`)
        .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.json(); })
        .then(data => {
            if (!data.generated || !data.puzzle) {
                throw new Error('no puzzle');
            }
            const puzzle = extractPuzzle ? extractPuzzle(data) : data.puzzle;

            // Store the puzzle date globally for Firebase score keying
            _activePuzzleDate = data.date;

            if (data.date === today) {
                // Fresh puzzle — serve normally
                onLoaded(puzzle, false);
            } else {
                // Stale puzzle — override dayNumber to match the puzzle's date
                // so the state key (e.g., conn_407) matches yesterday's saved state.
                // This preserves the user's completed game instead of resetting it.
                _servingStale = true;
                if (typeof app !== 'undefined') {
                    app.dayNumber = dateToDayNumber(data.date);
                }
                onLoaded(puzzle, true);
                startStalePoll(dataFile, today);
            }
        })
        .catch(() => {
            // Complete failure (no file at all) — nothing to show
            // This shouldn't happen in production since the file always exists
            console.warn(`Failed to load ${dataFile}`);
        });
}

/** Background-poll for today's puzzle; reload the page when it arrives. */
let _stalePollStarted = false;
function startStalePoll(dataFile, today) {
    if (_stalePollStarted) return; // Only one poller across all games
    _stalePollStarted = true;

    const poll = setInterval(() => {
        fetch(`data/${dataFile}?t=${Date.now()}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && data.generated && data.date === today) {
                    clearInterval(poll);
                    // Fresh puzzle arrived — reload the whole page for clean state
                    window.location.reload();
                }
            })
            .catch(() => { }); // Silently retry
    }, 60000); // Check every 60 seconds
}
