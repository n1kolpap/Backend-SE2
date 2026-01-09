/* ============================================================================
 * helpers-k6.js
 *
 * Shared helpers for k6 scripts under ./tests/k6/
 *
 * Design goals:
 * - Pure JS (no imports from "k6") so this file remains Node-safe.
 * - Works in k6 (global __ENV) and in Node contexts (process.env) without throwing.
 * - Centralizes env config, stages, thresholds, and common request flows.
 *
 * ---------------------------------------------------------------------------
 * STAGE & DURATION PLANNING (read this before tuning tests)
 * ---------------------------------------------------------------------------
 *
 * k6 "ramping-vus" executor drives *active* Virtual Users (VUs) over time using
 * an array of stages:
 *   [{ duration: "10s", target: 100 }, ...]
 *
 * For each stage, k6 will ramp the number of active VUs from the current VU
 * count to the stage's `target` over `duration`.
 *
 * Important details:
 * - Ramping is conceptually linear, but k6 adjusts VUs in discrete steps
 *   internally (you should treat it as "approximately linear").
 * - `startVUs: 0` means the test begins with 0 active VUs.
 *
 * ---------------------------------------------------------------------------
 * How buildLoadStages() / buildSpikeStages() allocate time
 * ---------------------------------------------------------------------------
 *
 * These helpers use the same allocation model:
 *   totalSec   = parseDurationToSeconds(MAX_TEST_DURATION)
 *   rampMaxSec = parseDurationToSeconds(RAMP_STAGE_DURATION)
 *
 * They build: ramp-up -> hold -> ramp-down
 * while enforcing: ramp-up + ramp-down <= total duration.
 *
 * Math used:
 *   effectiveRampSec = min(rampMaxSec, totalSec / 2)
 *   holdSec          = totalSec - 2 * effectiveRampSec
 *
 * Resulting stages:
 *   1) { duration: effectiveRampSec, target: MAX_VUS }
 *   2) { duration: holdSec,          target: MAX_VUS }   (only if holdSec > 0)
 *   3) { duration: effectiveRampSec, target: 0 }
 *
 * Examples:
 * - total=45s, rampCap=10s  => up=10s, hold=25s, down=10s
 * - total=12s, rampCap=10s  => up=6s,  hold=0s,  down=6s
 *
 * ---------------------------------------------------------------------------
 * How buildMultiSpikeStages() relates to total test duration
 * ---------------------------------------------------------------------------
 *
 * buildMultiSpikeStages() is different: it does NOT auto-fit to MAX_TEST_DURATION.
 * Instead, you specify a "spike shape" and repeat it N times.
 *
 * One spike takes:
 *   spikeDuration = rampUp + hold + rampDown
 * Between spikes, optional rest at 0 VUs:
 *   restDuration  = rest (applied between spikes, not after the last spike)
 *
 * Total duration for `spikes` spikes:
 *   total = spikes * (rampUp + hold + rampDown) + (spikes - 1) * rest
 *
 * Planning guidance:
 * - Choose spike shape first (rampUp/hold/rampDown), then compute total duration.
 * - Or choose a target MAX_TEST_DURATION, then solve for hold/rest values.
 *
 * ---------------------------------------------------------------------------
 * Quick rules of thumb for stage tuning
 * ---------------------------------------------------------------------------
 *
 * - "Spike" tests: rampUp small (2–10s), short holds (5–20s), fast rampDown (2–10s).
 * - "Load" tests: rampUp moderate (30–120s), long holds (minutes+), rampDown moderate.
 * - If you care about autoscaling / cache warmup, include rest at 0 between spikes.
 * - If you care about sustained capacity, emphasize a longer hold phase.
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
  const MAX_TEST_DURATION =
  env.MAX_TEST_DURATION || defaults.MAX_TEST_DURATION || "2m";

  const USERNAME = env.USERNAME || defaults.USERNAME || "john_doe";
  const PASSWORD = env.PASSWORD || defaults.PASSWORD || "password123";

  // Threshold variables (names preserved from your scripts)
  const p95variable = toNumber(
    env.P95 ?? defaults.p95variable,
    defaults.p95variable ?? 800
  );
  const p99variable = toNumber(
    env.P99 ?? defaults.p99variable,
    defaults.p99variable ?? 1200
  );
  const rateVariable = toNumber(
    env.RATE ?? defaults.rateVariable,
    defaults.rateVariable ?? 0.01
  );

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
 * Parse k6-style durations like:
 *   - "500ms", "2s", "3m", "1h"
 * into seconds as a number.
 *
 * Why this exists:
 * - Our stage planners do math in seconds, then convert back to k6 duration strings.
 *
 * Notes:
 * - If the format is unexpected, we fall back to Number(str) and treat it as seconds.
 * - Returned value is a number (can be fractional if "ms" is used).
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

/**
 * Internal stage builder used by both "load" and "spike" helpers.
 *
 * Allocation model:
 * - We take the "cap" for a ramp stage (rampStageDuration).
 * - If the test is too short to fit ramp up + ramp down at that cap,
 *   we shrink both ramps equally so the total fits.
 *
 * This guarantees:
 * - Total stage time <= maxTestDuration (bounded)
 * - Ramps are symmetric (up time == down time)
 *
 * If you need:
 * - asymmetric ramps (fast up, slow down), or
 * - multiple spikes fitted inside MAX_TEST_DURATION
 * then do NOT use buildSpikeStages(); use buildMultiSpikeStages() instead.
 */
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

