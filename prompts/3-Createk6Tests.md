# 3rd Deliverable - k6 tests
## Setup
DO NOT REPLY YET TO THIS MESSAGE
You will need the following instructions to create spike/load tests with k6 (!) for the system.

I'm providing you the README.md which contains info on how to to access the api. Read it.
I'm providing you the triptrail.yaml which is the api. Read it.

I will later provide you with each target route to test and the type of each test I want you to do.

In the test there should be variables so that the developer can easily set:
- the target root url (should be http://localhost:3000 by default)
- the max virtual users (VUs)
- the max duration during a ramping stage
- the max duration of whole test
- the credentials of the user that logs in (should use the john_doe by default as you see in the readme)
- the p95variable that is part of http_req_duration p(95) threshold
- the p99variable that is part of http_req_duration p(99) threshold
- the rateVariable that is part of http_req_failed rate threshold

Start VUs should be 0.

thresholds to use:
```js
thresholds:{
	http_req_duration: [{threshold: 'p(95))<p95variable', abortOnFail: true}],
	http_req_duration: ['p(99)<p99variable'],
	http_req_failed: [{threshold: 'rate<rateVariable', abortOnFail: true}],
}
```

Useful snippets you may or may not need:
```js
check(resp, { 'Is status 200?': (r) => r.status === 200 });
check(resp, { 'Is status 2xx?': (r) => Math.floor(r.status/100) === 2 });
check(resp, { 'Is status 4xx?': (r) => Math.floor(r.status/100) === 4 });

sleep(Math.random()*5);
```
DO NOT REPLY YET TO THIS MESSAGE, WAIT FOR MY NEXT 

## Instructions per test
- Create a load test in js with comments and test a user logging in.
- Create a spike test in js with comments and test a user logging in.
- Create a load test in js with comments and test the following in that order:
A user logs in.
Creates a new trip plan with this json:
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
Deletes this trip plan
- Create a spike test in js with comments and test the following in that order:
A user logs in.
Creates a new trip plan with this json:
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
Deletes this trip plan
