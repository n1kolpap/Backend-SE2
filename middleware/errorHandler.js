/**
 * Centralized error handler
 */
// const errorHandler = (err, req, res, next) => {
// 	if (res.headersSent) {
// 		return next(err);
// 	}
// 	res.status(500).json({ success: false, error: err.message });
// };
//
// export default errorHandler;

/**
 * Centralized error handler
 */
const errorHandler = (err, req, res, next) => {
	if (err.name === 'ValidationError') {
		return res.status(400).json({ success: false, message: 'Validation error', errors: err.errors });
	}

	if (err instanceof mongoose.Error.CastError) {
		return res.status(404).json({ success: false, message: 'Resource not found' });
	}

	if (res.headersSent) {
		return next(err);
	}

	res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
};

export default errorHandler;
