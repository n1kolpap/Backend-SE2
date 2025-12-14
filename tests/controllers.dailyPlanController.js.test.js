/**
 * Unit tests for: controllers/dailyPlanController.js
 *
 * We test the controller layer in isolation:
 * - No Express server
 * - No real dailyPlanService
 * - No real sendSuccess/sendError implementation
 *
 * What we verify:
 * 1) Each controller function reads the correct inputs:
 *    - tripId/date/activityId from req.params
 *    - userId from req.user.userId (NOT from req.params.userId)
 *    - note from req.body.note (for addNote)
 * 2) Each controller function calls the correct service function with correct args.
 * 3) Each controller function maps success and error cases to sendSuccess/sendError
 *    using the correct HTTP status code and message.
 *
 * Implementation detail:
 * - We use esmock to mock:
 *    ../services/dailyPlanService.js
 *    ../utils/responses.js
 * - We use real constants from ../config/constants.js
 */

import test from "ava";
import esmock from "esmock";
import { HTTP_STATUS, MESSAGES } from "../config/constants.js";

const MODULE_ID = "../controllers/dailyPlanController.js";

test.before(async (t) => {
  /**
   * Mutable state: each test configures how the mocked service should behave.
   * Defaults throw to ensure tests must explicitly configure behavior.
   */
  const state = {
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
  };

  /**
   * Call logs: we record every interaction so assertions can be precise.
   */
  const calls = {
    getTripDailyPlans: [],
    addActivityToDailyPlan: [],
    removeActivityFromDailyPlan: [],
    completeActivity: [],
    addNoteToDailyPlan: [],
    sendSuccess: [],
    sendError: [],
  };

  /**
   * Mock dailyPlanService (controller imports it as `* as dailyPlanService`)
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
   * Mock response helpers.
   * We return sentinel objects so we can assert the controller returns them.
   */
  const responsesMock = {
    sendSuccess: (...args) => {
      calls.sendSuccess.push(args);
      return { kind: "sendSuccess-return" };
    },
    sendError: (...args) => {
      calls.sendError.push(args);
      return { kind: "sendError-return" };
    },
  };

  /**
   * Import controller with dependency injection.
   * Note: override keys must be resolvable from tests/ folder.
   */
  const controller = await esmock(MODULE_ID, {
    "../services/dailyPlanService.js": dailyPlanServiceMock,
    "../utils/responses.js": responsesMock,
  });

  t.context.state = state;
  t.context.calls = calls;
  t.context.controller = controller;
});

test.beforeEach((t) => {
  const { state, calls } = t.context;

  // Clear call logs so each test starts clean.
  for (const k of Object.keys(calls)) calls[k].length = 0;

  // Reset service behavior back to strict defaults.
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
});

/* -------------------------------------------------------------------------- */
/* getDailyPlans                                                              */
/* -------------------------------------------------------------------------- */

test.serial('getDailyPlans: success -> sendSuccess(OK, dailyPlans, "Daily plans retrieved successfully")', async (t) => {
  const { controller, state, calls } = t.context;

  const dailyPlans = [{ id: "dp1" }, { id: "dp2" }];
  state.getTripDailyPlansImpl = (tripId, userId) => dailyPlans;

  const req = {
    params: { tripId: "t1", userId: "ignored-param" },
    user: { userId: "u-token" },
  };
  const res = { __res: true };

  const out = await controller.getDailyPlans(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  // Verify userId comes from token, not params
  t.is(calls.getTripDailyPlans.length, 1);
  t.deepEqual(calls.getTripDailyPlans[0], ["t1", "u-token"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    dailyPlans,
    "Daily plans retrieved successfully",
  ]);

  t.is(calls.sendError.length, 0);
});

test.serial("getDailyPlans: Trip plan not found -> sendError(NOT_FOUND, TRIP_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.getTripDailyPlansImpl = () => {
    throw new Error("Trip plan not found");
  };

  const req = { params: { tripId: "t404" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.getDailyPlans(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND]);
});

