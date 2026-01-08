/**
 * Unit tests for: controllers/tripPlanController.js
 *
 * This controller is a thin HTTP-layer orchestrator:
 * - reads params/body/user from req
 * - calls tripPlanService (sync calls in your code)
 * - returns standardized responses via sendSuccess/sendError
 * - for most errors it delegates to handleTripPlanError(res, error)
 *
 * Testing strategy:
 * - No Express server, no real DB, no real services.
 * - Use esmock to inject mocks for:
 *    ../services/tripPlanService.js
 *    ../utils/responses.js
 *    ../utils/helpers.js   (handleTripPlanError)
 * - Use real constants from ../config/constants.js for correctness.
 *
 * Notes:
 * - This is an ESM test file (you already set "type": "module").
 * - If your controller file path differs, adjust MODULE_ID below.
 */

import test from "ava";
import esmock from "esmock";
import { HTTP_STATUS, MESSAGES } from "../config/constants.js";

// Adjust if your controller is in a different location.
const MODULE_ID = "../controllers/tripPlanController.js";

test.before(async (t) => {
  /**
   * Mutable behavior for mocks so each test can configure what happens.
   * This avoids re-importing the module for every test.
   */
  const state = {
    // Service behaviors
    createNewTripPlanImpl: () => {
      throw new Error("test did not configure createNewTripPlanImpl");
    },
    getTripPlanByIdImpl: () => {
      throw new Error("test did not configure getTripPlanByIdImpl");
    },
    updateExistingTripPlanImpl: () => {
      throw new Error("test did not configure updateExistingTripPlanImpl");
    },
    deleteTripPlanByIdImpl: () => {
      throw new Error("test did not configure deleteTripPlanByIdImpl");
    },

    // Error handler behavior
    handleTripPlanErrorImpl: () => {
      throw new Error("test did not configure handleTripPlanErrorImpl");
    },
  };

  /**
   * Call logs: record all interactions so assertions are precise.
   */
  const calls = {
    // service calls
    createNewTripPlan: [],
    getTripPlanById: [],
    updateExistingTripPlan: [],
    deleteTripPlanById: [],

    // response helper calls
    sendSuccess: [],
    sendError: [],

    // error handler calls
    handleTripPlanError: [],
  };

  /**
   * Mock tripPlanService (controller imports it as: import * as tripPlanService from ...)
   * So we provide named exports matching those used by the controller.
   */
  const tripPlanServiceMock = {
    createNewTripPlan: (...args) => {
      calls.createNewTripPlan.push(args);
      return state.createNewTripPlanImpl(...args);
    },
    getTripPlanById: (...args) => {
      calls.getTripPlanById.push(args);
      return state.getTripPlanByIdImpl(...args);
    },
    updateExistingTripPlan: (...args) => {
      calls.updateExistingTripPlan.push(args);
      return state.updateExistingTripPlanImpl(...args);
    },
    deleteTripPlanById: (...args) => {
      calls.deleteTripPlanById.push(args);
      return state.deleteTripPlanByIdImpl(...args);
    },
  };

  /**
   * Mock standardized response helpers.
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
   * Mock handleTripPlanError(res, error).
   * This is important because getTripPlan/updateTripPlan/deleteTripPlan delegate errors to it.
   */
  const helpersMock = {
    handleTripPlanError: (...args) => {
      calls.handleTripPlanError.push(args);
      return state.handleTripPlanErrorImpl(...args);
    },
  };

  /**
   * Import controller with dependency injection via esmock.
   * IMPORTANT: override keys must match EXACTLY the import specifiers used inside the controller file.
   */
  const controller = await esmock(MODULE_ID, {
    "../services/tripPlanService.js": tripPlanServiceMock,
    "../utils/responses.js": responsesMock,
    "../utils/helpers.js": helpersMock,
  });

  t.context.state = state;
  t.context.calls = calls;
  t.context.controller = controller;
});

