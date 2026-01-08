/**
 * Unit tests for: config/database.js
 *
 * Your database module:
 * - imports mongoose + dotenv
 * - calls dotenv.config() at module load time
 * - exports default async function connectDB()
 *     - uses process.env.MONGO_URI if set, otherwise defaults to:
 *       "mongodb://localhost:27017/triptrail"
 *     - calls mongoose.connect(uri, { useNewUrlParser:true, useUnifiedTopology:true })
 *     - on success: console.log("MongoDB Connected: <host>")
 *     - on failure: console.error("MongoDB connection error: <message>") and process.exit(1)
 *
 * Strategy:
 * - Use esmock to replace:
 *   - mongoose.connect (so we never touch a real database)
 *   - dotenv.config (so we can assert it was invoked)
 * - Stub console.log / console.error and process.exit to prevent noisy output / exiting tests.
 *
 * Assumed layout:
 *   Backend-SE2/
 *     config/database.js
 *     tests/config.database.test.js
 */

import test from "ava";
import esmock from "esmock";

const MODULE_ID = "../config/database.js";

/**
 * Capture console output + process.exit calls for the duration of a test.
 * Automatically restores originals via t.teardown().
 *
 * @param {import("ava").ExecutionContext} t
 * @returns {{ logCalls: any[][], errorCalls: any[][], exitCalls: any[] }}
 */
const captureConsoleAndExit = (t) => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit;

  const logCalls = [];
  const errorCalls = [];
  const exitCalls = [];

  console.log = (...args) => logCalls.push(args);
  console.error = (...args) => errorCalls.push(args);

  // Prevent tests from exiting the Node process.
  process.exit = (code) => {
    exitCalls.push(code);
  };

  t.teardown(() => {
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  });

  return { logCalls, errorCalls, exitCalls };
};

test.before(async (t) => {
  /**
   * Shared mutable state to control mock behavior per test.
   * We load the module only once (ESM caching), so we keep mocks stateful.
   */
  const state = {
    // mongoose.connect behavior controls
    shouldConnectSucceed: true,
    host: "mock-host",
    connectErrorMessage: "boom",

    // call tracking
    dotenvConfigCalls: 0,
    mongooseConnectCalls: [],
  };

  // Mock for dotenv (default import)
  const dotenvMock = {
    config: () => {
      state.dotenvConfigCalls += 1;
    },
  };

  // Mock for mongoose (default import)
  const mongooseMock = {
    connect: async (uri, options) => {
      state.mongooseConnectCalls.push([uri, options]);

      if (state.shouldConnectSucceed) {
        return { connection: { host: state.host } };
      }
      throw new Error(state.connectErrorMessage);
    },
  };

  // Import the module under test with mocked dependencies
  const mod = await esmock(MODULE_ID, {
    mongoose: { default: mongooseMock },
    dotenv: { default: dotenvMock },
  });

  t.context.state = state;
  t.context.connectDB = mod.default;
});

test.beforeEach((t) => {
  const { state } = t.context;

  // Reset mock state and call history before each test
  state.shouldConnectSucceed = true;
  state.host = "mock-host";
  state.connectErrorMessage = "boom";
  state.mongooseConnectCalls.length = 0;
});

/* -------------------------------------------------------------------------- */
/* Module load side effect: dotenv.config()                                    */
/* -------------------------------------------------------------------------- */

test.serial("database.js: calls dotenv.config() once at import-time", (t) => {
  // Because the module is imported once in test.before(), we expect exactly one call.
  t.is(t.context.state.dotenvConfigCalls, 1);
});

/* -------------------------------------------------------------------------- */
/* connectDB success path                                                     */
/* -------------------------------------------------------------------------- */

test.serial(
  "connectDB: uses process.env.MONGO_URI when set and logs host on success",
  async (t) => {
    const { connectDB, state } = t.context;

    // Arrange: capture console and process.exit to keep test output clean and prevent exit.
    const { logCalls, errorCalls, exitCalls } = captureConsoleAndExit(t);

    // Arrange: set a custom URI
    const prevUri = process.env.MONGO_URI;
    process.env.MONGO_URI = "mongodb://example.com:27017/triptrail_test";
    t.teardown(() => {
      if (prevUri === undefined) delete process.env.MONGO_URI;
      else process.env.MONGO_URI = prevUri;
    });

      state.host = "example-host";

      // Act
      await connectDB();

      // Assert: mongoose.connect called once with env URI and expected options
      t.is(state.mongooseConnectCalls.length, 1);

      const [uri, options] = state.mongooseConnectCalls[0];
      t.is(uri, "mongodb://example.com:27017/triptrail_test");
      t.deepEqual(options, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      // Assert: success logs once, and no error/exit happens
      t.is(logCalls.length, 1);
      t.is(logCalls[0][0], "MongoDB Connected: example-host");

      t.is(errorCalls.length, 0);
      t.is(exitCalls.length, 0);
  }
);

test.serial(
  "connectDB: falls back to default localhost URI when MONGO_URI is not set",
  async (t) => {
    const { connectDB, state } = t.context;

    // Arrange: remove env var for this test
    const prevUri = process.env.MONGO_URI;
    delete process.env.MONGO_URI;
    t.teardown(() => {
      if (prevUri !== undefined) process.env.MONGO_URI = prevUri;
    });

      // Arrange: stub console.log to avoid noise (we only care it was called)
      const originalLog = console.log;
      console.log = () => {};
      t.teardown(() => {
        console.log = originalLog;
      });

      // Act
      await connectDB();

      // Assert: default URI used
      t.is(state.mongooseConnectCalls.length, 1);
      const [uri] = state.mongooseConnectCalls[0];
      t.is(uri, "mongodb://localhost:27017/triptrail");
  }
);

/* -------------------------------------------------------------------------- */
/* connectDB failure path                                                     */
/* -------------------------------------------------------------------------- */

test.serial(
  "connectDB: on connection error logs message and calls process.exit(1)",
  async (t) => {
    const { connectDB, state } = t.context;

    // Arrange: force mongoose.connect to fail
    state.shouldConnectSucceed = false;
    state.connectErrorMessage = "cannot connect";

    // Arrange: capture console.error and process.exit
    const { logCalls, errorCalls, exitCalls } = captureConsoleAndExit(t);

    // Act
    await connectDB();

    // Assert: it should NOT log the success message
    t.is(logCalls.length, 0);

    // Assert: it should log the formatted error message
    t.is(errorCalls.length, 1);
    t.is(errorCalls[0][0], "MongoDB connection error: cannot connect");

    // Assert: it should exit with code 1
    t.deepEqual(exitCalls, [1]);
  }
);
