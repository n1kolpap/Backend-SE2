/**
 * Unit tests for: services/authService.js
 *
 * What we are testing:
 * - registerUser(userData)
 *   - throws if username already exists
 *   - creates a user via models/User.js:createUser(...)
 *   - returns the created user WITHOUT the password field
 *
 * - loginUser(username, password)
 *   - throws on unknown username
 *   - throws on wrong password
 *   - signs a JWT via jsonwebtoken.sign(...)
 *   - returns { user: <without password>, token }
 *   - uses JWT_EXPIRES_IN if set, otherwise defaults to "7d"
 *
 * Approach:
 * - Use esmock to isolate the module and replace:
 *   - jsonwebtoken (jwt.sign)
 *   - ../models/User.js (findByUsername, createUser)
 *
 * Assumed repo layout:
 *   Backend-SE2/
 *     services/authService.js
 *     models/User.js
 *     tests/authService.service.test.js
 */

import test from 'ava';
import esmock from 'esmock';

const AUTH_SERVICE_MODULE_ID = '../services/authService.js';

/**
 * Helper to load authService.js with controlled mocks.
 * Each test can override:
 * - findByUsernameImpl
 * - createUserImpl
 * - jwtSignImpl
 */
async function loadAuthService({
  findByUsernameImpl = () => null,
  createUserImpl = (data) => ({
    userId: 'u1',
    username: data.username,
    password: data.password,
    email: data.email ?? null,
  }),
  jwtSignImpl = () => 'mock.jwt.token',
} = {}) {
  return esmock(AUTH_SERVICE_MODULE_ID, {
    // authService.js: import jwt from 'jsonwebtoken';
    jsonwebtoken: {
      default: {
        sign: jwtSignImpl,
      },
    },

    // authService.js: import { findByUsername, createUser } from '../models/User.js'
    '../models/User.js': {
      findByUsername: findByUsernameImpl,
      createUser: createUserImpl,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* registerUser                                                               */
/* -------------------------------------------------------------------------- */

test.serial('registerUser: throws "Username already exists" if findByUsername returns a user', async (t) => {
  // Arrange
  const mod = await loadAuthService({
    findByUsernameImpl: () => ({ userId: 'existing', username: 'john' }),
  });

  // Act + Assert
  await t.throwsAsync(
    () => mod.registerUser({ username: 'john', password: 'pw', email: 'a@b.com' }),
    { message: 'Username already exists' }
  );
});

test.serial('registerUser: calls createUser with expected fields and returns user without password', async (t) => {
  // Arrange: capture calls to createUser
  const createUserCalls = [];
  const createUserImpl = (data) => {
    createUserCalls.push(data);
    return {
      userId: 'u99',
      username: data.username,
      password: data.password, // service must strip this in return value
      email: data.email,
    };
  };

  const mod = await loadAuthService({
    findByUsernameImpl: () => null,
    createUserImpl,
  });

  const input = { username: 'alice', password: 'password123', email: 'alice@example.com' };

  // Act
  const out = await mod.registerUser(input);

  // Assert: createUser called once with expected payload
  t.is(createUserCalls.length, 1);
  t.deepEqual(createUserCalls[0], input);

  // Assert: returned object has no password
  t.deepEqual(out, {
    userId: 'u99',
    username: 'alice',
    email: 'alice@example.com',
  });
  t.false('password' in out);
});

/* -------------------------------------------------------------------------- */
/* loginUser                                                                  */
/* -------------------------------------------------------------------------- */

test.serial('loginUser: throws "Invalid credentials" when username is not found', async (t) => {
  // Arrange
  const mod = await loadAuthService({
    findByUsernameImpl: () => null,
  });

  // Act + Assert
  await t.throwsAsync(() => mod.loginUser('missing', 'pw'), {
    message: 'Invalid credentials',
  });
});

test.serial('loginUser: throws "Invalid credentials" when password does not match', async (t) => {
  // Arrange: user exists but with different password
  const mod = await loadAuthService({
    findByUsernameImpl: () => ({
      userId: 'u1',
      username: 'john',
      password: 'correct',
      email: 'john@example.com',
    }),
  });

  // Act + Assert
  await t.throwsAsync(() => mod.loginUser('john', 'wrong'), {
    message: 'Invalid credentials',
  });
});

test.serial('loginUser: signs JWT with payload + secret + expiresIn (default 7d) and returns user without password', async (t) => {
  // Arrange environment (authService reads from process.env)
  const prevSecret = process.env.JWT_SECRET;
  const prevExpires = process.env.JWT_EXPIRES_IN;

  process.env.JWT_SECRET = 'unit-test-secret';
  delete process.env.JWT_EXPIRES_IN; // enforce default path "7d"

  t.teardown(() => {
    process.env.JWT_SECRET = prevSecret;
    if (prevExpires === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = prevExpires;
  });

  // Arrange: mock user and capture jwt.sign call arguments
  const jwtSignCalls = [];
  const jwtSignImpl = (...args) => {
    jwtSignCalls.push(args);
    return 'token-123';
  };

  const user = {
    userId: 'u5',
    username: 'maria',
    password: 'pw123',
    email: 'maria@example.com',
  };

  const mod = await loadAuthService({
    findByUsernameImpl: () => user,
    jwtSignImpl,
  });

  // Act
  const out = await mod.loginUser('maria', 'pw123');

  // Assert: jwt.sign called once with correct payload/secret/options
  t.is(jwtSignCalls.length, 1);

  const [payload, secret, options] = jwtSignCalls[0];
  t.deepEqual(payload, { userId: 'u5', username: 'maria' });
  t.is(secret, 'unit-test-secret');
  t.deepEqual(options, { expiresIn: '7d' });

  // Assert: returned user excludes password and includes token
  t.deepEqual(out, {
    user: {
      userId: 'u5',
      username: 'maria',
      email: 'maria@example.com',
    },
    token: 'token-123',
  });
  t.false('password' in out.user);
});

test.serial('loginUser: uses JWT_EXPIRES_IN when provided', async (t) => {
  // Arrange env to force custom expiry
  const prevSecret = process.env.JWT_SECRET;
  const prevExpires = process.env.JWT_EXPIRES_IN;

  process.env.JWT_SECRET = 'unit-test-secret';
  process.env.JWT_EXPIRES_IN = '1h';

  t.teardown(() => {
    process.env.JWT_SECRET = prevSecret;
    if (prevExpires === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = prevExpires;
  });

  const jwtSignCalls = [];
  const jwtSignImpl = (...args) => {
    jwtSignCalls.push(args);
    return 'token-xyz';
  };

  const mod = await loadAuthService({
    findByUsernameImpl: () => ({
      userId: 'u9',
      username: 'nick',
      password: 'pw',
      email: null,
    }),
    jwtSignImpl,
  });

  // Act
  await mod.loginUser('nick', 'pw');

  // Assert
  t.is(jwtSignCalls.length, 1);
  const [, , options] = jwtSignCalls[0];
  t.deepEqual(options, { expiresIn: '1h' });
});

