#!/usr/bin/env node
/**
 * tests/test_win_rate.mjs — Issue #191 regression test
 *
 * Plain Node.js (no framework). Run: `node tests/test_win_rate.mjs`
 *
 * Verifies `calcWinRate` (defined in js/stats-utils.js) returns an integer
 * percentage in [0, 100] for every input, including the bug case from the
 * issue: scramble mode had `won > played` (e.g. 56 wins / 55 played → 102%).
 *
 * Exit code 0 = all assertions passed; non-zero = at least one failed.
 */

import { calcWinRate } from '../js/stats-utils.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, actual, expected) {
    const ok = actual === expected;
    if (ok) {
        passed++;
        console.log(`  ✓ ${label}`);
    } else {
        failed++;
        failures.push({ label, actual, expected });
        console.log(`  ✗ ${label}`);
        console.log(`      expected: ${JSON.stringify(expected)}`);
        console.log(`      actual:   ${JSON.stringify(actual)}`);
    }
}

function assertInRange(label, actual, lo, hi) {
    const ok = actual >= lo && actual <= hi;
    if (ok) {
        passed++;
        console.log(`  ✓ ${label} (got ${actual})`);
    } else {
        failed++;
        failures.push({ label, actual, expected: `[${lo}, ${hi}]` });
        console.log(`  ✗ ${label}`);
        console.log(`      expected: in [${lo}, ${hi}]`);
        console.log(`      actual:   ${actual}`);
    }
}

console.log('calcWinRate — issue #191 regression tests');

// ----- Cases from the issue / brief -----
console.log('\n[issue #191 spec]');
assert('0 wins / 0 played → 0%',          calcWinRate(0, 0),    0);
assert('5 wins / 5 played → 100%',       calcWinRate(5, 5),    100);
assert('7 wins / 5 played → 100% (cap)', calcWinRate(7, 5),    100); // was the bug: would have been 140%
assert('3 wins / 4 played → 75%',        calcWinRate(3, 4),    75);
assert('0 wins / 3 played → 0%',         calcWinRate(0, 3),    0);

// ----- The exact reported case (issue evidence) -----
console.log('\n[reported bug case]');
assert('56 wins / 55 played (was 102%) → 100% (capped)',
    calcWinRate(56, 55), 100);

// ----- Edge cases / safety -----
console.log('\n[edge cases]');
assertInRange('fractional (1/3) → 33 or 34', calcWinRate(1, 3), 33, 34);
assert('1 win / 1 played → 100%',            calcWinRate(1, 1),    100);
assert('1 win / 2 played → 50%',             calcWinRate(1, 2),    50);
assert('100 wins / 100 played → 100%',       calcWinRate(100, 100), 100);
assert('99 wins / 100 played → 99%',         calcWinRate(99, 100), 99);

// Defensive: corrupt / non-integer inputs must NOT yield >100 or NaN.
console.log('\n[corrupt-input safety]');
assert('NaN won / NaN played → 0',          calcWinRate(NaN, NaN), 0);
assert('NaN won / 5 played → 0',            calcWinRate(NaN, 5),   0);
assert('5 won / NaN played → 0',            calcWinRate(5, NaN),   0);
assert('undefined won / 5 played → 0',      calcWinRate(undefined, 5), 0);
assert('5 won / undefined played → 0',      calcWinRate(5, undefined), 0);
assert('null won / 5 played → 0',           calcWinRate(null, 5), 0);
assert('5 won / null played → 0',           calcWinRate(5, null), 0);
assert('-1 won / 5 played → 0 (clamped)',   calcWinRate(-1, 5),   0);
assert('5 won / -1 played → 0',             calcWinRate(5, -1),   0);

// Output must always be an integer in [0, 100].
console.log('\n[output invariants — 100 random inputs]');
let invFail = 0;
for (let i = 0; i < 100; i++) {
    const played = Math.floor(Math.random() * 200);
    const won    = Math.floor(Math.random() * (played + 50)); // sometimes > played
    const out = calcWinRate(won, played);
    if (!Number.isInteger(out) || out < 0 || out > 100) {
        invFail++;
        failures.push({ label: `invariant[played=${played},won=${won}]`, actual: out, expected: 'integer in [0,100]' });
    }
}
if (invFail === 0) {
    passed++;
    console.log('  ✓ all 100 random inputs produced integer in [0, 100]');
} else {
    failed++;
    console.log(`  ✗ ${invFail}/100 random inputs violated the invariant`);
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.error('FAIL: see errors above');
    process.exit(1);
} else {
    console.log('PASS');
    process.exit(0);
}