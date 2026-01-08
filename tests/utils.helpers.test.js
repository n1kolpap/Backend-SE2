/**
 * Unit tests for: utils/helpers.js
 *
 * These tests are written for an ESM project (package.json has "type": "module")
 * and use AVA.
 *
 * Key goals:
 * - Keep tests deterministic (stub Date.now / Math.random where needed)
 * - Avoid timezone flakiness when validating date logic
 */

import test from 'ava';
import {
  generateId,
  formatDate,
  calculateDays,
  generateDateRange,
} from '../utils/helpers.js';

/**
 * Some helper functions in helpers.js use Date parsing + local date arithmetic.
 * To minimize timezone-related flakiness on CI, we use explicit ISO strings with "Z"
 * and, where useful, a "noon UTC" timestamp which is less likely to roll a day
 * in typical timezones.
 */

test('generateId: returns "<timestamp>-<9 base36 chars>" and is stable with stubs', (t) => {
  // --- Arrange: stub Date.now and Math.random deterministically ---
  const originalNow = Date.now;
  const originalRandom = Math.random;

  // Make the timestamp deterministic.
  Date.now = () => 1700000000000;

  // Return a deterministic random value.
  Math.random = () => 0.123456789;

  t.teardown(() => {
    Date.now = originalNow;
    Math.random = originalRandom;
  });

  // --- Act ---
  const id = generateId();

  // --- Assert ---
  // Expected format is: "<Date.now()>-<randomSuffix>"
  t.true(typeof id === 'string');
  const parts = id.split('-');
  t.is(parts.length, 2);

  // Prefix is the timestamp
  t.is(parts[0], '1700000000000');

  // Suffix should be exactly 9 chars, base36 lowercase [a-z0-9]
  t.is(parts[1].length, 9);
  t.regex(parts[1], /^[a-z0-9]{9}$/);
});

test('generateId: produces different IDs when Math.random changes (even if timestamp stays the same)', (t) => {
  const originalNow = Date.now;
  const originalRandom = Math.random;

  // Keep timestamp constant to prove randomness impacts the output.
  Date.now = () => 1700000000000;

  // Sequential random values: two different calls => two different suffixes.
  const randomSeq = [0.111111111, 0.222222222];
  Math.random = () => randomSeq.shift();

  t.teardown(() => {
    Date.now = originalNow;
    Math.random = originalRandom;
  });

  const id1 = generateId();
  const id2 = generateId();

  t.not(id1, id2);
  t.true(id1.startsWith('1700000000000-'));
  t.true(id2.startsWith('1700000000000-'));
});

test('formatDate: formats an ISO timestamp string to YYYY-MM-DD (UTC)', (t) => {
  // Using a full ISO string with Z keeps behavior consistent.
  const out = formatDate('2025-01-02T10:20:30.000Z');
  t.is(out, '2025-01-02');
});

test('formatDate: formats a Date object to YYYY-MM-DD (UTC)', (t) => {
  // Create a Date explicitly in UTC.
  const d = new Date(Date.UTC(2025, 0, 5, 12, 0, 0)); // 2025-01-05 12:00:00Z
  const out = formatDate(d);
  t.is(out, '2025-01-05');
});

test('calculateDays: returns inclusive day count (same day => 1)', (t) => {
  const days = calculateDays('2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');
  t.is(days, 1);
});

test('calculateDays: returns inclusive day count (two consecutive days => 2)', (t) => {
  const days = calculateDays('2025-01-01T00:00:00.000Z', '2025-01-02T00:00:00.000Z');
  t.is(days, 2);
});

test('calculateDays: is order-independent because it uses Math.abs', (t) => {
  // 2025-01-01 .. 2025-01-10 inclusive => 10 days
  const forward = calculateDays('2025-01-01T00:00:00.000Z', '2025-01-10T00:00:00.000Z');
  const backward = calculateDays('2025-01-10T00:00:00.000Z', '2025-01-01T00:00:00.000Z');

  t.is(forward, 10);
  t.is(backward, 10);
});

test('generateDateRange: returns an inclusive list of YYYY-MM-DD strings', (t) => {
  // Use "noon UTC" to reduce risk of local-time rollovers in environments with non-UTC TZ.
  const start = '2025-01-01T12:00:00.000Z';
  const end = '2025-01-03T12:00:00.000Z';

  const range = generateDateRange(start, end);

  t.deepEqual(range, ['2025-01-01', '2025-01-02', '2025-01-03']);
});

test('generateDateRange: single-day range returns array with one element', (t) => {
  const start = '2025-06-15T12:00:00.000Z';
  const end = '2025-06-15T12:00:00.000Z';

  const range = generateDateRange(start, end);

  t.deepEqual(range, ['2025-06-15']);
});

test('generateDateRange: output is always YYYY-MM-DD', (t) => {
  const range = generateDateRange('2025-02-27T12:00:00.000Z', '2025-03-02T12:00:00.000Z');

  // Verify every element matches the expected format.
  t.true(Array.isArray(range));
  t.true(range.length > 0);
  for (const d of range) {
    t.regex(d, /^\d{4}-\d{2}-\d{2}$/);
  }
});

