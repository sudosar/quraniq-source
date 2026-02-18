/* ============================================
   JUZ PUZZLE — Ramadan Daily Juz Challenge
   ============================================ */

// ===== Sample puzzle data (will be LLM-generated in production) =====
const SAMPLE_JUZ_PUZZLE = {
  date: "2026-03-01",
  juz_number: 1,
  juz_name: "Alif Lam Meem",
  juz_name_ar: "الم",
  verse: {
    surah_number: 2,
    surah_name: "Al-Baqarah",
    surah_name_ar: "البقرة",
    ayah_number: 45,
    arabic_text: "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ",
    translation: "And seek help through patience and prayer. Indeed, it is difficult except for the humbly submissive.",
    audio_url: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/52.mp3"
  },
  theme_question: {
    correct: "Seeking help through patience and prayer",
    options: [
      "Seeking help through patience and prayer",
      "Rules of fasting in Ramadan",
      "Story of Prophet Musa and Pharaoh",
      "Description of the rewards of Paradise"
    ]
  },
  surah_question: {
    correct_surah: 2,
    options: [
      { num: 1, name: "Al-Fatiha", name_ar: "الفاتحة", name_en: "The Opening" },
      { num: 2, name: "Al-Baqarah", name_ar: "البقرة", name_en: "The Cow" },
      { num: 3, name: "Aal-E-Imran", name_ar: "آل عمران", name_en: "The Family of Imran" },
      { num: 67, name: "Al-Mulk", name_ar: "الملك", name_en: "The Sovereignty" }
    ]
  },
  surah_order: {
    surahs: [
      { num: 1, name: "Al-Fatiha", name_ar: "الفاتحة", name_en: "The Opening" },
      { num: 2, name: "Al-Baqarah", name_ar: "البقرة", name_en: "The Cow" }
    ]
  },
  educational_notes: {
    verse_context: "This verse comes in the context of Allah addressing the Children of Israel, reminding them of His favors and urging them to seek help through patience and prayer. It highlights that true submission to Allah makes even the most difficult acts of worship feel light.",
    theme_explanation: "Patience (sabr) and prayer (salah) are presented as the two essential tools for a believer facing any difficulty. The Quran pairs them together because sabr strengthens the heart while salah connects it to Allah.",
    surah_overview: "Al-Baqarah is the longest surah in the Quran with 286 verses. It covers a wide range of topics including faith, law, stories of previous nations, and guidance for the Muslim community. It was revealed in Madinah."
  }
};

// ===== Constants =====
const JUZ_STATE_KEY = 'quraniq_juz';
const JUZ_STATS_KEY = 'quraniq_juz_stats';
const MAX_ORDER_SURAHS = 5; // Max surahs to show in ordering round

// ===== Game State =====
let juzState = {
  puzzle: null,
  currentRound: 1,
  hintsUsed: 0,
  scores: { round2: 0, round3: 0, round4: 0 },
  attempts: { round2: 0, round3: 0 },
  completed: false,
  wbwData: null,
  audioPlaying: false,
  surahOrderGuess: [],
  surahOrderSubset: [],  // The subset of surahs selected for ordering
  tooltipsRevealed: new Set(),
  surahTooltipsRevealed: new Set(),
  orderTooltipsRevealed: new Set(),
  round2Answered: false,
  round3Answered: false,
  round4Answered: false
};

// ===== State Persistence =====
function loadJuzState() {
  try {
    const raw = JSON.parse(localStorage.getItem(JUZ_STATE_KEY));
    if (raw && raw.puzzle) {
      // Restore Sets from arrays
      raw.tooltipsRevealed = new Set(raw.tooltipsRevealed || []);
      raw.surahTooltipsRevealed = new Set(raw.surahTooltipsRevealed || []);
      raw.orderTooltipsRevealed = new Set(raw.orderTooltipsRevealed || []);
      return raw;
    }
  } catch (e) { }
  return null;
}

function saveJuzState() {
  const toSave = {
    ...juzState,
    // Convert Sets to arrays for JSON serialization
    tooltipsRevealed: Array.from(juzState.tooltipsRevealed),
    surahTooltipsRevealed: Array.from(juzState.surahTooltipsRevealed),
    orderTooltipsRevealed: Array.from(juzState.orderTooltipsRevealed),
    // Don't save transient data
    wbwData: null,
    audioPlaying: false
  };
  localStorage.setItem(JUZ_STATE_KEY, JSON.stringify(toSave));
}

function loadJuzStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(JUZ_STATS_KEY));
    if (raw) return raw;
  } catch (e) { }
  return { played: 0, totalScore: 0, juzCompleted: [] };
}

function saveJuzStats(stats) {
  localStorage.setItem(JUZ_STATS_KEY, JSON.stringify(stats));
}

// ===== Initialize Game =====
function initJuzPuzzle(puzzleData) {
  const data = puzzleData || SAMPLE_JUZ_PUZZLE;

  // Check if we have a saved state for this puzzle
  const saved = loadJuzState();
  if (saved && saved.puzzle && saved.puzzle.juz_number === data.juz_number && saved.puzzle.date === data.date) {
    // Restore saved state
    juzState = saved;
    // Migration: ensure new fields exist for legacy saved states
    if (juzState.hintPenalty === undefined) juzState.hintPenalty = 0;
    if (juzState.round2HintUsed === undefined) juzState.round2HintUsed = false;
    if (juzState.round3HintUsed === undefined) juzState.round3HintUsed = false;
    if (juzState.round4HintUsed === undefined) juzState.round4HintUsed = false;

    juzState.wbwData = null;
    juzState.audioPlaying = false;
  } else {
    // Fresh game
    const orderSubset = selectOrderSubset(data.surah_order.surahs);

    juzState = {
      puzzle: data,
      currentRound: 1,
      hintsUsed: 0,
      hintPenalty: 0,
      scores: { round2: 0, round3: 0, round4: 0 },
      attempts: { round2: 0, round3: 0 },
      completed: false,
      wbwData: null,
      audioPlaying: false,
      surahOrderSubset: orderSubset,
      surahOrderGuess: [...orderSubset].sort(() => Math.random() - 0.5),
      tooltipsRevealed: new Set(),
      surahTooltipsRevealed: new Set(),
      orderTooltipsRevealed: new Set(),
      round2Answered: false,
      round3Answered: false,
      round4Answered: false,
      round2HintUsed: false,
      round3HintUsed: false,
      round4HintUsed: false
    };
  }

  const container = document.getElementById(JUZ_CONTAINER_ID);
  if (container) container.classList.add('active');
  renderJuzPuzzle();
  fetchWBWData();
  saveJuzState();
}

