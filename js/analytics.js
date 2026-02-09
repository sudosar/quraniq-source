/**
 * QuranIQ Analytics — Custom Event Tracking
 * 
 * Centralized gtag event tracking for all user interactions.
 * Events are organized by category for easy filtering in GA4.
 */

function trackEvent(eventName, params = {}) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, params);
    }
}

// ==================== GAME MODE EVENTS ====================

/** Track when a user switches to a game mode tab */
function trackModeSwitch(mode) {
    trackEvent('mode_switch', { mode: mode });
}

/** Track when a game starts (first interaction in a mode) */
function trackGameStart(mode) {
    trackEvent('game_start', { mode: mode });
}

/** Track when a game ends */
function trackGameComplete(mode, won, score) {
    trackEvent('game_complete', {
        mode: mode,
        result: won ? 'win' : 'loss',
        score: score
    });
}

// ==================== CONNECTIONS EVENTS ====================

function trackConnGuess(correct, groupName) {
    trackEvent('conn_guess', {
        correct: correct,
        group_name: groupName
    });
}

function trackConnRowExpand(rowIndex) {
    trackEvent('conn_row_expand', { row_index: rowIndex });
}

function trackConnVersePlay(ref) {
    trackEvent('conn_verse_play', { verse_ref: ref });
}

// ==================== HARF BY HARF EVENTS ====================

function trackHarfGuess(attempt, correct) {
    trackEvent('harf_guess', {
        attempt_number: attempt,
        correct: correct
    });
}

// ==================== WHO AM I EVENTS ====================

function trackDeductionClueReveal(clueNumber) {
    trackEvent('deduction_clue_reveal', { clue_number: clueNumber });
}

function trackDeductionGuess(category, correct) {
    trackEvent('deduction_guess', {
        category: category,
        correct: correct
    });
}

// ==================== SCRAMBLE EVENTS ====================

function trackScrambleMove() {
    trackEvent('scramble_move');
}

// ==================== VERSE & AUDIO EVENTS ====================

function trackVerseAudioPlay(ref, source) {
    trackEvent('verse_audio_play', {
        verse_ref: ref,
        source: source  // 'carousel', 'result_modal', 'auto'
    });
}

function trackWbwTap(ref, word) {
    trackEvent('wbw_word_tap', {
        verse_ref: ref,
        word: word
    });
}

// ==================== UI EVENTS ====================

function trackModalOpen(modalName) {
    trackEvent('modal_open', { modal: modalName });
}

function trackShare(mode, method) {
    trackEvent('share_result', {
        mode: mode,
        method: method  // 'native_share', 'clipboard'
    });
}

function trackThemeToggle(theme) {
    trackEvent('theme_toggle', { theme: theme });
}

function trackSidebarOpen() {
    trackEvent('sidebar_open');
}

function trackSidebarLink(link) {
    trackEvent('sidebar_link', { link: link });
}

// ==================== SHUKR & DHIKR EVENTS ====================

function trackShukrOpen() {
    trackEvent('shukr_open');
}

function trackDhikrTap(phrase, count) {
    trackEvent('dhikr_tap', {
        phrase: phrase,
        count: count
    });
}

function trackDhikrMilestone(phrase, milestone) {
    trackEvent('dhikr_milestone', {
        phrase: phrase,
        milestone: milestone
    });
}

// ==================== STATS & INSIGHTS EVENTS ====================

function trackStatsTabSwitch(tab) {
    trackEvent('stats_tab_switch', { tab: tab });
}

function trackInsightsView() {
    trackEvent('insights_view');
}

// ==================== PROGRESS EVENTS ====================

function trackSaveProgress() {
    trackEvent('save_progress');
}

function trackRestoreProgress(success) {
    trackEvent('restore_progress', { success: success });
}

// ==================== ONBOARDING EVENTS ====================

function trackOnboardingStep(step) {
    trackEvent('onboarding_step', { step: step });
}

function trackOnboardingComplete() {
    trackEvent('onboarding_complete');
}

function trackOnboardingSkip() {
    trackEvent('onboarding_skip');
}

// ==================== PWA EVENTS ====================

function trackInstallPrompt(action) {
    trackEvent('pwa_install', { action: action }); // 'shown', 'accepted', 'dismissed'
}

function trackNotificationPermission(result) {
    trackEvent('notification_permission', { result: result }); // 'granted', 'denied', 'dismissed'
}

// ==================== BUG REPORT EVENTS ====================

function trackBugReportOpen() {
    trackEvent('bug_report_open');
}

function trackBugReportSubmit(success) {
    trackEvent('bug_report_submit', { success: success });
}

// ==================== EXPLORE PROMPT EVENTS ====================

function trackExplorePromptTap() {
    trackEvent('explore_prompt_tap');
}
