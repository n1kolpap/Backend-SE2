/**
 * Authentication service
 * Business logic for user authentication
 */

import jwt from 'jsonwebtoken';
import { findByUsername, createUser } from '../models/User.js';

/**
 * Register new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user (without password)
 * @throws {Error} If username already exists
 */
export const registerUser = async (userData) => {
    // Check if user already exists
    const existingUser = findByUsername(userData.username);
    
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // Create user with plain password (no hashing for simplicity)
    const user = createUser({
      username: userData.username,
      password: userData.password,
      email: userData.email
    });
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

/**
 * Login user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} User data and JWT token
 * @throws {Error} If credentials are invalid
 */
export const loginUser = async (username, password) => {
  // Find user
  const user = findByUsername(username);

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password (simple string comparison)
  if (user.password !== password) {
    throw new Error('Invalid credentials');
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.userId, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Return user data and token
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token
  };
};
