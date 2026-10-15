# Create User - Sanity Test Cases (API / Postman)

> No Jira ticket was provided for this request. Per the test-design skill's no-ticket rule, this
> document was written directly from the implementation, the live application database (read-only),
> and existing Postman/API evidence — not from an approved requirement. Section 1 (Feature Summary) is
> omitted per the same rule (an ad-hoc "write test cases" ask wants the cases, not a preamble), and no
> companion bug.md / review.md files exist since there is no ticket key to file them under. The
> adversarial review (qa-agent-advocate, Test Case Review Mode) still applies to this document; its
> verdicts are applied directly to the cases rather than recorded in a separate review file.
>
> **Revision note:** this document was revised after its first pass at the requester's direction. It
> now covers `POST /user/create` **only**, tested at the API level (e.g. via Postman) — not the
> browser UI, and not self-registration (`POST /user/register`), both of which were in the first pass
> and have been removed. Cases are grouped as **Positive** and **Negative**, not "new behavior /
> related regression" as before. Three cases (old TC-002, TC-014, TC-015) carry corrections made by
> `qa-agent-advocate` during the first pass's review; those corrections are preserved here under their
> new numbers (see the Coverage Summary for the old→new mapping context).

## 2. Acceptance Criteria

Derived from the implementation and the API's existing contract - the ticket did not state these,
since there is no ticket.

- AC-1: Only an authenticated Admin can create a new user account through `POST /user/create`.
- AC-2: A created account requires a name, a Gmail email address, a password, an 11-character phone
  number, a national ID (7-13 characters), and a role that exists in the system's role list.
- AC-3: An Admin may create an account with any of the four system roles - Admin, Agent, Customer, or
  Merchant.
- AC-4: An account cannot be created with an email address or phone number already used by an existing
  account.
- AC-5: A newly created account's status always starts as "pending"; the creator cannot set the status
  directly at creation time.
- AC-6: The account's password is stored hashed and is never returned in the creation response or any
  later lookup of that account.
- AC-7: A newly created account can log in immediately, and once logged in, can use whatever its role
  grants access to right away - the "pending" status does not by itself block login or role-gated
  actions (it is a separate gate, checked only by the money-movement endpoints - see AC-8).
- AC-8: A "pending" Customer, Agent, or Merchant account cannot complete a money transfer (cash-in,
  cash-out, send money, or payment) until an Admin changes its status to "active".

## 3. Basic Test — verify the feature works end to end

**Environment preconditions:**
- The backend API is running and reachable (e.g. from Postman).
- The database's role list already contains the four canonical roles (`Admin`, `Agent`, `Customer`,
  `Merchant`) — confirmed present in this environment; on a freshly initialized database this list
  must be populated first, or every account-creation attempt fails with an "Invalid role" error before
  reaching any other check.
- An active Admin account exists to authenticate as (for example, the seeded `admin@dmoney.com`
  account).

**Steps (API-only):**

1. Call `POST /user/login` with the Admin account's email and password. Because the account's role is
   Admin, the response returns a JWT token directly, in the same response — Admin logins skip the OTP
   step entirely.
2. Call `POST /user/create` with the `Authorization` header set to that token, the partner secret-key
   header set to the value configured for this environment, and a body containing a name, a
   not-already-registered Gmail address, a password, a not-already-registered 11-digit phone number, an
   NID, and role set to `Customer`.
3. Observe the response.

**What proves it passed:** The response is HTTP 201, its body contains the newly created account's
data (the requested name/email/phone/NID/role, and status `pending`), and it does **not** contain a
password or password-hash field anywhere. If the status code differs or any of that is missing, stop
here and report it — the individual cases below are not worth attempting until this passes.

## 4. System Behavior Tests

