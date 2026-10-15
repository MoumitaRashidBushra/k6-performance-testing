# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Document status:** This is an enterprise-level project knowledge document assembled by reading every controller, service, model, middleware, route, migration, and frontend page in both projects. Every statement is backed by code unless explicitly marked **"Inferred from implementation"** (behavior deduced by cross-referencing multiple files, not stated outright) or **"Not implemented"** / **"Not found in repository."** Where this document's findings differ from the frontend BRD (`dmoney-web-react/README.md`), the discrepancy is called out explicitly — the BRD has drifted from the code in several places (most notably: password hashing, self-statement pagination, and the SYSTEM→Agent deposit flow).

---

## 1. Project Overview

**DMoney** is a Mobile Financial Service (MFS) web platform (conceptually similar to bKash/Nagad) supporting digital money movement between **Admin**, **Agent**, **Customer**, and **Merchant** roles, plus an internal **SYSTEM** virtual account that collects all platform fees and acts as the liquidity reserve.

The repository is a **workspace of two independently-versioned projects** (no root git repo ties them together):

| Project | Path | Stack |
|---|---|---|
| Backend API | `dmoney-transaction-api/` | Node.js, Express 4, Sequelize (MySQL) |
| Frontend | `dmoney-web-react/` | Next.js 15 (App Router, TypeScript), Material UI |
| Legacy frontend | `dmoney-web-react/dmoney-reactjs/` | Create-React-App — superseded, do not add features here |

`dmoney-web-react/README.md` is a Business Requirements Document (BRD) and is a useful secondary reference, but this CLAUDE.md takes precedence where the two disagree, since this document was verified directly against the running code.

---

## 2. Architecture & Folder Structure

```
dmoney-transaction-api/
  app.js                 Express app: middleware, route mounting, 404 + global error handler
  server.js              http.createServer(app).listen(PORT)
  jwtMiddleware.js        authenticateJWT / publicAuthenticateJWT
  routes/                 user.route.js, transaction.route.js, default.route.js
  controllers/
    users/                user.controller.js, forgotPassword.controller.js
    transactions/         deposit, withdraw, sendMoney, payment, adminDeposit, stripeCashIn,
                           transactionDetails (read-only queries)
    default/               default.controller.js (health check)
  sequelizeModel/         Users, Transactions, Role, Commission, TransactionLimit, db.js
  services/               getBalance, generateTrnxId, limitChecker, emailHelper, gmailPersonalHelper
  utils/hash.js            SHA-256 password hashing
  migrations/              one-off `node migrations/xxx.js` scripts (not a migration framework)
  swagger/                 swagger.js loader + swaggerUser.yaml / swaggerTrnx.yaml + endpoint summary
  uploads/                 user profile photos (served back via GET /user/uploads/:file)

dmoney-web-react/
  src/app/                Next.js App Router pages, grouped by role: admin/*, agent/*, customer/*,
                           merchant/*, plus login, register, profile, change-password,
                           forgot-password, reset-password, page.tsx (public landing page)
  src/components/         DashboardLayout, LeftMenu, SelfStatement (shared by 3 roles), Pagination,
                           PWAProvider
  src/lib/api.ts           Single Axios instance — auth header injection, expiry checks, 401 handling
  src/middleware.ts        Edge middleware — cookie-based route gating only (no role logic)
```

### Layering (backend)
`routes/*.route.js` → `controllers/**/*.controller.js` → `sequelizeModel/*.js` (+ `services/*.js`) → MySQL via Sequelize. Wired up in `app.js`. There is no service/repository layer separate from controllers — controllers call Sequelize models and services directly.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js, Express 4.21 |
| ORM / DB | Sequelize 6.37 → MySQL (mysql2 driver) |
| Auth | jsonwebtoken (JWT), custom two-header scheme (see §5) |
| Validation | Joi |
| Email | googleapis (Gmail API, service-account) with Nodemailer/SMTP fallback |
| Payments | Stripe SDK (server) + `@stripe/stripe-js` / `@stripe/react-stripe-js` (client) |
| File upload | multer (disk storage) |
| API docs | swagger-jsdoc + swagger-ui-express, YAML specs |
| Frontend framework | Next.js 15 (App Router, Turbopack), React 19, TypeScript |
| UI | Material UI (MUI) 7 |
| HTTP client | Axios (single instance in `src/lib/api.ts`) |
| Legacy frontend | Create React App (`react-scripts`) — being replaced page-by-page |

---

## 4. Application Flow / Frontend ↔ Backend Communication

1. All frontend API calls (except a handful of unauthenticated calls made directly with raw `axios` on the login/register/forgot-password pages) go through the shared Axios instance in `src/lib/api.ts`.
2. **Request interceptor**: decodes the JWT client-side, checks `exp` against `Date.now()`, and if expired, clears the session and cancels the outgoing request *before* it reaches the network. If valid, attaches `Authorization: Bearer <token>` and `X-AUTH-SECRET-KEY: <NEXT_PUBLIC_SECRET_KEY>` to every request.
3. **Response interceptor**: on HTTP **401** only, clears `localStorage` + the `token` cookie and redirects to `/login`. **403** responses are left for the calling page to render as an in-page error — this distinction must be preserved in any new API call code.
4. `src/middleware.ts` (Next.js Edge middleware) checks only for the *presence* of a `token` cookie against a `publicRoutes` allowlist (`/login`, `/register`, `/`, `/forgot-password`, `/reset-password`); it has no knowledge of the user's role.
5. **Role-based UI** (which menu items/pages a user sees) is decided entirely client-side in `LeftMenu.tsx` / `DashboardLayout.tsx` from `role` stored in `localStorage` after login — this is a UI convenience only, not a security boundary. All real authorization happens server-side in each controller (and, per §14, some server-side checks are missing).
6. `DashboardLayout` additionally polls every 30 seconds client-side to detect token expiry and force logout — this is separate from `api.ts`'s per-request check.
7. Login stores `token`, `role`, `email`, `name`, `userId`, `phoneNumber`, `photo`, `balance` all in `localStorage`, and also sets a `token` cookie (used only by the Edge middleware for route gating).

---

## 5. Authentication & Authorization

