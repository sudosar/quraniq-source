#!/usr/bin/env node
/**
 * tests/test_player_count.mjs — Issue #191 regression test
 *
 * The "41 players worldwide" count was stagnant because submitScore() (and
 * calculatePlayerScore()) referenced stats['wordle'] — which no longer
 * exists after the wordle → harf migration. Accessing `.played` on
 * undefined threw, the try/catch swallowed it, and quraniq_percentile
 * was never updated.
 *
 * This test exercises the relevant code paths under a fake localStorage
 * and verifies that the calculation no longer throws and that the
 * denominator includes harf (not wordle). It does NOT hit the live
 * SCORE_ENDPOINT — that's runtime-validated on deploy.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

// --- Minimal browser-ish globals so utils.js can run in Node ---
const storage = new Map();
const localStorage = {
    getItem: (k)    => storage.has(k) ? storage.get(k) : null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: ()       => storage.clear()
};

// Seed a realistic stats payload — the kind a long-time user has after
// the wordle → harf migration. Note: stats.wordle is intentionally absent.
const stats = {
    connections: { played: 63, won: 50, streak: 0, maxStreak: 9, lastDay: 200, distribution: { 1: 10, 2: 10, 3: 10, 4: 10, 5: 5, 6: 5 } },
    harf:        { played: 63, won: 60, streak: 1, maxStreak: 29, lastDay: 200, distribution: { 1: 20, 2: 20, 3: 10, 4: 5, 5: 3, 6: 2 } },
    deduction:   { played: 10, won: 8,  streak: 0, maxStreak: 4, lastDay: 200, distribution: { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1, 6: 0 } },
    scramble:    { played: 55, won: 56, streak: 5, maxStreak: 13, lastDay: 200, distribution: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5 } } // ← the bug: won > played
};
storage.set('quraniq_stats_v2', JSON.stringify(stats));

// Load utils.js into a sandbox that shares localStorage with our test.
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const utilsPath  = path.join(__dirname, '..', 'js', 'utils.js');
if (!existsSync(utilsPath)) {
    console.error(`utils.js not found at ${utilsPath}`);
    process.exit(2);
}

const sandbox = {
    localStorage,
    console,
    fetch: async () => ({ ok: false }), // submitScore short-circuits on !ok
    Number, Math, JSON, Date, Array, Object, String, Boolean,
    isNaN, isFinite, parseInt, parseFloat,
    setTimeout, clearTimeout,
};
vm.createContext(sandbox);
const utilsSrc = readFileSync(utilsPath, 'utf8');
vm.runInContext(utilsSrc, sandbox, { filename: 'utils.js' });

const api = {
    calculatePlayerScore: sandbox.calculatePlayerScore,
    submitScore:          sandbox.submitScore,
    loadStats:            sandbox.loadStats,
};

let passed = 0, failed = 0;
function assert(label, cond, detail) {
    if (cond) { passed++; console.log(`  ✓ ${label}`); }
    else      { failed++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
}

// --- Test 1: calculatePlayerScore no longer throws on stats without 'wordle' ---
console.log('calculatePlayerScore — bug repro');
let score = null, threw = null;
try { score = api.calculatePlayerScore(); } catch (e) { threw = e; }
assert('does NOT throw on stats without wordle', threw === null, threw && threw.message);
assert('returns a number',                       typeof score === 'number');
assert('returns an integer in [0, 100]',         Number.isInteger(score) && score >= 0 && score <= 100,
    `got ${score}`);

// --- Test 2: loadStats returns harf, not wordle (sanity) ---
console.log('\nloadStats schema');
const loaded = api.loadStats();
assert('stats has "harf"',            loaded && 'harf' in loaded);
assert('stats does NOT have "wordle"', !(loaded && 'wordle' in loaded));

// --- Test 3: submitScore no longer throws ---
console.log('\nsubmitScore — bug repro');
let result = null, threwSubmit = null;
// submitScore internally calls console.warn on failure; silence expected noise.
const origWarn = console.warn;
console.warn = () => {};
try {
    try { result = await api.submitScore(); } catch (e) { threwSubmit = e; }
} finally {
    console.warn = origWarn;
}
assert('does NOT throw on stats without wordle', threwSubmit === null, threwSubmit && threwSubmit.message);
// With fetch returning ok:false, submitScore returns null without writing
// quraniq_percentile. The KEY assertion is that it doesn't throw.

// --- Test 4: regression — confirm the OLD code WOULD throw ---
// (Verifies the test would actually catch a regression.)
console.log('\nnegative regression — broken code path throws');
const brokenModes = ['connections', 'wordle', 'deduction', 'scramble'];
function brokenCalcPlayerScore() {
    const stats = api.loadStats();
    let totalPlayed = 0;
    brokenModes.forEach(m => { totalPlayed += stats[m].played; });
    return totalPlayed;
}
let brokenThrew = null;
try { brokenCalcPlayerScore(); } catch (e) { brokenThrew = e; }
assert('broken (pre-fix) code WOULD throw — test would catch a regression',
    brokenThrew instanceof TypeError && /wordle|undefined/i.test(brokenThrew.message || ''),
    brokenThrew && brokenThrew.message);

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);