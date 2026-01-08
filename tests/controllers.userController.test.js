/**
 * Unit tests for: controllers/userController.js
 *
 * This controller does NOT use your shared responses helpers. It directly uses:
 *   res.status(...).json(...)
 *
 * We test:
 * - createUser(req, res)
 *   1) hashes password with bcrypt.hash(password, 10)
 *   2) constructs new User({ email, password: hashedPassword, username })
 *   3) saves user
 *   4) responds 201 with { success:true, message:'User created', data:newUser }
 *   5) on error -> responds 400 with { success:false, message:error.message }
 *
 * - loginUser(req, res)
 *   1) finds user by email (User.findOne({ email }))
 *   2) if no user -> 401 Invalid email or password
 *   3) compares password via bcrypt.compare(password, user.password)
 *   4) if mismatch -> 401 Invalid email or password
 *   5) if match -> jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn:'1h' })
 *      and responds 200 { success:true, token }
 *   6) on error -> 400 { success:false, message:error.message }
 *
 * Tooling:
 * - esmock is used to mock:
 *   - ../models/User.js (default export + static findOne)
 *   - bcrypt (default export with hash/compare)
 *   - jsonwebtoken (default export with sign)
 *
 * IMPORTANT:
 * - These tests assume your controller file is at:
 *     controllers/userController.js
 */

import test from "ava";
import esmock from "esmock";

const MODULE_ID = "../controllers/userController.js";

/**
 * A small helper to build an Express-like response object that:
 * - records status codes
 * - records json bodies
 * - supports chaining (res.status(...).json(...))
 */
function makeRes() {
  return {
    statusCalls: [],
    jsonCalls: [],
    status(code) {
      this.statusCalls.push(code);
      return this; // allow chaining
    },
    json(body) {
      this.jsonCalls.push(body);
      return this;
    },
  };
}

test.before(async (t) => {
  /**
   * Shared mutable state so each test can configure mock behavior.
   */
  const state = {
    // bcrypt behavior
    bcryptHashResult: "hashed_pw",
    bcryptCompareResult: true,

    // User.findOne result
    findOneResult: null,

    // jwt.sign result
    jwtToken: "mock.jwt.token",

    // Simulate throwing errors in specific places
    throwOnHash: null,     // set to Error to throw from bcrypt.hash
    throwOnSave: null,     // set to Error to throw from newUser.save
    throwOnFindOne: null,  // set to Error to throw from User.findOne
    throwOnCompare: null,  // set to Error to throw from bcrypt.compare
    throwOnSign: null,     // set to Error to throw from jwt.sign
  };

  /**
   * Call logs for assertions.
   */
  const calls = {
    bcrypt_hash: [],
    bcrypt_compare: [],
    user_constructor: [],
    user_save: 0,
    user_findOne: [],
    jwt_sign: [],
  };

  /**
   * Mock bcrypt (default import in controller)
   */
  const bcryptMock = {
    hash: async (password, rounds) => {
      calls.bcrypt_hash.push([password, rounds]);
      if (state.throwOnHash) throw state.throwOnHash;
      return state.bcryptHashResult;
    },
    compare: async (plain, hashed) => {
      calls.bcrypt_compare.push([plain, hashed]);
      if (state.throwOnCompare) throw state.throwOnCompare;
      return state.bcryptCompareResult;
    },
  };

  /**
   * Mock jsonwebtoken (default import in controller)
   */
  const jwtMock = {
    sign: (payload, secret, options) => {
      calls.jwt_sign.push([payload, secret, options]);
      if (state.throwOnSign) throw state.throwOnSign;
      return state.jwtToken;
    },
  };

  /**
   * Mock User model:
   * - default export is a constructor (used via `new User(...)`)
   * - static method findOne is used via `User.findOne(...)`
   */
  function UserMock(doc) {
    calls.user_constructor.push([doc]);

    // The controller returns `newUser` in the response JSON "data".
    // We mimic a Mongoose document with properties + a save() method.
    this._id = "u1";
    this.email = doc.email;
    this.username = doc.username;
    this.password = doc.password;

    this.save = async () => {
      calls.user_save += 1;
      if (state.throwOnSave) throw state.throwOnSave;
      return this;
    };
  }

  UserMock.findOne = async (query) => {
    calls.user_findOne.push([query]);
    if (state.throwOnFindOne) throw state.throwOnFindOne;
    return state.findOneResult;
  };

  /**
   * Import controller with injected mocks.
   *
   * Note:
   * - controller imports "bcrypt" and "jsonwebtoken" as default imports
   * - controller imports User from '../models/User.js' as default import
   */
  const controller = await esmock(MODULE_ID, {
    bcrypt: { default: bcryptMock },
    jsonwebtoken: { default: jwtMock },
    "../models/User.js": { default: UserMock },
  });

  t.context.state = state;
  t.context.calls = calls;
  t.context.controller = controller;
});

