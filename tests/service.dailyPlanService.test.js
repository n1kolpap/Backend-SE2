/**
 * Unit tests for: services/dailyPlanService.js
 *
 * We test the service layer in isolation by mocking the model layers:
 *  - ../models/TripPlan.js
 *  - ../models/DailyPlan.js
 *
 * Why:
 * - The service contains business logic (authorization + error mapping).
 * - We want deterministic tests without touching any real storage.
 *
 * Functions under test (exports from dailyPlanService.js):
 *  - getTripDailyPlans(tripId, userId)
 *  - getDailyPlanByDate(tripId, date, userId)
 *  - addActivityToDailyPlan(tripId, date, activityData, userId)
 *  - removeActivityFromDailyPlan(tripId, date, activityId, userId)
 *  - completeActivity(tripId, date, activityId, userId)
 *  - addNoteToDailyPlan(tripId, date, noteText, userId)
 */

import test from 'ava';
import esmock from 'esmock';

const SERVICE_MODULE_ID = '../services/dailyPlanService.js';

/**
 * We load the service once with stateful mocks.
 * Then each test updates the mock "state" to simulate different scenarios.
 *
 * This avoids ESM module cache issues and keeps tests fast.
 */
test.before(async (t) => {
  // ---------------------------
  // Shared mock state (mutable)
  // ---------------------------
  const state = {
    trip: { tripId: 't1', userId: 'u1' },

    // DailyPlan model return values:
    tripDailyPlans: [{ id: 'dp1' }, { id: 'dp2' }],
    dailyPlanByDate: { id: 'dp-2025-01-01', date: '2025-01-01' },
    addedActivity: { activityId: 'a1', name: 'Museum' },
    removeActivitySuccess: true,
    completedActivity: { activityId: 'a1', completed: true },
    noteResult: { id: 'dp-2025-01-01', note: 'Remember tickets' },
  };

  // ---------------------------
  // Call trackers (for asserting interactions)
  // ---------------------------
  const calls = {
    tripPlan_findById: [],
    dailyPlan_findByTripId: [],
    dailyPlan_findByTripAndDate: [],
    dailyPlan_addActivity: [],
    dailyPlan_removeActivity: [],
    dailyPlan_markActivityCompleted: [],
    dailyPlan_addNote: [],
  };

  // ---------------------------
  // Mock TripPlan model
  // ---------------------------
  const TripPlanMock = {
    findById: (tripId) => {
      calls.tripPlan_findById.push([tripId]);
      return state.trip; // can be set to null or wrong user per test
    },
  };

  // ---------------------------
  // Mock DailyPlan model
  // ---------------------------
  const DailyPlanMock = {
    findByTripId: (tripId) => {
      calls.dailyPlan_findByTripId.push([tripId]);
      return state.tripDailyPlans;
    },

    findByTripAndDate: (tripId, date) => {
      calls.dailyPlan_findByTripAndDate.push([tripId, date]);
      return state.dailyPlanByDate;
    },

    addActivity: (tripId, date, activityData) => {
      calls.dailyPlan_addActivity.push([tripId, date, activityData]);
      return state.addedActivity;
    },

    removeActivity: (tripId, date, activityId) => {
      calls.dailyPlan_removeActivity.push([tripId, date, activityId]);
      return state.removeActivitySuccess;
    },

    markActivityCompleted: (tripId, date, activityId) => {
      calls.dailyPlan_markActivityCompleted.push([tripId, date, activityId]);
      return state.completedActivity;
    },

    addNote: (tripId, date, noteText) => {
      calls.dailyPlan_addNote.push([tripId, date, noteText]);
      return state.noteResult;
    },
  };

  // ---------------------------
  // Load service with mocked models
  // ---------------------------
  const svc = await esmock(SERVICE_MODULE_ID, {
    '../models/TripPlan.js': TripPlanMock,
    '../models/DailyPlan.js': DailyPlanMock,
  });

  // Expose to tests
  t.context.state = state;
  t.context.calls = calls;
  t.context.svc = svc;
});

