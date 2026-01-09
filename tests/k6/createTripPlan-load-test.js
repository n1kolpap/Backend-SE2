/**
 * k6 Load test: Login -> Create Trip Plan -> Delete Trip Plan (TripTrail)
 *
 * Fix applied:
 * - Removed `maxDuration` (your k6 version does not recognize it).
 * - Still enforces a “whole test max duration” by *constructing stages* so that:
 *     total ≈ MAX_TEST_DURATION
 *
 * Flow per VU iteration (in this exact order):
 *  1) A user logs in
 *  2) Creates a new trip plan (with the JSON provided below)
 *  3) Deletes that trip plan
 *
 * Default routes (per triptrail.yaml / README):
 * - PUT    /api/user/login
 * - POST   /api/user/{userId}/tripPlan
 * - DELETE /api/user/{userId}/tripPlan/{tripId}
 *
 * Run:
 *   k6 run load_tripplan_flow.test.js
 *
 * Override via env vars:
 *   BASE_URL=http://localhost:3000 \
 *   MAX_VUS=50 \
 *   RAMP_STAGE_DURATION=30s \
 *   MAX_TEST_DURATION=2m \
 *   USERNAME=john_doe \
 *   PASSWORD=password123 \
 *   P95=800 \
 *   P99=1200 \
 *   RATE=0.01 \
 *   k6 run load_tripplan_flow.test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";

/* -----------------------------
 * Tunable variables (env-driven)
 * ----------------------------- */
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const MAX_VUS = Number(__ENV.MAX_VUS || 384);

// “Max duration during a ramping stage”
const RAMP_STAGE_DURATION = __ENV.RAMP_STAGE_DURATION || "30s";

// “Max duration of whole test”
const MAX_TEST_DURATION = __ENV.MAX_TEST_DURATION || "2m";

// Credentials (README defaults)
const USERNAME = __ENV.USERNAME || "john_doe";
const PASSWORD = __ENV.PASSWORD || "password123";

// Threshold variables
const p95variable = Number(__ENV.P95 || 800); // ms
const p99variable = Number(__ENV.P99 || 1200); // ms
const rateVariable = Number(__ENV.RATE || 0.01); // fraction, e.g. 0.01 = 1%

/* -----------------------------
 * Request payloads
 * ----------------------------- */

// Trip plan JSON (exactly as provided)
const TRIP_PLAN_CREATE_PAYLOAD = {
  destination: "Barcelona, Spain",
  origin: "New York, USA",
  startDate: "2025-08-15",
  endDate: "2025-08-20",
  budget: 2500,
  purpose: "vacation",
  interests: ["architecture", "food", "beaches"],
  notes: "First time in Spain!",
};

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
 * Build stages so total test duration is bounded by MAX_TEST_DURATION,
 * while ramp stage duration is bounded by RAMP_STAGE_DURATION.
 *
 * Stages:
 *  1) ramp up: 0 -> MAX_VUS
 *  2) hold: MAX_VUS
 *  3) ramp down: MAX_VUS -> 0
 */
function buildStages() {
  const totalSec = parseDurationToSeconds(MAX_TEST_DURATION);
  const rampMaxSec = parseDurationToSeconds(RAMP_STAGE_DURATION);

  // Ensure the two ramp stages do not exceed the whole test duration.
  const effectiveRampSec = Math.max(0, Math.min(rampMaxSec, totalSec / 2));
  const holdSec = Math.max(0, totalSec - 2 * effectiveRampSec);

  const stages = [];

  // Ramp up
  stages.push({ duration: secondsToK6Duration(effectiveRampSec), target: MAX_VUS });

  // Hold (only if > 0)
  if (holdSec > 0) {
    stages.push({ duration: secondsToK6Duration(holdSec), target: MAX_VUS });
  }

  // Ramp down
  stages.push({ duration: secondsToK6Duration(effectiveRampSec), target: 0 });

  return stages;
}

/* -----------------------------
 * Helpers
 * ----------------------------- */

