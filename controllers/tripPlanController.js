import TripPlan from '../models/TripPlan.js';

/**
 * Create a new trip plan
 */
export const createTripPlan = async (req, res) => {
	try {
		const { userId } = req.params;
		const tripPlan = new TripPlan({ ...req.body });	//bug??
		await tripPlan.save();
		res.status(201).json({ success: true, data: tripPlan });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};

/**
 * Get trip plan by ID
 */
export const getTripPlan = async (req, res) => {
	try {
		const { userId, tripId } = req.params;
		const tripPlan = await TripPlan.findById(tripId);

		if (!tripPlan) {
			return res.status(404).json({ success: false, message: 'Trip plan not found' });
		}

		res.status(200).json({ success: true, data: tripPlan });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};

/**
 * Update trip plan by ID
 */
export const updateTripPlan = async (req, res) => {
	try {
		const { userId, tripId } = req.params;
		const tripPlan = await TripPlan.findByIdAndUpdate(tripId, req.body, { new: true });

		if (!tripPlan) {
			return res.status(404).json({ success: false, message: 'Trip plan not found' });
		}

		res.status(200).json({ success: true, data: tripPlan });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};

/**
 * Delete trip plan
 */
export const deleteTripPlan = async (req, res) => {
	try {
		const { userId, tripId } = req.params;
		const tripPlan = await TripPlan.findByIdAndDelete(tripId);

		if (!tripPlan) {
			return res.status(404).json({ success: false, message: 'Trip plan not found' });
		}

		res.status(204).json({ success: true, message: 'Trip plan deleted' });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};


// MOCK DATA

const mockTripPlans = [
	{
		_id: '1',
		origin: 'New York',
		destination: 'Los Angeles',
		startDate: new Date('2025-11-21'),
		endDate: new Date('2025-11-28'),
		budget: 1500,
		activities: [{
			name: 'Arrive in Los Angeles',
			location: 'Los Angeles Airport',
			day: '2025-11-21',
			time: '15:00',
		}],
	},
// Add more mock trip plans as needed
];

export const createTripPlan = async (req, res) => {
	try {
		const { userId } = req.params;

		// Check if MONGO_URI is provided; if not, use mock data
		const tripPlan = process.env.MONGO_URI ?
		new TripPlan({ ...req.body }) :
		mockTripPlans.find(plan => plan.userId === userId) || {};

		if (process.env.MONGO_URI) {
			await tripPlan.save();
		}

		res.status(201).json({ success: true, data: tripPlan });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};

// For testing, you can implement a `getTripPlan` to return mock data:
export const getTripPlan = async (req, res) => {
	try {
		const { tripId } = req.params;

		const tripPlan = process.env.MONGO_URI
		? await TripPlan.findById(tripId)
		: mockTripPlans.find(plan => plan._id === tripId);

		if (!tripPlan) {
			return res.status(404).json({ success: false, message: 'Trip plan not found' });
		}

		res.status(200).json({ success: true, data: tripPlan });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};

// You can similarly modify updateTripPlan and deleteTripPlan to accommodate mock data as needed.