// ===== Select Subset for Ordering Round =====
function selectOrderSubset(allSurahs) {
  if (allSurahs.length <= MAX_ORDER_SURAHS) return [...allSurahs];

  // Pick MAX_ORDER_SURAHS consecutive surahs from a random starting point
  // This tests knowledge of relative order within a section of the juz
  const maxStart = allSurahs.length - MAX_ORDER_SURAHS;
  const start = Math.floor(Math.random() * (maxStart + 1));
  return allSurahs.slice(start, start + MAX_ORDER_SURAHS);
}

// ===== Fetch Word-by-Word Data =====
async function fetchWBWData() {
  const v = juzState.puzzle.verse;
  try {
    const url = `https://api.quran.com/api/v4/verses/by_key/${v.surah_number}:${v.ayah_number}?language=en&words=true&word_fields=text_uthmani,translation`;
    const res = await fetch(url);
    const data = await res.json();
    juzState.wbwData = data.verse.words;
    // Re-render round 1 if we're still on it
    if (juzState.currentRound === 1) {
      renderRound1();
    }
  } catch (e) {
    console.error('Failed to fetch WBW:', e);
  }
}

// ===== Main Render =====
function renderJuzPuzzle() {
  const container = document.getElementById(JUZ_CONTAINER_ID);
  const p = juzState.puzzle;

  container.innerHTML = `
    <div class="juz-puzzle">
      <!-- Header -->
      <div class="juz-header">
        <div class="juz-badge">Juz ${p.juz_number}</div>
        <h2 class="juz-title">${p.juz_name_ar}</h2>
        <p class="juz-subtitle">${p.juz_name}</p>
      </div>

      <!-- Progress Indicator -->
      <div class="juz-progress">
        <div class="juz-progress-step ${juzState.currentRound >= 1 ? 'active' : ''} ${juzState.currentRound > 1 ? 'done' : ''}" data-round="1">
          <span class="step-icon">📖</span>
          <span class="step-label">Verse</span>
        </div>
        <div class="juz-progress-line ${juzState.currentRound > 1 ? 'done' : ''}"></div>
        <div class="juz-progress-step ${juzState.currentRound >= 2 ? 'active' : ''} ${juzState.currentRound > 2 ? 'done' : ''}" data-round="2">
          <span class="step-icon">🎯</span>
          <span class="step-label">Theme</span>
        </div>
        <div class="juz-progress-line ${juzState.currentRound > 2 ? 'done' : ''}"></div>
        <div class="juz-progress-step ${juzState.currentRound >= 3 ? 'active' : ''} ${juzState.currentRound > 3 ? 'done' : ''}" data-round="3">
          <span class="step-icon">📜</span>
          <span class="step-label">Surah</span>
        </div>
        <div class="juz-progress-line ${juzState.currentRound > 3 ? 'done' : ''}"></div>
        <div class="juz-progress-step ${juzState.currentRound >= 4 ? 'active' : ''} ${juzState.completed ? 'done' : ''}" data-round="4">
          <span class="step-icon">📊</span>
          <span class="step-label">Order</span>
        </div>
      </div>

      <!-- Crescent Meter -->
      <div class="juz-crescent-meter">
        ${renderCrescentMeter()}
      </div>

      <!-- Round Content -->
      <div id="juz-round-content">
        <!-- Rendered by round functions -->
      </div>
    </div>
  `;

  // Render current round
  switch (juzState.currentRound) {
    case 1: renderRound1(); break;
    case 2: renderRound2(); break;
    case 3: renderRound3(); break;
    case 4: renderRound4(); break;
    case 5: showFinalResults(); break; // Results screen
  }
}

// ===== Crescent Meter =====
const MAX_HINT_PENALTY = 2; // Cap penalty so perfect answers still earn 3/5

function renderCrescentMeter() {
  const maxCrescents = 5;
  const rawScore = juzState.scores.round2 + juzState.scores.round3 + juzState.scores.round4;
  const penalty = Math.min(juzState.hintPenalty || 0, MAX_HINT_PENALTY);
  const finalScore = Math.max(0, rawScore - penalty);

  let moons = '';
  for (let i = 1; i <= maxCrescents; i++) {
    if (i <= finalScore) {
      moons += '🌕';
    } else if (i - 0.5 <= finalScore) {
      moons += '🌗';
    } else {
      moons += '🌑';
    }
  }

  const hintText = penalty > 0
    ? `<span class="juz-hint-cost">Hints used (−${penalty}🌙)</span>`
    : '<span class="juz-hint-free">No hints used yet</span>';

  return `
    <div class="juz-moons">${moons}</div>
    ${hintText}
  `;
}

function updateCrescentMeter() {
  const meter = document.querySelector('.juz-crescent-meter');
  if (meter) meter.innerHTML = renderCrescentMeter();
}

// ===== ROUND 1: Verse Discovery =====
function renderRound1() {
  const content = document.getElementById('juz-round-content');
  const v = juzState.puzzle.verse;

  // Build WBW display
  let verseHTML = '';
  if (juzState.wbwData) {
    verseHTML = '<div class="juz-verse-wbw">';
    juzState.wbwData.forEach((word, i) => {
      if (word.char_type_name === 'end') {
        verseHTML += `<span class="juz-wbw-end">${word.text_uthmani}</span>`;
        return;
      }
      const revealed = juzState.tooltipsRevealed.has(i);
      verseHTML += `
        <span class="juz-wbw-word ${revealed ? 'revealed' : ''}" onclick="revealWordTooltip(${i})" data-idx="${i}">
          <span class="juz-wbw-ar">${word.text_uthmani}</span>
          <span class="juz-wbw-en ${revealed ? 'show' : ''}">${word.translation?.text || ''}</span>
        </span>
      `;
    });
    verseHTML += '</div>';
  } else {
    // Fallback: show plain Arabic text
    verseHTML = `<div class="juz-verse-plain">${v.arabic_text}</div>`;
  }

  content.innerHTML = `
    <div class="juz-round juz-round-1">
      <h3 class="juz-round-title">Round 1: Verse Discovery</h3>
      <p class="juz-round-desc">Listen to and explore this verse from Juz ${juzState.puzzle.juz_number}. Tap any word for its English meaning.</p>

      <!-- Audio Player -->
      <div class="juz-audio-row">
        <button class="juz-audio-btn" onclick="playJuzVerseAudio()">
          <span id="juz-audio-icon">▶</span> Listen to Recitation
        </button>
        <audio id="juz-audio" src="${v.audio_url}" onended="document.getElementById('juz-audio-icon').textContent='▶'"></audio>
      </div>

      <!-- Verse Display -->
      <div class="juz-verse-container">
        <div class="juz-verse-ref">${v.surah_name_ar} ${v.surah_number}:${v.ayah_number}</div>
        ${verseHTML}
      </div>

      <!-- Hint cost notice -->
      <p class="juz-hint-notice">Tap any word to discover its meaning — it's free! 📖</p>

      <!-- Continue Button -->
      <button class="btn btn-primary juz-continue-btn" onclick="advanceRound(2)">
        Continue to Theme Question →
      </button>
    </div>
  `;
}

