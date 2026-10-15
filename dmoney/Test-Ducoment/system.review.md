Internal companion to [system.md](system.md).

No project ticket exists for this piece of work; this is the internal evidence and review record for the SYSTEM to Agent deposit of 5000 API test cases. No system.bug.md exists yet - the bug-hunting pass was explicitly deferred, since the request was for test cases only.

## E1. Case evidence map

Line A
Line B
Line C

| Case | Covers | Evidence |
| --- | --- | --- |
| TC-001 | AC-1, AC-6, happy path | dmoney-transaction-api/controllers/transactions/deposit.controller.js lines 78-145 (SYSTEM branch, success response and ledger writes); live DB check of dmoneydb.Transactions confirmed SYSTEM balance approx 9,259,136.5 as of this review, well above 5000; live DB check of dmoneydb.Users confirmed account 01686606901 is role Agent, status active |
| TC-002 | AC-1, AC-3, case-insensitive authorization | deposit.controller.js lines 44-56 (case-insensitive comparison of req.user.identifier against the account phone_number/email); user.controller.js loginUser (lines 418-457), specifically line 442 (isSystemAccount check is also case-insensitive) and line 447 (JWT identifier stores exactly what was submitted at login) |
| TC-003 | AC-3 | deposit.controller.js lines 44-56 (authorization check, 403 branch) |
| TC-004 | AC-5 | deposit.controller.js lines 58-60 |
| TC-005 | AC-2 | deposit.controller.js lines 85-92 (SYSTEM branch to_account role/identity check); live DB check confirmed accounts 01686606902 (Customer, active), 01686606905 (Merchant, active), 01786606909 (Admin, active) |
| TC-006 | AC-2 | deposit.controller.js lines 66-68 (to_account status check, runs before the Flow-1-specific role check); live DB check confirmed account 01786606901 is role Agent, status pending |
| TC-007 | AC-2 | deposit.controller.js lines 274-279 (account-existence branch, "To Account does not exist"); live DB check confirmed 01799999999 is not a registered account |
| TC-008 | critical validation | deposit.controller.js lines 274-279 (account-existence branch, "From Account does not exist" checked first) |
| TC-009 | critical validation, financial-integrity boundary | deposit.controller.js lines 25-31 (amount validation, runs before any DB lookup) |
| TC-010 | bug candidate (see E7) | deposit.controller.js lines 39-40 (unguarded await Users.findOne with a field taken directly from req.body, no Joi schema on this route); node_modules/sequelize/lib/dialects/abstract/query-generator.js line 1770 (throws for an undefined where-clause value); dmoney-transaction-api/app.js (no express-async-errors equivalent, and the deposit route handler is not wrapped in a try/catch around the initial lookups) |
| TC-011 | AC-7 | jwtMiddleware.js lines 30-32 (no Authorization header -> 401 No Token Found) |
| TC-012 | AC-7 | jwtMiddleware.js lines 11, 27-29 (X-AUTH-SECRET-KEY mismatch -> 401 Secret auth key validation failure) |
| TC-013 | AC-7 | jwtMiddleware.js lines 15-22 (jwt.verify error branches: TokenExpiredError -> 403 Token expired; any other verify error -> 403 Token invalid) |

## E2. Evidence Gaps / Conflicts

- CLAUDE.md vs. code on the success response shape. CLAUDE.md section 7.1 states the deposit response includes commission and currentBalance (of the depositing Agent) without distinguishing the two flows. Reading the actual controller code shows this is true only for Flow 2 (Agent to Customer). The SYSTEM-to-Agent success response (deposit.controller.js lines 140-145) returns message, trnxId, amount, and agentBalance - no commission field and no currentBalance field. TC-001 Expected Result was written from the code, not from CLAUDE.md blanket statement. This discrepancy is worth flagging back to whoever maintains CLAUDE.md.
- SYSTEM account password value. CLAUDE.md section 12 documents the seeded password for predefined accounts (including SYSTEM) as 1234 (hashed), but this is seed-time documentation, not a live-verified current value, and the live database may have since had this credential changed. Test Data throughout the test document intentionally says password supplied separately rather than asserting 1234, per the credentials-never-in-a-file rule. Whoever executes these cases needs the current SYSTEM account password from a source other than this file.

