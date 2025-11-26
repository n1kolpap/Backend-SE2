/**
 * Trip Plan service
 * Business logic for trip plan operations
 */

import * as TripPlan from '../models/TripPlan.js';
import * as DailyPlan from '../models/DailyPlan.js';
import { generateDateRange } from '../utils/helpers.js';

/**
 * Get all trip plans for a user
 * @param {string} userId - User ID
 * @returns {Array} Array of trip plans
 */
export const getUserTripPlans = (userId) => {
  try {
    return TripPlan.findByUserId(userId);
  } catch (error) {
    throw error;
  }
};

/**
 * Get trip plan by ID
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Object} Trip plan
 * @throws {Error} If trip not found or unauthorized
 */
export const getTripPlanById = (tripId, userId) => {
  try {
    const trip = TripPlan.findById(tripId);
    
    if (!trip) {
      throw new Error('Trip plan not found');
    }
    
    // Check authorization
    if (trip.userId !== userId) {
      throw new Error('Unauthorized access to trip plan');
    }
    
    return trip;
  } catch (error) {
    throw error;
  }
};

/**
 * Create new trip plan
 * @param {string} userId - User ID
 * @param {Object} tripData - Trip plan data
 * @returns {Object} Created trip plan
 */
export const createNewTripPlan = (userId, tripData) => {
  try {
    const trip = TripPlan.createTripPlan(userId, tripData);
    
    // Generate daily plans for the trip date range
    const dates = generateDateRange(trip.startDate, trip.endDate);
    dates.forEach(date => {
      DailyPlan.getOrCreateDailyPlan(trip.tripId, date);
    });
    
    return trip;
  } catch (error) {
    throw error;
  }
};

/**
 * Update trip plan
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID (for authorization)
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated trip plan
 * @throws {Error} If trip not found or unauthorized
 */
export const updateExistingTripPlan = (tripId, userId, updateData) => {
  try {
    const trip = getTripPlanById(tripId, userId);
    
    const updatedTrip = TripPlan.updateTripPlan(tripId, updateData);
    
    if (!updatedTrip) {
      throw new Error('Failed to update trip plan');
    }
    
    return updatedTrip;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete trip plan
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID (for authorization)
 * @returns {boolean} Success status
 * @throws {Error} If trip not found or unauthorized
 */
export const deleteTripPlanById = (tripId, userId) => {
  try {
    const trip = getTripPlanById(tripId, userId);
    
    const success = TripPlan.deleteTripPlan(tripId);
    
    if (!success) {
      throw new Error('Failed to delete trip plan');
    }
    
    return success;
  } catch (error) {
    throw error;
  }
};