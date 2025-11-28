/**
 * DailyPlan Model
 * In-memory daily plan and activity data structure
 */

import { generateId } from '../utils/helpers.js';

// Mock daily plans database
export const dailyPlans = [
  {
    dailyPlanId: 'daily-1',
    tripId: 'trip-1',
    date: '2025-06-01',
    activities: [
      {
        activityId: 'activity-1',
        name: 'Visit Eiffel Tower',
        location: 'Champ de Mars, Paris',
        time: '10:00',
        completed: false,
        notes: 'Book tickets in advance'
      },
      {
        activityId: 'activity-2',
        name: 'Lunch at Le Jules Verne',
        location: 'Eiffel Tower, Paris',
        time: '13:00',
        completed: false,
        notes: ''
      }
    ],
    notes: 'First day in Paris!'
  },
  {
    dailyPlanId: 'daily-2',
    tripId: 'trip-1',
    date: '2025-06-02',
    activities: [
      {
        activityId: 'activity-3',
        name: 'Louvre Museum',
        location: 'Rue de Rivoli, Paris',
        time: '09:00',
        completed: false,
        notes: 'See Mona Lisa'
      }
    ],
    notes: ''
  }
];

/**
 * Activity class representing activity data structure
 */
export class Activity {
  constructor(activityData) {
    this.activityId = generateId();
    this.name = activityData.name;
    this.location = activityData.location || '';
    this.time = activityData.time;
    this.completed = false;
    this.notes = activityData.notes || '';
  }
}

/**
 * Find daily plans by trip ID
 * @param {string} tripId - Trip ID
 * @returns {Array} Array of daily plans
 */
export const findByTripId = (tripId) => {
  return dailyPlans.filter(plan => plan.tripId === tripId);
};

/**
 * Find daily plan by trip ID and date
 * @param {string} tripId - Trip ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object|null} Daily plan object or null
 */
export const findByTripAndDate = (tripId, date) => {
  return dailyPlans.find(plan => plan.tripId === tripId && plan.date === date) || null;
};

/**
 * Create or get daily plan
 * @param {string} tripId - Trip ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object} Daily plan
 */
export const getOrCreateDailyPlan = (tripId, date) => {
  let dailyPlan = findByTripAndDate(tripId, date);
  
  if (!dailyPlan) {
    dailyPlan = {
      dailyPlanId: generateId(),
      tripId,
      date,
      activities: [],
      notes: ''
    };
    dailyPlans.push(dailyPlan);
  }
  
  return dailyPlan;
};

/**
 * Add activity to daily plan
 * @param {string} tripId - Trip ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} activityData - Activity data
 * @returns {Object} Added activity
 */
export const addActivity = (tripId, date, activityData) => {
  const dailyPlan = getOrCreateDailyPlan(tripId, date);
  const newActivity = new Activity(activityData);
  dailyPlan.activities.push(newActivity);
  return newActivity;
};

/**
 * Remove activity from daily plan
 * @param {string} tripId - Trip ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} activityId - Activity ID
 * @returns {boolean} Success status
 */
export const removeActivity = (tripId, date, activityId) => {
  const dailyPlan = findByTripAndDate(tripId, date);
  
  if (!dailyPlan) return false;
  
  const activityIndex = dailyPlan.activities.findIndex(
    activity => activity.activityId === activityId
  );
  
  if (activityIndex === -1) return false;
  
  dailyPlan.activities.splice(activityIndex, 1);
  return true;
};

/**
 * Mark activity as completed
 * @param {string} tripId - Trip ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} activityId - Activity ID
 * @returns {Object|null} Updated activity or null
 */
export const markActivityCompleted = (tripId, date, activityId) => {
  const dailyPlan = findByTripAndDate(tripId, date);
  
  if (!dailyPlan) return null;
  
  const activity = dailyPlan.activities.find(
    activity => activity.activityId === activityId
  );
  
  if (!activity) return null;
  
  activity.completed = true;
  return activity;
};

/**
 * Add note to daily plan
 * @param {string} tripId - Trip ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} note - Note text
 * @returns {Object} Updated daily plan
 */
export const addNote = (tripId, date, note) => {
  const dailyPlan = getOrCreateDailyPlan(tripId, date);
  dailyPlan.notes = note;
  return dailyPlan;
};