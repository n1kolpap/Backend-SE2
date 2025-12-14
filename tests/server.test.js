/**
 * Unit test for: server.js
 *
 * Your server.js has import-time side effects:
 * - dotenv.config()
 * - app.listen(PORT, callback)
 * - console.log banner inside callback
 *
 * We keep the test fully isolated by mocking:
 * - dotenv (so no actual file I/O happens)
 * - app (so no real port is opened)
 * - console.log (so test output stays clean and we can assert logs)
 *
 * IMPORTANT:
 * server.js runs immediately on import, so this file should contain a single
 * scenario (one import). If you want to test multiple scenarios (e.g. default
 * port vs env port), put them in separate test files so each runs in its own
 * AVA worker process.
 */

import test from "ava";
import esmock from "esmock";

test.serial("server.js: calls dotenv.config(), listens on env PORT, and prints startup banner", async (t) => {
	// ---- Arrange: set environment the module reads at import-time ----
	const prevPort = process.env.PORT;
	const prevEnv = process.env.NODE_ENV;

	process.env.PORT = "5050";
	process.env.NODE_ENV = "test";

	t.teardown(() => {
		// restore env after the test
		if (prevPort === undefined) delete process.env.PORT;
		else process.env.PORT = prevPort;

		if (prevEnv === undefined) delete process.env.NODE_ENV;
		else process.env.NODE_ENV = prevEnv;
	});

		// ---- Arrange: capture console.log output (banner) ----
		const originalLog = console.log;
		const logLines = [];
		console.log = (...args) => {
			// server.js logs single strings; join defensively
			logLines.push(args.map(String).join(" "));
		};

		t.teardown(() => {
			console.log = originalLog;
		});

		// ---- Arrange: mock dotenv.config() and record calls ----
		let dotenvConfigCalls = 0;
		const dotenvMock = {
			config: () => {
				dotenvConfigCalls += 1;
			},
		};

		// ---- Arrange: mock app.listen() so no real server starts ----
		const listenCalls = [];
		const appMock = {
			listen: (port, cb) => {
				listenCalls.push([port, cb]);

				// Simulate a successful "server started" event by invoking the callback,
				// which triggers the banner logs inside server.js.
				if (typeof cb === "function") cb();

				// Express returns an http.Server; return a harmless stub.
				return { close() {} };
			},
		};

		// ---- Act: import server.js with mocks (this executes the entrypoint) ----
		await esmock("../server.js", {
			dotenv: { default: dotenvMock },
			"../app.js": { default: appMock }, // server.js imports "./app.js"
		});

		// ---- Assert: dotenv.config called once ----
		t.is(dotenvConfigCalls, 1);

		// ---- Assert: app.listen called once with env PORT ----
		t.is(listenCalls.length, 1);
		t.is(listenCalls[0][0], "5050");     // PORT is a string when provided via env
		t.is(typeof listenCalls[0][1], "function");

		// ---- Assert: banner was printed (check stable substrings) ----
		const allLogs = logLines.join("\n");

		t.true(allLogs.includes("TripTrail API Server Started"));
		t.true(allLogs.includes("Environment: test"));
		t.true(allLogs.includes("Port: 5050"));
		t.true(allLogs.includes("http://localhost:5050"));
		t.true(allLogs.includes("/api/health"));
});
