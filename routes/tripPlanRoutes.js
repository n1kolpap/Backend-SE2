/**
 * Trip Plan routes
 */

import express from 'express';
import * as tripPlanController from '../controllers/tripPlanController.js';
import { authenticate } from '../middleware/auth.js';
import { 
  createTripValidation, 
  updateTripValidation 
} from '../middleware/validation.js';

const router = express.Router();

/**
 * @route POST /api/user/:userId/tripPlan
 * @desc Create new trip plan
 * @access Private
 */
router.post(
  '/user/:userId/tripPlan',
  authenticate,
  createTripValidation,
  tripPlanController.createTripPlan
);

/**
 * @route GET /api/user/:userId/tripPlan/:tripId
 * @desc Get trip plan by ID
 * @access Private
 */
router.get(
  '/user/:userId/tripPlan/:tripId',
  authenticate,
  tripPlanController.getTripPlan
);

/**
 * @route PUT /api/user/:userId/tripPlan/:tripId
 * @desc Update trip plan
 * @access Private
 */
router.put(
  '/user/:userId/tripPlan/:tripId',
  authenticate,
  updateTripValidation,
  tripPlanController.updateTripPlan
);

/**
 * @route DELETE /api/user/:userId/tripPlan/:tripId
 * @desc Delete trip plan
 * @access Private
 */
router.delete(
  '/user/:userId/tripPlan/:tripId',
  authenticate,
  tripPlanController.deleteTripPlan
);

export default router;