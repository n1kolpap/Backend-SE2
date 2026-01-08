/**
 * Unit tests for: utils/helpers.js  (or wherever this file lives)
 *
 * The module contains:
 *  - generateId()
 *  - formatDate()
 *  - calculateDays()
 *  - generateDateRange()
 *  - handleTripPlanError(res, error)
 *  - handleDailyPlanError(res, error)
 *
 * Testing goals:
 * 1) Pure utilities:
 *    - generateId: returns a string, includes "-" separator, and (with mocked time/random)
 *      produces a deterministic value.
 *    - formatDate: outputs YYYY-MM-DD for Date and for date-string inputs.
 *    - calculateDays: inclusive day count (diff + 1) and handles same-day range.
 *    - generateDateRange: returns inclusive list of YYYY-MM-DD strings.
 *
 * 2) Error mappers:
 *    - handleTripPlanError:
 *        - 'Trip plan not found' -> sendError(res, 404, MESSAGES.TRIP_NOT_FOUND)
 *        - 'Unauthorized access to trip plan' -> sendError(res, 403, 'Access denied')
 *        - unknown -> sendError(res, 500, MESSAGES.SERVER_ERROR, msg)
 *        - defensive null/undefined error -> msg undefined, still calls sendError(500,..., undefined)
 *
 *    - handleDailyPlanError:
 *        - 'Activity not found' -> sendError(res, 404, MESSAGES.ACTIVITY_NOT_FOUND)
 *        - otherwise delegates to handleTripPlanError(res, error)
 *
 * Tooling:
 * - We use esmock to mock sendError so we can assert it is called correctly.
 *
 * IMPORTANT:
 * - Adjust MODULE_ID to the correct location of helpers.js relative to tests/.
 */

import test from "ava";
import esmock from "esmock";
import { HTTP_STATUS, MESSAGES } from "../config/constants.js";

const MODULE_ID = "../utils/helpers.js"; // <-- change if needed (e.g. "../utils/helpers.js")

test.before(async (t) => {
  /**
   * call logs for sendError, and a configurable return value.
   */
  const calls = {
    sendError: [],
  };

  const state = {
    // What sendError should return (so we can assert the helper returns it).
    sendErrorReturn: { kind: "sendError-return" },
  };

  /**
   * Mock for ../utils/responses.js
   * Your helpers.js imports: { sendError } from '../utils/responses.js'
   */
  const responsesMock = {
    sendError: (...args) => {
      calls.sendError.push(args);
      return state.sendErrorReturn;
    },
  };

  /**
   * Import helpers module with mocked responses dependency.
   * Override key MUST match the import specifier in helpers.js exactly.
   */
  const helpers = await esmock(MODULE_ID, {
    "../utils/responses.js": responsesMock,
  });

  t.context.calls = calls;
  t.context.state = state;
  t.context.helpers = helpers;
});

test.beforeEach((t) => {
  // Clear sendError call logs before every test for clean assertions
  t.context.calls.sendError.length = 0;

  // Reset default return value
  t.context.state.sendErrorReturn = { kind: "sendError-return" };
});

/* -------------------------------------------------------------------------- */
/* Pure utility functions                                                     */
/* -------------------------------------------------------------------------- */

test.serial("generateId: returns deterministic value when Date.now and Math.random are mocked", (t) => {
  const { generateId } = t.context.helpers;

  // Save originals so we can restore them after this test
  const originalNow = Date.now;
  const originalRandom = Math.random;

  // AVA allows t.teardown() inside tests (not inside hooks)
  t.teardown(() => {
    Date.now = originalNow;
    Math.random = originalRandom;
  });

  // Make output deterministic:
  // - Date.now() => fixed timestamp
  // - Math.random() => fixed number whose base36 string we can predict
  Date.now = () => 1700000000000;
  Math.random = () => 0.123456789;

  const id = generateId();

  // Basic shape checks
  t.true(typeof id === "string");
  t.true(id.includes("-"));

  // Stronger: verify the prefix is the mocked timestamp
  t.true(id.startsWith("1700000000000-"));

  // We cannot easily predict the entire suffix without replicating the exact substring logic,
  // but we can still assert length and characters are reasonable.
  const [, suffix] = id.split("-");
  t.true(suffix.length > 0);
  t.regex(suffix, /^[a-z0-9]+$/);
});

