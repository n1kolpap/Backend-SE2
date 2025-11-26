import jwt from 'jsonwebtoken';

/**
 * Middleware to check authentication
 */
const auth = (req, res, next) => {
	const token = req.header('Authorization')?.split(' ')[1];
	if (!token) return res.status(401).json({ success: false, message: 'No token, authorization denied' });

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded.id;
		next();
	} catch (error) {
		res.status(401).json({ success: false, message: 'Token is not valid' });
	}
};

export default auth;
