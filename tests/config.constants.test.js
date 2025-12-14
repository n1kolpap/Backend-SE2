/**
 * Unit tests for: config/constants.js
 *
 * Goal:
 * - Verify the exported "contract" of constants.js:
 *   - HTTP_STATUS contains the expected keys + canonical numeric codes
 *   - MESSAGES contains the expected keys + non-empty strings
 *   - ACTIVITY_TYPES is a non-empty array of strings and includes expected values
 *
 * These tests are intentionally strict: if someone renames/removes a key,
 * the test fails early and loudly (which is what you want for constants).
 */

import test from 'ava';
import { HTTP_STATUS, MESSAGES, ACTIVITY_TYPES } from '../config/constants.js';

/**
 * Helper: assert an object has an own property.
 */
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

test('exports: HTTP_STATUS, MESSAGES, ACTIVITY_TYPES exist with correct types', (t) => {
  t.truthy(HTTP_STATUS);
  t.truthy(MESSAGES);
  t.truthy(ACTIVITY_TYPES);

  t.is(typeof HTTP_STATUS, 'object');
  t.is(typeof MESSAGES, 'object');
  t.true(Array.isArray(ACTIVITY_TYPES));

  t.false(Array.isArray(HTTP_STATUS));
  t.false(Array.isArray(MESSAGES));
});

test('HTTP_STATUS: contains expected keys and standard numeric values', (t) => {
  const expected = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  };

  // Ensure every expected key exists and has the exact numeric value.
  for (const [key, value] of Object.entries(expected)) {
    t.true(hasOwn(HTTP_STATUS, key), `HTTP_STATUS is missing key: ${key}`);
    t.is(
      HTTP_STATUS[key],
      value,
      `HTTP_STATUS.${key} should be ${value} but got ${HTTP_STATUS[key]}`
    );
    t.is(typeof HTTP_STATUS[key], 'number', `HTTP_STATUS.${key} must be a number`);
  }
});

test('MESSAGES: contains expected keys and all values are non-empty strings', (t) => {
  const requiredKeys = [
    'USER_CREATED',
    'USER_LOGGED_IN',
    'TRIP_CREATED',
    'TRIP_UPDATED',
    'TRIP_DELETED',
    'TRIP_NOT_FOUND',
    'ACTIVITY_ADDED',
    'ACTIVITY_REMOVED',
    'ACTIVITY_COMPLETED',
    'ACTIVITY_NOT_FOUND',
    'NOTE_ADDED',
    'UNAUTHORIZED',
    'INVALID_CREDENTIALS',
    'SERVER_ERROR',
  ];

  for (const key of requiredKeys) {
    t.true(hasOwn(MESSAGES, key), `MESSAGES is missing key: ${key}`);
    t.is(typeof MESSAGES[key], 'string', `MESSAGES.${key} must be a string`);
    t.true(
      MESSAGES[key].trim().length > 0,
           `MESSAGES.${key} must not be empty`
    );
  }

  // Spot-check a couple of exact strings to catch accidental edits.
  t.is(MESSAGES.UNAUTHORIZED, 'Unauthorized access');
  t.is(MESSAGES.SERVER_ERROR, 'Internal server error');
});

test('ACTIVITY_TYPES: is a non-empty array of unique lowercase strings', (t) => {
  t.true(ACTIVITY_TYPES.length > 0, 'ACTIVITY_TYPES should not be empty');

  // All entries should be strings.
  for (const v of ACTIVITY_TYPES) {
    t.is(typeof v, 'string', 'Every ACTIVITY_TYPES entry must be a string');
    t.true(v.trim().length > 0, 'No ACTIVITY_TYPES entry should be blank');
  }

  // Ensure all are lowercase (matches your current style; catches accidental casing).
  for (const v of ACTIVITY_TYPES) {
    t.is(v, v.toLowerCase(), `ACTIVITY_TYPES entry must be lowercase: ${v}`);
  }

  // Ensure no duplicates.
  const uniq = new Set(ACTIVITY_TYPES);
  t.is(uniq.size, ACTIVITY_TYPES.length, 'ACTIVITY_TYPES must not contain duplicates');

  // Contract check: ensure these well-known types exist.
  const expectedSubset = [
    'sightseeing',
    'restaurant',
    'museum',
    'outdoor',
    'shopping',
    'entertainment',
    'relaxation',
  ];

  for (const type of expectedSubset) {
    t.true(
      ACTIVITY_TYPES.includes(type),
           `ACTIVITY_TYPES should include "${type}"`
    );
  }
});