test.beforeEach((t) => {
  const { state, calls } = t.context;

  // Reset call logs
  for (const k of Object.keys(calls)) calls[k].length = 0;

  // Reset mock behaviors (tests must explicitly configure)
  state.createNewTripPlanImpl = () => {
    throw new Error("test did not configure createNewTripPlanImpl");
  };
  state.getTripPlanByIdImpl = () => {
    throw new Error("test did not configure getTripPlanByIdImpl");
  };
  state.updateExistingTripPlanImpl = () => {
    throw new Error("test did not configure updateExistingTripPlanImpl");
  };
  state.deleteTripPlanByIdImpl = () => {
    throw new Error("test did not configure deleteTripPlanByIdImpl");
  };
  state.handleTripPlanErrorImpl = () => {
    return { kind: "handleTripPlanError-return" };
  };
});

/* -------------------------------------------------------------------------- */
/* createTripPlan                                                             */
/* -------------------------------------------------------------------------- */

test.serial("createTripPlan: rejects when authenticated user != :userId (403) and does NOT call service", async (t) => {
  const { controller, calls } = t.context;

  const req = {
    params: { userId: "u-param" },
    user: { userId: "u-token" }, // mismatch triggers forbidden
    body: { destination: "Rome" },
  };
  const res = { __res: true };

  const out = await controller.createTripPlan(req, res);

  // Controller returns whatever sendError returns
  t.deepEqual(out, { kind: "sendError-return" });

  // Must NOT call service
  t.is(calls.createNewTripPlan.length, 0);

  // Must send 403 with exact message
  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.FORBIDDEN,
    "Cannot create trip plan for another user",
  ]);

  // No success response
  t.is(calls.sendSuccess.length, 0);
});

test.serial("createTripPlan: success -> calls createNewTripPlan(userId, body) and sendSuccess(CREATED, trip, TRIP_CREATED)", async (t) => {
  const { controller, state, calls } = t.context;

  const trip = { tripId: "t1", userId: "u1", destination: "Rome" };
  state.createNewTripPlanImpl = (userId, body) => ({ ...trip, userId, ...body });

  const req = {
    params: { userId: "u1" },
    user: { userId: "u1" },
    body: { destination: "Rome", startDate: "2026-01-01", endDate: "2026-01-03" },
  };
  const res = { __res: true };

  const out = await controller.createTripPlan(req, res);

  t.deepEqual(out, { kind: "sendSuccess-return" });

  // Service called with correct args
  t.is(calls.createNewTripPlan.length, 1);
  t.deepEqual(calls.createNewTripPlan[0], ["u1", req.body]);

  // Success response called with correct args
  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.CREATED,
    { ...trip, userId: "u1", ...req.body },
    MESSAGES.TRIP_CREATED,
  ]);

  t.is(calls.sendError.length, 0);
});

test.serial("createTripPlan: service throws -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.createNewTripPlanImpl = () => {
    throw new Error("unexpected failure");
  };

  const req = {
    params: { userId: "u1" },
    user: { userId: "u1" },
    body: { destination: "Rome" },
  };
  const res = { __res: true };

  const out = await controller.createTripPlan(req, res);
  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    "unexpected failure",
  ]);

  // Should not delegate to handleTripPlanError in createTripPlan
  t.is(calls.handleTripPlanError.length, 0);
});

/* -------------------------------------------------------------------------- */
/* getTripPlan                                                                */
/* -------------------------------------------------------------------------- */

test.serial('getTripPlan: success -> sendSuccess(OK, trip, "Trip plan retrieved successfully")', async (t) => {
  const { controller, state, calls } = t.context;

  const trip = { tripId: "t1", userId: "u1" };
  state.getTripPlanByIdImpl = (tripId, userId) => ({ ...trip, tripId, userId });

  const req = {
    params: { tripId: "t1", userId: "ignored-param" },
    user: { userId: "u1" }, // controller uses token userId
  };
  const res = { __res: true };

  const out = await controller.getTripPlan(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  // Service called with (tripId, tokenUserId)
  t.is(calls.getTripPlanById.length, 1);
  t.deepEqual(calls.getTripPlanById[0], ["t1", "u1"]);

  // Correct success response
  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    { tripId: "t1", userId: "u1" },
    "Trip plan retrieved successfully",
  ]);

  // No error handler call
  t.is(calls.handleTripPlanError.length, 0);
});

