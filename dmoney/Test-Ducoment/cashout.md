# Withdraw (Cash-Out) API — Test Cases
### Scenario: Customer2 cashes out 500 BDT to an Agent
`POST /transaction/withdraw`

Confirmed evidence used for these cases (verified directly against the running system and the live test environment, 2026-08-06):

- Business validation order confirmed by tracing the actual withdraw flow: (1) the amount must be a valid number greater than 0; (2) both the sender and receiver accounts must exist (404, sender checked first); (3) the logged-in user must be the holder of the sender account (403 otherwise); (4) the sender and receiver cannot be the same account (400); (5) the sender's account must be active (403 otherwise); (6) the receiver's account must be active (403 otherwise); (7) the sender must be a Customer or Merchant, and the receiver must be an Agent (400 otherwise); (8) for a Customer sender, the daily/monthly spending-limit check runs (400 on breach); (9) the amount must meet the 10 BDT minimum (400 otherwise); (10) the sender's balance must be sufficient (208 otherwise); (11) on success, 3 ledger entries are written and 201 is returned.
- Confirmed fee rules (live values): the withdraw service fee is 1% of the amount with a 5 BDT minimum, paid to the platform; the Agent commission is 2.5% of the amount with no minimum, credited to the receiving Agent. The minimum withdraw amount is 10 BDT.
- Confirmed Customer spending limits (live values, both currently active): daily — 5000 BDT across up to 10 transactions; monthly — 50000 BDT across up to 50 transactions.
- Confirmed authentication behavior: no login token at all returns 401 "No Token Found!". A login token present but the partner secret-key header missing or wrong returns 401 "Secret auth key validation failure!". A correct secret key but an invalid or malformed token returns 403 "Token invalid!". A correct secret key but an expired token returns 403 "Token expired!".
- Seeded and live test accounts confirmed by checking the account records directly on 2026-08-06 (balances are a snapshot, re-verify with GET /transaction/balance/:account immediately before running, since other activity in this shared test environment can change them):
  - Customer2 — name "Test Customer", phone 01686606903, email salmansrabon+customer2@gmail.com, role Customer, status active, balance 11449.50 BDT, 0 outgoing (SendMoney/Payment/Withdraw) usage today and this month.
  - Agent — name "Test Agent", phone 01686606901, email salmansrabon+agent@gmail.com, role Agent, status active, balance 13104.50 BDT.
  - Test Customer 1 — phone 01686606902, role Customer, status active — used only as an invalid to_account (wrong role) and as a second identity for the ownership check.
  - Test Agent (pending) — phone 01786606901, role Agent, status pending (already inactive, no setup needed) — used for the inactive to_account case.
  - Low-balance Customer — phone 01201082604, role Customer, status active, balance 50.00 BDT, 0 usage today — used only for the insufficient-balance case. Password for this account has been confirmed — see TC-012.
  - All predefined seed accounts (Customer2, Agent, Test Customer 1) share the projects standard seeded test-account password; it is not written here, supply it separately when logging in.
  - Phone number 01699999999 was confirmed to not belong to any registered account — used as the account-not-found value.

Computed for a 500 BDT withdraw by Customer2 to the Agent: Service Fee = max(500 x 1%, 5.00) = 5.00; total debit from Customer2 = 500 + 5.00 = 505.00; Agent Commission = 500 x 2.5% = 12.50 (credited to the Agent, not returned in the API response). Expected post-transaction balances: Customer2 -> 11449.50 - 505.00 = 10944.50; Agent -> 13104.50 + 500 + 12.50 = 13617.00 (re-verify against live balances immediately before TC-013, since earlier cases in this document are all designed to be balance-neutral, but unrelated dev-DB activity is possible).

Run order matters, see the note on each case. All cases up to and including TC-012 are designed to leave account balances and the customer's daily/monthly usage counters unchanged (each of them fails before any ledger row is written), so they are safe to run in the order listed. TC-013 (the happy path) is the only case that actually writes ledger rows and changes balances and usage counters, run it last.

---

### TC-001

**Test Title:** Verify that a withdraw request is rejected when authentication is missing or invalid
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- None — this fails at the authentication middleware, before any account or business-rule check runs.

**Test Data:**
- Variant A — no Authorization header at all.
- Variant B — Authorization: Bearer <any token> present, but X-AUTH-SECRET-KEY header missing or set to a wrong value.
- Variant C — Authorization: Bearer <token> with the correct X-AUTH-SECRET-KEY, but the token is malformed or invalid (e.g. a random string).
- Variant D — same as C, but with a genuinely expired JWT.
- Body (irrelevant to the outcome, but kept realistic): from_account 01686606903, to_account 01686606901, amount 500

**Steps:**
1. Send POST /transaction/withdraw with the body above, using Variant A's headers.
2. Repeat with Variant B, C, and D's headers.

**Expected Result:**
- Variant A returns HTTP 401, message "No Token Found!".
- Variant B returns HTTP 401, message "Secret auth key validation failure!".
- Variant C returns HTTP 403, message "Token invalid!".
- Variant D returns HTTP 403, message "Token expired!".
- No ledger rows written in any variant.