**Running this set in Postman — order and independence:** run the cases in the order below, top to
bottom, in one collection pass; this is safe to do repeatedly, with no manual cleanup needed between
cases or between runs. Most cases generate their own brand-new email and phone number on every
execution, so re-running the whole collection again against the same environment does not collide with
data left behind by a previous run. Two cases are the exception and say so explicitly in their own
Preconditions: TC-002 and TC-014 both reuse an account that TC-001 creates, rather than creating their
own — TC-002 logs in as the Admin-role account TC-001 just created, and TC-014 relies on the
Customer-role account TC-001 just created still being "pending". Both require TC-001 to have already
run earlier in the same pass; that is why TC-001 is first — TC-002 immediately follows it, and TC-014
follows much later in the sequence, but both come after TC-001, never before it. One further case
(TC-009) deliberately does the opposite — it targets a stable, pre-existing seeded account instead of
one created earlier in this collection, specifically so it does not depend on run order at all; that
choice is called out in its own Preconditions too.

### 4a. Positive Test Cases

### TC-001

**Test Title:** Verify that an Admin can create a new account for each of the four system roles
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Caller is authenticated as an active Admin (for example, `admin@dmoney.com`), with a valid partner
  secret key.
- The database's role list contains `Admin`, `Agent`, `Customer`, `Merchant` (confirmed present in
  this environment).

**Test Data:**

- Name: any 3–50 character name, e.g. `QA Create Test`
- Email: a fresh, not-already-registered Gmail address for each attempt, e.g.
  `qa.create.<unique>@gmail.com`
- Password: any value 4+ characters, e.g. `test1234`
- Phone number: a fresh, not-already-registered 11-digit number for each attempt
- NID: any value 7–13 characters, e.g. `1234567890`
- Role: `Admin`, `Agent`, `Customer`, `Merchant` (one account per role)

**Steps:**

1. Call `POST /user/create` as the Admin, once per role value, each time with a fresh unique email and
   phone number.
2. Look up each created account afterward (e.g. via the user-search endpoints).

**Expected Result:**

- Each request succeeds (HTTP 201) and the account is created with the requested role.
- Each new account's status is `pending`, regardless of role.
- The response body for each creation never includes the account's password or password hash in any
  form.
- Keep the Admin-role account and the Customer-role account created here — TC-002 and TC-014 (below)
  each reuse one of them rather than creating their own.

### TC-002

**Test Title:** Verify that a newly created Admin account can log in and use admin privileges
immediately, before any status change
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- **Depends on TC-001:** requires the Admin-role account TC-001 created — its status defaults to
  "pending" and is never changed. Run TC-001 first in this collection pass; do not create a separate
  account for this case.

**Test Data:**

- The Admin-role account's email and password from TC-001.

**Steps:**

1. Call `POST /user/login` as the newly created Admin account, using its email and password.
2. Using the token returned, call an action that is genuinely restricted to Admins only — for example,
   create another account, or delete an existing account. (Listing users is not a suitable example
   here: that endpoint accepts any authenticated caller, not just Admins, so it would not demonstrate
   admin-level access.)

**Expected Result:**

- Login succeeds immediately and skips the OTP step, exactly as for any other Admin account — the
  account's "pending" status does not block login.
- The admin-only action succeeds using the new account's token — its "pending" status does not by
  itself prevent it from using admin-level actions.

### 4b. Negative Test Cases

This group also includes a few cases whose `Type:` is `Functional` or `Security` rather than
`Negative`, grouped here because their primary assertion is a rejection, a duplicate-prevention
outcome, or a noteworthy edge-case acceptance that is confirmed but not a clean happy path (TC-008's
role-casing check, TC-010's special-character phone number, TC-011's concurrent-request check). Each
says so inline.

### TC-003

**Test Title:** Verify that account creation is rejected when a required field is missing or when the
account status is set directly
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Caller is authenticated as an active Admin.

**Test Data:**

- A payload structured like TC-001's (fresh unique email/phone each attempt), with exactly one of the
  following removed or added per attempt: name, email, password, phone_number, nid, role missing; or
  an extra status field added (e.g. status: active).

**Steps:**

1. Submit the create-user request with one field missing (or the extra status field present) at a
   time.

**Expected Result:**

- The name, email, password, phone_number, and nid missing-field variants are each rejected with HTTP
  400 and a field-validation message naming the missing field; no account is created in any case.
