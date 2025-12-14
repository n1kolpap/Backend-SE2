Workflow:
1. Αρχικο prompt στο llm (1 φορα):
```
DO NOT REPLY YET
I'm testing the backend of a javascript app. Im sending you the readme (README.md) and the api in two separate files (triptrail.yaml). Read them both. The backend runs on https://backend-se2-7y05.onrender.com and does not run on localhost:3000 as it may say in the readme. The tests should be in ava. I already have set `"type": "module"` set.
DO NOT REPLY YET, WAIT FOR MY NEXT MESSAGE
```
(Στελνουμε `README.md` και `triptrail.yaml`)
2. Prompt στο llm για καθε τεστ που θελουμε να κανει:
```
Write a test in js using ava for the *.js file I sent you with enough comments
```
(στελνουμε το αντιστοιχο αρχειο, και αντικαθιστουμε το `*` με το σωστο ονομα)
3. Τεσταρουμε με `npm test`
4. Προσθετουμε στην αρχη του αρχειου που κανει (μονο αν δεν τρεχει, πιθανον αχρηστο και πιθανον να μην ευθυνεται αμα δεν τρεχει)
```javascript
import http from "node:http"; 
import test from "ava"; 
import got from "got"; 
import app from "../app.js";
import dotenv from "dotenv";
dotenv.config();
```
4. Αν βαλει αλλη καταληξη (πχ `.mjs`), το αλλαζουμε σε `.js`

ολα αυτα commit/push σε δικο μας branch και βλεπουμε αν επιτυγχανει το τεστ προτου κανουμε pull request για merge
