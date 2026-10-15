# DMoney Login API — Sanity Test Cases (Postman / API-only)

> **No Jira ticket exists for this request.** Per the test-design skill's no-ticket rule, this
> document is written directly from the login/OTP implementation (`POST /user/login`,
> `POST /user/verify-otp`), this project's own architecture documentation (`CLAUDE.md`), and the
> live application database (read-only queries only — no writes were made to reach these
> conclusions). It is written to `Test-Ducoment/login.md` at the requester's explicit instruction,
> which overrides the skill's normal "no ticket → reply only, no file" default.
>
> **This is a test-case-only pass.** `find-bug` was not run. Every case's **Any Issue?** field
> reads `N/A — bug hunt not yet run` — this does not mean the behavior was checked and found
> clean, only that no dedicated bug hunt has happened yet. No companion `bug.md` exists for the
> same reason, and no companion `review.md` exists because there is no ticket key to file it
> under. The adversarial review (`qa-agent-advocate`, Test Case Review Mode) still applies to this
> document; its verdicts are applied directly to the cases below rather than recorded in a
> separate file.
>
> **Scope:** `POST /user/login` and `POST /user/verify-otp` only, exercised as raw HTTP requests
> (Postman or equivalent) — no browser UI, and explicitly **not** `POST /user/register`,
> forgot-password, or reset-password.

## 1. Feature Summary

- **What this feature does for the user:** Lets someone prove they are who they say they are,
  using an email address or phone number plus a password, so the system can hand them a session
  they can use for everything else.
- **What changed:** Nothing — there is no ticket or diff behind this document. It is a sanity
  review of the login and OTP-verification behavior as it exists today, written because testing
  was requested, not because the behavior was just modified.
- **Who is affected:** Every account type — Admin, Agent, Customer, Merchant — plus the internal
  SYSTEM account, which logs in the same way an Agent would.
- **Business flows touched:** Signing in; completing a one-time-password (OTP) check after
  signing in.
- **Related flows that could break:** None are exercised by this pass, but every other business
  flow in the system (deposits, withdrawals, transfers, payments, profile changes) depends on the
  session this flow produces — see the scope note below for why those flows are not chained into
  these cases.
- **Change tier:** Logic / contract / authentication — treated as a full sanity pass because this
  is the system's authentication gate, not a cosmetic surface.
- **Intent source:** Derived from the implementation and from this project's own documentation,
  since no ticket or requirement document exists for this request.
- **Scope:** Sanity — login and OTP verification are tested as a self-contained API contract.

