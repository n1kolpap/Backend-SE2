/**
 * Unit tests for: controllers/tripPlanController.js
 *
 * We test the controller layer in isolation. That means:
 * - No Express server
 * - No real services
 * - No real sendSuccess/sendError implementation
 *
 * We verify the controller’s “contract”:
 * - It reads inputs from req.params / req.user / req.body
 * - It calls the correct tripPlanService function with the correct arguments
 * - It maps outcomes to sendSuccess/sendError with correct status codes/messages
 *
 * This file is aligned to your actual controller implementation:
 * - createTripPlan(req, res)
 * - getTripPlan(req, res)
 * - updateTripPlan(req, res)
 * - deleteTripPlan(req, res)
 */

import test from "ava";
import esmock from "esmock";
import { HTTP_STATUS, MESSAGES } from "../config/constants.js";

const MODULE_ID = "../controllers/tripPlanController.js";

test.before(async (t) => {
  /**
   * Mutable behavior per test:
   * Each service function below will delegate to a configurable implementation.
   */
  const state = {
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
  };

  /**
   * Call tracking so we can assert exact interactions.
   */
  const calls = {
    createNewTripPlan: [],
    getTripPlanById: [],
    updateExistingTripPlan: [],
    deleteTripPlanById: [],
    sendSuccess: [],
    sendError: [],
  };

  /**
   * Mock tripPlanService (controller imports: `import * as tripPlanService from ...`)
   * So we expose the same named functions.
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
   * We return “sentinel objects” to confirm the controller returns what these return.
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
   * Import the controller with dependency injection.
   * Override keys must be resolvable from this test file (tests/ folder).
   */
  const controller = await esmock(MODULE_ID, {
    "../services/tripPlanService.js": tripPlanServiceMock,
    "../utils/responses.js": responsesMock,
  });

  t.context.state = state;
  t.context.calls = calls;
  t.context.controller = controller;
});

test.beforeEach((t) => {
  const { state, calls } = t.context;

  // Clear call logs
  for (const k of Object.keys(calls)) calls[k].length = 0;

  // Reset all service behavior to “must configure”
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
});

/* -------------------------------------------------------------------------- */
/* createTripPlan                                                             */
/* -------------------------------------------------------------------------- */

test.serial("createTripPlan: forbids creating trip for another user", async (t) => {
  const { controller, calls } = t.context;

  const req = {
    params: { userId: "u-param" },
    user: { userId: "u-token" }, // mismatch -> forbidden
    body: { destination: "Rome" },
  };
  const res = { __res: true };

  const out = await controller.createTripPlan(req, res);

  // Controller should return sendError(...)
  t.deepEqual(out, { kind: "sendError-return" });

  // Service must NOT be called when forbidden
  t.is(calls.createNewTripPlan.length, 0);

  // Must map to the exact controller message
  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.FORBIDDEN,
    "Cannot create trip plan for another user",
  ]);

  t.is(calls.sendSuccess.length, 0);
});

test.serial("createTripPlan: success -> service called and sendSuccess(CREATED, trip, TRIP_CREATED)", async (t) => {
  const { controller, state, calls } = t.context;

  const trip = { tripId: "t1", userId: "u1", destination: "Rome" };
  state.createNewTripPlanImpl = (userId, body) => ({ ...trip, ...body, userId });

  const req = {
    params: { userId: "u1" },
    user: { userId: "u1" },
    body: { destination: "Rome", startDate: "2025-01-01", endDate: "2025-01-03" },
  };
  const res = { __res: true };

  const out = await controller.createTripPlan(req, res);

  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.createNewTripPlan.length, 1);
  t.deepEqual(calls.createNewTripPlan[0], ["u1", req.body]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.CREATED,
    { ...trip, ...req.body, userId: "u1" },
    MESSAGES.TRIP_CREATED,
  ]);

  t.is(calls.sendError.length, 0);
});

test.serial("createTripPlan: unexpected error -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.createNewTripPlanImpl = () => {
    throw new Error("boom");
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
    "boom",
  ]);
});

/* -------------------------------------------------------------------------- */
/* getTripPlan                                                                */
/* -------------------------------------------------------------------------- */

test.serial('getTripPlan: success -> sendSuccess(OK, trip, "Trip plan retrieved successfully")', async (t) => {
  const { controller, state, calls } = t.context;

  const trip = { tripId: "t1", userId: "u1", destination: "Athens" };
  state.getTripPlanByIdImpl = (tripId, userId) => ({ ...trip, tripId, userId });

  const req = { params: { tripId: "t1" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.getTripPlan(req, res);

  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.getTripPlanById.length, 1);
  t.deepEqual(calls.getTripPlanById[0], ["t1", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [
    res,
    HTTP_STATUS.OK,
    { ...trip, tripId: "t1", userId: "u1" },
    "Trip plan retrieved successfully",
  ]);
});

test.serial("getTripPlan: not found -> sendError(NOT_FOUND, TRIP_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.getTripPlanByIdImpl = () => {
    throw new Error("Trip plan not found");
  };

  const req = { params: { tripId: "t404" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.getTripPlan(req, res);

  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND]);
});

