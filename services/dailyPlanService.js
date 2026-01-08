/**
 * Daily Plan service
 * Business logic for daily plan operations
 */

import * as DailyPlan from '../models/DailyPlan.js';
import * as TripPlan from '../models/TripPlan.js';

/**
 * Verify trip ownership
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID
 * @throws {Error} If unauthorized
 */
const verifyTripOwnership = (tripId, userId) => {
  const trip = TripPlan.findById(tripId);
  
  if (!trip) {
    throw new Error('Trip plan not found');
  }
  
  if (trip.userId !== userId) {
    throw new Error('Unauthorized access to trip plan');
  }
};

/**
 * Get all daily plans for a trip
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Array} Array of daily plans
 */
export const getTripDailyPlans = (tripId, userId) => {
  verifyTripOwnership(tripId, userId);
  return DailyPlan.findByTripId(tripId);
};

/**
 * Get daily plan for specific date
 * @param {string} tripId - Trip ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} userId - User ID (for authorization)
 * @returns {Object} Daily plan
 */
export const getDailyPlanByDate = (tripId, date, userId) => {
  verifyTripOwnership(tripId, userId);

  const dailyPlan = DailyPlan.findByTripAndDate(tripId, date);

  if (!dailyPlan) {
    throw new Error('Daily plan not found for this date');
  }

  return dailyPlan;
};

/**
 * Add activity to daily plan
 * @param {string} tripId - Trip ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} activityData - Activity data
 * @param {string} userId - User ID (for authorization)
 * @returns {Object} Added activity
 */
export const addActivityToDailyPlan = (tripId, date, activityData, userId) => {
  verifyTripOwnership(tripId, userId);

  const activity = DailyPlan.addActivity(tripId, date, activityData);
  return activity;
};

/**
 * Remove activity from daily plan
 * @param {string} tripId - Trip ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} activityId - Activity ID
 * @param {string} userId - User ID (for authorization)
 * @returns {boolean} Success status
 */
export const removeActivityFromDailyPlan = (tripId, date, activityId, userId) => {
    verifyTripOwnership(tripId, userId);
    
    const success = DailyPlan.removeActivity(tripId, date, activityId);
    
    if (!success) {
      throw new Error('Activity not found');
    }
    
    return success;
};

/**
 * Mark activity as completed
 * @param {string} tripId - Trip ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} activityId - Activity ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Object} Updated activity
 */
export const completeActivity = (tripId, date, activityId, userId) => {
  verifyTripOwnership(tripId, userId);

  const activity = DailyPlan.markActivityCompleted(tripId, date, activityId);

  if (!activity) {
    throw new Error('Activity not found');
  }

  return activity;
};

/**
 * Add note to daily plan
 * @param {string} tripId - Trip ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} noteText - Note text
 * @param {string} userId - User ID (for authorization)
 * @returns {Object} Updated daily plan
 */
export const addNoteToDailyPlan = (tripId, date, noteText, userId) => {
  verifyTripOwnership(tripId, userId);

  const dailyPlan = DailyPlan.addNote(tripId, date, noteText);
  return dailyPlan;
};
