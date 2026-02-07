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

// ==================== ARABIC TEXT-TO-SPEECH ====================
const tts = {
    supported: 'speechSynthesis' in window,
    speaking: false,
    voice: null,
    _resolved: false
};

/** Pre-resolve the best Arabic voice (call once on load) */
function initTTS() {
    if (!tts.supported) return;
    const pickVoice = () => {
        const voices = speechSynthesis.getVoices();
        // Prefer ar-SA, then any ar-* voice
        tts.voice = voices.find(v => v.lang === 'ar-SA')
                 || voices.find(v => v.lang.startsWith('ar'))
                 || null;
        tts._resolved = true;
    };
    pickVoice();
    if (!tts._resolved || speechSynthesis.getVoices().length === 0) {
        speechSynthesis.addEventListener('voiceschanged', pickVoice, { once: true });
    }
}

/** Speak Arabic text. Cancels any ongoing speech first. */
function speakArabic(text) {
    if (!tts.supported || !text) return;
    // Cancel any ongoing speech to avoid overlap
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ar-SA';
    utter.rate = 0.9;  // Slightly slower for clarity
    if (tts.voice) utter.voice = tts.voice;
    utter.onstart = () => { tts.speaking = true; };
    utter.onend = () => { tts.speaking = false; };
    utter.onerror = () => { tts.speaking = false; };
    speechSynthesis.speak(utter);
}

// ==================== ARABIC NORMALIZATION ====================
function normalizeArabic(str) {
    return str.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '');
}
