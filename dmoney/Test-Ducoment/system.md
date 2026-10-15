# SYSTEM to Agent Deposit of 5000 - API Test Cases

> Evidence, assumptions and adversarial review: [system.review.md](system.review.md) - read before revising these cases.

## 1. Feature Summary

- What this feature does for the user: It lets the platform own SYSTEM account top up a regular Agent wallet, so the Agent has funds available to hand out to customers.
- What changed: Nothing - this is existing, already-implemented behavior being covered with tests for the first time; it is not documented anywhere as a business requirement outside the engineering notes.
- Who is affected: The SYSTEM operator account (the platform itself) and the Agent whose wallet receives the top-up.
- Business flows touched: SYSTEM-to-Agent wallet top-up.
- Related flows that could break: None are exercised here by design - the requester explicitly scoped this to a single call of this one endpoint and its own direct effect, not to the Agent later deposit-to-customer flow or any other endpoint.
- Change tier: Logic / contract / auth - the endpoint enforces authentication, ownership, role, status and balance rules and produces a financial ledger effect.
- Intent source: No ticket or requirement document exists; behavior and scope are inferred from the current implementation.
- Scope: Sanity - single endpoint, single call per case.

## 2. Acceptance Criteria

No ticket exists, so these are derived from the implemented behavior rather than given:

- AC-1 - The SYSTEM account can deposit funds directly into a regular Agent wallet when authenticated as SYSTEM.
- AC-2 - The deposit is rejected when the destination account is not an active, regular Agent (that is, it is a Customer, Merchant, Admin, or SYSTEM itself, or an Agent that is not active).
- AC-3 - Only a caller authenticated as the SYSTEM account may initiate this deposit; a token belonging to any other account is rejected.
- AC-4 - The deposit is rejected when the SYSTEM account own balance is insufficient to cover the deposited amount.
- AC-5 - The deposit is rejected when the source and destination account are the same account.
- AC-6 - A successful deposit produces two linked ledger entries (a debit from SYSTEM, a credit to the Agent) and returns the Agent new balance in the response; no commission is applied on this flow.
- AC-7 - The endpoint enforces the platform standard authentication contract (a valid bearer token plus the correct partner secret-key header) before any deposit-specific rule is evaluated.

## 3. Basic Test - verify the feature works end to end

No screen in the web application reaches this flow. The only page that calls this endpoint is the Agent own cash-in screen, and it always submits the logged-in Agent own phone number as the source of the deposit - it has no way to act as the SYSTEM account or to reach this SYSTEM-initiated flow. This matches the requester own framing of this piece of work as an API-only surface with no UI. The alternative, tester-facing path is a direct call to the deposit API, exactly as it will be exercised in Postman.

Environment preconditions:
- The transaction API is running and reachable.
- The SYSTEM account exists, is active, and its login credentials are available (supplied separately, see the Test Data note below).
- At least one regular Agent account exists, is active, and is not the SYSTEM account itself.
- The caller has the platform shared partner secret key value to send as a header on every call.

Login and role: Log in as the SYSTEM account (identifier SYSTEM, password supplied separately) through the login endpoint. Because this account is treated as a system operator, no OTP step follows - the login call itself returns a usable token directly.

Steps:
1. Log in as SYSTEM and obtain the authentication token from the login response.
2. Submit a deposit request naming SYSTEM as the source account, an active regular Agent as the destination account, and an amount of 5000, with the token and the partner secret key attached.
3. Observe the response.

What proves it passed: The response reports success, includes a transaction reference and the Agent new balance, and that new balance is exactly 5000 higher than the Agent balance immediately before the call.

## 4. System Behavior Tests

### 4a. New behavior

### TC-001