function revealWordTooltip(idx) {
  if (juzState.tooltipsRevealed.has(idx)) return; // Already revealed

  juzState.tooltipsRevealed.add(idx);
  juzState.hintsUsed++;

  // Word taps are FREE — Round 1 is about discovery, not penalty
  saveJuzState();

  const wordEl = document.querySelector(`.juz-wbw-word[data-idx="${idx}"]`);
  if (wordEl) {
    wordEl.classList.add('revealed');
    wordEl.querySelector('.juz-wbw-en').classList.add('show');
  }
}

function playJuzVerseAudio() {
  const audio = document.getElementById('juz-audio');
  const icon = document.getElementById('juz-audio-icon');
  if (audio.paused) {
    audio.play();
    icon.textContent = '⏸';
  } else {
    audio.pause();
    icon.textContent = '▶';
  }
}

// ===== ROUND 2: Theme Identification =====
function renderRound2() {
  const content = document.getElementById('juz-round-content');
  const q = juzState.puzzle.theme_question;

  // Shuffle options (deterministic if already answered)
  const shuffled = juzState.round2Answered ? q.options : [...q.options].sort(() => Math.random() - 0.5);

  content.innerHTML = `
    <div class="juz-round juz-round-2">
      <h3 class="juz-round-title">Round 2: Identify the Theme</h3>
      <p class="juz-round-desc">What theme or topic is the verse discussing?</p>

      <!-- Verse reminder (collapsed) -->
      <div class="juz-verse-reminder">
        <div class="juz-verse-mini">${juzState.puzzle.verse.arabic_text}</div>
        <div class="juz-verse-translation ${juzState.round2Answered ? 'show' : ''}" id="juz-verse-translation">
          <em>${juzState.puzzle.verse.translation}</em>
        </div>
      </div>

      <!-- Options -->
      <div class="juz-options" id="juz-theme-options">
        ${shuffled.map((opt, i) => `
          <button class="juz-option ${juzState.round2Answered && opt === q.correct ? 'correct' : ''}" 
                  onclick="submitThemeAnswer(this, '${opt.replace(/'/g, "\\'")}')" 
                  data-answer="${opt}"
                  ${juzState.round2Answered ? 'disabled' : ''}>
            ${opt}
          </button>
        `).join('')}
      </div>

      <!-- Hint Button -->
      ${!juzState.round2Answered ? `
        <div class="juz-hint-actions">
          <button class="btn btn-secondary juz-hint-btn" 
                  onclick="useThemeHint()" 
                  ${juzState.round2HintUsed ? 'disabled' : ''}>
            ${juzState.round2HintUsed ? '50/50 Used' : '💡 Use Hint (0.5🌙)'}
          </button>
        </div>
      ` : ''}

      <div id="juz-theme-feedback" class="juz-feedback">
        ${juzState.round2Answered ? renderSavedFeedback('theme') : ''}
      </div>
    </div>
  `;
}

function submitThemeAnswer(btn, answer) {
  if (juzState.round2Answered) return;

  const correct = juzState.puzzle.theme_question.correct;
  const isCorrect = answer === correct;
  juzState.attempts.round2++;

  const allBtns = document.querySelectorAll('#juz-theme-options .juz-option');

  if (isCorrect) {
    btn.classList.add('correct');
    juzState.scores.round2 = juzState.attempts.round2 === 1 ? 2 : 1;
    allBtns.forEach(b => b.disabled = true);
    juzState.round2Answered = true;
    updateCrescentMeter();
    saveJuzState();
    // Reveal the English translation as a reward
    revealVerseTranslation();
    showRoundFeedback('juz-theme-feedback', true,
      juzState.puzzle.educational_notes.theme_explanation,
      juzState.scores.round2);
  } else {
    btn.classList.add('wrong');
    btn.disabled = true;
    if (juzState.attempts.round2 >= 2) {
      // Show correct answer
      allBtns.forEach(b => {
        b.disabled = true;
        if (b.dataset.answer === correct) b.classList.add('correct');
      });
      juzState.scores.round2 = 0;
      juzState.round2Answered = true;
      updateCrescentMeter();
      saveJuzState();
      // Reveal the English translation even on failure
      revealVerseTranslation();
      showRoundFeedback('juz-theme-feedback', false,
        juzState.puzzle.educational_notes.theme_explanation, 0);
    }
  }
}

function revealVerseTranslation() {
  const el = document.getElementById('juz-verse-translation');
  if (el) el.classList.add('show');
}

function useThemeHint() {
  if (juzState.round2HintUsed || juzState.round2Answered) return;

  juzState.round2HintUsed = true;
  juzState.hintPenalty += 0.5;
  updateCrescentMeter();

  const q = juzState.puzzle.theme_question;
  const btns = Array.from(document.querySelectorAll('#juz-theme-options .juz-option'));

  // Find all wrong buttons
  const wrongBtns = btns.filter(b => b.dataset.answer !== q.correct);

  // Shuffle and disable 2 of them
  const toRemove = wrongBtns.sort(() => Math.random() - 0.5).slice(0, 2);
  toRemove.forEach(b => {
    b.disabled = true;
    b.style.opacity = '0.3';
    b.innerHTML = `<span style="text-decoration: line-through">${b.innerHTML}</span>`;
  });

  // Disable the hint button
  const hintBtn = document.querySelector('.juz-hint-btn');
  if (hintBtn) {
    hintBtn.disabled = true;
    hintBtn.textContent = '50/50 Used';
  }

  saveJuzState();
}

