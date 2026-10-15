# Withdraw (Cash-Out) — Bug Findings

*Confirmed = reproduced via live API/DB. Potential = verified in code, not yet reproduced live. Items examined and cleared as not-bugs are listed separately at the end.*

*Updated: re-audited against `bug1.md`'s Deposit findings for cross-module consistency; one finding reclassified, one live-data citation corrected, and one new finding added — see "Changes from prior version" at the end.*

---

### 1. Agent commission isn't deducted from any account — **Confirmed**

**Module:** Withdraw (Customer/Merchant → Agent)

**Steps to Reproduce:**
1. Log in as a Customer or Merchant.
2. Withdraw an amount to an active Agent.
3. Check the resulting transaction records for the withdraw.

**Expected Result:** Total amount debited across accounts should equal total amount credited.

**Actual Result:** The agent's 2.5% commission is credited to the agent but never debited from any account — the transaction doesn't balance.

**Evidence:** `withdraw.controller.js:104-123` — `creditTrnx.credit = amt + commission` (line 121) has no matching debit row; the payer's debit (line 110) only covers `amt + withdrawFee`. Reproduced live: `SELECT transaction_type, SUM(debit), SUM(credit) FROM Transactions GROUP BY transaction_type` → `Withdraw` debit 2075 vs. credit 2126.25 (diff 51.25, matching the sum of commissions paid); `SendMoney` (flat fee only, no commission leg) shows diff 0 as a clean control. Same pattern also present in Deposit (`deposit.controller.js:219-238`, see `bug1.md` #1).

---

### 2. Users whose role isn't exact-case `"Customer"`/`"Merchant"` are silently blocked from withdrawing — **Potential**

**Module:** Withdraw — role gate

**Steps to Reproduce:**
1. As Admin, PATCH a user's `role` field to a non-canonical case, e.g. `"customer"` (no enum/case validation exists on this field for the admin PATCH path — confirmed by reading `partialUpdateUser` in full).
2. Ensure that user's `status = 'active'`.
3. Log in as that user and attempt `POST /transaction/withdraw`.

**Expected Result:** A user who is functionally a Customer should be able to withdraw regardless of the letter-casing stored in `role`.

**Actual Result:** `fromRole === "Customer" || fromRole === "Merchant"` is a strict, case-sensitive comparison; a lowercase `"customer"` falls through to a generic `400 "fromAc/toAc is invalid"`, misleadingly implying the account itself is invalid rather than a casing artifact. Same strict-case gate is shared by SendMoney and Payment.

