/**
 * QuranIQ Kids - Game Engine
 * 
 * PROGRESSIVE LEARNING DESIGN:
 * 
 * For the FIRST letter ever (Alif, no prior knowledge):
 *   1. Letter Intro — Meet the letter with animation and sound
 *   2. Word Cards — Show Arabic words starting with this letter + emoji pictures
 *   3. Tracing — Trace the letter shape
 *   4. Find in Word — Spot the letter highlighted in Quranic words
 *   5. Drag to Match — Drag the letter to its matching picture (solo, just 1 target)
 *   6. Bubble Pop (solo) — Only this letter in different sizes/colors, no distractors
 * 
 * For letters when child knows 1-2 previous letters:
 *   1. Letter Intro
 *   2. Word Cards
 *   3. Tracing
 *   4. Find in Word
 *   5. Drag to Match — Drag letter to correct picture among distractors
 *   6. Letter Slot — Fill in the missing letter in a word
 *   7. Bubble Pop — with 1-2 known distractors
 *   8. Sound Match — pick from this letter + known ones
 * 
 * For letters when child knows 3+ previous letters:
 *   1. Letter Intro
 *   2. Word Cards
 *   3. Tracing
 *   4. Find in Word
 *   5. Drag to Match — Drag letter to correct picture among distractors
 *   6. Letter Slot — Fill in the missing letter in a word
 *   7. Sort Letters — Sort letters into correct baskets
 *   8. Bubble Pop — with known distractors
 *   9. Sound Match — pick from known letters
 *   10. Catch Game — catch this letter, avoid known ones
 *   11. Memory Match — match this letter + a few known ones
 */

export type GameType = 
  | 'letter-intro'    // Animated letter reveal with sound
  | 'word-cards'      // Show words starting with this letter + pictures
  | 'tracing'         // Trace the letter with guided path + particles
  | 'find-in-word'    // Spot the letter in Quranic words
  | 'drag-to-match'   // Drag the letter to its matching picture
  | 'letter-slot'     // Drag correct letter into blank in a word
  | 'sort-letters'    // Sort letters into correct baskets
  | 'bubble-pop'      // Pop the correct letter among floating bubbles
  | 'sound-match'     // Hear a sound, pick the right letter
  | 'harakat'         // Teach fatha/kasra/damma recitation + quiz
  | 'combine-letters' // Blend letter sounds together (ba + a = baa)
  | 'word-building'   // Build Quranic words from syllable blends
  | 'catch-game'      // Letters fall, catch the correct one
  | 'memory-match'    // Flip cards to match letter pairs

export interface GameConfig {
  type: GameType;
  title: string;
  description: string;
  icon: string;
  difficulty: number;
  requiresDistractors: boolean; // whether this game needs other letters
  minDistractors: number;       // minimum known letters needed
}

