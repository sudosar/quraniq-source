/* ============================================
   QURANIQ - ONBOARDING & NOTIFICATIONS
   ============================================ */

const ONBOARDING_KEY = 'quraniq_onboarded';
const NOTIFICATION_KEY = 'quraniq_notifications';

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
 * Request notification permission and schedule daily reminders.
 * Uses the Notification API + service worker for reliable delivery.
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast('Notifications not supported on this browser.');
        return false;
    }

    if (Notification.permission === 'granted') {
        enableNotifications();
        return true;
    }

    if (Notification.permission === 'denied') {
        showToast('Notifications are blocked. Please enable them in your browser settings.');
        return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        enableNotifications();
        showToast('Daily reminders enabled!');
        trackNotificationPermission('granted');
        return true;
    } else {
        showToast('Notifications not enabled.');
        trackNotificationPermission('denied');
        return false;
    }
}

function enableNotifications() {
    localStorage.setItem(NOTIFICATION_KEY, 'enabled');
    scheduleNextReminder();
}

function disableNotifications() {
    localStorage.setItem(NOTIFICATION_KEY, 'disabled');
    // Clear any pending notification timeout
    if (window._notifTimeout) {
        clearTimeout(window._notifTimeout);
        window._notifTimeout = null;
    }
    showToast('Daily reminders disabled.');
}

function areNotificationsEnabled() {
    return localStorage.getItem(NOTIFICATION_KEY) === 'enabled' && Notification.permission === 'granted';
}

/**
 * Schedule a notification for the next UTC midnight (when new puzzles drop).
 * Uses setTimeout since there's no native cron in browsers.
 * Re-schedules itself after each notification.
 */
function scheduleNextReminder() {
    if (!areNotificationsEnabled()) return;

    const now = Date.now();
    const todayStart = Math.floor(now / DAY_MS) * DAY_MS;
    const nextMidnight = todayStart + DAY_MS;
    let delay = nextMidnight - now;

    // Add a small buffer (30 seconds after midnight) so puzzles are ready
    delay += 30000;

    // If somehow we're past midnight + buffer, schedule for tomorrow
    if (delay < 60000) {
        delay += DAY_MS;
    }

    window._notifTimeout = setTimeout(() => {
        sendDailyNotification();
        // Re-schedule for next day
        scheduleNextReminder();
    }, delay);
}

function sendDailyNotification(retryCount) {
    if (!areNotificationsEnabled()) return;
    retryCount = retryCount || 0;

    // Check if the user already played today (don't nag them)
    try {
        const state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
        const today = getDayNumber();
        const todayKey = `day_${today}`;
        if (state[todayKey]) return;
    } catch (e) {}

    // Verify today's puzzle actually exists before notifying
    const todayStr = new Date().toISOString().slice(0, 10);
    fetch('data/daily_puzzle.json?t=' + Date.now())
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (data && data.date === todayStr) {
                // Puzzle is ready — send notification
                doSendNotification();
            } else if (retryCount < 12) {
                // Puzzle not ready yet — retry in 5 minutes (up to 1 hour)
                setTimeout(() => sendDailyNotification(retryCount + 1), 300000);
            }
            // After 12 retries (1 hour), give up silently
        })
        .catch(() => {
            // Network error — retry in 5 minutes
            if (retryCount < 12) {
                setTimeout(() => sendDailyNotification(retryCount + 1), 300000);
            }
        });
}

function doSendNotification() {
    // Try service worker notification first (works when tab is closed on mobile)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('QuranIQ', {
                body: 'New daily puzzles are ready! Test your Quranic knowledge.',
                icon: './icons/icon-192.png',
                badge: './icons/icon-192.png',
                tag: 'quraniq-daily',
                renotify: true,
                data: { url: './' }
            }).catch(() => {
                showBasicNotification();
            });
        });
    } else {
        showBasicNotification();
    }
}

function showBasicNotification() {
    try {
        new Notification('QuranIQ', {
            body: 'New daily puzzles are ready! Test your Quranic knowledge.',
            icon: './icons/icon-192.png',
            tag: 'quraniq-daily'
        });
    } catch (e) {}
}

/**
 * Initialize the notification system on page load.
 * - Shows the notification toggle in the sidebar
 * - Resumes scheduling if previously enabled
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
                disableNotifications();
            } else {
                await requestNotificationPermission();
            }
            updateNotificationButton(btn);
        });
        sidebarActions.appendChild(btn);
    }

    // Resume scheduling if enabled
    if (areNotificationsEnabled()) {
        scheduleNextReminder();
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