test.serial('getTripPlan: unauthorized -> sendError(FORBIDDEN, "Access denied")', async (t) => {
  const { controller, state, calls } = t.context;

  state.getTripPlanByIdImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  const req = { params: { tripId: "t1" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.getTripPlan(req, res);

  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.FORBIDDEN, "Access denied"]);
});

test.serial("getTripPlan: unexpected error -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.getTripPlanByIdImpl = () => {
    throw new Error("db down");
  };

  const req = { params: { tripId: "t1" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.getTripPlan(req, res);

  t.deepEqual(out, { kind: "sendError-return" });

  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    "db down",
  ]);
});

/* -------------------------------------------------------------------------- */
/* updateTripPlan                                                             */
/* -------------------------------------------------------------------------- */

test.serial("updateTripPlan: success -> sendSuccess(OK, trip, TRIP_UPDATED)", async (t) => {
  const { controller, state, calls } = t.context;

  const updated = { tripId: "t1", userId: "u1", name: "Updated" };
  state.updateExistingTripPlanImpl = (tripId, userId, body) => ({ ...updated, tripId, userId, ...body });

  const req = {
    params: { tripId: "t1" },
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
    { ...updated, tripId: "t1", userId: "u1", ...req.body },
    MESSAGES.TRIP_UPDATED,
  ]);
});

test.serial("updateTripPlan: not found -> sendError(NOT_FOUND, TRIP_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.updateExistingTripPlanImpl = () => {
    throw new Error("Trip plan not found");
  };

  const req = { params: { tripId: "t404" }, user: { userId: "u1" }, body: { name: "X" } };
  const res = { __res: true };

  const out = await controller.updateTripPlan(req, res);

  t.deepEqual(out, { kind: "sendError-return" });
  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND]);
});

test.serial('updateTripPlan: unauthorized -> sendError(FORBIDDEN, "Access denied")', async (t) => {
  const { controller, state, calls } = t.context;

  // FIXED: valid function assignment; no stray tokens.
  state.updateExistingTripPlanImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  const req = { params: { tripId: "t1" }, user: { userId: "u1" }, body: { name: "X" } };
  const res = { __res: true };

  const out = await controller.updateTripPlan(req, res);

  t.deepEqual(out, { kind: "sendError-return" });
  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.FORBIDDEN, "Access denied"]);
});

test.serial("updateTripPlan: unexpected error -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.updateExistingTripPlanImpl = () => {
    throw new Error("write failed");
  };

  const req = { params: { tripId: "t1" }, user: { userId: "u1" }, body: { name: "X" } };
  const res = { __res: true };

  const out = await controller.updateTripPlan(req, res);

  t.deepEqual(out, { kind: "sendError-return" });
  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    "write failed",
  ]);
});

/* -------------------------------------------------------------------------- */
/* deleteTripPlan                                                             */
/* -------------------------------------------------------------------------- */

test.serial("deleteTripPlan: success -> calls service and sendSuccess(OK, null, TRIP_DELETED)", async (t) => {
  const { controller, state, calls } = t.context;

  // Controller ignores return value; success is “no throw”.
  state.deleteTripPlanByIdImpl = () => true;

  const req = { params: { tripId: "t1" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.deleteTripPlan(req, res);

  t.deepEqual(out, { kind: "sendSuccess-return" });

  t.is(calls.deleteTripPlanById.length, 1);
  t.deepEqual(calls.deleteTripPlanById[0], ["t1", "u1"]);

  t.is(calls.sendSuccess.length, 1);
  t.deepEqual(calls.sendSuccess[0], [res, HTTP_STATUS.OK, null, MESSAGES.TRIP_DELETED]);
});

test.serial("deleteTripPlan: not found -> sendError(NOT_FOUND, TRIP_NOT_FOUND)", async (t) => {
  const { controller, state, calls } = t.context;

  state.deleteTripPlanByIdImpl = () => {
    throw new Error("Trip plan not found");
  };

  const req = { params: { tripId: "t404" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.deleteTripPlan(req, res);

  t.deepEqual(out, { kind: "sendError-return" });
  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND]);
});

test.serial('deleteTripPlan: unauthorized -> sendError(FORBIDDEN, "Access denied")', async (t) => {
  const { controller, state, calls } = t.context;

  state.deleteTripPlanByIdImpl = () => {
    throw new Error("Unauthorized access to trip plan");
  };

  const req = { params: { tripId: "t1" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.deleteTripPlan(req, res);

  t.deepEqual(out, { kind: "sendError-return" });
  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [res, HTTP_STATUS.FORBIDDEN, "Access denied"]);
});

test.serial("deleteTripPlan: unexpected error -> sendError(500, SERVER_ERROR, error.message)", async (t) => {
  const { controller, state, calls } = t.context;

  state.deleteTripPlanByIdImpl = () => {
    throw new Error("delete failed");
  };

  const req = { params: { tripId: "t1" }, user: { userId: "u1" } };
  const res = { __res: true };

  const out = await controller.deleteTripPlan(req, res);

  t.deepEqual(out, { kind: "sendError-return" });
  t.is(calls.sendError.length, 1);
  t.deepEqual(calls.sendError[0], [
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    "delete failed",
  ]);
});
