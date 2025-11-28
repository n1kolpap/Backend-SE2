/**
 * Validation middleware
 */

import { body, param, validationResult } from 'express-validator';
import { sendError } from '../utils/responses.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * Handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Validation failed',
      errors.array()
    );
  }
  
  next();
};

/**
 * User signup validation rules
 */
export const signupValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  handleValidationErrors
];

/**
 * User login validation rules
 */
export const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Trip plan creation validation rules
 */
export const createTripValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Destination is required'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  handleValidationErrors
];

/**
 * Trip plan update validation rules
 */
export const updateTripValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  param('tripId')
    .notEmpty()
    .withMessage('Trip ID is required'),
  handleValidationErrors
];

/**
 * Activity validation rules
 */
export const activityValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  param('tripId')
    .notEmpty()
    .withMessage('Trip ID is required'),
  param('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Activity name is required'),
  body('time')
    .notEmpty()
    .withMessage('Activity time is required'),
  handleValidationErrors
];

/**
 * Note validation rules
 */
export const noteValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  param('tripId')
    .notEmpty()
    .withMessage('Trip ID is required'),
  param('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  body('note')
    .trim()
    .notEmpty()
    .withMessage('Note text is required'),
  handleValidationErrors
];