/* ============================================
   QURANIQ - ONBOARDING & NOTIFICATIONS
   ============================================
   Notification strategy (layered for maximum reliability):
   1. Periodic Background Sync — wakes SW every ~12h even when tab is closed (Chrome/Edge 80+)
   2. Visibility check — when user returns to any tab, SW checks for new puzzle
   3. setTimeout fallback — schedules a timer for UTC midnight (works only while tab is open)
   All three layers are active simultaneously; the SW deduplicates via last-notified-date.
   ============================================ */

const ONBOARDING_KEY = 'quraniq_onboarded';
const NOTIFICATION_KEY = 'quraniq_notifications';
const NOTIF_CACHE_NAME = 'quraniq-notif-state';

// ==================== ONBOARDING TUTORIAL ====================

function shouldShowOnboarding() {
    return !localStorage.getItem(ONBOARDING_KEY);
}

function showOnboarding() {
    if (!shouldShowOnboarding()) return;

    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.id = 'onboarding-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Welcome to QuranIQ');

    overlay.innerHTML = `
        <div class="onboarding-card" id="onboarding-card">
            <div id="onboarding-step-1">
                <div class="onboarding-bismillah" aria-hidden="true">بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</div>
                <div class="onboarding-title">Quran<span class="logo-accent">IQ</span></div>
                <div class="onboarding-subtitle">Daily Quranic Puzzle Challenge</div>

                <div class="onboarding-modes">
                    <div class="onboarding-mode">
                        <div class="onboarding-mode-icon" aria-hidden="true">🔗</div>
                        <div class="onboarding-mode-name">Ayah Connections</div>
                        <div class="onboarding-mode-desc">Group 16 Quranic items into 4 categories</div>
                    </div>
                    <div class="onboarding-mode">
                        <div class="onboarding-mode-icon" aria-hidden="true">🔤</div>
                        <div class="onboarding-mode-name">Harf by Harf</div>
                        <div class="onboarding-mode-desc">Guess the Arabic word in 6 tries</div>
                    </div>
                    <div class="onboarding-mode">
                        <div class="onboarding-mode-icon" aria-hidden="true">🔍</div>
                        <div class="onboarding-mode-name">Who Am I?</div>
                        <div class="onboarding-mode-desc">Guess the Quranic figure from first-person clues</div>
                    </div>
                    <div class="onboarding-mode">
                        <div class="onboarding-mode-icon" aria-hidden="true">🧩</div>
                        <div class="onboarding-mode-name">Ayah Scramble</div>
                        <div class="onboarding-mode-desc">Arrange words to complete a verse</div>
                    </div>
                </div>

                <button class="onboarding-start-btn" id="onboarding-next">
                    Continue
                </button>
                <div class="onboarding-daily-note">
                    New puzzles every day at midnight UTC
                </div>
            </div>

            <div id="onboarding-step-2" style="display:none;">
                <div class="onboarding-notification">
                    <div class="onboarding-notification-icon" aria-hidden="true">🔔</div>
                    <h3>Never Miss a Puzzle</h3>
                    <p>Get a daily reminder when new puzzles are ready. You can change this anytime in the menu.</p>
                </div>

                <div class="onboarding-btn-group">
                    <button class="onboarding-start-btn" id="onboarding-enable-notif">
                        Enable Reminders
                    </button>
                    <button class="onboarding-skip-btn" id="onboarding-skip-notif">
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Step 1 -> Step 2
    document.getElementById('onboarding-next').addEventListener('click', () => {
        trackOnboardingStep(2);
        document.getElementById('onboarding-step-1').style.display = 'none';
        document.getElementById('onboarding-step-2').style.display = 'block';
        document.getElementById('onboarding-enable-notif').focus();
    });

    // Enable notifications
    document.getElementById('onboarding-enable-notif').addEventListener('click', async () => {
        await requestNotificationPermission();
        trackOnboardingComplete();
        completeOnboarding();
    });

    // Skip notifications
    document.getElementById('onboarding-skip-notif').addEventListener('click', () => {
        trackOnboardingSkip();
        completeOnboarding();
    });

    // Focus trap
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            completeOnboarding();
            return;
        }
        if (e.key === 'Tab') {
            const focusable = overlay.querySelectorAll('button:not([style*="display:none"])');
            const visible = [...focusable].filter(el => el.offsetParent !== null);
            if (visible.length === 0) return;
            const first = visible[0];
            const last = visible[visible.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // Auto-focus
    setTimeout(() => {
        document.getElementById('onboarding-next').focus();
    }, 100);
}

function completeOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
    }
}

// ==================== NOTIFICATION SYSTEM ====================

/**
 * Sync the notification preference to the service worker's Cache API store.
 * The SW reads this when it wakes up via Periodic Background Sync.
 */
async function syncNotifPrefToSW(enabled) {
    try {
        const cache = await caches.open(NOTIF_CACHE_NAME);
        await cache.put('notifications-enabled', new Response(enabled ? 'true' : 'false'));
    } catch (e) {
        // Cache API not available — SW fallback won't work, but setTimeout will
    }
}

/**
 * Register Periodic Background Sync so the SW wakes up every ~12 hours
 * to check for new puzzles, even when the tab is closed.
 */
async function registerPeriodicSync() {
    if (!('serviceWorker' in navigator)) return;

    try {
        const reg = await navigator.serviceWorker.ready;

        // Check if Periodic Background Sync is supported
        if ('periodicSync' in reg) {
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
            if (status.state === 'granted') {
                await reg.periodicSync.register('quraniq-puzzle-check', {
                    minInterval: 12 * 60 * 60 * 1000 // 12 hours
                });
                return true;
            }
        }
    } catch (e) {
        // Periodic Sync not supported or permission denied — fall through to other strategies
    }
    return false;
}

/**
 * Unregister Periodic Background Sync when notifications are disabled.
 */
async function unregisterPeriodicSync() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        if ('periodicSync' in reg) {
            await reg.periodicSync.unregister('quraniq-puzzle-check');
        }
    } catch (e) {}
}

/**
 * Ask the service worker to check for a new puzzle right now.
 * Used as a fallback trigger (visibility change, setTimeout).
 */
function triggerSWCheck() {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_PUZZLE' });
    }
}

/**
 * Request notification permission and enable all notification layers.
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast('Notifications not supported on this browser.');
        return false;
    }

    if (Notification.permission === 'granted') {
        await enableNotifications();
        return true;
    }

    if (Notification.permission === 'denied') {
        showToast('Notifications are blocked. Please enable them in your browser settings.');
        return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        await enableNotifications();
        showToast('Daily reminders enabled!');
        trackNotificationPermission('granted');
        return true;
    } else {
        showToast('Notifications not enabled.');
        trackNotificationPermission('denied');
        return false;
    }
}

async function enableNotifications() {
    localStorage.setItem(NOTIFICATION_KEY, 'enabled');

    // Layer 1: Periodic Background Sync (works when tab is closed)
    await syncNotifPrefToSW(true);
    const hasPBS = await registerPeriodicSync();

    // Layer 2: Visibility change listener (works when user returns to tab)
    setupVisibilityCheck();

    // Layer 3: setTimeout fallback (works while tab is open)
    scheduleNextReminder();

    if (hasPBS) {
        console.log('[QuranIQ] Periodic Background Sync registered (12h interval)');
    } else {
        console.log('[QuranIQ] Periodic Sync not available; using visibility + timer fallbacks');
    }
}

async function disableNotifications() {
    localStorage.setItem(NOTIFICATION_KEY, 'disabled');

    // Unregister all layers
    await syncNotifPrefToSW(false);
    await unregisterPeriodicSync();

    // Clear setTimeout fallback
    if (window._notifTimeout) {
        clearTimeout(window._notifTimeout);
        window._notifTimeout = null;
    }

    showToast('Daily reminders disabled.');
}

function areNotificationsEnabled() {
    return localStorage.getItem(NOTIFICATION_KEY) === 'enabled' && Notification.permission === 'granted';
}

// ── Layer 2: Visibility change ───────────────────────────────────
// When the user returns to the tab (e.g., opens phone, switches back),
// tell the SW to check if there's a new puzzle to notify about.

let _visibilityListenerAdded = false;

function setupVisibilityCheck() {
    if (_visibilityListenerAdded) return;
    _visibilityListenerAdded = true;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && areNotificationsEnabled()) {
            // Small delay to let network settle after wake
            setTimeout(() => triggerSWCheck(), 2000);
        }
    });
}

// ── Layer 3: setTimeout fallback ─────────────────────────────────
// Classic approach: schedule a timer for UTC midnight + buffer.
// Only works while the tab is open, but provides immediate coverage.

function scheduleNextReminder() {
    if (!areNotificationsEnabled()) return;

    // Clear any existing timer
    if (window._notifTimeout) {
        clearTimeout(window._notifTimeout);
    }

    const now = Date.now();
    const todayStart = Math.floor(now / DAY_MS) * DAY_MS;
    const nextMidnight = todayStart + DAY_MS;
    let delay = nextMidnight - now;

    // Add buffer (2 minutes after midnight) so GitHub Actions has time to push
    delay += 120000;

    // If somehow we're past midnight + buffer, schedule for tomorrow
    if (delay < 60000) {
        delay += DAY_MS;
    }

    window._notifTimeout = setTimeout(() => {
        // Tell the SW to check and notify
        triggerSWCheck();
        // Re-schedule for next day
        scheduleNextReminder();
    }, delay);
}

// ── Initialize ───────────────────────────────────────────────────

/**
 * Initialize the notification system on page load.
 * - Shows the notification toggle in the sidebar
 * - Resumes all notification layers if previously enabled
 */
function initNotifications() {
    // Add notification toggle to sidebar
    const sidebarActions = document.querySelector('.sidebar-actions');
    if (sidebarActions) {
        const btn = document.createElement('button');
        btn.id = 'notification-toggle-btn';
        btn.className = 'sidebar-action-btn';
        updateNotificationButton(btn);
        btn.addEventListener('click', async () => {
            if (areNotificationsEnabled()) {
                await disableNotifications();
            } else {
                await requestNotificationPermission();
            }
            updateNotificationButton(btn);
        });
        sidebarActions.appendChild(btn);
    }

    // Resume all notification layers if enabled
    if (areNotificationsEnabled()) {
        syncNotifPrefToSW(true);
        registerPeriodicSync();
        setupVisibilityCheck();
        scheduleNextReminder();

        // Also do an immediate check in case we missed a notification
        // (e.g., phone was off all night, user opens app in the morning)
        setTimeout(() => triggerSWCheck(), 3000);
    }
}

function updateNotificationButton(btn) {
    if (areNotificationsEnabled()) {
        btn.innerHTML = '<span aria-hidden="true">🔔</span> Reminders: On';
        btn.setAttribute('aria-label', 'Disable daily reminders');
    } else {
        btn.innerHTML = '<span aria-hidden="true">🔕</span> Reminders: Off';
        btn.setAttribute('aria-label', 'Enable daily reminders');
    }
}
