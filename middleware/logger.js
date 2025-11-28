/**
 * Request logging middleware
 */

import morgan from 'morgan';

/**
 * Morgan logger configuration
 * Use 'dev' format for development, 'combined' for production
 */
export const logger = morgan(
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
);

/**
 * Custom request logger
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const customLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`
    );
  });
  
  next();
};