- The status-included variant is rejected with HTTP 400 because status is not an accepted field on
  this request - a caller cannot set the initial status of an account it is creating.
- The missing-role variant behaves differently from the other missing-field variants: the role-list
  lookup that runs before field validation raises an error when role is absent from the payload
  (confirmed by reproducing the same lookup directly against this environment), and the request is
  rejected with HTTP 500 rather than HTTP 400. No account is created.

### TC-004

**Test Title:** Verify that account creation is rejected when the email address is not a Gmail address
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Caller is authenticated as an active Admin.

**Test Data:**

- A payload structured like TC-001's, with email set to a non-Gmail address, e.g.
  qa.create@outlook.com

**Steps:**

1. Submit the create-user request with the non-Gmail email.

**Expected Result:**

- The request is rejected (HTTP 400) with a message stating only Gmail addresses are allowed.
- No account is created.

### TC-005

**Test Title:** Verify that account creation is rejected when the phone number or NID length is
outside the allowed boundary
**Type:** Negative — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Caller is authenticated as an active Admin.

**Test Data:**

- A payload structured like TC-001's, with one field replaced per attempt:
  - phone_number = a 10-digit value (one short of the required 11)
  - phone_number = a 12-digit value (one over the required 11)
  - nid = a 6-character value (one short of the minimum 7)
  - nid = a 14-character value (one over the maximum 13)

**Steps:**

1. Submit the create-user request with each out-of-range value in turn.

**Expected Result:**

- Every variant is rejected (HTTP 400) with a validation message naming the offending field.
- No account is created in any case.

### TC-006

**Test Title:** Verify that account creation is rejected when the password is shorter than the minimum
length
**Type:** Negative — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Caller is authenticated as an active Admin.

**Test Data:**

- A payload structured like TC-001's, with password set to a 3-character value, e.g. abc

**Steps:**

1. Submit the create-user request with the too-short password.

**Expected Result:**

- The request is rejected (HTTP 400) with a validation message about the password field.
- No account is created.

### TC-007

**Test Title:** Verify that account creation is rejected when the role does not exist in the system's
role list
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Caller is authenticated as an active Admin.
- The database's role list contains only Admin, Agent, Customer, Merchant (confirmed via direct
  inspection of this environment's role list).

**Test Data:**

- A payload structured like TC-001's, with role set to a value not present in the role list, e.g.
  SuperAdmin

**Steps:**

1. Submit the create-user request with the unrecognized role value.

**Expected Result:**

- The request is rejected (HTTP 400) with a message identifying the role as invalid.
- No account is created.

### TC-008

**Test Title:** Verify that a newly created account's role exactly matches one of the system's four
canonical role names
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Caller is authenticated as an active Admin.
- The database's role list contains Customer (capitalized); it does not contain a separate,
  differently-cased customer entry.
- Dual-natured case: the request below is not expected to be rejected outright - the risk under test
  is what gets stored, not whether the call succeeds, which is why it sits in this Negative group
  despite its Type being Functional.

**Test Data:**

- A payload structured like TC-001's, with role set to customer (all lower-case) instead of Customer.

**Steps:**

1. Submit the create-user request with the lower-cased role value.
2. If the account is created, look up the stored role value on that account.

**Expected Result:**

- The account's stored role, if creation succeeds, is exactly Customer - matching the casing used
  everywhere else in the system, since account-role checks elsewhere in the application compare the
  role value as an exact string match (for example, the money-transfer endpoints require the role to
  read exactly Customer, Agent, or Merchant). A role value stored in a different casing than the
  canonical name would not be recognized correctly by those checks.

### TC-009

