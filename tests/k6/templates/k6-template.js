/**
 * k6 TEMPLATE (TripTrail)
 *
 * Place templates under ./tests/k6/templates/ so CI (tests/k6/*.js) does NOT run them.
 *
 * How to use:
 * 1) Copy this file to ./tests/k6/<your-test-name>.js
 * 2) Edit:
 *    - scenario name
 *    - defaults for MAX_VUS / durations
 *    - flow steps inside default()
 *
 * Run:
 *   k6 run tests/k6/<your-test-name>.js
 */

 import http from "k6/http";
 import { check, sleep } from "k6";
 import {
	 getK6Config,
	 buildLoadStages,
	 buildSpikeStages,
	 buildK6Thresholds,
	 k6PingHealth,
	 k6Login,
	 // k6CreateTripPlan,
	 // k6DeleteTripPlan,
	 // k6CreateAndDeleteTripPlan,
 } from "../../utils/helpers-k6.js";

 /* -----------------------------
  * Choose your test shape
  * ----------------------------- *
  * Option A: hardcode kind in the file (recommended for clarity)
  */
 const TEST_KIND = "load"; // "load" | "spike"

 /* -----------------------------
  * Config (env-driven with per-test defaults)
  * ----------------------------- */
 const cfg = getK6Config({
	 MAX_VUS: 50,
	 RAMP_STAGE_DURATION: TEST_KIND === "spike" ? "10s" : "30s",
	 MAX_TEST_DURATION: TEST_KIND === "spike" ? "45s" : "2m",
	 // USERNAME / PASSWORD / thresholds have global defaults, override if needed:
	 // USERNAME: "john_doe",
	 // PASSWORD: "password123",
	 // p95variable: 800,
	 // p99variable: 1200,
	 // rateVariable: 0.01,
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
  * Stages builder (load vs spike)
  * ----------------------------- */
 const stages =
 TEST_KIND === "spike"
 ? buildSpikeStages({ maxTestDuration: MAX_TEST_DURATION, rampStageDuration: RAMP_STAGE_DURATION, maxVUs: MAX_VUS })
 : buildLoadStages({ maxTestDuration: MAX_TEST_DURATION, rampStageDuration: RAMP_STAGE_DURATION, maxVUs: MAX_VUS });

 /* -----------------------------
  * k6 options
  * ----------------------------- */
 export const options = {
	 scenarios: {
		 // Rename this scenario per test
		 template_scenario: {
			 executor: "ramping-vus",
			 startVUs: 0,
			 stages,
			 gracefulRampDown: "30s",
		 },
	 },
	 thresholds: buildK6Thresholds({ p95variable, p99variable, rateVariable }),
 };

 /* -----------------------------
  * VU iteration: fill your flow here
  * ----------------------------- */
 export default function () {
	 /**
	  * Optional: health check before doing anything else
	  * (useful for quick visibility when the API is down)
	  */
	 k6PingHealth({ http, check, baseUrl: BASE_URL });

	 /**
	  * Example: login
	  * - Set requireUserId true if you need userId for downstream routes
	  * - labels preserve your preferred check names
	  */
	 const login = k6Login({
		 http,
		 check,
		 baseUrl: BASE_URL,
		 username: USERNAME,
		 password: PASSWORD,
		 requireUserId: true,
		 labels: {
			 json: "Login response is JSON",
			 success: "Login success flag true",
			 token: "JWT token present",
			 userId: "UserId present",
		 },
	 });

	 if (!login.ok) {
		 // If auth fails, stop early to avoid noisy downstream failures.
		 sleep(Math.random() * 5);
		 return;
	 }

	 /**
	  * TODO: Add your request steps here.
	  * Example:
	  *   const payload = {...}
	  *   k6CreateAndDeleteTripPlan({ http, check, baseUrl: BASE_URL, userId: login.userId, token: login.token, payload })
	  */

	 sleep(Math.random() * 5);
 }