test.serial("formatDate: formats a Date object to YYYY-MM-DD (UTC-based)", (t) => {
  const { formatDate } = t.context.helpers;

  // Use an explicit UTC date to avoid timezone surprises
  const d = new Date("2026-01-08T12:34:56.000Z");

  t.is(formatDate(d), "2026-01-08");
});

test.serial("formatDate: formats an ISO date string to YYYY-MM-DD", (t) => {
  const { formatDate } = t.context.helpers;

  t.is(formatDate("2026-02-01T00:00:00.000Z"), "2026-02-01");
});

test.serial("calculateDays: returns inclusive day count (same day -> 1)", (t) => {
  const { calculateDays } = t.context.helpers;

  t.is(calculateDays("2026-01-08", "2026-01-08"), 1);
});

test.serial("calculateDays: returns inclusive day count (Jan 1..Jan 3 -> 3)", (t) => {
  const { calculateDays } = t.context.helpers;

  t.is(calculateDays("2026-01-01", "2026-01-03"), 3);
});

test.serial("generateDateRange: returns inclusive YYYY-MM-DD list from start to end", (t) => {
  const { generateDateRange } = t.context.helpers;

  const out = generateDateRange("2026-01-01", "2026-01-03");

  t.deepEqual(out, ["2026-01-01", "2026-01-02", "2026-01-03"]);
});

/* -------------------------------------------------------------------------- */
/* handleTripPlanError                                                        */
/* -------------------------------------------------------------------------- */

test.serial("handleTripPlanError: 'Trip plan not found' -> sendError(404, TRIP_NOT_FOUND)", (t) => {
  const { handleTripPlanError } = t.context.helpers;
  const { calls, state } = t.context;

  const res = { __res: true };
  const err = new Error("Trip plan not found");

  const out = handleTripPlanError(res, err);

  // Helper returns whatever sendError returns
  t.deepEqual(out, state.sendErrorReturn);

  // sendError called with exactly: res, 404, message
  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND]);
});

test.serial("handleTripPlanError: 'Unauthorized access to trip plan' -> sendError(403, 'Access denied')", (t) => {
  const { handleTripPlanError } = t.context.helpers;
  const { calls } = t.context;

  const res = { __res: true };
  const err = new Error("Unauthorized access to trip plan");

  handleTripPlanError(res, err);

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.FORBIDDEN, "Access denied"]);
});

test.serial("handleTripPlanError: unknown error -> sendError(500, SERVER_ERROR, details=error.message)", (t) => {
  const { handleTripPlanError } = t.context.helpers;
  const { calls } = t.context;

  const res = { __res: true };
  const err = new Error("db exploded");

  handleTripPlanError(res, err);

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    "db exploded",
  ]);
});

test.serial("handleTripPlanError: defensive null/undefined error -> still sends 500 with details undefined", (t) => {
  const { handleTripPlanError } = t.context.helpers;
  const { calls } = t.context;

  const res = { __res: true };

  handleTripPlanError(res, undefined);

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    undefined,
  ]);
});

/* -------------------------------------------------------------------------- */
/* handleDailyPlanError                                                       */
/* -------------------------------------------------------------------------- */

test.serial("handleDailyPlanError: 'Activity not found' -> sendError(404, ACTIVITY_NOT_FOUND)", (t) => {
  const { handleDailyPlanError } = t.context.helpers;
  const { calls } = t.context;

  const res = { __res: true };
  const err = new Error("Activity not found");

  handleDailyPlanError(res, err);

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.ACTIVITY_NOT_FOUND]);
});

test.serial("handleDailyPlanError: non-activity error -> delegates to trip-plan mapping (e.g., 'Trip plan not found')", (t) => {
  const { handleDailyPlanError } = t.context.helpers;
  const { calls } = t.context;

  const res = { __res: true };
  const err = new Error("Trip plan not found");

  handleDailyPlanError(res, err);

  // Since delegation ends up calling sendError once with the trip-plan mapping:
  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND]);
});
