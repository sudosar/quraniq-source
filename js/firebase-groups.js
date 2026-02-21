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

/**
 * Submit today's scores to Firebase.
 * Called after each game completion.
 */
async function submitFirebaseScore(gameMode, crescents) {
    if (!FB_STATE.user || !FB_STATE.initialized) return;

    const today = getTodayDateString();
    const uid = FB_STATE.user.uid;
    const scorePath = `users/${uid}/scores/${today}`;

    try {
        // Read current scores for today
        const snap = await FB_STATE.db.ref(scorePath).once('value');
        const current = snap.val() || {};

        // Map game mode to score field
        const modeMap = {
            connections: 'connections',
            wordle: 'harf',
            harf: 'harf',
            deduction: 'deduction',
            scramble: 'scramble',
            juz: 'juz'
        };
        const field = modeMap[gameMode];
        if (!field) return;

        // Update the specific game score
        current[field] = crescents;

        // Recalculate total
        const fields = ['connections', 'harf', 'deduction', 'scramble', 'juz'];
        current.total = fields.reduce((sum, f) => sum + (current[f] || 0), 0);

        // Add streak info
        const stats = loadStats();
        const allModes = ['connections', 'wordle', 'deduction', 'scramble'];
        let bestStreak = 0;
        allModes.forEach(m => {
            if (stats[m]) bestStreak = Math.max(bestStreak, stats[m].streak);
        });
        current.streak = bestStreak;
        current.timestamp = firebase.database.ServerValue.TIMESTAMP;

        await FB_STATE.db.ref(scorePath).set(current);
        console.log('[FB] Score submitted:', gameMode, crescents);

        // Sync verse exploration stats to Firebase profile
        syncVerseStatsToFirebase();

        // Invalidate leaderboard cache
        Object.keys(FB_STATE.leaderboardCache).forEach(k => {
            delete FB_STATE.leaderboardCache[k];
        });
    } catch (err) {
        console.error('[FB] Score submit failed:', err);
    }
}

/**
 * Get today's date string in YYYY-MM-DD format.
 * Prefers the active puzzle date (from the loaded puzzle file) so that
 * scores are always keyed to the puzzle's date, not the wall-clock UTC date.
 * This prevents yesterday's scores from appearing under today's date when
 * the user plays a stale puzzle between midnight UTC and puzzle deployment.
 */