// ===== ROUND 3: Surah Identification =====
function renderRound3() {
  const content = document.getElementById('juz-round-content');
  const q = juzState.puzzle.surah_question;

  // Shuffle options
  const shuffled = juzState.round3Answered ? q.options : [...q.options].sort(() => Math.random() - 0.5);

  content.innerHTML = `
    <div class="juz-round juz-round-3">
      <h3 class="juz-round-title">Round 3: Name the Surah</h3>
      <p class="juz-round-desc">Which Surah does this verse belong to?</p>

      <!-- Options (Arabic names, tappable for English) -->
      <div class="juz-options juz-surah-options" id="juz-surah-options">
        ${shuffled.map((opt, i) => {
    const enText = opt.name_en || opt.name;
    const fullText = juzState.round3Answered ? `${enText} <span class="juz-surah-translit">(${opt.name})</span>` : enText;
    return `
          <button class="juz-option juz-surah-option ${juzState.round3Answered && opt.num === q.correct_surah ? 'correct' : ''}" 
                  onclick="submitSurahAnswer(this, ${opt.num})" 
                  data-num="${opt.num}"
                  ${juzState.round3Answered ? 'disabled' : ''}>
            <span class="juz-surah-ar">${opt.name_ar}</span>
            <span class="juz-surah-en ${juzState.round3Answered || juzState.surahTooltipsRevealed.has(opt.num) ? 'show' : ''}">${fullText}</span>
            ${!juzState.surahTooltipsRevealed.has(opt.num) && !juzState.round3Answered ? `<span class="juz-surah-hint-icon" onclick="event.stopPropagation(); revealSurahTooltip(${opt.num}, this.previousElementSibling)">?</span>` : ''}
          </button>
        `;
  }).join('')}
      </div>

      <!-- Hint Actions -->
      ${!juzState.round3Answered ? `
        <div class="juz-hint-actions" style="margin-bottom: 20px;">
          <button class="btn btn-secondary juz-hint-btn" 
                  onclick="useSurahContextHint()" 
                  ${juzState.round3HintUsed ? 'disabled' : ''}>
            ${juzState.round3HintUsed ? 'Context Revealed' : '💡 Use Hint (0.5🌙)'}
          </button>
        </div>
      ` : ''}

      <p class="juz-hint-notice">Tap <span class="juz-hint-icon-inline">?</span> for English translation (costs 0.5🌙)</p>

      <div id="juz-surah-feedback" class="juz-feedback">
        ${juzState.round3Answered ? renderSavedFeedback('surah') : ''}
      </div>
    </div>
  `;
}

function revealSurahTooltip(num, enEl) {
  if (juzState.surahTooltipsRevealed.has(num)) return;
  juzState.surahTooltipsRevealed.add(num);
  juzState.hintPenalty += 0.5;
  updateCrescentMeter();
  saveJuzState();

  enEl.classList.add('show');
  // Hide the ? icon
  const hintIcon = enEl.nextElementSibling;
  if (hintIcon) hintIcon.style.display = 'none';
}

function revealAllSurahEnglishNames() {
  // Reveal all English names and hide all ? icons in Round 3
  // Also update text to show both translation and transliteration
  const q = juzState.puzzle.surah_question;
  document.querySelectorAll('#juz-surah-options .juz-surah-option').forEach(btn => {
    const num = parseInt(btn.dataset.num);
    const opt = q.options.find(o => o.num === num);
    if (opt) {
      const enEl = btn.querySelector('.juz-surah-en');
      const enText = opt.name_en || opt.name;
      enEl.innerHTML = `${enText} <span class="juz-surah-translit">(${opt.name})</span>`;
      enEl.classList.add('show');
    }
  });
  document.querySelectorAll('#juz-surah-options .juz-surah-hint-icon').forEach(el => el.style.display = 'none');
}

function submitSurahAnswer(btn, num) {
  if (juzState.round3Answered) return;

  const correct = juzState.puzzle.surah_question.correct_surah;
  const isCorrect = num === correct;
  juzState.attempts.round3++;

  const allBtns = document.querySelectorAll('#juz-surah-options .juz-option');

  if (isCorrect) {
    btn.classList.add('correct');
    juzState.scores.round3 = juzState.attempts.round3 === 1 ? 2 : 1;
    allBtns.forEach(b => { b.disabled = true; b.onclick = null; });
    juzState.round3Answered = true;
    updateCrescentMeter();
    saveJuzState();
    // Reveal all English names on solve
    revealAllSurahEnglishNames();
    showRoundFeedback('juz-surah-feedback', true,
      juzState.puzzle.educational_notes.surah_overview,
      juzState.scores.round3);
  } else {
    btn.classList.add('wrong');
    btn.disabled = true;
    if (juzState.attempts.round3 >= 2) {
      allBtns.forEach(b => {
        b.disabled = true;
        b.onclick = null;
        if (parseInt(b.dataset.num) === correct) b.classList.add('correct');
      });
      juzState.scores.round3 = 0;
      juzState.round3Answered = true;
      updateCrescentMeter();
      saveJuzState();
      // Reveal all English names on solve
      revealAllSurahEnglishNames();
      showRoundFeedback('juz-surah-feedback', false,
        juzState.puzzle.educational_notes.surah_overview, 0);
    }
  }
}

