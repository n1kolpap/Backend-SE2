/* ============================================================================
 * helpers-k6.js
 *
 * Shared helpers for k6 scripts under ./tests/k6/
 *
 * Design goals:
 * - Pure JS (no imports from "k6") so this file remains Node-safe.
 * - Works in k6 (global __ENV) and in Node contexts (process.env) without throwing.
 * - Centralizes env config, stages, thresholds, and common request flows.
 * ========================================================================== */

/**
 * Get an env object regardless of runtime:
 * - k6: global __ENV
 * - Node: process.env
 */
const getEnv = () => {
	// k6 provides __ENV as a global; using typeof avoids ReferenceError in Node.
	// eslint-disable-next-line no-undef
	if (typeof __ENV !== "undefined") return __ENV;

	// Node provides process.env
	if (typeof process !== "undefined" && process?.env) return process.env;

	return {};
};

const toNumber = (value, fallback) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
};

/**
 * Centralized config wiring for k6 tests.
 *
 * Env vars supported:
 * - BASE_URL, MAX_VUS, RAMP_STAGE_DURATION, MAX_TEST_DURATION
 * - USERNAME, PASSWORD
 * - P95, P99, RATE
 *
 * @param {object} defaults per-test defaults
 */
export const getK6Config = (defaults = {}) => {
	const env = getEnv();

	const BASE_URL = env.BASE_URL || defaults.BASE_URL || "http://localhost:3000";
	const MAX_VUS = toNumber(env.MAX_VUS ?? defaults.MAX_VUS, defaults.MAX_VUS ?? 50);

	const RAMP_STAGE_DURATION =
	env.RAMP_STAGE_DURATION || defaults.RAMP_STAGE_DURATION || "30s";
	const MAX_TEST_DURATION = env.MAX_TEST_DURATION || defaults.MAX_TEST_DURATION || "2m";

	const USERNAME = env.USERNAME || defaults.USERNAME || "john_doe";
	const PASSWORD = env.PASSWORD || defaults.PASSWORD || "password123";

	// Threshold variables (names preserved from your scripts)
	const p95variable = toNumber(env.P95 ?? defaults.p95variable, defaults.p95variable ?? 800);
	const p99variable = toNumber(env.P99 ?? defaults.p99variable, defaults.p99variable ?? 1200);
	const rateVariable = toNumber(env.RATE ?? defaults.rateVariable, defaults.rateVariable ?? 0.01);

	return {
		BASE_URL,
		MAX_VUS,
		RAMP_STAGE_DURATION,
		MAX_TEST_DURATION,
		USERNAME,
		PASSWORD,
		p95variable,
		p99variable,
		rateVariable,
	};
};

/**
 * Parse k6-style durations like: 500ms, 30s, 2m, 1h into seconds (number).
 * Supports: ms, s, m, h
 */
export const parseDurationToSeconds = (d) => {
	const str = String(d).trim();
	const match = str.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/i);
	if (!match) {
		// Safe fallback: treat as seconds if format is unexpected
		const asNum = Number(str);
		return Number.isFinite(asNum) ? asNum : 0;
	}
	const value = Number(match[1]);
	const unit = match[2].toLowerCase();

	if (unit === "ms") return value / 1000;
	if (unit === "s") return value;
	if (unit === "m") return value * 60;
	if (unit === "h") return value * 3600;
	return 0;
};

/**
 * Convert seconds to a k6 duration string (seconds precision).
 */
export const secondsToK6Duration = (sec) => {
	const s = Math.max(0, Math.floor(sec));
	return `${s}s`;
};

const buildRampingStages = ({ maxTestDuration, rampStageDuration, maxVUs }) => {
	const totalSec = parseDurationToSeconds(maxTestDuration);
	const rampMaxSec = parseDurationToSeconds(rampStageDuration);

	// Ensure ramp-up + ramp-down fit inside total duration
	const effectiveRampSec = Math.max(0, Math.min(rampMaxSec, totalSec / 2));
	const holdSec = Math.max(0, totalSec - 2 * effectiveRampSec);

	const stages = [];
	stages.push({ duration: secondsToK6Duration(effectiveRampSec), target: maxVUs });

	if (holdSec > 0) {
		stages.push({ duration: secondsToK6Duration(holdSec), target: maxVUs });
	}

	stages.push({ duration: secondsToK6Duration(effectiveRampSec), target: 0 });
	return stages;
};

/**
 * Load stages (ramping-vus): ramp up -> hold -> ramp down
 */
export const buildLoadStages = (args) => buildRampingStages(args);

/**
 * Spike stages (also ramping-vus): spike up -> hold -> spike down
 * Kept separate for semantic clarity in tests.
 */
export const buildSpikeStages = (args) => buildRampingStages(args);

/**
 * Thresholds (variable-driven). Abort on p95 or failure-rate breaches.
 */
export const buildK6Thresholds = ({ p95variable, p99variable, rateVariable }) => ({
	http_req_duration: [
		{ threshold: `p(95)<${p95variable}`, abortOnFail: true },
																				  `p(99)<${p99variable}`,
	],
	http_req_failed: [{ threshold: `rate<${rateVariable}`, abortOnFail: true }],
});

export const is2xxStatus = (status) => Math.floor(Number(status) / 100) === 2;

const safeJson = (res) => {
	try {
		return res.json();
	} catch (_) {
		return null;
	}
};

/**
 * Extract tripId from a generic SuccessResponse where `data` shape may vary.
 */
