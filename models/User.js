/**
 * User Model
 * In-memory user data structure
 */

import { generateId } from '../utils/helpers.js';

// Mock users database
// Plain text passwords for testing
export const users = [
  {
    userId: 'user-1',
    username: 'john_doe',
    password: 'password123',
    email: 'john@example.com',
    createdAt: new Date('2025-01-01')
  },
  {
    userId: 'user-2',
    username: 'jane_smith',
    password: 'password123',
    email: 'jane@example.com',
    createdAt: new Date('2025-01-02')
  }
];

/**
 * User class representing user data structure
 */
export class User {
  constructor(username, password, email) {
    this.userId = generateId();
    this.username = username;
    this.password = password;
    this.email = email;
    this.createdAt = new Date();
  }
}

/**
 * Find user by username
 * @param {string} username - Username to search
 * @returns {Object|null} User object or null
 */
export const findByUsername = (username) => {
  return users.find(user => user.username === username) || null;
};

/**
 * Find user by ID
 * @param {string} userId - User ID to search
 * @returns {Object|null} User object or null
 */
export const findById = (userId) => {
  return users.find(user => user.userId === userId) || null;
};

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Object} Created user
 */
export const createUser = (userData) => {
  const newUser = new User(userData.username, userData.password, userData.email);
  users.push(newUser);
  return newUser;
};