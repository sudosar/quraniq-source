/* ============================================
   QURANIQ - STATS UTILITIES (shared)
   ============================================
   Pure helpers for stats display / leaderboard math.
   Lives outside app.js so it can be unit-tested under
   Node.js without a DOM. Browser code uses these via
   globals; tests load this file directly with `node`.
*/

/**
 * Calculate win-rate as an integer percentage in the [0, 100] range.
 *
 * Guards against three real-world failure modes:
 *  - `played = 0` (no games) → 0%
 *  - non-integer / corrupt counters (NaN, undefined) → 0%
 *  - inconsistent state where `won > played` (legacy/migrated data) → 100%
 *
 * Always clamps to [0, 100]. The display must never show > 100%.
 *
 * @param {number} won
 * @param {number} played
 * @returns {number} integer percentage in [0, 100]
 */
function calcWinRate(won, played) {
    const w = Number(won);
    const p = Number(played);
    if (!Number.isFinite(w) || !Number.isFinite(p) || p <= 0) return 0;
    // Clamp numerator so inconsistent state (won > played) can't exceed 100%.
    const ratio = Math.min(w, p) / p;
    const pct = Math.round(ratio * 100);
    return Math.min(100, Math.max(0, pct));
}

// Export for Node tests (CommonJS-style guard so browser global also works).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calcWinRate };
}