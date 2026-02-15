/* ============================================
   QURANIQ - LEADERBOARD UI
   ============================================ */

// ==================== LEADERBOARD TAB/MODAL ====================

/**
 * Initialize the leaderboard system.
 * Called from DOMContentLoaded in app.js.
 */
async function initLeaderboard() {
    // Load local group data immediately for fast UI
    loadGroupsLocal();

    // Initialize Firebase in background
    const ok = await initFirebase();
    if (!ok) {
        console.warn('[LB] Firebase not available — leaderboard disabled');
        return;
    }

    // Show the leaderboard icon in the header
    const lbBtn = document.getElementById('leaderboard-btn');
    if (lbBtn) lbBtn.classList.remove('lb-hidden');

    // Process pending join code from invite link (#join=CODE)
    if (window._pendingJoinCode) {
        const code = window._pendingJoinCode;
        delete window._pendingJoinCode;
        processInviteJoin(code);
    }

    // Check for notifications after a short delay
    setTimeout(async () => {
        await checkGroupNotifications();
        showGroupNotificationBadge();
        showInAppNotifications();
    }, 3000);
}

/**
 * Open the leaderboard modal.
 */
function openLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    if (!modal) return;
    // Backfill any local scores that weren't submitted to Firebase
    // (e.g., games completed before joining a group)
    if (typeof backfillTodayScores === 'function') backfillTodayScores();
    // Sync verse stats to Firebase when opening leaderboard
    if (typeof syncVerseStatsToFirebase === 'function') syncVerseStatsToFirebase();
    renderLeaderboardUI();
    openModal('leaderboard-modal');
    trackEvent('leaderboard_open');
}

/**
 * Main render function for the leaderboard modal content.
 */
async function renderLeaderboardUI() {
    const content = document.getElementById('leaderboard-content');
    if (!content) return;

    const groups = getUserGroups();
    const groupCodes = Object.keys(groups);

    // If no groups, show onboarding
    if (groupCodes.length === 0) {
        content.innerHTML = renderNoGroupsView();
        attachNoGroupsHandlers();
        return;
    }

    // If no display name set, prompt for it
    const name = await getDisplayName();
    if (!name) {
        content.innerHTML = renderNamePrompt();
        attachNamePromptHandlers();
        return;
    }

    // Render group tabs + leaderboard
    const activeCode = getActiveGroup() || groupCodes[0];
    content.innerHTML = renderGroupLeaderboardView(groups, activeCode);
    attachLeaderboardHandlers(activeCode);

    // Fetch and render leaderboard data
    await loadAndRenderLeaderboard(activeCode);
}

// ==================== VIEW RENDERERS ====================

function renderNoGroupsView() {
    return `
        <div class="lb-onboarding">
            <div class="lb-onboarding-icon">👥</div>
            <h3>Family & Group Leaderboard</h3>
            <p>Compete with family and friends during Ramadan! Create a group or join one with a code.</p>
            <div class="lb-onboarding-actions">
                <button id="lb-create-btn" class="btn btn-primary lb-btn">
                    <span>✨</span> Create a Group
                </button>
                <button id="lb-join-btn" class="btn btn-secondary lb-btn">
                    <span>🔗</span> Join with Code
                </button>
            </div>
        </div>
    `;
}

function renderNamePrompt() {
    return `
        <div class="lb-name-prompt">
            <div class="lb-onboarding-icon">🏷️</div>
            <h3>What should we call you?</h3>
            <p>Choose a display name for the leaderboard. Your family and group members will see this.</p>
            <div class="lb-name-input-wrap">
                <input type="text" id="lb-name-input" class="lb-name-input" placeholder="e.g. Dad, Aisha, Ahmed" maxlength="30" autocomplete="off">
                <button id="lb-name-save" class="btn btn-primary">Save</button>
            </div>
        </div>
    `;
}

