/**
 * k6 Spike test: Login (TripTrail)
 *
 * Style: same as your load-test template (no extra login fixes, no RATE parsing tweaks).
 *
 * Spike behavior:
 * - Start VUs at 0
 * - Spike up quickly to MAX_VUS
 * - Hold briefly at MAX_VUS
 * - Spike down quickly back to 0
 *
 * Default route (per README):
 * - PUT /api/user/login
 *
 * Run:
 *   k6 run spike_login.test.js
 *
 * Override via env vars:
 *   BASE_URL=http://localhost:3000 \
 *   MAX_VUS=200 \
 *   RAMP_STAGE_DURATION=10s \
 *   MAX_TEST_DURATION=45s \
 *   USERNAME=john_doe \
 *   PASSWORD=password123 \
 *   P95=800 \
 *   P99=1200 \
 *   RATE=0.01 \
 *   k6 run spike_login.test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";

/* -----------------------------
 * Tunable variables (env-driven)
 * ----------------------------- */
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const MAX_VUS = Number(__ENV.MAX_VUS || 50);

// “Max duration during a ramping stage”
const RAMP_STAGE_DURATION = __ENV.RAMP_STAGE_DURATION || "10s";

// “Max duration of whole test”
const MAX_TEST_DURATION = __ENV.MAX_TEST_DURATION || "45s";

// Credentials (README defaults)
const USERNAME = __ENV.USERNAME || "john_doe";
const PASSWORD = __ENV.PASSWORD || "password123";

// Threshold variables
const p95variable = Number(__ENV.P95 || 800); // ms
const p99variable = Number(__ENV.P99 || 1200); // ms
const rateVariable = Number(__ENV.RATE || 0.01); // fraction, e.g. 0.01 = 1%

/* -----------------------------
 * Duration helpers
 * ----------------------------- */

/**
 * Parse k6-style durations like: 500ms, 30s, 2m, 1h into seconds (number).
 * Supports: ms, s, m, h
 */
function parseDurationToSeconds(d) {
	const str = String(d).trim();
	const match = str.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/i);
	if (!match) {
		// Safe fallback: treat as seconds if the format is unexpected
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
}

/**
 * Convert seconds to a k6 duration string (seconds precision).
 */
function secondsToK6Duration(sec) {
	const s = Math.max(0, Math.floor(sec));
	return `${s}s`;
}

/**
 * Build stages for a spike test while keeping:
 * - ramp stage durations bounded by RAMP_STAGE_DURATION
 * - total duration bounded by MAX_TEST_DURATION
 *
 * Stages:
 *  1) spike up: 0 -> MAX_VUS
 *  2) hold: MAX_VUS
 *  3) spike down: MAX_VUS -> 0
 */
function buildSpikeStages() {
	const totalSec = parseDurationToSeconds(MAX_TEST_DURATION);
	const rampMaxSec = parseDurationToSeconds(RAMP_STAGE_DURATION);

	// Use the stage cap for up/down, but ensure they fit in total duration.
	const spikeRampSec = Math.max(0, Math.min(rampMaxSec, totalSec / 2));
	const holdSec = Math.max(0, totalSec - 2 * spikeRampSec);

	const stages = [];

	// Spike up
	stages.push({ duration: secondsToK6Duration(spikeRampSec), target: MAX_VUS });

	// Hold at peak (only if > 0)
	if (holdSec > 0) {
		stages.push({ duration: secondsToK6Duration(holdSec), target: MAX_VUS });
	}

	// Spike down
	stages.push({ duration: secondsToK6Duration(spikeRampSec), target: 0 });

	return stages;
}

/* -----------------------------
 * k6 options
 * ----------------------------- */
export const options = {
	scenarios: {
		login_spike: {
			executor: "ramping-vus",
			startVUs: 0, // required: Start VUs should be 0
			stages: buildSpikeStages(),
			gracefulRampDown: "30s",
		},
	},

	// Thresholds (variable-driven). Abort on p95 or failure-rate breaches.
	thresholds: {
		http_req_duration: [
			{ threshold: `p(95)<${p95variable}`, abortOnFail: true },
			`p(99)<${p99variable}`,
		],
		http_req_failed: [{ threshold: `rate<${rateVariable}`, abortOnFail: true }],
	},
};

/* -----------------------------
 * VU iteration: perform login
 * ----------------------------- */
export default function () {
	const url = `${BASE_URL}/api/user/login`;

	const payload = JSON.stringify({
		username: USERNAME,
		password: PASSWORD,
	});

	const params = {
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		tags: { name: "PUT /api/user/login" },
	};

	const res = http.put(url, payload, params);

	// Status checks (useful during spike to see failure patterns quickly)
	check(res, {
		"Login status is 200": (r) => r.status === 200,
		  "Login status is 2xx": (r) => Math.floor(r.status / 100) === 2,
	});

	// Basic response-shape checks (expects JSON + token when successful)
	let json = null;
	try {
		json = res.json();
	} catch (_) {
		// Keep json as null; check below will fail, which is what we want.
	}

	const token = json?.data?.token;

	check(res, {
		"Response is JSON": () => json !== null,
		  "Success flag true": () => json?.success === true,
		  "Token present": () => typeof token === "string" && token.length > 20,
		  "Username matches": () => json?.data?.user?.username === USERNAME,
	});

	// Randomized think time to avoid unrealistically synchronized traffic
	sleep(Math.random() * 5);
}