/**
 * Build multiple spikes (repeated up/hold/down patterns) within a single test.
 *
 * @param {object} args
 * @param {number} args.maxVUs - peak VUs for each spike
 * @param {number} args.spikes - how many spikes to run
 * @param {string} args.rampUp - duration for ramp up (e.g. "5s")
 * @param {string} args.hold - duration to hold at peak (e.g. "10s")
 * @param {string} args.rampDown - duration for ramp down (e.g. "5s")
 * @param {string} [args.rest="0s"] - rest at 0 VUs between spikes (e.g. "10s")
 * @returns {Array<{duration:string,target:number}>} k6 stages
 */
export const buildMultiSpikeStages = ({
  maxVUs,
  spikes,
  rampUp,
  hold,
  rampDown,
  rest = "0s",
}) => {
  const stages = [];

  for (let i = 0; i < spikes; i += 1) {
    // Spike up
    stages.push({ duration: rampUp, target: maxVUs });

    // Hold at peak
    if (hold !== "0s") {
      stages.push({ duration: hold, target: maxVUs });
    }

    // Spike down
    stages.push({ duration: rampDown, target: 0 });

    // Rest at 0 between spikes (except after the last one)
    if (rest !== "0s" && i < spikes - 1) {
      stages.push({ duration: rest, target: 0 });
    }
  }

  return stages;
};

/* --------------------------------------------------------------------------
 * FLOW HELPERS: what they guarantee / what they do NOT
 * --------------------------------------------------------------------------
 *
 * - k6PingHealth(): best-effort visibility. It DOES NOT abort the iteration by itself.
 *   Your test can decide to early-return if health fails (recommended for noisy CI).
 *
 * - k6Login(): executes login request + checks.
 *   It returns { ok, token, userId }. When ok=false, token/userId are null.
 *   The "labels" map controls the exact check names emitted in k6 output.
 *
 * - k6CreateTripPlan(): requires token + userId (caller responsibility).
 *   It checks for status 201 and extracts tripId from common JSON shapes.
 *
 * - k6DeleteTripPlan(): requires token + userId + tripId (caller responsibility).
 *
 * - k6CreateAndDeleteTripPlan(): convenience wrapper; if create fails, delete is skipped.
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
                       }
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
                        }
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

  const deleted = k6DeleteTripPlan({
    http,
    check,
    baseUrl,
    userId,
    token,
    tripId: created.tripId,
  });

  return { createOk: true, deleteOk: deleted.ok, tripId: created.tripId };
};
