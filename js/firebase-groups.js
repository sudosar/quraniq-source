/* ============================================
   QURANIQ - FIREBASE GROUP LEADERBOARD
   ============================================ */

// ==================== FIREBASE CONFIG ====================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDdikf7zHCwcv9lzSja8lAgbNrNBJc6n9w",
    authDomain: "quraniq-30f8c.firebaseapp.com",
    databaseURL: "https://quraniq-30f8c-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "quraniq-30f8c",
    storageBucket: "quraniq-30f8c.firebasestorage.app",
    messagingSenderId: "933314288756",
    appId: "1:933314288756:web:9f16e7a81fa93d59094521"
};

// ==================== STATE ====================
const FB_STATE = {
    app: null,
    auth: null,
    db: null,
    user: null,
    displayName: '',
    groups: {},          // { code: { name, members, ... } }
    activeGroupCode: null,
    leaderboardCache: {},  // { groupCode: { data, timestamp } }
    listeners: [],       // Active Firebase listeners to clean up
    initialized: false,
    notifications: []    // In-app notification queue
};

const FB_CACHE_TTL = 5 * 60 * 1000; // 5 minute cache for leaderboard
const MAX_GROUPS_PER_USER = 5;
const MAX_MEMBERS_PER_GROUP = 20;
const GROUP_CODE_LENGTH = 6;
const FB_STORAGE_KEY = 'quraniq_fb_groups';

// ==================== INITIALIZATION ====================

/**
 * Initialize Firebase SDK (loaded via CDN compat scripts).
 * Returns true if successful.
 */
async function initFirebase() {
    if (FB_STATE.initialized) return true;
    try {
        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            console.warn('[FB] Firebase SDK not loaded');
            return false;
        }

        // Initialize Firebase app (only once)
        if (!firebase.apps.length) {
            FB_STATE.app = firebase.initializeApp(FIREBASE_CONFIG);
        } else {
            FB_STATE.app = firebase.apps[0];
        }

        FB_STATE.auth = firebase.auth();
        FB_STATE.db = firebase.database();

        // Set persistence to LOCAL (explicitly) to avoid session loss on refresh
        await FB_STATE.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        // Wait for auth state to resolve (check for existing session)
        await new Promise((resolve) => {
            let resolved = false;
            const unsubscribe = FB_STATE.auth.onAuthStateChanged((user) => {
                if (resolved) return;

                if (user) {
                    // Existing user found - restore session
                    FB_STATE.user = user;
                    console.log('[FB] Restored session:', user.uid.substring(0, 8) + '...');
                    loadUserGroups().catch(() => { });
                    resolved = true;
                    unsubscribe();
                    resolve();
                } else {
                    // No existing user - create new anonymous session
                    console.log('[FB] No existing session, signing in anonymously...');
                    FB_STATE.auth.signInAnonymously().catch((err) => {
                        console.error('[FB] Anonymous sign-in failed:', err);
                        if (!resolved) {
                            resolved = true;
                            unsubscribe();
                            resolve();
                        }
                    });
                }
            });

            // Timeout after 10 seconds to avoid hanging forever
            setTimeout(() => {
                if (!resolved) {
                    console.warn('[FB] Auth timed out, continuing without user');
                    resolved = true;
                    unsubscribe();
                    resolve();
                }
            }, 10000);
        });

        FB_STATE.initialized = true;
        console.log('[FB] Firebase initialized');

        // One-time score reset: clear all dates before 2026-02-13 (fresh start)
        oneTimeScoreReset();

        // Check for pending group migration (after save code restore)
        processPendingMigration();

        // Drain any scores queued while auth was resolving or on a previous load
        // (covers games that completed before Firebase was ready)
        drainPendingScores().catch((err) => console.error('[FB] Initial drain failed:', err));

        return true;
    } catch (err) {
        console.error('[FB] Init failed:', err);
        return false;
    }
}

/**
 * One-time cleanup: delete all score dates before the reset date.
 * This gives everyone a fresh start. Runs once per device, tracked via localStorage.
 * Safe to remove this function after all users have visited (e.g., after Ramadan starts).
 */
async function oneTimeScoreReset() {
    const RESET_KEY = 'quraniq_score_reset_v1';
    const RESET_CUTOFF = '2026-02-13'; // Keep this date and after; delete everything before

    if (localStorage.getItem(RESET_KEY)) return; // Already done on this device
    if (!FB_STATE.user) return;

    try {
        const uid = FB_STATE.user.uid;
        const scoresSnap = await FB_STATE.db.ref(`users/${uid}/scores`).once('value');
        const scores = scoresSnap.val();
        if (!scores) {
            localStorage.setItem(RESET_KEY, Date.now().toString());
            return;
        }

        const dates = Object.keys(scores);
        const oldDates = dates.filter(d => d < RESET_CUTOFF);

        if (oldDates.length > 0) {
            console.log('[FB] Score reset: removing', oldDates.length, 'old date(s):', oldDates.join(', '));
            for (const date of oldDates) {
                await FB_STATE.db.ref(`users/${uid}/scores/${date}`).remove();
            }
            // Invalidate leaderboard cache
            Object.keys(FB_STATE.leaderboardCache).forEach(k => {
                delete FB_STATE.leaderboardCache[k];
            });
            console.log('[FB] Score reset complete — fresh start from', RESET_CUTOFF);
        } else {
            console.log('[FB] Score reset: no old dates to remove');
        }

        localStorage.setItem(RESET_KEY, Date.now().toString());
    } catch (err) {
        console.error('[FB] Score reset failed:', err);
        // Don't set the flag so it retries next visit
    }
}