test.serial('getDailyPlans: Unauthorized access -> sendError(FORBIDDEN, "Access denied")', async (t) => {
  const { controller, state, calls } = t.context;

  state.getTripDailyPlansImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  const req = { params: { tripId: "t1" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.getDailyPlans(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.FORBIDDEN, "Access denied"]);
});

test.serial("getDailyPlans: unexpected error -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.getTripDailyPlansImpl = () => {
    throw new Error("boom");
  };

  const req = { params: { tripId: "t1" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.getDailyPlans(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    "boom",
  ]);
});

/* -------------------------------------------------------------------------- */
/* addActivity                                                                */
/* -------------------------------------------------------------------------- */

test.serial("addActivity: success -> calls service and sendSuccess(CREATED, activity, ACTIVITY_ADDED)", async (t) => {
  const { controller, state, calls } = t.context;

  const activity = { activityId: "a1", name: "Museum" };
  state.addActivityToDailyPlanImpl = (tripId, date, body, userId) => activity;

  const body = { name: "Museum", type: "museum" };
  const req = {
    params: { tripId: "t1", date: "2025-01-01", userId: "ignored-param" },
    user: { userId: "u-token" },
    body,
  };
  const res = { __res: true };

  const out = await controller.addActivity(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.addActivityToDailyPlan.length, 1);
  t.deepEqual(calls.addActivityToDailyPlan[0], ["t1", "2025-01-01", body, "u-token"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.CREATED,
    activity,
    MESSAGES.ACTIVITY_ADDED,
  ]);
});

test.serial("addActivity: Trip plan not found -> sendError(NOT_FOUND, TRIP_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.addActivityToDailyPlanImpl = () => {
    throw new Error("Trip plan not found");
  };

  const req = {
    params: { tripId: "t404", date: "2025-01-01" },
    user: { userId: "u1" },
    body: { name: "X" },
  };
  const res = { __res: true };

  const out = await controller.addActivity(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND]);
});

test.serial('addActivity: Unauthorized access -> sendError(FORBIDDEN, "Access denied")', async (t) => {
  const { controller, state, calls } = t.context;

  state.addActivityToDailyPlanImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  const req = {
    params: { tripId: "t1", date: "2025-01-01" },
    user: { userId: "u1" },
    body: { name: "X" },
  };
  const res = { __res: true };

  const out = await controller.addActivity(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.FORBIDDEN, "Access denied"]);
});

test.serial("addActivity: unexpected error -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.addActivityToDailyPlanImpl = () => {
    throw new Error("boom");
  };

  const req = {
    params: { tripId: "t1", date: "2025-01-01" },
    user: { userId: "u1" },
    body: { name: "X" },
  };
  const res = { __res: true };

  const out = await controller.addActivity(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    "boom",
  ]);
});

/* -------------------------------------------------------------------------- */
/* removeActivity                                                             */
/* -------------------------------------------------------------------------- */

test.serial("removeActivity: success -> calls service and sendSuccess(OK, null, ACTIVITY_REMOVED)", async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => true;

  const req = {
    params: { tripId: "t1", date: "2025-01-01", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.removeActivity(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.removeActivityFromDailyPlan.length, 1);
  t.deepEqual(calls.removeActivityFromDailyPlan[0], ["t1", "2025-01-01", "a1", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [res, HTTP_STATUS.OK, null, MESSAGES.ACTIVITY_REMOVED]);
});

test.serial("removeActivity: Trip plan not found -> sendError(NOT_FOUND, TRIP_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => {
    throw new Error("Trip plan not found");
  };

  const req = {
    params: { tripId: "t404", date: "2025-01-01", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.removeActivity(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND]);
});

test.serial("removeActivity: Activity not found -> sendError(NOT_FOUND, ACTIVITY_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => {
    throw new Error("Activity not found");
  };

  const req = {
    params: { tripId: "t1", date: "2025-01-01", activityId: "missing" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.removeActivity(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.ACTIVITY_NOT_FOUND]);
});

