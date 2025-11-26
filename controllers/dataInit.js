// import User from '../models/User.js';
// import TripPlan from '../models/TripPlan.js';
//
// export const initializeMockData = async () => {
// 	if (await User.countDocuments().exec() === 0) {
// 		const user = await User.create({ username: 'testuser', password: 'password', email: 'test@example.com' });
// 		const tripPlan = await TripPlan.create({
// 			origin: 'New York',
// 			destination: 'Los Angeles',
// 			startDate: new Date('2025-11-21'),
// 			endDate: new Date('2025-11-28'),
// 			budget: 1500,
// 			activities: [
// 				{ name: 'Arrive in Los Angeles', day: '2025-11-21', time: '15:00' },
// 			],
// });
//
// 		console.log("Initialized mock user and trip plan");
// 	}
// };

import User from '../models/User.js';
import TripPlan from '../models/TripPlan.js';

/**
 * Initialize mock data for users and trip plans
 */
export const initializeMockData = async () => {
	// Check if any users exist
	if (await User.countDocuments().exec() === 0) {
		const user1 = await User.create({ username: 'testuser1', password: 'password1', email: 'user1@example.com' });
		const user2 = await User.create({ username: 'testuser2', password: 'password2', email: 'user2@example.com' });

		// Create trip plans for the users
		const tripPlan1 = await TripPlan.create({
			origin: 'New York',
			destination: 'Los Angeles',
			startDate: new Date('2025-11-21'),
			endDate: new Date('2025-11-28'),
			budget: 1500,
			activities: [{ name: 'Arrive in Los Angeles', day: '2025-11-21', time: '15:00' }],
		});

		const tripPlan2 = await TripPlan.create({
			origin: 'Chicago',
			destination: 'Miami',
			startDate: new Date('2025-12-10'),
			endDate: new Date('2025-12-15'),
			budget: 1200,
			activities: [{ name: 'Arrive in Miami', day: '2025-12-10', time: '12:00' }],
		});

		// Associate trip plans with users
		user1.tripPlans = [tripPlan1._id];
		user2.tripPlans = [tripPlan2._id];

		await user1.save();
		await user2.save();

		console.log("Initialized mock users and trip plans");
	}
};
