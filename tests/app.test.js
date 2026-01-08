/**
 * Unit tests for: app.js
 *
 * This suite checks that app.js wires Express correctly:
 * - creates the app via express()
 * - registers core middleware (cors, body parsers, logger)
 * - mounts API routes under "/api"
 * - registers 404 handler and error handler at the end (order matters)
 *
 * We keep it unit-level by mocking:
 * - express
 * - cors
 * - internal middleware modules (logger, errorHandler)
 * - routes/index.js
 *
 * Important esmock note:
 * - When providing overrides for relative imports, use paths that resolve
 *   from THIS test file (e.g. "../middleware/logger.js"), not "./middleware/logger.js".
 */

import test from "ava";
import esmock from "esmock";

const APP_MODULE_ID = "../app.js";

/**
 * Load app.js with fully controlled mocks so we can inspect:
 * - how express() was used
 * - what app.use(...) registrations were made, and in what order
 */
async function loadAppWithMocks() {
  // Call tracking
  const expressFactoryCalls = [];
  const corsFactoryCalls = [];
  const useCalls = [];

  // Stable middleware identity tokens for equality comparisons
  const corsMw = { __mw: "cors" };
  const jsonMw = { __mw: "express.json" };
  const urlencodedMw = { __mw: "express.urlencoded", __opts: undefined };
  const loggerMw = { __mw: "logger" };
  const routesRouter = { __router: "routes" };
  const notFoundHandler = { __mw: "notFoundHandler" };
  const errorHandler = { __mw: "errorHandler" };

  /**
   * Mock Express app instance with .use(...) that records registrations.
   * We do not need Express internals for these tests.
   */
  const appInstance = {
    use: (...args) => {
      useCalls.push(args);
      return appInstance; // keep chaining behavior consistent with Express
    },
  };

  /**
   * Mock express default export:
   * - express() returns our appInstance
   * - express.json() and express.urlencoded() return deterministic middleware tokens
   */
  function expressMock() {
    expressFactoryCalls.push([]);
    return appInstance;
  }
  expressMock.json = () => jsonMw;
  expressMock.urlencoded = (opts) => {
    urlencodedMw.__opts = opts;
    return urlencodedMw;
  };

  /**
   * Mock cors() factory -> returns a deterministic middleware token.
   */
  function corsMock(...args) {
    corsFactoryCalls.push(args);
    return corsMw;
  }

  /**
   * IMPORTANT:
   * Use override keys that resolve from this test file.
   * These resolve to the same real files that app.js imports.
   */
  const mod = await esmock(APP_MODULE_ID, {
    express: { default: expressMock },
    cors: { default: corsMock },

    "../middleware/logger.js": { logger: loggerMw },
    "../middleware/errorHandler.js": { notFoundHandler, errorHandler },
    "../routes/index.js": { default: routesRouter },
  });

  return {
    app: mod.default,
    expressFactoryCalls,
    corsFactoryCalls,
    useCalls,
    tokens: {
      corsMw,
      jsonMw,
      urlencodedMw,
      loggerMw,
      routesRouter,
      notFoundHandler,
      errorHandler,
    },
  };
}

/**
 * Helper to locate a specific app.use registration.
 * Returns the first index where the predicate matches, or -1.
 */
function findUseIndex(useCalls, predicate) {
  return useCalls.findIndex((args) => predicate(args));
}

test.serial("app.js: creates an Express app once and exports it as default", async (t) => {
  const { app, expressFactoryCalls } = await loadAppWithMocks();

  // app.js should call express() exactly once at initialization.
  t.is(expressFactoryCalls.length, 1);

  // Default export should be the Express app instance (or compatible object).
  t.truthy(app);
  t.is(typeof app.use, "function");
});

test.serial("app.js: registers core middleware + routes + handlers with correct relative ordering", async (t) => {
  const { useCalls, corsFactoryCalls, tokens } = await loadAppWithMocks();

  // Sanity: cors() factory should be called once (typical app.js usage).
  t.is(corsFactoryCalls.length, 1);

  // Locate key registrations (we do NOT assume total number of app.use calls,
  // because app.js may add extra middleware like docs, rate limiters, etc.).
  const idxCors = findUseIndex(useCalls, (a) => a.length === 1 && a[0] === tokens.corsMw);
  const idxJson = findUseIndex(useCalls, (a) => a.length === 1 && a[0] === tokens.jsonMw);
  const idxUrlEnc = findUseIndex(useCalls, (a) => a.length === 1 && a[0] === tokens.urlencodedMw);
  const idxLogger = findUseIndex(useCalls, (a) => a.length === 1 && a[0] === tokens.loggerMw);
  const idxRoutes = findUseIndex(
    useCalls,
    (a) => a.length === 2 && a[0] === "/api" && a[1] === tokens.routesRouter
  );
  const idxNotFound = findUseIndex(useCalls, (a) => a.length === 1 && a[0] === tokens.notFoundHandler);
  const idxError = findUseIndex(useCalls, (a) => a.length === 1 && a[0] === tokens.errorHandler);

  // Ensure each critical piece exists.
  t.true(idxCors >= 0, "Expected app.use(cors()) to be registered");
  t.true(idxJson >= 0, "Expected app.use(express.json()) to be registered");
  t.true(idxUrlEnc >= 0, "Expected app.use(express.urlencoded(...)) to be registered");
  t.true(idxLogger >= 0, "Expected app.use(logger) to be registered");
  t.true(idxRoutes >= 0, 'Expected app.use("/api", routes) to be registered');
  t.true(idxNotFound >= 0, "Expected app.use(notFoundHandler) to be registered");
  t.true(idxError >= 0, "Expected app.use(errorHandler) to be registered");

  // Verify urlencoded was configured as intended.
  t.deepEqual(tokens.urlencodedMw.__opts, { extended: true });

  // Ordering constraints that should hold for a correct Express pipeline:
  // - core middleware should be registered before routes
  t.true(idxCors < idxRoutes, "CORS should be registered before routes");
  t.true(idxJson < idxRoutes, "JSON parser should be registered before routes");
  t.true(idxUrlEnc < idxRoutes, "URL-encoded parser should be registered before routes");
  t.true(idxLogger < idxRoutes, "Logger should be registered before routes");

  // - notFound must run after routes
  t.true(idxRoutes < idxNotFound, "notFoundHandler should be registered after routes");

  // - error handler must be last (at least after notFound)
  t.true(idxNotFound < idxError, "errorHandler should be registered after notFoundHandler");
});
