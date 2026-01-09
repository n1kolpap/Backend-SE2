# TripTrail REST API

A production-ready Node.js/Express REST API for the TripTrail travel planning application.

## 📋 Features

- ✅ User authentication (signup/login with JWT)
- ✅ Trip plan CRUD operations
- ✅ Daily plan management
- ✅ Activity management (add, remove, complete)
- ✅ Notes for daily plans
- ✅ In-memory data storage (mock data)
- ✅ Complete error handling
- ✅ Input validation
- ✅ Authentication middleware
- ✅ Request logging

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Extract the project files

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
```

4. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## 📁 Project Structure

```
triptrail-api/
├── config/
│   └── constants.js          # Application constants
├── controllers/
│   ├── authController.js     # Authentication handlers
│   ├── tripPlanController.js # Trip plan handlers
│   └── dailyPlanController.js # Daily plan handlers
├── docs/
│   └── triptrail.yaml       # Api documentation
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── validation.js        # Input validation
│   ├── errorHandler.js      # Error handling
│   └── logger.js            # Request logging
├── models/
│   ├── User.js              # User data model
│   ├── TripPlan.js          # Trip plan data model
│   └── DailyPlan.js         # Daily plan data model
├── routes/
│   ├── authRoutes.js        # Auth routes
│   ├── tripPlanRoutes.js    # Trip plan routes
│   ├── dailyPlanRoutes.js   # Daily plan routes
│   └── index.js             # Routes aggregator
├── services/
│   ├── authService.js       # Auth business logic
│   ├── tripPlanService.js   # Trip plan business logic
│   └── dailyPlanService.js  # Daily plan business logic
├── tests/                   # Tests (mainly for ava)
│   └── k6/                  # Tests for k6 only
├── utils/
│   ├── responses.js         # Response helpers
│   └── helpers.js           # Utility functions
├── app.js                   # Express app setup
├── server.js                # Server entry point
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🔑 Mock Users

The API includes pre-configured mock users:

**User 1:**
- Username: `john_doe`
- Password: `password123`
- User ID: `user-1`

**User 2:**
- Username: `jane_smith`
- Password: `password123`
- User ID: `user-2`

## 🌐 API Endpoints

### Authentication (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/user` | Sign up new user |
| PUT | `/api/user/login` | Login user |

### Trip Plans (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/user/:userId/tripPlan` | Create trip plan |
| GET | `/api/user/:userId/tripPlan/:tripId` | Get trip plan |
| PUT | `/api/user/:userId/tripPlan/:tripId` | Update trip plan |
| DELETE | `/api/user/:userId/tripPlan/:tripId` | Delete trip plan |

### Daily Plans (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/:userId/tripPlan/:tripId/dailyPlan` | Get all daily plans |
| POST | `/api/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity` | Add activity |
| DELETE | `/api/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity/:activityId` | Remove activity |
| POST | `/api/user/:userId/tripPlan/:tripId/dailyPlan/:date/activity/:activityId/completed` | Mark activity completed |
| POST | `/api/user/:userId/tripPlan/:tripId/dailyPlan/:date/note` | Add note to daily plan |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## 🧪 Testing with Postman

### Step 1: Login to Get Token

**Request:**
```
PUT http://localhost:3000/api/user/login
```

**Body (JSON):**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "user": {
      "userId": "user-1",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**IMPORTANT:** Copy the `token` from the response. You'll need it for all protected routes.

### Step 2: Set Authorization Header

For all subsequent requests, add the Authorization header:
```
Authorization: Bearer <your_token_here>
```

In Postman:
1. Go to the "Authorization" tab
2. Select "Bearer Token" from the Type dropdown
3. Paste your token in the Token field

### Step 3: Create a Trip Plan

**Request:**
```
POST http://localhost:3000/api/user/user-1/tripPlan
```

**Headers:**
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "destination": "Barcelona, Spain",
  "origin": "New York, USA",
  "startDate": "2025-08-15",
  "endDate": "2025-08-20",
  "budget": 2500,
  "purpose": "vacation",
  "interests": ["architecture", "food", "beaches"],
  "notes": "First time in Spain!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trip plan created successfully",
  "data": {
    "tripId": "1732567890123-abc123",
    "userId": "user-1",
    "destination": "Barcelona, Spain",
    "origin": "New York, USA",
    "startDate": "2025-08-15",
    "endDate": "2025-08-20",
    "budget": 2500,
    "purpose": "vacation",
    "interests": ["architecture", "food", "beaches"],
    "notes": "First time in Spain!",
    "collaborators": [],
    "createdAt": "2025-11-25T21:00:00.000Z"
  }
}
```

**Copy the `tripId` for the next steps.**

### Step 4: Get All Daily Plans

**Request:**
```
GET http://localhost:3000/api/user/user-1/tripPlan/<tripId>/dailyPlan
```

**Headers:**
```
Authorization: Bearer <your_token>
```

### Step 5: Add Activity to Daily Plan

**Request:**
```
POST http://localhost:3000/api/user/user-1/tripPlan/<tripId>/dailyPlan/2025-08-15/activity
```

**Headers:**
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Visit Sagrada Familia",
  "location": "C. de Mallorca, 401, Barcelona",
  "time": "10:00",
  "notes": "Book tickets online in advance"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Activity added successfully",
  "data": {
    "activityId": "1732567890456-xyz789",
    "name": "Visit Sagrada Familia",
    "location": "C. de Mallorca, 401, Barcelona",
    "time": "10:00",
    "completed": false,
    "notes": "Book tickets online in advance"
  }
}
```

