/**
 * Application constants
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

export const MESSAGES = {
  USER_CREATED: 'User created successfully',
  USER_LOGGED_IN: 'User logged in successfully',
  TRIP_CREATED: 'Trip plan created successfully',
  TRIP_UPDATED: 'Trip plan updated successfully',
  TRIP_DELETED: 'Trip plan deleted successfully',
  TRIP_NOT_FOUND: 'Trip plan not found',
  ACTIVITY_ADDED: 'Activity added successfully',
  ACTIVITY_REMOVED: 'Activity removed successfully',
  ACTIVITY_COMPLETED: 'Activity marked as completed',
  ACTIVITY_NOT_FOUND: 'Activity not found',
  NOTE_ADDED: 'Note added successfully',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_CREDENTIALS: 'Invalid username or password',
  SERVER_ERROR: 'Internal server error'
};

export const ACTIVITY_TYPES = [
  'sightseeing',
  'restaurant',
  'museum',
  'outdoor',
  'shopping',
  'entertainment',
  'relaxation'
];