function renderGroupLeaderboardView(groups, activeCode) {
    const codes = Object.keys(groups);
    const activeGroup = groups[activeCode] || {};

    // Group tabs
    let tabsHtml = '<div class="lb-group-tabs">';
    codes.forEach(code => {
        const g = groups[code];
        const isActive = code === activeCode;
        tabsHtml += `<button class="lb-group-tab ${isActive ? 'active' : ''}" data-code="${code}">${g.name || code}</button>`;
    });
    // Add group button
    if (codes.length < MAX_GROUPS_PER_USER) {
        tabsHtml += `<button class="lb-group-tab lb-add-group" id="lb-add-group-btn" title="Create or join a group">+</button>`;
    }
    tabsHtml += '</div>';

    // Group info bar
    const infoHtml = `
        <div class="lb-group-info">
            <div class="lb-group-code">
                <span class="lb-code-label">Group Code:</span>
                <span class="lb-code-value" id="lb-code-display">${activeCode}</span>
                <button class="lb-copy-code" id="lb-copy-code" title="Copy code">📋</button>
            </div>
            <div class="lb-group-actions">
                <button class="lb-share-invite" id="lb-share-invite" title="Share invite link">📤 Invite</button>
                <button class="lb-leave-btn" id="lb-leave-btn" title="Leave this group">Leave</button>
            </div>
        </div>
    `;

    // Leaderboard table placeholder
    const tableHtml = `
        <div id="lb-table-container" class="lb-table-container">
            <div class="lb-loading">Loading leaderboard...</div>
        </div>
    `;

    return tabsHtml + infoHtml + tableHtml;
}

// Current sort field for leaderboard (default: total)
let _lbSortField = 'total';

function sortLeaderboardData(data, field) {
    const sorted = [...data];
    sorted.sort((a, b) => {
        if (field === 'total') {
            if (b.ramadanTotal !== a.ramadanTotal) return b.ramadanTotal - a.ramadanTotal;
            if (b.todayTotal !== a.todayTotal) return b.todayTotal - a.todayTotal;
            return (b.quranPercent || 0) - (a.quranPercent || 0);
        } else if (field === 'today') {
            if (b.todayTotal !== a.todayTotal) return b.todayTotal - a.todayTotal;
            if (b.ramadanTotal !== a.ramadanTotal) return b.ramadanTotal - a.ramadanTotal;
            return (b.quranPercent || 0) - (a.quranPercent || 0);
        } else { // quran
            if ((b.quranPercent || 0) !== (a.quranPercent || 0)) return (b.quranPercent || 0) - (a.quranPercent || 0);
            if (b.ramadanTotal !== a.ramadanTotal) return b.ramadanTotal - a.ramadanTotal;
            return b.todayTotal - a.todayTotal;
        }
    });
    return sorted;
}

