/**
 * k6 Load test: Login -> Create Trip Plan -> Delete Trip Plan (TripTrail)
 *
 * Flow per VU iteration (in this exact order):
 *  1) A user logs in
 *  2) Creates a new trip plan (with the JSON provided below)
 *  3) Deletes that trip plan
 */

import http from "k6/http";
import { check, sleep } from "k6";
import {
  getK6Config,
  buildLoadStages,
  buildK6Thresholds,
  k6Login,
  k6CreateAndDeleteTripPlan,
} from "../../utils/helpers-k6.js";

/* -----------------------------
 * Config (env-driven)
 * ----------------------------- */
const cfg = getK6Config({
  MAX_VUS: 384,
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
 * Request payloads
 * ----------------------------- */
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
 * k6 options
 * ----------------------------- */
export const options = {
  scenarios: {
    tripplan_load: {
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
 * VU iteration: Login -> Create -> Delete
 * ----------------------------- */
export default function () {
  /* 1) LOGIN */
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
      // (Intentionally no "Username matches" here to keep parity with your existing trip-plan scripts)
    },
  });

  // If login failed, stop this iteration (no create/delete without auth).
  if (!login.ok || !login.token || !login.userId) {
    sleep(Math.random() * 5);
    return;
  }

  /* 2) CREATE -> 3) DELETE */
  k6CreateAndDeleteTripPlan({
    http,
    check,
    baseUrl: BASE_URL,
    userId: login.userId,
    token: login.token,
    payload: TRIP_PLAN_CREATE_PAYLOAD,
  });

  sleep(Math.random() * 5);
}
