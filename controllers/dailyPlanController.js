import TripPlan from '../models/TripPlan.js';

/**
 * Get daily plan by date
 */
export const getDailyPlan = async (req, res) => {
	try {
		const { userId, tripId, date } = req.params;
		const tripPlan = await TripPlan.findById(tripId);

		if (!tripPlan) {
			return res.status(404).json({ success: false, message: 'Trip plan not found' });
		}

		const dailyPlan = tripPlan.activities.filter(activity => activity.day === date);
		res.status(200).json({ success: true, data: dailyPlan });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};

/**
 * Add activity to daily plan
 */
export const addActivity = async (req, res) => {
	try {
		const { userId, tripId, date, activityId } = req.params;
		const tripPlan = await TripPlan.findById(tripId);

		if (!tripPlan) {
			return res.status(404).json({ success: false, message: 'Trip plan not found' });
		}

		const newActivity = { ...req.body, day: date, activityId };
		tripPlan.activities.push(newActivity);
		await tripPlan.save();
		res.status(201).json({ success: true, data: newActivity });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};

/**
 * Delete activity from daily plan
 */
export const deleteActivity = async (req, res) => {
	try {
		const { userId, tripId, date, activityId } = req.params;
		const tripPlan = await TripPlan.findById(tripId);

		if (!tripPlan) {
			return res.status(404).json({ success: false, message: 'Trip plan not found' });
		}

		tripPlan.activities = tripPlan.activities.filter(activity => activity.activityId !== activityId);
		await tripPlan.save();

		res.status(204).json({ success: true, message: 'Activity removed successfully' });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};

// MOCK DATA

const mockDailyPlans = [
	{
		userId: '1',
		tripId: '1',
		date: '2025-11-21',
		activities: [
			{ name: 'Breakfast at the hotel', time: '08:00' },
			{ name: 'Visit Hollywood Walk of Fame', time: '10:00' },
		],
	},
];

export const getDailyPlan = async (req, res) => {
	const { userId, tripId, date } = req.params;

	const dailyPlan = process.env.MONGO_URI
	? await DailyPlan.findOne({ userId, tripId, date })
	: mockDailyPlans.find(plan => plan.userId === userId && plan.tripId === tripId && plan.date === date);

	if (!dailyPlan) {
		return res.status(404).json({ success: false, message: 'Daily plan not found' });
	}

	res.status(200).json({ success: true, data: dailyPlan });
};
