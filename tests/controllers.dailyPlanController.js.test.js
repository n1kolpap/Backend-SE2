/**
 * Unit tests for: controllers/dailyPlanController.js
 *
 * This is the UPDATED controller variant you pasted:
 * - It imports ONLY sendSuccess (no sendError).
 * - It delegates errors to:
 *    - handleTripPlanError(res, error) for:
 *        getDailyPlans, addActivity, addNote
 *    - handleDailyPlanError(res, error) for:
 *        removeActivity, markActivityCompleted
 *
 * We test:
 * - Success paths call the correct dailyPlanService function and then sendSuccess(...)
 * - Error paths delegate to the correct helper and return its value
 * - Controller uses authenticated userId from req.user.userId (not req.params.userId)
 *
 * Dependencies are mocked using esmock:
 * - ../services/dailyPlanService.js
 * - ../utils/responses.js (sendSuccess)
 * - ../utils/helpers.js (handleTripPlanError, handleDailyPlanError)
 *
 * IMPORTANT:
 * - Adjust MODULE_ID if your controller file path differs from controllers/dailyPlanController.js
 */

import test from "ava";
import esmock from "esmock";
import { HTTP_STATUS, MESSAGES } from "../config/constants.js";

const MODULE_ID = "../controllers/dailyPlanController.js"; // <-- adjust if needed

test.before(async (t) => {
  /**
   * Mutable behavior per test:
   * Each mocked function delegates to an implementation stored in `state`.
   * This keeps tests focused and avoids re-importing the controller for every test.
   */
  const state = {
    // Service behaviors
    getTripDailyPlansImpl: () => {
      throw new Error("test did not configure getTripDailyPlansImpl");
    },
    addActivityToDailyPlanImpl: () => {
      throw new Error("test did not configure addActivityToDailyPlanImpl");
    },
    removeActivityFromDailyPlanImpl: () => {
      throw new Error("test did not configure removeActivityFromDailyPlanImpl");
    },
    completeActivityImpl: () => {
      throw new Error("test did not configure completeActivityImpl");
    },
    addNoteToDailyPlanImpl: () => {
      throw new Error("test did not configure addNoteToDailyPlanImpl");
    },

    // Error handler behaviors
    handleTripPlanErrorImpl: () => ({ kind: "handleTripPlanError-return" }),
            handleDailyPlanErrorImpl: () => ({ kind: "handleDailyPlanError-return" }),
  };

  /**
   * Call logs: capture all interactions for precise assertions.
   */
  const calls = {
    // Service calls
    getTripDailyPlans: [],
    addActivityToDailyPlan: [],
    removeActivityFromDailyPlan: [],
    completeActivity: [],
    addNoteToDailyPlan: [],

    // Response helper calls
    sendSuccess: [],

    // Error helper calls
    handleTripPlanError: [],
    handleDailyPlanError: [],
  };

  /**
   * Mock dailyPlanService module (namespace import in controller).
   */
  const dailyPlanServiceMock = {
    getTripDailyPlans: (...args) => {
      calls.getTripDailyPlans.push(args);
      return state.getTripDailyPlansImpl(...args);
    },
    addActivityToDailyPlan: (...args) => {
      calls.addActivityToDailyPlan.push(args);
      return state.addActivityToDailyPlanImpl(...args);
    },
    removeActivityFromDailyPlan: (...args) => {
      calls.removeActivityFromDailyPlan.push(args);
      return state.removeActivityFromDailyPlanImpl(...args);
    },
    completeActivity: (...args) => {
      calls.completeActivity.push(args);
      return state.completeActivityImpl(...args);
    },
    addNoteToDailyPlan: (...args) => {
      calls.addNoteToDailyPlan.push(args);
      return state.addNoteToDailyPlanImpl(...args);
    },
  };

  /**
   * Mock sendSuccess.
   * We return a sentinel object to confirm the controller returns it.
   */
  const responsesMock = {
    sendSuccess: (...args) => {
      calls.sendSuccess.push(args);
      return { kind: "sendSuccess-return" };
    },
  };

  /**
   * Mock helpers: handleTripPlanError and handleDailyPlanError.
   */
  const helpersMock = {
    handleTripPlanError: (...args) => {
      calls.handleTripPlanError.push(args);
      return state.handleTripPlanErrorImpl(...args);
    },
    handleDailyPlanError: (...args) => {
      calls.handleDailyPlanError.push(args);
      return state.handleDailyPlanErrorImpl(...args);
    },
  };

  /**
   * Import controller with dependency injection.
   * Override keys must match the import specifiers in the controller file exactly.
   */
  const controller = await esmock(MODULE_ID, {
    "../services/dailyPlanService.js": dailyPlanServiceMock,
    "../utils/responses.js": responsesMock,
    "../utils/helpers.js": helpersMock,
  });

  t.context.state = state;
  t.context.calls = calls;
  t.context.controller = controller;
});

