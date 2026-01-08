/**
 * Routes index
 * Combines all route modules
 */

import express from 'express';
import authRoutes from './authRoutes.js';
import tripPlanRoutes from './tripPlanRoutes.js';
import dailyPlanRoutes from './dailyPlanRoutes.js';

const router = express.Router();

// Mount routes
router.use('/', authRoutes);
router.use('/', tripPlanRoutes);
router.use('/', dailyPlanRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'TripTrail API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