test.beforeEach((t) => {
  const { state, calls } = t.context;

  // Reset state to defaults
  state.bcryptHashResult = "hashed_pw";
  state.bcryptCompareResult = true;
  state.findOneResult = null;
  state.jwtToken = "mock.jwt.token";

  state.throwOnHash = null;
  state.throwOnSave = null;
  state.throwOnFindOne = null;
  state.throwOnCompare = null;
  state.throwOnSign = null;

  // Clear call logs
  calls.bcrypt_hash.length = 0;
  calls.bcrypt_compare.length = 0;
  calls.user_constructor.length = 0;
  calls.user_save = 0;
  calls.user_findOne.length = 0;
  calls.jwt_sign.length = 0;
});

/* -------------------------------------------------------------------------- */
/* createUser                                                                 */
/* -------------------------------------------------------------------------- */

test.serial("createUser: hashes password, saves user, returns 201 with new user data", async (t) => {
  const { controller, state, calls } = t.context;

  // Arrange
  state.bcryptHashResult = "hashed_password_10_rounds";

  const req = {
    body: { email: "a@b.com", password: "secret", username: "alice" },
  };
  const res = makeRes();

  // Act
  await controller.createUser(req, res);

  // Assert: bcrypt.hash called with (password, 10)
  t.deepEqual(calls.bcrypt_hash, [["secret", 10]]);

  // Assert: User constructor called with hashed password
  t.is(calls.user_constructor.length, 1);
  t.deepEqual(calls.user_constructor[0][0], {
    email: "a@b.com",
    password: "hashed_password_10_rounds",
    username: "alice",
  });

  // Assert: save called once
  t.is(calls.user_save, 1);

  // Assert: response is 201 with expected payload
  t.deepEqual(res.statusCalls, [201]);
  t.is(res.jsonCalls.length, 1);

  const body = res.jsonCalls[0];
  t.deepEqual(body.success, true);
  t.deepEqual(body.message, "User created");
  t.truthy(body.data);

  // Data should include the created user with hashed password
  t.is(body.data.email, "a@b.com");
  t.is(body.data.username, "alice");
  t.is(body.data.password, "hashed_password_10_rounds");
});

test.serial("createUser: if hashing fails, returns 400 with error message", async (t) => {
  const { controller, state, calls } = t.context;

  state.throwOnHash = new Error("hash failed");

  const req = {
    body: { email: "a@b.com", password: "secret", username: "alice" },
  };
  const res = makeRes();

  await controller.createUser(req, res);

  // If hash throws, no User should be constructed and save should not run.
  t.is(calls.user_constructor.length, 0);
  t.is(calls.user_save, 0);

  t.deepEqual(res.statusCalls, [400]);
  t.deepEqual(res.jsonCalls, [{ success: false, message: "hash failed" }]);
});

test.serial("createUser: if save fails, returns 400 with error message", async (t) => {
  const { controller, state, calls } = t.context;

  state.throwOnSave = new Error("save failed");

  const req = {
    body: { email: "a@b.com", password: "secret", username: "alice" },
  };
  const res = makeRes();

  await controller.createUser(req, res);

  // Constructor is called, save attempted once
  t.is(calls.user_constructor.length, 1);
  t.is(calls.user_save, 1);

  t.deepEqual(res.statusCalls, [400]);
  t.deepEqual(res.jsonCalls, [{ success: false, message: "save failed" }]);
});

/* -------------------------------------------------------------------------- */
/* loginUser                                                                  */
/* -------------------------------------------------------------------------- */