/**
 * Process pending migration after a save code restore.
 * Re-joins groups and migrates scores from old UID to new UID.
 */
async function processPendingMigration() {
    try {
        const migrationStr = localStorage.getItem('quraniq_fb_migration');
        if (!migrationStr) return;

        const migration = JSON.parse(migrationStr);
        if (!migration.oldUid || !migration.groupCodes || !FB_STATE.user) return;

        const newUid = FB_STATE.user.uid;
        const oldUid = migration.oldUid;

        // Skip if same UID (no migration needed)
        if (newUid === oldUid) {
            localStorage.removeItem('quraniq_fb_migration');
            return;
        }

        console.log('[FB] Processing migration from', oldUid.substring(0, 8), 'to', newUid.substring(0, 8));

        // Restore display name
        if (migration.displayName) {
            await FB_STATE.db.ref(`users/${newUid}/displayName`).set(migration.displayName);
            localStorage.setItem('quraniq_display_name', migration.displayName);
            FB_STATE.displayName = migration.displayName;
        }

        // Re-join each group with the new UID
        for (const code of migration.groupCodes) {
            try {
                // Check if group still exists
                const groupSnap = await FB_STATE.db.ref(`groups/${code}/name`).once('value');
                if (!groupSnap.val()) {
                    console.log('[FB] Migration: group', code, 'no longer exists, skipping');
                    continue;
                }

                // Check if old UID is still a member (hasn't been cleaned up)
                const oldMemberSnap = await FB_STATE.db.ref(`groups/${code}/members/${oldUid}`).once('value');

                // Add new UID as member
                await FB_STATE.db.ref(`groups/${code}/members/${newUid}`).set(true);
                await FB_STATE.db.ref(`users/${newUid}/groups/${code}`).set(true);

                // Remove old UID from group (swap)
                if (oldMemberSnap.val()) {
                    await FB_STATE.db.ref(`groups/${code}/members/${oldUid}`).remove();
                    await FB_STATE.db.ref(`users/${oldUid}/groups/${code}`).remove();
                    // Member count stays the same (swap, not add)
                } else {
                    // Old UID was already removed, increment count
                    const countSnap = await FB_STATE.db.ref(`groups/${code}/memberCount`).once('value');
                    await FB_STATE.db.ref(`groups/${code}/memberCount`).set((countSnap.val() || 0) + 1);
                }

                console.log('[FB] Migration: re-joined group', code);
            } catch (err) {
                console.error('[FB] Migration: failed to rejoin group', code, err);
            }
        }

        // Migrate scores from old UID to new UID
        try {
            const scoresSnap = await FB_STATE.db.ref(`users/${oldUid}/scores`).once('value');
            const oldScores = scoresSnap.val();
            if (oldScores) {
                await FB_STATE.db.ref(`users/${newUid}/scores`).set(oldScores);
                console.log('[FB] Migration: scores migrated');
            }
        } catch (err) {
            console.error('[FB] Migration: score migration failed:', err);
        }

        // Clean up old user data
        try {
            await FB_STATE.db.ref(`users/${oldUid}`).remove();
        } catch (e) {
            // Non-critical
        }

        // Clear migration flag
        localStorage.removeItem('quraniq_fb_migration');
        console.log('[FB] Migration complete');

        // Reload groups from Firebase to get fresh state
        await loadUserGroups();

    } catch (err) {
        console.error('[FB] Migration failed:', err);
        // Don't remove the flag — will retry on next load
    }
}

// ==================== USER PROFILE ====================

/**
 * Set or update the user's display name.
 */
async function setDisplayName(name) {
    const cleanName = (name || '').trim().substring(0, 30);
    if (!cleanName) {
        console.warn('[FB] setDisplayName: empty name');
        return false;
    }

    // Ensure Firebase is initialized and user is authenticated
    if (!FB_STATE.initialized || !FB_STATE.user) {
        console.warn('[FB] setDisplayName: Firebase not ready, attempting init...');
        const ok = await initFirebase();
        // Fallback: check firebase.auth().currentUser directly
        if (!FB_STATE.user && typeof firebase !== 'undefined' && firebase.auth) {
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
                FB_STATE.user = currentUser;
                console.log('[FB] setDisplayName: recovered user from auth().currentUser');
            }
        }
        if (!ok || !FB_STATE.user) {
            console.error('[FB] setDisplayName: Firebase init failed');
            return false;
        }
    }

    // Retry up to 2 times on failure
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            await FB_STATE.db.ref(`users/${FB_STATE.user.uid}/displayName`).set(cleanName);
            FB_STATE.displayName = cleanName;
            localStorage.setItem('quraniq_display_name', cleanName);
            console.log('[FB] Display name saved:', cleanName);
            return true;
        } catch (err) {
            console.error(`[FB] Set display name failed (attempt ${attempt}):`, err);
            if (attempt < 2) {
                // Wait briefly before retry
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
    return false;
}

/**
 * Get the current display name (from cache or Firebase).
 */
async function getDisplayName() {
    // Check local cache first
    const cached = localStorage.getItem('quraniq_display_name');
    if (cached) {
        FB_STATE.displayName = cached;
        return cached;
    }

    if (!FB_STATE.user) return '';
    try {
        const snap = await FB_STATE.db.ref(`users/${FB_STATE.user.uid}/displayName`).once('value');
        const name = snap.val() || '';
        if (name) {
            FB_STATE.displayName = name;
            localStorage.setItem('quraniq_display_name', name);
        }
        return name;
    } catch {
        return '';
    }
}

// ==================== GROUP MANAGEMENT ====================

/**
 * Generate a unique group code (6 alphanumeric chars, uppercase).
 */
function generateGroupCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (I, O, 0, 1)
    let code = '';
    const arr = new Uint8Array(GROUP_CODE_LENGTH);
    crypto.getRandomValues(arr);
    for (let i = 0; i < GROUP_CODE_LENGTH; i++) {
        code += chars[arr[i] % chars.length];
    }
    return code;
}

