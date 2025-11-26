// import mongoose from 'mongoose';
//
// const userSchema = new mongoose.Schema({
// 	username: { type: String, required: true },
// 	password: { type: String, required: true },
// 	email: { type: String, required: true },
// }, { timestamps: true });	//bug?
//
// const User = mongoose.model('User', userSchema);
// export default User;

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
	username: { type: String, required: true },
	password: { type: String, required: true },
	email: { type: String, required: true },
	tripPlans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TripPlan' }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
