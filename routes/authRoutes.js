/**
 * Authentication routes
 */

import express from 'express';
import * as authController from '../controllers/authController.js';
import { signupValidation, loginValidation } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route POST /api/user
 * @desc Sign up new user
 * @access Public
 */
router.post('/user', signupValidation, authController.signup);

/**
 * @route PUT /api/user/login
 * @desc Login user
 * @access Public
 */
router.put('/user/login', loginValidation, authController.login);

export default router;