function renderLeaderboardTable(data, activeCode) {
    if (!data || data.length === 0) {
        return `
            <div class="lb-empty">
                <p>No scores yet today. Be the first to play!</p>
                <p class="lb-empty-hint">Share the group code <strong>${activeCode}</strong> with family and friends.</p>
            </div>
        `;
    }

    // Sort data by current field
    data = sortLeaderboardData(data, _lbSortField);

    // Calculate top scorer badges for each game type (follows sort order)
    const gameBadges = calculateGameBadges(data, _lbSortField);

    let html = '<div class="lb-table">';

    // Header with tappable sort columns
    const arrow = ' ▼';
    html += `
        <div class="lb-row lb-header">
            <div class="lb-rank">#</div>
            <div class="lb-player">Player</div>
            <div class="lb-today lb-sort-col${_lbSortField === 'today' ? ' lb-sort-active' : ''}" data-sort="today" title="Tap to sort by today's crescents">Today${_lbSortField === 'today' ? arrow : ''}</div>
            <div class="lb-total lb-sort-col${_lbSortField === 'total' ? ' lb-sort-active' : ''}" data-sort="total" title="Tap to sort by total crescents">Total${_lbSortField === 'total' ? arrow : ''}</div>
            <div class="lb-quran lb-sort-col${_lbSortField === 'quran' ? ' lb-sort-active' : ''}" data-sort="quran" title="Tap to sort by Quran explored">Quran${_lbSortField === 'quran' ? arrow : ''}</div>
        </div>
    `;

    // Rows
    data.forEach((player, idx) => {
        const rank = idx + 1;
        const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
        const meClass = player.isMe ? 'lb-me' : '';
        const todayMoons = renderMiniMoons(player.todayTotal, 25);

        // Game breakdown tooltip
        const breakdown = `🔗 Connections: ${player.todayScores.connections} | 🔤 Harf: ${player.todayScores.harf} | 🔍 Who Am I: ${player.todayScores.deduction} | 🧩 Scramble: ${player.todayScores.scramble} | 🌙 Juz: ${player.todayScores.juz}`;

        const quranPct = player.quranPercent > 0 ? `${player.quranPercent}%` : '-';

        // Get this player's badges
        const badges = gameBadges[player.uid] || [];
        const badgeContext = _lbSortField === 'today' ? 'today' : 'overall';
        const badgesHtml = badges.length > 0
            ? `<span class="lb-badges">${badges.map(b => `<span class="lb-badge" title="Top ${b.label} ${badgeContext}">${b.icon}</span>`).join('')}</span>`
            : '';

        html += `
            <div class="lb-row ${meClass}" title="${breakdown}">
                <div class="lb-rank">${rankEmoji}</div>
                <div class="lb-player">
                    <span class="lb-player-top">
                        <span class="lb-player-name">${escapeHtml(player.displayName)}</span>
                        ${player.isMe ? '<span class="lb-you-badge">you</span>' : ''}
                    </span>
                    ${badgesHtml}
                </div>
                <div class="lb-today">${todayMoons}</div>
                <div class="lb-total">${player.ramadanTotal}🌙</div>
                <div class="lb-quran" title="${player.versesExplored} of 6,236 verses">${quranPct}</div>
            </div>
        `;
    });

    html += '</div>';

    // Badge legend
    html += `<p class="lb-badge-legend">🔗 Connections · 🔤 Harf · 🔍 Who Am I · 🧩 Scramble · 🌙 Juz</p>`;

    return html;
}

/**
 * Calculate which player has the top score in each game type.
 * Badges follow the current sort field:
 *   - 'total': badge goes to highest all-time per-game total (tie → higher today score)
 *   - 'today': badge goes to highest today per-game score (tie → higher all-time total)
 *   - 'quran': same as 'total'
 * Returns a map of uid -> array of badge objects.
 */
function calculateGameBadges(data, sortField) {
    const games = [
        { key: 'connections', icon: '🔗', label: 'Connections' },
        { key: 'harf', icon: '🔤', label: 'Harf by Harf' },
        { key: 'deduction', icon: '🔍', label: 'Who Am I' },
        { key: 'scramble', icon: '🧩', label: 'Scramble' },
        { key: 'juz', icon: '🌙', label: 'Juz Journey' }
    ];

    const useToday = sortField === 'today';
    const badges = {}; // uid -> [{ icon, label }]

    games.forEach(game => {
        let topScore = 0;
        let topTiebreaker = 0;
        let topUid = null;

        data.forEach(player => {
            // Primary score based on sort field
            const primary = useToday
                ? ((player.todayScores && player.todayScores[game.key]) || 0)
                : ((player.allTimeScores && player.allTimeScores[game.key]) || 0);
            // Tiebreaker is the other column
            const tiebreaker = useToday
                ? ((player.allTimeScores && player.allTimeScores[game.key]) || 0)
                : ((player.todayScores && player.todayScores[game.key]) || 0);

            if (primary > topScore || (primary === topScore && primary > 0 && tiebreaker > topTiebreaker)) {
                topScore = primary;
                topTiebreaker = tiebreaker;
                topUid = player.uid;
            }
        });

        // Only award badge if someone actually scored > 0
        if (topUid && topScore > 0) {
            if (!badges[topUid]) badges[topUid] = [];
            badges[topUid].push({ icon: game.icon, label: game.label });
        }
    });

    return badges;
}

