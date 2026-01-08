/**
 * Unit tests for: services/tripPlanService.js
 *
 * We test the service layer in isolation by mocking the model layer and helpers:
 * - ../models/TripPlan.js
 * - ../models/DailyPlan.js
 * - ../utils/helpers.js (generateDateRange)
 *
 * Why mock:
 * - Service functions are business logic + authorization decisions.
 * - We want deterministic behavior without any real DB / filesystem / in-memory store.
 *
 * Assumed repo layout:
 *   Backend-SE2/
 *     services/tripPlanService.js
 *     models/TripPlan.js
 *     models/DailyPlan.js
 *     utils/helpers.js
 *     tests/service.tripPlanService.test.js
 */

import test from 'ava';
import esmock from 'esmock';

const SERVICE_MODULE_ID = '../services/tripPlanService.js';

test.before(async (t) => {
  /**
   * Shared, mutable mock state.
   * Each test will reset this state in beforeEach().
   */
  const state = {
    // For TripPlan.findByUserId
    userTrips: [{ tripId: 't1' }, { tripId: 't2' }],

    // For TripPlan.findById
    tripById: { tripId: 't1', userId: 'u1' },

    // For TripPlan.createTripPlan
    createdTrip: {
      tripId: 'tNew',
      userId: 'u1',
      startDate: '2025-01-01',
      endDate: '2025-01-03',
    },

    // For TripPlan.updateTripPlan
    updatedTrip: { tripId: 't1', userId: 'u1', name: 'Updated' },

    // For TripPlan.deleteTripPlan
    deleteSuccess: true,

    // For generateDateRange helper
    dateRange: ['2025-01-01', '2025-01-02', '2025-01-03'],
  };

  /**
   * Call trackers so we can assert correct interactions and "no call" cases.
   */
  const calls = {
    trip_findByUserId: [],
    trip_findById: [],
    trip_createTripPlan: [],
    trip_updateTripPlan: [],
    trip_deleteTripPlan: [],

    daily_getOrCreateDailyPlan: [],

    helpers_generateDateRange: [],
  };

  /**
   * Mock TripPlan model.
   * The real service uses namespace import:
   *   import * as TripPlan from '../models/TripPlan.js';
   * so we provide the functions as named properties.
   */
  const TripPlanMock = {
    findByUserId: (userId) => {
      calls.trip_findByUserId.push([userId]);
      return state.userTrips;
    },
    findById: (tripId) => {
      calls.trip_findById.push([tripId]);
      return state.tripById;
    },
    createTripPlan: (userId, tripData) => {
      calls.trip_createTripPlan.push([userId, tripData]);
      return state.createdTrip;
    },
    updateTripPlan: (tripId, updateData) => {
      calls.trip_updateTripPlan.push([tripId, updateData]);
      return state.updatedTrip;
    },
    deleteTripPlan: (tripId) => {
      calls.trip_deleteTripPlan.push([tripId]);
      return state.deleteSuccess;
    },
  };

  /**
   * Mock DailyPlan model.
   * Service calls:
   *   DailyPlan.getOrCreateDailyPlan(trip.tripId, date)
   */
  const DailyPlanMock = {
    getOrCreateDailyPlan: (tripId, date) => {
      calls.daily_getOrCreateDailyPlan.push([tripId, date]);
      return { tripId, date };
    },
  };

  /**
   * Mock helpers.js generateDateRange so we can fully control the loop in createNewTripPlan.
   */
  const HelpersMock = {
    generateDateRange: (startDate, endDate) => {
      calls.helpers_generateDateRange.push([startDate, endDate]);
      return state.dateRange;
    },
  };

  /**
   * Load the service module with all dependencies replaced by mocks above.
   */
  const svc = await esmock(SERVICE_MODULE_ID, {
    '../models/TripPlan.js': TripPlanMock,
    '../models/DailyPlan.js': DailyPlanMock,
    '../utils/helpers.js': HelpersMock,
  });

  t.context.state = state;
  t.context.calls = calls;
  t.context.svc = svc;
});

