import http from 'k6/http';
import { check, sleep } from 'k6';

// ============================================
// CONFIGURABLE VARIABLES
// ============================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const MAX_VUS = __ENV.MAX_VUS || 100;
const RAMP_DURATION = __ENV.RAMP_DURATION || '2m';
const MAX_DURATION = __ENV.MAX_DURATION || '5m';
const USERNAME = __ENV.USERNAME || 'john_doe';
const PASSWORD = __ENV.PASSWORD || 'password123';
const P95_THRESHOLD = __ENV.P95_THRESHOLD || 500;
const P99_THRESHOLD = __ENV.P99_THRESHOLD || 1000;
const RATE_THRESHOLD = __ENV.RATE_THRESHOLD || 0.01;

// ============================================
// TEST OPTIONS
// ============================================
export const options = {
  stages: [
    { duration: RAMP_DURATION, target: MAX_VUS }, // Ramp up to max VUs
    { duration: MAX_DURATION, target: MAX_VUS },  // Stay at max VUs
    { duration: '1m', target: 0 },                // Ramp down to 0
  ],
  thresholds: {
    'http_req_duration': [
      { threshold: `p(95)<${P95_THRESHOLD}`, abortOnFail: true },
      `p(99)<${P99_THRESHOLD}`
    ],
    'http_req_failed': [
      { threshold: `rate<${RATE_THRESHOLD}`, abortOnFail: true }
    ],
  },
};

// ============================================
// MAIN TEST FUNCTION
// ============================================
export default function () {
  const apiUrl = `${BASE_URL}/api`;
  let token = '';
  let userId = '';
  let tripId = '';

  // ============================================
  // STEP 1: USER LOGIN
  // ============================================
  const loginPayload = JSON.stringify({
    username: USERNAME,
    password: PASSWORD
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginResp = http.put(`${apiUrl}/user/login`, loginPayload, loginParams);
  
  check(loginResp, {
    'Login: status is 200': (r) => r.status === 200,
    'Login: success is true': (r) => JSON.parse(r.body).success === true,
    'Login: token received': (r) => JSON.parse(r.body).data.token !== undefined,
  });

  // Extract token and userId from login response
  if (loginResp.status === 200) {
    const loginData = JSON.parse(loginResp.body);
    token = loginData.data.token;
    userId = loginData.data.user.userId;
  } else {
    console.error('Login failed, skipping subsequent requests');
    return;
  }

  // Small delay between requests
  sleep(Math.random() * 2);

  // ============================================
  // STEP 2: CREATE TRIP PLAN
  // ============================================
  const tripPayload = JSON.stringify({
    destination: "Barcelona, Spain",
    origin: "New York, USA",
    startDate: "2025-08-15",
    endDate: "2025-08-20",
    budget: 2500,
    purpose: "vacation",
    interests: ["architecture", "food", "beaches"],
    notes: "First time in Spain!"
  });

  const authParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const createTripResp = http.post(
    `${apiUrl}/user/${userId}/tripPlan`,
    tripPayload,
    authParams
  );

  check(createTripResp, {
    'Create Trip: status is 201': (r) => r.status === 201,
    'Create Trip: success is true': (r) => JSON.parse(r.body).success === true,
    'Create Trip: tripId received': (r) => JSON.parse(r.body).data.tripId !== undefined,
  });

  // Extract tripId from create response
  if (createTripResp.status === 201) {
    const createData = JSON.parse(createTripResp.body);
    tripId = createData.data.tripId;
  } else {
    console.error('Trip creation failed, skipping delete');
    return;
  }

  // Small delay between requests
  sleep(Math.random() * 2);

  // ============================================
  // STEP 3: DELETE TRIP PLAN
  // ============================================
  const deleteTripResp = http.del(
    `${apiUrl}/user/${userId}/tripPlan/${tripId}`,
    null,
    authParams
  );

  check(deleteTripResp, {
    'Delete Trip: status is 200': (r) => r.status === 200,
    'Delete Trip: success is true': (r) => JSON.parse(r.body).success === true,
  });

  // Random sleep to simulate user think time
  sleep(Math.random() * 3);
}