function useSurahContextHint() {
  if (juzState.round3HintUsed || juzState.round3Answered) return;

  juzState.round3HintUsed = true;
  juzState.hintPenalty += 0.5;
  updateCrescentMeter();

  const feedback = document.getElementById('juz-surah-feedback');
  if (feedback) {
    feedback.innerHTML = `
      <div class="juz-hint-box">
        <strong>💡 Context Hint:</strong>
        <p>${juzState.puzzle.educational_notes.surah_overview}</p>
      </div>
    `;
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const hintBtn = document.querySelector('.juz-hint-btn');
  if (hintBtn) {
    hintBtn.disabled = true;
    hintBtn.textContent = 'Context Revealed';
  }

  saveJuzState();
}

// ===== ROUND 4: Surah Order =====
function completeSingleSurahRound() {
  if (juzState.round4Answered) return;

  // Round 4 is worth 1 point max
  juzState.scores.round4 = 1;
  juzState.round4Answered = true;
  updateCrescentMeter();
  saveJuzState();

  // Show visual feedback immediately
  const surah = juzState.surahOrderSubset[0];
  const surahName = surah.name_en || surah.name;

  showRoundFeedback('juz-order-feedback', true,
    `Correct! Juz ${juzState.puzzle.juz_number} contains only Surah ${surahName}.`, 1);

  // Re-render to update UI state (hide button etc)
  renderRound4();
}

function renderRound4() {
  const content = document.getElementById('juz-round-content');
  const subset = juzState.surahOrderSubset;
  const totalSurahs = juzState.puzzle.surah_order.surahs.length;
  const isSubset = totalSurahs > MAX_ORDER_SURAHS;

  // Handle Single-Surah Juz (e.g. Juz 2)
  if (subset.length === 1) {
    const surah = subset[0];
    const enText = surah.name_en || surah.name;
    const displayText = `${enText} <span class="juz-surah-translit">(${surah.name})</span>`;

    content.innerHTML = `
      <div class="juz-round juz-round-4">
        <h3 class="juz-round-title">Round 4: Surah Order</h3>
        <p class="juz-round-desc">
          This Juz contains only one Surah. No ordering is needed!
        </p>
        
        <div class="juz-order-list" style="margin-bottom: 20px;">
          <div class="juz-order-item correct" style="cursor: default;">
            <span class="juz-order-num">1</span>
            <span class="juz-order-name-ar">${surah.name_ar}</span>
            <span class="juz-order-name-en show">${displayText}</span>
          </div>
        </div>

        ${!juzState.round4Answered ? `
          <div class="juz-order-actions">
            <button class="btn btn-primary" onclick="completeSingleSurahRound()">
              Claim Free Point & Finish
            </button>
          </div>
        ` : ''}

        <div id="juz-order-feedback" class="juz-feedback">
          ${juzState.round4Answered ? renderSavedFeedback('order') : ''}
        </div>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="juz-round juz-round-4">
      <h3 class="juz-round-title">Round 4: Order the Surahs</h3>
      <p class="juz-round-desc">
        ${isSubset
      ? `Arrange these ${subset.length} Surahs in the correct order as they appear in Juz ${juzState.puzzle.juz_number}. <span class="juz-subset-note">(${totalSurahs} surahs total in this Juz)</span>`
      : `Arrange the Surahs in the correct order as they appear in Juz ${juzState.puzzle.juz_number}.`
    }
      </p>

      <div class="juz-order-list" id="juz-order-list">
        ${renderOrderList()}
      </div>

      ${!juzState.round4Answered ? `
        <p class="juz-hint-notice">Tap <span class="juz-hint-icon-inline">?</span> for English translation (costs 0.5🌙)</p>
        <div class="juz-order-actions" id="juz-order-actions">
          <button class="btn btn-secondary" onclick="shuffleOrder()">Shuffle</button>
          <button class="btn btn-secondary juz-hint-btn" 
                  onclick="useOrderHint()" 
                  ${juzState.round4HintUsed ? 'disabled' : ''}>
            ${juzState.round4HintUsed ? 'Correct Surah Fixed' : '💡 Help (0.5🌙)'}
          </button>
          <button class="btn btn-primary" onclick="submitOrder()">Check Order</button>
        </div>
      ` : ''}

      <div id="juz-order-feedback" class="juz-feedback">
        ${juzState.round4Answered ? renderSavedFeedback('order') : ''}
      </div>
    </div>
  `;

  // Setup drag and drop (including touch)
  if (!juzState.round4Answered) {
    setupDragAndDrop();
    setupTouchDragAndDrop();
  }
}

function renderOrderList() {
  return juzState.surahOrderGuess.map((s, i) => {
    const enRevealed = juzState.round4Answered || juzState.orderTooltipsRevealed.has(s.num);
    const showHintIcon = !juzState.round4Answered && !juzState.orderTooltipsRevealed.has(s.num);
    const enText = s.name_en || s.name;
    const displayText = juzState.round4Answered ? `${enText} <span class="juz-surah-translit">(${s.name})</span>` : enText;
    return `
    <div class="juz-order-item ${juzState.round4Answered ? (isCorrectPosition(i) ? 'correct' : 'wrong') : ''}" 
         draggable="${!juzState.round4Answered}" 
         data-idx="${i}" 
         data-num="${s.num}">
      <span class="juz-order-handle">☰</span>
      <span class="juz-order-num">${i + 1}</span>
      <span class="juz-order-name-ar">${s.name_ar}</span>
      <span class="juz-order-name-en ${enRevealed ? 'show' : ''}">${displayText}</span>
      ${showHintIcon ? `<span class="juz-order-hint-icon" onclick="event.stopPropagation(); revealOrderTooltip(${s.num})">?</span>` : ''}
      ${!juzState.round4Answered ? `
        <div class="juz-order-arrows">
          <button class="juz-arrow-btn" onclick="moveItem(${i}, -1)">▲</button>
          <button class="juz-arrow-btn" onclick="moveItem(${i}, 1)">▼</button>
        </div>
      ` : ''}
    </div>
  `;
  }).join('');
}

function revealOrderTooltip(num) {
  if (juzState.orderTooltipsRevealed.has(num)) return;
  juzState.orderTooltipsRevealed.add(num);
  juzState.hintPenalty += 0.5;
  updateCrescentMeter();
  saveJuzState();

  // Update the specific item's English name and hide its ? icon
  const item = document.querySelector(`.juz-order-item[data-num="${num}"]`);
  if (item) {
    const enEl = item.querySelector('.juz-order-name-en');
    if (enEl) enEl.classList.add('show');
    const hintIcon = item.querySelector('.juz-order-hint-icon');
    if (hintIcon) hintIcon.style.display = 'none';
  }
}

function useOrderHint() {
  if (juzState.round4HintUsed || juzState.round4Answered) return;

  juzState.round4HintUsed = true;
  juzState.hintPenalty += 0.5;
  updateCrescentMeter();

  // Logic: Correctly place the first misplaced surah
  const correctOrder = juzState.surahOrderSubset;
  const currentGuess = juzState.surahOrderGuess;

  let firstWrongIdx = -1;
  for (let i = 0; i < correctOrder.length; i++) {
    if (currentGuess[i].num !== correctOrder[i].num) {
      firstWrongIdx = i;
      break;
    }
  }

  if (firstWrongIdx !== -1) {
    const targetSurah = correctOrder[firstWrongIdx];
    // Find where it is in current guess
    const currentIdx = currentGuess.findIndex(s => s.num === targetSurah.num);
    // Swap
    [currentGuess[firstWrongIdx], currentGuess[currentIdx]] = [currentGuess[currentIdx], currentGuess[firstWrongIdx]];
  }

  // Re-render the list
  const list = document.getElementById('juz-order-list');
  if (list) list.innerHTML = renderOrderList();

  const hintBtn = document.querySelector('.juz-order-actions .juz-hint-btn');
  if (hintBtn) {
    hintBtn.disabled = true;
    hintBtn.textContent = 'Correct Surah Fixed';
  }

  saveJuzState();
}

function revealAllOrderEnglishNames() {
  // Reveal all English names in Round 4 order list and update text to include transliteration
  document.querySelectorAll('#juz-order-list .juz-order-item').forEach(item => {
    const num = parseInt(item.dataset.num);
    const surah = juzState.surahOrderGuess.find(s => s.num === num);
    const enEl = item.querySelector('.juz-order-name-en');
    if (enEl && surah) {
      const enText = surah.name_en || surah.name;
      enEl.innerHTML = `${enText} <span class="juz-surah-translit">(${surah.name})</span>`;
      enEl.classList.add('show');
    }
    const hintIcon = item.querySelector('.juz-order-hint-icon');
    if (hintIcon) hintIcon.style.display = 'none';
  });
}

function isCorrectPosition(idx) {
  const correctOrder = juzState.surahOrderSubset.map(s => s.num);
  const guessOrder = juzState.surahOrderGuess.map(s => s.num);
  return guessOrder[idx] === correctOrder[idx];
}

function moveItem(idx, direction) {
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= juzState.surahOrderGuess.length) return;

  const arr = juzState.surahOrderGuess;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];

  const list = document.getElementById('juz-order-list');
  list.innerHTML = renderOrderList();
  setupDragAndDrop();
  setupTouchDragAndDrop();
}

