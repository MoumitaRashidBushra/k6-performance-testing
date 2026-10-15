# DMoney E2E Flow — Postman Collection & Test Cases

Flow under test: register 2 Customers + 1 Agent + 1 Merchant → Admin activates them → SYSTEM deposits 5000 tk to Agent → Agent deposits 2000 tk to Customer 1 (assert deposit commission) → Customer 1 sends 1000 tk to Customer 2 (assert service fee) → Customer 2 cashes out 500 tk via Agent (assert service fee) → Customer 2 pays 400 tk to Merchant.

Built by reading the actual controllers (`deposit`, `sendMoney`, `withdraw`, `payment`, `user.controller.js`), not just the Swagger YAML, so every expected value below is a verified code fact, not a guess.

**Deliverable:** [`DMoney-E2E-Flow.postman_collection.json`](./DMoney-E2E-Flow.postman_collection.json) — import this directly into Postman. It contains all 30 test cases below as runnable requests with `pm.test` assertions wired in.

---

## Prerequisite — OTP dev bypass

Agent/Customer/Merchant logins are OTP-gated (2FA, §5.4 of CLAUDE.md). The OTP is only ever delivered by console log or Gmail — there is no API that returns it. To automate the flow in Postman, the collection uses the app's own documented bypass:

```
POST /user/verify-otp?env=dev
{ "identifier": "...", "otp": "1234" }
```

This only works if the OTP you send matches `process.env.DEFAULT_OTP` **and** the request has `?env=dev`. Your `.env` currently has no `DEFAULT_OTP` set, so:

1. Add `DEFAULT_OTP=1234` to `dmoney-transaction-api/.env`
2. Restart the API server (`npm run dev`)
3. Leave the collection's `defaultOtp` variable at `1234` (or change both to match)

**Never set `DEFAULT_OTP` outside your local/test environment** — CLAUDE.md §14 flags it as a live account-takeover bypass if it ever leaks into staging/prod.

Admin and SYSTEM logins skip OTP entirely (`user.controller.js` — role `Admin` or `phone_number === 'SYSTEM'`), so those two need no bypass.

---

## How the collection avoids collisions

Registration requires an 11-digit `phone_number` and a unique `@gmail.com` email (Joi `validateRegistration`). Re-running the same collection twice with hardcoded values would hit "already exists" 208s. The first request ("Init Test Data") has a **pre-request script** that generates fresh 11-digit phone numbers and `+tag` Gmail addresses from `Date.now()` and stores them as collection variables — every run creates brand-new accounts, so the collection is safely re-runnable and the flow's arithmetic (balances below) always starts from zero.

---

## Test Cases (30)

All amounts/messages are exact values taken from the controller source, assuming a fresh run (new accounts start at 0 balance). Fee/commission rules come from the seeded `Commissions` table: Deposit → Agent 2.5%; Withdraw → SYSTEM 1% (floor 5), Agent 2.5%; SendMoney → SYSTEM flat 5; Payment → SYSTEM 1% (floor 5).