**Copy the `activityId` for the next steps.**

### Step 6: Mark Activity as Completed

**Request:**
```
POST http://localhost:3000/api/user/user-1/tripPlan/<tripId>/dailyPlan/2025-08-15/activity/<activityId>/completed
```

**Headers:**
```
Authorization: Bearer <your_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Activity marked as completed",
  "data": {
    "activityId": "1732567890456-xyz789",
    "name": "Visit Sagrada Familia",
    "location": "C. de Mallorca, 401, Barcelona",
    "time": "10:00",
    "completed": true,
    "notes": "Book tickets online in advance"
  }
}
```

### Step 7: Add Note to Daily Plan

**Request:**
```
POST http://localhost:3000/api/user/user-1/tripPlan/<tripId>/dailyPlan/2025-08-15/note
```

**Headers:**
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "note": "Weather looks great! Don't forget sunscreen."
}
```

### Step 8: Remove Activity

**Request:**
```
DELETE http://localhost:3000/api/user/user-1/tripPlan/<tripId>/dailyPlan/2025-08-15/activity/<activityId>
```

**Headers:**
```
Authorization: Bearer <your_token>
```

### Step 9: Update Trip Plan

**Request:**
```
PUT http://localhost:3000/api/user/user-1/tripPlan/<tripId>
```

**Headers:**
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "budget": 3000,
  "notes": "Increased budget for more activities"
}
```

### Step 10: Delete Trip Plan

**Request:**
```
DELETE http://localhost:3000/api/user/user-1/tripPlan/<tripId>
```

**Headers:**
```
Authorization: Bearer <your_token>
```

## 📝 Complete Testing Sequence

Here's a full testing flow in order:

1. **Login** → Get token
2. **Create Trip Plan** → Get tripId
3. **Get Daily Plans** → See empty daily plans for each date
4. **Add Activity** → Get activityId
5. **Add Another Activity** → Add multiple activities
6. **Get Daily Plans** → See activities in the plan
7. **Mark Activity Completed** → Complete an activity
8. **Add Note** → Add note to a daily plan
9. **Update Trip Plan** → Change trip details
10. **Remove Activity** → Delete an activity
11. **Get Trip Plan** → See updated trip with changes
12. **Delete Trip Plan** → Clean up

## 🛠️ Testing Tips

### In Postman:

1. **Save your token**: Create an environment variable called `token` and save the JWT token there
2. **Use variables**: Create variables for `userId` and `tripId` to reuse in multiple requests
3. **Create a Collection**: Save all requests in a Postman collection for easy access
4. **Use Tests**: Add test scripts to automatically extract token and IDs

Example environment variables:
- `baseUrl`: `http://localhost:3000/api`
- `token`: `<paste_your_token>`
- `userId`: `user-1`
- `tripId`: `<paste_trip_id>`

Then use them in requests:
```
{{baseUrl}}/user/{{userId}}/tripPlan/{{tripId}}/dailyPlan
```

## 🔍 Response Format

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

## 🚨 Common Errors

| Status Code | Message | Solution |
|-------------|---------|----------|
| 400 | Validation failed | Check request body format |
| 401 | Unauthorized | Login and provide valid token |
| 403 | Access denied | Use correct userId in path |
| 404 | Not found | Check tripId/activityId exists |
| 409 | Username already exists | Choose different username |
| 500 | Internal server error | Check server logs |

## 🔐 Security Notes

- JWT tokens expire after 7 days (configurable)
- Passwords are hashed with bcrypt
- All trip/activity operations require authentication
- Users can only access their own trips

## 📊 Mock Data

The API includes pre-populated mock data:
- 2 users (john_doe, jane_smith)
- 2 trip plans
- Multiple daily plans with activities

You can test with existing data or create new entries.

## 🎯 Development

### Running in Development Mode
```bash
npm run dev
```
Uses nodemon for auto-restart on file changes.

### Running in Production Mode
```bash
npm start
```

## 📦 Dependencies

- **express**: Web framework
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **express-validator**: Input validation
- **cors**: CORS middleware
- **dotenv**: Environment variables
- **morgan**: HTTP request logger

## 🤝 Support

For issues or questions:
1. Check the logs in the console
2. Verify your token is valid and not expired
3. Ensure all required fields are included in requests
4. Check that date formats are YYYY-MM-DD

## 🎢 Max Supported Users
The system handle:
1. Logging in and checking the health of the site:
	1. Routes:
		- `GET /api/health`
		- `PUT /api/user/login`
	2. Load test:
		- 0 to 3072 VUs in 30se
		- hold for 60s
		- 3072 to 0 VUs in 30s
	3. Spike test:
		- 0 to 2048 VUs in 10s
		- hold for 25s
		- 2048 to 0 VUs in 10s
2. Logging in, creating a trip plan and deleting the trip plan:
	1. Routes:
		- `PUT /api/user/login`
		- `POST /api/user/{userId}/tripPlan`
		- `DELETE /api/user/{userId}/tripPlan/{tripId}`
	2. Load test:
		- 0 to 384 VUs in 30s
		- hold for 60s
		- 384 to 0 VUs in 30s
	3. Spike test:
		- 0 to 128 VUs in 10s
		- hold for 25s
		- 128 to 0 VUs in 10s
In all cases, thresholds:
- `http_req_duration`:
    - threshold: `p(95)`<800ms, `abortOnFail`: true,
    - threshold: `p(99)`<1200ms
- `http_req_failed`:
    - threshold: `rate`<0.001, `abortOnFail`: true

## 📄 License

GPL V3
