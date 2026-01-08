/**
 * TripPlan Model
 * In-memory trip plan data structure
 */

import { generateId, generateDateRange } from '../utils/helpers.js';

// Mock trip plans database
export const tripPlans = [
  {
    tripId: 'trip-1',
    userId: 'user-1',
    destination: 'Paris, France',
    origin: 'New York, USA',
    startDate: '2025-06-01',
    endDate: '2025-06-07',
    budget: 3000,
    purpose: 'vacation',
    interests: ['sightseeing', 'museums', 'food'],
    notes: 'First trip to Paris!',
    collaborators: [],
    createdAt: new Date('2025-01-15')
  },
  {
    tripId: 'trip-2',
    userId: 'user-2',
    destination: 'Tokyo, Japan',
    origin: 'London, UK',
    startDate: '2025-07-10',
    endDate: '2025-07-20',
    budget: 5000,
    purpose: 'business',
    interests: ['technology', 'culture', 'food'],
    notes: 'Business conference plus sightseeing',
    collaborators: [],
    createdAt: new Date('2025-01-20')
  }
];

/**
 * TripPlan class representing trip plan data structure
 */
export class TripPlan {
  constructor(userId, tripData) {
    this.tripId = generateId();
    this.userId = userId;
    this.destination = tripData.destination;
    this.origin = tripData.origin || null;
    this.startDate = tripData.startDate;
    this.endDate = tripData.endDate;
    this.budget = tripData.budget || 0;
    this.purpose = tripData.purpose || null;
    this.interests = tripData.interests || [];
    this.notes = tripData.notes || '';
    this.collaborators = tripData.collaborators || [];
    this.createdAt = new Date();
  }
}

/**
 * Find all trip plans by user ID
 * @param {string} userId - User ID
 * @returns {Array} Array of trip plans
 */
export const findByUserId = (userId) => {
  return tripPlans.filter(trip => trip.userId === userId);
};

/**
 * Find trip plan by ID
 * @param {string} tripId - Trip ID
 * @returns {Object|null} Trip plan object or null
 */
export const findById = (tripId) => {
  return tripPlans.find(trip => trip.tripId === tripId) || null;
};

/**
 * Create new trip plan
 * @param {string} userId - User ID
 * @param {Object} tripData - Trip data
 * @returns {Object} Created trip plan
 */
export const createTripPlan = (userId, tripData) => {
  const newTrip = new TripPlan(userId, tripData);
  tripPlans.push(newTrip);
  return newTrip;
};

/**
 * Update trip plan
 * @param {string} tripId - Trip ID
 * @param {Object} updateData - Data to update
 * @returns {Object|null} Updated trip plan or null
 */
export const updateTripPlan = (tripId, updateData) => {
  const tripIndex = tripPlans.findIndex(trip => trip.tripId === tripId);
  
  if (tripIndex === -1) return null;
  
  tripPlans[tripIndex] = {
    ...tripPlans[tripIndex],
    ...updateData,
    tripId: tripPlans[tripIndex].tripId,
    userId: tripPlans[tripIndex].userId,
    createdAt: tripPlans[tripIndex].createdAt
  };
  
  return tripPlans[tripIndex];
};

/**
 * Delete trip plan
 * @param {string} tripId - Trip ID
 * @returns {boolean} Success status
 */
export const deleteTripPlan = (tripId) => {
  const tripIndex = tripPlans.findIndex(trip => trip.tripId === tripId);
  
  if (tripIndex === -1) return false;
  
  tripPlans.splice(tripIndex, 1);
  return true;
};