test.beforeEach((t) => {
  const { state, calls } = t.context;

  // Clear call logs
  for (const k of Object.keys(calls)) calls[k].length = 0;

  // Reset service behaviors to strict defaults
  state.getTripDailyPlansImpl = () => {
    throw new Error("test did not configure getTripDailyPlansImpl");
  };
  state.addActivityToDailyPlanImpl = () => {
    throw new Error("test did not configure addActivityToDailyPlanImpl");
  };
  state.removeActivityFromDailyPlanImpl = () => {
    throw new Error("test did not configure removeActivityFromDailyPlanImpl");
  };
  state.completeActivityImpl = () => {
    throw new Error("test did not configure completeActivityImpl");
  };
  state.addNoteToDailyPlanImpl = () => {
    throw new Error("test did not configure addNoteToDailyPlanImpl");
  };

  // Default error handler behaviors (return sentinels)
  state.handleTripPlanErrorImpl = () => ({ kind: "handleTripPlanError-return" });
  state.handleDailyPlanErrorImpl = () => ({ kind: "handleDailyPlanError-return" });
});

/* -------------------------------------------------------------------------- */
/* getDailyPlans                                                              */
/* -------------------------------------------------------------------------- */

test.serial('getDailyPlans: success -> calls getTripDailyPlans(tripId, tokenUserId) and sendSuccess(OK, dailyPlans, "Daily plans retrieved successfully")', async (t) => {
  const { controller, state, calls } = t.context;

  const dailyPlans = [{ id: "dp1" }, { id: "dp2" }];
  state.getTripDailyPlansImpl = () => dailyPlans;

  const req = {
    params: { tripId: "t1", userId: "ignored-param" },
    user: { userId: "u-token" }, // controller should use this
  };
  const res = { __res: true };

  const out = await controller.getDailyPlans(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  // Ensure correct service invocation
  t.is(calls.getTripDailyPlans.length, 1);
  t.deepEqual(calls.getTripDailyPlans[0], ["t1", "u-token"]);

  // Ensure correct response helper invocation
  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    dailyPlans,
    "Daily plans retrieved successfully",
  ]);

  // No error helpers invoked on success
  t.is(calls.handleTripPlanError.length, 0);
  t.is(calls.handleDailyPlanError.length, 0);
});

