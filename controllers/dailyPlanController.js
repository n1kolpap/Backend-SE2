/**
 * Daily Plan controller
 * Handle HTTP requests for daily plan operations
 */

import * as dailyPlanService from '../services/dailyPlanService.js';
import { sendSuccess, sendError } from '../utils/responses.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

/**
 * Get all daily plans for a trip
 * @route GET /api/user/:userId/tripPlan/:tripId/dailyPlan
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getDailyPlans = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;
    
    const dailyPlans = dailyPlanService.getTripDailyPlans(tripId, userId);
    
    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      dailyPlans,
      'Daily plans retrieved successfully'
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
 * Add activity to daily plan
 * @route POST /api/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const addActivity = async (req, res) => {
  try {
    const { tripId, date } = req.params;
    const userId = req.user.userId;
    
    const activity = dailyPlanService.addActivityToDailyPlan(
      tripId,
      date,
      req.body,
      userId
    );
    
    return sendSuccess(
      res,
      HTTP_STATUS.CREATED,
      activity,
      MESSAGES.ACTIVITY_ADDED
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
 * Remove activity from daily plan
 * @route DELETE /api/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity/:activityId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const removeActivity = async (req, res) => {
  try {
    const { tripId, date, activityId } = req.params;
    const userId = req.user.userId;
    
    dailyPlanService.removeActivityFromDailyPlan(tripId, date, activityId, userId);
    
    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      null,
      MESSAGES.ACTIVITY_REMOVED
    );
  } catch (error) {
    if (error.message === 'Trip plan not found') {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        MESSAGES.TRIP_NOT_FOUND
      );
    }
    
    if (error.message === 'Activity not found') {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        MESSAGES.ACTIVITY_NOT_FOUND
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
 * Mark activity as completed
 * @route POST /api/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity/:activityId/completed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markActivityCompleted = async (req, res) => {
  try {
    const { tripId, date, activityId } = req.params;
    const userId = req.user.userId;
    
    const activity = dailyPlanService.completeActivity(tripId, date, activityId, userId);
    
    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      activity,
      MESSAGES.ACTIVITY_COMPLETED
    );
  } catch (error) {
    if (error.message === 'Trip plan not found') {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        MESSAGES.TRIP_NOT_FOUND
      );
    }
    
    if (error.message === 'Activity not found') {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        MESSAGES.ACTIVITY_NOT_FOUND
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
 * Add note to daily plan
 * @route POST /api/user/:userId/tripPlan/:tripId/dailyPlan/:date/note
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const addNote = async (req, res) => {
  try {
    const { tripId, date } = req.params;
    const { note } = req.body;
    const userId = req.user.userId;
    
    const dailyPlan = dailyPlanService.addNoteToDailyPlan(tripId, date, note, userId);
    
    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      dailyPlan,
      MESSAGES.NOTE_ADDED
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