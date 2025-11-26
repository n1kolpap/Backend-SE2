import express from 'express';
import {
	createUser,
	loginUser
} from '../controllers/userController.js';
import {
	createTripPlan,
	getTripPlan,
	updateTripPlan,
	deleteTripPlan
} from '../controllers/tripPlanController.js';
import {
	getDailyPlan,
	addActivity,
	deleteActivity
} from '../controllers/dailyPlanController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// User routes
router.post('/user', createUser);
router.put('/user/login', loginUser);
router.put('/user/:userId', auth, updateTripPlan);	//bug?? :

// Trip plan routes
router.post('/user/:userId/tripPlan', auth, createTripPlan);
router.get('/user/:userId/tripPlan/:tripId', auth, getTripPlan);
router.put('/user/:userId/tripPlan/:tripId', auth, updateTripPlan);
router.delete('/user/:userId/tripPlan/:tripId', auth, deleteTripPlan);

// Daily plan routes
router.get('/user/:userId/tripPlan/:tripId/dailyPlan/:date', auth, getDailyPlan);
router.post('/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity', auth, addActivity);
router.delete('/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity/:activityId', auth, deleteActivity);

export default router;