test.serial("getTripPlan: service throws -> delegates to handleTripPlanError(res, error) and returns its value", async (t) => {
  const { controller, state, calls } = t.context;

  state.getTripPlanByIdImpl = () => {
    throw new Error("Trip plan not found");
  };

  // Configure error handler to return a sentinel, so we can assert controller returns it.
  state.handleTripPlanErrorImpl = (resArg, errArg) => {
    return { kind: "handleTripPlanError-return", msg: errArg.message };
  };

  const req = { params: { tripId: "t404" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.getTripPlan(req, res);
  t.deepEqual(out, { kind: "handleTripPlanError-return", msg: "Trip plan not found" });

  // Ensure handler called with correct args
  t.is(calls.handleTripPlanError.length, 1);
  t.is(calls.handleTripPlanError[0][0], res);
  t.is(calls.handleTripPlanError[0][1].message, "Trip plan not found");

  // No sendSuccess/sendError directly (handler is responsible)
  t.is(calls.sendSuccess.length, 0);
  t.is(calls.sendError.length, 0);
});

/* -------------------------------------------------------------------------- */
/* updateTripPlan                                                             */
/* -------------------------------------------------------------------------- */

test.serial("updateTripPlan: success -> calls updateExistingTripPlan(tripId, userId, body) and sendSuccess(OK, trip, TRIP_UPDATED)", async (t) => {
  const { controller, state, calls } = t.context;

  const updatedTrip = { tripId: "t1", userId: "u1", name: "Updated" };
  state.updateExistingTripPlanImpl = (tripId, userId, body) => ({ ...updatedTrip, tripId, userId, ...body });

  const req = {
    params: { tripId: "t1", userId: "ignored-param" },
    user: { userId: "u1" },
    body: { name: "Updated" },
  };
  const res = { __res: true };

  const out = await controller.updateTripPlan(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.updateExistingTripPlan.length, 1);
  t.deepEqual(calls.updateExistingTripPlan[0], ["t1", "u1", req.body]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    { ...updatedTrip, tripId: "t1", userId: "u1", ...req.body },
    MESSAGES.TRIP_UPDATED,
  ]);

  t.is(calls.handleTripPlanError.length, 0);
});

test.serial("updateTripPlan: service throws -> delegates to handleTripPlanError(res, error)", async (t) => {
  const { controller, state, calls } = t.context;

  state.updateExistingTripPlanImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  state.handleTripPlanErrorImpl = () => ({ kind: "handled-update-error" });

  const req = { params: { tripId: "t1" }, user: { userId: "u1" }, body: { name: "X" } };
  const res = { __res: true };

  const out = await controller.updateTripPlan(req, res);
  t.deepEqual(out, { kind: "handled-update-error" });

  t.is(calls.handleTripPlanError.length, 1);
  t.is(calls.handleTripPlanError[0][0], res);
  t.is(calls.handleTripPlanError[0][1].message, "Unauthorized access to trip plan");

  t.is(calls.sendSuccess.length, 0);
  t.is(calls.sendError.length, 0);
});

/* -------------------------------------------------------------------------- */
/* deleteTripPlan                                                             */
/* -------------------------------------------------------------------------- */

test.serial("deleteTripPlan: success -> calls deleteTripPlanById(tripId, userId) and sendSuccess(OK, null, TRIP_DELETED)", async (t) => {
  const { controller, state, calls } = t.context;

  state.deleteTripPlanByIdImpl = () => true;

  const req = { params: { tripId: "t1" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.deleteTripPlan(req, res);
  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.deleteTripPlanById.length, 1);
  t.deepEqual(calls.deleteTripPlanById[0], ["t1", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    null,
    MESSAGES.TRIP_DELETED,
  ]);

  t.is(calls.handleTripPlanError.length, 0);
});

test.serial("deleteTripPlan: service throws -> delegates to handleTripPlanError(res, error)", async (t) => {
  const { controller, state, calls } = t.context;

  state.deleteTripPlanByIdImpl = () => {
    throw new Error("Trip plan not found");
  };

  state.handleTripPlanErrorImpl = () => ({ kind: "handled-delete-error" });

  const req = { params: { tripId: "t404" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.deleteTripPlan(req, res);
  t.deepEqual(out, { kind: "handled-delete-error" });

  t.is(calls.handleTripPlanError.length, 1);
  t.is(calls.handleTripPlanError[0][0], res);
  t.is(calls.handleTripPlanError[0][1].message, "Trip plan not found");

  t.is(calls.sendSuccess.length, 0);
  t.is(calls.sendError.length, 0);
});
