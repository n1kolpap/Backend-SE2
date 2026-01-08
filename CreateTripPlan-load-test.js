import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'],    // Less than 10% of requests should fail
    errors: ['rate<0.1'],              // Less than 10% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

// Test data generators
function generateRandomDestination() {
  const destinations = [
    'Barcelona, Spain',
    'Tokyo, Japan',
    'Paris, France',
    'New York, USA',
    'London, UK',
    'Rome, Italy',
    'Dubai, UAE',
    'Sydney, Australia',
    'Bangkok, Thailand',
    'Istanbul, Turkey'
  ];
  return destinations[Math.floor(Math.random() * destinations.length)];
}

function generateRandomOrigin() {
  const origins = [
    'Los Angeles, USA',
    'Chicago, USA',
    'Boston, USA',
    'Miami, USA',
    'Seattle, USA',
    'Toronto, Canada',
    'Vancouver, Canada',
    'Berlin, Germany',
    'Amsterdam, Netherlands',
    'Singapore'
  ];
  return origins[Math.floor(Math.random() * origins.length)];
}

function generateRandomDates() {
  const start = new Date();
  start.setDate(start.getDate() + Math.floor(Math.random() * 60) + 30); // 30-90 days from now
  
  const end = new Date(start);
  end.setDate(end.getDate() + Math.floor(Math.random() * 10) + 3); // 3-13 days trip
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

function generateRandomInterests() {
  const allInterests = [
    'architecture', 'food', 'beaches', 'museums', 'nightlife',
    'shopping', 'nature', 'history', 'adventure', 'culture'
  ];
  
  const numInterests = Math.floor(Math.random() * 4) + 2; // 2-5 interests
  const shuffled = allInterests.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numInterests);
}

// Login and get token
function login() {
  const loginPayload = JSON.stringify({
    username: 'john_doe',
    password: 'password123'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.put(`${BASE_URL}/user/login`, loginPayload, params);
  
  const loginSuccess = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.token;
      } catch (e) {
        return false;
      }
    },
  });

  if (!loginSuccess) {
    errorRate.add(1);
    console.error('Login failed:', response.status, response.body);
    return null;
  }

  try {
    const body = JSON.parse(response.body);
    return {
      token: body.data.token,
      userId: body.data.user.userId
    };
  } catch (e) {
    errorRate.add(1);
    console.error('Failed to parse login response:', e);
    return null;
  }
}

// Create trip plan
function createTripPlan(token, userId) {
  const dates = generateRandomDates();
  
  const tripPayload = JSON.stringify({
    destination: generateRandomDestination(),
    origin: generateRandomOrigin(),
    startDate: dates.startDate,
    endDate: dates.endDate,
    budget: Math.floor(Math.random() * 5000) + 1000, // $1000-$6000
    purpose: ['vacation', 'business', 'adventure'][Math.floor(Math.random() * 3)],
    interests: generateRandomInterests(),
    notes: `Load test trip created at ${new Date().toISOString()}`
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  };

  const response = http.post(
    `${BASE_URL}/user/${userId}/tripPlan`,
    tripPayload,
    params
  );

  const createSuccess = check(response, {
    'create trip status is 201': (r) => r.status === 201,
    'create trip returns tripId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.tripId;
      } catch (e) {
        return false;
      }
    },
    'create trip response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!createSuccess) {
    errorRate.add(1);
    console.error('Create trip failed:', response.status, response.body);
    return null;
  }

  try {
    const body = JSON.parse(response.body);
    return body.data.tripId;
  } catch (e) {
    errorRate.add(1);
    console.error('Failed to parse create trip response:', e);
    return null;
  }
}

// Delete trip plan
function deleteTripPlan(token, userId, tripId) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`
    },
  };

  const response = http.del(
    `${BASE_URL}/user/${userId}/tripPlan/${tripId}`,
    null,
    params
  );

  const deleteSuccess = check(response, {
    'delete trip status is 200': (r) => r.status === 200,
    'delete trip confirms deletion': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
    'delete trip response time < 300ms': (r) => r.timings.duration < 300,
  });

  if (!deleteSuccess) {
    errorRate.add(1);
    console.error('Delete trip failed:', response.status, response.body);
  }

  return deleteSuccess;
}

// Main test scenario
export default function () {
  // Step 1: Login
  const credentials = login();
  
  if (!credentials) {
    console.error('Failed to login, skipping iteration');
    sleep(1);
    return;
  }

  sleep(1); // Wait 1 second between login and create

  // Step 2: Create trip plan
  const tripId = createTripPlan(credentials.token, credentials.userId);
  
  if (!tripId) {
    console.error('Failed to create trip, skipping delete');
    sleep(1);
    return;
  }

  sleep(2); // Wait 2 seconds between create and delete

  // Step 3: Delete trip plan
  deleteTripPlan(credentials.token, credentials.userId, tripId);

  sleep(1); // Wait before next iteration
}

// Setup function (runs once before test)
export function setup() {
  console.log('Starting TripTrail load test...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('Test scenario: Login → Create Trip → Delete Trip');
}

// Teardown function (runs once after test)
export function teardown(data) {
  console.log('Load test completed!');
}