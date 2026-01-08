/**
 * Unit tests for: controllers/dailyPlanController.js
 *
 * This controller is an HTTP-layer orchestrator:
 * - Reads tripId/date/activityId from req.params
 * - Reads authenticated userId from req.user.userId (NOT from req.params.userId)
 * - Calls dailyPlanService functions (synchronous in your implementation)
 * - Uses sendSuccess/sendError for responses
 * - For some endpoints, delegates error mapping to handleTripPlanError(res, error)
 *
 * We test in isolation (no Express server, no real DB):
 * - Mock ../services/dailyPlanService.js
 * - Mock ../utils/responses.js
 * - Mock ../utils/helpers.js (handleTripPlanError)
 *
 * IMPORTANT:
 * - Adjust MODULE_ID if your controller file lives elsewhere.
 */

import test from "ava";
import esmock from "esmock";
import { HTTP_STATUS, MESSAGES } from "../config/constants.js";

const MODULE_ID = "../controllers/dailyPlanController.js"; // <-- adjust if needed

test.before(async (t) => {
  /**
   * Mutable "state" allows each test to configure mock behavior.
   * Defaults intentionally throw so tests must explicitly configure.
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

    // handleTripPlanError behavior for delegated error paths
    handleTripPlanErrorImpl: () => ({ kind: "handleTripPlanError-return" }),
  };

  /**
   * Call logs to assert exactly what the controller invoked and with what args.
   */
  const calls = {
    // service calls
    getTripDailyPlans: [],
    addActivityToDailyPlan: [],
    removeActivityFromDailyPlan: [],
    completeActivity: [],
    addNoteToDailyPlan: [],

    // response helper calls
    sendSuccess: [],
    sendError: [],

    // helper error handler calls
    handleTripPlanError: [],
  };

  /**
   * Mock dailyPlanService module.
   * Controller imports it as: import * as dailyPlanService from '../services/dailyPlanService.js'
   * So we provide named exports matching those used.
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
   * Mock standardized responses.
   * We return sentinel objects so we can assert controller returns them.
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
   * Mock handleTripPlanError(res, error) used by getDailyPlans/addActivity/addNote.
   */
  const helpersMock = {
    handleTripPlanError: (...args) => {
      calls.handleTripPlanError.push(args);
      return state.handleTripPlanErrorImpl(...args);
    },
  };

  /**
   * Import controller with mocked dependencies injected.
   * Override keys MUST match the controller's import specifiers exactly.
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

  // Reset behaviors to strict defaults
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

  // Default handler returns a sentinel
  state.handleTripPlanErrorImpl = () => ({ kind: "handleTripPlanError-return" });
});

/* -------------------------------------------------------------------------- */
/* getDailyPlans                                                              */
/* -------------------------------------------------------------------------- */

test.serial('getDailyPlans: success -> calls service(tripId, tokenUserId) and sendSuccess(OK, data, "Daily plans retrieved successfully")', async (t) => {
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

  // Ensure token userId is used (not req.params.userId)
  t.is(calls.getTripDailyPlans.length, 1);
  t.deepEqual(calls.getTripDailyPlans[0], ["t1", "u-token"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    dailyPlans,
    "Daily plans retrieved successfully",
  ]);

  // No error handling invoked
  t.is(calls.handleTripPlanError.length, 0);
  t.is(calls.sendError.length, 0);
});

test.serial("getDailyPlans: service throws -> delegates to handleTripPlanError(res, error) and returns its value", async (t) => {
  const { controller, state, calls } = t.context;

  state.getTripDailyPlansImpl = () => {
    throw new Error("Trip plan not found");
  };

  state.handleTripPlanErrorImpl = (resArg, errArg) => {
    return { kind: "handled", msg: errArg.message };
  };

  const req = { params: { tripId: "t404" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.getDailyPlans(req, res);
  t.deepEqual(out, { kind: "handled", msg: "Trip plan not found" });

  t.is(calls.handleTripPlanError.length, 1);
  t.is(calls.handleTripPlanError[0][0], res);
  t.is(calls.handleTripPlanError[0][1].message, "Trip plan not found");

  // In delegated error paths, the controller itself should not call sendError/sendSuccess
  t.is(calls.sendSuccess.length, 0);
  t.is(calls.sendError.length, 0);
});

/* -------------------------------------------------------------------------- */
/* addActivity                                                                */
/* -------------------------------------------------------------------------- */

test.serial("addActivity: success -> calls addActivityToDailyPlan(tripId, date, body, tokenUserId) and sendSuccess(CREATED, activity, ACTIVITY_ADDED)", async (t) => {
  const { controller, state, calls } = t.context;

  const activity = { activityId: "a1", name: "Museum" };
  state.addActivityToDailyPlanImpl = () => activity;

  const body = { name: "Museum", type: "museum" };
  const req = {
    params: { tripId: "t1", date: "2026-01-10", userId: "ignored-param" },
    user: { userId: "u-token" },
    body,
  };
  const res = { __res: true };

  const out = await controller.addActivity(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.addActivityToDailyPlan.length, 1);
  t.deepEqual(calls.addActivityToDailyPlan[0], ["t1", "2026-01-10", body, "u-token"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.CREATED,
    activity,
    MESSAGES.ACTIVITY_ADDED,
  ]);

  t.is(calls.handleTripPlanError.length, 0);
  t.is(calls.sendError.length, 0);
});

test.serial("addActivity: service throws -> delegates to handleTripPlanError(res, error)", async (t) => {
  const { controller, state, calls } = t.context;

  state.addActivityToDailyPlanImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };
  state.handleTripPlanErrorImpl = () => ({ kind: "handled-addActivity" });

  const req = {
    params: { tripId: "t1", date: "2026-01-10" },
    user: { userId: "u1" },
    body: { name: "X" },
  };
  const res = { __res: true };

  const out = await controller.addActivity(req, res);
  t.deepEqual(out, { kind: "handled-addActivity" });

  t.is(calls.handleTripPlanError.length, 1);
  t.is(calls.handleTripPlanError[0][0], res);
  t.is(calls.handleTripPlanError[0][1].message, "Unauthorized access to trip plan");

  t.is(calls.sendSuccess.length, 0);
  t.is(calls.sendError.length, 0);
});

/* -------------------------------------------------------------------------- */
/* removeActivity                                                             */
/* -------------------------------------------------------------------------- */

test.serial("removeActivity: success -> calls removeActivityFromDailyPlan(...) and sendSuccess(OK, null, ACTIVITY_REMOVED)", async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => true;

  const req = {
    params: { tripId: "t1", date: "2026-01-10", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.removeActivity(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.removeActivityFromDailyPlan.length, 1);
  t.deepEqual(calls.removeActivityFromDailyPlan[0], ["t1", "2026-01-10", "a1", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    null,
    MESSAGES.ACTIVITY_REMOVED,
  ]);

  // removeActivity does NOT use handleTripPlanError
  t.is(calls.handleTripPlanError.length, 0);
  t.is(calls.sendError.length, 0);
});

test.serial("removeActivity: Trip plan not found -> sendError(NOT_FOUND, TRIP_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => {
    throw new Error("Trip plan not found");
  };

  const req = {
    params: { tripId: "t404", date: "2026-01-10", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.removeActivity(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND]);

  t.is(calls.handleTripPlanError.length, 0);
});

test.serial("removeActivity: Activity not found -> sendError(NOT_FOUND, ACTIVITY_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => {
    throw new Error("Activity not found");
  };

  const req = {
    params: { tripId: "t1", date: "2026-01-10", activityId: "missing" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.removeActivity(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.ACTIVITY_NOT_FOUND]);

  t.is(calls.handleTripPlanError.length, 0);
});

test.serial('removeActivity: Unauthorized access -> sendError(FORBIDDEN, "Access denied")', async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  const req = {
    params: { tripId: "t1", date: "2026-01-10", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.removeActivity(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.FORBIDDEN, "Access denied"]);

  t.is(calls.handleTripPlanError.length, 0);
});

test.serial("removeActivity: unexpected error -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.removeActivityFromDailyPlanImpl = () => {
    throw new Error("db exploded");
  };

  const req = {
    params: { tripId: "t1", date: "2026-01-10", activityId: "a1" },
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
    "db exploded",
  ]);

  t.is(calls.handleTripPlanError.length, 0);
});