function renderMiniMoons(count, max) {
    if (max <= 0) max = 25;
    const full = Math.min(count, max);
    // Show numeric for larger numbers
    if (max > 5) return `${count}🌙`;
    return '🌕'.repeat(full) + '🌑'.repeat(Math.max(0, max - full));
}

// ==================== CREATE/JOIN GROUP MODAL ====================

function showCreateGroupDialog() {
    const content = document.getElementById('leaderboard-content');
    content.innerHTML = `
        <div class="lb-dialog">
            <button class="lb-back-btn" id="lb-back-btn">← Back</button>
            <h3>Create a Group</h3>
            <p>Give your group a name. You'll get a code to share with family and friends.</p>
            <div class="lb-name-input-wrap">
                <input type="text" id="lb-group-name-input" class="lb-name-input" placeholder="e.g. Khan Family, Zikr Brothers" maxlength="40" autocomplete="off">
                <button id="lb-create-confirm" class="btn btn-primary">Create</button>
            </div>
        </div>
    `;

    document.getElementById('lb-back-btn').addEventListener('click', () => renderLeaderboardUI());
    document.getElementById('lb-create-confirm').addEventListener('click', async () => {
        const name = document.getElementById('lb-group-name-input').value.trim();
        if (!name || name.length < 2) {
            showToast('Please enter a group name (at least 2 characters).');
            return;
        }
        const btn = document.getElementById('lb-create-confirm');
        btn.disabled = true;
        btn.textContent = 'Creating...';

        const code = await createGroup(name);
        if (code) {
            showToast(`Group created! Code: ${code}`);
            trackEvent('group_created', { code });
            renderLeaderboardUI();
        } else {
            btn.disabled = false;
            btn.textContent = 'Create';
        }
    });

    document.getElementById('lb-group-name-input').focus();
}

function showJoinGroupDialog() {
    const content = document.getElementById('leaderboard-content');
    content.innerHTML = `
        <div class="lb-dialog">
            <button class="lb-back-btn" id="lb-back-btn">← Back</button>
            <h3>Join a Group</h3>
            <p>Enter the 6-character group code shared with you.</p>
            <div class="lb-name-input-wrap">
                <input type="text" id="lb-join-code-input" class="lb-name-input lb-code-input" placeholder="e.g. KHAN3X" maxlength="6" autocomplete="off" style="text-transform:uppercase; letter-spacing:3px; text-align:center; font-family:monospace; font-size:1.3rem;">
                <button id="lb-join-confirm" class="btn btn-primary">Join</button>
            </div>
        </div>
    `;

    document.getElementById('lb-back-btn').addEventListener('click', () => renderLeaderboardUI());
    document.getElementById('lb-join-confirm').addEventListener('click', async () => {
        const code = document.getElementById('lb-join-code-input').value.trim();
        if (!code || code.length < GROUP_CODE_LENGTH) {
            showToast('Please enter a valid 6-character group code.');
            return;
        }
        const btn = document.getElementById('lb-join-confirm');
        btn.disabled = true;
        btn.textContent = 'Joining...';

        const ok = await joinGroup(code);
        if (ok) {
            // Prompt for display name if not set
            const name = await getDisplayName();
            if (!name) {
                showToast('Joined! Now set your display name.');
            } else {
                showToast(`Joined group!`);
            }
            trackEvent('group_joined', { code });
            renderLeaderboardUI();
        } else {
            btn.disabled = false;
            btn.textContent = 'Join';
        }
    });

    document.getElementById('lb-join-code-input').focus();
}

