# Deposit (Cash-In) — Workflow, Rules & Test Guide

## 1. Workflow

**Flow 1 — SYSTEM tops up an Agent**
SYSTEM (a special Agent account, phone `SYSTEM`) sends money to a regular Agent. No fee. Only check: SYSTEM has enough balance. (No UI for this — API/Postman only.)

**Flow 2 — Agent cashes in a Customer**
Agent sends money to a Customer's wallet. Agent earns 2.5% commission on top of what they pay out. Customer gets the full amount. UI: `agent/cash-in`.

**Flow 3 — Customer cash-in via bank card (Stripe)**
Customer pays by card → Stripe charges the card → on confirm, SYSTEM credits the customer's wallet for the same amount. No fee. Two-step API: create payment intent → confirm after card charge succeeds. UI: `customer/cash-in-bank`.

All three: money is never stored as a balance field — every deposit writes 2 ledger rows (one debit, one credit) sharing one transaction ID; balance = `SUM(credit) - SUM(debit)` computed live.

---

## 2. Business Rules

| Rule | Flow 1 (SYSTEM→Agent) | Flow 2 (Agent→Customer) | Flow 3 (Stripe) |
|---|---|---|---|
| Who can send | SYSTEM only | Any regular Agent | N/A (customer pays via card) |
| Who can receive | Regular Agent only | Customer only | Self (customer) only |
| Commission | None | 2.5% to Agent | None |
| Min / Max per transaction | None | 10 – 10,000 BDT | 10 – 10,000 BDT |
| Customer 10,000 wallet cap | N/A | Enforced | Enforced |
| Both accounts must be `active` | Yes | Yes | Customer only |
| Caller must own `from_account` | Yes (case-insensitive match) | Yes | N/A |
| `from_account == to_account` | Rejected | Rejected | N/A |

Other rules that apply across all money-movement, not just deposit:
- A transaction is all-or-nothing (DB transaction + row locking) — no partial ledger writes.
- Insufficient balance / cap breaches → HTTP **208** (soft failure). Bad input (invalid amount, wrong role, same account) → HTTP **400**. Auth/status problems → **401/403**. Missing account → **404**.

---

## 3. Black-Box Test Scenarios (behavior only, no code knowledge needed)

**Amount boundaries (Flow 2 & 3)**
- Amount = 9 → rejected (below min)
- Amount = 10 → accepted (min boundary)
- Amount = 10,000 → accepted (max boundary)
- Amount = 10,001 → rejected (above max)
- Amount = 0, negative, or non-numeric → rejected

**Role combinations**
- Agent → Customer (valid, Flow 2)
- Agent → Merchant / Agent / Admin (invalid, should reject)
- SYSTEM → Agent (valid, Flow 1)
- SYSTEM → Customer / Merchant / itself (invalid, should reject)
- Customer or Merchant as `from_account` (invalid — only Agent/SYSTEM can initiate a deposit)

**Account state**
- `from_account` or `to_account` doesn't exist → 404, message should identify which side
- `from_account` or `to_account` is `suspended`/`pending` → rejected
- `from_account == to_account` → rejected

**Balance / cap**
- Agent/SYSTEM balance lower than deposit amount → soft-rejected, response shows current balance
- Customer already at 10,000 → rejected, generic cap message
- Customer near cap (e.g. balance 9,500, deposit 600) → rejected, message shows exact remaining room (should be 500)
- Customer near cap, deposit exactly the remaining room → accepted, lands exactly at 10,000
- Two simultaneous deposits that would each individually fit but together exceed the cap → only one should succeed

**Authorization**
- Logged-in Agent tries to deposit "from" a different Agent's phone number → 403
- Login identifier in different case than stored (e.g. email casing) → confirm whether it's accepted (Flow 1/2 currently is case-insensitive here)