/* -------------------------------------------------------------------------- */
/* markActivityCompleted                                                      */
/* -------------------------------------------------------------------------- */

test.serial("markActivityCompleted: success -> calls completeActivity(...) and sendSuccess(OK, activity, ACTIVITY_COMPLETED)", async (t) => {
  const { controller, state, calls } = t.context;

  const activity = { activityId: "a1", completed: true };
  state.completeActivityImpl = () => activity;

  const req = {
    params: { tripId: "t1", date: "2026-01-10", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.markActivityCompleted(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.completeActivity.length, 1);
  t.deepEqual(calls.completeActivity[0], ["t1", "2026-01-10", "a1", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    activity,
    MESSAGES.ACTIVITY_COMPLETED,
  ]);

  // markActivityCompleted does NOT use handleTripPlanError
  t.is(calls.handleTripPlanError.length, 0);
  t.is(calls.sendError.length, 0);
});

test.serial("markActivityCompleted: Trip plan not found -> sendError(NOT_FOUND, TRIP_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.completeActivityImpl = () => {
    throw new Error("Trip plan not found");
  };

  const req = {
    params: { tripId: "t404", date: "2026-01-10", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.markActivityCompleted(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND]);

  t.is(calls.handleTripPlanError.length, 0);
});

test.serial("markActivityCompleted: Activity not found -> sendError(NOT_FOUND, ACTIVITY_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.completeActivityImpl = () => {
    throw new Error("Activity not found");
  };

  const req = {
    params: { tripId: "t1", date: "2026-01-10", activityId: "missing" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.markActivityCompleted(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.ACTIVITY_NOT_FOUND]);

  t.is(calls.handleTripPlanError.length, 0);
});

