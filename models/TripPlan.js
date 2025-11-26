import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
	name: { type: String, required: true },
	location: { type: String },
	day: { type: String, required: true },
	time: { type: String, required: true },
}, { _id: false });	//bug?

const tripPlanSchema = new mongoose.Schema({
	origin: { type: String, required: true },
	destination: { type: String, required: true },
	startDate: { type: Date, required: true },
	endDate: { type: Date, required: true },
	budget: { type: Number },
	activities: [activitySchema],
}, { timestamps: true });	//bug?

const TripPlan = mongoose.model('TripPlan', tripPlanSchema);
export default TripPlan;
