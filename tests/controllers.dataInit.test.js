/**
 * Unit tests for dataInit.js (initializeMockData)
 *
 * Fix vs previous version:
 * - AVA forbids t.teardown() inside hooks, so we restore console.log in
 *   test.afterEach.always() instead.
 *
 * What we test:
 * 1) If User.countDocuments().exec() returns 0:
 *    - creates 2 users
 *    - creates 2 trip plans
 *    - assigns tripPlans array to each user with the created trip plan _id
 *    - saves both users
 *    - logs "Initialized mock users and trip plans"
 * 2) If users already exist (count > 0):
 *    - does nothing (no create, no save, no log)
 *
 * IMPORTANT:
 * - Adjust MODULE_ID to match the actual path of your dataInit.js from tests/.
 */

import test from "ava";
import esmock from "esmock";

const MODULE_ID = "../controllers/dataInit.js"; // <-- CHANGE if needed

// We store/restore console.log globally for each test file.
let originalConsoleLog = console.log;

test.before(() => {
  originalConsoleLog = console.log;
});

test.afterEach.always(() => {
  // Ensure console.log is always restored even if a test fails
  console.log = originalConsoleLog;
});

test.before(async (t) => {
  /**
   * Shared mutable state used by our mocks.
   * Each test will reset these values in beforeEach.
   */
  const state = {
    userCount: 0,
    createdUsers: [],
    createdTripPlans: [],
  };

  /**
   * Track all calls so we can assert controller logic precisely.
   */
  const calls = {
    user_countDocuments: 0,
    user_exec: 0,
    user_create: [],
    trip_create: [],
    console_log: [],
  };

  /**
   * Mock User model:
   * - countDocuments().exec()
   * - create()
   */
  const UserMock = {
    countDocuments: () => {
      calls.user_countDocuments += 1;
      return {
        exec: async () => {
          calls.user_exec += 1;
          return state.userCount;
        },
      };
    },

    create: async (doc) => {
      calls.user_create.push([doc]);

      // Return the next "prepared" user instance from state.createdUsers
      const idx = calls.user_create.length - 1;
      const next = state.createdUsers[idx];
      if (!next) throw new Error("Test misconfigured: too many User.create calls");
      return next;
    },
  };

  /**
   * Mock TripPlan model:
   * - create()
   */
  const TripPlanMock = {
    create: async (doc) => {
      calls.trip_create.push([doc]);

      const idx = calls.trip_create.length - 1;
      const next = state.createdTripPlans[idx];
      if (!next) throw new Error("Test misconfigured: too many TripPlan.create calls");
      return next;
    },
  };

  /**
   * Import the module under test with injected mocks.
   *
   * Your dataInit.js imports:
   *   import User from '../models/User.js'
   *   import TripPlan from '../models/TripPlan.js'
   *
   * From tests/ folder, those resolve to:
   *   ../models/User.js
   *   ../models/TripPlan.js
   *
   * If your dataInit.js is located elsewhere and uses different relative imports,
   * you must adjust the override keys to match the specifiers used in THAT file.
   */
  const mod = await esmock(MODULE_ID, {
    "../models/User.js": { default: UserMock },
    "../models/TripPlan.js": { default: TripPlanMock },
  });

  t.context.state = state;
  t.context.calls = calls;
  t.context.initializeMockData = mod.initializeMockData;
});

test.beforeEach((t) => {
  const { state, calls } = t.context;

  // Reset call logs
  calls.user_countDocuments = 0;
  calls.user_exec = 0;
  calls.user_create.length = 0;
  calls.trip_create.length = 0;
  calls.console_log.length = 0;

  // Reset state to "empty DB" baseline
  state.userCount = 0;

  // Prepare the 2 user objects that User.create() will return
  state.createdUsers = [
    {
      _id: "u1",
      username: "testuser1",
      tripPlans: undefined,
      saveCalls: 0,
      async save() {
        this.saveCalls += 1;
        return this;
      },
    },
    {
      _id: "u2",
      username: "testuser2",
      tripPlans: undefined,
      saveCalls: 0,
      async save() {
        this.saveCalls += 1;
        return this;
      },
    },
  ];

  // Prepare the 2 trip plan objects that TripPlan.create() will return
  state.createdTripPlans = [{ _id: "tp1" }, { _id: "tp2" }];

  // Capture console.log for this test case (no t.teardown here!)
  console.log = (...args) => calls.console_log.push(args.map(String).join(" "));
});

test.serial("initializeMockData: when no users exist, it seeds users + trip plans, links them, saves users, and logs", async (t) => {
  const { initializeMockData, state, calls } = t.context;

  await initializeMockData();

  // It checks countDocuments().exec() exactly once
  t.is(calls.user_countDocuments, 1);
  t.is(calls.user_exec, 1);

  // Creates two users with the exact documents from your implementation
  t.is(calls.user_create.length, 2);
  t.deepEqual(calls.user_create[0][0], {
    username: "testuser1",
    password: "password1",
    email: "user1@example.com",
  });
  t.deepEqual(calls.user_create[1][0], {
    username: "testuser2",
    password: "password2",
    email: "user2@example.com",
  });

  // Creates two trip plans
  t.is(calls.trip_create.length, 2);

  // Validate tripPlan1 core fields
  const trip1 = calls.trip_create[0][0];
  t.is(trip1.origin, "New York");
  t.is(trip1.destination, "Los Angeles");
  t.is(trip1.budget, 1500);
  t.true(trip1.startDate instanceof Date);
  t.true(trip1.endDate instanceof Date);
  t.deepEqual(trip1.activities, [
    { name: "Arrive in Los Angeles", day: "2025-11-21", time: "15:00" },
  ]);

  // Validate tripPlan2 core fields
  const trip2 = calls.trip_create[1][0];
  t.is(trip2.origin, "Chicago");
  t.is(trip2.destination, "Miami");
  t.is(trip2.budget, 1200);
  t.true(trip2.startDate instanceof Date);
  t.true(trip2.endDate instanceof Date);
  t.deepEqual(trip2.activities, [
    { name: "Arrive in Miami", day: "2025-12-10", time: "12:00" },
  ]);

  // Ensures trip plans are associated by _id
  t.deepEqual(state.createdUsers[0].tripPlans, ["tp1"]);
  t.deepEqual(state.createdUsers[1].tripPlans, ["tp2"]);

  // Both users saved exactly once
  t.is(state.createdUsers[0].saveCalls, 1);
  t.is(state.createdUsers[1].saveCalls, 1);

  // Logs once with the expected message
  t.is(calls.console_log.length, 1);
  t.true(
    calls.console_log[0].includes("Initialized mock users and trip plans"),
         `Expected log to include the init message, got: ${calls.console_log[0]}`
  );
});

test.serial("initializeMockData: when users already exist, it does nothing (no create, no save, no log)", async (t) => {
  const { initializeMockData, state, calls } = t.context;

  // Arrange: pretend DB already has users
  state.userCount = 2;

  await initializeMockData();

  // Still checks for existing users
  t.is(calls.user_countDocuments, 1);
  t.is(calls.user_exec, 1);

  // No seeding should happen
  t.is(calls.user_create.length, 0);
  t.is(calls.trip_create.length, 0);
  t.is(state.createdUsers[0].saveCalls, 0);
  t.is(state.createdUsers[1].saveCalls, 0);
  t.is(calls.console_log.length, 0);
});
