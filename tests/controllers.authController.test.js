/**
 * Unit tests for: controllers/authController.js
 *
 * What we test (controller contract):
 * - signup(req, res)
 *   - calls authService.registerUser(req.body)
 *   - on success: sendSuccess(res, HTTP_STATUS.CREATED, user, MESSAGES.USER_CREATED)
 *   - if error.message === 'Username already exists':
 *       sendError(res, HTTP_STATUS.CONFLICT, 'Username already exists')
 *   - otherwise:
 *       sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER_ERROR, error.message)
 *
 * - login(req, res)
 *   - extracts { username, password } from req.body
 *   - calls authService.loginUser(username, password)
 *   - on success: sendSuccess(res, HTTP_STATUS.OK, result, MESSAGES.USER_LOGGED_IN)
 *   - if error.message === 'Invalid credentials':
 *       sendError(res, HTTP_STATUS.UNAUTHORIZED, MESSAGES.INVALID_CREDENTIALS)
 *   - otherwise:
 *       sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER_ERROR, error.message)
 *
 * Approach:
 * - Use esmock to replace:
 *   - ../services/authService.js (registerUser/loginUser)
 *   - ../utils/responses.js (sendSuccess/sendError)
 * - Use the real config/constants.js so expectations match your app’s constants.
 *
 * Repo layout assumed:
 *   Backend-SE2/
 *     controllers/authController.js
 *     services/authService.js
 *     utils/responses.js
 *     config/constants.js
 *     tests/authController.controller.test.js
 */

import test from "ava";
import esmock from "esmock";
import { HTTP_STATUS, MESSAGES } from "../config/constants.js";

const MODULE_ID = "../controllers/authController.js";

test.before(async (t) => {
	// Shared mutable state to control mock behavior per test.
	const state = {
		// How the authService mocks behave for the next call.
		registerUserImpl: async () => {
			throw new Error("test did not configure registerUserImpl");
		},
		loginUserImpl: async () => {
			throw new Error("test did not configure loginUserImpl");
		},
	};

	// Track calls for assertions.
	const calls = {
		registerUser: [],
		loginUser: [],
		sendSuccess: [],
		sendError: [],
	};

	// Mock authService (named exports; controller imports `* as authService`)
	const authServiceMock = {
		registerUser: async (...args) => {
			calls.registerUser.push(args);
			return state.registerUserImpl(...args);
		},
		loginUser: async (...args) => {
			calls.loginUser.push(args);
			return state.loginUserImpl(...args);
		},
	};

	// Mock responses helpers (named exports)
	const responsesMock = {
		sendSuccess: (...args) => {
			calls.sendSuccess.push(args);
			// Return a sentinel value so we can assert the controller returns it.
			return { kind: "sendSuccess-return" };
		},
		sendError: (...args) => {
			calls.sendError.push(args);
			return { kind: "sendError-return" };
		},
	};

	// Import the controller with mocked dependencies.
	const controller = await esmock(MODULE_ID, {
		"../services/authService.js": authServiceMock,
		"../utils/responses.js": responsesMock,
		// We intentionally do NOT mock ../config/constants.js so controller uses real constants.
	});

	t.context.state = state;
	t.context.calls = calls;
	t.context.controller = controller;
});

test.beforeEach((t) => {
	// Reset call logs and default behaviors before each test.
	const { calls, state } = t.context;

	for (const k of Object.keys(calls)) calls[k].length = 0;

	state.registerUserImpl = async () => {
		throw new Error("test did not configure registerUserImpl");
	};
	state.loginUserImpl = async () => {
		throw new Error("test did not configure loginUserImpl");
	};
});

/* -------------------------------------------------------------------------- */
/* signup                                                                     */
/* -------------------------------------------------------------------------- */

test.serial("signup: on success calls registerUser(req.body) then sendSuccess(CREATED, user, USER_CREATED)", async (t) => {
	const { controller, state, calls } = t.context;

	// Arrange: configure service to succeed
	const createdUser = { userId: "u1", username: "john", email: "john@example.com" };
	state.registerUserImpl = async (body) => {
		// extra safety: return something that proves the controller uses the service output
		return createdUser;
	};

	const req = { body: { username: "john", password: "password123", email: "john@example.com" } };
	const res = { __res: true };

	// Act
	const out = await controller.signup(req, res);

	// Assert: controller returns whatever sendSuccess returned
	t.deepEqual(out, { kind: "sendSuccess-return" });

	// Assert: service called correctly
	t.is(calls.registerUser.length, 1);
	t.deepEqual(calls.registerUser[0], [req.body]);

	// Assert: response helper called with expected arguments
	t.is(calls.sendSuccess.length, 1);
	t.deepEqual(calls.sendSuccess[0], [
		res,
		HTTP_STATUS.CREATED,
		createdUser,
		MESSAGES.USER_CREATED,
	]);

	// No errors should be sent
	t.is(calls.sendError.length, 0);
});