**Stripe-specific**
- Confirm the same `paymentIntentId` twice → second call rejected (208), balance not double-credited
- Confirm a `paymentIntentId` that belongs to a different customer → rejected (403)
- Confirm before the card payment actually succeeded → rejected (400)
- Confirm with amount that would exceed customer's 10,000 cap after Stripe already charged the card → verify customer isn't charged without receiving wallet credit (Stripe check happens at create-intent, before the actual charge — worth confirming the cap can't be bypassed by charging first then confirming after balance changed)

**Response correctness**
- Flow 2 success response's `currentBalance` is the Agent's balance, not the customer's — confirm UI displays the right one
- Flow 2: confirm commission amount in response = 2.5% of amount, and Agent's net balance change = amount × 0.975 decrease

---

## 4. White-Box Test Scenarios (needs code/DB access)

**Branch coverage — `deposit.controller.js`**
- Force each early-exit branch in order and confirm the *first* failing check wins when multiple are true at once (e.g. inactive account AND wrong role at the same time — which message comes back?): amount invalid → account not found → not authorized → same account → inactive account → wrong `from` role → wrong `to` role (branch-specific) → amount range → balance/cap.
- Confirm the `isSystemAccount` branch is chosen purely by `phone_number === 'SYSTEM'`, not by role — e.g. try renaming/duplicating a phone number to `SYSTEM` casing variants (`system`, `System`) and see whether the branch still triggers (controller compares case-insensitively for auth but the branch check itself at line ~78 is an exact `===` — worth checking if these two checks can disagree).

**DB / ledger verification (query `Transactions` table directly after each test)**
- Confirm exactly 2 rows written per deposit, sharing one `trnxId`.
- Confirm `transaction_type` is `'Deposit'` for Flow 1/2 rows, but **`NULL`** for Flow 3 (Stripe) rows — check any report/query that filters on `transaction_type = 'Deposit'` to see if it silently excludes Stripe cash-ins.
- Confirm Flow 2's Agent-side row has both `debit = amount` and `credit = commission` on the *same* row (not two separate rows) — verify this doesn't confuse any downstream statement/reporting logic that assumes debit-only or credit-only rows.
- Confirm row locking works: run two concurrent deposits against the same `from_account` near its balance limit directly against the DB/API (not through the UI) and confirm no over-draw occurs.

**Config-driven values**
- Check behavior when the `Commissions` row for `Deposit`/`Agent` is set `is_active = 0` — controller falls back to hardcoded defaults (2.5%, 10–10,000); confirm this fallback actually engages rather than erroring.
- Change `rate`/`min_txn_amount`/`max_txn_amount` directly in the DB and re-test boundaries — confirm the controller picks up the new values without a redeploy (it re-queries `Commission.getConfig()` per request).

**Endpoint cross-check**
- `GET /transaction/limit/:account` computes remaining cap headroom independently (matches ledger rows by `description = 'Deposit'`, hardcodes `10000`) — separately from the actual deposit controller's cap logic. Deposit a customer via Flow 1-style top-up or Stripe (different description strings) and confirm whether this endpoint's number still matches the customer's true remaining headroom, or drifts.

**Security**
- `getBalance()` builds its SQL by string concatenation of the `account` parameter, not parameterized — attempt registering/using a phone number containing SQL metacharacters and exercise any deposit call that triggers `getBalance()` on it.
- Confirm `GET /transaction/balance/:account` and `/transaction/limit/:account` (used internally by these flows) don't require the caller to own the account being queried — any authenticated user can currently query any account's balance/limit.

---

## 5. Step-by-Step: Reproducing "Deposit limit API returns incorrect remaining limit"

Confirmed bug — `GET /transaction/limit/:account` does not compute headroom the same way the actual 10,000 BDT cap is enforced. It filters ledger rows by the literal string `description = 'Deposit'` / `'Withdraw'`, so it misses Stripe cash-in credits (`description: 'Bank Cash In (Stripe)'`) and any SendMoney/Payment credits — the real cap checks (`deposit.controller.js`, `stripeCashIn.controller.js`) both use the full account balance instead.

**Prerequisites**
- Backend running locally (`http://localhost:5000` by default).
- A test account (any role works, but a Customer with some deposit history via Stripe shows the gap clearest) with a valid login (phone/email + password).
- Postman, curl, or any HTTP client.
- The `X-AUTH-SECRET-KEY` value (matches the backend's `PARTNER_KEY` env var) — required on every call below alongside the JWT.

**Steps**

1. **Log in** to get a JWT.
   ```
   POST /user/login
   Body: { "phone_number": "<account phone>", "password": "<password>" }
   ```
   - Admin/SYSTEM accounts get a token immediately.
   - Any other role gets `{ "otpRequired": true }` — the OTP is always printed to the server console, and also emailed if the account's email ends in `@gmail.com`.

2. **Verify OTP** (skip if step 1 already returned a token):
   ```
   POST /user/verify-otp
   Body: { "identifier": "<same phone/email as login>", "otp": "<4-digit code>" }
   ```
   Response includes the `token` to use below.

3. **Check the account's real balance:**
   ```
   GET /transaction/balance/<account phone>
   Headers: Authorization: Bearer <token>, X-AUTH-SECRET-KEY: <partner key>
   ```
   Note the `balance` value returned.

4. **Compute the expected remaining limit yourself:**
   ```
   expected_limit = 10000 - balance
   ```

5. **Check what the limit endpoint actually returns:**
   ```
   GET /transaction/limit/<same account phone>
   Headers: same as step 3
   ```
   Note the `limit` value returned.

6. **Compare** the value from step 4 against the value from step 5.
   - **Bug reproduced** if they don't match — the endpoint will typically report a *larger* remaining limit than is actually available (i.e. it understates how much of the wallet is already used).
   - Reference result observed during verification: balance `5,970.5` → expected limit `4,029.5` → actual limit returned `9,285`.

7. **(Optional, to see exactly why)** Pull the account's ledger rows and check which `description` values contributed to its balance:
   ```sql
   SELECT description, credit, debit FROM Transactions WHERE account = '<account phone>';
   ```
   Any row whose `description` isn't exactly `'Deposit'` or `'Withdraw'` (e.g. `'Bank Cash In (Stripe)'`, SendMoney/Payment rows) is counted in the real balance (step 3) but silently skipped by the limit endpoint (step 5) — that gap is the bug.

---

## 6. Step-by-Step: Reproducing "Deposit receipt always shows Service Fee: ৳0.00"

Confirmed bug — this one is a **UI/frontend data-binding defect**, not a backend issue: the Deposit API genuinely returns a non-zero `commission` value, but `agent/cash-in/page.tsx` (line 175) renders a hardcoded `৳ 0.00` literal instead of reading it. Because the defect is in what's rendered on screen, it has to be observed in the actual browser — checking the API response alone isn't enough to prove the *display* is wrong, only that the data exists.

**Prerequisites**
- Backend running locally (`http://localhost:5000` by default).
- Frontend running locally: `npm run dev` inside `dmoney-web-react` (default `http://localhost:3000` unless configured otherwise).
- An Agent account login (phone/email + password) and an active Customer's phone number to deposit into.
- Browser DevTools (Network tab) open, so the real API response can be compared against what's shown on screen.

**Steps**

1. Open the app in a browser and go to the **Login** page.
2. Log in with the Agent's credentials.
   - If OTP is required, retrieve the code from the server console log (or the Agent's Gmail inbox if the account uses `@gmail.com`), then enter it on the OTP screen.
3. Navigate to the **Agent → Cash In** page (`/agent/cash-in`).
4. Open the browser's DevTools → **Network** tab and keep it open (filter by `deposit` if useful) before submitting the form.
5. Enter an active Customer's phone number and a deposit amount (e.g. `100`), then submit.
6. In the Network tab, find the `POST /transaction/deposit` request and inspect its **Response** body. Note the `commission` value returned — for a 100 BDT deposit at the seeded 2.5% rate, this should be `2.5` (or your actual configured rate × amount).
7. Look at the **success receipt** rendered on screen and find the "Service Fee" row.
8. **Compare:**
   - **Bug reproduced** if the receipt shows `Service Fee: ৳0.00` while the Network tab's response body shows a non-zero `commission` (e.g. `2.5`) for the same request. The on-screen value never changes no matter what amount is deposited or what commission is actually returned.
9. *(Optional, to confirm it's not just this one deposit)* Repeat steps 5–8 with a different amount (e.g. `500`, expected commission `12.5`). The receipt should still show `৳0.00` every time — proving the field is a hardcoded literal, not a value that's simply wrong for one case.
