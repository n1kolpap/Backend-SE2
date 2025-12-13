import test from 'ava';
import esmock from 'esmock';

//copy paste
import http from "node:http";
// import test from "ava";
import got from "got";
import app from "../app.js";
import dotenv from "dotenv";
dotenv.config();

/**
 * auth.js calls jwt.verify(token, process.env.JWT_SECRET).
 * Even though we mock jwt.verify in most tests, setting this avoids
 * accidental failures if the mock is changed later.
 */
process.env.JWT_SECRET ||= 'test-secret';

/**
 * Small helper to create a JWT-like error with a specific `name`,
 * because auth.js branches on error.name:
 * - JsonWebTokenError  -> 401 Invalid token
 * - TokenExpiredError  -> 401 Token expired
 */
function makeJwtError(name, message = name) {
  const err = new Error(message);
  err.name = name;
  return err;
}

/**
 * Dynamically import the real middleware module while replacing its dependencies.
 * This keeps the tests "unit-level": we do not depend on real jwt implementation,
 * real user model data, or real response helpers.
 *
 * IMPORTANT:
 * The path '../middleware/auth.js' assumes this test file is in: triptrail-api/test/
 */
async function loadAuth({
  verifyImpl = () => ({ userId: 'user-1' }),
  findByIdImpl = () => ({ userId: 'user-1', username: 'john_doe' }),
  sendErrorImpl = () => undefined,
  HTTP_STATUS = { UNAUTHORIZED: 401, INTERNAL_SERVER_ERROR: 500 },
  MESSAGES = { UNAUTHORIZED: 'Unauthorized', SERVER_ERROR: 'Server error' },
} = {}) {
  return esmock('../middleware/auth.js', {
    // auth.js: import jwt from 'jsonwebtoken'
    // So we must provide a default export object that has verify().
    jsonwebtoken: {
      default: { verify: verifyImpl },
    },

    // auth.js: import { findById } from '../models/User.js'
    '../models/User.js': { findById: findByIdImpl },

    // auth.js: import { sendError } from '../utils/responses.js'
    '../utils/responses.js': { sendError: sendErrorImpl },

    // auth.js: import { HTTP_STATUS, MESSAGES } from '../config/constants.js'
    '../config/constants.js': { HTTP_STATUS, MESSAGES },
  });
}

/** Minimal Express-like req/res stubs for middleware unit testing. */
function makeReq(authorization) {
  return { headers: authorization ? { authorization } : {} };
}
function makeRes() {
  return {};
}

test('authenticate: returns 401 when Authorization header is missing', async (t) => {
  const sendErrorCalls = [];
  const sendError = (...args) => {
    sendErrorCalls.push(args);
    return { ok: false };
  };

  const { authenticate } = await loadAuth({
    sendErrorImpl: sendError,
    // If the header is missing, jwt.verify should never run.
    verifyImpl: () => t.fail('jwt.verify should not be called when header is missing'),
  });

  const req = makeReq();
  const res = makeRes();

  let nextCalled = false;
  const out = await authenticate(req, res, () => {
    nextCalled = true;
  });

  t.false(nextCalled);
  t.deepEqual(out, { ok: false });

  t.is(sendErrorCalls.length, 1);
  t.is(sendErrorCalls[0][0], res);
  t.is(sendErrorCalls[0][1], 401);
  t.is(sendErrorCalls[0][2], 'Unauthorized');
  t.is(sendErrorCalls[0][3], 'No token provided');
});

test('authenticate: returns 401 when Authorization is not a Bearer token', async (t) => {
  const sendErrorCalls = [];
  const sendError = (...args) => {
    sendErrorCalls.push(args);
    return 'ERR';
  };

  const { authenticate } = await loadAuth({
    sendErrorImpl: sendError,
    verifyImpl: () => t.fail('jwt.verify should not be called when header is not Bearer'),
  });

  const req = makeReq('Basic abc.def.ghi');
  const res = makeRes();

  const out = await authenticate(req, res, () => t.fail('next() must not be called'));
  t.is(out, 'ERR');

  t.is(sendErrorCalls.length, 1);
  t.is(sendErrorCalls[0][1], 401);
  t.is(sendErrorCalls[0][3], 'No token provided');
});