// All possible games in progressive order
const allGames: GameConfig[] = [
  { type: 'letter-intro', title: 'Meet the Letter', description: 'See and hear the letter come alive!', icon: '✨', difficulty: 1, requiresDistractors: false, minDistractors: 0 },
  { type: 'word-cards', title: 'Word Time', description: 'See words that start with this letter!', icon: '🖼️', difficulty: 1, requiresDistractors: false, minDistractors: 0 },
  { type: 'tracing', title: 'Trace It', description: 'Draw the letter with sparkles!', icon: '✏️', difficulty: 1, requiresDistractors: false, minDistractors: 0 },
  { type: 'find-in-word', title: 'Find the Letter', description: 'Spot the letter in Quranic words!', icon: '🔍', difficulty: 1, requiresDistractors: false, minDistractors: 0 },
  { type: 'drag-to-match', title: 'Match the Picture', description: 'Drag the letter to its picture!', icon: '🎯', difficulty: 1, requiresDistractors: false, minDistractors: 0 }, // works solo or with distractors
  { type: 'letter-slot', title: 'Complete the Word', description: 'Fill in the missing letter!', icon: '🧩', difficulty: 2, requiresDistractors: true, minDistractors: 1 },
  { type: 'sort-letters', title: 'Sort Letters', description: 'Put letters in the right basket!', icon: '🧺', difficulty: 2, requiresDistractors: true, minDistractors: 1 },
  { type: 'bubble-pop', title: 'Bubble Pop', description: 'Pop the right letter bubbles!', icon: '🫧', difficulty: 1, requiresDistractors: false, minDistractors: 0 }, // works with or without distractors
  { type: 'sound-match', title: 'Sound Match', description: 'Which letter makes this sound?', icon: '🔊', difficulty: 2, requiresDistractors: true, minDistractors: 1 },
  { type: 'harakat', title: 'Letter Sounds', description: 'Learn fatha, kasra & damma!', icon: '🎵', difficulty: 1, requiresDistractors: false, minDistractors: 0 },
  { type: 'combine-letters', title: 'Combine Letters', description: 'Blend sounds together!', icon: '🔗', difficulty: 1, requiresDistractors: false, minDistractors: 0 },
  { type: 'word-building', title: 'Build Words', description: 'Build Quranic words from syllables!', icon: '🏗️', difficulty: 1, requiresDistractors: false, minDistractors: 0 },
  { type: 'catch-game', title: 'Letter Catch', description: 'Catch the falling letters!', icon: '🎪', difficulty: 2, requiresDistractors: true, minDistractors: 2 },
  { type: 'memory-match', title: 'Memory Match', description: 'Find the matching pairs!', icon: '🃏', difficulty: 2, requiresDistractors: true, minDistractors: 2 },
];

/**
 * Get the appropriate game sequence based on how many letters the child already knows.
 * This is the core progressive logic.
 */
export function getProgressiveGameSequence(availableDistractorCount: number): GameConfig[] {
  const sequence: GameConfig[] = [];
  
  for (const game of allGames) {
    if (!game.requiresDistractors) {
      // Always include games that don't need distractors
      sequence.push(game);
    } else if (availableDistractorCount >= game.minDistractors) {
      // Only include distractor games if child knows enough letters
      sequence.push(game);
    }
  }
  
  return sequence;
}

// ============================================================
// SOUND UTILITIES
// ============================================================

/**
 * Robust Arabic speech synthesis that handles Chrome desktop quirks:
 * 
 * Chrome desktop issues:
 * 1. Voices load asynchronously — getVoices() returns [] until onvoiceschanged fires
 * 2. speechSynthesis.speak() requires a user gesture (click/tap) to work
 * 3. Chrome has a bug where speech gets "stuck" — cancel() + small delay fixes it
 * 4. If speak() is called without user gesture, it silently fails AND can block future calls
 * 
 * Our solution:
 * - Always cancel before speaking (clears stuck state)
 * - Add a small delay after cancel before speaking (Chrome needs this)
 * - Track whether user has interacted (for auto-play decisions)
 * - Use onvoiceschanged to cache the Arabic voice
 * - Fallback: speak without explicit voice if no Arabic voice found
 */

// Track user interaction for autoplay decisions
let userHasInteracted = false;

// Cache for Arabic voice lookup
let cachedArabicVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

function markUserInteraction() {
  userHasInteracted = true;
}