export const extractTripId = (json) =>
json?.data?.tripId ||
json?.data?.id ||
json?.data?.trip?.tripId ||
json?.data?.trip?.id ||
json?.data?.tripPlan?.tripId ||
json?.data?.tripPlan?.id ||
null;

/* --------------------------------------------------------------------------
 * FLOW HELPERS (ping, login, create/delete trip plan)
 * -------------------------------------------------------------------------- */

/**
 * GET /api/health
 *
 * @returns {{ res: any, ok: boolean }}
 */
export const k6PingHealth = ({ http, check, baseUrl }) => {
	const res = http.get(`${baseUrl}/api/health`, {
		headers: { Accept: "application/json" },
		tags: { name: "GET /api/health" },
	});

	check(res, {
		"Health status is 200": (r) => r.status === 200,
		  "Health status is 2xx": (r) => is2xxStatus(r.status),
	});

	return { res, ok: is2xxStatus(res.status) };
};

/**
 * PUT /api/user/login
 *
 * `labels` lets each test keep its exact check names.
 *
 * @returns {{ res:any, json:any, token:string|null, userId:string|null, ok:boolean }}
 */
export const k6Login = ({
	http,
	check,
	baseUrl,
	username,
	password,
	requireUserId = false,
	labels = {},
}) => {
	const res = http.put(
		`${baseUrl}/api/user/login`,
		JSON.stringify({ username, password }),
						 {
							 headers: { "Content-Type": "application/json", Accept: "application/json" },
							 tags: { name: "PUT /api/user/login" },
						 },
	);

	// Always include these (consistent across all tests)
	check(res, {
		"Login status is 200": (r) => r.status === 200,
		  "Login status is 2xx": (r) => is2xxStatus(r.status),
	});

	const json = safeJson(res);
	const token = json?.data?.token ?? null;

	const rawUserId = json?.data?.user?.userId;
	const userId = rawUserId !== null && rawUserId !== undefined ? String(rawUserId) : null;

	// Optional checks with caller-controlled labels
	const checks = {};

	if (labels.json) checks[labels.json] = () => json !== null;
	if (labels.success) checks[labels.success] = () => json?.success === true;
	if (labels.token) checks[labels.token] = () => typeof token === "string" && token.length > 20;

	if (requireUserId && labels.userId) {
		checks[labels.userId] = () => typeof userId === "string" && userId.length > 0;
	}

	if (labels.usernameMatches) {
		// If API doesn't return a username field, treat as non-fatal.
		checks[labels.usernameMatches] = () => {
			const returned = json?.data?.user?.username;
			return returned == null ? true : returned === username;
		};
	}

	if (Object.keys(checks).length > 0) {
		check(res, checks);
	}

	const ok =
	typeof token === "string" &&
	token.length > 20 &&
	(!requireUserId || (typeof userId === "string" && userId.length > 0));

	return { res, json, token: ok ? token : null, userId: ok ? userId : null, ok };
};

/**
 * POST /api/user/{userId}/tripPlan
 *
 * @returns {{ res:any, json:any, tripId:string|null, ok:boolean }}
 */
export const k6CreateTripPlan = ({ http, check, baseUrl, userId, token, payload }) => {
	const res = http.post(
		`${baseUrl}/api/user/${userId}/tripPlan`,
		JSON.stringify(payload),
						  {
							  headers: {
								  "Content-Type": "application/json",
								  Accept: "application/json",
								  Authorization: `Bearer ${token}`,
							  },
							  tags: { name: "POST /api/user/{userId}/tripPlan" },
						  },
	);

	const json = safeJson(res);
	const tripIdRaw = extractTripId(json);
	const tripId = tripIdRaw !== null && tripIdRaw !== undefined ? String(tripIdRaw) : null;

	check(res, {
		"Create status is 201": (r) => r.status === 201,
		  "Create status is 2xx": (r) => is2xxStatus(r.status),
		  "Create response is JSON": () => json !== null,
		  "Create success flag true": () => json?.success === true,
		  "TripId present": () => typeof tripId === "string" && tripId.length > 0,
	});

	const ok = is2xxStatus(res.status) && typeof tripId === "string" && tripId.length > 0;
	return { res, json, tripId: ok ? tripId : null, ok };
};

/**
 * DELETE /api/user/{userId}/tripPlan/{tripId}
 *
 * @returns {{ res:any, ok:boolean }}
 */
export const k6DeleteTripPlan = ({ http, check, baseUrl, userId, token, tripId }) => {
	const res = http.del(`${baseUrl}/api/user/${userId}/tripPlan/${tripId}`, null, {
		headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
		tags: { name: "DELETE /api/user/{userId}/tripPlan/{tripId}" },
	});

	check(res, {
		"Delete status is 200": (r) => r.status === 200,
		  "Delete status is 2xx": (r) => is2xxStatus(r.status),
	});

	return { res, ok: is2xxStatus(res.status) };
};

/**
 * Convenience: create then delete (requires token + userId).
 *
 * @returns {{ createOk:boolean, deleteOk:boolean, tripId:string|null }}
 */
export const k6CreateAndDeleteTripPlan = ({ http, check, baseUrl, userId, token, payload }) => {
	const created = k6CreateTripPlan({ http, check, baseUrl, userId, token, payload });
	if (!created.ok || !created.tripId) {
		return { createOk: false, deleteOk: false, tripId: null };
	}

	const deleted = k6DeleteTripPlan({ http, check, baseUrl, userId, token, tripId: created.tripId });
	return { createOk: true, deleteOk: deleted.ok, tripId: created.tripId };
};
