import test from 'ava';
import esmock from 'esmock';

/**
 * We mock ../config/constants.js so tests are stable even if constants change.
 * Path note:
 * - This test file is assumed to live in: triptrail-api/test/
 * - errorHandler.js lives in: triptrail-api/middleware/
 * So we import with: ../middleware/errorHandler.js
 */
async function loadErrorHandlers({
	HTTP_STATUS = {
		INTERNAL_SERVER_ERROR: 500,
		BAD_REQUEST: 400,
		UNAUTHORIZED: 401,
		NOT_FOUND: 404,
	},
	MESSAGES = {
		SERVER_ERROR: 'Server error',
	},
} = {}) {
	return esmock('../middleware/errorHandler.js', {
		'../config/constants.js': { HTTP_STATUS, MESSAGES },
	});
}

/**
 * Minimal Express-like response mock.
 * errorHandler uses: res.status(code).json(payload)
 * notFoundHandler uses: res.status(code).json(payload)
 */
function makeRes() {
	return {
		statusCode: undefined,
		jsonBody: undefined,

		// Express chain: res.status(...).json(...)
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

test('errorHandler: default error -> 500, SERVER_ERROR message, no error details in production', async (t) => {
	const { errorHandler } = await loadErrorHandlers();

	// Silence console.error noise and capture calls for verification.
	const originalConsoleError = console.error;
	const consoleCalls = [];
	console.error = (...args) => consoleCalls.push(args);
	t.teardown(() => {
		console.error = originalConsoleError;
	});

	// Simulate production: should NOT expose err.message in response.error
	const prevEnv = process.env.NODE_ENV;
	process.env.NODE_ENV = 'production';
	t.teardown(() => {
		process.env.NODE_ENV = prevEnv;
	});

	const err = new Error('boom');
	const req = {}; // not used by errorHandler
	const res = makeRes();

	// next is not used in your middleware, but we pass it to match Express signature.
	errorHandler(err, req, res, () => {});

	t.is(res.statusCode, 500);
	t.deepEqual(res.jsonBody, {
		success: false,
		message: 'Server error',
		// In production, error details are intentionally omitted.
		error: undefined,
	});

	// Confirm we logged the error (useful for server-side debugging).
	t.is(consoleCalls.length, 1);
	t.is(consoleCalls[0][0], 'Error:');
	t.is(consoleCalls[0][1], err);
});

test('errorHandler: default error -> exposes err.message only in development', async (t) => {
	const { errorHandler } = await loadErrorHandlers();

	const originalConsoleError = console.error;
	console.error = () => {}; // silence
	t.teardown(() => {
		console.error = originalConsoleError;
	});

	const prevEnv = process.env.NODE_ENV;
	process.env.NODE_ENV = 'development';
	t.teardown(() => {
		process.env.NODE_ENV = prevEnv;
	});

	const err = new Error('debug-details');
	const res = makeRes();

	errorHandler(err, {}, res, () => {});

	t.is(res.statusCode, 500);
	t.is(res.jsonBody.success, false);
	t.is(res.jsonBody.message, 'Server error');

	// In development, error detail is included to speed up debugging.
	t.is(res.jsonBody.error, 'debug-details');
});

test('errorHandler: ValidationError -> 400 and "Validation error"', async (t) => {
	const { errorHandler } = await loadErrorHandlers();

	const originalConsoleError = console.error;
	console.error = () => {};
	t.teardown(() => {
		console.error = originalConsoleError;
	});

	const prevEnv = process.env.NODE_ENV;
	process.env.NODE_ENV = 'development';
	t.teardown(() => {
		process.env.NODE_ENV = prevEnv;
	});

	const err = new Error('field X is required');
	err.name = 'ValidationError';

	const res = makeRes();
	errorHandler(err, {}, res, () => {});

	t.is(res.statusCode, 400);
	t.deepEqual(res.jsonBody, {
		success: false,
		message: 'Validation error',
		// In development, we still include original message for troubleshooting.
		error: 'field X is required',
	});
});

test('errorHandler: JsonWebTokenError -> 401 and "Invalid token"', async (t) => {
	const { errorHandler } = await loadErrorHandlers();

	const originalConsoleError = console.error;
	console.error = () => {};
	t.teardown(() => {
		console.error = originalConsoleError;
	});

	const prevEnv = process.env.NODE_ENV;
	process.env.NODE_ENV = 'development';
	t.teardown(() => {
		process.env.NODE_ENV = prevEnv;
	});

	const err = new Error('jwt malformed');
	err.name = 'JsonWebTokenError';

	const res = makeRes();
	errorHandler(err, {}, res, () => {});

	t.is(res.statusCode, 401);
	t.deepEqual(res.jsonBody, {
		success: false,
		message: 'Invalid token',
		error: 'jwt malformed',
	});
});

test('errorHandler: TokenExpiredError -> 401 and "Token expired"', async (t) => {
	const { errorHandler } = await loadErrorHandlers();

	const originalConsoleError = console.error;
	console.error = () => {};
	t.teardown(() => {
		console.error = originalConsoleError;
	});

	const prevEnv = process.env.NODE_ENV;
	process.env.NODE_ENV = 'development';
	t.teardown(() => {
		process.env.NODE_ENV = prevEnv;
	});

	const err = new Error('jwt expired');
	err.name = 'TokenExpiredError';

	const res = makeRes();
	errorHandler(err, {}, res, () => {});

	t.is(res.statusCode, 401);
	t.deepEqual(res.jsonBody, {
		success: false,
		message: 'Token expired',
		error: 'jwt expired',
	});
});

test('notFoundHandler: 404 with route details', async (t) => {
	const { notFoundHandler } = await loadErrorHandlers();

	const req = {
		method: 'GET',
		originalUrl: '/does-not-exist',
	};
	const res = makeRes();

	notFoundHandler(req, res);

	t.is(res.statusCode, 404);
	t.deepEqual(res.jsonBody, {
		success: false,
		message: 'Route not found',
		error: 'Cannot GET /does-not-exist',
	});
});