function shuffleOrder() {
  juzState.surahOrderGuess.sort(() => Math.random() - 0.5);
  const list = document.getElementById('juz-order-list');
  list.innerHTML = renderOrderList();
  setupDragAndDrop();
  setupTouchDragAndDrop();
}

function setupDragAndDrop() {
  const items = document.querySelectorAll('.juz-order-item');
  let dragItem = null;

  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      dragItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      // Required for Firefox to allow dragging
      e.dataTransfer.setData('text/plain', item.dataset.idx);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      dragItem = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (!dragItem || dragItem === item) return;

      const fromIdx = parseInt(dragItem.dataset.idx);
      const toIdx = parseInt(item.dataset.idx);

      const arr = juzState.surahOrderGuess;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);

      const list = document.getElementById('juz-order-list');
      list.innerHTML = renderOrderList();
      setupDragAndDrop();
      setupTouchDragAndDrop();
    });
  });
}

// ===== Touch Drag and Drop for Mobile =====
function setupTouchDragAndDrop() {
  const list = document.getElementById('juz-order-list');
  if (!list) return;

  let touchItem = null;
  let touchClone = null;
  let startY = 0;
  let startIdx = -1;

  const items = list.querySelectorAll('.juz-order-item');

  items.forEach(item => {
    const handle = item.querySelector('.juz-order-handle');
    const target = handle || item;

    target.addEventListener('touchstart', (e) => {
      if (juzState.round4Answered) return;
      // Prevent scrolling if touching the handle
      e.preventDefault();

      touchItem = item;
      startIdx = parseInt(item.dataset.idx);
      startY = e.touches[0].clientY;
      item.classList.add('dragging');

      // Create a visual clone
      touchClone = item.cloneNode(true);
      touchClone.classList.add('juz-touch-clone');
      touchClone.style.position = 'fixed';
      touchClone.style.width = item.offsetWidth + 'px';
      touchClone.style.left = item.getBoundingClientRect().left + 'px';
      touchClone.style.top = e.touches[0].clientY - 25 + 'px';
      touchClone.style.zIndex = '1000';
      touchClone.style.opacity = '0.85';
      touchClone.style.pointerEvents = 'none';
      document.body.appendChild(touchClone);
    }, { passive: false });

    target.addEventListener('touchmove', (e) => {
      if (!touchItem || !touchClone) return;
      e.preventDefault();

      const touchY = e.touches[0].clientY;
      touchClone.style.top = touchY - 25 + 'px';

      // Find which item we're over
      items.forEach(other => {
        other.classList.remove('drag-over');
        const rect = other.getBoundingClientRect();
        if (touchY > rect.top && touchY < rect.bottom && other !== touchItem) {
          other.classList.add('drag-over');
        }
      });
    }, { passive: false });

    target.addEventListener('touchend', (e) => {
      if (!touchItem) return;

      // Remove clone
      if (touchClone) {
        touchClone.remove();
        touchClone = null;
      }

      touchItem.classList.remove('dragging');

      // Find the drop target
      const touchY = e.changedTouches[0].clientY;
      let dropIdx = -1;
      items.forEach((other, i) => {
        other.classList.remove('drag-over');
        const rect = other.getBoundingClientRect();
        if (touchY > rect.top && touchY < rect.bottom) {
          dropIdx = parseInt(other.dataset.idx);
        }
      });

      if (dropIdx >= 0 && dropIdx !== startIdx) {
        const arr = juzState.surahOrderGuess;
        const [moved] = arr.splice(startIdx, 1);
        arr.splice(dropIdx, 0, moved);

        const listEl = document.getElementById('juz-order-list');
        listEl.innerHTML = renderOrderList();
        setupDragAndDrop();
        setupTouchDragAndDrop();
      }

      touchItem = null;
      startIdx = -1;
    }, { passive: true });
  });
}