/**
 * Extract tripId from a generic SuccessResponse where `data` shape may vary.
 * Tries common shapes used in implementations.
 */
function extractTripId(json) {
  return (
    json?.data?.tripId ||
    json?.data?.id ||
    json?.data?.trip?.tripId ||
    json?.data?.trip?.id ||
    json?.data?.tripPlan?.tripId ||
    json?.data?.tripPlan?.id ||
    null
  );
}

/* -----------------------------
 * k6 options
 * ----------------------------- */
export const options = {
  scenarios: {
    tripplan_load: {
      executor: "ramping-vus",
      startVUs: 0, // required: Start VUs should be 0
      stages: buildStages(),
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
 * VU iteration: Login -> Create -> Delete
 * ----------------------------- */
export default function () {
  /* -----------------------------
   * 1) LOGIN
   * ----------------------------- */
  const loginUrl = `${BASE_URL}/api/user/login`;

  const loginPayload = JSON.stringify({
    username: USERNAME,
    password: PASSWORD,
  });

  const loginRes = http.put(loginUrl, loginPayload, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    tags: { name: "PUT /api/user/login" },
  });

  // Parse login JSON (if any)
  let loginJson = null;
  try {
    loginJson = loginRes.json();
  } catch (_) {
    // Keep null; JSON check below will fail (as intended).
  }

  const token = loginJson?.data?.token;
  const userId = loginJson?.data?.user?.userId;

  check(loginRes, {
    "Login status is 200": (r) => r.status === 200,
        "Login status is 2xx": (r) => Math.floor(r.status / 100) === 2,
        "Login response is JSON": () => loginJson !== null,
        "Login success flag true": () => loginJson?.success === true,
        "JWT token present": () => typeof token === "string" && token.length > 20,
        "UserId present": () => typeof userId === "string" && userId.length > 0,
  });

  // If login failed, stop this iteration (no create/delete without auth).
  if (!(typeof token === "string" && token.length > 20 && typeof userId === "string" && userId.length > 0)) {
    sleep(Math.random() * 5);
    return;
  }

  /* -----------------------------
   * 2) CREATE TRIP PLAN
   * ----------------------------- */
  const createUrl = `${BASE_URL}/api/user/${userId}/tripPlan`;
  const createPayload = JSON.stringify(TRIP_PLAN_CREATE_PAYLOAD);

  const createRes = http.post(createUrl, createPayload, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    tags: { name: "POST /api/user/{userId}/tripPlan" },
  });

  // Parse create JSON (if any)
  let createJson = null;
  try {
    createJson = createRes.json();
  } catch (_) {
    // Keep null; JSON check below will fail (as intended).
  }

  const tripIdRaw = extractTripId(createJson);
  const tripId = tripIdRaw !== null && tripIdRaw !== undefined ? String(tripIdRaw) : null;

  check(createRes, {
    "Create status is 201": (r) => r.status === 201,
        "Create status is 2xx": (r) => Math.floor(r.status / 100) === 2,
        "Create response is JSON": () => createJson !== null,
        "Create success flag true": () => createJson?.success === true,
        "TripId present": () => typeof tripId === "string" && tripId.length > 0,
  });

  // If we can't identify tripId, we cannot delete it reliably.
  if (!(typeof tripId === "string" && tripId.length > 0)) {
    sleep(Math.random() * 5);
    return;
  }

  /* -----------------------------
   * 3) DELETE TRIP PLAN
   * ----------------------------- */
  const deleteUrl = `${BASE_URL}/api/user/${userId}/tripPlan/${tripId}`;

  const deleteRes = http.del(deleteUrl, null, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    tags: { name: "DELETE /api/user/{userId}/tripPlan/{tripId}" },
  });

  check(deleteRes, {
    "Delete status is 200": (r) => r.status === 200,
        "Delete status is 2xx": (r) => Math.floor(r.status / 100) === 2,
  });

  // Randomized think time to avoid unrealistically synchronized traffic
  sleep(Math.random() * 5);
}
