import mongoose from 'mongoose';

const dailyPlanSchema = new mongoose.Schema({
	date: { type: Date, required: true },
	activities: [{
		name: { type: String, required: true },
		time: { type: String, required: true }
	}]
}, { _id: false });	//bug?

const DailyPlan = mongoose.model('DailyPlan', dailyPlanSchema);
export default DailyPlan;
