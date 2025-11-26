import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import errorHandler from './middleware/errorHandler.js';
import routes from './routes/index.js';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();
connectDB();

// Middleware
app.use(bodyParser.json());
app.use('/api', routes);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