## E3. Assumptions

- Assumption: SYSTEM own account status can never be set to non-active through any exposed endpoint, so a from_account (SYSTEM) is not active test case is not achievable through the API and was excluded rather than designed with an unreachable precondition.
  Confirmed evidence it rests on: dmoney-transaction-api/controllers/users/user.controller.js lines 216-222 and 267-273 - both updateUser and partialUpdateUser explicitly block any modification to the account whose phone_number equals SYSTEM, for both PUT and PATCH, regardless of caller role.
  Confidence: High.
  Affected: the exclusion recorded under Coverage Summary Not covered list in system.md, and E6 below.
  What would disprove it: finding any other endpoint or code path that can set the SYSTEM row status column away from active.

- Assumption: SYSTEM own role value is fixed to Agent and cannot be changed, so the from_account role is not Agent branch (deposit.controller.js lines 71-75) is unreachable for this flow and was not designed as a case.
  Confidence: High, same protected-account evidence as above (role is one of the fields the protected-account guard blocks from being changed).
  Affected: the exclusion recorded under Coverage Summary Not covered list.

- Assumption: the SYSTEM account live balance (approximately 9,259,136.5 at the time of this review) makes the insufficient-balance branch (208, deposit.controller.js lines 108-112 and 148-153) unreachable while holding the deposit amount fixed at 5000, as the request explicitly required. This was not designed as an executable case; it is recorded as not covered.
  Confidence: High - based on a live query against dmoneydb.Transactions at review time. This is a point-in-time snapshot; if the environment SYSTEM balance is later driven down through heavy testing, this branch could become reachable and should be added at that point.

## E4. Caller-trace record

- Searched the frontend repository for any caller of the deposit endpoint (grep -rl transaction/deposit dmoney-web-react/src). Exactly one match: src/app/agent/cash-in/page.tsx. Read the relevant line (line 83) and confirmed from_account is always set to the logged-in user own stored phone number, never the literal value SYSTEM - this page cannot reach the flow under test. This is the basis for the no UI reaches this flow statement in system.md section 3.
- No other caller of POST /transaction/deposit exists in the backend itself (it is a route endpoint, not a shared internal function called elsewhere) - confirmed by reading dmoney-transaction-api/routes/transaction.route.js in full; the route is registered once.
- Did not trace callers of getBalance() or generateTrnxId() beyond this controller - both are simple, already-documented shared utilities (see CLAUDE.md section 10) and their behavior here is fully observable through this endpoint own response fields (agentBalance, trnxId), so no separate caller-group analysis was needed for this scoped, single-endpoint test design.

## E5. Impact matrix

| Flow / artifact | Entry point | Changed behavior | Input/state variants | Observable outcome | Validation/auth | Related regression | Existing coverage | Evidence strength |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SYSTEM to Agent deposit | POST /transaction/deposit (isSystemAccount branch) | n/a - existing behavior, not a diff | to_account role/status/existence, from_account existence, amount validity, caller identity | 201 success with ledger write, or 400/403/404/208 rejection | ownership match (case-insensitive), to_account must be active regular Agent | Agent-to-Customer deposit (Flow 2) shares the same route and the same amount/account-existence preconditions, but was explicitly excluded from scope per the request | No automated tests found under dmoney-transaction-api (no test script/suite exists per CLAUDE.md section 16) | Confirmed (code) for all branches except insufficient-balance and from-account-inactive, which are confirmed-but-unreachable (see E3) |

## E6. Deliberate exclusions

- from_account (SYSTEM) is not active (403 branch). Not designed as a case - SYSTEM is a protected account and no endpoint can flip its status away from active. See E3.
- from_account role is not Agent (400 branch, Invalid from account...). Not designed as a case - SYSTEM role is fixed to Agent and cannot be changed via any endpoint. See E3.
- Insufficient SYSTEM balance (208 branch). Not designed as an executable case given the fixed 5000 amount constraint and the account current live balance (~9.26 million). Recorded as not covered rather than manufactured with an unreachable or out-of-scope precondition (for example artificially driving the balance down), which would have required either DB writes outside the read-only tool or a long chain of prior deposits - both out of this task explicit single-call scope.
- Redundant to_account equals SYSTEM guard inside the SYSTEM branch (deposit.controller.js line 88). Not designed as a case - this condition is unreachable via the API because a to_account of SYSTEM always means from_account equals to_account, which is already rejected by the earlier same-account check (line 58) before this line is ever reached. Confirmed by reading the branch order; not treated as a bug, since the observable outcome (a 400 rejection) is identical either way - just dead code, not a behavioral gap.
- Flow 2 (Agent to Customer deposit) and any chained verification via the statement/balance/list endpoints. Explicitly out of scope per the request.
- Generic 500 Internal Server Error path. No confirmed, reproducible trigger for this branch within valid or invalidly-shaped-but-expected inputs; would require an infrastructure-level failure. Out of sanity scope.