**Evidence:** `withdraw.controller.js:57,160-161`; `user.controller.js:275-293` (`partialUpdateUser` applies zero validation to `role`'s value for admin callers). Live full-table scan: `SELECT id, role, status FROM Users` (34 rows) — only `id=7` has a non-canonical-case role (`"customer"`), and its `status` is `'pending'`, so it is blocked by the earlier active-status check (`:47`) before ever reaching the role comparison; no other user, active or otherwise, currently has this issue. **Corrected from the prior version of this report**, which cited `id=7` as a ready-made live repro without checking that its `pending` status blocks it earlier in the function — the code-level defect is still real (reachable via a normal Admin PATCH + zero role validation), but there is currently no live account that reaches this exact branch, so the tag is downgraded to Potential pending a test with an active, non-canonical-case account.

---

### 3. Case-mismatched login identifier causes a false "Unauthorized" on Withdraw — **Potential**

**Module:** Withdraw — authorization check

**Steps to Reproduce:**
1. Register with a mixed-case email, e.g. `John.Doe@Gmail.com`.
2. Log in typing a different case, e.g. `john.doe@gmail.com`.
3. Attempt `POST /transaction/withdraw` as that account using the resulting JWT.

**Expected Result:** The legitimate account owner should be able to withdraw regardless of letter-casing used at login, consistent with how the login lookup itself already treats email/phone as case-insensitive.

**Actual Result:** Login succeeds (DB lookup is case-insensitive), but the JWT's `identifier` claim preserves the exact casing typed at login, with no normalization anywhere in the registration or login write path. `withdraw.controller.js:35-36` compares this against the DB-stored casing with strict `!==`, producing a false `403 Unauthorized: you can only initiate transactions from your own account` for the real owner.

**Evidence:** `withdraw.controller.js:34-40` (strict comparison) vs. `deposit.controller.js:44-56` (explicitly lowercases both sides before comparing, with a comment noting this was done to handle `SYSTEM`/`system` — proving the team already knew about this class of bug but didn't carry the fix to Withdraw/SendMoney/Payment). `Users.email`/`phone_number` columns confirmed live as `utf8mb4_unicode_ci` (case-insensitive collation). Live scan confirms no existing Customer/Merchant account currently has mixed-case email/phone data (only the `SYSTEM` row, `id=1`, does) — so this remains a structural (code + schema) finding; no live registration/login/withdraw was attempted.

---

### 4. Customer Cash-Out page shows the wrong fee rate — **Confirmed**

**Module:** Withdraw (Cash-Out) — Customer app

**Steps to Reproduce:**
1. Open `/customer/cash-out`.
2. Read the subheading text under "Cash Out".
3. Perform a withdraw and compare against the `fee` returned by the API.

**Expected Result:** The displayed fee rate should match what's actually charged.

**Actual Result:** Page text says "a 1.5% fee applies"; the actual seeded and coded fee is 1% (with a 5 BDT floor) — a real withdraw of 1000 tk returns `fee: 10`, not 15.

**Evidence:** `customer/cash-out/page.tsx:115` (hardcoded "1.5%" string) vs. `create_commission_table.js:72` and `withdraw.controller.js:26` (seeded/coded rate `0.01`). The Merchant equivalent page (`merchant/cash-out/page.tsx`) makes no such fee-rate claim at all, confirming this is a one-off copy error rather than a shared convention. The correctly-computed fee is rendered dynamically a few lines below (`:180-184`), so the fix is either updating the static string or removing it in favor of the dynamic value.

---

### 5. `getBalance()`'s unparameterized SQL is reachable from every Withdraw response — **Potential**

**Module:** Withdraw — balance display (platform-wide helper)

**Steps to Reproduce:**
1. Register a user with an 11-character `phone_number` such as `' OR '1'='1` (10 chars, fits the exact `.length(11)` Joi constraint with room to spare — Joi validates length only, not character set).
2. Trigger any Withdraw response that calls `getBalance()` on that account (e.g. the min-amount-failure or success response).

**Expected Result:** All SQL in the codebase should use parameterized/bound queries, consistent with the locked balance check inside Withdraw's own `sequelize.transaction()` block two lines away.

**Actual Result:** `getBalance()` builds its query via raw string concatenation of the `account` parameter. With the payload above, the query becomes `WHERE t.account='' OR '1'='1'`, matching every row in `Transactions` and returning the platform-wide aggregate balance as that user's own — a data-exposure issue, not just a theoretical injection point.

**Evidence:** `getBalance.js:8` (string concatenation) vs. `withdraw.controller.js:92-95` (parameterized, same controller). Called from Withdraw at `:79,146` (display-only — not used for the actual sufficiency/debit decision). This is a platform-wide helper used by every transaction controller, not Withdraw-specific, so a fix should be made once in `getBalance.js`. No live registration/injection has been attempted.

---

### 6. Withdraw can be sent to the SYSTEM account with no real agent involved — **Potential**

**Module:** Withdraw — role gate (new)

**Steps to Reproduce:**
1. As an active Customer/Merchant, call `POST /transaction/withdraw` with `to_account: "SYSTEM"`.
2. Observe that the role gate only checks `toRole !== "Agent"` — and SYSTEM's role is literally `"Agent"`.

**Expected Result:** Consistent with Deposit's Flow-1 guard (which explicitly excludes SYSTEM from its analogous "to_account must be a regular Agent" check), Withdraw should reject SYSTEM as a cash-out destination — SYSTEM cannot physically hand out cash.

**Actual Result:** Nothing in `withdraw.controller.js` excludes `phone_number === 'SYSTEM'`. A withdraw naming SYSTEM as `to_account` would proceed normally: SYSTEM receives `amt + commission` as the "Agent" credit (line 114-123) on top of the separate service-fee credit it always receives (line 124-133) — SYSTEM absorbs the entire debited amount plus both fee legs, no real agent ever disburses cash, and the API returns `201 "Withdraw successful"`.

**Evidence:** `withdraw.controller.js:57-60` (no SYSTEM exclusion) vs. `deposit.controller.js:88` (explicit `phone_number === 'SYSTEM'` exclusion in the analogous check — proving the team is aware SYSTEM needs special-casing whenever it appears in an "Agent role" slot). Live DB confirms both preconditions: `Users id=1`, `phone_number='SYSTEM'`, `role='Agent'`, `status='active'`. SYSTEM's phone number is a documented, discoverable seed value (also resolvable via `/user/search/phonenumber/SYSTEM`, reachable by any authenticated user), so this isn't a dead/theoretical path. No live withdraw naming SYSTEM as `to_account` has been executed.

---

### Examined and cleared — not a bug

**Agent commission not applying `min_fee`.** `withdraw.controller.js:27` computes `commission = commissionRate * amt` directly, bypassing `Commission.calcFee()` — meaning any `min_fee` configured on the Withdraw Agent Commission row would be silently ignored. Initially flagged (in a prior version of this report) as a defect by analogy, on the assumption that Agent Commission should respect a floor the same way the SYSTEM service fee does. Checked against the BRD (`dmoney-web-react/README.md` §9, Fee & Commission Structure table): the **Min Fee column is populated only where a Service Fee exists** — for Deposit (no Service Fee, only a 2.5% Agent Commission), Min Fee is listed as N/A; for Withdraw/Payment, the Min Fee value shown (5 BDT) is the Service Fee's own floor, not a new figure for the Commission column. `create_commission_table.js` seeds `min_fee: NULL` for all three Agent/Merchant Commission rows (Deposit, Withdraw, Payment) — a structural, cross-module pattern, not an isolated config gap. `bug1.md` independently reached the same conclusion for the identical pattern in Deposit. There is no requirement anywhere that Agent/Merchant Commission should ever have a floor — `min_fee` is scoped to Service Fees only by design. Not a bug.

---

**Verdict:** 2 Confirmed / 4 Potential.

### Changes from the prior version of this report
- **Reclassified to "not a bug":** "Agent commission ignores the configured minimum fee" — previously listed as Confirmed on the strength of an analogous Deposit finding; re-checked against the BRD's Fee & Commission Structure table (§9), which shows Min Fee is scoped to Service Fee only, not Commission. Moved to the cleared section.
- **Corrected a live-data claim:** "Case-sensitive role gate" previously cited `Users.id=7` as a ready-made live reproduction; that row's `status='pending'` actually blocks it at an earlier check, so it isn't a working end-to-end repro today. Downgraded from Confirmed to Potential; the underlying code defect is unchanged and still reachable via a normal Admin PATCH.
- **New finding added:** Withdraw doesn't exclude the SYSTEM account as a valid `to_account`, unlike Deposit's equivalent check.
- **Strengthened, still Potential:** the login-case-mismatch and `getBalance()` SQL-injection findings now cite a concrete blocking factor (no live account currently has the needed mismatched data / a concrete fitting payload) rather than a generic "not yet tested" note.

---

# Limit Management — Bug Findings

*Covers the Customer daily/monthly transaction-limit system (`services/limitChecker.js`, `TransactionLimits` table, CLAUDE.md §9) — distinct from the separate 10,000 BDT wallet-cap system covered in `bug1.md`. Confirmed = reproduced via live dependency execution/DB. Potential = verified in code, not yet reproduced live. Checked against `bug1.md`/`bug-2.md` above — neither duplicates these findings.*

---

### 1. Daily/monthly limit checks are shifted by the API server's local OS timezone — for part of each day, transactions are invisible to the limit tally and the cap is effectively disabled — **Confirmed**

**Module:** Limit Management — `services/limitChecker.js` (`getUsage()`), consumed by Withdraw/SendMoney/Payment

**Steps to Reproduce:**
1. Confirm the API server's Node process resolves to a non-UTC local timezone (this deployment: `Intl.DateTimeFormat().resolvedOptions().timeZone` → `Asia/Dhaka`, UTC+6).
2. Confirm `Transactions.createdAt` is genuinely stored in true UTC — Sequelize forces `SET time_zone = '+00:00'` on every DB connection (`connection-manager.js`) and all model timestamp writes honor `sequelize.options.timezone: '+00:00'`; live `createdAt` values sit right next to `UTC_TIMESTAMP()`, confirming this.
3. Reproduce `getUsage()`'s exact binding mechanism directly against the repo's own installed `sequelize` package (v6.37.5): call its real `injectReplacements()` with `since` = a JS `Date` representing true UTC midnight (`2026-07-29T00:00:00.000Z`) for the query `WHERE createdAt >= :since`.
4. Observe the rendered SQL literal.

**Expected Result:** Per `limitChecker.js`'s own docstring ("start of the current UTC day (midnight)") and CLAUDE.md §9, the daily window should start at true UTC midnight (monthly: true UTC 1st-of-month), so every Customer `SendMoney`/`Withdraw`/`Payment` transaction from that instant onward counts toward the 5,000 Tk/10-tx daily cap (50,000 Tk/50-tx monthly).

**Actual Result:** The rendered literal is `'2026-07-29 06:00:00'` — 6 hours later than the intended UTC midnight, matching the host's local UTC+6 offset exactly. Root cause: `getUsage()` binds `periodStart` via `sequelize.query(..., { replacements: { since } })`; Sequelize's replacement-escaping path (`utils/sql.js` → `injectReplacements()`) calls `escape(value, undefined, dialect, true)` with a **hardcoded `undefined` timezone argument**, never threading through `sequelize.options.timezone`. This falls back to formatting the `Date` in the Node process's **local OS timezone** instead of UTC — the one code path in this codebase where that config is silently dropped (model-attribute writes, which produce the correctly-UTC `createdAt` column, go through a different path that does respect it). Two consequences, both confirmed: (a) any transaction in the first N hours of the UTC day/month (N = host's UTC offset — 6h in this deployment) is permanently excluded from that day's tally; (b) any limit check performed *during* that same window compares against a threshold that is still in the future relative to true "now," so `usedAmount`/`usedCount` always resolve to `0` — the cap is not just miscounted but fully bypassed for that window, bounded only by account balance. This is environment-dependent in magnitude/direction (a UTC-configured host wouldn't trigger it; a host west of UTC would widen the window instead of narrowing it) but is a universal code defect, reachable on any non-UTC deployment, and applies identically to all three call sites (`withdraw.controller.js:66`, `sendMoney.controller.js:61`, `payment.controller.js:72`).