---

### TC-002

**Test Title:** Verify that a withdraw request is rejected when the amount is missing or not a valid positive number
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Valid JWT for Customer2 (01686606903) and correct X-AUTH-SECRET-KEY header. (This check runs before the account-lookup step, so the specific from_account/to_account values do not matter, but real ones are used for realism.)

**Test Data:**
- Variant A — amount field omitted from the body entirely.
- Variant B — amount: "abc" (non-numeric string).
- Variant C — amount: 0.
- Variant D — amount: -500.
- from_account: 01686606903, to_account: 01686606901 in all variants.

**Steps:**
1. Send POST /transaction/withdraw with Variant A's body.
2. Repeat with Variant B, C, and D.

**Expected Result:**
- All four variants return HTTP 400, message "Amount must be a valid number greater than 0".
- No ledger rows written in any variant.

---

### TC-003

**Test Title:** Verify that a withdraw request is rejected when the paying customer's own account is not active
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Setup (perform immediately before this test, and revert immediately after — every later case in this document assumes Customer2 is active): an Admin sets Customer2's (01686606903) status to suspended via PATCH /user/update/:id.
- Login as Customer2 while suspended still succeeds (the login endpoint does not check status), so a valid JWT for Customer2 can still be obtained.

**Test Data:**
- from_account: 01686606903 (Customer2, status suspended for this test)
- to_account: 01686606901 (Agent, active)
- amount: 500

**Steps:**
1. While Customer2's status is suspended, log in as Customer2 and obtain a JWT.
2. Send POST /transaction/withdraw with the body above.
3. Immediately after: Admin reverts Customer2's status back to active via PATCH /user/update/:id, before proceeding to any other case in this document.

**Expected Result:**
- HTTP 403, message "Your account is not active. Please contact admin.".
- No ledger rows written.

---

### TC-004

**Test Title:** Verify that a withdraw request is rejected when the paying (sender) account does not exist
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Valid JWT for Customer2 (01686606903) is available (used to satisfy the JWT layer only — the account-existence check runs before the JWT-vs-from_account ownership check, so the auth failure never gets reached in this case).

**Test Data:**
- from_account: 01699999999 (confirmed not present in Users)
- to_account: 01686606901 (Agent, active)
- amount: 500

**Steps:**
1. Send POST /transaction/withdraw with the body above.

**Expected Result:**
- HTTP 404, message "From Account does not exist".
- No ledger rows written.

---

### TC-005

**Test Title:** Verify that a withdraw request is rejected when the receiving account does not exist
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Valid JWT for Customer2 and correct X-AUTH-SECRET-KEY header.

**Test Data:**
- from_account: 01686606903 (Customer2, active)
- to_account: 01699999999 (confirmed not present in Users)
- amount: 500

**Steps:**
1. Send POST /transaction/withdraw with the body above.

**Expected Result:**
- HTTP 404, message "To Account does not exist".
- No ledger rows written.

---

### TC-006

**Test Title:** Verify that a withdraw request is rejected when the sender and receiver accounts are the same
**Type:** Negative — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Valid JWT for Customer2 and correct X-AUTH-SECRET-KEY header.

**Test Data:**
- from_account: 01686606903
- to_account: 01686606903
- amount: 500

**Steps:**
1. Send POST /transaction/withdraw with the body above.

**Expected Result:**
- HTTP 400, message "From account and to account cannot be the same".
- No ledger rows written.

---

### TC-007

**Test Title:** Verify that a withdraw request is rejected when the receiving account is not an Agent
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Valid JWT for Customer2 and correct X-AUTH-SECRET-KEY header.
- Test Customer 1 (01686606902) is active, role Customer.

**Test Data:**
- from_account: 01686606903 (Customer2, active)
- to_account: 01686606902 (Test Customer 1 — active, but role Customer, not Agent)
- amount: 500

**Steps:**
1. Send POST /transaction/withdraw with the body above.

**Expected Result:**
- HTTP 400, message "To Account is not agent account".
- No ledger rows written.

---

### TC-008

**Test Title:** Verify that a withdraw request is rejected when the receiving Agent's account is not active
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Valid JWT for Customer2 and correct X-AUTH-SECRET-KEY header.
- Confirmed live: phone 01786606901 is an Agent-role account with status pending — no setup needed.

**Test Data:**
- from_account: 01686606903 (Customer2, active)
- to_account: 01786606901 (Agent, status pending)
- amount: 500

**Steps:**
1. Send POST /transaction/withdraw with the body above.

**Expected Result:**
- HTTP 403, message "Agent account is not active. Please contact admin.".
- No ledger rows written.

---

### TC-009

**Test Title:** Verify that a customer cannot initiate a withdraw from another customer's account
**Type:** Negative — Security — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Valid JWT for Test Customer 1 (01686606902, active) and correct X-AUTH-SECRET-KEY header.