/**
 * Create a new group. Returns the group code or null on failure.
 */
async function createGroup(groupName) {
    if (!FB_STATE.user) return null;
    const cleanName = groupName.trim().substring(0, 40);
    if (cleanName.length < 2) return null;

    // Check user's group count
    const userGroups = Object.keys(FB_STATE.groups);
    if (userGroups.length >= MAX_GROUPS_PER_USER) {
        showToast(`You can join up to ${MAX_GROUPS_PER_USER} groups.`);
        return null;
    }

    try {
        // Generate unique code (retry if collision)
        let code = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            const candidate = generateGroupCode();
            const exists = await FB_STATE.db.ref(`groupLookup/${candidate}`).once('value');
            if (!exists.val()) {
                code = candidate;
                break;
            }
        }
        if (!code) {
            showToast('Could not generate a unique code. Please try again.');
            return null;
        }

        const uid = FB_STATE.user.uid;

        // Write each path individually (root-level multi-path updates fail with security rules)
        // Order matters: groupLookup first (reserves code), then group data, member, then user reference
        await FB_STATE.db.ref(`groupLookup/${code}`).set(true);
        await FB_STATE.db.ref(`groups/${code}/createdBy`).set(uid);
        await FB_STATE.db.ref(`groups/${code}/name`).set(cleanName);
        await FB_STATE.db.ref(`groups/${code}/createdAt`).set(firebase.database.ServerValue.TIMESTAMP);
        await FB_STATE.db.ref(`groups/${code}/members/${uid}`).set(true);
        await FB_STATE.db.ref(`groups/${code}/memberCount`).set(1);
        await FB_STATE.db.ref(`users/${uid}/groups/${code}`).set(true);

        FB_STATE.groups[code] = { name: cleanName, memberCount: 1 };
        FB_STATE.activeGroupCode = code;
        saveGroupsLocal();

        console.log('[FB] Group created:', code, cleanName);
        return code;
    } catch (err) {
        console.error('[FB] Create group failed:', err);
        showToast('Failed to create group. Please try again.');
        return null;
    }
}

/**
 * Join an existing group by code. Returns true on success.
 */
async function joinGroup(code) {
    if (!FB_STATE.user) return false;
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== GROUP_CODE_LENGTH) {
        showToast('Invalid group code. Please check and try again.');
        return false;
    }

    // Check if already in this group
    if (FB_STATE.groups[cleanCode]) {
        showToast('You are already in this group!');
        return false;
    }

    // Check user's group count
    if (Object.keys(FB_STATE.groups).length >= MAX_GROUPS_PER_USER) {
        showToast(`You can join up to ${MAX_GROUPS_PER_USER} groups.`);
        return false;
    }

    try {
        // Check if group exists
        const groupSnap = await FB_STATE.db.ref(`groups/${cleanCode}/name`).once('value');
        if (!groupSnap.val()) {
            showToast('Group not found. Please check the code.');
            return false;
        }

        // Check member count
        const countSnap = await FB_STATE.db.ref(`groups/${cleanCode}/memberCount`).once('value');
        const currentCount = countSnap.val() || 0;
        if (currentCount >= MAX_MEMBERS_PER_GROUP) {
            showToast(`This group is full (${MAX_MEMBERS_PER_GROUP} members max).`);
            return false;
        }

        const uid = FB_STATE.user.uid;

        // Write each path individually
        await FB_STATE.db.ref(`groups/${cleanCode}/members/${uid}`).set(true);
        await FB_STATE.db.ref(`groups/${cleanCode}/memberCount`).set(currentCount + 1);
        await FB_STATE.db.ref(`users/${uid}/groups/${cleanCode}`).set(true);

        const groupName = groupSnap.val();
        FB_STATE.groups[cleanCode] = { name: groupName, memberCount: currentCount + 1 };
        FB_STATE.activeGroupCode = cleanCode;
        saveGroupsLocal();

        console.log('[FB] Joined group:', cleanCode, groupName);
        return true;
    } catch (err) {
        console.error('[FB] Join group failed:', err);
        showToast('Failed to join group. Please try again.');
        return false;
    }
}

/**
 * Leave a group. Returns true on success.
 */
async function leaveGroup(code) {
    if (!FB_STATE.user) return false;

    try {
        const uid = FB_STATE.user.uid;
        const countSnap = await FB_STATE.db.ref(`groups/${code}/memberCount`).once('value');
        const currentCount = countSnap.val() || 1;

        // Write each path individually
        await FB_STATE.db.ref(`groups/${code}/members/${uid}`).remove();
        await FB_STATE.db.ref(`groups/${code}/memberCount`).set(Math.max(0, currentCount - 1));
        await FB_STATE.db.ref(`users/${uid}/groups/${code}`).remove();

        delete FB_STATE.groups[code];
        if (FB_STATE.activeGroupCode === code) {
            const remaining = Object.keys(FB_STATE.groups);
            FB_STATE.activeGroupCode = remaining.length > 0 ? remaining[0] : null;
        }
        saveGroupsLocal();

        // If group is now empty, clean it up
        if (currentCount <= 1) {
            await FB_STATE.db.ref(`groups/${code}`).remove();
            await FB_STATE.db.ref(`groupLookup/${code}`).remove();
        }

        console.log('[FB] Left group:', code);
        return true;
    } catch (err) {
        console.error('[FB] Leave group failed:', err);
        return false;
    }
}

