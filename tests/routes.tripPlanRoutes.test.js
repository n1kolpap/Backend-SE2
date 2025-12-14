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

const JaneSmith = {
		username: "jane_smith",
        password: "password123"
	};

// Login to get token
	const loginResponse = await t.context.got.put("api/user/login", {
		json: {
			username: JaneSmith.username,
			password: JaneSmith.password
		}
	});

t.context.token = loginResponse.body.data.token;
t.context.userId = loginResponse.body.data.user.userId;


});




test.after.always((t) => {
	t.context.server.close();
});


// tripPlanRoutes

test("POST tripPlan - should create trip with valid data", async (t) => {
	const newTrip = {
		destination: "Barcelona, Spain",
		origin: "New York, USA",
		startDate: "2025-08-15",
		endDate: "2025-08-20",
		budget: 2500,
		purpose: "vacation",
		interests: ["architecture", "food", "beaches"],
		notes: "First time in Spain!"
	};
	
	const { body, statusCode } = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan`,
		{
			json: newTrip,
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	// Check response
	t.is(statusCode, 201);
	t.true(body.success);
	t.is(body.message, "Trip plan created successfully");
	
	// Check data matches what we sent
	t.truthy(body.data.tripId, "Should generate trip ID");
	t.is(body.data.userId, t.context.userId);
	t.is(body.data.destination, newTrip.destination);
	t.is(body.data.origin, newTrip.origin);
	t.is(body.data.startDate, newTrip.startDate);
	t.is(body.data.endDate, newTrip.endDate);
	t.is(body.data.budget, newTrip.budget);
	t.is(body.data.purpose, newTrip.purpose);
	t.deepEqual(body.data.interests, newTrip.interests);
	t.is(body.data.notes, newTrip.notes);
	
	// Check default values
	t.true(Array.isArray(body.data.collaborators));
	t.truthy(body.data.createdAt);

});




test("POST tripPlan - should reject missing destination", async (t) => {
	const invalidTrip = {
		// destination missing!
		origin: "New York, USA",
		startDate: "2025-08-15",
		endDate: "2025-08-20"
	};
	
	const { body, statusCode } = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan`,
		{
			json: invalidTrip,
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 400);
	t.false(body.success);
	t.is(body.message, "Validation failed");
	t.is(body.error[0].msg,"Destination is required")
	
});



test("POST tripPlan - should reject missing dates", async (t) => {
	const invalidTrip = {
		destination: "Barcelona, Spain",
		// startDate and endDate missing!
	};
	
	const { body, statusCode } = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan`,
		{
			json: invalidTrip,
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 400);
	t.false(body.success);
	t.is(body.message, "Validation failed");
	t.is(body.error[0].msg,"Start date is required");
    t.is(body.error[1].msg,"Invalid start date format");
    t.is(body.error[2].msg,"End date is required");
    t.is(body.error[3].msg,"Invalid end date format");
});



test("POST tripPlan - should reject endDate before startDate", async (t) => {
	const invalidTrip = {
		destination: "Barcelona, Spain",
		startDate: "2025-08-20",
		endDate: "2025-08-15"  // Before start date
	};
	
	const { body, statusCode } = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan`,
		{
			json: invalidTrip,
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 400);
	t.false(body.success);
	t.is(body.message, "Validation failed");
	t.is(body.error[0].msg,"End date must be after start date");
});



test("POST tripPlan - should work with minimal required fields", async (t) => {
	const minimalTrip = {
		destination: "Rome, Italy",
		startDate: "2025-10-01",
		endDate: "2025-10-05"
		// Optional fields omitted
	};
	
	const { body, statusCode } = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan`,
		{
			json: minimalTrip,
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 201);
	t.true(body.success);
	t.is(body.data.destination, minimalTrip.destination);
    t.is(body.data.startDate, minimalTrip.startDate);
    t.is(body.data.endDate, minimalTrip.endDate);
});



test("GET tripPlan - should get trip with valid token", async (t) => {
	// First create a trip to retrieve
	const newTrip = {
		destination: "Tokyo, Japan",
		startDate: "2025-11-01",
		endDate: "2025-11-10",
		budget: 3500
	};
	
	const createResponse = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan`,
		{
			json: newTrip,
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	const tripId = createResponse.body.data.tripId;
	
	// Now retrieve it
	const { body, statusCode } = await t.context.got.get(
		`api/user/${t.context.userId}/tripPlan/${tripId}`,
		{
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 200);
	t.true(body.success);
	t.is(body.message, "Trip plan retrieved successfully");
	t.is(body.data.tripId, tripId);
	t.is(body.data.destination, newTrip.destination);
	t.is(body.data.budget, newTrip.budget);
});


test("PUT tripPlan - should update trip with valid data", async (t) => {
	// Create trip first
	const createResponse = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan`,
		{
			json: {
				destination: "Berlin, Germany",
				startDate: "2025-07-01",
				endDate: "2025-07-05",
				budget: 1500
			},
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	const tripId = createResponse.body.data.tripId;
	
	// Update it
	const updates = {
		destination: "Munich, Germany",  // Changed
		budget: 2000,                     // Changed
		notes: "Added Munich visit!"      // New field
	};
	
	const { body, statusCode } = await t.context.got.put(
		`api/user/${t.context.userId}/tripPlan/${tripId}`,
		{
			json: updates,
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 200);
	t.true(body.success);
	t.is(body.message, "Trip plan updated successfully");
	t.is(body.data.destination, updates.destination);
	t.is(body.data.budget, updates.budget);
	t.is(body.data.notes, updates.notes);
});



test("PUT tripPlan - should return 404 for non-existent trip", async (t) => {
	const { body, statusCode } = await t.context.got.put(
		`api/user/${t.context.userId}/tripPlan/non-existent-trip`,
		{
			json: { destination: "Updated Destination" },
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 404);
	t.false(body.success);
    t.is(body.message, "Trip plan not found");
    t.truthy(body.error === null);
});



test("DELETE tripPlan - should delete trip with valid token", async (t) => {
	// Create trip first
	const createResponse = await t.context.got.post(
		`api/user/${t.context.userId}/tripPlan`,
		{
			json: {
				destination: "Vienna, Austria",
				startDate: "2025-05-01",
				endDate: "2025-05-05"
			},
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	const tripId = createResponse.body.data.tripId;
	
	// Delete it
	const { body, statusCode } = await t.context.got.delete(
		`api/user/${t.context.userId}/tripPlan/${tripId}`,
		{
			headers: { Authorization: `Bearer ${t.context.token}` }
		}
	);
	
	t.is(statusCode, 200);
	t.true(body.success);
	t.is(body.message, "Trip plan deleted successfully");

});
