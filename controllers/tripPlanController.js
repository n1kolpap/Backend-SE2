/**
 * Trip Plan controller
 * Handle HTTP requests for trip plan operations
 */

import * as tripPlanService from '../services/tripPlanService.js';
import { sendSuccess, sendError } from '../utils/responses.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

/**
 * Create new trip plan
 * @route POST /api/user/:userId/tripPlan
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createTripPlan = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify authenticated user matches userId
    if (req.user.userId !== userId) {
      return sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        'Cannot create trip plan for another user'
      );
    }
    
    const trip = tripPlanService.createNewTripPlan(userId, req.body);
    
    return sendSuccess(
      res,
      HTTP_STATUS.CREATED,
      trip,
      MESSAGES.TRIP_CREATED
    );
  } catch (error) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER_ERROR,
      error.message
    );
  }
};

/**
 * Get trip plan by ID
 * @route GET /api/user/:userId/tripPlan/:tripId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTripPlan = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;
    
    const trip = tripPlanService.getTripPlanById(tripId, userId);
    
    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      trip,
      'Trip plan retrieved successfully'
    );
  } catch (error) {
    if (error.message === 'Trip plan not found') {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        MESSAGES.TRIP_NOT_FOUND
      );
    }
    
    if (error.message === 'Unauthorized access to trip plan') {
      return sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        'Access denied'
      );
    }
    
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER_ERROR,
      error.message
    );
  }
};

/**
 * Update trip plan
 * @route PUT /api/user/:userId/tripPlan/:tripId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateTripPlan = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;
    
    const trip = tripPlanService.updateExistingTripPlan(tripId, userId, req.body);
    
    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      trip,
      MESSAGES.TRIP_UPDATED
    );
  } catch (error) {
    if (error.message === 'Trip plan not found') {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        MESSAGES.TRIP_NOT_FOUND
      );
    }
    
    if (error.message === 'Unauthorized access to trip plan') {
      return sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        'Access denied'
      );
    }
    
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER_ERROR,
      error.message
    );
  }
};

/**
 * Delete trip plan
 * @route DELETE /api/user/:userId/tripPlan/:tripId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteTripPlan = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;
    
    tripPlanService.deleteTripPlanById(tripId, userId);
    
    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      null,
      MESSAGES.TRIP_DELETED
    );
  } catch (error) {
    if (error.message === 'Trip plan not found') {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        MESSAGES.TRIP_NOT_FOUND
      );
    }
    
    if (error.message === 'Unauthorized access to trip plan') {
      return sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        'Access denied'
      );
    }
    
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      MESSAGES.SERVER_ERROR,
      error.message
    );
  }
};