**Test Data:**
- Logged-in identity: Test Customer 1 (01686606902)
- from_account: 01686606903 (Customer2 — not the logged-in user)
- to_account: 01686606901 (Agent, active)
- amount: 500

**Steps:**
1. Log in as Test Customer 1 and obtain a JWT.
2. Send POST /transaction/withdraw with from_account set to Customer2's phone number, using Test Customer 1's JWT.

**Expected Result:**
- HTTP 403, message "Unauthorized: you can only initiate transactions from your own account".
- No ledger rows written.

---

### TC-010

**Test Title:** Verify that a withdraw request is rejected when the amount is below the minimum
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Valid JWT for Customer2 and correct X-AUTH-SECRET-KEY header.
- Customer2 active, sufficient balance, no daily/monthly limit already exhausted.

**Test Data:**
- from_account: 01686606903, to_account: 01686606901
- amount: 5 (below the confirmed 10 BDT minimum; total debit incl. fee = 10, which does not breach the daily/monthly limit, so this reaches the minimum-amount check)

**Steps:**
1. Send POST /transaction/withdraw with the body above.

**Expected Result:**
- HTTP 400, message "Minimum withdraw amount is 10 tk", with currentBalance reflecting Customer2's balance at the time.
- No ledger rows written.

---

### TC-011

**Test Title:** Verify that a withdraw request is rejected when it would breach the customer's daily transaction-amount limit
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Valid JWT for Customer2 and correct X-AUTH-SECRET-KEY header.
- Note: the daily cap (5000 BDT) is always the binding constraint for a single request — any amount that breaches it also fails before the monthly cap (50000 BDT) is ever the limiting factor, so daily and monthly breaches are not separately testable via one request; this case covers the limit-check branch as a whole.

**Test Data:**
- from_account: 01686606903, to_account: 01686606901
- amount: 5000 (fee = 50.00, total debit = 5050, which alone exceeds the 5000 daily cap regardless of same-day usage from earlier cases in this document, since none of them write ledger rows)

**Steps:**
1. Send POST /transaction/withdraw with the body above.

**Expected Result:**
- HTTP 400, message beginning "Daily amount limit exceeded...", with a details object reporting the daily period, maxAmount 5000, and the remaining headroom.
- No ledger rows written.

---

### TC-012

**Test Title:** Verify that a withdraw request is rejected when the customer's account balance is insufficient to cover the amount and fee
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Valid JWT for the low-balance Customer (01201082604, active, confirmed live balance 50.00 BDT, 0 usage today) and correct X-AUTH-SECRET-KEY header.
- Login credentials for 01201082604 confirmed: the account's stored password was independently verified to match the project's standard seeded test-account password (verified 2026-08-06 directly against the account records) — the same password already used for Customer2/Agent/Test Customer 1 elsewhere in this document; supply it separately when logging in, it is not written here.

**Test Data:**
- from_account: 01201082604, to_account: 01686606901 (Agent, active)
- amount: 500 (fee = 5.00, total debit = 505, which exceeds the account's 50.00 BDT balance while staying well under the 5000 BDT daily limit, so this reaches the balance check)

**Steps:**
1. Send POST /transaction/withdraw with the body above.

**Expected Result:**
- HTTP 208, message "Insufficient balance", with currentBalance reflecting the account's actual balance (approximately 50.00).
- No ledger rows written (the DB transaction rolls back).

---

### TC-013

**Test Title:** Verify that Customer2 can successfully cash out 500 BDT to an Agent
**Type:** Positive — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run
**Preconditions:**
- Valid JWT for Customer2 (01686606903) and correct X-AUTH-SECRET-KEY header.
- Customer2 active, balance confirmed >= 505 BDT, 0 daily/monthly usage exhausted.
- Agent (01686606901) active.
- Run this case last — it is the only one in this document that writes real ledger rows and changes balances/usage counters.

**Test Data:**
- from_account: 01686606903, to_account: 01686606901, amount: 500

**Steps:**
1. Send POST /transaction/withdraw with the body above.
2. GET /transaction/balance/01686606903 to confirm Customer2's new balance.
3. GET /transaction/balance/01686606901 to confirm the Agent's new balance.
4. GET /transaction/search/:trnxId (using the trnxId from step 1's response) to confirm the ledger rows.

**Expected Result:**
- Step 1 returns HTTP 201, message "Withdraw successful", fee 5, and currentBalance equal to Customer2's balance immediately before the call minus 505 (computed from the live snapshot above: 11449.50 -> 10944.50; re-verify against the actual pre-call balance).
- Step 2 shows Customer2's balance is 505 lower than it was immediately before step 1.
- Step 3 shows the Agent's balance is 512.50 higher than it was immediately before step 1 (500 principal + 12.50 commission).
- Step 4 shows exactly 3 rows share the returned trnxId, all tagged transaction_type "Withdraw": a debit of 505 on Customer2's account, a credit of 512.50 on the Agent's account, and a credit of 5.00 on the SYSTEM account.