function showAddGroupDialog() {
    const content = document.getElementById('leaderboard-content');
    content.innerHTML = `
        <div class="lb-dialog">
            <button class="lb-back-btn" id="lb-back-btn">← Back</button>
            <h3>Add Another Group</h3>
            <p>You can be in up to ${MAX_GROUPS_PER_USER} groups at once.</p>
            <div class="lb-onboarding-actions">
                <button id="lb-create-btn" class="btn btn-primary lb-btn">
                    <span>✨</span> Create a Group
                </button>
                <button id="lb-join-btn" class="btn btn-secondary lb-btn">
                    <span>🔗</span> Join with Code
                </button>
            </div>
        </div>
    `;

    document.getElementById('lb-back-btn').addEventListener('click', () => renderLeaderboardUI());
    document.getElementById('lb-create-btn').addEventListener('click', () => showCreateGroupDialog());
    document.getElementById('lb-join-btn').addEventListener('click', () => showJoinGroupDialog());
}

// ==================== EVENT HANDLERS ====================

function attachNoGroupsHandlers() {
    document.getElementById('lb-create-btn')?.addEventListener('click', () => {
        // Check if display name is set first
        checkNameThen(() => showCreateGroupDialog());
    });
    document.getElementById('lb-join-btn')?.addEventListener('click', () => {
        checkNameThen(() => showJoinGroupDialog());
    });
}

function attachNamePromptHandlers() {
    const input = document.getElementById('lb-name-input');
    const saveBtn = document.getElementById('lb-name-save');

    if (input) input.focus();

    const doSave = async () => {
        const name = input?.value.trim();
        if (!name || name.length < 1) {
            showToast('Please enter a name.');
            return;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        const ok = await setDisplayName(name);
        if (ok) {
            showToast(`Welcome, ${name}!`);
            renderLeaderboardUI();
        } else {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
            showToast('Failed to save name. Please try again.');
        }
    };

    saveBtn?.addEventListener('click', doSave);
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSave();
    });
}