// ==================== SCORE SUBMISSION ====================

const PENDING_SCORES_KEY = 'quraniq_pending_scores_v1';
const MAX_PENDING_SCORES = 50; // Keep queue bounded

/**
 * Persist a score to the pending queue (localStorage) so it's never lost
 * even if Firebase isn't ready or a write fails. The queue is drained on
 * auth success, on every page load, and when the leaderboard is opened.
 *
 * Queue entry shape: { gameMode, crescents, date, ts }
 */
function enqueuePendingScore(gameMode, crescents, dateStr) {
    try {
        const raw = localStorage.getItem(PENDING_SCORES_KEY);
        const queue = raw ? JSON.parse(raw) : [];
        // Coalesce: if a pending entry already exists for the same (date, gameMode)
        // keep the HIGHER crescents so re-plays don't lower the queued value.
        const idx = queue.findIndex(e => e && e.date === dateStr && e.gameMode === gameMode);
        if (idx >= 0) {
            if ((queue[idx].crescents || 0) < crescents) {
                queue[idx] = { gameMode, crescents, date: dateStr, ts: Date.now() };
            }
        } else {
            queue.push({ gameMode, crescents, date: dateStr, ts: Date.now() });
        }
        // Trim oldest if over cap
        while (queue.length > MAX_PENDING_SCORES) queue.shift();
        localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(queue));
    } catch (err) {
        console.error('[FB] Failed to enqueue score:', err);
    }
}

function readPendingScores() {
    try {
        const raw = localStorage.getItem(PENDING_SCORES_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.filter(e => e && e.gameMode != null && e.date) : [];
    } catch {
        return [];
    }
}

function clearPendingScore(dateStr, gameMode) {
    try {
        const raw = localStorage.getItem(PENDING_SCORES_KEY);
        if (!raw) return;
        const queue = JSON.parse(raw) || [];
        const filtered = queue.filter(e => !(e && e.date === dateStr && e.gameMode === gameMode));
        localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(filtered));
    } catch (err) {
        console.error('[FB] Failed to clear pending score:', err);
    }
}

/**
 * Drain all pending scores to Firebase. Safe to call repeatedly.
 * Called on auth success, on page load, and before leaderboard fetch.
 */
async function drainPendingScores() {
    if (!FB_STATE.user || !FB_STATE.initialized) return;
    const queue = readPendingScores();
    if (queue.length === 0) return;
    console.log(`[FB] Draining ${queue.length} pending score(s)...`);

    // Snapshot current uid so we don't drain into a different identity
    const currentUid = FB_STATE.user.uid;

    for (const entry of queue) {
        try {
            await submitFirebaseScoreRaw(entry.gameMode, entry.crescents, entry.date, currentUid);
            clearPendingScore(entry.date, entry.gameMode);
        } catch (err) {
            console.error('[FB] Drain failed for entry, will retry later:', entry, err);
            // Stop on first failure to avoid hammering Firebase
            break;
        }
    }
}

/**
 * Low-level Firebase score write. Bypasses the pending-queue logic.
 * @param {string} gameMode - one of: connections, harf, deduction, scramble, juz
 * @param {number} crescents - score in crescents
 * @param {string} [dateStr] - YYYY-MM-DD; defaults to today
 * @param {string} [uid] - target uid; defaults to current user
 */