**Why this is sanity/API contract testing, not integration testing:** every case below starts and
ends at the login/OTP boundary — it checks the request that goes in and the response (status
code, body, and where relevant the account's stored OTP and status state) that comes out, for this
pair of endpoints only. None of these cases chain a successful login into a follow-on action on a
different endpoint (for example, taking the token from a successful login and then attempting a
deposit or a profile update) — that kind of chained, cross-endpoint scenario is integration
testing, and it belongs to whichever feature's own test set consumes a login token as its
precondition (every other endpoint in this API already treats "caller is logged in with role X"
as a precondition it states for itself). Keeping login's own test set isolated to its own contract
means a failure here always points at authentication itself, never at some other endpoint's logic
riding along in the same test; it also means this set stays valid regardless of what any other
feature does with the token afterward. The one exception is fixture setup: a small number of cases
below use the Admin's own login (via this same API) to reach `PATCH /user/update/:id` purely to
arrange a precondition (for example, suspending an account) — that reuse is fixture setup, not a
tested integration path, and each such case says so explicitly.

## 2. Acceptance Criteria

No ticket exists, so these are derived from the implementation and from this project's own
documentation (`CLAUDE.md` §5.4), not stated by a requirement.

- **AC-1:** A user can authenticate using either their email address or their phone number,
  combined with the correct password, and the identifier's letter case does not have to match how
  it is stored.
- **AC-2:** An Admin account, and the internal SYSTEM account, receive an access token immediately
  on correct credentials — no OTP step.
- **AC-3:** Any other role (Agent, Customer, Merchant) receives an OTP-required response instead
  of a token on correct credentials, and must complete a second verification step
  (`POST /user/verify-otp`) to obtain the token.
- **AC-4:** An OTP is valid for a limited time (2 minutes) and is single-use: it cannot be
  verified again after a successful verification, and issuing a new OTP (by logging in again)
  supersedes whatever OTP was issued by an earlier login call for the same account.
- **AC-5:** Login is rejected with a clear error when the identifier does not exist, the password
  is incorrect, or a required field is missing — without ever generating or sending an OTP in
  those cases.
- **AC-6:** OTP verification is rejected with a clear error when the OTP is wrong, expired, when
  required fields are missing, when the identifier does not match any account, or when no OTP was
  ever requested for that identifier.
- **AC-7:** A configuration-controlled override exists that can bypass normal OTP checking using a
  fixed value — this document tests that it currently works exactly as configured in this
  environment, since its existence is itself a documented risk if ever enabled outside a
  development environment.

**Not derivable from any available source (flagged, not assumed):** whether an account's
`pending`/`suspended` status is *meant* to block login is not stated anywhere — the code simply
never checks it at this endpoint. TC-007 tests the actual current behavior; it is not asserted
here as an intended requirement.

## 3. Basic Test — verify the feature works end to end

**Environment preconditions:**
- The backend API is running and reachable (e.g. from Postman) at the environment's configured
  base URL.
- The tester can see the API server's console/log output. This is not optional: the application
  always prints the OTP to the server console for every non-bypass login, regardless of whether an
  OTP email is also sent — for a test environment, the console is the one delivery channel
  guaranteed to work, and this document relies on it throughout.
- A known active, non-Admin account exists to sign in with — for example, the seeded "Test Agent"
  account (email `salmansrabon+agent@gmail.com`, phone `01686606901`, password `1234` — the
  standard seeded test password documented in this project's own setup notes).
- A known active Admin account exists — for example, the seeded `admin@dmoney.com` account
  (phone `01686606909`, password `1234`).

**Steps (API-only):**
1. Call `POST /user/login` with the Test Agent's email and password.
2. Observe the response: it reports that an OTP was sent and does **not** contain a token.
3. Read the OTP for this identifier from the server's console log.
4. Call `POST /user/verify-otp` with the same identifier and the OTP just read.
5. Observe the response: it now contains a token and the account's role.
6. Separately, call `POST /user/login` with the Admin account's email and password.
7. Observe the response: it contains a token immediately, in this same call — no OTP step.

**What proves it passed:** step 2 returns HTTP 200 with `otpRequired: true` and no token; step 5
returns HTTP 200 with a token and `role: "Agent"`; step 7 returns HTTP 200 with a token and
`role: "Admin"` in the same response as the login call itself. If any of these three responses
differs in shape or status code, stop here and report it — the individual cases below are not
worth attempting until this passes.

## 4. System Behavior Tests

**Running these in Postman — order and independence:** run the cases below in order, top to
bottom, in one pass. Most cases use a dedicated seeded account so they do not collide with each
other. Three cases are explicit exceptions and say so in their own Preconditions: TC-003 depends
on TC-002 (it verifies the OTP TC-002 just requested), TC-012 depends on TC-010 (it reuses the
exact OTP TC-010 already proved works), and TC-013 depends on TC-002/TC-003 having already run
(it needs the Test Agent account's OTP slot to be free again, which it is once TC-003 has
consumed it). TC-007 temporarily changes a shared seeded account's `status` via the Admin and
explicitly restores it afterward — do not skip that restoration step, since other test documents
in this project reuse the same seeded accounts. TC-002 also changes a password via the Admin, but
on a pre-existing, non-seeded account (`agent@roadtocareer.net`) whose original password was never
known to begin with — that change is one-time and not reversible, and it is safe only because no
other case in this document logs into that account afterward; see TC-002's own Preconditions.

### 4a. Positive & Core Flow Tests

### TC-001

**Test Title:** Verify that an Admin or the SYSTEM account receives an access token immediately, without an OTP step, when logging in with correct credentials
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Two active accounts exist: the seeded Admin (`admin@dmoney.com` / `01686606909` / password
  `1234`) and the seeded SYSTEM account (`system@dmoney.com` / phone `SYSTEM` / password `1234`).

**Test Data:**
- Admin — email `admin@dmoney.com`, password `1234`
- Admin — phone `01686606909`, password `1234`
- SYSTEM — email `system@dmoney.com`, password `1234`
- SYSTEM — phone `SYSTEM`, password `1234`

**Steps:**
1. Call `POST /user/login` once for each of the four Test Data rows above.

**Expected Result:**
- Every call returns HTTP 200 in the same response as the login call itself, with body
  `{ message: "Login successful", token: <jwt>, role: "Admin" }` for the Admin rows and
  `role: "Agent"` for the SYSTEM rows (SYSTEM's stored role is Agent — the bypass is triggered by
  its phone number being `SYSTEM`, not by a distinct role value).
- No OTP is generated for any of the four calls — `otpRequired` never appears in any of these
  responses.
- Identifying the account by email or by phone number produces the same outcome for both
  accounts.

### TC-002

**Test Title:** Verify that Agent, Customer and Merchant accounts are required to complete an OTP step, and that the OTP is always available to the account holder even when it is not emailed
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- The seeded Test Agent account is active: `salmansrabon+agent@gmail.com` / `01686606901` /
  password `1234`.
- A second, non-Gmail Agent account already exists in this environment with a status of
  `pending`: `agent@roadtocareer.net` / phone `01786606901`. Its original password was never
  known, so before this case: log in as the Admin (per TC-001) and call `PATCH /user/update/:id`
  for this account's id, setting a known password (e.g. `Test@1234`), to make it usable as the
  non-Gmail test identity for this case. (This is fixture setup via the Admin's own login, not an
  integration path being tested — see the scope note in §1.) This password change is permanent —
  the original value cannot be restored because it was never known — and that is acceptable here
  because no later case in this document logs into this account again; its `pending` status is
  left untouched.

**Test Data:**
- Gmail account: `salmansrabon+agent@gmail.com` / `01686606901`, password `1234`
- Non-Gmail account: `agent@roadtocareer.net` / `01786606901`, password as just reset

**Steps:**
1. Call `POST /user/login` with the Gmail Agent account's credentials.
2. Check the server console log for this identifier, and (if that mailbox is reachable to the
   tester) check whether an OTP email arrived.
3. Call `POST /user/login` with the non-Gmail Agent account's credentials.
4. Check the server console log for this identifier, and whether any OTP email was attempted.

**Expected Result:**
- Both calls return HTTP 200 with `{ message: "OTP sent to your registered email address", otpRequired: true }` and no token.
- Both calls generate a 4-digit numeric OTP (always between `1000` and `9999`) that is printed to
  the server console, regardless of the account's email domain.
- Only the Gmail account (step 1–2) triggers an attempt to email the OTP; the non-Gmail account
  (step 3–4) does not — the console log is the only delivery channel for that account. This
  confirms the email-domain branch is reachable and behaves as coded, even though every account
  created through this API's own registration and admin-creation endpoints is Gmail-only by
  validation (this pre-existing account predates that restriction, or was inserted outside the
  API).
- This account's `pending` status does not prevent it from logging in or reaching the OTP step —
  see TC-007 for the dedicated case on this.
- Keep both accounts' OTPs available (via the console log) — TC-003 verifies the Gmail account's
  OTP.

### TC-003

**Test Title:** Verify that submitting the correct, unexpired OTP completes login and issues a token
**Type:** Functional — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- **Depends on TC-002:** requires the Gmail Test Agent account's OTP request from TC-002 (step 1)
  to still be within its 2-minute validity window. Run this immediately after TC-002.

**Test Data:**
- Identifier: `salmansrabon+agent@gmail.com` (or `01686606901`)
- OTP: the value read from the console log in TC-002, step 2

**Steps:**
1. Call `POST /user/verify-otp` with the identifier and the OTP.

**Expected Result:**
- HTTP 200, with body `{ message: "Login successful", token: <jwt>, role: "Agent" }` — the same
  response shape TC-001 gets directly from `/user/login`, just reached one step later.
- The account's stored OTP is cleared afterward — this is what TC-012 relies on to prove
  single-use.

### 4b. Negative, Boundary & Security Tests

### TC-004

**Test Title:** Verify that login is rejected when the password is incorrect, without ever generating an OTP
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- Any existing account, active or otherwise — for example the seeded Test Agent
  (`salmansrabon+agent@gmail.com`).

**Test Data:**
- Email: `salmansrabon+agent@gmail.com`
- Password: any incorrect value, e.g. `wrongpassword1`

**Steps:**
1. Call `POST /user/login` with the correct identifier and the wrong password.

**Expected Result:**
- HTTP 401 with body `{ message: "Password incorrect" }`.
- No OTP is generated for this identifier as a result of this call (the account's stored OTP is
  unaffected).
- The same result occurs whether the account would otherwise have taken the immediate-token path
  (Admin/SYSTEM) or the OTP path — the password check happens before that branch is decided.

### TC-005

**Test Title:** Verify that login is rejected when the identifier does not match any account
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:** none.

**Test Data:**
- Email: `no-such-account-exists@gmail.com`, password: any value, e.g. `1234`
- Phone: `00000000099` (an 11-digit value not present in `Users`), password: any value

**Steps:**
1. Call `POST /user/login` once with the unknown email, once with the unknown phone number.

**Expected Result:**
- Both calls return HTTP 404 with body `{ message: "User not found" }`.

### TC-006

**Test Title:** Verify that login is rejected with a validation error when the identifier or the password is missing
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:** none.

**Test Data:**
- Body with `password` only, no `email` and no `phone_number`
- Body with `email` (or `phone_number`) only, no `password`
- Empty body `{}`

**Steps:**
1. Submit each Test Data variant to `POST /user/login` in turn.

**Expected Result:**
- All three variants return HTTP 400 with body
  `{ message: "Please provide either email or phone_number along with password" }`.
- No OTP is generated and no account lookup succeeds in any of the three cases.

### TC-007

**Test Title:** Verify that an account's `pending` or `suspended` status does not by itself block login
**Type:** Security — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- **Pending variant:** register a brand-new account via `POST /user/register` (out of this
  document's endpoint scope, used only as fixture setup) with a fresh unique Gmail-style email
  (e.g. `yourname+pendingtest@gmail.com`), a fresh unique 11-digit phone number, a
  national-ID-style value between 7 and 13 characters (e.g. `9998887771`), password
  `Test@1234`, and role `Customer`. Do **not** have an Admin activate it — its status stays
  `pending` by default.
- **Suspended variant:** log in as the Admin (per TC-001) and call `PATCH /user/update/:id` for
  the seeded Test Customer 1 account (`salmansrabon+customer1@gmail.com` / `01686606902`, id
  confirmed active beforehand) to set `status` to `suspended`. Restore it to `active` with the
  same call immediately after this case finishes, so later cases relying on this account as
  "active" are not affected.

**Test Data:**
- Pending account: the email/phone/password just registered above.
- Suspended account: `salmansrabon+customer1@gmail.com` / `01686606902`, password `1234`.

**Steps:**
1. Call `POST /user/login` with the pending account's credentials.
2. Call `POST /user/login` with the now-suspended Test Customer 1's credentials.

**Expected Result:**
- Both calls succeed exactly as an active account's would for the same role: HTTP 200 with
  `otpRequired: true` (both are Customer-role accounts, so neither takes the Admin/SYSTEM
  bypass path). Account status is not part of the login decision at all — an account can be
  signed into regardless of `pending` or `suspended`
  status; only the later transaction endpoints (deposit, withdraw, send-money, payment) are
  documented to check status, not login itself.
- This is the current, confirmed behavior, not a stated requirement — see the note under §2's
  Acceptance Criteria. Whether this is intended is a business question, not something this test
  set can answer; it is included here because account status is exactly the kind of
  authorization boundary sanity testing is meant to check.

### TC-008

**Test Title:** Verify that the login identifier matches an account regardless of letter case
**Type:** Functional — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- The seeded Test Agent (`salmansrabon+agent@gmail.com`) and the seeded SYSTEM account (phone
  `SYSTEM`) are both active, as in TC-001/TC-002.

**Test Data:**
- Email: `SALMANSRABON+AGENT@GMAIL.COM` (all uppercase), password `1234`
- Identifier: `system` (all lowercase), password `1234`

**Steps:**
1. Call `POST /user/login` with the uppercase email variant.
2. Call `POST /user/login` with the lowercase `system` identifier.

**Expected Result:**
- Both calls succeed exactly as their correctly-cased equivalents in TC-001/TC-002 would: the
  uppercase email call returns `otpRequired: true` for the Agent account, and the lowercase
  `system` call returns a token immediately with `role: "Agent"`, identifying the SYSTEM account.
- This case-insensitive matching is a property of how this environment stores and looks up account
  identifiers, not something the login code computes itself — the tester does not need to know why,
  only that it currently works this way. The same account-lookup pattern is shared by
  `POST /user/verify-otp`, so its identifier matching is expected to behave identically (not
  re-tested separately here).

### TC-009

**Test Title:** Verify that a malformed login request is rejected cleanly rather than crashing or silently mismatching
**Type:** Negative — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:** none.

**Test Data:**
- Malformed JSON body, e.g. `{"email": "test@test.com", "password": }` (syntactically invalid)
- Well-formed JSON, but with `email` set to a nested object instead of a string, e.g.
  `{"email": {"a": "b"}, "password": "1234"}`

**Steps:**
1. Submit the syntactically invalid JSON body to `POST /user/login`.
2. Submit the object-typed `email` field to `POST /user/login`.

**Expected Result:**
- Step 1 is rejected before it reaches the login handler at all, with HTTP 400 and an error
  reported under an `error.message` field rather than the `message` field every other case in
  this document uses — the request is rejected by the framework's request-body parser, which uses
  a different response envelope than this API's own controllers.
- Step 2 does not crash the server or silently succeed/fail-match: the request handler wraps its
  database lookup in error handling, so any lookup failure caused by the malformed field type is
  turned into a definite JSON error response with an HTTP 500 status, not an unhandled server
  crash (the exact error text is not asserted here, since it depends on the underlying database
  library's error message).

### TC-010

**Test Title:** Verify that an incorrect OTP is rejected, and that the real OTP remains usable afterward within its validity window
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- The seeded Test Customer 1 account is active: `salmansrabon+customer1@gmail.com` /
  `01686606902` / password `1234`. (If TC-007's suspended variant has not yet been reverted,
  revert it first — this case needs the account reachable as normal.)

**Test Data:**
- Identifier: `salmansrabon+customer1@gmail.com`
- Wrong OTP: any 4-digit value known not to match, e.g. `0001`
- Real OTP: the value read from the server console after login (see Steps)

**Steps:**
1. Call `POST /user/login` with Test Customer 1's credentials.
2. Read the real OTP from the server console log, but do not submit it yet.
3. Call `POST /user/verify-otp` with the wrong OTP (`0001`).
4. Immediately after, call `POST /user/verify-otp` again for the same identifier, this time with
   the real OTP from step 2 — both calls must land within the 2-minute window from step 1.

**Expected Result:**
- Step 3 returns HTTP 401 with body `{ message: "Invalid OTP. Please try again." }`; the
  account's stored OTP is **not** cleared by this rejection, so it remains available for the
  correct value to be retried.
- Step 4 succeeds: HTTP 200 with a token, proving the earlier wrong attempt did not invalidate the
  real OTP or lock the account out of retrying.
- Keep this real OTP value noted — TC-012 reuses it.

### TC-011

**Test Title:** Verify that an OTP is rejected once its 2-minute validity window has passed
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- The seeded Test Customer 2 account is active: `salmansrabon+customer2@gmail.com` /
  `01686606903` / password `1234`.

**Test Data:**
- Identifier: `salmansrabon+customer2@gmail.com`
- OTP: the value read from the server console after login (see Steps)

**Steps:**
1. Call `POST /user/login` with Test Customer 2's credentials.
2. Read the OTP from the server console log.
3. Wait at least 2 minutes from the moment of step 1.
4. Call `POST /user/verify-otp` with the identifier and the (now expired) OTP from step 2.

**Expected Result:**
- HTTP 401 with body
  `{ message: "OTP has expired. Please login again to receive a new OTP." }`.
- The account's stored OTP is cleared as a side effect of this rejection, so a repeat call with
  the same OTP afterward would instead return the "No OTP found" message from TC-016, not this
  one.

### TC-012

**Test Title:** Verify that a successfully-used OTP cannot be verified a second time
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- **Depends on TC-010:** requires TC-010 to have already completed successfully (its step 4).
  Run this immediately after TC-010, using the exact same real OTP value.

**Test Data:**
- Identifier: `salmansrabon+customer1@gmail.com`
- OTP: the same real OTP value TC-010 already verified successfully.

**Steps:**
1. Call `POST /user/verify-otp` again with the same identifier and the same OTP that TC-010's
   step 4 already used successfully.

**Expected Result:**
- HTTP 400 with body
  `{ message: "No OTP found. Please login again to request a new OTP." }` — not the "Invalid OTP"
  message from TC-010's step 3, since the account's stored OTP was already cleared by
  the earlier successful verification. This is the confirmation that a used OTP is genuinely
  single-use rather than merely time-limited.

### TC-013

**Test Title:** Verify that logging in again issues a new OTP that supersedes the previous one
**Type:** Functional — (system)
**Priority:** Medium
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- **Depends on TC-002/TC-003:** requires the seeded Test Agent account's OTP slot to be free,
  which it is once TC-003 has successfully verified and cleared it. Run this after TC-003.

**Test Data:**
- Identifier: `salmansrabon+agent@gmail.com` / `01686606901`, password `1234`

**Steps:**
1. Call `POST /user/login` with the Test Agent's credentials. Read this first OTP from the
   console log but do not submit it.
2. Call `POST /user/login` again with the same credentials. Read this second OTP from the console
   log — it is a freshly generated value, replacing the first.
3. Call `POST /user/verify-otp` with the identifier and the **first** OTP from step 1.
4. Call `POST /user/verify-otp` with the identifier and the **second** OTP from step 2.

**Expected Result:**
- Step 3 is rejected — HTTP 401 `{ message: "Invalid OTP. Please try again." }` — because the
  second login call already overwrote the stored OTP with the value from step 2: each login call
  replaces the previously issued OTP rather than queuing multiple valid ones.
- Step 4 succeeds: HTTP 200 with a token.

### TC-014

**Test Title:** Verify that OTP verification is rejected when the identifier or the OTP is missing
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:** none.

**Test Data:**
- Missing-field body: `{ "identifier": "salmansrabon+merchant@gmail.com" }` (no `otp`)
- Missing-field body: `{ "otp": "1234" }` (no `identifier`)

**Steps:**
1. Submit each missing-field variant to `POST /user/verify-otp`.

**Expected Result:**
- Both variants return HTTP 400 with body `{ message: "Identifier and OTP are required" }`.

### TC-015

**Test Title:** Verify that OTP verification is rejected when the identifier does not match any account
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:** none.

**Test Data:**
- Identifier: `no-such-account@gmail.com`, otp: `1234`

**Steps:**
1. Submit this variant to `POST /user/verify-otp`.

**Expected Result:**
- HTTP 404 with body `{ message: "User not found" }`.

### TC-016

**Test Title:** Verify that OTP verification is rejected when no OTP was ever requested for that identifier
**Type:** Negative — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- The seeded Test Merchant account is active and has **not** been used to call `/user/login`
  anywhere earlier in this document's run: `salmansrabon+merchant@gmail.com` / `01686606905`.

**Test Data:**
- Identifier: `salmansrabon+merchant@gmail.com`, otp: `1234`

**Steps:**
1. Submit this variant to `POST /user/verify-otp` (Test Merchant has no OTP on record, since it
   has not called `/user/login` in this run).

**Expected Result:**
- HTTP 400 with body `{ message: "No OTP found. Please login again to request a new OTP." }` —
  the same message TC-012 gets after a used OTP, but reached by a different route (never having an
  OTP at all, rather than having consumed one).

### TC-017

**Test Title:** Verify that the environment's configured OTP bypass authenticates regardless of the account's real OTP or its expiry
**Type:** Security — (system)
**Priority:** High
**Any Issue?:** N/A — bug hunt not yet run

**Preconditions:**
- The seeded Test Customer 2 account is active (as in TC-011); its earlier OTP has already
  expired and been cleared by TC-011, so a fresh login is required first.
- This bypass only activates when the environment has a configured bypass value set — confirmed
  set to `0000` in the environment used to write this document. **Reconfirm this value for the
  environment actually under test before running this case**, and treat this case as a standing
  risk check, not a one-time pass/fail: per this project's own documentation, this bypass must
  never be reachable in a live/production environment.

**Test Data:**
- Identifier: `salmansrabon+customer2@gmail.com` / `01686606903`, password `1234`
- Bypass OTP: the environment's configured bypass value (`0000` at time of writing)
- Query parameter: `env=dev`

**Steps:**
1. Call `POST /user/login` with Test Customer 2's credentials, to generate a fresh OTP record.
2. Call `POST /user/verify-otp?env=dev` with the identifier and the bypass OTP value — deliberately
   **not** the real OTP just generated in step 1.

**Expected Result:**
- Step 2 succeeds: HTTP 200 with a token, even though the submitted value does not match the real
  OTP from step 1 and even though its expiry was never checked. The `?env=dev` query parameter,
  combined with the environment's configured bypass value, skips both the expiry check and the
  match check entirely, for any account that has an outstanding OTP request.
- This case passing is not itself a defect — it is the bypass working exactly as configured. What
  would make it a live security problem is this same bypass being reachable in a non-development
  environment; confirming that is out of scope for this API-level pass and requires checking the
  target environment's actual configuration, which this document cannot verify on your behalf.

## 5. White-box Tests

No additional whitebox tests are justified. Every branch identified while designing this set
(the Admin/SYSTEM bypass, the OTP generation and delivery branches, the expiry/match/single-use
logic, the dev bypass, and the identifier lookup) is fully observable through the two public
endpoints already covered above — none of it requires calling anything below the API surface to
exercise or verify.

## 6. Coverage Summary

- **AC-1** (login by email or phone, case-insensitive) — TC-001, TC-002, TC-008
- **AC-2** (Admin/SYSTEM immediate token) — TC-001
- **AC-3** (other roles require OTP) — TC-002
- **AC-4** (OTP time-limited, single-use, superseded by a new login) — TC-011, TC-012, TC-013
- **AC-5** (login rejected: unknown identifier / wrong password / missing fields) — TC-004,
  TC-005, TC-006, TC-009
- **AC-6** (OTP verification rejected: wrong / expired / missing / unknown identifier / never
  requested) — TC-010, TC-011, TC-014, TC-015, TC-016
- **AC-7** (dev bypass works as configured, flagged as a standing risk) — TC-017
- **Additional authorization-boundary coverage, not tied to a stated AC:** TC-007 (account status
  does not gate login) — included because this is exactly the kind of authorization boundary
  sanity testing is meant to check, even though no source states it as an intended rule one way
  or the other.

**Not covered, and why:**
- **Registration, forgot-password, reset-password** — explicitly out of scope for this document.
- **Token expiry/consumption on other endpoints** (what happens when an expired token from this
  flow is used elsewhere) — that behavior belongs to whichever endpoint checks the token, not to
  login/verify-otp themselves; see the integration-boundary note in §1.
- **Concurrent/simultaneous login or verify-otp calls for the same account** (race conditions on
  the shared stored-OTP state for that account) — no confirmed evidence of risk (no row-locking is used
  here, unlike the transaction controllers), and out of sanity scope; worth a dedicated focused-
  regression pass if concurrency here becomes a concern.
- **SQL-injection-style payloads against the identifier field** — the login/verify-otp lookups use
  safe, parameterized queries (unlike a known raw-SQL construction issue elsewhere in this system,
  in a different, unrelated endpoint entirely and out of this document's scope), so no confirmed
  injection risk exists here to test against.
- **OTP email non-delivery / bounce handling** — this is a third-party mail-delivery reliability
  concern, not application logic; the console-log channel (used throughout this document) exists
  precisely so login testing does not depend on real email delivery.

## 7. Top Test Cases

- Verify that Admin and SYSTEM accounts log in immediately with a token, no OTP required.
- Verify that Agent, Customer and Merchant accounts must complete an OTP step to log in, and that
  the OTP always reaches the account holder through the server console even when no email is
  sent.
- Verify that submitting the correct OTP completes login and returns a token.
- Verify that login is rejected when the password is wrong.
- Verify that login is rejected when the identifier does not exist.
- Verify that login is rejected when the identifier or password is missing.
- Verify that a pending or suspended account can still log in.
- Verify that the login identifier matches regardless of letter case.
- Verify that a malformed login request is rejected cleanly, not silently or with a crash.
- Verify that a wrong OTP is rejected but does not invalidate the real OTP for a later attempt.
- Verify that an OTP is rejected once its validity window has passed.
- Verify that a successfully-used OTP cannot be verified again.
- Verify that logging in again issues a new OTP that replaces the previous one.
- Verify that OTP verification is rejected correctly for a missing field, an unknown identifier,
  or an identifier that never requested an OTP.
- Verify that the environment's configured OTP bypass authenticates regardless of the real OTP.