function attachLeaderboardHandlers(activeCode) {
    // Group tab switching
    document.querySelectorAll('.lb-group-tab:not(.lb-add-group)').forEach(tab => {
        tab.addEventListener('click', () => {
            const code = tab.dataset.code;
            setActiveGroup(code);
            renderLeaderboardUI();
        });
    });

    // Add group button
    document.getElementById('lb-add-group-btn')?.addEventListener('click', () => {
        showAddGroupDialog();
    });

    // Copy code (short tap)
    document.getElementById('lb-copy-code')?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(activeCode);
            showToast('Group code copied!');
            trackEvent('group_code_copied', { code: activeCode });
        } catch {
            showToast(`Group code: ${activeCode}`);
        }
    });

    // Share invite button
    document.getElementById('lb-share-invite')?.addEventListener('click', async () => {
        const groupName = FB_STATE.groups[activeCode]?.name || 'our QuranIQ group';
        const inviteLink = `https://sudosar.github.io/quraniq/#join=${activeCode}`;
        const inviteMsg = `Join ${groupName} on QuranIQ! \u{1F319}\n\nLet's explore the Quran together this Ramadan through daily puzzles.\n\n\u{1F449} ${inviteLink}\n\nOr open QuranIQ and enter code: ${activeCode}`;

        // Try native share first (mobile), fall back to clipboard
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Join ${groupName} on QuranIQ`,
                    text: inviteMsg
                });
                trackEvent('group_invite_shared', { code: activeCode, method: 'native' });
                return;
            } catch (e) {
                // User cancelled or share failed, fall through to clipboard
            }
        }

        try {
            await navigator.clipboard.writeText(inviteMsg);
            showToast('Invite message copied! Paste it in WhatsApp or any chat.');
            trackEvent('group_invite_shared', { code: activeCode, method: 'clipboard' });
        } catch {
            showToast(`Share this link: ${inviteLink}`);
        }
    });

    // Leave group
    document.getElementById('lb-leave-btn')?.addEventListener('click', async () => {
        const groupName = FB_STATE.groups[activeCode]?.name || activeCode;
        if (!confirm(`Leave "${groupName}"? You can rejoin later with the code.`)) return;
        const ok = await leaveGroup(activeCode);
        if (ok) {
            showToast(`Left ${groupName}`);
            trackEvent('group_left', { code: activeCode });
            renderLeaderboardUI();
        }
    });

    // Row tap for breakdown
    document.querySelectorAll('.lb-row:not(.lb-header)').forEach(row => {
        row.addEventListener('click', () => {
            row.classList.toggle('lb-expanded');
        });
    });
}

// Store last fetched data and group code for re-rendering on sort change
let _lbLastData = null;
let _lbLastGroupCode = null;

function attachLeaderboardTableHandlers(container) {
    // Attach sort column click handlers
    container.querySelectorAll('.lb-sort-col').forEach(col => {
        col.addEventListener('click', (e) => {
            e.stopPropagation();
            const field = col.getAttribute('data-sort');
            if (field && field !== _lbSortField) {
                _lbSortField = field;
                // Re-render with new sort using cached data
                if (_lbLastData && _lbLastGroupCode) {
                    container.innerHTML = renderLeaderboardTable(_lbLastData, _lbLastGroupCode);
                    attachLeaderboardTableHandlers(container);
                }
            }
        });
    });

    // Attach row click handlers
    container.querySelectorAll('.lb-row:not(.lb-header)').forEach(row => {
        row.addEventListener('click', () => {
            const wasExpanded = row.classList.contains('lb-expanded');
            container.querySelectorAll('.lb-row').forEach(r => r.classList.remove('lb-expanded'));
            if (!wasExpanded) row.classList.toggle('lb-expanded');
        });
    });
}

async function loadAndRenderLeaderboard(groupCode) {
    const container = document.getElementById('lb-table-container');
    if (!container) return;

    container.innerHTML = '<div class="lb-loading"><div class="lb-spinner"></div> Loading...</div>';

    const data = await fetchGroupLeaderboard(groupCode);
    _lbLastData = data;
    _lbLastGroupCode = groupCode;
    _lbSortField = 'total'; // Reset to default on fresh load
    container.innerHTML = renderLeaderboardTable(data, groupCode);
    attachLeaderboardTableHandlers(container);
}

/**
 * Check if display name is set, prompt if not, then call callback.
 */
function checkNameThen(callback) {
    const name = localStorage.getItem('quraniq_display_name');
    if (name) {
        callback();
        return;
    }
    // Show name prompt first, then redirect to callback
    const content = document.getElementById('leaderboard-content');
    content.innerHTML = renderNamePrompt();

    const input = document.getElementById('lb-name-input');
    const saveBtn = document.getElementById('lb-name-save');
    if (input) input.focus();

    const doSave = async () => {
        const n = input?.value.trim();
        if (!n) { showToast('Please enter a name.'); return; }
        saveBtn.disabled = true;
        const ok = await setDisplayName(n);
        if (ok) {
            showToast(`Welcome, ${n}!`);
            callback();
        } else {
            saveBtn.disabled = false;
            showToast('Failed to save. Try again.');
        }
    };

    saveBtn?.addEventListener('click', doSave);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSave(); });
}

// ==================== INVITE LINK JOIN FLOW ====================

/**
 * Process an invite join link (#join=CODE).
 * Opens the leaderboard modal, checks if user already in group,
 * prompts for name if needed, then auto-joins.
 */
async function processInviteJoin(code) {
    code = code.toUpperCase();

    // Check if already in this group
    const groups = getUserGroups();
    if (groups[code]) {
        openModal('leaderboard-modal');
        setActiveGroup(code);
        renderLeaderboardUI();
        showToast('You\'re already in this group!');
        return;
    }

    // Check group limit
    if (Object.keys(groups).length >= MAX_GROUPS_PER_USER) {
        showToast(`You can only be in ${MAX_GROUPS_PER_USER} groups. Leave one first.`);
        return;
    }

    // Open the leaderboard modal with a special invite join view
    openModal('leaderboard-modal');
    const content = document.getElementById('leaderboard-content');

    // Check if display name is set
    const name = localStorage.getItem('quraniq_display_name');
    if (!name) {
        // Show name prompt first, then join
        content.innerHTML = `
            <div class="lb-dialog lb-invite-dialog">
                <div class="lb-onboarding-icon">🤝</div>
                <h3>You've been invited!</h3>
                <p>Someone invited you to join their QuranIQ group. First, choose a display name so they know who you are.</p>
                <div class="lb-name-input-wrap">
                    <input type="text" id="lb-invite-name" class="lb-name-input" placeholder="e.g. Dad, Aisha, Ahmed" maxlength="30" autocomplete="off">
                    <button id="lb-invite-name-save" class="btn btn-primary">Join Group</button>
                </div>
                <p class="lb-invite-code-hint">Joining group: <strong>${code}</strong></p>
            </div>
        `;

        const input = document.getElementById('lb-invite-name');
        const saveBtn = document.getElementById('lb-invite-name-save');
        if (input) input.focus();

        const doJoin = async () => {
            const n = input?.value.trim();
            if (!n) { showToast('Please enter a name.'); return; }
            saveBtn.disabled = true;
            saveBtn.textContent = 'Joining...';

            // Save name first
            const nameOk = await setDisplayName(n);
            if (!nameOk) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Join Group';
                showToast('Failed to save name. Try again.');
                return;
            }

            // Now join the group
            const joinOk = await joinGroup(code);
            if (joinOk) {
                showToast(`Welcome, ${n}! You joined the group.`);
                trackEvent('group_joined_via_invite', { code });
                setActiveGroup(code);
                renderLeaderboardUI();
            } else {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Join Group';
            }
        };

        saveBtn?.addEventListener('click', doJoin);
        input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doJoin(); });
    } else {
        // Name already set — show a quick confirmation and auto-join
        content.innerHTML = `
            <div class="lb-dialog lb-invite-dialog">
                <div class="lb-onboarding-icon">🤝</div>
                <h3>You've been invited!</h3>
                <p>Joining group <strong>${code}</strong>...</p>
                <div class="lb-loading"><div class="lb-spinner"></div> Joining...</div>
            </div>
        `;

        const joinOk = await joinGroup(code);
        if (joinOk) {
            showToast('You joined the group!');
            trackEvent('group_joined_via_invite', { code });
            setActiveGroup(code);
            renderLeaderboardUI();
        } else {
            content.innerHTML = `
                <div class="lb-dialog lb-invite-dialog">
                    <div class="lb-onboarding-icon">😕</div>
                    <h3>Couldn't join</h3>
                    <p>The group code <strong>${code}</strong> may be invalid or the group is full.</p>
                    <button class="btn btn-primary" onclick="renderLeaderboardUI()">OK</button>
                </div>
            `;
        }
    }
}

// ==================== NOTIFICATION BADGE & IN-APP ALERTS ====================

function showGroupNotificationBadge() {
    const notifs = FB_STATE.notifications;
    const badge = document.getElementById('lb-notif-badge');
    if (badge) {
        if (notifs.length > 0) {
            badge.textContent = notifs.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function showInAppNotifications() {
    const notifs = getGroupNotifications();
    if (notifs.length === 0) return;

    // Show a subtle toast for the most recent notification
    const latest = notifs[notifs.length - 1];
    if (latest.type === 'score') {
        showToast(`${latest.playerName} scored ${latest.total}🌙 today in ${latest.groupName}!`, 4000);
    }
}

// ==================== HELPERS ====================

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Extended showToast with custom duration
const _origShowToast = typeof showToast === 'function' ? showToast : null;
function showToastExtended(msg, duration) {
    if (_origShowToast) {
        _origShowToast(msg);
    }
}