## E7. Bug candidates - the why-bug / why-not-bug argument

Claim: Submitting a deposit request with from_account or to_account omitted from the JSON body may cause an unhandled promise rejection rather than a clean HTTP error response, because the resulting Sequelize lookup is built with an undefined where-clause value.

Case for: deposit.controller.js lines 39-40 call Users.findOne with where phone_number set to from_account, and the equivalent for to_account, using the raw values destructured from req.body with no Joi or other schema validation on this route (confirmed: no Joi or validate reference anywhere in deposit.controller.js or transaction.route.js). Sequelize 6.37.8 query generator explicitly throws WHERE parameter has invalid undefined value when a where-clause value is undefined (confirmed at node_modules/sequelize/lib/dialects/abstract/query-generator.js line 1770). Because Model.findAll and findOne are themselves async functions, this throw becomes a rejected Promise rather than a synchronous exception - but the two await Users.findOne calls in handleDeposit (lines 39-40) sit outside any try/catch, and handleDeposit itself is registered directly as the Express route handler with no wrapper. Express 4 does not catch a rejected Promise from a route handler on its own, and the express-async-errors package (which would patch this) is not a dependency of this backend (confirmed: not present in package.json). The result would be an unhandled Promise rejection at the process level rather than a JSON error response - in current Node.js versions this can terminate the process outright.

Case against: This has not been observed by live execution - it is a code-reading inference about Sequelize and Node behavior, not a confirmed reproduction. It is also possible the request layer, a process manager, or a Node flag in this specific deployment softens the crash into a logged warning rather than a hard exit, which would make this a lower-severity issue (a poor error response) rather than an availability risk. It is equally possible that in practice no client ever omits these fields, since a well-behaved Postman collection or frontend always sends all three fields, making this a defensive-programming gap more than an exploitable path.

What would settle it: A live reproduction - send POST /transaction/deposit with to_account (or from_account) omitted entirely against a running instance of this backend, and observe whether the server returns a 500-class JSON response, hangs, or the process terminates or restarts.

Verdict: Open - not yet investigated by a bug-hunting pass.

Decided by: Not yet decided; flagged here for whenever find-bug runs against this ticket.

## E8. Review outcome

### Pass 1 - qa-agent-advocate (Test Case Review Mode), 2026-08-06

