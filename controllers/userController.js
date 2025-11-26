import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Create a new user
 */
export const createUser = async (req, res) => {
	try {
		const { email, password, username } = req.body;

		const hashedPassword = await bcrypt.hash(password, 10);
		const newUser = new User({ email, password: hashedPassword, username });
		await newUser.save();

		res.status(201).json({ success: true, message: 'User created', data: newUser });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};

/**
 * User login
 */
export const loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(401).json({ success: false, message: 'Invalid email or password' });
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(401).json({ success: false, message: 'Invalid email or password' });
		}

		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
		res.status(200).json({ success: true, token });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
};