**Evidence:** `services/limitChecker.js:26-40` (`startOfDay`/`startOfMonth`, doc'd as UTC) and `:50-74` (`getUsage`, raw `sequelize.query` with `Date` replacement); root cause traced to `node_modules/sequelize/lib/utils/sql.js:133` (hardcoded `void 0` timezone arg in `injectReplacements`) and `node_modules/sequelize/lib/dialects/abstract/data-types.js:331-338` (`DATE._applyTimezone` falls back to local-OS `momentTz(date)` when timezone is falsy). Live: `@@global.time_zone`/`NOW()` vs `UTC_TIMESTAMP()` confirm host offset UTC+6; `sequelizeModel/db.js` connection options confirm `+00:00` is configured but not honored on this path; direct execution of the installed `sequelize` package's own `injectReplacements()` reproduces the `06:00:00` literal from a true-UTC-midnight `Date` input. No sibling code in the backend uses this raw date-replacement pattern elsewhere, so this is isolated to `limitChecker.js`, not an established convention. **Suggested fix:** format `periodStart` to an explicit UTC string before binding (e.g. `periodStart.toISOString().slice(0,19).replace('T',' ')`) so the literal is timezone-independent regardless of the replacement-escaping quirk.

---

### 2. Limit check runs unlocked, before the balance-locking transaction — concurrent requests can jointly exceed the daily/monthly cap — **Potential**

**Module:** Limit Management — call sites in `withdraw.controller.js`, `sendMoney.controller.js`, `payment.controller.js`

**Steps to Reproduce:**
1. As a Customer sitting at `usedCount = maxCount - 1` (e.g. 9 of 10 daily transactions already made).
2. Fire two near-simultaneous `POST` requests for any of Withdraw/SendMoney/Payment (e.g. via `Promise.all` or parallel `curl`).
3. Observe both requests' `checkCustomerLimits()` calls and final responses.

**Expected Result:** Only one of the two concurrent requests should be allowed to consume the final slot; the other should be rejected with the daily/monthly limit-exceeded 400.

**Actual Result:** `checkCustomerLimits()` runs a plain, unlocked `SELECT ... COUNT(DISTINCT trnxId)`/`SUM(debit)` that is fully `await`-ed and resolved to an `allowed`/`not-allowed` decision **before** any of the three controllers open their `sequelize.transaction()` block (`withdraw.controller.js:66→88`; `sendMoney.controller.js:61→79`; `payment.controller.js:72→91`). The `await` on this query yields the event loop, giving two concurrent requests a window to both read the same pre-race usage data and both be told `allowed: true`. Critically, none of the three controllers re-check the count/amount limit inside the locked transaction — the only check performed under the `FOR UPDATE` balance lock is balance sufficiency, a separate concern from the daily/monthly cap. So two concurrent requests near the boundary will deterministically both pass and jointly push usage past the configured cap; this isn't a narrow microsecond race, it's a straightforward missing re-validation under lock.

**Evidence:** `services/limitChecker.js:50-68` (`getUsage`, unlocked `SELECT`) and `:104-119` (`checkCustomerLimits`, no lock, no re-check under any transaction); call-site ordering confirmed line-for-line in all three controllers as above. **Verification gap:** not fired live with real concurrent requests in this session (would require writing real transaction rows near a limit boundary — needs explicit confirmation before live writes, per project convention). Code trace is conclusive that no lock or re-validation spans the gap; live concurrency confirmation is the remaining step before upgrading to Confirmed.

---

### Examined and cleared — not a bug

- **`is_active` soft-disable, both daily/monthly rows off:** `checkCustomerLimits()` queries `TransactionLimit.findAll({ where: { role: 'Customer', is_active: 1 } })` (`limitChecker.js:104-106`); if empty, returns `{ allowed: true }` immediately (`:108-111`) — matches the documented, intentional design (CLAUDE.md §9: "is_active flag per row allows soft-disabling a limit without deleting it"). Correct.
- **Duplicate `(role, period)` rows:** `UNIQUE KEY uq_role_period (role, period)` (`migrations/create_transaction_limits.js:39`) enforced at the schema level; live scan confirms exactly 2 rows exist (`Customer`/`daily`, `Customer`/`monthly`), no duplication possible. Correct.
- **Count-limit checked before amount-limit:** `limitChecker.js:135-153` checks `usedCount >= maxCount` before `usedAmount + totalDebit > maxAmount`, matching CLAUDE.md §9's documented order. Correct.
- **`totalDebit` basis matches each controller's actual ledger debit:** `withdraw.controller.js:66` passes `amt + withdrawFee`; `sendMoney.controller.js:61` passes `amt + p2pFee`; `payment.controller.js:72` passes `finalAmount + paymentFee` — each exactly matches that controller's own `debit` value written to the ledger a few lines later. No mismatch found.
- **Precondition ordering (limit check before min-amount check before DB transaction):** identical across all three controllers, matching CLAUDE.md §9. Correct.
- **Customer-only role scoping:** `TransactionLimit.findAll` is hardcoded to `role: 'Customer'`, and every call site additionally gates on `fromRole === "Customer"` — Merchant withdrawals, Agent payments, and SendMoney's Customer-only branch all correctly bypass the limit check; SYSTEM (role `Agent`) is excluded the same way. Correct.
- **`COUNT(DISTINCT trnxId)` vs. multi-row-per-operation ledger writes:** each operation writes multiple rows sharing one `trnxId`, but only the payer's row has both `account = customerPhone` and `debit > 0`; the other legs have `debit = 0` and are filtered out by `getUsage()`'s `WHERE debit > 0` clause, so exactly one row per operation matches — `DISTINCT` is redundant here but not incorrect.

---

**Verdict:** 1 Confirmed / 1 Potential / 6 cleared (not bugs).
