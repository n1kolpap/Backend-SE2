/**
 * Daily Plan routes
 */

import express from 'express';
import * as dailyPlanController from '../controllers/dailyPlanController.js';
import { authenticate } from '../middleware/auth.js';
import { activityValidation, noteValidation } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route GET /api/user/:userId/tripPlan/:tripId/dailyPlan
 * @desc Get all daily plans for a trip
 * @access Private
 */
router.get(
  '/user/:userId/tripPlan/:tripId/dailyPlan',
  authenticate,
  dailyPlanController.getDailyPlans
);

/**
 * @route POST /api/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity
 * @desc Add activity to daily plan
 * @access Private
 */
router.post(
  '/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity',
  authenticate,
  activityValidation,
  dailyPlanController.addActivity
);

/**
 * @route DELETE /api/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity/:activityId
 * @desc Remove activity from daily plan
 * @access Private
 */
router.delete(
  '/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity/:activityId',
  authenticate,
  dailyPlanController.removeActivity
);

/**
 * @route POST /api/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity/:activityId/completed
 * @desc Mark activity as completed
 * @access Private
 */
router.post(
  '/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity/:activityId/completed',
  authenticate,
  dailyPlanController.markActivityCompleted
);

/**
 * @route POST /api/user/:userId/tripPlan/:tripId/dailyPlan/:date/note
 * @desc Add note to daily plan
 * @access Private
 */
router.post(
  '/user/:userId/tripPlan/:tripId/dailyPlan/:date/note',
  authenticate,
  noteValidation,
  dailyPlanController.addNote
);

export default router;