test.serial('removeActivity: Unauthorized access -> sendError(FORBIDDEN, "Access denied")', async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  const req = {
    params: { tripId: "t1", date: "2025-01-01", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.removeActivity(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.FORBIDDEN, "Access denied"]);
});

test.serial("removeActivity: unexpected error -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => {
    throw new Error("boom");
  };

  const req = {
    params: { tripId: "t1", date: "2025-01-01", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.removeActivity(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    "boom",
  ]);
});

/* -------------------------------------------------------------------------- */
/* markActivityCompleted                                                      */
/* -------------------------------------------------------------------------- */

test.serial("markActivityCompleted: success -> sendSuccess(OK, activity, ACTIVITY_COMPLETED)", async (t) => {
  const { controller, state, calls } = t.context;

  const activity = { activityId: "a1", completed: true };
  state.completeActivityImpl = () => activity;

  const req = {
    params: { tripId: "t1", date: "2025-01-01", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.markActivityCompleted(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.completeActivity.length, 1);
  t.deepEqual(calls.completeActivity[0], ["t1", "2025-01-01", "a1", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    activity,
    MESSAGES.ACTIVITY_COMPLETED,
  ]);
});

test.serial("markActivityCompleted: Activity not found -> sendError(NOT_FOUND, ACTIVITY_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.completeActivityImpl = () => {
    throw new Error("Activity not found");
  };

  const req = {
    params: { tripId: "t1", date: "2025-01-01", activityId: "missing" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.markActivityCompleted(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.ACTIVITY_NOT_FOUND]);
});

test.serial('markActivityCompleted: Unauthorized access -> sendError(FORBIDDEN, "Access denied")', async (t) => {
  const { controller, state, calls } = t.context;

  state.completeActivityImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  const req = {
    params: { tripId: "t1", date: "2025-01-01", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.markActivityCompleted(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.FORBIDDEN, "Access denied"]);
});

test.serial("markActivityCompleted: unexpected error -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.completeActivityImpl = () => {
    throw new Error("boom");
  };

  const req = {
    params: { tripId: "t1", date: "2025-01-01", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.markActivityCompleted(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    "boom",
  ]);
});

/* -------------------------------------------------------------------------- */
/* addNote                                                                    */
/* -------------------------------------------------------------------------- */

test.serial("addNote: success -> passes req.body.note and sendSuccess(OK, dailyPlan, NOTE_ADDED)", async (t) => {
  const { controller, state, calls } = t.context;

  const dailyPlan = { id: "dp1", note: "Remember tickets" };
  state.addNoteToDailyPlanImpl = () => dailyPlan;

  const req = {
    params: { tripId: "t1", date: "2025-01-01" },
    body: { note: "Remember tickets" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.addNote(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.addNoteToDailyPlan.length, 1);
  t.deepEqual(calls.addNoteToDailyPlan[0], ["t1", "2025-01-01", "Remember tickets", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [res, HTTP_STATUS.OK, dailyPlan, MESSAGES.NOTE_ADDED]);
});

test.serial('addNote: Unauthorized access -> sendError(FORBIDDEN, "Access denied")', async (t) => {
  const { controller, state, calls } = t.context;

  state.addNoteToDailyPlanImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  const req = {
    params: { tripId: "t1", date: "2025-01-01" },
    body: { note: "X" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.addNote(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.FORBIDDEN, "Access denied"]);
});

test.serial("addNote: unexpected error -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.addNoteToDailyPlanImpl = () => {
    throw new Error("boom");
  };

  const req = {
    params: { tripId: "t1", date: "2025-01-01" },
    body: { note: "X" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.addNote(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    "boom",
  ]);
});
