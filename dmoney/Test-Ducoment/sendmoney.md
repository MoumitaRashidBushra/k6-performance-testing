# Send Money API Test Cases — Customer1 → Customer2, 1000 BDT

Endpoint: `POST /transaction/sendmoney`
Scenario: Customer1 (`01686606902`) sends 1000 BDT to Customer2 (`01686606903`)
Auth required: `Authorization: Bearer <JWT>` + `X-AUTH-SECRET-KEY: <partner key>`

All cases below are pure **API-level tests** — a single direct POST to this endpoint via Postman, asserting only the request/response contract. None of them touch the UI, a downstream statement/balance page, or another service, so none of them cross into integration testing; that boundary is called out per case in **Test Scope**.

---

### TC-001
**Test Title:** Verify that a valid 1000 BDT SendMoney request between two active Customers succeeds with correct fee and ledger effect
**Type:** Positive — (API)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — verifies this endpoint's response contract directly; does not verify the UI or any downstream statement view, so it stays within API testing and does not cross into integration testing.

**Preconditions:**
- Customer1 (`01686606902`) and Customer2 (`01686606903`) both exist, role `Customer`, status `active`.
- Customer1's live balance ≥ 1005 Tk (amount + flat 5 Tk fee) — re-verify via `GET /transaction/balance/01686606902` immediately before running, since balance is computed live and can drift.
- Valid JWT for Customer1 and a valid `X-AUTH-SECRET-KEY`.

**Test Data:**
- `from_account: 01686606902`, `to_account: 01686606903`, `amount: 1000`
- Headers: `Authorization: Bearer <Customer1 JWT>`, `X-AUTH-SECRET-KEY: <valid partner key>`

**Steps:**
1. Note Customer1's current balance.
2. POST to `/transaction/sendmoney` with the test data above.
3. Inspect the response status code and body.

**Expected Result:**
- HTTP `201`.
- Body contains `message: "Send money successful"`, a generated `trnxId`, `fee: 5`, and `currentBalance` equal to the pre-call balance minus 1005.

---

### TC-002
**Test Title:** Verify that a 401 is returned when the Authorization header is missing
**Type:** Negative — (API)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — isolated check of this endpoint's auth-middleware response; no UI or downstream involvement.

**Preconditions:** None beyond a reachable endpoint.

**Test Data:**
- `from_account: 01686606902`, `to_account: 01686606903`, `amount: 1000`
- No `Authorization` header; `X-AUTH-SECRET-KEY: <valid partner key>`

**Steps:**
1. POST to `/transaction/sendmoney` with the `Authorization` header entirely omitted.
2. Inspect status/body.

**Expected Result:**
- HTTP `401`, body `{ message: "No Token Found!" }`.

---

### TC-003
**Test Title:** Verify that a 401 is returned when `X-AUTH-SECRET-KEY` is missing or incorrect
**Type:** Negative — (API)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — isolated check of the auth-middleware response contract; both variants below hit the identical code branch, so they are kept as one case rather than duplicated.

**Preconditions:** A syntactically valid JWT for Customer1 exists (its validity is irrelevant here since the secret-key check runs first).

**Test Data:**
- `from_account: 01686606902`, `to_account: 01686606903`, `amount: 1000`
- `Authorization: Bearer <Customer1 JWT>`; run once with `X-AUTH-SECRET-KEY` omitted, and once with `X-AUTH-SECRET-KEY: WRONG-KEY-VALUE`

**Steps:**
1. POST with the header omitted; record result.
2. POST with the header set to an incorrect value; record result.

**Expected Result:**
- Both variants return HTTP `401`, body `{ message: "Secret auth key validation failure!" }`.

---

### TC-004
**Test Title:** Verify that an expired JWT is rejected with 403
**Type:** Negative — (API)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — isolated check of the token-expiry branch; no UI/session involvement.

**Preconditions:** A JWT for Customer1 issued and now past the server's configured `expires_in` window.