test.beforeEach((t) => {
  const { state, calls } = t.context;

  // Reset mock state to a clean baseline for each test.
  state.userTrips = [{ tripId: 't1' }, { tripId: 't2' }];
  state.tripById = { tripId: 't1', userId: 'u1' };
  state.createdTrip = {
    tripId: 'tNew',
    userId: 'u1',
    startDate: '2025-01-01',
    endDate: '2025-01-03',
  };
  state.updatedTrip = { tripId: 't1', userId: 'u1', name: 'Updated' };
  state.deleteSuccess = true;
  state.dateRange = ['2025-01-01', '2025-01-02', '2025-01-03'];

  // Reset call logs so assertions only cover the current test's calls.
  for (const key of Object.keys(calls)) calls[key].length = 0;
});

/* -------------------------------------------------------------------------- */
/* getUserTripPlans                                                            */
/* -------------------------------------------------------------------------- */

test.serial('getUserTripPlans: returns TripPlan.findByUserId result and passes userId through', (t) => {
  const { svc, calls } = t.context;

  const out = svc.getUserTripPlans('u1');

  t.deepEqual(out, [{ tripId: 't1' }, { tripId: 't2' }]);
  t.deepEqual(calls.trip_findByUserId, [['u1']]);
});

/* -------------------------------------------------------------------------- */
/* getTripPlanById                                                             */
/* -------------------------------------------------------------------------- */

test.serial('getTripPlanById: throws "Trip plan not found" when TripPlan.findById returns null', (t) => {
  const { svc, state, calls } = t.context;

  state.tripById = null;

  const err = t.throws(() => svc.getTripPlanById('t1', 'u1'));
  t.is(err.message, 'Trip plan not found');

  t.deepEqual(calls.trip_findById, [['t1']]);
});

test.serial('getTripPlanById: throws "Unauthorized access to trip plan" when trip.userId !== userId', (t) => {
  const { svc, state, calls } = t.context;

  state.tripById = { tripId: 't1', userId: 'someone-else' };

  const err = t.throws(() => svc.getTripPlanById('t1', 'u1'));
  t.is(err.message, 'Unauthorized access to trip plan');

  t.deepEqual(calls.trip_findById, [['t1']]);
});

test.serial('getTripPlanById: returns trip when owned by user', (t) => {
  const { svc, state, calls } = t.context;

  state.tripById = { tripId: 't1', userId: 'u1', name: 'Athens' };

  const out = svc.getTripPlanById('t1', 'u1');

  t.deepEqual(out, { tripId: 't1', userId: 'u1', name: 'Athens' });
  t.deepEqual(calls.trip_findById, [['t1']]);
});

/* -------------------------------------------------------------------------- */
/* createNewTripPlan                                                           */
/* -------------------------------------------------------------------------- */

test.serial('createNewTripPlan: creates trip, generates date range, creates daily plans for each date, and returns trip', (t) => {
  const { svc, state, calls } = t.context;

  // Control the trip returned by createTripPlan
  state.createdTrip = {
    tripId: 'tNew',
    userId: 'u1',
    startDate: '2025-02-10',
    endDate: '2025-02-12',
  };

  // Control the generated dates (service loops through them)
  state.dateRange = ['2025-02-10', '2025-02-11', '2025-02-12'];

  const tripData = { destination: 'Rome' };

  const out = svc.createNewTripPlan('u1', tripData);

  // Service returns the trip from TripPlan.createTripPlan
  t.deepEqual(out, state.createdTrip);

  // Verify it called TripPlan.createTripPlan(userId, tripData)
  t.deepEqual(calls.trip_createTripPlan, [['u1', tripData]]);

  // Verify it called generateDateRange(trip.startDate, trip.endDate)
  t.deepEqual(calls.helpers_generateDateRange, [['2025-02-10', '2025-02-12']]);

  // Verify it created (or got) daily plans for every date in the range
  t.deepEqual(calls.daily_getOrCreateDailyPlan, [
    ['tNew', '2025-02-10'],
    ['tNew', '2025-02-11'],
    ['tNew', '2025-02-12'],
  ]);
});

/* -------------------------------------------------------------------------- */
/* updateExistingTripPlan                                                      */
/* -------------------------------------------------------------------------- */

