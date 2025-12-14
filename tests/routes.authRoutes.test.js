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
});

test.after.always((t) => {
	t.context.server.close();
});

 // test("GET /api returns correct response and status code", async (t) => {
 //	const { body, statusCode } = await t.context.got("api");
 //	t.is(body.message, "It works!");
 //	t.is(statusCode, 200);
 //});


// authRoute TESTS

test("POST /api/user - should successfully create user with valid data", async (t) => {
	const newUser = {
        username: "testuser",
		password: "SecurePass123!"
	};

	const { body, statusCode } = await t.context.got.post("api/user", {
		json: newUser  // This sends newUser as JSON in the request body
	});

	t.is(statusCode, 201, "Should return 201 Created status");
	t.truthy(body.data.userId, "Response should include a userId");
    t.truthy(body.data.username, "Response should include a username");
    t.truthy(body.message, "Response should include a message");

});



test("POST /api/user - should reject missing password", async (t) => {
	const incompleteUser = {
		username: "testuser",
		// password is missing!
	};

	const { body, statusCode } = await t.context.got.post("api/user", {
		json: incompleteUser
	});

	t.is(statusCode, 400);
	t.is(body.success, false);
    t.truthy(body.error);
    t.true(body.error.length > 0);
});


test("PUT /api/user/login logs in user", async (t) => {
    const { body, statusCode } = await t.context.got.put("api/user/login", {
        json: {
             username: "john_doe",
             password: "password123"
        }
    });

    t.is(statusCode, 200);
    t.truthy(body.success, "true");
    t.truthy(body.message);
    t.truthy(body.data);
    t.truthy(body.data.token) // Checks if the value is truthy (not null, undefined, false, 0, "", etc).
    t.truthy(body.data.user);
    t.is(body.data.user.username, "john_doe");

});

test("PUT /api/user/login - should reject non-existent user or wrong credentials", async (t) => {
	const fakeCredentials = {
		username: "doesnotexist",
		password: "SomePassword123!"
	};

	const { body, statusCode } = await t.context.got.put("api/user/login", {
		json: fakeCredentials
	});

	// Should return 401 Unauthorized (don't reveal if user exists or not!)
	t.is(statusCode, 401);
	t.is(body.error, null);
    t.is(body.success, false);
});