async function submitFirebaseScoreRaw(gameMode, crescents, dateStr, uid) {
    if (!FB_STATE.db) throw new Error('DB not ready');
    const targetUid = uid || (FB_STATE.user && FB_STATE.user.uid);
    if (!targetUid) throw new Error('No user');
    const today = dateStr || getTodayDateString();
    const scorePath = `users/${targetUid}/scores/${today}`;

    const txnResult = await FB_STATE.db.ref(scorePath).transaction((current) => {
        current = current || {};

        const modeMap = {
            connections: 'connections',
            wordle: 'harf',
            harf: 'harf',
            deduction: 'deduction',
            scramble: 'scramble',
            juz: 'juz'
        };
        const field = modeMap[gameMode];
        if (!field) return; // abort transaction

        // Only update if the new score is higher
        if ((current[field] || 0) < crescents) {
            current[field] = crescents;
        }

        // Recalculate total
        const fields = ['connections', 'harf', 'deduction', 'scramble', 'juz'];
        current.total = fields.reduce((sum, f) => sum + (current[f] || 0), 0);

        return current;
    });

    // Set streak and timestamp via update() AFTER transaction —
    // ServerValue.TIMESTAMP cannot be set inside a transaction callback
    if (txnResult && txnResult.committed) {
        try {
            const stats = (typeof loadStats === 'function') ? loadStats() : null;
            const allModes = ['connections', 'wordle', 'deduction', 'scramble'];
            let bestStreak = 0;
            if (stats) {
                allModes.forEach(m => { if (stats[m]) bestStreak = Math.max(bestStreak, stats[m].streak); });
            }
            await FB_STATE.db.ref(scorePath).update({
                streak: bestStreak,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (e) { /* streak update is best-effort */ }
    }

    // Invalidate leaderboard cache (only if current user)
    if (targetUid === (FB_STATE.user && FB_STATE.user.uid)) {
        Object.keys(FB_STATE.leaderboardCache).forEach(k => {
            delete FB_STATE.leaderboardCache[k];
        });
    }

    return txnResult;
}

/**
 * Submit today's scores to Firebase.
 * Called after each game completion.
 *
 * Robust against:
 *  - Firebase not yet initialized (queues locally, drained on auth)
 *  - Auth not yet resolved (queues locally)
 *  - Network/transient errors (queue remains, retried on next drain)
 *  - User playing multiple games in one session (coalesced in queue)
 */
async function submitFirebaseScore(gameMode, crescents) {
    const dateStr = (typeof getTodayDateString === 'function') ? getTodayDateString() : null;

    // Always persist to the pending queue first — this is the source of truth
    // for "we owe Firebase a write." If Firebase is ready we'll drain it below.
    if (dateStr) enqueuePendingScore(gameMode, crescents, dateStr);

    if (!FB_STATE.user || !FB_STATE.initialized || !FB_STATE.db) {
        // Firebase not ready; the queued entry will be drained on auth/load
        return;
    }

    try {
        await submitFirebaseScoreRaw(gameMode, crescents, dateStr);
        // Success — remove from queue
        if (dateStr) clearPendingScore(dateStr, gameMode);
        // Sync verse exploration stats to Firebase profile
        syncVerseStatsToFirebase();
    } catch (err) {
        console.error('[FB] Score submit failed (will retry on next drain):', err);
        // Leave it in the queue; drainPendingScores() will retry
    }
}

/**
 * Get today's date string in YYYY-MM-DD format.
 * Always uses the active puzzle date (from the loaded puzzle file) when available.
 * This ensures scores are always keyed to the puzzle the user actually played,
 * not the wall-clock date — critical when a stale puzzle is served between
 * midnight and the next puzzle deployment.
 */
function getTodayDateString() {
    if (typeof getActivePuzzleDate === 'function') {
        const pd = getActivePuzzleDate();
        if (pd) return pd;
    }
    // Fallback to wall-clock only when no puzzle date is set (e.g., before any puzzle loaded)
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ==================== LEADERBOARD ====================

/**
 * Fetch leaderboard data for a group.
 * Returns array of { uid, displayName, scores: { date: {...} }, todayTotal, streak, ramadanTotal }
 */
async function fetchGroupLeaderboard(groupCode) {
    if (!FB_STATE.user || !groupCode) return [];

    // Check cache
    const cached = FB_STATE.leaderboardCache[groupCode];
    if (cached && (Date.now() - cached.timestamp) < FB_CACHE_TTL) {
        return cached.data;
    }

    try {
        // Get member list
        const membersSnap = await FB_STATE.db.ref(`groups/${groupCode}/members`).once('value');
        const members = membersSnap.val() || {};
        const memberUids = Object.keys(members).filter(uid => members[uid] === true);

        if (memberUids.length === 0) return [];

        // Fetch each member's display name and scores
        const today = getTodayDateString();
        const leaderboard = [];

        // Fetch in parallel (batch of member data)
        const promises = memberUids.map(async (uid) => {
            try {
                const [nameSnap, scoresSnap, verseSnap, pctSnap] = await Promise.all([
                    FB_STATE.db.ref(`users/${uid}/displayName`).once('value'),
                    FB_STATE.db.ref(`users/${uid}/scores`).orderByKey().limitToLast(30).once('value'),
                    FB_STATE.db.ref(`users/${uid}/versesExplored`).once('value'),
                    FB_STATE.db.ref(`users/${uid}/quranPercent`).once('value')
                ]);

                const displayName = nameSnap.val() || 'Anonymous';
                const scores = scoresSnap.val() || {};
                const todayScores = scores[today] || {};

                // Calculate Ramadan total (Feb 18 onwards)
                let ramadanTotal = 0;
                let daysPlayed = 0;
                let currentStreak = 0;
                let maxStreak = 0;

                // Per-game all-time totals (for badge tiebreaking)
                const allTimeScores = { connections: 0, harf: 0, deduction: 0, scramble: 0, juz: 0 };

                // Sort dates and calculate (ignore dates before cutoff)
                const SCORE_CUTOFF = '2026-02-13';
                const dates = Object.keys(scores).sort().filter(d => d >= SCORE_CUTOFF);
                dates.forEach(date => {
                    const s = scores[date];
                    if (s && s.total > 0) {
                        ramadanTotal += s.total;
                        daysPlayed++;
                    }
                    if (s) {
                        allTimeScores.connections += s.connections || 0;
                        allTimeScores.harf += s.harf || 0;
                        allTimeScores.deduction += s.deduction || 0;
                        allTimeScores.scramble += s.scramble || 0;
                        allTimeScores.juz += s.juz || 0;
                    }
                });

                // Calculate streak from most recent
                for (let i = dates.length - 1; i >= 0; i--) {
                    const s = scores[dates[i]];
                    if (s && s.total > 0) {
                        currentStreak++;
                        // Check if previous day also has scores
                        if (i > 0) {
                            const prevDate = new Date(dates[i]);
                            prevDate.setDate(prevDate.getDate() - 1);
                            const prevStr = prevDate.toISOString().split('T')[0];
                            if (dates[i - 1] !== prevStr) break;
                        }
                    } else {
                        break;
                    }
                }

                return {
                    uid,
                    displayName,
                    todayTotal: todayScores.total || 0,
                    todayScores: {
                        connections: todayScores.connections || 0,
                        harf: todayScores.harf || 0,
                        deduction: todayScores.deduction || 0,
                        scramble: todayScores.scramble || 0,
                        juz: todayScores.juz || 0
                    },
                    allTimeScores,
                    ramadanTotal,
                    daysPlayed,
                    streak: currentStreak,
                    versesExplored: verseSnap.val() || 0,
                    quranPercent: pctSnap.val() || 0,
                    isMe: uid === FB_STATE.user.uid
                };
            } catch {
                return null;
            }
        });

        const results = await Promise.all(promises);
        let validResults = results.filter(r => r !== null);

        // === COMPREHENSIVE NAME DEDUP ===
        // Detect ghost UIDs across ALL display names, not just the current user.
        // Ghost UIDs happen when someone clears cache, gets a new anonymous UID, and re-joins.
        // We keep the entry with the highest ramadanTotal and clean up the rest.

        // Group entries by display name
        const byName = {};
        for (const entry of validResults) {
            const name = entry.displayName || 'Anonymous';
            if (!byName[name]) byName[name] = [];
            byName[name].push(entry);
        }

        const ghostsToRemove = [];
        for (const [name, entries] of Object.entries(byName)) {
            if (entries.length < 2) continue;
            // Sort by ramadanTotal desc, todayTotal desc — best entry first
            entries.sort((a, b) => {
                if (b.ramadanTotal !== a.ramadanTotal) return b.ramadanTotal - a.ramadanTotal;
                return b.todayTotal - a.todayTotal;
            });
            const keeper = entries[0];
            const ghosts = entries.slice(1);
            console.log(`[FB] Dedup: name "${name}" has ${entries.length} entries — keeping UID ${keeper.uid.substring(0, 8)}, removing ${ghosts.length} ghost(s)`);
            // Merge ghost scores into keeper — SUM all totals (not MAX)
            // Each ghost UID has scores for different days; add them all up
            for (const ghost of ghosts) {
                keeper.ramadanTotal += ghost.ramadanTotal;
                keeper.daysPlayed = (keeper.daysPlayed || 0) + (ghost.daysPlayed || 0);
                if ((ghost.todayTotal || 0) > (keeper.todayTotal || 0)) { keeper.todayTotal = ghost.todayTotal; keeper.todayScores = ghost.todayScores; }
                if ((ghost.quranPercent || 0) > (keeper.quranPercent || 0)) { keeper.quranPercent = ghost.quranPercent; keeper.versesExplored = ghost.versesExplored; }
                if (ghost.streak > keeper.streak) keeper.streak = ghost.streak;
                if (ghost.allTimeScores && keeper.allTimeScores) {
                    for (const g of Object.keys(ghost.allTimeScores)) {
                        if ((ghost.allTimeScores[g] || 0) > (keeper.allTimeScores[g] || 0)) keeper.allTimeScores[g] = ghost.allTimeScores[g];
                    }
                }
                ghostsToRemove.push({ ghost, keeper, isCurrentUserGhost: keeper.isMe });
            }
        }

        // Merge ghost scores synchronously BEFORE returning leaderboard
        // This ensures the leaderboard shows the correct merged score immediately
        for (const { ghost, keeper } of ghostsToRemove) {
            try {
                const ghostScoresSnap = await FB_STATE.db.ref(`users/${ghost.uid}/scores`).once('value');
                const ghostScores = ghostScoresSnap.val();
                if (ghostScores) {
                    const myScoresSnap = await FB_STATE.db.ref(`users/${keeper.uid}/scores`).once('value');
                    const myScores = myScoresSnap.val() || {};
                    for (const [date, gs] of Object.entries(ghostScores)) {
                        if (!myScores[date] || (gs.total || 0) > (myScores[date].total || 0)) {
                            myScores[date] = gs;
                        }
                    }
                    await FB_STATE.db.ref(`users/${keeper.uid}/scores`).set(myScores);
                }
                await FB_STATE.db.ref(`groups/${groupCode}/members/${ghost.uid}`).remove();
                await FB_STATE.db.ref(`users/${ghost.uid}/groups/${groupCode}`).remove();
                const countSnap = await FB_STATE.db.ref(`groups/${groupCode}/memberCount`).once('value');
                await FB_STATE.db.ref(`groups/${groupCode}/memberCount`).set(Math.max(0, (countSnap.val() || 1) - 1));
                console.log(`[FB] Dedup: ghost UID ${ghost.uid.substring(0, 8)} removed from group`);
            } catch (err) {
                console.error('[FB] Dedup cleanup failed:', err);
            }
        }

        // Remove all ghosts from display
        const ghostUids = new Set(ghostsToRemove.map(g => g.ghost.uid));
        validResults = validResults.filter(r => !ghostUids.has(r.uid));

        // Sort by Total (primary), Today (secondary), Quran % (tertiary)
        validResults.sort((a, b) => {
            if (b.ramadanTotal !== a.ramadanTotal) return b.ramadanTotal - a.ramadanTotal;
            if (b.todayTotal !== a.todayTotal) return b.todayTotal - a.todayTotal;
            return (b.quranPercent || 0) - (a.quranPercent || 0);
        });

        // Cache the result
        FB_STATE.leaderboardCache[groupCode] = {
            data: validResults,
            timestamp: Date.now()
        };

        return validResults;
    } catch (err) {
        console.error('[FB] Fetch leaderboard failed:', err);
        return [];
    }
}

// ==================== IN-APP NOTIFICATIONS ====================

/**
 * Check for recent group activity and queue notifications.
 * Called on app load and when switching to leaderboard view.
 */
async function checkGroupNotifications() {
    if (!FB_STATE.user || Object.keys(FB_STATE.groups).length === 0) return;

    const today = getTodayDateString();
    const lastCheck = localStorage.getItem('quraniq_fb_last_notif_check') || '';
    const myUid = FB_STATE.user.uid;

    for (const code of Object.keys(FB_STATE.groups)) {
        try {
            const leaderboard = await fetchGroupLeaderboard(code);
            const groupName = FB_STATE.groups[code]?.name || code;

            leaderboard.forEach(member => {
                if (member.uid === myUid) return; // Skip self
                if (member.todayTotal > 0) {
                    // Check if we already notified about this
                    const notifKey = `${code}_${member.uid}_${today}`;
                    const shown = localStorage.getItem(`quraniq_notif_${notifKey}`);
                    if (!shown) {
                        FB_STATE.notifications.push({
                            type: 'score',
                            groupName,
                            playerName: member.displayName,
                            total: member.todayTotal,
                            key: notifKey
                        });
                        localStorage.setItem(`quraniq_notif_${notifKey}`, '1');
                    }
                }
            });
        } catch {
            // Silently fail
        }
    }

    localStorage.setItem('quraniq_fb_last_notif_check', today);
}

/**
 * Get and clear pending notifications.
 */
function getGroupNotifications() {
    const notifs = [...FB_STATE.notifications];
    FB_STATE.notifications = [];
    return notifs;
}

// ==================== LOCAL STORAGE HELPERS ====================

function saveGroupsLocal() {
    const data = {
        groups: FB_STATE.groups,
        activeGroupCode: FB_STATE.activeGroupCode
    };
    localStorage.setItem(FB_STORAGE_KEY, JSON.stringify(data));
}

function loadGroupsLocal() {
    try {
        const data = JSON.parse(localStorage.getItem(FB_STORAGE_KEY) || '{}');
        if (data.groups) FB_STATE.groups = data.groups;
        if (data.activeGroupCode) FB_STATE.activeGroupCode = data.activeGroupCode;
    } catch {
        // Ignore parse errors
    }
}

/**
 * Load user's groups from Firebase (source of truth).
 */
async function loadUserGroups() {
    if (!FB_STATE.user) return;

    // Load local cache first for instant UI
    loadGroupsLocal();

    try {
        const uid = FB_STATE.user.uid;
        const snap = await FB_STATE.db.ref(`users/${uid}/groups`).once('value');
        const groups = snap.val() || {};

        // Fetch group names for each code
        const codes = Object.keys(groups).filter(c => groups[c] === true);
        const freshGroups = {};

        for (const code of codes) {
            try {
                const nameSnap = await FB_STATE.db.ref(`groups/${code}/name`).once('value');
                const countSnap = await FB_STATE.db.ref(`groups/${code}/memberCount`).once('value');
                freshGroups[code] = {
                    name: nameSnap.val() || code,
                    memberCount: countSnap.val() || 0
                };
            } catch {
                freshGroups[code] = { name: code, memberCount: 0 };
            }
        }

        FB_STATE.groups = freshGroups;

        // Ensure active group is valid
        if (!FB_STATE.activeGroupCode || !freshGroups[FB_STATE.activeGroupCode]) {
            const firstCode = Object.keys(freshGroups)[0];
            FB_STATE.activeGroupCode = firstCode || null;
        }

        saveGroupsLocal();

        // Also load display name
        await getDisplayName();

        // Trigger UI update if leaderboard is visible
        if (typeof renderLeaderboardUI === 'function') {
            renderLeaderboardUI();
        }
    } catch (err) {
        console.error('[FB] Load user groups failed:', err);
    }
}

// ==================== UTILITY ====================

/**
 * Check if the user has any groups.
 */
function hasGroups() {
    return Object.keys(FB_STATE.groups).length > 0;
}

/**
 * Get the active group code.
 */
function getActiveGroup() {
    return FB_STATE.activeGroupCode;
}

/**
 * Set the active group.
 */
function setActiveGroup(code) {
    if (FB_STATE.groups[code]) {
        FB_STATE.activeGroupCode = code;
        saveGroupsLocal();
        // Invalidate cache to force refresh
        delete FB_STATE.leaderboardCache[code];
    }
}

/**
 * Get all user groups.
 */
function getUserGroups() {
    return { ...FB_STATE.groups };
}

/**
 * Check if Firebase is ready.
 */
function isFirebaseReady() {
    return FB_STATE.initialized && FB_STATE.user !== null;
}

// ==================== SCORE BACKFILL ====================

/**
 * Backfill today's scores from local game state to Firebase.
 * This handles the case where a user completed games before joining a group,
 * or when Firebase wasn't initialized at game completion time.
 * Called when the leaderboard is opened.
 */
async function backfillTodayScores() {
    if (!FB_STATE.user || !FB_STATE.initialized) return;
    if (Object.keys(FB_STATE.groups).length === 0) return;

    const today = getTodayDateString();
    const uid = FB_STATE.user.uid;
    const scorePath = `users/${uid}/scores/${today}`;

    try {
        // Read local game state and compute desired scores BEFORE transaction
        const state = loadState();
        const dayNum = (typeof app !== 'undefined' && app.dayNumber) ? app.dayNumber : getDayNumber();

        // Compute what we'd write — transaction needs this up front
        const computed = { connections: 0, harf: 0, deduction: 0, scramble: 0, juz: 0 };

        // --- Connections ---
        const connState = state[`conn_${dayNum}`];
        if (connState && connState.gameOver) {
            const correctCount = connState.correctCount ?? (connState.solved ? connState.solved.length : 0);
            const exploredSet = new Set(connState.exploredVerses || []);
            let connScore = 0;
            if (connState.solved) {
                connState.solved.forEach((s, i) => {
                    if (i < correctCount) {
                        connScore += 1;
                        const items = s.items || [];
                        const uniqueRefs = new Set(items.map(item => typeof item === 'object' ? item.ref : '').filter(Boolean));
                        const rowTotal = uniqueRefs.size || items.length;
                        let rowExplored = 0;
                        uniqueRefs.forEach(ref => { if (exploredSet.has(ref)) rowExplored++; });
                        if (rowExplored >= rowTotal) connScore += 1;
                    }
                });
            }
            computed.connections = Math.min(8, connScore);
        }

        // --- Harf by Harf ---
        const harfState = state[`harf_${dayNum}`] || state[`wordle_${dayNum}`];
        if (harfState && harfState.gameOver) {
            const evals = harfState.evaluations || [];
            const lastRow = evals[evals.length - 1] || [];
            const won = lastRow.length > 0 && lastRow.every(e => e === 'correct');
            if (won) {
                const totalRows = evals.length;
                computed.harf = Math.max(0, Math.max(1, 6 - totalRows) - (harfState.hintsUsed || 0));
            }
        }

        // --- Deduction ---
        const dedState = state[`ded_${dayNum}`];
        if (dedState && dedState.gameOver && dedState.won) {
            const clues = dedState.cluesRevealed || 0;
            if (clues <= 1) computed.deduction = 5;
            else if (clues === 2) computed.deduction = 4;
            else if (clues === 3) computed.deduction = 3;
            else if (clues === 4) computed.deduction = 2;
            else computed.deduction = 1;
        }

        // --- Scramble ---
        const scrState = state[`scr_${dayNum}`];
        if (scrState && scrState.gameOver && scrState.won) {
            computed.scramble = Math.max(1, 5 - (scrState.hintsUsed || 0) - (scrState.moves || 0));
        }

        // --- Juz ---
        try {
            const rawJuz = localStorage.getItem('quraniq_juz');
            if (rawJuz) {
                const juzState = JSON.parse(rawJuz);
                if (juzState && juzState.puzzle && juzState.puzzle.date === today && juzState.completed) {
                    const rawScore = (juzState.scores.round2 || 0) + (juzState.scores.round3 || 0) + (juzState.scores.round4 || 0);
                    computed.juz = Math.max(0, rawScore - Math.min(juzState.hintPenalty || 0, 2));
                }
            }
        } catch (e) { /* skip Juz on error */ }

        // Use transaction so concurrent writes don't clobber each other
        const txnResult = await FB_STATE.db.ref(scorePath).transaction((current) => {
            current = current || {};
            // Only update individual game scores if local computed is higher
            const fields = ['connections', 'harf', 'deduction', 'scramble', 'juz'];
            let didChange = false;
            for (const f of fields) {
                if ((current[f] || 0) < computed[f]) {
                    current[f] = computed[f];
                    didChange = true;
                }
            }
            if (!didChange) return; // abort — nothing to update
            // Recalculate total
            current.total = fields.reduce((sum, f) => sum + (current[f] || 0), 0);
            return current;
        });

        // After transaction, update streak and timestamp separately
        // (ServerValue.TIMESTAMP can't be set inside a transaction callback)
        if (txnResult && txnResult.committed) {
            const stats = loadStats();
            const allModes = ['connections', 'wordle', 'deduction', 'scramble'];
            let bestStreak = 0;
            allModes.forEach(m => { if (stats[m]) bestStreak = Math.max(bestStreak, stats[m].streak); });
            await FB_STATE.db.ref(scorePath).update({
                streak: bestStreak,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            console.log('[FB] Backfill complete — total:', computed.connections + computed.harf + computed.deduction + computed.scramble + computed.juz);
        }
    } catch (err) {
        console.error('[FB] Backfill failed:', err);
    }

    // Always invalidate leaderboard cache and sync stats, regardless of backfill result
    Object.keys(FB_STATE.leaderboardCache).forEach(k => { delete FB_STATE.leaderboardCache[k]; });
    syncVerseStatsToFirebase();

    // Also drain any pending scores queued from earlier (different dates, or
    // games submitted before this backfill). Best-effort.
    drainPendingScores().catch((err) => console.error('[FB] Drain after backfill failed:', err));
}

// ==================== VERSE STATS SYNC ====================

/**
 * Sync local verse exploration stats to Firebase user profile.
 * Called after each score submission so leaderboard can display Quran %.
 */
async function syncVerseStatsToFirebase() {
    if (!FB_STATE.user || !FB_STATE.initialized) return;
    try {
        const stats = typeof getVerseStats === 'function' ? getVerseStats() : null;
        if (!stats) return;

        const uid = FB_STATE.user.uid;
        await FB_STATE.db.ref(`users/${uid}/versesExplored`).set(stats.totalVerses);
        await FB_STATE.db.ref(`users/${uid}/quranPercent`).set(stats.quranPercent);
    } catch (err) {
        console.error('[FB] Verse stats sync failed:', err);
    }
}