test.beforeEach((t) => {
  const { state, calls } = t.context;

  // Reset state to a known good baseline for each test.
  state.trip = { tripId: 't1', userId: 'u1' };
  state.tripDailyPlans = [{ id: 'dp1' }, { id: 'dp2' }];
  state.dailyPlanByDate = { id: 'dp-2025-01-01', date: '2025-01-01' };
  state.addedActivity = { activityId: 'a1', name: 'Museum' };
  state.removeActivitySuccess = true;
  state.completedActivity = { activityId: 'a1', completed: true };
  state.noteResult = { id: 'dp-2025-01-01', note: 'Remember tickets' };

  // Reset call logs so each test asserts only what it triggered.
  for (const k of Object.keys(calls)) calls[k].length = 0;
});

/* -------------------------------------------------------------------------- */
/* Authorization / ownership checks (verifyTripOwnership)                      */
/* -------------------------------------------------------------------------- */

test.serial('getTripDailyPlans: throws "Trip plan not found" if TripPlan.findById returns null', (t) => {
  const { svc, state, calls } = t.context;

  // Simulate missing trip.
  state.trip = null;

  const err = t.throws(() => svc.getTripDailyPlans('t1', 'u1'));
  t.is(err.message, 'Trip plan not found');

  // Service should check ownership first and NOT call DailyPlan model.
  t.deepEqual(calls.tripPlan_findById, [['t1']]);
  t.is(calls.dailyPlan_findByTripId.length, 0);
});

test.serial('getTripDailyPlans: throws "Unauthorized access to trip plan" when trip.userId !== userId', (t) => {
  const { svc, state, calls } = t.context;

  // Trip exists but belongs to another user.
  state.trip = { tripId: 't1', userId: 'someone-else' };

  const err = t.throws(() => svc.getTripDailyPlans('t1', 'u1'));
  t.is(err.message, 'Unauthorized access to trip plan');

  // Again: must not proceed to DailyPlan reads when unauthorized.
  t.deepEqual(calls.tripPlan_findById, [['t1']]);
  t.is(calls.dailyPlan_findByTripId.length, 0);
});

/* -------------------------------------------------------------------------- */
/* getTripDailyPlans                                                          */
/* -------------------------------------------------------------------------- */

test.serial('getTripDailyPlans: returns daily plans when user owns trip', (t) => {
  const { svc, calls } = t.context;

  const out = svc.getTripDailyPlans('t1', 'u1');

  // Service returns model result
  t.deepEqual(out, [{ id: 'dp1' }, { id: 'dp2' }]);

  // Ownership check + model call
  t.deepEqual(calls.tripPlan_findById, [['t1']]);
  t.deepEqual(calls.dailyPlan_findByTripId, [['t1']]);
});

/* -------------------------------------------------------------------------- */
/* getDailyPlanByDate                                                         */
/* -------------------------------------------------------------------------- */

test.serial('getDailyPlanByDate: throws "Daily plan not found for this date" when model returns null', (t) => {
  const { svc, state, calls } = t.context;

  state.dailyPlanByDate = null;

  const err = t.throws(() => svc.getDailyPlanByDate('t1', '2025-01-01', 'u1'));
  t.is(err.message, 'Daily plan not found for this date');

  // Verify calls: ownership check first, then the date lookup
  t.deepEqual(calls.tripPlan_findById, [['t1']]);
  t.deepEqual(calls.dailyPlan_findByTripAndDate, [['t1', '2025-01-01']]);
});

test.serial('getDailyPlanByDate: returns the daily plan when found', (t) => {
  const { svc, calls } = t.context;

  const out = svc.getDailyPlanByDate('t1', '2025-01-01', 'u1');

  t.deepEqual(out, { id: 'dp-2025-01-01', date: '2025-01-01' });
  t.deepEqual(calls.tripPlan_findById, [['t1']]);
  t.deepEqual(calls.dailyPlan_findByTripAndDate, [['t1', '2025-01-01']]);
});