### 5.1 JWT Token
- Signed with `ACCESS_TOKEN_SECRET`. Payload: `{ identifier, role }`, where `identifier` is whatever was submitted at login (email **or** phone_number) — not necessarily the phone number.
- Expiry controlled by `expires_in` env var (e.g. `1h`).

### 5.2 Dual Middleware (`jwtMiddleware.js`)

| Middleware | Requires | Behavior on failure |
|---|---|---|
| `authenticateJWT` | `Authorization: Bearer <jwt>` **and** `X-AUTH-SECRET-KEY` header matching `PARTNER_KEY` | No auth header → 401. Wrong secret key → 401. Invalid/expired JWT → 403 (returned via `res.status(403).json(...)`, correctly). |
| `publicAuthenticateJWT` | `Authorization: Bearer <jwt>` only — no secret key | No auth header → **throws** an `Error` with `.status = 401` (not via `res.json`). Invalid/expired JWT → **throws** inside the `jwt.verify` callback with `.status = 403`, again not via `res.json`. See §14 for why this is a regression-sensitive difference from `authenticateJWT`. |

`authenticateJWT` guards all CRUD and transaction routes. `publicAuthenticateJWT` guards only the read-only user-search endpoints (`/user/list`, `/user/search/id/:id`, `/user/search/phonenumber/:phone`, `/user/search/email/:email`).

### 5.3 Password Storage
Passwords **are hashed** with SHA-256 via `utils/hash.js` (`crypto.createHash('sha256')`) — applied consistently in `createUser`, `updateUser`, `registerUser`, `loginUser` (comparison), and `resetPassword`. **This corrects the BRD, which claims plain-text storage/comparison — that is out of date.** Note SHA-256 without a salt is a weak scheme for production use (no salting, vulnerable to rainbow-table attacks), though it is not plain text.

### 5.4 Login / OTP Flow (`POST /user/login` → `POST /user/verify-otp`)
1. Client submits `email` **or** `phone_number` + `password` to `/user/login`.
2. Server finds the user by either field, compares `hashPassword(password)` against the stored hash.
3. **If role is `Admin` or `phone_number === 'SYSTEM'`**: JWT issued immediately in the login response (`{ token, role, expiresIn }`) — OTP is skipped entirely.
4. **Otherwise** (Customer/Agent/Merchant): a 4-digit numeric OTP (`Math.floor(1000 + Math.random()*9000)`) is generated, stored in `Users.otp` with `Users.otp_expire = now + 2 minutes`, and:
   - **always logged to the server console**, regardless of email domain;
   - **also emailed** if the user's email ends in `@gmail.com` (case-insensitive) — non-Gmail users get console-only delivery.
   - Response: `{ message: "OTP sent to your registered email address", otpRequired: true }` — no token.
5. Client then calls `POST /user/verify-otp` with `{ identifier, otp }`. Server checks: OTP exists, not expired, and matches (string compare after `.trim()`). On success, `otp`/`otp_expire` are cleared (one-time use) and a JWT is issued. On expiry, the columns are cleared and a 401 is returned. On mismatch, 401 without clearing (so the same OTP can be retried until it expires).
6. **Dev bypass (undocumented in `.env.example`)**: if the verify-otp request includes `?env=dev` **and** the submitted OTP exactly equals `process.env.DEFAULT_OTP`, the expiry and match checks are both skipped entirely for **any** account. See §14/§16 — this is a live security consideration if `DEFAULT_OTP` is ever set outside a dev environment.

### 5.5 Forgot / Reset Password (not documented in the BRD's core flow list, but implemented)
- `POST /user/forgot-password` — accepts `{ email }` or `{ phone_number }`, looks up the user, rejects non-Gmail accounts (400), generates a `crypto.randomBytes(32).toString('hex')` reset token valid for 1 hour, stores it in `Users.reset_token`/`reset_token_expires`, and emails a reset link built from `FRONTEND_URL`. The link is also always logged to the console.
- `POST /user/reset-password` — accepts `{ token, password, confirmPassword }`, validates match + min length 4, looks up a user with that token where `reset_token_expires > now`, hashes and stores the new password, clears the token columns.
- Frontend: `/forgot-password` and `/reset-password` pages (`src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`); the reset page reads `?token=` from the URL.

### 5.6 Session Management (Frontend)
See §4 — token stored in `localStorage` + cookie; 401 triggers auto-logout; 403 does not; a client-side 30s poll (`DashboardLayout`) and a per-request expiry check (`api.ts`) both guard against a stale token being used.

---

## 6. User Lifecycle