function submitOrder() {
  const correctOrder = juzState.surahOrderSubset.map(s => s.num);
  const guessOrder = juzState.surahOrderGuess.map(s => s.num);

  // Count correct positions
  let correctCount = 0;
  for (let i = 0; i < correctOrder.length; i++) {
    if (guessOrder[i] === correctOrder[i]) correctCount++;
  }

  const allCorrect = correctCount === correctOrder.length;

  // Calculate score: all correct = 1, else 0
  juzState.scores.round4 = allCorrect ? 1 : 0;
  juzState.round4Answered = true;

  // Show visual feedback on each item
  const items = document.querySelectorAll('.juz-order-item');
  items.forEach((item, i) => {
    const isCorrectPos = guessOrder[i] === correctOrder[i];
    item.classList.add(isCorrectPos ? 'correct' : 'wrong');
    item.querySelectorAll('.juz-arrow-btn').forEach(b => b.disabled = true);
    item.setAttribute('draggable', 'false');
  });

  // Remove action buttons and hint notice
  const actionsEl = document.getElementById('juz-order-actions');
  if (actionsEl) actionsEl.innerHTML = '';

  // Reveal all English names on solve
  revealAllOrderEnglishNames();

  updateCrescentMeter();
  saveJuzState();

  if (allCorrect) {
    showRoundFeedback('juz-order-feedback', true,
      `Correct! The surahs in Juz ${juzState.puzzle.juz_number} are in this exact order.`, 1);
  } else {
    // Show correct order
    const correctNames = juzState.surahOrderSubset.map((s, i) => `${i + 1}. ${s.name_ar} (${s.name_en || s.name})`).join(' → ');
    showRoundFeedback('juz-order-feedback', false,
      `The correct order is: ${correctNames}`, 0);
  }
}

// ===== Feedback & Navigation =====
function showRoundFeedback(containerId, isCorrect, explanation, score) {
  const container = document.getElementById(containerId);
  const nextRound = juzState.currentRound + 1;
  const isLastRound = juzState.currentRound === 4;

  container.innerHTML = `
    <div class="juz-feedback-box ${isCorrect ? 'correct' : 'wrong'}">
      <div class="juz-feedback-header">
        <span class="juz-feedback-icon">${isCorrect ? '✅' : '❌'}</span>
        <span class="juz-feedback-score">${isCorrect ? `+${score}🌕` : '0🌕'}</span>
      </div>
      <p class="juz-feedback-text">${explanation}</p>
      ${isLastRound
      ? `<button class="btn btn-primary juz-continue-btn" onclick="advanceRound(5)">View Results</button>`
      : `<button class="btn btn-primary juz-continue-btn" onclick="advanceRound(${nextRound})">Continue →</button>`
    }
    </div>
  `;
}

function renderSavedFeedback(round) {
  let isCorrect, explanation, score;
  const nextRound = juzState.currentRound + 1;

  switch (round) {
    case 'theme':
      isCorrect = juzState.scores.round2 > 0;
      explanation = juzState.puzzle.educational_notes.theme_explanation;
      score = juzState.scores.round2;
      break;
    case 'surah':
      isCorrect = juzState.scores.round3 > 0;
      explanation = juzState.puzzle.educational_notes.surah_overview;
      score = juzState.scores.round3;
      break;
    case 'order':
      isCorrect = juzState.scores.round4 > 0;
      explanation = isCorrect
        ? `Correct! The surahs in Juz ${juzState.puzzle.juz_number} are in this exact order.`
        : `The correct order is: ${juzState.surahOrderSubset.map((s, i) => `${i + 1}. ${s.name_ar} (${s.name_en || s.name})`).join(' → ')}`;
      score = juzState.scores.round4;
      break;
  }

  const isLastRound = round === 'order';

  return `
    <div class="juz-feedback-box ${isCorrect ? 'correct' : 'wrong'}">
      <div class="juz-feedback-header">
        <span class="juz-feedback-icon">${isCorrect ? '✅' : '❌'}</span>
        <span class="juz-feedback-score">${isCorrect ? `+${score}🌕` : '0🌕'}</span>
      </div>
      <p class="juz-feedback-text">${explanation}</p>
      ${isLastRound
      ? `<button class="btn btn-primary juz-continue-btn" onclick="advanceRound(5)">View Results</button>`
      : `<button class="btn btn-primary juz-continue-btn" onclick="advanceRound(${juzState.currentRound + 1})">Continue →</button>`
    }
    </div>
  `;
}

function advanceRound(round) {
  juzState.currentRound = round;
  saveJuzState();
  renderJuzPuzzle();
}

// ===== Final Results =====
function showFinalResults() {
  juzState.completed = true;
  saveJuzState();

  // Update stats
  const stats = loadJuzStats();
  if (!stats.juzCompleted.includes(juzState.puzzle.juz_number)) {
    stats.played++;
    const totalRaw = juzState.scores.round2 + juzState.scores.round3 + juzState.scores.round4;
    const cappedPenalty = Math.min(juzState.hintPenalty || 0, MAX_HINT_PENALTY);
    stats.totalScore += Math.max(0, totalRaw - cappedPenalty);
    stats.juzCompleted.push(juzState.puzzle.juz_number);
    saveJuzStats(stats);
  }

  const container = document.getElementById(JUZ_CONTAINER_ID);
  const p = juzState.puzzle;

  const totalScore = juzState.scores.round2 + juzState.scores.round3 + juzState.scores.round4;
  const cappedPenalty = Math.min(juzState.hintPenalty || 0, MAX_HINT_PENALTY);
  const finalScore = Math.max(0, totalScore - cappedPenalty);

  // Build moon string
  let moonStr = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= finalScore) {
      moonStr += '🌕';
    } else if (i - 0.5 <= finalScore) {
      moonStr += '🌗';
    } else {
      moonStr += '🌑';
    }
  }

  // Submit score to Firebase group leaderboard (non-blocking)
  if (typeof submitFirebaseScore === 'function') {
    submitFirebaseScore('juz', finalScore).catch(() => { });
  }

  // Build share text
  const penaltyStr = cappedPenalty > 0 ? `\nHints: -${cappedPenalty}🌙` : '';
  const shareText = `QuranIQ Juz Journey — Juz ${p.juz_number} (${p.juz_name_ar})\n${moonStr} ${finalScore}/5\n\nTheme: ${juzState.scores.round2 > 0 ? '✅' : '❌'} | Surah: ${juzState.scores.round3 > 0 ? '✅' : '❌'} | Order: ${juzState.scores.round4 > 0 ? '✅' : '❌'}${penaltyStr}\n\nhttps://sudosar.github.io/quraniq/#juz`;

  container.innerHTML = `
    <div class="juz-puzzle">
      <div class="juz-header">
        <div class="juz-badge juz-badge-complete">Juz ${p.juz_number} Complete</div>
        <h2 class="juz-title">${p.juz_name_ar}</h2>
        <p class="juz-subtitle">${p.juz_name}</p>
      </div>

      <div class="juz-results">
        <div class="juz-results-moons">${moonStr}</div>
        <div class="juz-results-score">${finalScore} / 5 Crescents</div>

        <div class="juz-results-breakdown">
          <div class="juz-result-row">
            <span class="juz-result-label">💡 Hint Penalty</span>
            <span class="juz-result-value">${cappedPenalty > 0 ? `−${cappedPenalty}🌙` : 'None'}</span>
          </div>
          <div class="juz-result-row">
            <span class="juz-result-label">🎯 Theme</span>
            <span class="juz-result-value">${juzState.scores.round2}/2 🌕</span>
          </div>
          <div class="juz-result-row">
            <span class="juz-result-label">📜 Surah</span>
            <span class="juz-result-value">${juzState.scores.round3}/2 🌕</span>
          </div>
          <div class="juz-result-row">
            <span class="juz-result-label">📊 Order</span>
            <span class="juz-result-value">${juzState.scores.round4}/1 🌕</span>
          </div>
        </div>

        <!-- Educational Summary -->
        <div class="juz-edu-summary">
          <h3>What you learned from Juz ${p.juz_number}</h3>
          <div class="juz-edu-card">
            <strong>Verse Context:</strong>
            <p>${p.educational_notes.verse_context}</p>
          </div>
          <div class="juz-edu-card">
            <strong>Theme Insight:</strong>
            <p>${p.educational_notes.theme_explanation}</p>
          </div>
          <div class="juz-edu-card">
            <strong>Surah Overview:</strong>
            <p>${p.educational_notes.surah_overview}</p>
          </div>
        </div>

        <!-- Share -->
        <button class="btn btn-primary juz-share-btn" onclick="shareJuzResults()">Share Results</button>
        <button class="btn btn-secondary" onclick="initJuzPuzzle()" style="margin-top: 8px;">Restart Journey (Sample)</button>
      </div>
    </div>
  `;

  // Store share text for later
  container.dataset.shareText = shareText;
}

