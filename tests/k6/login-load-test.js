/**
 * k6 Load test: Health ping + Login (TripTrail)
 *
 * Flow per VU iteration (in this exact order):
 *  1) Ping health endpoint (GET /api/health)
 *  2) Log in (PUT /api/user/login)
 */

import http from "k6/http";
import { sleep } from "k6";
import {
	getK6Config,
	buildLoadStages,
	buildK6Thresholds,
	k6PingHealth,
	k6Login,
} from "../../utils/helpers-k6.js";

/* -----------------------------
 * Config (env-driven)
 * ----------------------------- */
const cfg = getK6Config({
	MAX_VUS: 3072,
	RAMP_STAGE_DURATION: "30s",
	MAX_TEST_DURATION: "2m",
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
		login_load: {
			executor: "ramping-vus",
			startVUs: 0,
			stages: buildLoadStages({
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