### 6.1 Registration (`POST /user/register` — public, no auth)
- Allowed roles: `Customer`, `Agent`, `Merchant` only (enforced by a dedicated Joi schema, `validateRegistration`, which whitelists these three roles — Admin cannot self-register).
- Email must match `/@gmail\.com$/i` (case-insensitive) or the request is rejected with 400 before any DB lookup.
- Duplicate email → 208; duplicate phone_number → 208 (checked as two separate queries, so the two failure messages are distinguishable).
- Role must exist in the `Roles` table (see §14 — this table is not auto-seeded).
- New user is created with `status: 'pending'` explicitly (cannot transact until an Admin activates them).
- A registration-confirmation email is sent (fire-and-forget; failure doesn't fail the HTTP response).

### 6.2 Account Status Lifecycle
`status` is an ENUM on `Users`: `pending` (default) → `active` (admin-approved) → `suspended` (admin-blocked). Only Admin can change it, via `PATCH /user/update/:id`. All four transaction controllers (deposit, withdraw, sendMoney, payment) check that **both** the `from_account` and `to_account` users have `status === 'active'` before proceeding, returning 403 otherwise. `adminDeposit` and the Stripe flow check status too (Stripe's `createPaymentIntent` explicitly requires the customer to be `active`; `adminDeposit` does not check the Admin's own status, only their role).

When an Admin PATCHes `status` to `active` or `suspended`, a notification email is fired to the affected user (non-blocking).

### 6.3 Profile Update / Role Management
- `PUT /user/update/:id` (full update) — calls `validateUser()`, whose Joi schema marks **every** field (`name`, `email`, `password`, `phone_number`, `nid`, `role`) as `.required()`. **This means a full PUT update requires re-submitting the password field even when only changing e.g. the name — a QA-relevant, code-confirmed constraint.** The frontend never uses PUT; it always uses PATCH.
- `PATCH /user/update/:id` (partial update, `partialUpdateUser`) — no full-schema validation; only an inline Gmail-domain check if `email` is being changed. Any subset of fields may be supplied.
- **Both** PUT and PATCH permit **self-service** updates, not just Admin: the controller computes `isSelf = user.email === req.user.identifier || user.phone_number === req.user.identifier` and allows the request if `isAdmin || isSelf`. **This corrects the BRD/older docs, which state user updates are "Admin only."** Non-admin callers additionally have `role` and `status` stripped from their payload server-side, so a self-update cannot escalate role/status.
- Protected accounts (`phone_number === 'SYSTEM'`, or email in `{admin@roadtocareer.net, admin@dmoney.com, system@dmoney.com}`) cannot be updated or deleted by anyone, including Admin — returns 403.
- `DELETE /user/delete/:id` — Admin only (role check at the top of the handler, before the protected-account check).
- Frontend Profile page (`/profile`) lets any role edit their own `name`/`email`/`phone_number`/`nid` (role is read-only in the UI); the Admin user-detail page (`/admin/users/:userId`) additionally exposes editable `role` and `status` selects.

### 6.4 Photo Upload
`POST /user/upload/:id` (no auth middleware on the route itself — relies only on the multer file filter) accepts a single `image` field via multer disk storage into `./uploads`, max 1MB, MIME type must start with `image/`. **The stored filename is the client-supplied `file.originalname` verbatim, with no sanitization or uniqueness suffix** — see §14 for the resulting risks (overwrite collisions and potential path-traversal via a crafted original filename). `GET /user/uploads/:file` (also unauthenticated) serves the file by joining `req.params.file` directly into the uploads path.

---

## 7. Business Logic — Transactions

All transaction endpoints require `authenticateJWT` (JWT + `X-AUTH-SECRET-KEY`). Account identifiers are always **phone numbers**. Every financial operation is implemented as a Sequelize `sequelize.transaction()` at `READ_COMMITTED` isolation, with `SELECT ... FOR UPDATE` row-locking on the affected account's aggregate balance query, and writes 2–3 `Transactions` rows sharing one `trnxId` (double/triple-entry bookkeeping) — **this is the pattern to copy for any new money-movement endpoint.**

**Common precondition sequence** (all four peer-to-peer/agent-mediated controllers, in this order):
1. Both `from_account` and `to_account` exist (else 404, with a message distinguishing which side failed).
2. **Authorization**: the JWT's `req.user.identifier` must equal either the `from_account` user's `phone_number` or `email` — i.e., you can only transact from an account you are logged in as. (Deposit's SYSTEM-flow branch compares case-insensitively; the other three controllers — withdraw, sendMoney, payment — compare with strict `===`, so a login identifier that differs only in case from the stored value will be rejected as unauthorized on those three. This inconsistency is worth a dedicated regression test.)
3. `from_account !== to_account` (400 if equal).
4. Both accounts' `status === 'active'` (403 otherwise, message identifies which side).
5. Role checks specific to the transaction type (see below).
6. Type-specific validation (limits, min amount).
7. Inside the DB transaction: locked balance read, sufficiency check, then the ledger writes.

### 7.1 Deposit — `POST /transaction/deposit`
Two distinct flows, both entered only if `from_account`'s role is `Agent`:

- **Flow 1 — SYSTEM → regular Agent** (not documented in the BRD at all): triggered when `from_account.phone_number === 'SYSTEM'`. `to_account` must be a regular Agent (not SYSTEM itself, not Customer/Merchant/Admin). No commission, no per-transaction min/max, no customer cap — only a SYSTEM-balance sufficiency check. Writes 2 rows tagged `transaction_type: 'Deposit'`, descriptions `"System Deposit to Agent"` / `"Top-up from SYSTEM"`.
- **Flow 2 — Regular Agent → Customer**: `to_account` must have role `Customer`. Amount must be within `[minAmount, maxAmount]` from `Commission.getConfig('Deposit')` (seeded: 10–10,000 BDT). Agent must have sufficient balance. Customer's wallet balance is checked against the 10,000 BDT cap (`maxLimit`) — if the customer is already at/over cap, 208; if the deposit would exceed it, 208 with the exact remaining headroom. Commission = `amount × agentCommissionRate` (2.5%), credited to the Agent alongside the debit; the Customer is credited the full `amount`.

Response includes `commission` and `currentBalance` (of the depositing Agent).

### 7.2 Withdraw (Cash-Out) — `POST /transaction/withdraw`
`from_account` must be `Customer` or `Merchant`; `to_account` must be `Agent`. If `from_account` is a Customer, `checkCustomerLimits()` is called **before** the minimum-amount check and before the balance check, passing `amount + withdrawFee` as the total debit. Minimum amount 10 BDT. Fee: `withdrawFee = Commission.calcFee(SYSTEM rule, amount)` = 1% with a 5 BDT floor. Agent commission = `amount × agentCommissionRate` (2.5%), added to the Agent's credit. 3 ledger rows (payer debit, Agent credit, SYSTEM credit for the fee), all tagged `transaction_type: 'Withdraw'`.

### 7.3 Send Money (P2P) — `POST /transaction/sendmoney`
**Both** accounts must be role `Customer` (Agents/Merchants rejected with 400). Limit check runs for the sender before the min-amount check. Fee: flat 5 BDT (from the `SendMoney` SYSTEM rule, `fee_type = flat`). 3 ledger rows tagged `'SendMoney'`.

### 7.4 Payment — `POST /transaction/payment`
`from_account` must be `Customer` or `Agent`; `to_account` must be `Merchant`. Optional `discount_code`/`discount_amount`: if `discount_code === process.env.DISCOUNT_CODE` and `discount_amount` is truthy, `finalAmount = amount − amount×(discount_amount/100)`. **`discount_amount` is not range-validated (not clamped to 0–100).** A `discount_amount ≥ 100` produces a non-positive `finalAmount`, which is *incidentally* caught by the subsequent `finalAmount < minAmount` check (400) — but a **negative** `discount_amount` is never rejected and simply *increases* `finalAmount` above the original `amount` (worth a boundary test). Limit check applies only when `fromRole === 'Customer'` (Agents are exempt from Customer limits when paying). Fee: 1% with a 5 BDT floor (SYSTEM rule). **The seeded `Merchant Commission` rule (2.5%) in the `Commissions` table is never read or applied by this controller** — the merchant is credited exactly `finalAmount`, with no commission added on top. This is a real gap between the seeded config data and the controller logic; the BRD's claim of a merchant commission is inaccurate as currently implemented.

### 7.5 Admin Deposit to SYSTEM — `POST /transaction/adminDeposit`
`from_account` must be an `Admin`; `to_account` must be `phone_number === 'SYSTEM'`. No balance check, no min/max beyond `amount > 0`. Two ledger rows, written inside a transaction for atomicity but with **no** `transaction_type` set (column left `NULL`, despite the model's comment suggesting `'AdminDeposit'` should be used).

### 7.6 Bank Cash-In via Stripe (Customer only) — two-step
1. `POST /transaction/stripe/create-intent`: caller must be an active Customer. Amount validated against the `Deposit` commission config's min/max (10–10,000) and against the customer's remaining wallet headroom under the 10,000 cap (208 if at/over cap). Creates a Stripe `PaymentIntent` with `metadata: { customer_phone, customer_email, dmoney_amount }`, returns `clientSecret`.
2. `POST /transaction/stripe/confirm`: retrieves the PaymentIntent from Stripe, requires `status === 'succeeded'`, verifies `metadata.customer_phone` matches the authenticated caller (anti-spoofing), and checks no `Transactions` row already exists with `trnxId = paymentIntentId` (idempotency guard, 208 on replay). Writes 2 ledger rows (SYSTEM debit, Customer credit) — again with **no `transaction_type` set** (`NULL`, despite the model comment implying `'StripeCashIn'`).

Frontend: 3-step wizard at `/customer/cash-in-bank` using `@stripe/react-stripe-js`'s `CardElement`; test card `4242 4242 4242 4242`.

---

## 8. Commission System

All fee/commission rules live in the `Commissions` MySQL table (seeded by `migrations/create_commission_table.js`), loaded per-request via `Commission.getConfig(transaction_type)` and computed via `Commission.calcFee(rule, amount)`.

| transaction_type | fee_name | fee_type | rate | min_fee | recipient | charged_to |
|---|---|---|---|---|---|---|
| Deposit | Agent Commission | percentage | 2.5% | — | Agent | platform |
| Withdraw | Service Fee | percentage | 1% | 5.00 | SYSTEM | from_account |
| Withdraw | Agent Commission | percentage | 2.5% | — | Agent | platform |
| SendMoney | Service Fee | flat | 5.00 | — | SYSTEM | from_account |
| Payment | Service Fee | percentage | 1% | 5.00 | SYSTEM | from_account |
| Payment | Merchant Commission | percentage | 2.5% | — | Merchant | platform | *(seeded but unused — see §7.4)* |

- `calcFee(rule, amount)`: `flat` → returns `rate` as-is; `percentage` → `rate × amount`, floored to `min_fee` if the result is lower. **`max_fee` is defined in the schema but never read anywhere in the codebase** — there is no fee ceiling in practice, only floors.
- `charged_to` is stored on each row but **not read programmatically** by any controller — the actual debit/credit account assignment is hardcoded per-controller to match the intended semantics; the column is descriptive metadata only (Inferred from implementation).
- `min_txn_amount`/`max_txn_amount` on the `Commissions` rows double as the transaction's allowed amount range (`Deposit`: 10–10,000; others: min 10, no max) — these are read by `Commission.getConfig()` and used for the min/max checks in each controller.
- All fee/commission config is DB-driven and editable without a redeploy, per row, via the `is_active` flag or by updating `rate`/`min_fee`.

---

## 9. Transaction Limit System

Implemented in `services/limitChecker.js`, backed by the `TransactionLimits` table (seeded by `migrations/create_transaction_limits.js`).

- **Scope**: `role = 'Customer'` only. Applies to **outgoing** transaction types `SendMoney`, `Payment`, `Withdraw` (matched via `Transactions.transaction_type`). Does **not** apply to Agents, Merchants, Admin, or to incoming flows (Deposit, Stripe cash-in).
- **Seeded limits**: daily — 5,000 Tk / 10 transactions; monthly — 50,000 Tk / 50 transactions. `is_active` flag per row allows soft-disabling a limit without deleting it.
- **Validation order**: `checkCustomerLimits(customerPhone, totalDebit)` is called by the sendMoney/withdraw/payment controllers **before** the minimum-amount check and before the DB transaction/balance check. `totalDebit` must be the full ledger debit (transfer amount + fee) to stay consistent with the historical `SUM(debit)` usage query.
- For each active limit row: `period` determines the window start (`startOfDay()` = today 00:00 UTC; `startOfMonth()` = 1st of month 00:00 UTC). Usage is computed as `COUNT(DISTINCT trnxId)` and `SUM(debit)` over `Transactions` where `account = customerPhone AND debit > 0 AND transaction_type IN ('SendMoney','Payment','Withdraw') AND createdAt >= periodStart`.
- Count limit is checked **before** the amount limit. On failure, returns `{ allowed: false, message, details }` — the calling controller responds **HTTP 400** (not 208 — this is a deliberate convention difference from the "soft" balance-related 208s).
- **Independent of** the 10,000 BDT customer wallet balance cap (§7.1/§7.6), which is an incoming-side rule enforced only in `deposit.controller.js` and `stripeCashIn.controller.js`.

---

## 10. Ledger System / Balance Calculation

- **No stored balance column anywhere.** Every account's balance is computed on demand:
  ```sql
  SELECT COALESCE(SUM(credit) - SUM(debit), 0) AS Balance FROM Transactions WHERE account = '<phone_number>'
  ```
  (`services/getBalance.js`). Every financial operation writes multiple rows sharing one `trnxId` (double/triple-entry bookkeeping) rather than mutating a balance field — this is confirmed across every transaction controller.
- `services/getBalance.js` builds this query via **raw string concatenation of the `account` parameter**, not a parameterized/bound query (unlike every other raw SQL query in the codebase, which uses `?`/named replacements). See §14 for why this is a live SQL-injection concern given the `phone_number` field's actual validation.
- `services/generateTrnxId.js` generates `TXN` + 10 random uppercase-alphanumeric characters (`crypto.randomBytes`), 13 characters total. `trnxId` is explicitly **not** a unique DB constraint (`unique: false` in the model) since multiple rows intentionally share one ID per operation — except for Stripe cash-ins, where `trnxId` is set to the Stripe `paymentIntentId` itself and used as an idempotency key (a second `confirm` call with the same PI is rejected via a `findOne` lookup, 208).
- **SYSTEM account** is seeded with an opening balance of 10,000,000 BDT via a seed row (`trnxId: TRNX1001`, `from_account: SUPER_USER`, `credit: 10000000`) inserted by `sequelizeModel/Transactions.js` on `sequelize.sync()`.
- **Customer wallet cap** (10,000 BDT): enforced only in Deposit-flow-2 and Stripe create-intent, by comparing the customer's live computed balance against `maxTxnAmount` from the `Deposit` commission config.

---

## 11. Role Permission Matrix

| Feature / Endpoint | Admin | Agent | Customer | Merchant | SYSTEM |
|---|:---:|:---:|:---:|:---:|:---:|
| Create/Update/Delete any user | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update/delete **own** profile (PATCH) | ✅ | ✅ | ✅ | ✅ | ❌ (protected account) |
| View all transactions (`GET /transaction/list`) | Intended admin-only; **not enforced in code** — any authenticated caller can call it (see §14) |||||
| Deposit to SYSTEM (`adminDeposit`) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Deposit / Cash-In to Customer | ❌ | ✅ | ❌ | ❌ | ❌ |
| SYSTEM → Agent top-up | ❌ | — (SYSTEM is itself an Agent-role account) | ❌ | ❌ | ✅ |
| Bank Cash-In via Stripe | ❌ | ❌ | ✅ | ❌ | ❌ |
| Withdraw / Cash-Out | ❌ | receives | ✅ | ✅ | ❌ |
| Send Money (P2P) | ❌ | ❌ | ✅ (both sides) | ❌ | ❌ |
| Payment to Merchant | ❌ | ✅ | ✅ | receives | ❌ |
| OTP login required | ❌ (bypassed) | ✅ | ✅ | ✅ | ❌ (bypassed) |
| Self-registration | ❌ (not allowed) | ✅ | ✅ | ✅ | n/a |

Note: the "View own statement"/"View own profile"/"Change own password" rows apply identically to all four live roles and are omitted for brevity.

---

## 12. Database Schema

### `Users`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | STRING, NOT NULL | |
| email | STRING, NOT NULL, **UNIQUE** | |
| password | STRING, NOT NULL | SHA-256 hash |
| phone_number | STRING, NOT NULL | **Not marked unique at the DB/model level** — uniqueness is enforced only by an application-level `findOne` check before insert, so a race condition between two concurrent registrations with the same phone number is possible (Inferred from implementation — no transaction wraps the check-then-insert). Acts as the account number for all transactions. |
| nid | STRING, NOT NULL | |
| role | STRING, **allowNull: true at the model level** | Practically required via Joi at the controller layer; indexed (`fields: ['role']`), plus a redundant standalone `add_role_index.js` script that idempotently adds the same index. |
| status | ENUM('pending','active','suspended'), default `pending` | |
| otp | STRING(4), nullable | |
| otp_expire | DATE, nullable | |
| reset_token | STRING(64), nullable | |
| reset_token_expires | DATE, nullable | |
| photo | STRING, nullable | filename in `uploads/` |
| createdAt/updatedAt | auto | |

Predefined/seeded rows (via `sequelize.sync()` in `Users.js`): SYSTEM (Agent role, phone `SYSTEM`), Admin, Test Agent, Test Customer 1 & 2, Test Merchant — all `status: active`, password `1234` (hashed).

### `Transactions`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| account | STRING, NOT NULL | which account this ledger row belongs to |
| from_account / to_account | STRING, NOT NULL | semantic sender/receiver of the operation (not necessarily equal to `account`) |
| description | STRING, NOT NULL | e.g. "Deposit", "Withdraw Service Charge" |
| trnxId | STRING, NOT NULL, **not unique** | shared across 2–3 rows per operation |
| debit / credit | **DOUBLE**, NOT NULL | (the BRD's table incorrectly lists `debit` as INTEGER) |
| transaction_type | VARCHAR(20), nullable | `SendMoney`\|`Payment`\|`Withdraw`\|`Deposit` are actually written; `StripeCashIn`/`AdminDeposit` are documented in the column comment but **never actually written** by their respective controllers (remain `NULL`) |
| createdAt | auto | |

Seed row: SYSTEM opening balance of 10,000,000 (`trnxId: TRNX1001`).

### `Roles`
| Column | Type |
|---|---|
| id | INTEGER PK |
| role | STRING(20) |

**Not implemented: no migration or seed script populates this table.** `Users.js`/`Transactions.js` both seed data on `sequelize.sync()`, but `Role.js` only calls `sequelize.sync()` with no rows inserted. This means `createUser`/`registerUser`'s `Roles.findOne({ where: { role } })` check will fail ("Invalid role") on a fresh database until someone manually inserts `Admin`/`Agent`/`Customer`/`Merchant` rows — a setup prerequisite worth calling out to anyone standing up a new environment.

### `Commissions`
See §8 for the full seeded rule set. Columns: `transaction_type` (ENUM), `fee_name`, `fee_type` (ENUM percentage/flat), `rate` DECIMAL(10,6), `min_fee`/`max_fee` DECIMAL(10,2) nullable, `recipient` (ENUM SYSTEM/Agent/Merchant), `charged_to` (ENUM, descriptive only — see §8), `min_txn_amount`/`max_txn_amount`, `is_active`.

### `TransactionLimits`
Columns: `role` VARCHAR(20), `period` ENUM(daily/monthly), `max_amount` DECIMAL(15,2), `max_count` INT, `is_active` TINYINT default 1. Unique constraint `(role, period)`. Seeded: Customer daily 5000/10, monthly 50000/50 (§9).

---

## 13. API Reference

### User Endpoints (`routes/user.route.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/user/register` | none | Gmail-only; Customer/Agent/Merchant; `status: pending` |
| POST | `/user/login` | none | Returns JWT directly for Admin/SYSTEM; `otpRequired: true` for others |
| POST | `/user/verify-otp` | none | Completes OTP flow → JWT; supports `?env=dev` bypass with `DEFAULT_OTP` |
| POST | `/user/forgot-password` | none | Gmail-only; issues 1-hour reset token |
| POST | `/user/reset-password` | none | Consumes reset token |
| GET | `/user/list` | publicAuthenticateJWT | Paginated, includes computed `balance` per user |
| GET | `/user/search/id/:id` | publicAuthenticateJWT | |
| GET | `/user/search/phonenumber/:phone_number` | publicAuthenticateJWT | |
| GET | `/user/search/email/:email` | publicAuthenticateJWT | |
| GET | `/user/search/:role` | authenticateJWT | Paginated by role, no balance computed (optimized) |
| POST | `/user/create` | authenticateJWT | Admin only (checked in controller) |
| PUT | `/user/update/:id` | authenticateJWT | Full update — requires **all** fields incl. password; Admin or self |
| PATCH | `/user/update/:id` | authenticateJWT | Partial update; Admin or self; role/status stripped for non-admins |
| DELETE | `/user/delete/:id` | authenticateJWT | Admin only |
| POST | `/user/upload/:id` | none | multipart photo upload, 1MB max |
| GET | `/user/uploads/:file` | none | Serves the photo file |

### Transaction Endpoints (`routes/transaction.route.js`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/transaction/list` | authenticateJWT | **No role check in controller** — any authenticated caller sees all transactions (§14) |
| GET | `/transaction/search/:trnxId` | authenticateJWT | Returns all rows sharing that trnxId |
| GET | `/transaction/statement/:account` | authenticateJWT | **No ownership check** — any caller can view any account's statement (§14) |
| GET | `/transaction/limit/:account` | authenticateJWT | Remaining deposit headroom under the 10,000 cap |
| GET | `/transaction/balance/:account` | authenticateJWT | Computed balance for any account (no ownership check) |
| POST | `/transaction/deposit` | authenticateJWT | Agent→Customer or SYSTEM→Agent |
| POST | `/transaction/withdraw` | authenticateJWT | Customer/Merchant→Agent |
| POST | `/transaction/sendmoney` | authenticateJWT | Customer→Customer |
| POST | `/transaction/payment` | authenticateJWT | Customer/Agent→Merchant |
| POST | `/transaction/adminDeposit` | authenticateJWT | Admin→SYSTEM |
| POST | `/transaction/stripe/create-intent` | authenticateJWT | Customer only |
| POST | `/transaction/stripe/confirm` | authenticateJWT | Customer only |

### Misc
- `GET /` — health check (`default.controller.js`'s `serverStatus`). Note `transactionDetails.controller.js` exports a second, identically-named `serverStatus` that is never wired to a route — dead code (Inferred from implementation).
- Swagger UI: `GET /api-docs/user`, `GET /api-docs/transaction` (backed by `swagger/swaggerUser.yaml` / `swaggerTrnx.yaml`).

---

## 14. Security

Implemented mechanisms, and the concrete gaps found while reading the code:

- **JWT + secret-key dual auth** (§5.2) is the baseline for all write/CRUD and transaction routes.
- **OTP 2FA** for all non-Admin/non-SYSTEM logins (§5.4), including a rate-limited-by-time-window design (2-minute expiry, one-time use).
- **Password hashing** via SHA-256, unsalted (§5.3) — adequate to avoid plain-text storage, but weaker than a modern salted/adaptive hash (bcrypt/argon2/scrypt) for a production fintech system.
- **Stripe anti-spoofing + idempotency** (§7.6) — solid, explicit checks on both the payment-intent ownership and duplicate-processing.
- **Confirmed — Broken Object-Level Authorization on transaction read endpoints**: `GET /transaction/list`, `/transaction/search/:trnxId`, `/transaction/statement/:account`, `/transaction/limit/:account`, and `/transaction/balance/:account` all pass through `authenticateJWT` only — none of the corresponding controller functions in `transactionDetails.controller.js` check `req.user.role` or compare `req.user.identifier` against the requested `:account`. Any authenticated Customer/Agent/Merchant can view **any other account's** full transaction history and balance, or the entire platform's transaction ledger, simply by supplying a different phone number in the URL.
- **By-design broad read access on user search**: `publicAuthenticateJWT`-guarded endpoints (`/user/list`, `/user/search/*`) require only a valid JWT (no secret key) and return full profile + computed balance for any user — this matches the BRD's stated design intent (read-only, JWT-only) but is worth keeping in mind alongside the transaction-endpoint gap above, since it means any logged-in user can already resolve any phone number to a full profile before ever touching the transaction endpoints.
- **`publicAuthenticateJWT` throws instead of responding** (§5.2) — structurally different from `authenticateJWT`'s pattern of `res.status(...).json(...)`. This is a regression-sensitive code path: verify that expired/invalid tokens on the user-search endpoints reliably produce a clean 401/403 response rather than an unhandled exception, since the error is thrown (with a `.status` property) rather than passed to `next(err)` or written directly to the response.
- **`getBalance.js` builds a raw SQL string via concatenation** of the `account` parameter (§10), unlike every other raw query in the codebase (which uses `?`/named replacements). Because `phone_number` is validated by Joi only for **length** (`min(11).max(11)` on admin-create, `.length(11)` on self-register) and not for character set, a crafted 11-character `phone_number` containing SQL metacharacters is a plausible attack surface for this specific query. Treat this as a priority fix target and a priority QA test (attempt registering phone numbers containing `'`, `;`, etc., then exercise any endpoint that calls `getBalance()`).
- **Photo upload/serve path handling** (§6.4): the uploaded file's stored name is the client-supplied `originalname`, unsanitized — two users uploading same-named files will silently overwrite each other, and a crafted filename containing path-traversal sequences is a code smell warranting a dedicated path-traversal test against both `POST /user/upload/:id` and `GET /user/uploads/:file`.
- **`DEFAULT_OTP` dev bypass** (§5.4) is undocumented in `.env.example` and, if ever set in a non-dev environment, allows OTP verification to be bypassed for **any** account via `?env=dev`.
- **Frontend secret key has a hardcoded fallback**: `login/page.tsx` and other pages use `process.env.NEXT_PUBLIC_SECRET_KEY || 'ROADTOSDET'` — since `NEXT_PUBLIC_*` vars are bundled into client JS anyway, the "secret" key is not actually secret from the browser's perspective; it functions as a shared partner identifier, not a confidentiality control.
- **CORS is fully open**: `app.js` sets `cors({ origin: "*" })` — acceptable for a practice/lab platform, a gap for production hardening.

---

## 15. Error Handling & HTTP Status Codes

| Code | Meaning | When returned |
|---|---|---|
| 200 | OK | Reads: user found, list returned, OTP sent |
| 201 | Created | Transaction completed, user/registration created |
| 208 | Already Reported (soft failure) | Insufficient balance, wallet-cap exceeded (deposit/Stripe), duplicate Stripe confirm, duplicate user (create/register) |
| 400 | Bad Request | Validation errors, same from/to account, min-amount violations, **Customer daily/monthly limit exceeded**, OTP verification failure via `verify-otp`, invalid role, invalid amount |
| 401 | Unauthorized | No auth header (`authenticateJWT`/`publicAuthenticateJWT`), wrong secret key, wrong password, expired/invalid OTP (`verify-otp`) |
| 403 | Forbidden | Invalid/expired JWT, non-admin attempting an admin action, attempt to modify a protected account, inactive account on either side of a transaction, Stripe PI ownership mismatch, "you can only transact from your own account" |
| 404 | Not Found | User/transaction/account not found |
| 500 | Internal Server Error | Unhandled DB/Stripe/email errors |

The 208 convention (RFC 5842 is actually about WebDAV) is a deliberate, established idiom throughout this codebase for "soft" business-rule failures, distinct from hard validation errors (400). The frontend explicitly special-cases this: since 208 is a 2xx code, Axios does **not** throw for it, so every transaction page checks `res.status === 208` manually before treating the call as a success (see e.g. `customer/send-money/page.tsx`).

---

## 16. Hidden Implementation Rules (Inferred from implementation)

These are behaviors that only become visible by reading multiple files together; none are stated as explicit requirements anywhere in the repo.

- The `Roles` table has no seed data anywhere in the repo (§12) — a fresh database will reject all user creation/registration until it's populated manually.
- `phone_number` uniqueness is enforced only by a pre-insert `findOne` check in application code, with no DB unique constraint and no wrapping transaction — a race condition between concurrent registrations/creates using the same phone number is possible.
- `transaction_type` is left `NULL` for Admin-deposit and Stripe-cash-in ledger rows, despite the column comment implying `'AdminDeposit'`/`'StripeCashIn'` values exist — only `SendMoney`/`Payment`/`Withdraw`/`Deposit` are ever actually written.
- The seeded `Merchant Commission` rule in `Commissions` is dead configuration — `payment.controller.js` never reads or applies it.
- `max_fee` on `Commissions` rows is dead schema — `Commission.calcFee()` only ever applies the `min_fee` floor, never a ceiling.
- `charged_to` on `Commissions` rows is descriptive only; controllers hardcode which account is debited/credited rather than branching on this column.
- Case-sensitivity of the from-account authorization check differs between `deposit.controller.js` (case-insensitive) and `withdraw`/`sendMoney`/`payment.controller.js` (case-sensitive `===`) — a login identifier differing only in case from its stored DB value behaves differently depending on which transaction type is attempted.
- `serverStatus` is defined twice (`default.controller.js` and `transactionDetails.controller.js`); only the former is ever routed.
- Backend `package.json` defines no `test` script, yet `.github/workflows/node.js.yml` runs `npm test` on every push/PR to `main` — this step will fail with "missing script" unless a test script is added or the workflow step is adjusted. Verify current CI status before assuming `npm test` is a working command.
- Frontend `package.json` defines no `lint` script (only `dev`/`build`/`start`/`prod`) — running `npm run lint` in `dmoney-web-react/` will fail. (An earlier version of this document, and `QUICK_START.md`, both reference `npm run lint`; that is stale.)
- `QUICK_START.md` describes the Next.js migration as ~20% complete with most role-specific pages "not yet migrated" — but the current `src/app/` tree already contains full admin/agent/customer/merchant page sets equivalent to the legacy CRA app's component list. Treat `QUICK_START.md` as a stale historical snapshot, not current migration status.
- The `DashboardLayout`'s balance-toggle button calls `GET /transaction/balance/:phoneNumber` on demand — a distinct code path from the balance shown on the Profile page (fetched via user-search) and the Self-Statement page's `currentBalance` (also from user-search). Three separate call sites compute "current balance" independently; a QA regression should confirm they always agree.

---

## 17. QA Notes

### Authentication / OTP
- Verify OTP is genuinely single-use (retry with the same OTP after a successful verification must fail).
- Boundary: OTP exactly at the 2-minute expiry edge.
- Confirm the `?env=dev` + `DEFAULT_OTP` bypass is **not** reachable in any deployed environment where `DEFAULT_OTP` might be set (or confirm it is unset in production `.env`).
- Case-sensitivity of `identifier` matching across login vs. the four transaction controllers (see §16) — test login with an email in different case than stored, then attempt each transaction type.

### User Management
- PUT vs PATCH on `/user/update/:id`: confirm PUT genuinely requires `password` in the body (Joi `.required()`), and that the frontend never triggers this path unintentionally.
- Self-service update: confirm a non-admin user cannot smuggle `role`/`status` into a PATCH body (they should be silently stripped, not rejected).
- Protected-account list (`SYSTEM`, `admin@dmoney.com`, `admin@roadtocareer.net`, `system@dmoney.com`) must reject both PUT/PATCH and DELETE, including when attempted by an Admin.
- Registration/creation against a database where `Roles` hasn't been seeded — confirm the actual failure mode ("Invalid role") matches expectations for a fresh environment.

### Transactions (all types)
- Every transaction type's `from_account === to_account` guard.
- Every transaction type's inactive-account guard, on both sides independently.
- Concurrency: fire two simultaneous requests debiting the same account near its balance limit — the `SELECT ... FOR UPDATE` locking should serialize them so only one succeeds (208), not both.
- Confirm 208 vs 400 vs 403 boundaries per §15 are stable across a refactor — the frontend depends on the exact status code (not just the message) for `insufficient balance`/`limit exceeded` handling.
- Deposit Flow 1 (SYSTEM→Agent) is untested by the BRD and easy to overlook in new test plans — include it explicitly.
- Payment discount: negative `discount_amount` is accepted and increases `finalAmount` above the sticker amount rather than discounting it — confirm this is intended behavior or file it as a defect.
- Merchant commission on Payment: confirm with the business owner whether the seeded 2.5% Merchant Commission rule is meant to be active; today the merchant receives `finalAmount` only.

### Balance / Statement
- Self-Statement (`SelfStatement.tsx`) is **server-paginated at 20 rows/page**, not a client-side fetch of up to 10,000 rows as older documentation claims. The date-range filter and running-balance calculation both operate **only on the currently-loaded page** — a QA test should confirm that filtering by a date range spanning multiple pages does not silently under-report transactions, and that running balance is only meaningful on page 0 (most recent page); on any later page, the displayed "running balance" is computed by walking backward from the account's *current* live balance through only that page's rows, which is arithmetically wrong once earlier (more recent, off-page) transactions exist.
- Admin's Transaction Lookup page (`admin/transactions/page.tsx`) has the same page-local running-balance limitation, and additionally anchors its running balance to `0` rather than to the account's real current balance unless a `fromDate` filter happens to walk further back within the same single fetched page — treat any running-balance figure beyond page 1 on this screen as unverified until cross-checked against `GET /transaction/balance/:account`.
- The 10,000 BDT wallet cap and the Customer daily/monthly outgoing limits are independent systems (§9's closing note) — a customer at the wallet cap can still receive a Stripe/agent deposit rejection (208) while having full outgoing headroom, and vice versa; test them independently, not as a single "limit" concept.

### Security-flavored regression areas
- IDOR on `/transaction/*` GET endpoints (§14) — if/when this is fixed, re-verify every legitimate cross-account use case (e.g., Admin's Transaction Lookup page, which intentionally looks up arbitrary accounts) still works for the roles that should retain that access.
- SQL-injection surface in `getBalance()` (§14/§10) — a high-value target for a dedicated security test using crafted `phone_number` values at registration.
- Photo upload filename collisions/traversal (§14/§6.4).

---

## 18. References

- `dmoney-web-react/README.md` — BRD; useful for business-language framing, but defer to this document (and the code) where they conflict (password hashing, self-update permissions, self-statement pagination, SYSTEM→Agent deposit flow, merchant commission).
- `dmoney-web-react/QUICK_START.md` — stale migration-status snapshot; do not use it to judge current frontend completeness.
- `dmoney-transaction-api/swagger/API_ENDPOINTS_SUMMARY.md` and Swagger UI (`/api-docs/user`, `/api-docs/transaction`) — endpoint list in shorter form; this document's §13 is the verified version.
- `dmoney-web-react/api_doc/` — Postman collections for the User and Transaction APIs.
- Controllers: `dmoney-transaction-api/controllers/{users,transactions,default}/*.controller.js`
- Services: `dmoney-transaction-api/services/{getBalance,generateTrnxId,limitChecker,emailHelper,gmailPersonalHelper}.js`
- Models: `dmoney-transaction-api/sequelizeModel/{Users,Transactions,Role,Commission,TransactionLimit,db}.js`
- Middleware: `dmoney-transaction-api/jwtMiddleware.js`
- Routes: `dmoney-transaction-api/routes/{user,transaction,default}.route.js`
- Migrations: `dmoney-transaction-api/migrations/*.js` (run manually with `node migrations/<file>.js`; no migration framework)

---

## Commands

### Backend (`dmoney-transaction-api/`)
```bash
npm run dev      # nodemon server.js — auto-restart dev server
npm start        # node server.js
```
No `test` script exists in `package.json` (see §16 — CI runs `npm test` regardless). The only files under `tests/` are ad-hoc scripts that send real emails (`node tests/sendPersonalEmail.test.js`, `node tests/sendServiceAccountEmail.test.js`), not a unit test suite.

Migrations (one-off, run manually, idempotent):
```bash
node migrations/add_otp_to_users.js
node migrations/add_status_to_users.js
node migrations/add_reset_token_to_users.js
node migrations/add_transaction_type_to_transactions.js
node migrations/create_commission_table.js
node migrations/create_transaction_limits.js
node add_role_index.js
```
There is **no migration/seed script for the `Roles` table** — populate it manually on a fresh database (see §12/§16).

Env config: `custom-env` (`sequelizeModel/db.js` calls `require('custom-env').env('dev')`), but the checked-in file is a plain `.env` — copy `.env.example` and fill in `DB_*`, `ACCESS_TOKEN_SECRET`, `PARTNER_KEY`, `STRIPE_SECRET_KEY`, `EMAIL_*`, `DISCOUNT_CODE`, `FRONTEND_URL`. `DEFAULT_OTP` is used by the code but not present in `.env.example` (§5.4/§14).

### Frontend (`dmoney-web-react/`)
```bash
npm run dev      # next dev --turbopack
npm run build    # next build --turbopack
npm start        # cross-env PORT=3006 next start
npm run prod     # build + start on port 3006
```
**No `lint` script is defined** (§16) — `npm run lint` will fail; do not rely on it for type-checking. Use `npm run build` to surface TypeScript errors.

Env: copy `.env.example` to `.env.local` (or `.env`) and set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SECRET_KEY` (must equal the backend's `PARTNER_KEY`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

Legacy CRA app (`dmoney-web-react/dmoney-reactjs/`): `npm start` / `npm test` / `npm run build` via `react-scripts` — do not add new features here (§1, §16).
