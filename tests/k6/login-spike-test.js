/**
 * k6 Spike test: Health ping + Login (TripTrail)
 *
 * Spike behavior:
 * - Start VUs at 0
 * - Spike up quickly to MAX_VUS
 * - Hold briefly at MAX_VUS
 * - Spike down quickly back to 0
 *
 * Flow per VU iteration (in this exact order):
 *  1) Ping health endpoint (GET /api/health)
 *  2) Log in (PUT /api/user/login)
 */

import http from "k6/http";
import { sleep } from "k6";
import {
	getK6Config,
	buildSpikeStages,
	buildK6Thresholds,
	k6PingHealth,
	k6Login,
} from "../../utils/helpers-k6.js";

/* -----------------------------
 * Config (env-driven)
 * ----------------------------- */
const cfg = getK6Config({
	MAX_VUS: 2048,
	RAMP_STAGE_DURATION: "10s",
	MAX_TEST_DURATION: "45s",
});

const {
	BASE_URL,
	MAX_VUS,
	RAMP_STAGE_DURATION,
	MAX_TEST_DURATION,
	USERNAME,
	PASSWORD,
	p95variable,
	p99variable,
	rateVariable,
} = cfg;

/* -----------------------------
 * k6 options
 * ----------------------------- */
export const options = {
	scenarios: {
		login_spike: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: buildSpikeStages({
				maxTestDuration: MAX_TEST_DURATION,
				rampStageDuration: RAMP_STAGE_DURATION,
				maxVUs: MAX_VUS,
			}),
			gracefulRampDown: "30s",
		},
	},
	thresholds: buildK6Thresholds({ p95variable, p99variable, rateVariable }),
};

/* -----------------------------
 * VU iteration: health ping -> login
 * ----------------------------- */
export default function () {
	/* 0) HEALTH PING */
	k6PingHealth({ http, check, baseUrl: BASE_URL });

	/* 1) LOGIN */
	k6Login({
		http,
		check,
		baseUrl: BASE_URL,
		username: USERNAME,
		password: PASSWORD,
		requireUserId: false,
		labels: {
			json: "Response is JSON",
			success: "Success flag true",
			token: "Token present",
			usernameMatches: "Username matches",
		},
	});

	sleep(Math.random() * 5);
}