function getTodayDateString() {
    // Use the puzzle date if available (set by loadDailyWithHolding)
    if (typeof getActivePuzzleDate === 'function') {
        const pd = getActivePuzzleDate();
        if (pd) return pd;
    }
    // Fallback to UTC date (e.g., before puzzle loads)
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
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

        // Dedup: detect ghost UIDs (same display name as current user but different UID)
        // This happens when a user clears cache, gets a new anonymous UID, and re-joins
        const myEntry = validResults.find(r => r.isMe);
        if (myEntry) {
            const ghosts = validResults.filter(r =>
                !r.isMe &&
                r.displayName === myEntry.displayName &&
                r.uid !== myEntry.uid
            );
            for (const ghost of ghosts) {
                console.log('[FB] Dedup: merging ghost UID', ghost.uid.substring(0, 8), 'into', myEntry.uid.substring(0, 8));
                // Merge scores: keep the higher totals
                if (ghost.ramadanTotal > myEntry.ramadanTotal) {
                    myEntry.ramadanTotal = ghost.ramadanTotal;
                }
                if (ghost.todayTotal > myEntry.todayTotal) {
                    myEntry.todayTotal = ghost.todayTotal;
                    myEntry.todayScores = ghost.todayScores;
                }
                if ((ghost.quranPercent || 0) > (myEntry.quranPercent || 0)) {
                    myEntry.quranPercent = ghost.quranPercent;
                    myEntry.versesExplored = ghost.versesExplored;
                }
                if (ghost.streak > myEntry.streak) {
                    myEntry.streak = ghost.streak;
                }
                // Merge per-game all-time totals (keep higher of each)
                if (ghost.allTimeScores && myEntry.allTimeScores) {
                    for (const g of Object.keys(ghost.allTimeScores)) {
                        if ((ghost.allTimeScores[g] || 0) > (myEntry.allTimeScores[g] || 0)) {
                            myEntry.allTimeScores[g] = ghost.allTimeScores[g];
                        }
                    }
                }
                // Remove ghost from group in background (don't block UI)
                (async () => {
                    try {
                        // Merge ghost scores into current user in Firebase
                        const ghostScoresSnap = await FB_STATE.db.ref(`users/${ghost.uid}/scores`).once('value');
                        const ghostScores = ghostScoresSnap.val();
                        if (ghostScores) {
                            const myScoresSnap = await FB_STATE.db.ref(`users/${myEntry.uid}/scores`).once('value');
                            const myScores = myScoresSnap.val() || {};
                            // Merge: for each date, keep the higher total
                            for (const [date, gs] of Object.entries(ghostScores)) {
                                if (!myScores[date] || (gs.total || 0) > (myScores[date].total || 0)) {
                                    myScores[date] = gs;
                                }
                            }
                            await FB_STATE.db.ref(`users/${myEntry.uid}/scores`).set(myScores);
                        }
                        // Remove ghost from group
                        await FB_STATE.db.ref(`groups/${groupCode}/members/${ghost.uid}`).remove();
                        await FB_STATE.db.ref(`users/${ghost.uid}/groups/${groupCode}`).remove();
                        const countSnap = await FB_STATE.db.ref(`groups/${groupCode}/memberCount`).once('value');
                        await FB_STATE.db.ref(`groups/${groupCode}/memberCount`).set(Math.max(0, (countSnap.val() || 1) - 1));
                        console.log('[FB] Dedup: ghost UID removed from group');
                    } catch (err) {
                        console.error('[FB] Dedup cleanup failed:', err);
                    }
                })();
            }
            // Remove ghosts from display
            validResults = validResults.filter(r => !ghosts.includes(r));
        }

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
        // Read current Firebase scores for today
        const snap = await FB_STATE.db.ref(scorePath).once('value');
        const current = snap.val() || {};

        // Read local game state
        // Use app.dayNumber (which tracks the puzzle's day, not wall-clock)
        // so the local state key matches the Firebase date key.
        const state = loadState();
        const dayNum = (typeof app !== 'undefined' && app.dayNumber) ? app.dayNumber : getDayNumber();
        let changed = false;

        // --- Connections ---
        const connState = state[`conn_${dayNum}`];
        if (connState && connState.gameOver) {
            // New scoring: 🌒 1pt per solved row + 🌙 1 bonus pt if all verses in that row reviewed
            const correctCount = connState.correctCount ?? (connState.solved ? connState.solved.length : 0);
            const exploredSet = new Set(connState.exploredVerses || []);
            let connScore = 0;
            if (connState.solved) {
                connState.solved.forEach((s, i) => {
                    if (i < correctCount) {
                        connScore += 1; // 1pt for solving
                        // Check if all verses in this row were reviewed
                        const items = s.items || [];
                        const uniqueRefs = new Set();
                        items.forEach(item => {
                            const ref = typeof item === 'object' ? item.ref : '';
                            if (ref) uniqueRefs.add(ref);
                        });
                        const rowTotal = uniqueRefs.size || items.length;
                        let rowExplored = 0;
                        uniqueRefs.forEach(ref => {
                            if (exploredSet.has(ref)) rowExplored++;
                        });
                        if (rowExplored >= rowTotal) connScore += 1; // +1pt for reviewing all
                    }
                });
            }
            connScore = Math.min(8, connScore); // Max 8 (4 rows × 2pts)
            if ((current.connections || 0) < connScore) {
                current.connections = connScore;
                changed = true;
                console.log('[FB] Backfill connections:', connScore);
            }
        }

        // --- Harf by Harf (Wordle) ---
        // Try new key first, then old key (migration handled in app.js but safety first)
        const harfState = state[`harf_${dayNum}`] || state[`wordle_${dayNum}`];
        if (harfState && harfState.gameOver) {
            const evals = harfState.evaluations || [];
            // Check if won
            const lastRow = evals[evals.length - 1] || [];
            // In Harf, a win is when the last evaluation is all 'correct'
            // BUT careful: if lost, the last row isn't all correct.
            // Check game logic: 
            // - If won, last row is all correct.
            // - If lost, maxRows reached and not won.

            // We can trust the state's implicit result or re-verify:
            // Let's re-verify cleanly:
            const targetWord = (harfState.word || '').trim(); // Saved state might not have word? 
            // Actually app.state saves: board, currentRow, gameOver, evaluations, hintsUsed.
            // It DOES NOT save the target word usually? 
            // Wait, harf.js setupHarfGame uses harf.puzzle.word.
            // We can't easily re-verify "won" without the word.
            // BUT, we can infer "won" if the last evaluation row is all 'correct'.

            const won = lastRow.length > 0 && lastRow.every(e => e === 'correct');
            let moons = 0;
            if (won) {
                // Base: 1 try = 5, 2 = 4, 3 = 3, 4 = 2, 5-6 = 1
                // Minus hints
                const totalRows = evals.length;
                const baseMoons = Math.max(1, 6 - totalRows);
                moons = Math.max(0, baseMoons - (harfState.hintsUsed || 0));
            }
            // If lost, 0 moons.

            if ((current.harf || 0) < moons) {
                current.harf = moons;
                changed = true;
                console.log('[FB] Backfill harf:', moons);
            }
        }

        // --- Who Am I? (Deduction) ---
        const dedState = state[`ded_${dayNum}`];
        if (dedState && dedState.gameOver) {
            let moons = 0;
            if (dedState.won) {
                const clues = dedState.cluesRevealed || 0;
                if (clues <= 1) moons = 5;
                else if (clues === 2) moons = 4;
                else if (clues === 3) moons = 3;
                else if (clues === 4) moons = 2;
                else moons = 1;
            }
            if ((current.deduction || 0) < moons) {
                current.deduction = moons;
                changed = true;
                console.log('[FB] Backfill deduction:', moons);
            }
        }

        // --- Scramble ---
        const scrState = state[`scr_${dayNum}`];
        if (scrState && scrState.gameOver) {
            let moons = 0;
            if (scrState.won) {
                moons = Math.max(1, 5 - (scrState.hintsUsed || 0));
            }
            if ((current.scramble || 0) < moons) {
                current.scramble = moons;
                changed = true;
                console.log('[FB] Backfill scramble:', moons);
            }
        }

        // If any scores were backfilled, recalculate total and save
        if (changed) {
            const fields = ['connections', 'harf', 'deduction', 'scramble', 'juz'];
            current.total = fields.reduce((sum, f) => sum + (current[f] || 0), 0);

            const stats = loadStats();
            const allModes = ['connections', 'wordle', 'deduction', 'scramble'];
            let bestStreak = 0;
            allModes.forEach(m => {
                if (stats[m]) bestStreak = Math.max(bestStreak, stats[m].streak);
            });
            current.streak = bestStreak;
            current.timestamp = firebase.database.ServerValue.TIMESTAMP;

            await FB_STATE.db.ref(scorePath).set(current);
            console.log('[FB] Backfill complete — total:', current.total);

            // Invalidate leaderboard cache
            Object.keys(FB_STATE.leaderboardCache).forEach(k => {
                delete FB_STATE.leaderboardCache[k];
            });

            // Also sync verse stats
            syncVerseStatsToFirebase();
        }
    } catch (err) {
        console.error('[FB] Score backfill failed:', err);
    }
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
