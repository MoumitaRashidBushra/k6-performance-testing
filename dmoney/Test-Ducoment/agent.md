Note: TC-002 Variant B through TC-016 (the final insufficient-balance case) form a single sequential balance-drain chain against Agent account 01686606901. Run TC-001 through TC-016 in order, in one pass, against unmodified accounts. Re-running out of order, skipping a case, or running concurrently against the same live account will invalidate the exact balance figures asserted below.

### TC-001

**Test Title:** Verify that a Customer wallet is credited and the Agent earns commission when the Agent deposits exactly 2000 BDT
**Type:** Functional (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Caller holds a valid JWT for an active Agent account, obtained via POST /user/login + POST /user/verify-otp (credentials supplied separately at run time). Agent: phone 01686606901, email salmansrabon+agent@gmail.com, role Agent, status active.
- Recipient Customer account exists and is active: phone 01686606902, email salmansrabon+customer1@gmail.com, role Customer, status active.
- Live balances confirmed by direct query on 2026-08-06: Agent 01686606901 = 13104.50 tk; Customer 01686606902 = 6170.50 tk (10,000 tk wallet cap headroom = 3829.50 tk, sufficient for this 2000 tk deposit).
- Every figure quoted below in this and later cases assumes this exact case sequence (TC-001 through TC-016) runs once, in order, against these accounts with no other activity in between. Re-verify live balances via GET /transaction/balance/:account before asserting exact numbers if run standalone or re-run.
- Request carries Authorization: Bearer <Agent JWT> and X-AUTH-SECRET-KEY set to the environment configured partner key.

**Test Data:**

- from_account: 01686606901
- to_account: 01686606902
- amount: 2000

**Steps:**

1. Send POST /transaction/deposit with the test data above and the required headers.
2. Read the response body and status code.

**Expected Result:**

- HTTP 201, body message "Deposit successful".
- Response includes commission: 50 (2.5% of 2000, the seeded Deposit Agent Commission rate) and currentBalance equal to the Agent balance after the operation: 11154.50 (13104.50 minus 2000 plus 50).
- The Customer computed balance increases by the full 2000 (no fee deducted from the recipient): new balance 8170.50.

---

### TC-002

**Test Title:** Verify that a deposit is accepted at both the minimum and the maximum allowed amount boundaries
**Type:** Functional (system)
**Priority:** Medium
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Same Agent and JWT as TC-001 (phone 01686606901).
- The deposit amount range is configured platform-wide: minimum 10 tk, maximum 10,000 tk, confirmed by direct query on 2026-08-06.
- Variant A recipient: Customer 01686606902 (same as TC-001, already credited 2000 by TC-001, headroom now 1829.50, still well above 10).
- Variant B recipient: Customer 01209188273 (Guadalupe Romaguera, active), live balance = 0 confirmed by direct query on 2026-08-06, full 10,000 tk headroom, dedicated to this variant only so the maximum-amount deposit does not breach any other case's required headroom.
- Must run immediately after TC-001, in order (Variant A then Variant B). Variant B consumes almost all of the Agent remaining balance and is a deliberate precondition for the negative balance/limit cases later in this sequence; do not reorder or skip.

**Test Data:**

- Variant A (minimum): from_account=01686606901, to_account=01686606902, amount=10
- Variant B (maximum): from_account=01686606901, to_account=01209188273, amount=10000

**Steps:**

1. Send POST /transaction/deposit with Variant A test data and the required headers.
2. Send POST /transaction/deposit with Variant B test data and the required headers.

**Expected Result:**

- Variant A: HTTP 201; commission: 0.25 (2.5% of 10); currentBalance: 11144.75 (11154.50 minus 10 plus 0.25); recipient balance increases by exactly 10 (new balance 8180.50).
- Variant B: HTTP 201; commission: 250 (2.5% of 10000); currentBalance: 1394.75 (11144.75 minus 10000 plus 250); recipient balance becomes exactly 10000, now sitting exactly at the wallet cap.

---

### TC-003

**Test Title:** Verify that deposit authorization succeeds when the caller login identifier differs only in case from the account stored email
**Type:** Security (system)
**Priority:** Medium
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- The deposit endpoint matches the logged-in caller against the from-account's stored phone number or email without regard to letter case. Other money-movement flows (withdraw, send money, payment) are documented to require an exact-case match, so this endpoint's behavior is worth confirming independently.
- Confirmed by direct query on 2026-08-06 that looking up the account by email is also case-insensitive: querying with the email in all uppercase (SALMANSRABON+AGENT@GMAIL.COM) returns the same Agent account (phone 01686606901) as the stored lowercase value (salmansrabon+agent@gmail.com).
- Must run after TC-002 (uses the same Agent, whose balance is already partially drained by TC-001/TC-002; this case amount is kept small so it does not interfere with the later balance/limit cases).

**Test Data:**

- Login identifier: SALMANSRABON+AGENT@GMAIL.COM (uppercase variant of the Agent stored email; password supplied separately at run time)
- from_account: 01686606901
- to_account: 01686606902
- amount: 15

**Steps:**

1. Call POST /user/login with identifier = "SALMANSRABON+AGENT@GMAIL.COM" and the Agent password, then complete POST /user/verify-otp to obtain a JWT.
2. Send POST /transaction/deposit with the test data above, using the JWT obtained in step 1.

**Expected Result:**

- Login succeeds and returns an OTP flow for this identifier, ultimately yielding a valid JWT whose identifier claim is the exact string submitted (SALMANSRABON+AGENT@GMAIL.COM).
- The deposit is not rejected with 403 Unauthorized: you can only initiate transactions from your own account despite the case difference from the stored value.
- HTTP 201; commission: 0.375 (2.5% of 15); currentBalance: 1380.125 (1394.75 minus 15 plus 0.375); recipient balance increases by 15 (new balance 8195.50).

---

### TC-004

**Test Title:** Verify that a deposit is rejected when the from-account phone number does not exist
**Type:** Negative (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Caller holds a valid JWT for any active Agent (e.g. 01686606901, as in TC-001).
- Phone number 01699999999 is not a registered account, confirmed by direct query on 2026-08-06.
- This case does not reach the account-status, role, or balance checks, so it does not mutate any account balance.

**Test Data:**

- from_account: 01699999999 (nonexistent)
- to_account: 01686606902
- amount: 2000

**Steps:**

1. Send POST /transaction/deposit with the test data above and the required headers.

**Expected Result:**

- HTTP 404, body message "From Account does not exist".

---

### TC-005

**Test Title:** Verify that a deposit is rejected when the to-account phone number does not exist
**Type:** Negative (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Caller holds a valid JWT for Agent 01686606901.
- Phone number 01688888888 is not a registered account, confirmed by direct query on 2026-08-06.
- No balance mutation occurs.

**Test Data:**

- from_account: 01686606901
- to_account: 01688888888 (nonexistent)
- amount: 2000

**Steps:**

1. Send POST /transaction/deposit with the test data above and the required headers.

**Expected Result:**

- HTTP 404, body message "To Account does not exist" - distinct message from TC-004, confirming the two existence checks are reported independently.

---

### TC-006

**Test Title:** Verify that a deposit is rejected when the caller is authenticated as an account other than the from-account
**Type:** Security (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Caller holds a valid JWT for an account that is not the from_account being submitted: Merchant 01686606905 (salmansrabon+merchant@gmail.com, active), credentials supplied separately at run time.
- Both from_account and to_account in the request body exist (existence is checked before authorization, so both must be real for this case to reach the authorization branch).
- No balance mutation occurs.

**Test Data:**

- Logged-in caller: Merchant 01686606905
- from_account: 01686606901 (Test Agent, not the caller own account)
- to_account: 01686606902
- amount: 2000

**Steps:**

1. Call POST /user/login with the Merchant's phone number or email and password.
2. Complete POST /user/verify-otp with the OTP received to obtain a JWT.
3. Send POST /transaction/deposit with from_account=01686606901 using the Merchant JWT.

**Expected Result:**

- HTTP 403, body message "Unauthorized: you can only initiate transactions from your own account".

---

### TC-007

**Test Title:** Verify that a deposit is rejected when the from-account and to-account are the same
**Type:** Negative (system)
**Priority:** Medium
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Caller holds a valid JWT for Agent 01686606901.
- This check runs before the role/status checks, so the same account can be used for both fields regardless of its role.
- No balance mutation occurs.

**Test Data:**

- from_account: 01686606901
- to_account: 01686606901 (identical to from_account)
- amount: 2000

**Steps:**

1. Send POST /transaction/deposit with the test data above and the required headers.

**Expected Result:**

- HTTP 400, body message "From account and to account cannot be the same".

---

### TC-008

**Test Title:** Verify that a deposit is rejected when the from-account (Agent) is not active
**Type:** Negative (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- A real Agent-role account with status pending exists, confirmed by direct query on 2026-08-06: phone 01786606901, email agent@roadtocareer.net, role Agent, status pending.
- Test-data gap: login credentials (password) for this account are not known to QA and are not among the seeded/default accounts. TBD - not established by available evidence. To execute this case, either obtain the password for phone 01786606901 separately, or register a fresh Agent account via POST /user/register (which defaults new accounts to status pending) with test data of the tester own choosing and substitute its phone number here before running.
- to_account (01686606902) only needs to exist; its own status is irrelevant because the check on from_account status runs first.
- If reached, no balance mutation occurs (rejected before the balance transaction).

**Test Data:**

- from_account: 01786606901 (Agent, status pending) - or a freshly self-registered pending Agent if credentials for this one are unavailable
- to_account: 01686606902
- amount: 2000

**Steps:**

1. Call POST /user/login with the pending Agent's phone number or email and password (OTP is still issued to a pending account; login does not itself check status).
2. Complete POST /user/verify-otp with the OTP received to obtain a JWT.
3. Send POST /transaction/deposit with the test data above using that JWT.

**Expected Result:**

- HTTP 403, body message "From account is not active. Please contact admin.".

---

### TC-009

**Test Title:** Verify that a deposit is rejected when the to-account (Customer) is not active
**Type:** Negative (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Caller holds a valid JWT for Agent 01686606901 (active - no credential gap here, since only to_account status is under test).
- A real Customer-role account with status pending exists, confirmed by direct query on 2026-08-06: phone 01504474888, email testcustomer@test.com, role Customer, status pending. No login is required for this account since it is only the recipient.
- No balance mutation occurs.

**Test Data:**

- from_account: 01686606901
- to_account: 01504474888 (Customer, status pending)
- amount: 2000

**Steps:**

1. Send POST /transaction/deposit with the test data above and the required headers.

**Expected Result:**

- HTTP 403, body message "To account is not active. Please contact admin.".

---

### TC-010

**Test Title:** Verify that a deposit is rejected when the from-account does not have the Agent role
**Type:** Negative (system)
**Priority:** Medium
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Caller holds a valid JWT for an active non-Agent account: Merchant 01686606905 (salmansrabon+merchant@gmail.com), credentials supplied separately at run time.
- Both accounts are active, so this case reaches the role check rather than being rejected earlier for status.
- No balance mutation occurs.

**Test Data:**

- from_account: 01686606905 (Merchant, active - logged-in caller matches this account)
- to_account: 01686606902
- amount: 2000

**Steps:**

1. Call POST /user/login with the Merchant's phone number or email and password.
2. Complete POST /user/verify-otp with the OTP received to obtain a JWT.
3. Send POST /transaction/deposit with from_account=01686606905 using that JWT.

**Expected Result:**

- HTTP 400, body message "Invalid from account. Only an Agent or the SYSTEM account can initiate a deposit.".

---

### TC-011

**Test Title:** Verify that a regular Agent deposit is rejected when the to-account is not a Customer
**Type:** Negative (system)
**Priority:** Medium
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Caller holds a valid JWT for Agent 01686606901 (a regular Agent, not the SYSTEM account - this routes the request into Flow 2 rather than the separate SYSTEM to Agent flow).
- to_account is an active non-Customer account: Merchant 01686606905.
- No balance mutation occurs.

**Test Data:**

- from_account: 01686606901
- to_account: 01686606905 (Merchant, active)
- amount: 2000

**Steps:**

1. Send POST /transaction/deposit with the test data above and the required headers.

**Expected Result:**

- HTTP 400, body message "To account must be a Customer account. A regular Agent can only deposit to a Customer.".

---

### TC-012

**Test Title:** Verify that a deposit is rejected when the amount is not a valid positive number
**Type:** Negative (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- This check runs before any account lookup, so the accounts referenced do not need to exist or be in any particular state for the rejection to occur; the Agent/Customer pair from TC-001 is used only for realism.
- No balance mutation occurs for any variant.

**Test Data (all variants use from_account=01686606901, to_account=01686606902):**

- Variant A: amount = 0
- Variant B: amount = -2000
- Variant C: amount = "abc" (non-numeric string)
- Variant D: amount field omitted entirely from the request body (from_account and to_account remain present)

**Steps:**

1. Send POST /transaction/deposit with each variant amount value in turn, keeping from_account/to_account fixed.

**Expected Result:**

- All four variants: HTTP 400, body message "Amount must be a valid number greater than 0" - same status and message in every case, since all four fail the same amount-validation rule (the value must be a genuine number greater than zero).

---

### TC-013

**Test Title:** Verify that a deposit is rejected when the amount falls outside the allowed 10-10,000 tk range
**Type:** Negative (system)
**Priority:** Medium
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Caller holds a valid JWT for Agent 01686606901.
- This check runs after the existence/authorization/status/role checks but before the balance transaction, so both accounts must be real and active but no balance is mutated.
- Variant A amount (9) is one below the platform's configured Deposit minimum; Variant B amount (10001) is one above the platform's configured Deposit maximum. Both boundary values were confirmed by direct query on 2026-08-06.

**Test Data:**

- Variant A (below minimum): from_account=01686606901, to_account=01686606902, amount=9
- Variant B (above maximum): from_account=01686606901, to_account=01686606902, amount=10001

**Steps:**

1. Send POST /transaction/deposit with Variant A's test data and the required headers.
2. Send POST /transaction/deposit with Variant B's test data and the required headers.

**Expected Result:**

- Both variants: HTTP 400, body message "Minimum deposit amount is 10 tk and maximum deposit amount is 10000 tk" - identical message and status for both the below-minimum and above-maximum branches, since both are produced by the same single range check.

---

### TC-014

**Test Title:** Verify that a deposit is rejected when the recipient Customer is already at or over the wallet cap
**Type:** Negative (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Caller holds a valid JWT for Agent 01686606901, whose balance at this point in the sequence (after TC-001/TC-002/TC-003) is 1380.125 tk - sufficient to reach the customer-cap check for the amount used here.
- Recipient Customer 01686606903 (Test Customer 2, active) has a live computed balance of 11449.50 tk - already over the 10,000 tk wallet cap, confirmed by direct query on 2026-08-06. This is pre-existing account state, not created by this test sequence.
- No balance mutation occurs (the request is rejected inside the transaction before any ledger row is written).

**Test Data:**

- from_account: 01686606901
- to_account: 01686606903
- amount: 100

**Steps:**

1. Send POST /transaction/deposit with the test data above and the required headers.

**Expected Result:**

- HTTP 208, body message "Limit exceeded. You cannot deposit any more to this account.".

---

### TC-015

**Test Title:** Verify that a deposit is rejected when the amount would push the recipient Customer over the wallet cap
**Type:** Negative (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Caller holds a valid JWT for Agent 01686606901, whose balance at this point (1380.125 tk) is sufficient for the amount used here, so the request reaches the customer-limit check rather than the agent-balance check.
- Recipient Customer 01571021164 (Moumita Rashid Bushra, active) has a live computed balance of 9705.00 tk, confirmed by direct query on 2026-08-06, leaving exactly 295.00 tk of headroom under the 10,000 tk cap. This account is not otherwise used in this sequence.
- Must run before TC-016 (does not itself mutate the Agent balance, since the request is rejected before any ledger row is written).

**Test Data:**

- from_account: 01686606901
- to_account: 01571021164
- amount: 300 (exceeds the 295.00 remaining headroom, but is within the Agent own balance)

**Steps:**

1. Send POST /transaction/deposit with the test data above and the required headers.

**Expected Result:**

- HTTP 208, body message "Limit exceeded. You can deposit a maximum of 295.00 tk to this customer.".

---

### TC-016

**Test Title:** Verify that a deposit is rejected when the Agent has insufficient balance for the requested amount
**Type:** Negative (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- Must run last among the balance-affecting cases in this sequence. By this point Agent 01686606901 balance has been deliberately reduced by the preceding successful deposits (TC-001, TC-002 Variant A and B, TC-003) to 1380.125 tk, which is less than the amount requested here. This case relies on that drained state rather than mutating anything itself.
- Recipient 01686606902 only needs to exist; its own cap headroom is irrelevant because the Agent own balance is checked first, before the recipient cap.
- If this case is run in isolation (not after TC-001 through TC-003 in sequence), re-verify the Agent live balance via GET /transaction/balance/01686606901 first and adjust the requested amount so it exceeds the current balance.

**Test Data:**

- from_account: 01686606901
- to_account: 01686606902
- amount: 2000

**Steps:**

1. Send POST /transaction/deposit with the test data above and the required headers.

**Expected Result:**

- HTTP 208, body message "Insufficient balance", with currentBalance: 1380.125 reflecting the Agent actual balance at the time of the request.

---

### TC-017

**Test Title:** Verify the deposit response when the from-account or to-account field is entirely omitted from the request
**Type:** Negative (system)
**Priority:** High
**Any Issue?:** N/A - bug hunt not yet run

**Preconditions:**

- The deposit endpoint looks up both accounts immediately after validating the amount. How it behaves when a required account field is missing from the request body altogether, as opposed to being a well-formed but nonexistent value (already covered by TC-004/TC-005), has not been confirmed.
- Caller holds a valid JWT for Agent 01686606901 (or any active Agent) so the request reaches this point rather than being rejected earlier for authentication.
- This is a design-time case only. It does not depend on and does not affect the balance-drain chain used by the other cases in this sequence, and can be run at any point after the accounts and JWT above are available. The actual server behavior for a completely missing field has not been executed or confirmed live as part of this test design; do not treat the Expected Result below as a confirmed specification.

**Test Data (two variants, both amount=2000):**

- Variant A: to_account=01686606902, from_account key omitted entirely from the JSON body
- Variant B: from_account=01686606901, to_account key omitted entirely from the JSON body

**Steps:**

1. Send POST /transaction/deposit with Variant A's body (no from_account key at all) and the required headers.
2. Send POST /transaction/deposit with Variant B's body (no to_account key at all) and the required headers.

**Expected Result:**

- TBD - not established by available evidence; a suspected defect is open (the endpoint may return an unhandled server error rather than a clean 4xx response) - unconfirmed, requires a live reproduction.
