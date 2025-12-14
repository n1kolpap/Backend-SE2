/**
 * Unit tests for: utils/responses.js
 *
 * This module standardizes API responses across the backend.
 * We verify:
 *  1) HTTP status set via res.status(...)
 *  2) JSON payload sent via res.json(...)
 *  3) Chain behavior (returns `res`)
 *
 * Based on your exports and current usage:
 * - exports: sendSuccess, sendError
 * - signatures:
 *   sendSuccess(res, statusCode, data, message)
 *   sendError(res, statusCode, message, error = null)
 */

import test from 'ava';
import { sendSuccess, sendError } from '../utils/responses.js';

/**
 * Minimal Express-like response mock supporting chaining.
 */
function makeRes() {
  return {
    statusCode: undefined,
    jsonBody: undefined,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.jsonBody = body;
      return this;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* sendSuccess                                                                */
/* -------------------------------------------------------------------------- */

test('sendSuccess: sets status code and returns { success:true, data, message }', (t) => {
  const res = makeRes();

  // Arrange input (note the order: data then message)
  const data = { userId: 'u1' };
  const message = 'OK';

  // Act
  const out = sendSuccess(res, 200, data, message);

  // Assert: chain-friendly
  t.is(out, res);

  // Assert: status and JSON body
  t.is(res.statusCode, 200);
  t.deepEqual(res.jsonBody, {
    success: true,
    data,
    message,
  });
});

test('sendSuccess: allows message to be omitted (message becomes undefined)', (t) => {
  const res = makeRes();

  const data = { any: 'thing' };
  sendSuccess(res, 200, data);

  t.is(res.statusCode, 200);

  // If your implementation omits "message" entirely instead of setting undefined,
  // this will fail. In that case, paste responses.js and I will align the assertion.
  t.deepEqual(res.jsonBody, {
    success: true,
    data,
    message: undefined,
  });
});

/* -------------------------------------------------------------------------- */
/* sendError                                                                  */
/* -------------------------------------------------------------------------- */

test('sendError: sets status code and returns { success:false, message, error }', (t) => {
  const res = makeRes();

  const out = sendError(res, 400, 'Validation failed', 'Username is required');

  t.is(out, res);
  t.is(res.statusCode, 400);
  t.deepEqual(res.jsonBody, {
    success: false,
    message: 'Validation failed',
    error: 'Username is required',
  });
});

test('sendError: default error is null when omitted', (t) => {
  const res = makeRes();

  sendError(res, 500, 'Server error');

  t.is(res.statusCode, 500);
  t.deepEqual(res.jsonBody, {
    success: false,
    message: 'Server error',
    error: null,
  });
});