test.serial("loginUser: if user not found, returns 401 invalid credentials (and does not compare or sign)", async (t) => {
  const { controller, state, calls } = t.context;

  state.findOneResult = null; // no user

  const req = { body: { email: "a@b.com", password: "secret" } };
  const res = makeRes();

  await controller.loginUser(req, res);

  // findOne called with { email }
  t.deepEqual(calls.user_findOne, [[{ email: "a@b.com" }]]);

  // compare/sign should not occur
  t.is(calls.bcrypt_compare.length, 0);
  t.is(calls.jwt_sign.length, 0);

  t.deepEqual(res.statusCalls, [401]);
  t.deepEqual(res.jsonCalls, [{ success: false, message: "Invalid email or password" }]);
});

test.serial("loginUser: if password mismatch, returns 401 invalid credentials (and does not sign)", async (t) => {
  const { controller, state, calls } = t.context;

  // Arrange: user exists but compare fails
  state.findOneResult = { _id: "u1", email: "a@b.com", password: "hashed" };
  state.bcryptCompareResult = false;

  const req = { body: { email: "a@b.com", password: "wrong" } };
  const res = makeRes();

  await controller.loginUser(req, res);

  // findOne called
  t.deepEqual(calls.user_findOne, [[{ email: "a@b.com" }]]);

  // compare called with (provided password, stored hash)
  t.deepEqual(calls.bcrypt_compare, [["wrong", "hashed"]]);

  // jwt.sign should NOT be called
  t.is(calls.jwt_sign.length, 0);

  t.deepEqual(res.statusCalls, [401]);
  t.deepEqual(res.jsonCalls, [{ success: false, message: "Invalid email or password" }]);
});

test.serial("loginUser: success -> signs JWT and returns 200 with token", async (t) => {
  const { controller, state, calls } = t.context;

  // Arrange: user exists and password matches
  state.findOneResult = { _id: "u1", email: "a@b.com", password: "hashed" };
  state.bcryptCompareResult = true;

  // JWT secret is read from process.env at runtime; set it for this test.
  const prevSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "supersecret";
  t.teardown(() => {
    if (prevSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevSecret;
  });

  state.jwtToken = "signed.token.value";

  const req = { body: { email: "a@b.com", password: "secret" } };
  const res = makeRes();

  await controller.loginUser(req, res);

  // compare called correctly
  t.deepEqual(calls.bcrypt_compare, [["secret", "hashed"]]);

  // jwt.sign called with correct payload, secret, and options
  t.is(calls.jwt_sign.length, 1);
  t.deepEqual(calls.jwt_sign[0], [
    { id: "u1" },
    "supersecret",
    { expiresIn: "1h" },
  ]);

  // Response payload
  t.deepEqual(res.statusCalls, [200]);
  t.deepEqual(res.jsonCalls, [{ success: true, token: "signed.token.value" }]);
});

test.serial("loginUser: if findOne throws, returns 400 with error message", async (t) => {
  const { controller, state } = t.context;

  state.throwOnFindOne = new Error("db error");

  const req = { body: { email: "a@b.com", password: "secret" } };
  const res = makeRes();

  await controller.loginUser(req, res);

  t.deepEqual(res.statusCalls, [400]);
  t.deepEqual(res.jsonCalls, [{ success: false, message: "db error" }]);
});

test.serial("loginUser: if jwt.sign throws, returns 400 with error message", async (t) => {
  const { controller, state, calls } = t.context;

  state.findOneResult = { _id: "u1", email: "a@b.com", password: "hashed" };
  state.bcryptCompareResult = true;

  // If jwt.sign throws, it should be caught by the controller and return 400
  state.throwOnSign = new Error("sign failed");

  const prevSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "supersecret";
  t.teardown(() => {
    if (prevSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevSecret;
  });

  const req = { body: { email: "a@b.com", password: "secret" } };
  const res = makeRes();

  await controller.loginUser(req, res);

  // jwt.sign attempted once
  t.is(calls.jwt_sign.length, 1);

  t.deepEqual(res.statusCalls, [400]);
  t.deepEqual(res.jsonCalls, [{ success: false, message: "sign failed" }]);
});

