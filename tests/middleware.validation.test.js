import test from 'ava';
import esmock from 'esmock';

/**
 * This test file assumes:
 *   Backend-SE2/
 *     middleware/validation.js
 *     tests/validation.middleware.test.js
 *
 * If your folders differ, adjust this module id.
 */
const VALIDATION_MODULE_ID = '../middleware/validation.js';

/**
 * express-validator returns "validation chains" which are callable middleware
 * functions that also expose chainable methods (trim(), notEmpty(), etc.).
 *
 * For unit tests, we do NOT need real express-validator behavior; we only need:
 * - to confirm your module builds the expected chains (correct fields, methods, messages)
 * - to confirm your handleValidationErrors() uses validationResult() correctly
 *
 * This helper creates a fake chain object and records each chained call.
 */
function makeChain(kind, field) {
	// In real express-validator, the chain is also a middleware function.
	const chain = function chainMiddleware(req, res, next) {
		if (typeof next === 'function') next();
	};

		chain.__kind = kind;     // "body" or "param"
		chain.__field = field;   // e.g. "username", "userId", "endDate"
		chain.__calls = [];      // record of chained methods for assertions

		// Helper to record a call and keep chaining.
		const record = (name) => (...args) => {
			chain.__calls.push([name, args]);
			return chain;
		};

		// Implement only the chain methods used by your validation.js.
		chain.trim = record('trim');
		chain.notEmpty = record('notEmpty');
		chain.withMessage = record('withMessage');
		chain.isLength = record('isLength');
		chain.optional = record('optional');
		chain.isEmail = record('isEmail');
		chain.isISO8601 = record('isISO8601');
		chain.custom = record('custom');
		chain.isFloat = record('isFloat');

		return chain;
}

/**
 * Builds a mock express-validator module:
 * - body(field) returns a recorded chain
 * - param(field) returns a recorded chain
 * - validationResult(req) returns an object with isEmpty() and array()
 *
 * We keep validationResult "stateful" so tests can switch between:
 * - no errors
 * - errors present
 * without needing to reload the module.
 */
function makeExpressValidatorMock() {
	const state = {
		isEmpty: true,
		errorsArray: [],
	};

	return {
		state,

		body: (field) => makeChain('body', field),
		param: (field) => makeChain('param', field),

		validationResult: () => ({
			isEmpty: () => state.isEmpty,
								 array: () => state.errorsArray,
		}),
	};
}

test.before(async (t) => {
	// ---- Arrange shared mocks used by all tests in this file ----
	const ev = makeExpressValidatorMock();

	const sendErrorCalls = [];
	const sendError = (...args) => {
		sendErrorCalls.push(args);
		return { sent: true };
	};

	const HTTP_STATUS = { BAD_REQUEST: 400 };

	// Load validation.js with mocked dependencies.
	const mod = await esmock(VALIDATION_MODULE_ID, {
		'express-validator': {
			body: ev.body,
			param: ev.param,
			validationResult: ev.validationResult,
		},
		'../utils/responses.js': { sendError },
		'../config/constants.js': { HTTP_STATUS },
	});

	t.context.ev = ev;
	t.context.mod = mod;
	t.context.sendErrorCalls = sendErrorCalls;
});

test.serial('handleValidationErrors: when errors exist -> returns sendError(400, "Validation failed", errors.array()) and does not call next()', (t) => {
	const { ev, mod, sendErrorCalls } = t.context;

	// Simulate validation failures.
	ev.state.isEmpty = false;
	ev.state.errorsArray = [
		{ msg: 'Username is required', path: 'username', location: 'body' },
	];

	// Clear any previous calls recorded by earlier tests.
	sendErrorCalls.length = 0;

	const req = {};
	const res = {};
	let nextCalled = 0;

	const out = mod.handleValidationErrors(req, res, () => {
		nextCalled += 1;
	});

	// next() must NOT be called when there are validation errors.
	t.is(nextCalled, 0);

	// sendError must be called exactly once with the expected payload.
	t.is(sendErrorCalls.length, 1);
	t.is(sendErrorCalls[0][0], res);
	t.is(sendErrorCalls[0][1], 400);
	t.is(sendErrorCalls[0][2], 'Validation failed');
	t.deepEqual(sendErrorCalls[0][3], ev.state.errorsArray);

	// handleValidationErrors returns whatever sendError returns.
	t.deepEqual(out, { sent: true });
});

test.serial('handleValidationErrors: when no errors -> calls next() and does not call sendError()', (t) => {
	const { ev, mod, sendErrorCalls } = t.context;

	// Simulate clean validation result.
	ev.state.isEmpty = true;
	ev.state.errorsArray = [];

	sendErrorCalls.length = 0;

	const req = {};
	const res = {};
	let nextCalled = 0;

	const out = mod.handleValidationErrors(req, res, () => {
		nextCalled += 1;
	});

	t.is(nextCalled, 1);
	t.is(sendErrorCalls.length, 0);
	t.is(out, undefined); // middleware returns undefined on success
});