test.serial('markActivityCompleted: Unauthorized access -> sendError(FORBIDDEN, "Access denied")', async (t) => {
  const { controller, state, calls } = t.context;

  state.completeActivityImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  const req = {
    params: { tripId: "t1", date: "2026-01-10", activityId: "a1" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.markActivityCompleted(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.FORBIDDEN, "Access denied"]);

  t.is(calls.handleTripPlanError.length, 0);
});

test.serial("markActivityCompleted: unexpected error -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.completeActivityImpl = () => {
    throw new Error("boom");
  };

  const req = {
    params: { tripId: "t1", date: "2026-01-10", activityId: "a1" },
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

  t.is(calls.handleTripPlanError.length, 0);
});

/* -------------------------------------------------------------------------- */
/* addNote                                                                    */
/* -------------------------------------------------------------------------- */

test.serial("addNote: success -> calls addNoteToDailyPlan(tripId, date, note, userId) and sendSuccess(OK, dailyPlan, NOTE_ADDED)", async (t) => {
  const { controller, state, calls } = t.context;

  const dailyPlan = { id: "dp1", note: "Bring water" };
  state.addNoteToDailyPlanImpl = () => dailyPlan;

  const req = {
    params: { tripId: "t1", date: "2026-01-10" },
    body: { note: "Bring water" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.addNote(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.addNoteToDailyPlan.length, 1);
  t.deepEqual(calls.addNoteToDailyPlan[0], ["t1", "2026-01-10", "Bring water", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [res, HTTP_STATUS.OK, dailyPlan, MESSAGES.NOTE_ADDED]);

  t.is(calls.handleTripPlanError.length, 0);
  t.is(calls.sendError.length, 0);
});

test.serial("addNote: service throws -> delegates to handleTripPlanError(res, error)", async (t) => {
  const { controller, state, calls } = t.context;

  state.addNoteToDailyPlanImpl = () => {
    throw new Error("Trip plan not found");
  };

  state.handleTripPlanErrorImpl = () => ({ kind: "handled-addNote" });

  const req = {
    params: { tripId: "t404", date: "2026-01-10" },
    body: { note: "X" },
    user: { userId: "u1" },
  };
  const res = { __res: true };

  const out = await controller.addNote(req, res);
  t.deepEqual(out, { kind: "handled-addNote" });

  t.is(calls.handleTripPlanError.length, 1);
  t.is(calls.handleTripPlanError[0][0], res);
  t.is(calls.handleTripPlanError[0][1].message, "Trip plan not found");

  t.is(calls.sendSuccess.length, 0);
  t.is(calls.sendError.length, 0);
});