| ID | Module | Title | Type | Steps | Test Data | Expected Result |
|---|---|---|---|---|---|---|
| TC01 | Registration | Register Customer 1 | Positive | POST `/user/register` | role=Customer, valid Gmail, 11-digit phone | 201, `status:"pending"`, `role:"Customer"` |
| TC02 | Registration | Register Customer 2 | Positive | POST `/user/register` | role=Customer | 201, `status:"pending"` |
| TC03 | Registration | Register Agent | Positive | POST `/user/register` | role=Agent | 201, `status:"pending"` |
| TC04 | Registration | Register Merchant | Positive | POST `/user/register` | role=Merchant | 201, `status:"pending"` |
| TC05 | Registration | Duplicate email rejected | Negative | Re-register with Customer 1's email | duplicate email | 208 "An account with this email already exists" |
| TC06 | Registration | Non-Gmail email rejected | Negative | POST `/user/register` | email @yahoo.com | 400 "Only Gmail addresses (@gmail.com) are accepted for registration." |
| TC07 | Registration | Disallowed role rejected | Negative | POST `/user/register`, `role:"Admin"` | role=Admin | 400 "Role must be one of: Customer, Agent, Merchant" |
| TC08 | Login | Admin login (no OTP) | Positive | POST `/user/login` (admin@dmoney.com/1234) | — | 200, JWT returned directly, `role:"Admin"`, no `otpRequired` |
| TC09 | Login | Admin wrong password | Negative | POST `/user/login`, bad password | — | 401 "Password incorrect" |
| TC10 | Login | SYSTEM login (no OTP) | Positive | POST `/user/login` (system@dmoney.com/1234) | — | 200, JWT returned directly, `role:"Agent"` (SYSTEM's DB role is Agent) |
| TC11 | Activation | Admin activates all 4 pending users | Positive | 4× PATCH `/user/update/:id`, `{status:"active"}`, admin token | — | 200 each, `user.status:"active"` |
| TC12 | Login/OTP | Agent completes OTP login | Positive | POST `/user/login` → POST `/user/verify-otp?env=dev` | dev-bypass OTP | Step 1: 200 `otpRequired:true`. Step 2: 200, JWT, `role:"Agent"` |
| TC13 | Login/OTP | Customer 1 completes OTP login | Positive | login → verify-otp (dev bypass) | — | Same pattern, `role:"Customer"` |
| TC14 | Login/OTP | Customer 2 completes OTP login | Positive | login → verify-otp (dev bypass) | — | Same pattern, `role:"Customer"` |
| TC15 | Login/OTP | Wrong OTP rejected | Negative | login (regenerate OTP) → verify-otp with `"0000"` | wrong code | 401 "Invalid OTP. Please try again." |
| TC16 | Security | Self status/role escalation is silently ignored | Security | Customer 1 PATCHes own record with `status:"suspended"`, `role:"Admin"` using own token, then re-fetches via search | non-admin self-update | PATCH: 200, `role`/`status` keys absent from echoed body (stripped server-side). Follow-up GET: still `status:"active"`, `role:"Customer"` |
| TC17 | Security | Cross-account balance read (BOLA) | Security / Known Gap | Customer 1 token calls GET `/transaction/balance/:account` for Customer 2's number | cross-account read | **Currently 200** with Customer 2's real balance — confirms the documented gap (CLAUDE.md §14): no ownership check on this endpoint. Flag for dev sign-off, not a bug in this collection |
| TC18 | Deposit | SYSTEM deposits 5000 to Agent | Positive | POST `/transaction/deposit`, `from:"SYSTEM"`, `to:agent`, `amount:5000`, SYSTEM token | Flow 1 (SYSTEM→Agent) | 201, `agentBalance: 5000`, no commission field |
| TC19 | Deposit | SYSTEM deposit to non-Agent rejected | Negative | same endpoint, `to:customer1` | — | 400 "SYSTEM account can only deposit to a regular Agent account..." |
| TC20 | Deposit | Agent deposits 2000 to Customer 1 — assert commission | Positive | POST `/transaction/deposit`, `from:agent`, `to:customer1`, `amount:2000`, agent token | Flow 2 (Agent→Customer), 2.5% commission | 201, `commission: 50` (2000×0.025), `currentBalance: 3050` (5000−2000+50) |
| TC21 | Deposit | Below minimum amount rejected | Negative | same endpoint, `amount:5` (min is 10) | — | 400 "Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk" |
| TC22 | Deposit | Unauthorized from_account rejected | Negative | Customer 1's token used with `from_account:agent` | wrong token | 403 "Unauthorized: you can only initiate transactions from your own account" |
| TC23 | Send Money | Customer 1 sends 1000 to Customer 2 — assert service fee | Positive | POST `/transaction/sendmoney`, `amount:1000`, customer1 token | flat fee 5 | 201, `fee: 5`, `currentBalance: 995` (2000−1000−5) |
| TC24 | Send Money | Non-Customer recipient rejected | Negative | `to_account:agent` | — | 400 "Send money is only allowed between two Customer accounts" |
| TC25 | Send Money | Insufficient balance rejected | Negative | `amount:100000` | — | 208 "Insufficient balance" |
| TC26 | Withdraw | Customer 2 cashes out 500 via Agent — assert service fee | Positive | POST `/transaction/withdraw`, `amount:500`, customer2 token, then GET balance on agent | 1% floor-5 fee | 201, `fee: 5` (max(500×0.01,5)), `currentBalance: 495` (1000−500−5). Agent balance check: `3562.5` (3050+500+12.5 commission) |
| TC27 | Withdraw | Non-Agent recipient rejected | Negative | `to_account:merchant` | — | 400 "To Account is not agent account" |
| TC28 | Withdraw | Below minimum amount rejected | Negative | `amount:5` (min 10) | — | 400 "Minimum withdraw amount is 10 tk" |
| TC29 | Payment | Customer 2 pays 400 to Merchant | Positive | POST `/transaction/payment`, `amount:400`, customer2 token, then GET balance on merchant | 1% floor-5 fee, no discount | 201, `fee: 5`, `currentBalance: 90` (495−400−5), no `discountedTotal`. Merchant balance check: exactly `400` — confirms the seeded 2.5% Merchant Commission rule is never applied (§7.4 known gap) |
| TC30 | Payment | Insufficient balance rejected | Negative | `amount:100000` | — | 208 "Insufficient balance" |

**Coverage note:** every negative case above maps to a real `if`/branch read directly in the controller source (role check, status check, amount-range check, authorization check, balance check) — no generic/checklist cases were added, and each "wrong recipient role" branch is tested once per transaction type rather than for all four (redundant equivalence class). TC16/TC17 are included because CLAUDE.md's own QA notes (§17) flag them as priority regression areas, not because every collection needs a security section.

---

## Step-by-step: how to build this yourself in Postman (using the Swagger endpoints)

This is the manual process the JSON collection above already encodes. Useful if you want to build it from scratch, extend it, or understand what each piece is doing.

### 1. Find the endpoints in Swagger first

Run the API (`npm run dev` in `dmoney-transaction-api/`) and open:
- `http://localhost:5000/api-docs/user` — registration, login, OTP, user CRUD
- `http://localhost:5000/api-docs/transaction` — deposit, withdraw, sendmoney, payment

For each endpoint you plan to call, note from Swagger: method, path, required body fields, and whether it needs auth. **Treat Swagger as a starting point only** — this project's Swagger YAML can drift from the code (CLAUDE.md calls this out explicitly), so cross-check request/response shape against the controller source before trusting an assertion to it. That's what I did above for every field name (`agentBalance`, `commission`, `fee`, `currentBalance`, etc.).

### 2. Create the collection and its variables

- Postman → **New → Collection**, name it (e.g. `DMoney E2E Flow`).
- Open the collection → **Variables** tab. Add (Current Value column):
  - `baseUrl` = `http://localhost:5000`
  - `partnerKey` = `ROADTOSDET` (must equal `PARTNER_KEY` in `.env`)
  - `defaultOtp` = `1234` (must equal `DEFAULT_OTP` in `.env`, see Prerequisite above)
  - `sharedPassword`, `sharedNid` — any values passing Joi (`min 4`/`min 7`)
  - Empty placeholders for everything you'll fill at runtime: `customer1Phone`, `customer1Email`, `customer1Id`, `customer1Token`, etc. (Postman doesn't require you to pre-declare these, but it's clearer if you do.)

### 3. Generate unique test data in a pre-request script

Add a first request (any cheap `GET {{baseUrl}}/`) whose **Pre-request Script** tab contains a snippet that derives unique phone numbers/emails from `Date.now()` and calls `pm.collectionVariables.set(...)`. This is what makes the collection safe to re-run — without it, every second run 208s on "duplicate email/phone."

### 4. Registration requests (no auth needed)

For each of Customer 1, Customer 2, Agent, Merchant:
- **Method/URL**: `POST {{baseUrl}}/user/register`
- **Body → raw → JSON**:
  ```json
  { "name": "...", "email": "{{customer1Email}}", "password": "{{sharedPassword}}",
    "phone_number": "{{customer1Phone}}", "nid": "{{sharedNid}}", "role": "Customer" }
  ```
- **Tests tab**: assert `pm.response.to.have.status(201)`, then pull `response.user.id` and save it: `pm.collectionVariables.set("customer1Id", pm.response.json().user.id)` — you'll need this `id` for the activation PATCH later.
- No `Authorization` or `X-AUTH-SECRET-KEY` header — this route has no auth middleware in `user.route.js`.

### 5. Admin & SYSTEM login (no OTP)

- `POST {{baseUrl}}/user/login`, body `{ "email": "{{adminEmail}}", "password": "{{adminPassword}}" }`
- **Tests tab**: capture the token: `pm.collectionVariables.set("adminToken", pm.response.json().token)`
- Repeat for SYSTEM (`system@dmoney.com` / `1234`) → `systemToken`. Both skip OTP because the controller special-cases `role === 'Admin'` or `phone_number === 'SYSTEM'`.

### 6. Set up the Authorization pattern you'll reuse everywhere else

Every write/transaction endpoint needs **two** headers (this is the part people usually get wrong first):
| Header | Value |
|---|---|
| `Authorization` | `Bearer {{adminToken}}` (swap in whichever token owns the action) |
| `X-AUTH-SECRET-KEY` | `{{partnerKey}}` |

Missing the secret-key header gives a 401 even with a perfectly valid JWT — that's `authenticateJWT` in `jwtMiddleware.js` checking both. The user-search endpoints (`/user/list`, `/user/search/*`) are the one exception — they use `publicAuthenticateJWT`, which wants **only** the `Authorization` header, no secret key.

### 7. Activate the 4 users

- `PATCH {{baseUrl}}/user/update/{{customer1Id}}`, headers = adminToken + secret key, body `{ "status": "active" }`
- Repeat for the other three IDs.
- **Tests**: assert `response.user.status === "active"`. Note the response only echoes back the fields you sent (`{status:"active"}`), not the full user record — don't assert on fields you didn't send.

### 8. Agent/Customer login via OTP

Two requests per identity:
1. `POST {{baseUrl}}/user/login` with email+password → 200 `{ otpRequired: true }` (no token yet).
2. `POST {{baseUrl}}/user/verify-otp?env=dev` with body `{ "identifier": "...", "otp": "{{defaultOtp}}" }` → 200 with the JWT. The `?env=dev` query param plus a matching `DEFAULT_OTP` is what lets you skip reading the real OTP from console/email (see Prerequisite section).
- Save each token: `agentToken`, `customer1Token`, `customer2Token`.

### 9. The money-movement requests

All four share one shape — `POST` with `Authorization` + `X-AUTH-SECRET-KEY` + a JSON body of `{ from_account, to_account, amount }` (payment also allows optional `discount_code`/`discount_amount`):

| Endpoint | from_account role | to_account role | Token to use |
|---|---|---|---|
| `/transaction/deposit` | Agent (incl. SYSTEM) | Agent (if from SYSTEM) or Customer | SYSTEM's or the Agent's own |
| `/transaction/sendmoney` | Customer | Customer | sender's own |
| `/transaction/withdraw` | Customer/Merchant | Agent | sender's own |
| `/transaction/payment` | Customer/Agent | Merchant | sender's own |

For each, the **Tests tab** is where the business rule gets verified — e.g. for the deposit to Customer 1:
```javascript
pm.test("commission is 2.5% of amount", function () {
    const json = pm.response.json();
    pm.expect(json.commission).to.eql(50);       // 2000 * 0.025
    pm.expect(json.currentBalance).to.eql(3050);  // 5000 - 2000 + 50
});
```
Get the exact expected numbers by reading the controller (`deposit.controller.js`, `sendMoney.controller.js`, etc.) rather than guessing — the fee/commission rates live in the `Commissions` DB table and are computed by `Commission.calcFee()`, not hardcoded in Swagger.

### 10. Chain everything with variables, not hardcoded values

Every downstream request references `{{customer1Phone}}`, `{{customer1Token}}`, etc. — never paste literal values, since a fresh run generates fresh accounts. This is what makes "Run collection" (Collection Runner) replay the entire 30-case flow unattended.

### 11. Run it

- Collection → **Run collection** → make sure the folders are ordered `00 → 01 → ... → 09` (registration must run before login must run before activation must run before OTP must run before the money flow — later steps depend on IDs/tokens/balances set by earlier ones).
- Review the Runner's pass/fail summary; any failing `pm.test` points at the exact assertion (and therefore the exact business rule) that broke.

---

## Known limitations of this collection (be upfront about these)

- **TC17 (BOLA)** and the `Merchant Commission never applied` fact baked into TC29 are *documented gaps*, not bugs introduced by the collection — they exist in the app today. If either gets fixed, the corresponding assertion needs to flip (403 instead of 200; commission included instead of excluded).
- Running the full flow performs **real writes** against whatever database `dmoney-transaction-api` is pointed at (local `dmoneydb` per `.env`). Don't point `baseUrl` at a shared/staging environment without knowing that.
- The Stripe cash-in flow (`/transaction/stripe/*`) and Admin→SYSTEM deposit (`/transaction/adminDeposit`) are out of scope — they weren't part of the requested flow.
