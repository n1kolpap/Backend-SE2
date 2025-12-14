import dotenv from "dotenv";
dotenv.config({ path: ".env.example" }); // or "./.env.example"

import http from "node:http"; 
import test from "ava"; 
import got from "got"; 
import app from "../app.js";


test.before(async (t) => {
	t.context.server = http.createServer(app);
    const server = t.context.server.listen();
    const { port } = server.address();
	t.context.got = got.extend({ responseType: "json", prefixUrl: `http://localhost:${port}`, throwHttpErrors: false });

// We create a test user so we can get a valid JWT token 

const testUser = {
		username: "testuser",
        password: "SecurePass123!"
	};

    // Sign up
	const signupResponse = await t.context.got.post("api/user", {
		json: testUser
	});

    // Login to get token
	const loginResponse = await t.context.got.put("api/user/login", {
		json: {
			username: testUser.username,
			password: testUser.password
		}
	});

t.context.token = loginResponse.body.data.token;
t.context.userId = loginResponse.body.data.user.userId;

// Creating a test trip plan

const testTrip = {
  "destination": "Barcelona, Spain",
  "origin": "New York, USA",
  "startDate": "2025-08-15",
  "endDate": "2025-08-20",
  "budget": 2500,
  "purpose": "vacation",
  "interests": ["architecture", "food", "beaches"],
  "notes": "First time in Spain!"
};

const tripResponse = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan`,
		{
			json: testTrip,
			headers: {
				Authorization: `Bearer ${t.context.token}`
			}
		}
	);

t.context.tripId = tripResponse.body.data.tripId;

// A random date withing our trip dates
t.context.testDate = "2025-08-16"; 

});



test.after.always((t) => {
	t.context.server.close();
});




// dailyPlanRoutes


test("GET /api/user/:userId/tripPlan/:tripId/dailyPlan - should get daily plans with valid token", async (t) => {
	// Request with authentication token in headers
	const { body, statusCode } = await t.context.got.get(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan`,
		{
			headers: {
				// Most APIs use "Authorization: Bearer <token>" format
				Authorization: `Bearer ${t.context.token}`
			}
		}
	);
	
	// Should succeed with valid token
	t.is(statusCode, 200);
	t.true(body.success);
	t.is(body.message, "Daily plans retrieved successfully");
	t.true(body.data.length>0);
	t.true(Array.isArray(body.data));
});


test("GET /api/user/:userId/tripPlan/:tripId/dailyPlan - should reject request without token", async (t) => {
	// Request WITHOUT authentication token
	const { body, statusCode } = await t.context.got.get(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan`
		// No headers and no token
	);
	
	// Should return 401 Unauthorized
	t.is(statusCode, 401);
	t.is(body.message, "Unauthorized access");
	t.false(body.success);
	t.is(body.error, "No token provided");
});


test("GET /api/user/:userId/tripPlan/:tripId/dailyPlan - should reject invalid token", async (t) => {
	const { body, statusCode } = await t.context.got.get(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan`,
		{
			headers: {
				Authorization: "Bearer Fake-Token-123"
			}
		}
	);
	
	t.is(statusCode, 401);
	t.false(body.success);
	t.is(body.message, "Unauthorized access");
	t.is(body.error, "Invalid token");
});


test("POST .../dailyPlan/:date/activity - should add activity with valid data", async (t) => {
	const newActivity = {
  		"name": "Visit Sagrada Familia",
 		 "location": "C. de Mallorca, 401, Barcelona",
 		 "time": "10:00",
 		 "notes": "Book tickets online in advance"
	};
	
	const { body, statusCode } = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan/${t.context.testDate}/activity`,
		{
			json: newActivity,
			headers: {
				Authorization: `Bearer ${t.context.token}`
			}
		}
	);
	
	t.is(statusCode, 201, "Should return 201 Created");
	t.true(body.success, "success should be true");
	t.is(body.message, "Activity added successfully");

	t.truthy(body.data.name);		// Activity name is required
	t.truthy(body.data.time);	    // Time is required

	t.is(body.data.name, newActivity.name, "Name should match");
	t.is(body.data.location, newActivity.location, "Location should match");
	t.is(body.data.time, newActivity.time, "Time should match");
	t.is(body.data.notes, newActivity.notes, "Notes should match");
});


test("DELETE .../activity/:activityId - should delete activity with valid token", async (t) => {
	// First, create an activity to delete
	const newActivity = {
		name: "Test Activity to Delete",
		time: "15:00"
	};
	
	const createResponse = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan/${t.context.testDate}/activity`,
		{
			json: newActivity,
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	// Extract the activity ID from response
	const activityId = createResponse.body.data.activityId;
	
	// Now delete it
	const { body, statusCode } = await t.context.got.delete(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan/${t.context.testDate}/activity/${activityId}`,
		{
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 200);
	t.true(body.success);
	t.is(body.message, "Activity removed successfully");
});



test("DELETE .../activity/:activityId - should reject without token", async (t) => {
	const { body, statusCode } = await t.context.got.delete(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan/${t.context.testDate}/activity/some-id`,
		{
			// No token!
		}
	);
	
	t.is(statusCode, 401);
	t.false(body.success);
	t.is(body.message, "Unauthorized access");
	t.is(body.error, "No token provided");
});



test("DELETE .../activity/:activityId - should return 404 for non-existent activity", async (t) => {
	const { body, statusCode } = await t.context.got.delete(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan/${t.context.testDate}/activity/non-existent-id`,
		{
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	

	t.true(statusCode === 404);
	t.false(body.success);
	t.is(body.message, "Activity not found");
	t.true(body.error === null);
});



test("POST .../activity/:activityId/completed - should mark activity as completed", async (t) => {
	// Create an activity first
	const newActivity = {
		name: "Activity to Complete",
		time: "16:00"
	};
	
	const createResponse = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan/${t.context.testDate}/activity`,
		{
			json: newActivity,
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	const activityId = createResponse.body.data.activityId;
	
	// Mark as completed
	const { body, statusCode } = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan/${t.context.testDate}/activity/${activityId}/completed`,
		{
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 200);
	t.is(body.message, "Activity marked as completed");
	t.true(body.data.completed);

});



test("POST .../dailyPlan/:date/note - should add note with valid data", async (t) => {
	const newNote = {
		note: "Remember to bring camera!"
	};
	
	const { body, statusCode } = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan/${t.context.testDate}/note`,
		{
			json: newNote,
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 200);
	t.is(body.message, "Note added successfully");
	t.truthy(body.data.notes);
	t.is(body.data.notes, newNote.note, "Notes should match");
});


test("POST .../dailyPlan/:date/note - should reject empty note content", async (t) => {
	const emptyNote = {
		note: ""  // Empty string
	};
	
	const { body, statusCode } = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan/${t.context.tripId}/dailyPlan/${t.context.testDate}/note`,
		{
			json: emptyNote,
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 400);
	t.false(body.success);
	t.is(body.message, "Validation failed");
	t.is(body.error[0].msg, "Note text is required");
});