**Test Data:**
- `from_account: 01686606902`, `to_account: 01686606903`, `amount: 1000`
- `Authorization: Bearer <expired Customer1 JWT>`, `X-AUTH-SECRET-KEY: <valid partner key>`

**Steps:**
1. POST with the expired token.
2. Inspect status/body.

**Expected Result:**
- HTTP `403`, body `{ message: "Token expired!" }`.

---

### TC-005
**Test Title:** Verify that a malformed/invalid JWT is rejected with 403
**Type:** Negative — (API)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — isolated check of the `jwt.verify` failure branch; no UI/session involvement.

**Preconditions:** None.

**Test Data:**
- `from_account: 01686606902`, `to_account: 01686606903`, `amount: 1000`
- `Authorization: Bearer not-a-real-jwt-token`, `X-AUTH-SECRET-KEY: <valid partner key>`

**Steps:**
1. POST with the malformed token string as the Bearer value.
2. Inspect status/body.

**Expected Result:**
- HTTP `403`, body `{ message: "Token invalid!" }`.

---

### TC-006
**Test Title:** Verify system behavior when `to_account` is omitted from the request body
**Type:** Negative — (API)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — direct contract check of malformed-payload handling on this endpoint; no UI involvement.

**Preconditions:** Valid JWT + secret key for Customer1.

**Test Data:**
- `from_account: 01686606902`, `amount: 1000`, `to_account` key omitted entirely from the JSON body

**Steps:**
1. POST with `to_account` left out of the body.
2. Inspect status/body carefully, and note whether a response is returned at all or the request hangs/times out.

**Expected Result:**
- The account-lookup query runs with an undefined value for the missing field, which is rejected by the database layer rather than silently matching no account. Since this endpoint has no error handling around that lookup, the realistic outcome is **no clean response** — either the request hangs until client timeout, or the server process fails outright (which would also disrupt any other in-flight requests). A clean `404 "To Account does not exist"` would mean this behaves differently from what tracing the code suggests. Record the actual observed behavior precisely — this case is watching for exactly that discrepancy.

---

### TC-007
**Test Title:** Verify that sending money to the same account as the sender is rejected
**Type:** Negative — (API)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — isolated check of the `from_account === to_account` guard.

**Preconditions:** Valid JWT + secret key for Customer1.

**Test Data:**
- `from_account: 01686606902`, `to_account: 01686606902`, `amount: 1000`

**Steps:**
1. POST with identical `from_account`/`to_account`.
2. Inspect status/body.

**Expected Result:**
- HTTP `400`, body `{ message: "From account and to account cannot be the same" }`.

---

### TC-008
**Test Title:** Verify that a non-existent `from_account` returns 404
**Type:** Negative — (API)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — isolated existence-check response, no data-layer inspection beyond the response body.

**Preconditions:** Valid JWT + secret key (existence check runs before authorization, so any authenticated caller can trigger it).

**Test Data:**
- `from_account: 00000000099` (no matching user), `to_account: 01686606903`, `amount: 1000`

**Steps:**
1. POST with a `from_account` value that matches no user.
2. Inspect status/body.

**Expected Result:**
- HTTP `404`, body `{ message: "From Account does not exist" }`.

---

### TC-009
**Test Title:** Verify that a non-existent `to_account` returns 404
**Type:** Negative — (API)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — same rationale as TC-008, distinct branch/message.

**Preconditions:** Valid JWT + secret key for Customer1.

**Test Data:**
- `from_account: 01686606902`, `to_account: 00000000099`, `amount: 1000`

**Steps:**
1. POST with a `to_account` value that matches no user.
2. Inspect status/body.

**Expected Result:**
- HTTP `404`, body `{ message: "To Account does not exist" }`.

---

### TC-010
**Test Title:** Verify that a token holder cannot send money from an account that is not their own
**Type:** Negative — (API)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — confirms this endpoint's own authorization check against the JWT identifier; no UI or session-store involvement.

