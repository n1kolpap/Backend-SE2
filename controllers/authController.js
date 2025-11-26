/**
 * Authentication controller
 * Handle HTTP requests for authentication
 */

import * as authService from '../services/authService.js';
import { sendSuccess, sendError } from '../utils/responses.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

/**
 * Sign up new user
 * @route POST /api/user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const signup = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);
    
    return sendSuccess(
      res,
      HTTP_STATUS.CREATED,
      user,
      MESSAGES.USER_CREATED
    );
  } catch (error) {
    if (error.message === 'Username already exists') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        error.message
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
 * Login user
 * @route PUT /api/user/login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.loginUser(username, password);
    
    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      result,
      MESSAGES.USER_LOGGED_IN
    );
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.INVALID_CREDENTIALS
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