test.serial("getDailyPlans: service throws -> delegates to handleTripPlanError(res, error) and returns its value", async (t) => {
  const { controller, state, calls } = t.context;

  state.getTripDailyPlansImpl = () => {
    throw new Error("Trip plan not found");
  };

  state.handleTripPlanErrorImpl = (resArg, errArg) => ({
    kind: "handled-trip-error",
    msg: errArg.message,
  });

  const req = { params: { tripId: "t404" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.getDailyPlans(req, res);
  t.deepEqual(out, { kind: "handled-trip-error", msg: "Trip plan not found" });

  t.is(calls.handleTripPlanError.length, 1);
  t.is(calls.handleTripPlanError[0][0], res);
  t.is(calls.handleTripPlanError[0][1].message, "Trip plan not found");

  // When delegating, controller itself should not call sendSuccess
  t.is(calls.sendSuccess.length, 0);
});

/* -------------------------------------------------------------------------- */
/* addActivity                                                                */
/* -------------------------------------------------------------------------- */

test.serial("addActivity: success -> calls addActivityToDailyPlan(tripId, date, body, userId) and sendSuccess(CREATED, activity, ACTIVITY_ADDED)", async (t) => {
  const { controller, state, calls } = t.context;

  const activity = { activityId: "a1", name: "Museum" };
  state.addActivityToDailyPlanImpl = () => activity;

  const body = { name: "Museum", type: "museum" };
  const req = {
    params: { tripId: "t1", date: "2026-02-01", userId: "ignored-param" },
    user: { userId: "u-token" },
    body,
  };
  const res = { __res: true };

  const out = await controller.addActivity(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.addActivityToDailyPlan.length, 1);
  t.deepEqual(calls.addActivityToDailyPlan[0], ["t1", "2026-02-01", body, "u-token"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.CREATED,
    activity,
    MESSAGES.ACTIVITY_ADDED,
  ]);

  t.is(calls.handleTripPlanError.length, 0);
  t.is(calls.handleDailyPlanError.length, 0);
});

test.serial("addActivity: service throws -> delegates to handleTripPlanError(res, error)", async (t) => {
  const { controller, state, calls } = t.context;

  state.addActivityToDailyPlanImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  state.handleTripPlanErrorImpl = () => ({ kind: "handled-addActivity-error" });

  const req = {
    params: { tripId: "t1", date: "2026-02-01" },
    user: { userId: "u1" },
    body: { name: "X" },
  };
  const res = { __res: true };

  const out = await controller.addActivity(req, res);
  t.deepEqual(out, { kind: "handled-addActivity-error" });

  t.is(calls.handleTripPlanError.length, 1);
  t.is(calls.handleTripPlanError[0][0], res);
  t.is(calls.handleTripPlanError[0][1].message, "Unauthorized access to trip plan");

  t.is(calls.sendSuccess.length, 0);
});

/* -------------------------------------------------------------------------- */
/* removeActivity                                                             */
/* -------------------------------------------------------------------------- */

test.serial("removeActivity: success -> calls removeActivityFromDailyPlan(...) and sendSuccess(OK, null, ACTIVITY_REMOVED)", async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => true;

  const req = {
    params: { tripId: "t1", date: "2026-02-01", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.removeActivity(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.removeActivityFromDailyPlan.length, 1);
  t.deepEqual(calls.removeActivityFromDailyPlan[0], ["t1", "2026-02-01", "a1", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    null,
    MESSAGES.ACTIVITY_REMOVED,
  ]);

  // Success: no error helpers invoked
  t.is(calls.handleDailyPlanError.length, 0);
  t.is(calls.handleTripPlanError.length, 0);
});

test.serial("removeActivity: service throws -> delegates to handleDailyPlanError(res, error) and returns its value", async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => {
    throw new Error("Activity not found");
  };

  state.handleDailyPlanErrorImpl = (resArg, errArg) => ({
    kind: "handled-daily-error",
    msg: errArg.message,
  });

  const req = {
    params: { tripId: "t1", date: "2026-02-01", activityId: "missing" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.removeActivity(req, res);
  t.deepEqual(out, { kind: "handled-daily-error", msg: "Activity not found" });

  t.is(calls.handleDailyPlanError.length, 1);
  t.is(calls.handleDailyPlanError[0][0], res);
  t.is(calls.handleDailyPlanError[0][1].message, "Activity not found");

  // Delegated errors => controller should not call sendSuccess
  t.is(calls.sendSuccess.length, 0);
});

/* -------------------------------------------------------------------------- */
/* markActivityCompleted                                                      */
/* -------------------------------------------------------------------------- */

test.serial("markActivityCompleted: success -> calls completeActivity(...) and sendSuccess(OK, activity, ACTIVITY_COMPLETED)", async (t) => {
  const { controller, state, calls } = t.context;

  const activity = { activityId: "a1", completed: true };
  state.completeActivityImpl = () => activity;

  const req = {
    params: { tripId: "t1", date: "2026-02-01", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.markActivityCompleted(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.completeActivity.length, 1);
  t.deepEqual(calls.completeActivity[0], ["t1", "2026-02-01", "a1", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    activity,
    MESSAGES.ACTIVITY_COMPLETED,
  ]);

  t.is(calls.handleDailyPlanError.length, 0);
  t.is(calls.handleTripPlanError.length, 0);
});

test.serial("markActivityCompleted: service throws -> delegates to handleDailyPlanError(res, error)", async (t) => {
  const { controller, state, calls } = t.context;

  state.completeActivityImpl = () => {
    throw new Error("Trip plan not found");
  };

  state.handleDailyPlanErrorImpl = () => ({ kind: "handled-complete-error" });

  const req = {
    params: { tripId: "t404", date: "2026-02-01", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.markActivityCompleted(req, res);
  t.deepEqual(out, { kind: "handled-complete-error" });

  t.is(calls.handleDailyPlanError.length, 1);
  t.is(calls.handleDailyPlanError[0][0], res);
  t.is(calls.handleDailyPlanError[0][1].message, "Trip plan not found");

  t.is(calls.sendSuccess.length, 0);
});

/* -------------------------------------------------------------------------- */
/* addNote                                                                    */
/* -------------------------------------------------------------------------- */

test.serial("addNote: success -> calls addNoteToDailyPlan(tripId, date, note, userId) and sendSuccess(OK, dailyPlan, NOTE_ADDED)", async (t) => {
  const { controller, state, calls } = t.context;

  const dailyPlan = { id: "dp1", note: "Bring water" };
  state.addNoteToDailyPlanImpl = () => dailyPlan;

  const req = {
    params: { tripId: "t1", date: "2026-02-01" },
    body: { note: "Bring water" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.addNote(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.addNoteToDailyPlan.length, 1);
  t.deepEqual(calls.addNoteToDailyPlan[0], ["t1", "2026-02-01", "Bring water", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    dailyPlan,
    MESSAGES.NOTE_ADDED,
  ]);

  t.is(calls.handleTripPlanError.length, 0);
  t.is(calls.handleDailyPlanError.length, 0);
});

test.serial("addNote: service throws -> delegates to handleTripPlanError(res, error)", async (t) => {
  const { controller, state, calls } = t.context;

  state.addNoteToDailyPlanImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  state.handleTripPlanErrorImpl = () => ({ kind: "handled-addNote-error" });

  const req = {
    params: { tripId: "t1", date: "2026-02-01" },
    body: { note: "X" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.addNote(req, res);
  t.deepEqual(out, { kind: "handled-addNote-error" });

  t.is(calls.handleTripPlanError.length, 1);
  t.is(calls.handleTripPlanError[0][0], res);
  t.is(calls.handleTripPlanError[0][1].message, "Unauthorized access to trip plan");

  t.is(calls.sendSuccess.length, 0);
});