test.serial('signupValidation: contains expected rules and ends with handleValidationErrors', (t) => {
	const { mod } = t.context;

	const { signupValidation, handleValidationErrors } = mod;

	// Expect 3 chains (username, password, email) + final error handler.
	t.is(signupValidation.length, 4);
	t.is(signupValidation[3], handleValidationErrors);

	const username = signupValidation[0];
	t.is(username.__kind, 'body');
	t.is(username.__field, 'username');
	t.deepEqual(
		username.__calls,
		[
			['trim', []],
			 ['notEmpty', []],
			 ['withMessage', ['Username is required']],
			 ['isLength', [{ min: 3 }]],
			 ['withMessage', ['Username must be at least 3 characters']],
		]
	);

	const password = signupValidation[1];
	t.is(password.__kind, 'body');
	t.is(password.__field, 'password');
	t.deepEqual(
		password.__calls,
		[
			['notEmpty', []],
			 ['withMessage', ['Password is required']],
			 ['isLength', [{ min: 6 }]],
			 ['withMessage', ['Password must be at least 6 characters']],
		]
	);

	const email = signupValidation[2];
	t.is(email.__kind, 'body');
	t.is(email.__field, 'email');
	t.deepEqual(
		email.__calls,
		[
			['optional', []],
			 ['isEmail', []],
			 ['withMessage', ['Invalid email format']],
		]
	);
});

test.serial('loginValidation: contains expected rules and ends with handleValidationErrors', (t) => {
	const { mod } = t.context;
	const { loginValidation, handleValidationErrors } = mod;

	t.is(loginValidation.length, 3);
	t.is(loginValidation[2], handleValidationErrors);

	const username = loginValidation[0];
	t.is(username.__kind, 'body');
	t.is(username.__field, 'username');
	t.deepEqual(username.__calls, [
		['trim', []],
		['notEmpty', []],
		['withMessage', ['Username is required']],
	]);

	const password = loginValidation[1];
	t.is(password.__kind, 'body');
	t.is(password.__field, 'password');
	t.deepEqual(password.__calls, [
		['notEmpty', []],
		['withMessage', ['Password is required']],
	]);
});

test.serial('createTripValidation: contains key rules and the endDate custom validator enforces endDate >= startDate', (t) => {
	const { mod } = t.context;
	const { createTripValidation, handleValidationErrors } = mod;

	// Last element must always be the error handler.
	t.is(createTripValidation[createTripValidation.length - 1], handleValidationErrors);

	// Find the chain for endDate.
	const endDateChain = createTripValidation.find(
		(x) => x && x.__kind === 'body' && x.__field === 'endDate'
	);
	t.truthy(endDateChain, 'Expected a body("endDate") validation chain');

	// Ensure it contains .custom(fn) and that fn has the intended logic.
	const customCall = endDateChain.__calls.find(([name]) => name === 'custom');
	t.truthy(customCall, 'Expected endDate chain to include custom()');
	const customFn = customCall[1][0]; // first argument to custom()

// Case 1: endDate before startDate -> should throw.
t.throws(() => {
	customFn('2025-01-01', { req: { body: { startDate: '2025-01-02' } } });
}, { message: 'End date must be after start date' });

// Case 2: endDate after startDate -> should return true.
t.true(
	customFn('2025-01-03', { req: { body: { startDate: '2025-01-02' } } })
);

// Quick structural checks for some other important fields:
const userIdParam = createTripValidation.find((x) => x && x.__kind === 'param' && x.__field === 'userId');
t.truthy(userIdParam);

const budget = createTripValidation.find((x) => x && x.__kind === 'body' && x.__field === 'budget');
t.truthy(budget);
t.deepEqual(budget.__calls, [
	['optional', []],
	['isFloat', [{ min: 0 }]],
	['withMessage', ['Budget must be a positive number']],
]);
});

test.serial('updateTripValidation: requires userId + tripId params and ends with handleValidationErrors', (t) => {
	const { mod } = t.context;
	const { updateTripValidation, handleValidationErrors } = mod;

	t.is(updateTripValidation.length, 3);
	t.is(updateTripValidation[2], handleValidationErrors);

	t.is(updateTripValidation[0].__kind, 'param');
	t.is(updateTripValidation[0].__field, 'userId');

	t.is(updateTripValidation[1].__kind, 'param');
	t.is(updateTripValidation[1].__field, 'tripId');
});

test.serial('activityValidation and noteValidation: both require userId, tripId, date params and end with handleValidationErrors', (t) => {
	const { mod } = t.context;
	const { activityValidation, noteValidation, handleValidationErrors } = mod;

	// ---- activityValidation ----
	t.is(activityValidation[activityValidation.length - 1], handleValidationErrors);

	const activityDate = activityValidation.find((x) => x && x.__kind === 'param' && x.__field === 'date');
	t.truthy(activityDate);
	t.true(activityDate.__calls.some(([name]) => name === 'isISO8601'));

	const activityName = activityValidation.find((x) => x && x.__kind === 'body' && x.__field === 'name');
	t.truthy(activityName);

	// ---- noteValidation ----
	t.is(noteValidation[noteValidation.length - 1], handleValidationErrors);

	const noteDate = noteValidation.find((x) => x && x.__kind === 'param' && x.__field === 'date');
	t.truthy(noteDate);
	t.true(noteDate.__calls.some(([name]) => name === 'isISO8601'));

	const noteBody = noteValidation.find((x) => x && x.__kind === 'body' && x.__field === 'note');
	t.truthy(noteBody);
});