test.serial('signup: when username exists, returns sendError(CONFLICT, "Username already exists")', async (t) => {
	const { controller, state, calls } = t.context;

	// Arrange: configure service to throw the specific business error
	state.registerUserImpl = async () => {
		throw new Error("Username already exists");
	};

	const req = { body: { username: "john", password: "password123" } };
	const res = { __res: true };

	// Act
	const out = await controller.signup(req, res);

	// Assert: controller returns whatever sendError returned
	t.deepEqual(out, { kind: "sendError-return" });

	// Assert: registerUser called once with req.body
	t.is(calls.registerUser.length, 1);
	t.deepEqual(calls.registerUser[0], [req.body]);

	// Assert: sendError called with the 3-argument form (error defaults to null inside sendError)
	t.is(calls.sendError.length, 1);
	t.deepEqual(calls.sendError[0], [
		res,
		HTTP_STATUS.CONFLICT,
		"Username already exists",
	]);

	// No sendSuccess
	t.is(calls.sendSuccess.length, 0);
});

test.serial("signup: on unexpected error, returns sendError(INTERNAL_SERVER_ERROR, SERVER_ERROR, error.message)", async (t) => {
	const { controller, state, calls } = t.context;

	state.registerUserImpl = async () => {
		throw new Error("db is down");
	};

	const req = { body: { username: "john", password: "password123" } };
	const res = { __res: true };

	const out = await controller.signup(req, res);
	t.deepEqual(out, { kind: "sendError-return" });

	t.is(calls.sendError.length, 1);
	t.deepEqual(calls.sendError[0], [
		res,
		HTTP_STATUS.INTERNAL_SERVER_ERROR,
		MESSAGES.SERVER_ERROR,
		"db is down",
	]);

	t.is(calls.sendSuccess.length, 0);
});

/* -------------------------------------------------------------------------- */
/* login                                                                      */
/* -------------------------------------------------------------------------- */

test.serial("login: on success calls loginUser(username, password) then sendSuccess(OK, result, USER_LOGGED_IN)", async (t) => {
	const { controller, state, calls } = t.context;

	const result = {
		user: { userId: "u1", username: "john", email: "john@example.com" },
		token: "jwt.token.here",
	};

	state.loginUserImpl = async (username, password) => {
		// Assert inside the mock is okay, but we still assert via call logs below.
		return result;
	};

	const req = { body: { username: "john", password: "password123" } };
	const res = { __res: true };

	const out = await controller.login(req, res);
	t.deepEqual(out, { kind: "sendSuccess-return" });

	// loginUser must be called with separate username/password (not the whole body)
	t.is(calls.loginUser.length, 1);
	t.deepEqual(calls.loginUser[0], ["john", "password123"]);

	// sendSuccess contract
	t.is(calls.sendSuccess.length, 1);
	t.deepEqual(calls.sendSuccess[0], [
		res,
		HTTP_STATUS.OK,
		result,
		MESSAGES.USER_LOGGED_IN,
	]);

	t.is(calls.sendError.length, 0);
});

test.serial("login: when credentials invalid, returns sendError(UNAUTHORIZED, INVALID_CREDENTIALS)", async (t) => {
	const { controller, state, calls } = t.context;

	state.loginUserImpl = async () => {
		throw new Error("Invalid credentials");
	};

	const req = { body: { username: "john", password: "wrong" } };
	const res = { __res: true };

	const out = await controller.login(req, res);
	t.deepEqual(out, { kind: "sendError-return" });

	t.is(calls.loginUser.length, 1);
	t.deepEqual(calls.loginUser[0], ["john", "wrong"]);

	t.is(calls.sendError.length, 1);
	t.deepEqual(calls.sendError[0], [
		res,
		HTTP_STATUS.UNAUTHORIZED,
		MESSAGES.INVALID_CREDENTIALS,
	]);

	t.is(calls.sendSuccess.length, 0);
});

test.serial("login: on unexpected error, returns sendError(INTERNAL_SERVER_ERROR, SERVER_ERROR, error.message)", async (t) => {
	const { controller, state, calls } = t.context;

	state.loginUserImpl = async () => {
		throw new Error("jwt signing failed");
	};

	const req = { body: { username: "john", password: "password123" } };
	const res = { __res: true };

	const out = await controller.login(req, res);
	t.deepEqual(out, { kind: "sendError-return" });

	t.is(calls.sendError.length, 1);
	t.deepEqual(calls.sendError[0], [
		res,
		HTTP_STATUS.INTERNAL_SERVER_ERROR,
		MESSAGES.SERVER_ERROR,
		"jwt signing failed",
	]);

	t.is(calls.sendSuccess.length, 0);
});