function shareJuzResults() {
  const container = document.getElementById(JUZ_CONTAINER_ID);
  const text = container.dataset.shareText;
  if (navigator.share) {
    navigator.share({ text });
  } else {
    navigator.clipboard.writeText(text).then(() => {
      // Show toast
      if (typeof showTestToast === 'function') {
        showTestToast('Results copied to clipboard!');
      } else if (typeof showToast === 'function') {
        showToast('Results copied to clipboard!');
      }
    });
  }
}

// ===== Production: Juz Journey Initialization =====
// Ramadan 2026 — Juz Journey launched Feb 17 evening (1 Ramadan 1447 AH)
const RAMADAN_START = new Date('2026-02-17T00:00:00');
const RAMADAN_END = new Date('2026-03-19T00:00:00'); // 30 days

function initJuzJourney() {
  const countdownEl = document.getElementById('juz-countdown-container');
  const gameEl = document.getElementById('juz-puzzle-container');
  if (!countdownEl || !gameEl) return; // Not on production page

  const now = new Date();

  if (now < RAMADAN_START) {
    // Before Ramadan — show countdown
    countdownEl.style.display = '';
    gameEl.style.display = 'none';
    startRamadanCountdown();
  } else if (now < RAMADAN_END) {
    // During Ramadan — show the game
    countdownEl.style.display = 'none';
    gameEl.style.display = '';
    loadJuzJourneyPuzzle();
  } else {
    // After Ramadan — show a completion message
    countdownEl.style.display = 'none';
    gameEl.style.display = '';
    showJuzJourneyComplete();
  }
}

function startRamadanCountdown() {
  function updateCountdown() {
    const now = new Date();
    const diff = RAMADAN_START - now;

    if (diff <= 0) {
      // Ramadan has started — reload to switch to game mode
      window.location.reload();
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const daysEl = document.getElementById('juz-cd-days');
    const hoursEl = document.getElementById('juz-cd-hours');
    const minsEl = document.getElementById('juz-cd-mins');
    const secsEl = document.getElementById('juz-cd-secs');

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
    if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function loadJuzJourneyPuzzle() {
  // Calculate which Juz we're on (Day 1 = Juz 1, Day 2 = Juz 2, etc.)
  const now = new Date();
  const dayOfRamadan = Math.floor((now - RAMADAN_START) / (1000 * 60 * 60 * 24)) + 1;
  const juzNumber = Math.min(dayOfRamadan, 30);

  // Set the container ID for production
  JUZ_CONTAINER_ID = 'juz-puzzle-container';

  // Try to load from daily_juz.json (generated by the LLM pipeline)
  loadDailyWithHolding(
    'daily_juz.json',
    'juz-game',
    'Juz Journey',
    (puzzle, stale) => {
      if (stale) {
        console.log('Juz Journey: serving stale puzzle');
      }
      initJuzPuzzle(puzzle);
    },
    (data) => data.puzzle
  );
}

function showJuzJourneyComplete() {
  const container = document.getElementById('juz-puzzle-container');
  if (!container) return;
  container.innerHTML = `
    <div class="juz-puzzle" style="text-align:center; padding:40px 16px;">
      <div class="juz-header">
        <div class="juz-badge" style="font-size:1.2rem;">🌙 Ramadan Complete 🌙</div>
        <h2 class="juz-title" style="margin-top:16px;">جزاكم الله خيراً</h2>
        <p class="juz-subtitle" style="margin-top:8px;">May Allah reward you for your dedication</p>
      </div>
      <div style="margin-top:24px; padding:20px; background:var(--card-bg); border-radius:12px; border:1px solid var(--border);">
        <p style="color:var(--text-secondary); line-height:1.6;">
          Juz Journey has concluded for this Ramadan. Thank you for exploring the Quran with us
          through all 30 Juz. May the knowledge you gained bring you closer to Allah.
        </p>
        <p style="margin-top:16px; font-family:'Amiri',serif; font-size:1.2rem; color:var(--islamic-gold); direction:rtl;">
          وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ
        </p>
        <p style="margin-top:8px; color:var(--text-secondary); font-size:0.85rem; font-style:italic;">
          And We have certainly made the Quran easy for remembrance, so is there any who will remember? — 54:17
        </p>
      </div>
    </div>
  `;
}