test('authenticate: returns 401 when jwt.verify throws JsonWebTokenError', async (t) => {
  const sendErrorCalls = [];
  const sendError = (...args) => {
    sendErrorCalls.push(args);
    return 'ERR';
  };

  const { authenticate } = await loadAuth({
    sendErrorImpl: sendError,
    verifyImpl: () => {
      throw makeJwtError('JsonWebTokenError', 'invalid signature');
    },
  });

  const req = makeReq('Bearer bad.token');
  const res = makeRes();

  const out = await authenticate(req, res, () => t.fail('next() must not be called'));
  t.is(out, 'ERR');

  t.is(sendErrorCalls.length, 1);
  t.is(sendErrorCalls[0][1], 401);
  t.is(sendErrorCalls[0][3], 'Invalid token');
});

test('authenticate: returns 401 when jwt.verify throws TokenExpiredError', async (t) => {
  const sendErrorCalls = [];
  const sendError = (...args) => {
    sendErrorCalls.push(args);
    return 'ERR';
  };

  const { authenticate } = await loadAuth({
    sendErrorImpl: sendError,
    verifyImpl: () => {
      throw makeJwtError('TokenExpiredError', 'jwt expired');
    },
  });

  const req = makeReq('Bearer expired.token');
  const res = makeRes();

  await authenticate(req, res, () => t.fail('next() must not be called'));

  t.is(sendErrorCalls.length, 1);
  t.is(sendErrorCalls[0][1], 401);
  t.is(sendErrorCalls[0][3], 'Token expired');
});

test('authenticate: returns 401 when decoded userId does not exist', async (t) => {
  const sendErrorCalls = [];
  const sendError = (...args) => {
    sendErrorCalls.push(args);
    return 'ERR';
  };

  const { authenticate } = await loadAuth({
    sendErrorImpl: sendError,
    verifyImpl: () => ({ userId: 'missing-user' }),
    // auth.js uses findById(decoded.userId) synchronously
    findByIdImpl: () => null,
  });

  const req = makeReq('Bearer valid.but.user.missing');
  const res = makeRes();

  await authenticate(req, res, () => t.fail('next() must not be called'));

  t.is(sendErrorCalls.length, 1);
  t.is(sendErrorCalls[0][1], 401);
  t.is(sendErrorCalls[0][3], 'User not found');
});

test('authenticate: on success attaches req.user and calls next()', async (t) => {
  const sendError = () => t.fail('sendError must not be called on success');

  const { authenticate } = await loadAuth({
    sendErrorImpl: sendError,
    verifyImpl: () => ({ userId: 'user-1' }),
    findByIdImpl: () => ({ userId: 'user-1', username: 'john_doe' }),
  });

  const req = makeReq('Bearer good.token');
  const res = makeRes();

  let nextCalls = 0;
  await authenticate(req, res, () => {
    nextCalls += 1;
  });

  // Middleware should pass control to the next handler exactly once.
  t.is(nextCalls, 1);

  // auth.js intentionally only attaches a subset of the user object.
  t.deepEqual(req.user, { userId: 'user-1', username: 'john_doe' });
});

test('authenticate: returns 500 on unexpected errors', async (t) => {
  const sendErrorCalls = [];
  const sendError = (...args) => {
    sendErrorCalls.push(args);
    return 'ERR';
  };

  const { authenticate } = await loadAuth({
    sendErrorImpl: sendError,
    verifyImpl: () => {
      // Any error that is NOT JsonWebTokenError / TokenExpiredError
      // should produce a 500 with error.message.
      throw new Error('boom');
    },
  });

  const req = makeReq('Bearer triggers.error');
  const res = makeRes();

  await authenticate(req, res, () => t.fail('next() must not be called'));

  t.is(sendErrorCalls.length, 1);
  t.is(sendErrorCalls[0][1], 500);
  t.is(sendErrorCalls[0][2], 'Server error');
  t.is(sendErrorCalls[0][3], 'boom');
});