test.serial('updateExistingTripPlan: checks ownership via getTripPlanById and returns updated trip', (t) => {
  const { svc, state, calls } = t.context;

  // Ownership baseline: tripById belongs to user u1
  state.tripById = { tripId: 't1', userId: 'u1' };

  // Model returns an updated trip
  state.updatedTrip = { tripId: 't1', userId: 'u1', name: 'Updated', budget: 100 };

  const updateData = { name: 'Updated', budget: 100 };

  const out = svc.updateExistingTripPlan('t1', 'u1', updateData);

  t.deepEqual(out, state.updatedTrip);

  // getTripPlanById internally calls TripPlan.findById, so we should see that call.
  t.deepEqual(calls.trip_findById, [['t1']]);

  // Then it calls TripPlan.updateTripPlan(tripId, updateData)
  t.deepEqual(calls.trip_updateTripPlan, [['t1', updateData]]);
});

test.serial('updateExistingTripPlan: throws "Failed to update trip plan" when TripPlan.updateTripPlan returns null', (t) => {
  const { svc, state, calls } = t.context;

  state.tripById = { tripId: 't1', userId: 'u1' };
  state.updatedTrip = null;

  const err = t.throws(() => svc.updateExistingTripPlan('t1', 'u1', { name: 'X' }));
  t.is(err.message, 'Failed to update trip plan');

  // Ownership check happened
  t.deepEqual(calls.trip_findById, [['t1']]);
  // Update attempted
  t.deepEqual(calls.trip_updateTripPlan, [['t1', { name: 'X' }]]);
});

test.serial('updateExistingTripPlan: does not call updateTripPlan when unauthorized', (t) => {
  const { svc, state, calls } = t.context;

  // Trip belongs to someone else
  state.tripById = { tripId: 't1', userId: 'other' };

  const err = t.throws(() => svc.updateExistingTripPlan('t1', 'u1', { name: 'X' }));
  t.is(err.message, 'Unauthorized access to trip plan');

  // It checked ownership...
  t.deepEqual(calls.trip_findById, [['t1']]);
  // ...and must not attempt the update.
  t.is(calls.trip_updateTripPlan.length, 0);
});

/* -------------------------------------------------------------------------- */
/* deleteTripPlanById                                                          */
/* -------------------------------------------------------------------------- */

test.serial('deleteTripPlanById: checks ownership and returns true when delete succeeds', (t) => {
  const { svc, state, calls } = t.context;

  state.tripById = { tripId: 't1', userId: 'u1' };
  state.deleteSuccess = true;

  const out = svc.deleteTripPlanById('t1', 'u1');

  t.is(out, true);
  t.deepEqual(calls.trip_findById, [['t1']]);
  t.deepEqual(calls.trip_deleteTripPlan, [['t1']]);
});

test.serial('deleteTripPlanById: throws "Failed to delete trip plan" when TripPlan.deleteTripPlan returns false', (t) => {
  const { svc, state, calls } = t.context;

  state.tripById = { tripId: 't1', userId: 'u1' };
  state.deleteSuccess = false;

  const err = t.throws(() => svc.deleteTripPlanById('t1', 'u1'));
  t.is(err.message, 'Failed to delete trip plan');

  t.deepEqual(calls.trip_findById, [['t1']]);
  t.deepEqual(calls.trip_deleteTripPlan, [['t1']]);
});

test.serial('deleteTripPlanById: does not call deleteTripPlan when trip is not found', (t) => {
  const { svc, state, calls } = t.context;

  state.tripById = null;

  const err = t.throws(() => svc.deleteTripPlanById('t1', 'u1'));
  t.is(err.message, 'Trip plan not found');

  t.deepEqual(calls.trip_findById, [['t1']]);
  t.is(calls.trip_deleteTripPlan.length, 0);
});

test.serial('deleteTripPlanById: does not call deleteTripPlan when unauthorized', (t) => {
  const { svc, state, calls } = t.context;

  state.tripById = { tripId: 't1', userId: 'other' };

  const err = t.throws(() => svc.deleteTripPlanById('t1', 'u1'));
  t.is(err.message, 'Unauthorized access to trip plan');

  t.deepEqual(calls.trip_findById, [['t1']]);
  t.is(calls.trip_deleteTripPlan.length, 0);
});