**Preconditions:** Valid JWT for Customer2 (i.e. the JWT identifier is Customer2's phone/email, not Customer1's).

**Test Data:**
- `from_account: 01686606902` (Customer1 — not the token owner), `to_account: 01686606903`, `amount: 1000`
- `Authorization: Bearer <Customer2 JWT>`

**Steps:**
1. Log in as Customer2, obtain JWT.
2. POST with `from_account` set to Customer1's phone number (not Customer2's).
3. Inspect status/body.

**Expected Result:**
- HTTP `403`, body `{ message: "Unauthorized: you can only initiate transactions from your own account" }`. (Check is strict, case-sensitive `===` on phone/email — an identifier differing only in case from the stored value is rejected the same way.)

---

### TC-011
**Test Title:** Verify that SendMoney is rejected when either party is not a Customer
**Type:** Negative — (API)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — role-gate check; both variants below hit the same branch, so kept as one case with two data variants rather than duplicated.

**Preconditions:** Active Agent (`01686606901`) and active Merchant (`01686606905`) exist alongside active Customer1/Customer2.

**Test Data:**
- Variant A: `from_account: 01686606901` (Agent, own JWT), `to_account: 01686606903`, `amount: 1000`
- Variant B: `from_account: 01686606902` (Customer1 JWT), `to_account: 01686606905` (Merchant), `amount: 1000`

**Steps:**
1. Run Variant A: log in as the Agent, POST with the Agent as `from_account`.
2. Run Variant B: log in as Customer1, POST with the Merchant as `to_account`.
3. Inspect status/body for both.

**Expected Result:**
- Both variants return HTTP `400`, body `{ message: "Send money is only allowed between two Customer accounts" }`.

---

### TC-012
**Test Title:** Verify that SendMoney is rejected when the sender's own account is not active
**Type:** Negative — (API)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — from-side status guard; distinct response message from the to-side variant (TC-013), kept separate.

**Preconditions:** A Customer-role account with status `pending` exists (`01206418831`). Login has no status gate, so a JWT is obtainable for it. No `suspended`-status account currently exists in the environment; the guard checks `status !== 'active'`, which treats `pending` and `suspended` identically, so this case is representative of both.

**Test Data:**
- `from_account: 01206418831` (pending Customer, own JWT), `to_account: 01686606903`, `amount: 1000`

**Steps:**
1. Obtain a JWT for the pending Customer account.
2. POST with that account as `from_account`.
3. Inspect status/body.

**Expected Result:**
- HTTP `403`, body `{ message: "Your account is not active. Please contact admin." }`.

---

### TC-013
**Test Title:** Verify that SendMoney is rejected when the receiving account is not active
**Type:** Negative — (API)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — to-side status guard; distinct branch/message from TC-012.

**Preconditions:** Customer1 active; pending Customer account (`01206418831`) exists as receiver.

**Test Data:**
- `from_account: 01686606902` (Customer1 JWT), `to_account: 01206418831` (pending Customer), `amount: 1000`

**Steps:**
1. Log in as Customer1.
2. POST with the pending account as `to_account`.
3. Inspect status/body.

**Expected Result:**
- HTTP `403`, body `{ message: "Receiver account is not active. Please contact admin." }`.

---

### TC-014
**Test Title:** Verify that a non-numeric, zero, or negative amount is rejected
**Type:** Negative — (API)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — earliest validation gate, runs before any DB lookup; all three inputs hit the identical branch, so kept as one case with sub-steps rather than three cases.

**Preconditions:** Valid JWT + secret key for Customer1.

**Test Data:**
- `from_account: 01686606902`, `to_account: 01686606903`; run separately with `amount: "abc"`, `amount: 0`, `amount: -500`

**Steps:**
1. POST with `amount: "abc"`; record result.
2. POST with `amount: 0`; record result.
3. POST with `amount: -500`; record result.

**Expected Result:**
- All three return HTTP `400`, body `{ message: "Amount must be a valid number greater than 0" }`. No account lookup or ledger write occurs for any of them.

