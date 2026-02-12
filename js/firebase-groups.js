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

        // Sign in anonymously and wait for auth state
        await new Promise((resolve) => {
            const unsubscribe = FB_STATE.auth.onAuthStateChanged((user) => {
                FB_STATE.user = user;
                if (user) {
                    console.log('[FB] Signed in:', user.uid.substring(0, 8) + '...');
                    // Load groups in background (don't block init)
                    loadUserGroups().catch(() => {});
                }
                unsubscribe();
                resolve();
            });
            FB_STATE.auth.signInAnonymously().catch(() => resolve());
        });

        FB_STATE.initialized = true;
        console.log('[FB] Firebase initialized');
        return true;
    } catch (err) {
        console.error('[FB] Init failed:', err);
        return false;
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
 * Get today's date string in YYYY-MM-DD format (UTC).
 */
function getTodayDateString() {
    const now = new Date();
    // Use UTC to match the daily puzzle reset
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

                // Sort dates and calculate
                const dates = Object.keys(scores).sort();
                dates.forEach(date => {
                    const s = scores[date];
                    if (s && s.total > 0) {
                        ramadanTotal += s.total;
                        daysPlayed++;
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
        const validResults = results.filter(r => r !== null);

        // Sort by today's total (descending), then Ramadan total
        validResults.sort((a, b) => {
            if (b.todayTotal !== a.todayTotal) return b.todayTotal - a.todayTotal;
            return b.ramadanTotal - a.ramadanTotal;
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
        const state = loadState();
        const dayNum = getDayNumber();
        let changed = false;

        // --- Connections ---
        const connState = state[`conn_${dayNum}`];
        if (connState && connState.gameOver && !current.connections) {
            // Calculate connections moons from state
            const correctCount = connState.correctCount ?? (connState.solved ? connState.solved.length : 0);
            const explored = new Set(connState.exploredVerses || []);
            // Each correctly solved row = 1 moon, full moon if all verses explored
            // Simplified: count correct rows as moons (max 4)
            let connMoons = 0;
            if (connState.solved) {
                connState.solved.forEach((s, i) => {
                    if (i < correctCount) {
                        // Check if all verses in this row were explored
                        const items = s.items || [];
                        const uniqueRefs = new Set();
                        items.forEach(item => {
                            const ref = typeof item === 'object' ? item.ref : '';
                            if (ref) uniqueRefs.add(ref);
                        });
                        let allExplored = uniqueRefs.size > 0;
                        uniqueRefs.forEach(ref => {
                            if (!explored.has(ref)) allExplored = false;
                        });
                        if (allExplored) connMoons++;
                    }
                });
            }
            current.connections = connMoons;
            changed = true;
            console.log('[FB] Backfill connections:', connMoons);
        }

        // --- Harf by Harf (Wordle) ---
        const wordleState = state[`wordle_${dayNum}`];
        if (wordleState && wordleState.gameOver && !current.harf) {
            const evals = wordleState.evaluations || [];
            const lastRow = evals[evals.length - 1] || [];
            const won = lastRow.every(e => e === 'correct');
            let moons = 0;
            if (won) {
                moons = Math.max(1, 6 - evals.length);
            }
            current.harf = moons;
            changed = true;
            console.log('[FB] Backfill harf:', moons);
        }

        // --- Who Am I? (Deduction) ---
        const dedState = state[`ded_${dayNum}`];
        if (dedState && dedState.gameOver && !current.deduction) {
            let moons = 0;
            if (dedState.won) {
                const clues = dedState.cluesRevealed || 0;
                if (clues <= 1) moons = 5;
                else if (clues === 2) moons = 4;
                else if (clues === 3) moons = 3;
                else if (clues === 4) moons = 2;
                else moons = 1;
            }
            current.deduction = moons;
            changed = true;
            console.log('[FB] Backfill deduction:', moons);
        }

        // --- Scramble ---
        const scrState = state[`scr_${dayNum}`];
        if (scrState && scrState.gameOver && !current.scramble) {
            let moons = 0;
            if (scrState.won) {
                moons = Math.max(1, 5 - (scrState.hintsUsed || 0));
            }
            current.scramble = moons;
            changed = true;
            console.log('[FB] Backfill scramble:', moons);
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