What was independently re-derived or re-verified:
- Read deposit.controller.js (full, 283 lines), jwtMiddleware.js (full, 56 lines) and transaction.route.js (full) directly and cross-checked every one of the 13 E1 citations against the actual line content rather than trusting the table. All 13 point to the code they claim: the SYSTEM branch, the authorization comparison, the same-account guard, the to_account role/status checks, the account-existence branch, the amount-validation branch, the unguarded Users.findOne pair, and all three jwtMiddleware.js rejection branches match as described.
- Independently confirmed the Sequelize citation for the E7 bug candidate: checked package.json (sequelize ^6.37.5, installed 6.37.8) and read the query-generator source directly - the where-clause value check throws for an undefined value at the cited location. Also confirmed no express-async-errors dependency and no Joi or validate call anywhere in deposit.controller.js or transaction.route.js. This corroborates the mechanism described in E7's Case for exactly as written.
- Live-queried dmoneydb.Users and dmoneydb.Transactions directly (read-only) rather than trusting the "as of last live check" notes: confirmed SYSTEM is Agent and active with balance 9,259,136.50; confirmed 01686606901 (Agent, active), 01686606902 (Customer, active), 01686606905 (Merchant, active), 01786606909 (Admin, active), 01786606901 (Agent, pending); confirmed 01799999999 does not exist as a registered account. Every test-data value used in TC-001, TC-003, TC-005, TC-006, TC-007 matches the live database exactly at review time - none of the "reconfirm before running" caveats turned out to be stale.
- Confirmed the protected-account guard (user.controller.js lines 216-222 for PUT, 267-273 for PATCH) blocks any role/status change to the SYSTEM account for every caller, including Admin, and runs unconditionally after the isAdmin/isSelf check - this supports E3's two unreachable-branch assumptions (from_account-inactive, from_account-role-not-Agent) rather than merely asserting them.
- Confirmed scope discipline end to end: no Flow 2 (Agent-to-Customer) case anywhere in system.md, no chained verification through statement/balance/list endpoints, no commission or min/max-amount language leaking in from Flow 2 - the user's explicit scoping constraint was respected in every case and in the Coverage Summary's Not covered list.
- Checked every TC title in system.md against its own Steps and Expected Result for plain-language compliance and meaning preservation - all 13 pass; no internal jargon, no meaning drift.
- Checked the Top Test Cases list for placement, black-box wording, and sync with current titles - correctly placed last, correctly excludes TC-010 (unconfirmed expected result), correctly collapses the merged variants (TC-005, TC-009, TC-011 through TC-013) into single observable-outcome lines, no internal names or TC cross-references present.
- Checked consolidation choices (TC-005's three to_account-role variants, TC-009's four amount variants, TC-013's two token-failure variants) against the actual code branches they exercise - in each case the merged variants genuinely hit the same condition or branch with the same or directly-parallel outcome, so the consolidation is justified, not just convenient.
- Checked the E7 bug candidate is correctly isolated: not written into system.md as a defect assertion (TC-010 uses "TBD - not established by available evidence" and points to this review record, not a claim of brokenness), and carries both a Case for and a genuinely challenging Case against (deployment may soften the crash; may be a defensive-programming gap rather than an exploitable path) rather than a one-sided writeup. Correctly held at Open, not escalated to a verdict, since this is Test Case Review Mode and no live reproduction has been run.

Findings rejected: none. Coverage, consolidation, evidence accuracy, scope discipline, title wording, Top Test Cases sync, and the E7 bug-candidate handling all held up under independent re-derivation against the live code and live database.

Findings confirmed and correction required:
- Structural format violation in system.md. Two full prose paragraphs sit between the document's link line and the Feature Summary heading: one stating no ticket exists and framing the requester's scope, and one explaining that every case's Any Issue line reads N/A because no bug pass has run, with a reference to "the handoff note at the end of the reply." The test-design skill's Part D header instructions are explicit and unconditional here: the link lines are followed by nothing else, and no revision note, advocate-revision paragraph, find-bug pass summary, or standing precondition banner belongs between the link lines and the Feature Summary heading. This rule is not conditioned on whether a Jira ticket exists. Required fix: delete both paragraphs. The first is already redundant with the Feature Summary's own Intent source and Scope bullets, which already state no ticket exists and that behavior was inferred from implementation. The second is already implied uniformly by every case reading N/A - bug hunt not yet run, per the skill's own definition of that value. The reference to "the handoff note at the end of the reply" is a leftover conversational pointer that should never have reached the file - it refers to something outside the document entirely.

Citation, test-data, or expected-result drift found: none. Every Test Data value that could be independently checked against a live source (account roles and status, SYSTEM balance, the non-existent account) was checked directly and matches the document exactly.

Cases added, dropped, reordered, or renamed: none by this reviewer. No case merits addition, removal, or renumbering. The required fix is header-text-only and does not touch TC-001 through TC-013, the AC list, the Coverage Summary, or the Top Test Cases list.

Reviewer confidence: 85 out of 100. The deduction is entirely the header-placement violation above. Every other checked dimension - evidence accuracy against both the code and a live database, coverage completeness for the narrow single-endpoint scope requested, consolidation justification, title wording, Top Test Cases sync, black-box discipline, scope containment (no Flow 2, no chained endpoints), and the E7 bug-candidate's argument quality and correct non-verdict - checked out on independent re-derivation rather than on trust of the document's own citations.

Verdict: NEEDS_REVISION - a single required fix (remove or relocate the two header paragraphs described above). No other revision is needed; once that fix is applied this document is ready.