/* -------------------------------------------------------------------------- */
/* addActivityToDailyPlan                                                     */
/* -------------------------------------------------------------------------- */

test.serial('addActivityToDailyPlan: calls DailyPlan.addActivity with correct args and returns activity', (t) => {
  const { svc, calls } = t.context;

  const activityData = { name: 'Museum', time: '10:00' };

  const out = svc.addActivityToDailyPlan('t1', '2025-01-01', activityData, 'u1');

  // Returns the model result
  t.deepEqual(out, { activityId: 'a1', name: 'Museum' });

  // Ensures ownership check and correct call signature to model
  t.deepEqual(calls.tripPlan_findById, [['t1']]);
  t.deepEqual(calls.dailyPlan_addActivity, [['t1', '2025-01-01', activityData]]);
});

/* -------------------------------------------------------------------------- */
/* removeActivityFromDailyPlan                                                */
/* -------------------------------------------------------------------------- */

test.serial('removeActivityFromDailyPlan: returns true when removal succeeds', (t) => {
  const { svc, state, calls } = t.context;

  state.removeActivitySuccess = true;

  const out = svc.removeActivityFromDailyPlan('t1', '2025-01-01', 'a1', 'u1');

  t.is(out, true);
  t.deepEqual(calls.tripPlan_findById, [['t1']]);
  t.deepEqual(calls.dailyPlan_removeActivity, [['t1', '2025-01-01', 'a1']]);
});

test.serial('removeActivityFromDailyPlan: throws "Activity not found" when model returns false', (t) => {
  const { svc, state, calls } = t.context;

  state.removeActivitySuccess = false;

  const err = t.throws(() => svc.removeActivityFromDailyPlan('t1', '2025-01-01', 'missing', 'u1'));
  t.is(err.message, 'Activity not found');

  t.deepEqual(calls.tripPlan_findById, [['t1']]);
  t.deepEqual(calls.dailyPlan_removeActivity, [['t1', '2025-01-01', 'missing']]);
});

/* -------------------------------------------------------------------------- */
/* completeActivity                                                           */
/* -------------------------------------------------------------------------- */

test.serial('completeActivity: returns updated activity when model returns an object', (t) => {
  const { svc, state, calls } = t.context;

  state.completedActivity = { activityId: 'a1', completed: true };

  const out = svc.completeActivity('t1', '2025-01-01', 'a1', 'u1');

  t.deepEqual(out, { activityId: 'a1', completed: true });
  t.deepEqual(calls.tripPlan_findById, [['t1']]);
  t.deepEqual(calls.dailyPlan_markActivityCompleted, [['t1', '2025-01-01', 'a1']]);
});

test.serial('completeActivity: throws "Activity not found" when model returns null', (t) => {
  const { svc, state, calls } = t.context;

  state.completedActivity = null;

  const err = t.throws(() => svc.completeActivity('t1', '2025-01-01', 'missing', 'u1'));
  t.is(err.message, 'Activity not found');

  t.deepEqual(calls.tripPlan_findById, [['t1']]);
  t.deepEqual(calls.dailyPlan_markActivityCompleted, [['t1', '2025-01-01', 'missing']]);
});

/* -------------------------------------------------------------------------- */
/* addNoteToDailyPlan                                                         */
/* -------------------------------------------------------------------------- */

test.serial('addNoteToDailyPlan: calls DailyPlan.addNote and returns updated daily plan', (t) => {
  const { svc, calls } = t.context;

  const out = svc.addNoteToDailyPlan('t1', '2025-01-01', 'Remember tickets', 'u1');

  t.deepEqual(out, { id: 'dp-2025-01-01', note: 'Remember tickets' });
  t.deepEqual(calls.tripPlan_findById, [['t1']]);
  t.deepEqual(calls.dailyPlan_addNote, [['t1', '2025-01-01', 'Remember tickets']]);
});