**Test Title:** Verify that a regular Agent wallet balance increases by the deposited amount when SYSTEM tops up the account
**Type:** Functional - (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- Caller is authenticated as the SYSTEM account (identifier SYSTEM).
- Destination account is a regular, active Agent that is not the SYSTEM account (for example account with phone number 01686606901, confirmed active and role Agent as of the last live check - reconfirm before running, since account state can change).
- SYSTEM own balance comfortably exceeds 5000 (confirmed well over 9,000,000 as of the last live check).

**Test Data:**
- from_account: SYSTEM
- to_account: 01686606901
- amount: 5000

**Steps:**
1. Submit a deposit request with the data above, with a valid token and the correct partner secret-key header.
2. Note the destination Agent balance immediately before the call, for comparison.

**Expected Result:**
- The call succeeds and reports the deposit as successful.
- The response includes a transaction reference, the amount (5000), and the destination Agent new balance.
- The reported new balance equals the Agent balance from just before the call, plus 5000.
- No commission or fee amount appears anywhere in the response - this flow does not charge one.
- Two linked ledger entries are recorded for this transaction: one debiting the SYSTEM account and one crediting the Agent account, both referencing the same transaction id.

### TC-002

**Test Title:** Verify that the SYSTEM deposit is authorized when SYSTEM logs in using a different letter case for its account identifier
**Type:** Functional - (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- Same as TC-001, except the login step submits the identifier in lower case.

**Test Data:**
- Login identifier: system (lower case)
- Deposit request: from_account = SYSTEM (as normally written), to_account = an active regular Agent, amount = 5000

**Steps:**
1. Log in using system (lower case) as the identifier, with the SYSTEM account password.
2. Using the resulting token, submit the same deposit request as TC-001.

**Expected Result:**
- The deposit succeeds identically to TC-001 - the case difference between the identifier used to log in and the account stored value does not block authorization on this flow.

### 4b. Related regression

### TC-003

**Test Title:** Verify that the SYSTEM deposit is rejected when the caller is authenticated as a different account than SYSTEM
**Type:** Security - (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- Caller is authenticated as a real, active Agent account other than SYSTEM (for example phone number 01686606901).

**Test Data:**
- from_account: SYSTEM
- to_account: any existing active Agent account
- amount: 5000

**Steps:**
1. Log in as a regular Agent (not SYSTEM).
2. Submit a deposit request naming SYSTEM as from_account, using this Agent own token.

**Expected Result:**
- The request is rejected as unauthorized; the caller may only initiate a deposit from the account it is logged in as.

### TC-004

**Test Title:** Verify that the SYSTEM deposit is rejected when the source and destination account are the same
**Type:** Negative - (system)
**Priority:** Medium
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- Caller is authenticated as SYSTEM.

**Test Data:**
- from_account: SYSTEM
- to_account: SYSTEM
- amount: 5000

**Steps:**
1. Submit a deposit request with SYSTEM as both the source and destination account.

**Expected Result:**
- The request is rejected because the source and destination account cannot be the same.

### TC-005

**Test Title:** Verify that the SYSTEM deposit is rejected when the destination account is not a regular Agent
**Type:** Negative - (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- Caller is authenticated as SYSTEM.
- Destination accounts below are active, so the rejection is on account type, not account status.

**Test Data:**
- from_account: SYSTEM, amount: 5000, and to_account set in turn to:
  - an active Customer account (for example 01686606902)
  - an active Merchant account (for example 01686606905)
  - an active Admin account (for example 01786606909)

**Steps:**
1. Submit a deposit request with each destination account value above, one at a time.

**Expected Result:**
- Every one of the three attempts is rejected: SYSTEM may only deposit to a regular Agent account, and Customer, Merchant, and Admin accounts are all refused with the same rejection.

### TC-006

**Test Title:** Verify that the SYSTEM deposit is rejected when the destination Agent account is not active
**Type:** Negative - (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- Caller is authenticated as SYSTEM.
- Destination account has the Agent role but its status is not active (for example account 01786606901, confirmed status pending as of the last live check - reconfirm before running).

**Test Data:**
- from_account: SYSTEM
- to_account: 01786606901
- amount: 5000

**Steps:**
1. Submit a deposit request naming the inactive Agent account as the destination.

**Expected Result:**
- The request is rejected because the destination account is not active.

### TC-007

**Test Title:** Verify that the SYSTEM deposit is rejected when the destination account does not exist
**Type:** Negative - (system)
**Priority:** Medium
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- Caller is authenticated as SYSTEM.

**Test Data:**
- from_account: SYSTEM
- to_account: 01799999999 (not a registered account)
- amount: 5000

**Steps:**
1. Submit a deposit request naming an unregistered phone number as the destination account.

**Expected Result:**
- The request is rejected because the destination account does not exist.

### TC-008

**Test Title:** Verify that the SYSTEM deposit is rejected when the source account does not exist
**Type:** Negative - (system)
**Priority:** Medium
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- Caller holds any valid authentication token (the identity of the caller does not matter for this check, since the account-existence check happens before the ownership check).

**Test Data:**
- from_account: SYSTEMX (not a registered account)
- to_account: an existing active Agent account (for example 01686606901)
- amount: 5000

**Steps:**
1. Submit a deposit request naming a non-existent account as the source account.

**Expected Result:**
- The request is rejected because the source account does not exist.

### TC-009

**Test Title:** Verify that the SYSTEM deposit is rejected when the deposit amount is not a valid positive number
**Type:** Negative - (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- Caller is authenticated as SYSTEM.

**Test Data:**
- from_account: SYSTEM, to_account: an existing active Agent account, amount set in turn to:
  - 0
  - -5000
  - abc (a non-numeric string)
  - omitted from the request entirely

**Steps:**
1. Submit a deposit request with each amount value above, one at a time.

**Expected Result:**
- Every one of the four attempts is rejected: the amount must be a valid number greater than zero, and this is checked before anything else about the request (account existence, ownership, and so on are never evaluated for these attempts).

### TC-010

**Test Title:** Verify that the SYSTEM deposit request behaves predictably when a required account field is left out of the request
**Type:** Negative - (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- Caller is authenticated as SYSTEM.

**Test Data:**
- Variant A: from_account: SYSTEM, amount: 5000, to_account omitted entirely from the request body.
- Variant B: to_account: an existing active Agent account, amount: 5000, from_account omitted entirely from the request body.

**Steps:**
1. Submit the deposit request for each variant above, one at a time.

**Expected Result:**
- TBD - not established by available evidence. The exact response the API returns when one of these two fields is left out entirely has not been confirmed by live execution; see the review record for why this case exists and what a bug-hunting pass should specifically check here.

### TC-011

**Test Title:** Verify that the SYSTEM deposit is rejected when no authentication token is supplied
**Type:** Security - (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:** None beyond the endpoint being reachable.

**Test Data:**
- A deposit request identical to TC-001, but with no Authorization header at all.

**Steps:**
1. Submit the deposit request with the Authorization header omitted.

**Expected Result:**
- The request is rejected before any deposit logic runs, because no token was supplied.

### TC-012

**Test Title:** Verify that the SYSTEM deposit is rejected when the partner secret-key header is missing or incorrect
**Type:** Security - (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- A valid, unexpired token is available (from any account).

**Test Data:**
- A deposit request identical to TC-001, with a valid Authorization header, but with the partner secret-key header either omitted or set to a wrong value.

**Steps:**
1. Submit the deposit request with the secret-key header omitted.
2. Submit the deposit request again with the secret-key header set to an incorrect value.

**Expected Result:**
- Both attempts are rejected before any deposit logic runs, because the required partner secret key was not correctly supplied.

### TC-013

**Test Title:** Verify that the SYSTEM deposit is rejected when the authentication token is expired or invalid
**Type:** Security - (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**
- The correct partner secret-key header is supplied on every attempt, so only the token itself is under test.
- An expired token is available (a previously issued token whose validity period has passed), and a syntactically token-shaped but tampered value is available (for example a valid token with one character altered so its signature no longer matches).

**Test Data:**
- Attempt 1: a token whose validity period has already passed.
- Attempt 2: a token-shaped value that has been tampered with so it does not verify.

**Steps:**
1. Submit the deposit request with the expired token.
2. Submit the deposit request with the tampered token.

**Expected Result:**
- The expired token is rejected as expired.
- The tampered token is rejected as invalid.
- In both cases the rejection is distinguishable from the missing-token and wrong-secret-key rejections in TC-011 and TC-012.

## 5. White-box Tests

No additional whitebox tests are justified. Every rule this endpoint enforces (ownership, role, status, account type, balance sufficiency, amount validity) is directly observable through the API response codes and messages - there is no internal algorithm or unreachable branch that needs isolating outside the system tests above.

## 6. Coverage Summary

- AC-1 (SYSTEM can deposit to a regular Agent when authenticated as SYSTEM) - covered by TC-001, TC-002.
- AC-2 (rejected when the destination is not an active regular Agent) - covered by TC-005, TC-006, TC-007.
- AC-3 (only SYSTEM own token may initiate) - covered by TC-002, TC-003.
- AC-4 (rejected when SYSTEM balance is insufficient) - not covered; see the Not covered list below.
- AC-5 (rejected when source and destination are identical) - covered by TC-004.
- AC-6 (successful deposit produces two ledger entries, returns the new balance, no commission) - covered by TC-001.
- AC-7 (standard authentication contract enforced) - covered by TC-011, TC-012, TC-013.

Changed branches covered: not applicable - no diff exists for this piece of work; every branch in the SYSTEM-to-Agent path is covered as existing behavior by TC-001 through TC-010.

Related caller groups covered: the one confirmed caller of this endpoint (the Agent cash-in screen) does not reach this flow at all - see the Basic Test section and the review record - so there is no sibling-caller regression surface to cover for this specific branch.

Validation and authorization covered: account existence (TC-007, TC-008), account status (TC-006), account type and role (TC-005), amount validity (TC-009), ownership and authorization (TC-002, TC-003), authentication headers (TC-011, TC-012, TC-013).

Edge cases and compatibility risks covered: same-account edge case (TC-004), case-insensitive identifier matching (TC-002), boundary amount values at the zero, negative, and non-numeric edge of the amount check (TC-009).

Duplicates merged: the three to_account-role rejections (Customer, Merchant, Admin) are merged into TC-005; the four invalid-amount variants are merged into TC-009; the expired-versus-tampered-token variants are merged into TC-013.

Not covered:
- The insufficient-SYSTEM-balance path - the account live balance (approximately 9.26 million) makes this unreachable while holding the test amount fixed at 5000, per the request own scope constraint. See the review record.
- The from_account (SYSTEM) is not active rejection - unreachable via any exposed endpoint, since SYSTEM is a protected account. See the review record.
- The from_account role is not Agent rejection - unreachable for this flow, since SYSTEM role is fixed and cannot be changed. See the review record.
- The redundant to_account equals SYSTEM guard inside the SYSTEM branch - unreachable via the API, since the same-account check always fires first. See the review record.
- Flow 2 (Agent to Customer deposit) and any verification chained through the statement, balance, or list endpoints - explicitly out of scope per the request.
- The generic 500 Internal Server Error path - no confirmed reproducible trigger within sanity scope, aside from the suspected-but-unconfirmed case in TC-010.

## 7. Top Test Cases

- Verify that a regular Agent wallet balance increases by 5000 when SYSTEM deposits into it.
- Verify that the SYSTEM deposit succeeds when SYSTEM logs in with its identifier in a different letter case.
- Verify that a non-SYSTEM account cannot initiate a deposit while impersonating SYSTEM as the source account.
- Verify that SYSTEM cannot deposit into itself.
- Verify that SYSTEM cannot deposit into a Customer, Merchant, or Admin account.
- Verify that SYSTEM cannot deposit into an Agent account that is not active.
- Verify that a deposit to a non-existent account is rejected.
- Verify that a deposit from a non-existent account is rejected.
- Verify that a deposit with a zero, negative, non-numeric, or missing amount is rejected.
- Verify that the API is unreachable without a valid token and the correct partner secret key, and rejects an expired or tampered token.
