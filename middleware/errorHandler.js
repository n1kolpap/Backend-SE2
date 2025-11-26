/**
 * Centralized error handler
 */
const errorHandler = (err, req, res, next) => {
	if (res.headersSent) {
		return next(err);
	}
	res.status(500).json({ success: false, error: err.message });
};

export default errorHandler;
