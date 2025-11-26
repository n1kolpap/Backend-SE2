/**
 * Authentication middleware
 */

import jwt from 'jsonwebtoken';
import { findById } from '../models/User.js';
import { sendError } from '../utils/responses.js';
import { HTTP_STATUS, MESSAGES } from '../config/constants.js';

/**
 * Verify JWT token and authenticate user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.UNAUTHORIZED,
        'No token provided'
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = findById(decoded.userId);
    
    if (!user) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.UNAUTHORIZED,
        'User not found'
      );
    }
    
    // Attach user to request
    req.user = {
      userId: user.userId,
      username: user.username
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.UNAUTHORIZED,
        'Invalid token'
      );
    }
    
    if (error.name === 'TokenExpiredError') {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.UNAUTHORIZED,
        'Token expired'
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