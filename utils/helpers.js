/**
 * Helper utility functions
 */

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format date to YYYY-MM-DD
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Calculate days between two dates
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {number} Number of days
 */
export const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
};

/**
 * Generate date range array
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Array<string>} Array of date strings
 */
export const generateDateRange = (startDate, endDate) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    dates.push(formatDate(dt));
  }
  
  return dates;
};


/**
 * Centralized error-to-HTTP mapping for Trip Plan operations.
 *
 * Use this inside controllers/services to avoid duplicating the same `catch` logic.
 *
 * Expected behavior:
 * - If the error message matches a known case, respond with the appropriate status and message.
 * - Otherwise, respond with a generic 500 and include the underlying error message as details.
 *
 * Requirements:
 * - `sendError`, `HTTP_STATUS`, and `MESSAGES` must be imported in this module (or be in scope).
 *
 * @param {object} res - Express response object
 * @param {Error} error - Error thrown by service/repository layers
 * @returns {object} Express response (result of sendError)
 */


import { sendError } from '../utils/responses.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

export const handleTripPlanError = (res, error) => {
  // Defensive read: `error` might be undefined/null in edge cases.
  const msg = error?.message;

  // Known error case: missing resource
  if (msg === 'Trip plan not found') {
    return sendError(res, HTTP_STATUS.NOT_FOUND, MESSAGES.TRIP_NOT_FOUND);
  }

  // Known error case: authenticated user cannot access this resource
  if (msg === 'Unauthorized access to trip plan') {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'Access denied');
  }

  // Unknown/unexpected error case
  return sendError(
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    MESSAGES.SERVER_ERROR,
    msg
  );
};