**Test Title:** Verify that account creation is rejected when the email or phone number already
belongs to an existing account
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Caller is authenticated as an active Admin.
- An account already exists with a known email and phone number (for example, the seeded "Test
  Customer 1" account - email ending +customer1@gmail.com, an 11-digit phone number already on file).
  This case deliberately targets that pre-existing seeded account rather than one TC-001 creates, so
  it does not depend on TC-001 (or any other case) having run first - it is safe to run in isolation.

**Test Data:**

- Variant A: a payload structured like TC-001's, but email set to the existing account's email
  address.
- Variant B: a payload structured like TC-001's, but phone_number set to the existing account's phone
  number.

**Steps:**

1. Submit the create-user request with the colliding email (all other fields fresh and valid).
2. Submit a separate create-user request with the colliding phone number (all other fields fresh and
   valid).

**Expected Result:**

- Both variants are rejected with HTTP 208 and a message stating the account already exists.
- No new account is created in either case; the existing account is left unchanged.

### TC-010

**Test Title:** Verify that a phone number containing non-numeric characters is still accepted at
account-creation time
**Type:** Security — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Caller is authenticated as an active Admin.
- Phone number validation on this endpoint checks length only (exactly 11 characters), not character
  set.
- Dual-natured case: this is grouped as Negative because the risk under test is an unwanted
  acceptance, not because the request itself is expected to fail.

**Test Data:**

- A payload structured like TC-001's, with phone_number set to an 11-character value containing a
  special character, e.g. 0123456789' (10 digits plus a trailing single quote - 11 characters total).

**Steps:**

1. Submit the create-user request with the special-character phone number.
2. Look up the created account's stored phone number.

**Expected Result:**

- The account is created (length requirement satisfied) and the phone number is stored exactly as
  submitted, special character included.
- This confirms the field accepts characters that are not digits; whether a stored value like this
  later causes problems for other features that build queries from the phone number is outside this
  document's scope (see Coverage Summary).

### TC-011

**Test Title:** Verify that two simultaneous account-creation requests using the same brand-new phone
number do not both succeed
**Type:** Functional — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Caller is authenticated as an active Admin.
- Phone number uniqueness for new accounts is enforced only by a check performed before the insert,
  not by a database-level uniqueness constraint.
- Dual-natured case: one of the two requests below is expected to succeed - the assertion under test
  is that the other one does not, i.e. exactly one, not both and not neither.

**Test Data:**

- Two otherwise-valid payloads sharing the same brand-new, not-yet-used phone number and different
  emails.

**Steps:**

1. Fire both create-user requests for the same phone number at (as close to) the same time.

**Expected Result:**

- Only one of the two requests results in a created account; the other is rejected as a duplicate.
- Exactly one account exists afterward with that phone number, not two.

### TC-012

**Test Title:** Verify that a non-admin account cannot create a new user account
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Caller is authenticated, but with a non-Admin role.

**Test Data:**

- A payload structured like TC-001's, submitted by a caller authenticated as Agent, then again as
  Customer, then again as Merchant.

**Steps:**

1. Submit the create-user request while authenticated as each non-admin role in turn.

**Expected Result:**

- Every attempt is rejected (HTTP 403) with a message stating only an admin can create new users.
- No account is created in any case.

### TC-013

**Test Title:** Verify that account creation is rejected when authentication is missing or invalid
**Type:** Security — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- None (unauthenticated caller).

**Test Data:**

- Variant A: a valid create-user payload sent with no Authorization header at all.
- Variant B: the same payload sent with a valid Admin token but a missing or incorrect partner secret
  key header.

**Steps:**

1. Submit the create-user request with no auth token.
2. Submit the create-user request with a valid token but the wrong secret key header.

**Expected Result:**

- Both variants are rejected (HTTP 401) and no account is created.

### TC-014

**Test Title:** Verify that a newly created, still-pending Customer account cannot complete a money
transfer until an Admin activates it
**Type:** Negative — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**

- Depends on TC-001: uses the Customer-role account TC-001 created. Freshly created accounts always
  start "pending" and are never activated anywhere in this test set, so this avoids relying on any
  pre-existing seeded account whose status might have changed since these cases were written. Run
  TC-001 first in this collection pass.
- Fallback if TC-001 was not run / this case is run in isolation: the seeded "Test Agent" account with
  email agent@roadtocareer.net and phone number 01786606901 is pending in this environment - note this
  is a different seeded account from the also-named "Test Agent" at salmansrabon+agent@gmail.com /
  01686606901, which is active; use the full email or phone number rather than the last four digits to
  avoid picking the wrong one.
- A valid counterpart account to transact with also exists and is active.

**Test Data:**

- The pending account's login identifier, and a small transfer amount, e.g. 50.

**Steps:**

1. Log in as the pending account (Customer/Agent/Merchant logins go through OTP, unlike Admin).
2. Attempt a money-movement action available to that role (for example, sending money, cashing out, or
   making a payment) from that account.

**Expected Result:**

- The transfer is rejected (HTTP 403), with a message indicating the account is not active.
- No transaction records are created for the attempt.

## 5. White-box Tests

No additional whitebox tests are justified. Every material branch in this feature (field validation,
role-list lookup, duplicate checks, status defaulting, password exposure, authorization) is directly
observable through the create-user API response or a subsequent account lookup - none of it requires
calling anything below that interface.

## 6. Coverage Summary

- AC-1 (Admin-only creation): TC-012, TC-013
- AC-2 (required fields and formats): TC-003, TC-004, TC-005, TC-006
- AC-3 (all four roles creatable by Admin): TC-001
- AC-4 (duplicate email/phone rejected): TC-009
- AC-5 (status always starts pending, not settable at creation): TC-001, TC-003
- AC-6 (password never exposed): TC-001
- AC-7 (login and role-gated access independent of status): TC-002
- AC-8 (pending accounts blocked from money transfers): TC-014

Also covered as confirmed-boundary and risk-driven edge cases, not tied to a single AC: role-list and
role-casing correctness (TC-007, TC-008), and two confirmed code-level risk areas called out directly
in this project's engineering documentation - unrestricted phone-number character set (TC-010) and
unguarded concurrent duplicate creation (TC-011).

**Not covered:**

- Self-registration (POST /user/register) - explicitly out of scope for this revision; it was covered
  in the first pass of this document and was removed at the requester's direction, since it is a
  separate, unauthenticated flow with its own validation rules.
- The browser "Create User" screen and any UI-level behavior (for example, how a duplicate-account
  response is displayed on screen) - explicitly out of scope for this revision, which tests
  POST /user/create at the API level only. A UI-level companion set would need its own document.
- Photo upload during/after account creation - a separate feature (POST /user/upload/:id), not part of
  the create-user contract itself.
- Full combinatorial boundary testing of every field length (only the confirmed min/max edges for
  phone number, NID, and password are exercised - sanity scope, not exhaustive regression).
- The downstream consequence of a phone number containing SQL-metacharacter content (TC-010 confirms
  such a value can be stored; whether it later corrupts a balance lookup that concatenates it into a
  raw query is a Balance/Statement-feature risk, not a Create-User risk, and needs its own dedicated
  security test there).
- Full end-to-end OTP verification for a newly created Customer/Agent/Merchant login - the OTP
  mechanism itself belongs to the Login feature's own test set; this document only confirms that a
  status of "pending" does not block the login attempt from reaching that point.
- Update (PUT/PATCH) and delete of a just-created account - a separate feature (User Management -
  Update/Delete), only relevant here as account-activation context for TC-014, not as its own coverage
  target.

## 7. Top Test Cases

- Verify that an admin can create a new account for each of the four system roles.
- Verify that a newly created Admin account can log in and use admin privileges immediately.
- Verify that account creation is rejected when a required field is missing.
- Verify that account creation is rejected when the email address is not a Gmail address.
- Verify that account creation is rejected when the phone number or NID length is out of range.
- Verify that account creation is rejected when the password is shorter than the minimum length.
- Verify that account creation is rejected when the role does not exist in the system's role list.
- Verify that a newly created account's role matches the system's canonical role names exactly.
- Verify that account creation is rejected when the email or phone number already belongs to an
  existing account.
- Verify that a phone number containing special characters is still accepted at account-creation time.
- Verify that two simultaneous account-creation requests for the same phone number do not both
  succeed.
- Verify that a non-admin account cannot create a new user account.
- Verify that account creation is rejected when authentication is missing or invalid.
- Verify that a newly created, still-pending account cannot complete a money transfer until an admin
  activates it.