---

### TC-015
**Test Title:** Verify that an amount below the 10 Tk minimum is rejected
**Type:** Negative — (API)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — minimum-amount guard, a distinct code path from TC-014 (runs after account/role/limit checks, not before).

**Preconditions:** Valid JWT + secret key for Customer1; Customer1 has headroom under the daily/monthly limits so the limit check (which runs first) doesn't mask this one.

**Test Data:**
- `from_account: 01686606902`, `to_account: 01686606903`, `amount: 5`

**Steps:**
1. POST with a valid, positive amount below 10.
2. Inspect status/body.

**Expected Result:**
- HTTP `400`, body `{ message: "Minimum amount is 10 tk" }`.

---

### TC-016
**Test Title:** Verify that a SendMoney request is soft-rejected (208) when the sender's balance is insufficient
**Type:** Negative — (API)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — locked-balance check inside the DB transaction; confirms the 208-vs-400 status-code convention purely via the response.

**Preconditions:** An active Customer-role account whose live balance is below `amount + fee`. Live-verified example: `01201082604`, balance **50 Tk** at query time — re-verify via `GET /transaction/balance/01201082604` immediately before running, since balance is computed live.

**Test Data:**
- `from_account: 01201082604` (own JWT), `to_account: 01686606903`, `amount: 1000`

**Steps:**
1. Confirm current balance is below 1005 Tk.
2. Log in, POST the SendMoney request.
3. Inspect status/body, and confirm balance is unchanged afterward.

**Expected Result:**
- HTTP `208`, body `{ message: "Insufficient balance", currentBalance: <actual balance> }`. No ledger rows written.

---

### TC-017
**Test Title:** Verify that exceeding the Customer's daily or monthly outgoing limit returns 400, not 208
**Type:** Negative — (API)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — response contract of the limit check; does not verify underlying table state beyond what the response implies.

**Preconditions:** Sender's cumulative debit for the current day/month is at or near the active limit — daily cap 5000 Tk / 10 transactions, monthly 50000 Tk / 50 transactions. Requires setup: e.g. a fresh account's first request this period with `amount: 5000` (amount + 5 Tk fee = 5005, which alone exceeds the 5000 Tk daily cap).

**Test Data:**
- `from_account: <Customer account with usage at/near cap, or a fresh account sending amount=5000>`, `to_account: 01686606903`, `amount: 5000`

**Steps:**
1. Establish or confirm the sender's usage is at/near the limit.
2. POST the SendMoney request.
3. Inspect status/body.

**Expected Result:**
- HTTP `400` (not 208 — this is a hard validation failure, distinct from the balance check), body containing a `message` naming the period breached and a `details` object with `usedAmount`, `usedCount`, `maxAmount`, `maxCount`, `remainingAmount`, `remainingCount`.

---

### TC-018
**Test Title:** Verify that resubmitting an identical SendMoney request is processed as a second independent transaction, not blocked as a duplicate
**Type:** Negative — (API)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run
**Test Scope:** API-only — confirms the absence of request-level idempotency purely via two back-to-back response bodies; no UI involvement.

**Preconditions:** Customer1 has sufficient balance to cover the transfer twice (≥ 2010 Tk after fees). Valid JWT + secret key.

**Test Data:**
- `from_account: 01686606902`, `to_account: 01686606903`, `amount: 1000` — same body sent twice

**Steps:**
1. Record Customer1's starting balance.
2. POST the SendMoney request.
3. Immediately POST the exact same request body again with the same JWT.
4. Compare both responses and the resulting balance.

**Expected Result:**
- Both calls return HTTP `201` independently, each with its own freshly-generated `trnxId`, each debiting Customer1 by 1005 Tk. The account is debited **twice** — there is no server-side duplicate/replay protection on this endpoint (no unique constraint on `trnxId`, no lookup-before-write, unlike the Stripe-confirm flow's idempotency guard).