// Listen for any user interaction to unlock audio
if (typeof window !== 'undefined') {
  const interactionEvents = ['click', 'touchstart', 'keydown'];
  const handler = () => {
    markUserInteraction();
    // Remove listeners after first interaction
    interactionEvents.forEach(evt => window.removeEventListener(evt, handler));
  };
  interactionEvents.forEach(evt => window.addEventListener(evt, handler, { once: false, passive: true }));
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

function getArabicVoice(): SpeechSynthesisVoice | null {
  if (cachedArabicVoice) return cachedArabicVoice;
  const voices = loadVoices();
  if (voices.length === 0) return null;
  voicesLoaded = true;
  // Try to find an Arabic voice, preferring ar-SA, then any ar-*
  cachedArabicVoice = voices.find(v => v.lang === 'ar-SA') 
    || voices.find(v => v.lang.startsWith('ar'))
    || null;
  return cachedArabicVoice;
}

// Ensure voices are loaded (Chrome loads them asynchronously)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // Listen for voices to become available
  window.speechSynthesis.onvoiceschanged = () => {
    cachedArabicVoice = null;
    voicesLoaded = false;
    getArabicVoice();
  };
  // Trigger initial load attempt
  getArabicVoice();
}

/**
 * Check if the user has interacted with the page (needed for autoplay)
 */
export function hasUserInteracted(): boolean {
  return userHasInteracted;
}

/**
 * Speak Arabic text using the Web Speech API.
 * Handles Chrome desktop quirks with cancel-before-speak pattern.
 */
export function speakArabic(text: string, rate: number = 0.8) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  
  const synth = window.speechSynthesis;
  
  // Chrome fix: cancel any pending/stuck speech first
  synth.cancel();
  
  const doSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = rate;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    
    // Explicitly set the Arabic voice if available
    const arabicVoice = getArabicVoice();
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }
    
    // Chrome fix: resume in case synthesis is paused
    synth.resume();
    synth.speak(utterance);
    
    // Chrome has a bug where long utterances get paused after ~15s
    // For short Arabic letters/words this shouldn't be an issue,
    // but we add a safety resume just in case
    const resumeInterval = setInterval(() => {
      if (!synth.speaking) {
        clearInterval(resumeInterval);
      } else {
        synth.resume();
      }
    }, 5000);
    
    // Clean up interval after max 10 seconds
    setTimeout(() => clearInterval(resumeInterval), 10000);
  };
  
  // Chrome requires a small delay after cancel() before speak() works
  // This is the key fix for the "click doesn't play" issue
  setTimeout(() => {
    // If voices aren't loaded yet, try to wait for them
    if (!voicesLoaded && loadVoices().length === 0) {
      // Voices not yet loaded — set up a one-time handler
      const onVoicesReady = () => {
        synth.onvoiceschanged = null;
        cachedArabicVoice = null;
        getArabicVoice();
        doSpeak();
      };
      synth.onvoiceschanged = onVoicesReady;
      
      // Fallback: speak anyway after 300ms even without voices
      // (Chrome will use a default voice for the language)
      setTimeout(() => {
        if (!voicesLoaded) {
          synth.onvoiceschanged = null;
          doSpeak();
        }
      }, 300);
    } else {
      doSpeak();
    }
  }, 50); // 50ms delay after cancel — enough for Chrome to reset
}

/**
 * Speak Arabic text, but only if user has already interacted.
 * Use this for auto-play scenarios (e.g., letter reveal animation).
 * Returns true if speech was attempted, false if blocked.
 */
export function speakArabicIfAllowed(text: string, rate: number = 0.8): boolean {
  if (!userHasInteracted) {
    return false;
  }
  speakArabic(text, rate);
  return true;
}

export function playCorrectSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) { /* ignore audio errors */ }
}

export function playWrongSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.setValueAtTime(150, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) { /* ignore audio errors */ }
}

export function playPopSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) { /* ignore audio errors */ }
}

export function playCelebrationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 587.33, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.3);
      osc.start(audioCtx.currentTime + i * 0.1);
      osc.stop(audioCtx.currentTime + i * 0.1 + 0.3);
    });
  } catch (e) { /* ignore audio errors */ }
}

// Shuffle utility
export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get random items from array excluding specific ones
export function getRandomDistractors<T>(pool: T[], exclude: T[], count: number): T[] {
  const available = pool.filter(item => !exclude.includes(item));
  return shuffleArray(available).slice(0, count);
}
