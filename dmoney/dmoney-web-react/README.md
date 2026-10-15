# Business Requirements Document (BRD)
## DMoney — Mobile Financial Service (MFS) Platform

**Document Version:** 1.2  
**Date:** 2026-03-26  
**Source:** Derived from codebase analysis of `dmoney-transaction-api` (Node.js/Express backend) and `dmoney-web-app-ui` (Next.js frontend)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Data Models](#4-data-models)
5. [Authentication & Security](#5-authentication--security)
   - 5.1 [Login Flow (OTP-based)](#51-login-flow-otp-based)
   - 5.2 [JWT Token](#52-jwt-token)
   - 5.3 [Dual Authentication — Two Middleware Types](#53-dual-authentication--two-middleware-types)
   - 5.4 [Session Management (Frontend)](#54-session-management-frontend)
6. [User Management Module](#6-user-management-module)
   - 6.7 [Self-Registration (Public)](#67-self-registration-public)
   - 6.8 [Account Status Lifecycle](#68-account-status-lifecycle)
   - 6.9 [Email Notifications](#69-email-notifications)
7. [Transaction Module](#7-transaction-module)
   - 7.1 [Deposit (Cash-In via Agent)](#71-deposit-cash-in-via-agent)
   - 7.2 [Withdraw (Cash-Out)](#72-withdraw-cash-out)
   - 7.3 [Send Money (P2P Transfer)](#73-send-money-p2p-transfer)
   - 7.4 [Payment](#74-payment)
   - 7.5 [Bank Cash-In via Stripe (Customer Only)](#75-bank-cash-in-via-stripe-customer-only)
   - 7.6 [Admin Deposit to SYSTEM](#76-admin-deposit-to-system)
8. [Customer Transaction Limits](#8-customer-transaction-limits)
9. [Fee & Commission Structure](#9-fee--commission-structure)
10. [Balance Calculation](#10-balance-calculation)
11. [Transaction Inquiry Module](#11-transaction-inquiry-module)
12. [Frontend UI — Role-Based Navigation](#12-frontend-ui--role-based-navigation)
13. [API Endpoints Reference](#13-api-endpoints-reference)
14. [System Constraints & Validation Rules](#14-system-constraints--validation-rules)
15. [Error Handling & HTTP Status Codes](#15-error-handling--http-status-codes)
16. [Protected / System Accounts](#16-protected--system-accounts)

---

## 1. Project Overview

**DMoney** is a web-based Mobile Financial Service (MFS) platform — similar in concept to bKash or Nagad — that enables digital money movement among four types of participants: **Admins**, **Agents**, **Customers**, and **Merchants**.

The platform is composed of:
- A **RESTful backend API** (`dmoney-transaction-api`) built with Node.js, Express, Sequelize ORM, and a MySQL database.
- A **web frontend** (`dmoney-web-app-ui`) built with Next.js 15 (TypeScript) and Material UI.

Core capabilities:
- Role-based user management (Admin-only)
- Cash-In (deposit) from Agent to Customer
- Cash-In via bank card (Stripe) — self-serve, Customer only
- Cash-Out (withdraw) from Customer/Merchant through Agent
- P2P Send Money between Customers
- Merchant Payment from Customer or Agent
- Admin-to-SYSTEM fund top-up
- Real-time balance tracking per account
- Transaction statement (history) with date filtering and running balance
- OTP-based two-factor login for non-Admin users
- Email notifications (registration confirmation, activation, suspension, OTP)
- DB-driven fee/commission rules and per-role transaction limits
- JWT-based authentication with automatic session expiry handling

---

## 2. System Architecture

```
┌────────────────────────────────────────────────┐
│              dmoney-web-app-ui                 │
│         (Next.js 15 + TypeScript + MUI)        │
│                                                │
│  Pages:  Login | Profile | Admin/* |           │
│          Agent/* | Customer/* | Merchant/*     │
│                                                │
│  Middleware: Cookie-based route protection     │
│  API Layer: Axios with JWT + Secret-Key header │
│  Payments: Stripe.js (client-side card form)   │
└──────────────────────┬─────────────────────────┘
                       │ HTTP REST
┌──────────────────────▼─────────────────────────┐
│           dmoney-transaction-api               │
│          (Node.js + Express + Sequelize)       │
│                                                │
│  Routes: /user/*, /transaction/*               │
│  Auth:   JWT Bearer + X-AUTH-SECRET-KEY        │
│  Email:  Gmail API (Google Service Account)    │
│  Payments: Stripe SDK                          │
│  Docs:   Swagger UI at /api-docs/*             │
└──────────────────────┬─────────────────────────┘
                       │ Sequelize ORM
┌──────────────────────▼─────────────────────────┐
│                   MySQL Database               │
│  Tables: Users | Transactions | Roles          │
│          Commissions | TransactionLimits       │
└────────────────────────────────────────────────┘
```

---

## 3. User Roles & Permissions

The system has five roles. Four are for live users; one is a special internal system account.

| Role       | Description                                                                 |
|------------|-----------------------------------------------------------------------------|
| **Admin**  | Manages all users (CRUD). Views all transactions. Deposits to SYSTEM. Cannot perform user-facing money ops. Bypasses OTP login. |
| **Agent**  | Deposits (Cash-In) to Customers. Receives Cash-Out from Customers/Merchants. Makes Payments to Merchants. Requires OTP login. |
| **Customer** | Sends money to other Customers. Cash-Out through Agent. Makes Payments to Merchants. Bank Cash-In via Stripe. Subject to daily/monthly outgoing limits. Requires OTP login. |
| **Merchant** | Receives Payments from Customers/Agents. Cash-Out through Agent. Views own statement. Requires OTP login. |
| **SYSTEM** | Internal virtual account. Collects all service fees/charges. Bypasses OTP login. Cannot be modified or deleted. |

### Role-Based Feature Access Matrix

| Feature                   | Admin | Agent | Customer | Merchant |
|---------------------------|:-----:|:-----:|:--------:|:--------:|
| User List                 | ✅    | ❌    | ❌       | ❌       |
| Create User               | ✅    | ❌    | ❌       | ❌       |
| Update / Delete User      | ✅    | ❌    | ❌       | ❌       |
| View All Transactions     | ✅    | ❌    | ❌       | ❌       |
| Deposit to SYSTEM         | ✅    | ❌    | ❌       | ❌       |
| Deposit / Cash-In (Agent) | ❌    | ✅    | ❌       | ❌       |
| Bank Cash-In (Stripe)     | ❌    | ❌    | ✅       | ❌       |
| Withdraw / Cash-Out       | ❌    | ❌    | ✅       | ✅       |
| Send Money (P2P)          | ❌    | ❌    | ✅       | ❌       |
| Payment to Merchant       | ❌    | ✅    | ✅       | ❌       |
| View Own Statement        | ❌    | ✅    | ✅       | ✅       |
| View Own Profile          | ✅    | ✅    | ✅       | ✅       |
| Change Own Password       | ✅    | ✅    | ✅       | ✅       |

---

## 4. Data Models

### 4.1 Users Table

| Field          | Type    | Constraints              | Notes                         |
|----------------|---------|--------------------------|-------------------------------|
| `id`           | INTEGER | PK, Auto-increment       |                               |
| `name`         | STRING  | Not null, 3–50 chars     |                               |
| `email`        | STRING  | Not null, Unique, 5–255 chars | Used for login            |
| `password`     | STRING  | Not null, min 4 chars    | Plain text (no hashing)       |
| `phone_number` | STRING  | Not null, exactly 11 digits | Acts as the **account number** for all transactions |
| `nid`          | STRING  | Not null, 7–13 chars     | National ID number            |
| `role`         | STRING  | 3–50 chars               | Admin/Agent/Customer/Merchant |
| `status`       | ENUM    | Not null, default `pending` | `pending` / `active` / `suspended` — controls transaction eligibility |
| `otp`          | VARCHAR(4) | Nullable              | 4-digit OTP generated at login; cleared after successful verification |
| `otp_expire`   | DATETIME | Nullable               | OTP expiry timestamp (now + 2 minutes); cleared after successful verification |
| `photo`        | STRING  | Nullable                 | Filename of uploaded photo    |
| `createdAt`    | DATE    | Auto                     |                               |
| `updatedAt`    | DATE    | Auto                     |                               |

> **Important:** A user's **phone number is their account number**. All financial transactions use `phone_number` to identify the from/to account.

**DB Migration for OTP columns:**
```bash
node migrations/add_otp_to_users.js
```

### 4.2 Transactions Table

| Field              | Type    | Constraints  | Notes                                          |
|--------------------|---------|--------------|------------------------------------------------|
| `id`               | INTEGER | PK, Auto-increment |                                          |
| `account`          | STRING  | Not null     | The account this ledger entry belongs to       |
| `from_account`     | STRING  | Not null     | Sender's phone number (or "SUPER_USER" / "SYSTEM" / "STRIPE") |
| `to_account`       | STRING  | Not null     | Receiver's phone number (or "SYSTEM")          |
| `description`      | STRING  | Not null     | Transaction type label (see below)             |
| `trnxId`           | STRING  | Not null     | Shared ID across all ledger entries for one operation |
| `debit`            | INTEGER | Not null     | Amount debited from `account`                  |
| `credit`           | DOUBLE  | Not null     | Amount credited to `account`                   |
| `transaction_type` | VARCHAR(20) | Nullable | Machine-readable type tag — used for limit enforcement (see §8) |
| `createdAt`        | DATE    | Auto         |                                                |

**`transaction_type` Values:**

| Value | Set by | Purpose |
|-------|--------|---------|
| `'SendMoney'` | sendMoney controller | Counts toward Customer outgoing limits |
| `'Payment'`   | payment controller   | Counts toward Customer outgoing limits |
| `'Withdraw'`  | withdraw controller  | Counts toward Customer outgoing limits |
| `'Deposit'`   | deposit controller   | Informational (no limit check) |
| `'StripeCashIn'` | stripe controller | Informational (no limit check) |
| `'AdminDeposit'` | adminDeposit controller | Informational |
| `NULL` | Legacy rows before migration | Excluded from limit calculations |

**Transaction Description Values:**
- `"Deposit"` — Customer's credit entry for an agent deposit
- `"Deposit Commission"` — Agent's net entry (debit=amount, credit=commission)
- `"Withdraw"` / `"Withdraw Service Charge"` — Withdraw entries
- `"Send Money"` / `"Sendmoney Service Charge"` — P2P entries
- `"Payment"` / `"Payment Service Charge"` — Payment entries
- `"Bank Cash In (Stripe)"` — Stripe cash-in entries (SYSTEM debit + Customer credit)
- `"Admin Deposit to SYSTEM"` / `"Admin Deposit"` — Admin-to-SYSTEM entries
- `"SYSTEM DEPOSIT"` — Initial seed balance for SYSTEM account

**DB Migration for `transaction_type` column:**
```bash
node migrations/add_transaction_type_to_transactions.js
```

### 4.3 Roles Table

| Field  | Type        | Notes                          |
|--------|-------------|--------------------------------|
| `id`   | INTEGER     | PK, Auto-increment             |
| `role` | STRING(20)  | Must exist for user creation   |

### 4.4 Commissions Table

Stores DB-driven fee and commission rules. See [§9 Fee & Commission Structure](#9-fee--commission-structure) for full details.

**DB Migration:**
```bash
node migrations/create_commission_table.js
```

### 4.5 TransactionLimits Table *(new)*

Stores per-role, per-period outgoing transaction limits. Used by `services/limitChecker.js`.

| Field        | Type                    | Notes                                         |
|--------------|-------------------------|-----------------------------------------------|
| `id`         | INTEGER PK              | Auto-increment                                |
| `role`       | VARCHAR(20)             | User role this limit applies to (e.g. `Customer`) |
| `period`     | ENUM('daily','monthly') | Window type: `daily` resets at midnight UTC; `monthly` resets on the 1st |
| `max_amount` | DECIMAL(15,2)           | Maximum cumulative outgoing Tk in the period  |
| `max_count`  | INTEGER                 | Maximum number of outgoing transactions in the period |
| `is_active`  | TINYINT(1)              | `1` = enforced, `0` = disabled (soft-disable without deleting) |
| `createdAt`  | DATETIME                | Auto                                          |
| `updatedAt`  | DATETIME                | Auto                                          |

**Unique constraint:** `(role, period)` — one row per role per period.

**Seeded defaults:**

| role       | period    | max_amount | max_count |
|------------|-----------|------------|-----------|
| `Customer` | `daily`   | 5,000.00   | 10        |
| `Customer` | `monthly` | 50,000.00  | 50        |

**DB Migration:**
```bash
node migrations/create_transaction_limits.js
```

---

## 5. Authentication & Security

### 5.1 Login Flow (OTP-based)

The login process is a **two-step flow** for non-Admin users. Admins and the SYSTEM account bypass OTP entirely.

#### Step 1 — Password Verification (`POST /user/login`)

1. User submits `email` or `phone_number` + `password`.
2. API looks up user by email OR phone_number.
3. Password is compared plain-text.
4. **If role is Admin or phone_number is "SYSTEM":**
   - JWT is issued immediately and returned in the response.
   - No OTP is generated.
5. **If role is Customer, Agent, or Merchant:**
   - A 4-digit random OTP is generated.
   - OTP is stored in `Users.otp` with an expiry of `now + 2 minutes` in `Users.otp_expire`.
   - OTP is **always logged to the server console** (visible to developers).
   - If the user's email ends with `@gmail.com`, the OTP is also **sent by email** via Gmail API.
   - Response: `{ message: "OTP sent to your registered email address", otpRequired: true }` — **no token yet**.

#### Step 2 — OTP Verification (`POST /user/verify-otp`)

1. User submits `identifier` (email or phone_number) + `otp`.
2. API looks up user, checks:
   - `otp` column is not null.
   - Current time is before `otp_expire`.
   - Submitted OTP matches stored OTP string.
3. **If invalid:** returns `401` with error message.
4. **If expired:** clears OTP fields, returns `401` with expiry message.
5. **If valid:**
   - Clears `otp` and `otp_expire` columns (one-time use).
   - Issues and returns a **JWT token**.

```
POST /user/login
  ├── Admin/SYSTEM  ──→  JWT issued immediately  ──→  Frontend stores token
  └── Others        ──→  OTP generated & emailed ──→  Frontend shows OTP input
                                                           │
                                                    POST /user/verify-otp
                                                           │
                                                    JWT issued ──→  Frontend stores token
```

**OTP Properties:**
- Length: 4 digits
- Validity: 2 minutes from generation
- Delivery: Email (Gmail accounts only) + always console-logged
- One-time use: cleared from DB immediately after successful verification

**Frontend login page behaviour:**
- On initial login response with `otpRequired: true`: the form switches to an OTP input field.
- OTP field accepts 4 digits; on submit calls `POST /user/verify-otp`.
- Expired or invalid OTP shows an error and allows the user to go back and re-submit credentials.

### 5.2 JWT Token

- Signed with `ACCESS_TOKEN_SECRET` (from environment variable).
- Payload contains: `{ identifier, role }`.
- Expiry is configurable via `expires_in` environment variable.
- Token must be sent as `Authorization: Bearer <token>` header.

### 5.3 Dual Authentication — Two Middleware Types

| Middleware              | Where Used                    | Extra Requirement         |
|-------------------------|-------------------------------|---------------------------|
| `authenticateJWT`       | All CRUD & transaction routes | JWT + `X-AUTH-SECRET-KEY` header must match `PARTNER_KEY` env var |
| `publicAuthenticateJWT` | Read-only user search routes  | JWT only (no secret key)  |

### 5.4 Session Management (Frontend)

- On **401 Unauthorized** response: localStorage is cleared, cookie is deleted, and user is redirected to `/login`.
- On **403 Forbidden** response: An error message is shown (no redirect — this means insufficient role, not expired token).
- Next.js middleware checks the `token` cookie on every page load; protected routes redirect unauthenticated users to `/login`.
- If a logged-in user visits `/login`, they are redirected to `/profile`.

---

## 6. User Management Module

> All user management operations are restricted to **Admin** role only (except self-registration and login).

### 6.1 Create User

- **Endpoint:** `POST /user/create`
- **Who:** Admin only
- **Required Fields:** `name`, `email`, `password`, `phone_number`, `nid`, `role`
- **Validation Rules:**
  - `name`: 3–50 characters
  - `email`: valid email format, 5–255 characters, must be unique
  - `password`: 4–1024 characters
  - `phone_number`: exactly 11 characters, must be unique
  - `nid`: 7–13 characters
  - `role`: must exist in the Roles table (Admin, Agent, Customer, Merchant)
- **Duplicate Check:** If email or phone_number already exists → HTTP 208 "User already exists"

### 6.2 Update User

- **Endpoints:**
  - `PUT /user/update/:id` — Full update (all fields required)
  - `PATCH /user/update/:id` — Partial update (only provided fields changed)
- **Who:** Admin only
- **Protected Users:** Cannot update any user whose email is `admin@roadtocareer.net`, `admin@dmoney.com`, `system@dmoney.com`, or whose `phone_number` is `"SYSTEM"`.
- **Frontend Profile Edit:** Non-admin users can also patch their own profile (name, email, phone_number, NID) via the Profile page. Role is read-only for non-admins.
- **Email Side-Effects:** When Admin patches `status` to `active` or `suspended`, a notification email is automatically sent to the user's email address (if reachable). See [§6.9](#69-email-notifications).

### 6.3 Delete User

- **Endpoint:** `DELETE /user/delete/:id`
- **Who:** Admin only
- **Protected Users:** Cannot delete system-protected accounts (same list as above).
- **Confirmation:** Frontend shows a confirmation dialog before calling delete.

### 6.4 Search & List Users

| Endpoint                                  | Auth Type        | Description                         |
|-------------------------------------------|------------------|-------------------------------------|
| `GET /user/list?page=&count=&order=`      | publicAuthJWT    | Paginated list with computed balance|
| `GET /user/search/id/:id`                 | publicAuthJWT    | Single user by ID with balance      |
| `GET /user/search/phonenumber/:phone`     | publicAuthJWT    | Single user by phone with balance   |
| `GET /user/search/email/:email`           | publicAuthJWT    | Single user by email with balance   |
| `GET /user/search/:role?page=&limit=`     | authenticateJWT  | Paginated users filtered by role    |

### 6.5 Photo Upload

- **Upload:** `POST /user/upload/:id` — Accepts multipart/form-data image file (field: `image`, max 1MB, images only).
- **Retrieve:** `GET /user/uploads/:file` — Public endpoint, returns the image file.

### 6.6 Change Password

- Any logged-in user can change their own password via `PATCH /user/update/:userId` with `{ password: newPassword }`.
- Password must be at least 4 characters and the two fields (new + confirm) must match (validated on frontend).

---

### 6.7 Self-Registration (Public)

> This is a **public** endpoint — no JWT or secret key required.

- **Endpoint:** `POST /user/register`
- **Who:** Anyone (no authentication needed)
- **Allowed Roles:** `Customer`, `Agent`, `Merchant` — **Admin cannot self-register**
- **Email Restriction:** Only **`@gmail.com`** addresses are accepted. Non-Gmail addresses are rejected with HTTP 400.
- **Required Fields:** `name`, `email`, `password`, `phone_number`, `nid`, `role`
- **Validation Rules:** Same as Create User (Joi schema — name 3–50 chars, email valid format, password min 4, phone exactly 11 digits, nid 7–13 chars)
- **Duplicate Checks:**
  - If email already exists → HTTP 208 `"An account with this email already exists"`
  - If phone_number already exists → HTTP 208 `"An account with this phone number already exists"`
- **Default Status:** `pending` — user **cannot perform transactions** until Admin sets status to `active`
- **Post-Registration Email:** A registration confirmation email is sent automatically to the user's Gmail address. See [§6.9](#69-email-notifications).

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@gmail.com",
  "password": "pass123",
  "phone_number": "01712345678",
  "nid": "1234567890",
  "role": "Customer"
}
```

**Response (201):**
```json
{
  "message": "Registration successful. Your account is pending approval by an admin.",
  "user": {
    "id": 42,
    "name": "John Doe",
    "email": "john.doe@gmail.com",
    "phone_number": "01712345678",
    "role": "Customer",
    "status": "pending"
  }
}
```

**Frontend page:** `/register`
- Accessible without login (public route)
- Shows role descriptions in dropdown: Customer / Agent / Merchant
- Displays an informational banner explaining that account will be `pending` until admin approval
- On success, redirects to `/login` after 3 seconds
- The Login page has a "Register here" link pointing to `/register`

---

### 6.8 Account Status Lifecycle

Every user account has a `status` field that controls transaction eligibility.

#### Status Values

| Status      | Meaning                                                                 | Can Transact? |
|-------------|-------------------------------------------------------------------------|:-------------:|
| `pending`   | Default after self-registration. Waiting for admin approval.            | ❌ No         |
| `active`    | Admin has approved the account. Full transaction access.                | ✅ Yes        |
| `suspended` | Admin has suspended the account. Blocked from all transactions.         | ❌ No         |

#### Status Management Rules

- **Self-registered users** always start as `pending`.
- **Admin-created users** (via `POST /user/create`) also default to `pending` unless `status` is explicitly set.
- **Predefined/seeded system accounts** (Admin, test Agent, test Customer, test Merchant, SYSTEM) are seeded with `active` status.
- Only **Admin** can change the status of any user via `PATCH /user/update/:id` with `{ "status": "active" }`.
- Admin sets status using the **User Profile edit page** (`/admin/users/:userId`) which shows a colour-coded status dropdown:
  - 🟡 **Pending** — awaiting admin approval
  - 🟢 **Active** — can perform transactions
  - 🔴 **Suspended** — blocked from transactions

#### Transaction Status Enforcement (Backend)

All 4 transaction controllers check the status of **both** involved accounts before processing:

| Transaction | `from_account` must be active | `to_account` must be active |
|-------------|:-----------------------------:|:----------------------------:|
| Deposit     | ✅ (Agent)                    | ✅ (Customer)                |
| Withdraw    | ✅ (Customer/Merchant)        | ✅ (Agent)                   |
| Send Money  | ✅ (Sender Customer)          | ✅ (Receiver Customer)       |
| Payment     | ✅ (Customer/Agent)           | ✅ (Merchant)                |

**Error Response (403) when account is not active:**
```json
{ "message": "Your account is not active. Please contact admin." }
```

#### Frontend Status Display

- **Profile page** (`/profile`): Shows a colour-coded **Chip badge** (PENDING / ACTIVE / SUSPENDED) below the Role field. If status is `pending` or `suspended`, a prominent warning/error banner appears at the top of the profile page.
- **Admin user edit page** (`/admin/users/:userId`): Shows a status dropdown that is editable when admin clicks "Edit". Colour dots (🟡🟢🔴) indicate each status visually.

#### DB Migration

To add the `status` column to an existing database, run:
```bash
node migrations/add_status_to_users.js
```

---

### 6.9 Email Notifications

The backend uses the **Gmail API** (via a Google Service Account) to send automated emails. Email delivery is **non-blocking** — a failed email never causes the API request to fail.

**Gmail Restriction:** OTP emails and registration confirmation emails are only sent to `@gmail.com` addresses. Other email domains receive no email but the OTP is always visible in the server console.

| Trigger | Recipient | Subject | Content Summary |
|---------|-----------|---------|-----------------|
| Successful self-registration | New user | "DMoney — Registration Confirmation" | Welcome message with account details; notes that account is pending admin approval |
| Admin sets status → `active` | Affected user | "DMoney — Your Account Has Been Activated" | Informs user they can now log in and use all features |
| Admin sets status → `suspended` | Affected user | "DMoney — Your Account Has Been Suspended" | Informs user their account is suspended; directs to admin for questions |
| Login (non-Admin / non-SYSTEM) | Logging-in user | "DMoney — Your Login OTP" | Contains the 4-digit OTP; valid for 2 minutes |

**Service Implementation:** `services/emailHelper.js` using `googleapis` with a service account JSON key at `config/gmail-service-account.json`.

---

## 7. Transaction Module

All transaction endpoints require **`authenticateJWT`** (JWT Bearer token + `X-AUTH-SECRET-KEY` header).

The account identifiers used in all transactions are **phone numbers**.

Each financial operation creates **multiple ledger entries** (one per affected account) sharing the same `trnxId`. This is a **double/triple-entry bookkeeping** approach.

---

### 7.1 Deposit (Cash-In via Agent)

**Endpoint:** `POST /transaction/deposit`

**Business Rule:** An Agent deposits money into a Customer's account (Cash-In).

**Request Body:**
```json
{
  "from_account": "<agent_phone_number>",
  "to_account": "<customer_phone_number>",
  "amount": 500
}
```

**Pre-conditions:**
1. Both accounts must exist in the system.
2. `from_account` and `to_account` must be different.
3. `from_account` must have the role **Agent** and be `active`.
4. `to_account` (Customer) must be `active`.
5. Agent must have sufficient balance (`currentBalance >= amount`).
6. Amount must be between **10 BDT** (min) and **10,000 BDT** (max).
7. Customer's cumulative balance must not exceed **10,000 BDT** (hard cap). If the requested amount would push the customer's balance over 10,000 BDT, only the remaining headroom is allowed.

**Fee Calculation:**
- Agent commission = `amount × 2.5%`

**Ledger Entries Created:**

| Entry # | `account`      | Description          | `debit`  | `credit`    | `transaction_type` |
|---------|----------------|----------------------|----------|-------------|-------------------|
| 1       | Agent          | Deposit Commission   | `amount` | `commission` | `'Deposit'` |
| 2       | Customer       | Deposit              | 0        | `amount`    | `'Deposit'` |

> **Net effect:** Agent balance decreases by `amount - commission`. Customer balance increases by `amount`.

**Response (201):**
```json
{
  "message": "Deposit successful",
  "trnxId": "TXN123456",
  "commission": 12.5,
  "currentBalance": 4500.00
}
```

---

### 7.2 Withdraw (Cash-Out)

**Endpoint:** `POST /transaction/withdraw`

**Business Rule:** A Customer or Merchant withdraws cash through an Agent.

**Request Body:**
```json
{
  "from_account": "<customer_or_merchant_phone>",
  "to_account": "<agent_phone_number>",
  "amount": 500
}
```

**Pre-conditions:**
1. Both accounts must exist.
2. `from_account` and `to_account` must be different.
3. `from_account` must be **Customer** or **Merchant** and be `active`.
4. `to_account` must be **Agent** and be `active`.
5. Minimum amount: **10 BDT**.
6. Customer/Merchant must have balance ≥ `amount + withdrawFee`.
7. **If `from_account` is Customer:** daily and monthly outgoing limits are checked first (see [§8](#8-customer-transaction-limits)).

**Fee Calculation:**
- `withdrawFee = amount × 1%`, but **minimum fee is 5 BDT**.
- `agentCommission = amount × 2.5%`

**Ledger Entries Created:**

| Entry # | `account`      | Description              | `debit`              | `credit`                   | `transaction_type` |
|---------|----------------|--------------------------|----------------------|----------------------------|--------------------|
| 1       | Customer/Merchant | Withdraw              | `amount + withdrawFee` | 0                        | `'Withdraw'` |
| 2       | Agent          | Withdraw                 | 0                    | `amount + agentCommission` | `'Withdraw'` |
| 3       | SYSTEM         | Withdraw Service Charge  | 0                    | `withdrawFee`              | `'Withdraw'` |

**Response (201):**
```json
{
  "message": "Withdraw successful",
  "trnxId": "TXN123456",
  "fee": 5.00,
  "currentBalance": 1495.00
}
```

---

### 7.3 Send Money (P2P Transfer)

**Endpoint:** `POST /transaction/sendmoney`

**Business Rule:** A Customer sends money directly to another Customer.

**Request Body:**
```json
{
  "from_account": "<sender_phone_number>",
  "to_account": "<receiver_phone_number>",
  "amount": 200
}
```

**Pre-conditions:**
1. Both accounts must exist.
2. `from_account` and `to_account` must be different.
3. **Both** accounts must have the role **Customer** (Agents/Merchants cannot use this feature).
4. Both accounts must be `active`.
5. Minimum amount: **10 BDT**.
6. Sender must have balance ≥ `amount + 5` (amount + fixed fee).
7. **Daily and monthly outgoing limits** are checked first (see [§8](#8-customer-transaction-limits)).

**Fee Calculation:**
- Fixed service fee: **5 BDT** (flat fee regardless of amount)

**Ledger Entries Created:**

| Entry # | `account` | Description              | `debit`      | `credit`  | `transaction_type` |
|---------|-----------|--------------------------|--------------|-----------|-------------------|
| 1       | Sender    | Send Money               | `amount + 5` | 0         | `'SendMoney'` |
| 2       | Receiver  | Send Money               | 0            | `amount`  | `'SendMoney'` |
| 3       | SYSTEM    | Sendmoney Service Charge | 0            | 5         | `'SendMoney'` |

**Response (201):**
```json
{
  "message": "Send money successful",
  "trnxId": "TXN123456",
  "fee": 5,
  "currentBalance": 793.00
}
```

---

### 7.4 Payment

**Endpoint:** `POST /transaction/payment`

**Business Rule:** A Customer or Agent pays a Merchant for goods/services.

**Request Body:**
```json
{
  "from_account": "<customer_or_agent_phone>",
  "to_account": "<merchant_phone_number>",
  "amount": 1000,
  "discount_code": "SAVE10",
  "discount_amount": 10
}
```
> `discount_code` and `discount_amount` are optional.

**Pre-conditions:**
1. Both accounts must exist.
2. `from_account` and `to_account` must be different.
3. `from_account` must be **Customer** or **Agent** and be `active`.
4. `to_account` must be **Merchant** and be `active`.
5. Minimum amount: **10 BDT** (applied after discount).
6. Payer must have balance ≥ `finalAmount + paymentFee`.
7. **If `from_account` is Customer:** daily and monthly outgoing limits are checked first (see [§8](#8-customer-transaction-limits)). Agents are **not** subject to Customer limits.

**Discount Logic:**
- If `discount_code` matches `DISCOUNT_CODE` environment variable AND `discount_amount` is provided:
  - `finalAmount = amount - (amount × discount_amount / 100)`
- Otherwise: `finalAmount = amount`

**Fee Calculation:**
- `paymentFee = finalAmount × 1%`, but **minimum fee is 5 BDT**
- `merchantCommission = finalAmount × 2.5%`

**Ledger Entries Created:**

| Entry # | `account`      | Description              | `debit`                   | `credit`                       | `transaction_type` |
|---------|----------------|--------------------------|---------------------------|--------------------------------|--------------------|
| 1       | Customer/Agent | Payment                  | `finalAmount + paymentFee` | 0                             | `'Payment'` |
| 2       | Merchant       | Payment                  | 0                         | `finalAmount + merchantCommission` | `'Payment'` |
| 3       | SYSTEM         | Payment Service Charge   | 0                         | `paymentFee`                  | `'Payment'` |

**Response (201):**
```json
{
  "message": "Payment successful",
  "trnxId": "TXN123456",
  "fee": 10.00,
  "currentBalance": 890.00,
  "discountedTotal": 900,
  "discountedAmount": 100
}
```
> `discountedTotal` and `discountedAmount` only appear if a discount was applied.

---

### 7.5 Bank Cash-In via Stripe (Customer Only)

This feature allows a **Customer** to fund their DMoney wallet directly using a debit or credit card, bypassing the need for an Agent. The integration uses **Stripe** as the payment processor.

**Who:** Customers only (`role = Customer`, `status = active`)

**Frontend Page:** `/customer/cash-in-bank` — 3-step wizard

**Two-Step Backend Flow:**

#### Step 1 — Create PaymentIntent

**Endpoint:** `POST /transaction/stripe/create-intent`

**Request Body:**
```json
{ "amount": 500 }
```

**Validations:**
1. Authenticated user must be a Customer with `active` status.
2. Amount must be a positive number.
3. Amount must be ≥ `minAmount` (10 BDT) and ≤ `maxAmount` (10,000 BDT) from the Deposit commission config.
4. Customer's current wallet balance must be < 10,000 BDT.
5. Amount must not push the wallet over the 10,000 BDT cap (partial amounts allowed — only the remaining headroom).

**Success Response (200):**
```json
{
  "clientSecret": "pi_xxx_secret_yyy",
  "amount": 500,
  "minAmount": 10,
  "maxAmount": 10000
}
```
> The `clientSecret` is passed to Stripe.js on the frontend to render the card payment form.

#### Step 2 — Confirm Cash-In

**Endpoint:** `POST /transaction/stripe/confirm`

Called by the frontend **after Stripe.js confirms the card payment** successfully.

**Request Body:**
```json
{ "paymentIntentId": "pi_3xxx..." }
```

**Validations / Guards:**
1. Retrieves the PaymentIntent from Stripe API.
2. Verifies `paymentIntent.status === 'succeeded'`.
3. **Anti-spoofing:** Checks `paymentIntent.metadata.customer_phone` matches the authenticated user's phone number.
4. **Idempotency guard:** Checks if a transaction with `trnxId = paymentIntentId` already exists — rejects duplicate processing with HTTP 208.

**Ledger Entries Created:**

| Entry # | `account`    | `from_account` | Description            | `debit` | `credit` | `transaction_type` |
|---------|--------------|----------------|------------------------|---------|----------|-------------------|
| 1       | SYSTEM       | STRIPE         | Bank Cash In (Stripe)  | `amt`   | 0        | `NULL` (legacy) |
| 2       | Customer     | STRIPE         | Bank Cash In (Stripe)  | 0       | `amt`    | `NULL` (legacy) |

> `trnxId` = the Stripe `paymentIntentId` (full traceability back to Stripe dashboard).

**Success Response (201):**
```json
{
  "message": "Cash in successful",
  "trnxId": "pi_3xxx...",
  "amount": 500,
  "currentBalance": 1500.00
}
```

**Frontend 3-Step Wizard:**

| Step | UI | Action |
|------|----|--------|
| 1 — Enter Amount | TextField with min/max hints | Calls `create-intent`; on success moves to Step 2 |
| 2 — Card Payment | Stripe `CardElement` (MUI-styled) | User enters card details; `confirmCardPayment()` called via Stripe.js; on success calls `confirm` |
| 3 — Receipt | Success alert + transaction receipt card | Shows trnxId, amount deposited, current balance; "Make Another Cash In" resets to Step 1 |

**Test Card (Stripe test mode):** `4242 4242 4242 4242` / Any future date / Any 3-digit CVC

---

### 7.6 Admin Deposit to SYSTEM

**Endpoint:** `POST /transaction/adminDeposit`

**Business Rule:** Admin injects funds into the SYSTEM virtual account to top up the platform's liquidity reserve.

**Request Body:**
```json
{
  "from_account": "<admin_phone_number>",
  "to_account": "SYSTEM",
  "amount": 50000
}
```

**Pre-conditions:**
1. `from_account` must exist and have role **Admin**.
2. `to_account` must be the SYSTEM account (`phone_number = 'SYSTEM'`).
3. Amount must be a positive number.
4. No balance checks, no maximum limits.

**Ledger Entries Created:**

| Entry # | `account`      | Description               | `debit` | `credit` |
|---------|----------------|---------------------------|---------|----------|
| 1       | Admin          | Admin Deposit to SYSTEM   | `amt`   | 0        |
| 2       | SYSTEM         | Admin Deposit             | 0       | `amt`    |

**Response (201):**
```json
{
  "message": "Deposit to SYSTEM account successful",
  "trnxId": "TXN123456",
  "amount": 50000
}
```

**Frontend Page:** `/admin/deposit` — Admin-only page accessible from the Admin left menu.

---

## 8. Customer Transaction Limits

Customer outgoing transactions (SendMoney, Payment, Withdraw/CashOut) are subject to **cumulative daily and monthly limits**. These limits are DB-driven and can be changed without a code deployment by updating the `TransactionLimits` table.

### 8.1 Limits (Default / Seeded Values)

| Period    | Max Total Amount | Max Transaction Count |
|-----------|:----------------:|:---------------------:|
| **Daily** | **5,000 Tk**     | **10 transactions**   |
| **Monthly** | **50,000 Tk** | **50 transactions**   |

### 8.2 Scope

| Applies to | Does NOT apply to |
|-----------|-------------------|
| Customer role ONLY | Agent, Merchant, Admin |
| Outgoing: SendMoney, Payment, Withdraw | Incoming: Deposit, Stripe Cash-In |
| Cumulative within the period | Per-transaction amount (no single-txn cap from limits) |

### 8.3 How Limits Are Enforced

The `services/limitChecker.js` service is called **before the balance check** in each applicable controller:

1. Loads all active `TransactionLimits` rows for `role = 'Customer'`.
2. For each limit row (daily + monthly):
   - Queries `Transactions` for `COUNT(DISTINCT trnxId)` and `SUM(debit)` where:
     - `account = customerPhone`
     - `debit > 0`
     - `transaction_type IN ('SendMoney', 'Payment', 'Withdraw')`
     - `createdAt >= periodStart` (today 00:00 UTC for daily; 1st of month 00:00 UTC for monthly)
   - Checks count against `max_count` and `usedAmount + newAmount` against `max_amount`.
3. Returns `{ allowed: true }` or `{ allowed: false, message, details }`.
4. If not allowed → HTTP **400** with a descriptive error message and a `details` payload.

### 8.4 Error Response Format

```json
{
  "message": "Daily amount limit exceeded. You can send at most 2500.00 Tk more this daily period (limit: 5000 Tk, used: 2500.00 Tk).",
  "details": {
    "period": "daily",
    "usedAmount": 2500.00,
    "usedCount": 3,
    "maxAmount": 5000,
    "maxCount": 10,
    "remainingAmount": 2500.00,
    "remainingCount": 7
  }
}
```

### 8.5 Relationship to Deposit Balance Cap

The Customer transaction limits and the deposit wallet balance cap are **independent** rules:

| Rule | Dimension | Enforced in |
|------|-----------|------------|
| Wallet balance cap — 10,000 Tk | Incoming: how much can be *in* the wallet | `deposit.controller.js` + `stripeCashIn.controller.js` |
| Daily outgoing limit — 5,000 Tk / 10 txns | Outgoing: how much can be *sent out* per day | `sendMoney`, `payment`, `withdraw` controllers |
| Monthly outgoing limit — 50,000 Tk / 50 txns | Outgoing: how much can be *sent out* per month | same as above |

---

## 9. Fee & Commission Structure

All fee and commission rules are stored in the **`Commissions`** MySQL table (DB-driven, not hardcoded). Rates can be updated without redeployment.

| Transaction Type | Service Fee (→ SYSTEM) | Agent/Merchant Commission | Min Fee | Min Amount | Max Amount |
|------------------|-----------------------|--------------------------|---------|------------|------------|
| **Deposit**      | N/A                   | 2.5% to Agent            | N/A     | 10 BDT     | 10,000 BDT (customer balance cap) |
| **Withdraw**     | 1% (min 5 BDT)        | 2.5% to Agent            | 5 BDT   | 10 BDT     | —          |
| **Send Money**   | Flat 5 BDT            | N/A                      | 5 BDT   | 10 BDT     | —          |
| **Payment**      | 1% (min 5 BDT)        | 2.5% to Merchant         | 5 BDT   | 10 BDT     | —          |
| **Stripe Cash-In** | N/A (Stripe charges the card) | N/A           | 10 BDT  | 10 BDT     | 10,000 BDT (wallet cap) |
| **Admin Deposit** | N/A                  | N/A                      | N/A     | 1 BDT      | Unlimited  |

**Where fees go:**
- All **service fees** are credited to the **SYSTEM** account.
- **Agent commissions** on Deposit: credited to the Agent's account.
- **Agent commissions** on Withdraw: included in the credit to the Agent's account.
- **Merchant commissions** on Payment: included in the credit to the Merchant's account.

---

## 10. Balance Calculation

A user's balance is **not stored** as a column in the Users table. It is **computed on-the-fly** using:

```sql
SELECT COALESCE(SUM(credit) - SUM(debit), 0) AS Balance
FROM Transactions
WHERE account = '<phone_number>'
```

**SYSTEM account** is seeded with an initial balance of **10,000,000 BDT** (10 million) via the seed transaction:
```
trnxId: TRNX1001, from: SUPER_USER, to: SYSTEM, credit: 10,000,000
```

This means the SYSTEM account effectively acts as the platform's liquidity reserve and earns all service fees over time.

**Customer Deposit Cap Logic:**
- When an Agent attempts a deposit, the system checks `current_customer_balance >= 10,000`.
- If yes → rejected with "Limit exceeded".
- If no → only the remaining headroom (`10,000 - current_balance`) is allowed per deposit.

---

## 11. Transaction Inquiry Module

### 11.1 List All Transactions (Admin)

- **Endpoint:** `GET /transaction/list?page=&count=`
- **Returns:** Paginated list of all transactions, ordered by `createdAt DESC`.

### 11.2 Search Transaction by ID

- **Endpoint:** `GET /transaction/search/:trnxId`
- **Returns:** All ledger entries sharing the same `trnxId` (typically 2–3 records per operation).

### 11.3 Account Statement (Self-Statement)

- **Endpoint:** `GET /transaction/statement/:account?page=&count=`
- **Returns:** All transactions where `account = phone_number`, ordered `createdAt DESC`.
- **Frontend Enhancement:** The UI fetches up to 10,000 records and performs **client-side date range filtering** (From Date / To Date, defaulting to today).
- **Running Balance:** The UI calculates a rolling running balance per row, showing how the balance evolved over time.

### 11.4 Transaction Limit

- **Endpoint:** `GET /transaction/limit/:account`
- **Logic:** `10,000 - (total_credits_from_Deposit - total_debits_from_Withdraw)`
- **Returns:** Remaining deposit capacity for a customer (the 10,000 BDT wallet cap).

### 11.5 Account Balance

- **Endpoint:** `GET /transaction/balance/:account`
- **Returns:** Current balance computed via `getBalance()` function.

---

## 12. Frontend UI — Role-Based Navigation

After login, the user lands on `/profile`. The left sidebar menu adapts based on the user's role stored in `localStorage`.

### Admin Menu
| Menu Item         | Route                     | Feature                                |
|-------------------|---------------------------|----------------------------------------|
| User List         | `/admin/users`            | Paginated user list with search/filter |
| Create User       | `/admin/users/create`     | Create new user form                   |
| Transaction List  | `/admin/transactions`     | Paginated all-transactions view        |
| Deposit to SYSTEM | `/admin/deposit`          | Admin funds the SYSTEM account         |

### Agent Menu
| Menu Item      | Route                    | Feature                                    |
|----------------|--------------------------|--------------------------------------------|
| Cash In        | `/agent/cash-in`         | Deposit to a Customer's account            |
| Payment        | `/agent/payment`         | Pay a Merchant                             |
| Self Statement | `/agent/self-statement`  | Own transaction history with date filter   |

### Customer Menu
| Menu Item      | Route                          | Feature                                       |
|----------------|--------------------------------|-----------------------------------------------|
| Cash In (Bank) | `/customer/cash-in-bank`       | Deposit via bank card (Stripe) — 3-step wizard |
| Send Money     | `/customer/send-money`         | Transfer to another Customer                  |
| Cash Out       | `/customer/cash-out`           | Withdraw through an Agent                     |
| Payment        | `/customer/payment`            | Pay a Merchant                                |
| Self Statement | `/customer/self-statement`     | Own transaction history with date filter      |

### Merchant Menu
| Menu Item      | Route                        | Feature                                    |
|----------------|------------------------------|--------------------------------------------|
| Cash Out       | `/merchant/cash-out`         | Withdraw through an Agent                  |
| Self Statement | `/merchant/self-statement`   | Own transaction history with date filter   |

### Common Pages (All Roles)
| Page              | Route               | Feature                                         |
|-------------------|---------------------|-------------------------------------------------|
| Profile           | `/profile`          | View and edit own profile; view balance (read-only); status badge |
| Change Password   | `/change-password`  | Update own password (min 4 chars)               |

### Login Page — Two-Phase UI
The `/login` page handles both login phases:
1. **Phase 1:** Email/phone + password fields → Submit → calls `POST /user/login`
2. **Phase 2 (non-Admin):** On `otpRequired: true` response, the form transitions to show an OTP input → Submit → calls `POST /user/verify-otp` → on success stores token, redirects to `/profile`
3. Admin users skip Phase 2 entirely — token returned immediately after Phase 1.

### User List — Admin Features
- Searchable by: **ID**, **Phone Number**, **Email**, **Role**
- Paginated with configurable rows per page (default 10)
- Actions per user: **View** (opens editable profile) | **Delete** (with confirmation dialog)
- Admin can **edit user role and status** from the user detail page (`/admin/users/:userId`)

### Self Statement — All Roles
- Displays: Transaction ID, From Account, To Account, Description, Debit, Credit, Running Balance, Date
- Date range filter (From Date → To Date), defaults to today
- Running balance is calculated client-side starting from the opening balance before the filter period

---

## 13. API Endpoints Reference

### User Endpoints

| Method   | Endpoint                              | Auth            | Notes |
|----------|---------------------------------------|-----------------|-------|
| POST     | `/user/register`                      | **None**        | Gmail only; Customer/Agent/Merchant; status=pending |
| POST     | `/user/login`                         | None            | Returns `otpRequired:true` for non-Admin |
| POST     | `/user/verify-otp`                    | None            | Completes OTP verification; returns JWT |
| GET      | `/user/list`                          | publicJWT       | Paginated user list with balance |
| GET      | `/user/search/id/:id`                 | publicJWT       | Single user by ID |
| GET      | `/user/search/phonenumber/:phone`     | publicJWT       | Single user by phone |
| GET      | `/user/search/email/:email`           | publicJWT       | Single user by email |
| GET      | `/user/search/:role`                  | JWT + SecretKey | Paginated users by role |
| POST     | `/user/create`                        | JWT + SecretKey | Admin only |
| PUT      | `/user/update/:id`                    | JWT + SecretKey | Admin only — full update |
| PATCH    | `/user/update/:id`                    | JWT + SecretKey | Admin only — partial update; triggers email on status change |
| DELETE   | `/user/delete/:id`                    | JWT + SecretKey | Admin only |
| POST     | `/user/upload/:id`                    | None            | Photo upload (multipart) |
| GET      | `/user/uploads/:file`                 | None            | Public — serves photo file |

### Transaction Endpoints

| Method | Endpoint                                | Auth            | Notes |
|--------|-----------------------------------------|-----------------|-------|
| GET    | `/transaction/list`                     | JWT + SecretKey | Paginated all transactions |
| GET    | `/transaction/search/:trnxId`           | JWT + SecretKey | All ledger rows for one trnxId |
| GET    | `/transaction/statement/:account`       | JWT + SecretKey | Account statement |
| GET    | `/transaction/limit/:account`           | JWT + SecretKey | Remaining deposit capacity |
| GET    | `/transaction/balance/:account`         | JWT + SecretKey | Current account balance |
| POST   | `/transaction/deposit`                  | JWT + SecretKey | Agent → Customer cash-in |
| POST   | `/transaction/withdraw`                 | JWT + SecretKey | Customer/Merchant → Agent cash-out |
| POST   | `/transaction/sendmoney`                | JWT + SecretKey | Customer → Customer P2P |
| POST   | `/transaction/payment`                  | JWT + SecretKey | Customer/Agent → Merchant |
| POST   | `/transaction/adminDeposit`             | JWT + SecretKey | Admin → SYSTEM fund top-up |
| POST   | `/transaction/stripe/create-intent`     | JWT + SecretKey | Customer: create Stripe PaymentIntent |
| POST   | `/transaction/stripe/confirm`           | JWT + SecretKey | Customer: confirm Stripe payment & credit wallet |

### Swagger Documentation
- User API: `GET /api-docs/user`
- Transaction API: `GET /api-docs/transaction`

---

## 14. System Constraints & Validation Rules

### User Validation (Joi)
| Field          | Rule                                                         |
|----------------|--------------------------------------------------------------|
| `name`         | Required, string, 3–50 characters                           |
| `email`        | Required, valid email format, 5–255 chars, unique           |
| `email` (self-register) | Must end with `@gmail.com`                       |
| `password`     | Required, 4–1024 characters                                 |
| `phone_number` | Required, exactly 11 characters, unique                     |
| `nid`          | Required, 7–13 characters                                   |
| `role`         | Required, must exist in Roles table                         |
| `role` (self-register) | Must be Customer, Agent, or Merchant (not Admin)  |

### Transaction Constraints

| Rule                                              | Value                                |
|---------------------------------------------------|--------------------------------------|
| Minimum transaction amount (all types)            | 10 BDT                               |
| Maximum single deposit (Agent→Customer)           | 10,000 BDT                           |
| Customer wallet balance cap                       | 10,000 BDT                           |
| Minimum withdraw fee                              | 5 BDT                                |
| Send Money fixed fee                              | 5 BDT (flat)                         |
| Minimum payment fee                               | 5 BDT                                |
| Customer daily outgoing limit — amount            | 5,000 BDT                            |
| Customer daily outgoing limit — count             | 10 transactions                      |
| Customer monthly outgoing limit — amount          | 50,000 BDT                           |
| Customer monthly outgoing limit — count           | 50 transactions                      |
| `from_account` == `to_account`                    | Not allowed                          |
| Both accounts must exist                          | Required                             |
| Both accounts must have `status = active`         | Required for all 4 transaction types |
| Agent balance must cover deposit amount           | Required                             |
| Customer/Merchant balance ≥ amount + fee          | Required for withdraw/payment/sendmoney |

### OTP Constraints
| Rule                        | Value                                  |
|-----------------------------|----------------------------------------|
| OTP length                  | 4 digits                               |
| OTP validity window         | 2 minutes from generation              |
| OTP delivery (Gmail only)   | Email via Gmail API                    |
| OTP delivery (non-Gmail)    | Console only (no email sent)           |
| OTP bypass                  | Admin role and SYSTEM account only     |
| OTP re-use                  | Not allowed — cleared on first use     |

### Login Constraints
- Must provide either `email` or `phone_number` plus `password`.
- Password comparison is plain-text (no hashing currently implemented).

---

## 15. Error Handling & HTTP Status Codes

| Status Code | Meaning                                          | Example Scenario                                   |
|-------------|--------------------------------------------------|----------------------------------------------------|
| 200         | OK — Success (read)                             | User found, list returned, OTP sent                |
| 201         | Created — Success (write)                       | Transaction completed, user created                |
| 208         | Already Reported — Soft failure                 | Duplicate user, insufficient balance, limit exceeded (deposit), already processed (Stripe) |
| 400         | Bad Request — Validation / business rule error  | Invalid role, same from/to account, min amount violated, **Customer outgoing limit exceeded**, OTP verification failed, invalid amount |
| 401         | Unauthorized — Auth failure                     | No token, wrong password, token expired (→ auto-logout), expired OTP, invalid OTP |
| 403         | Forbidden — Permission denied                   | Token invalid, non-admin action, attempt to modify system account, Stripe PI ownership mismatch |
| 404         | Not Found                                       | User/transaction not found, account not found      |
| 500         | Internal Server Error                           | Database error, Stripe API error                   |

> **Note on HTTP 208:** The system uses `208 Already Reported` for "soft" business rule failures such as insufficient balance, wallet cap exceeded, or duplicate Stripe payments. This is unconventional (RFC 5842 defines 208 for WebDAV) but is the established pattern throughout this codebase. Customer **daily/monthly outgoing limit** errors use **HTTP 400** instead, since those are considered hard validation errors.

---

## 16. Protected / System Accounts

The following accounts are **immutable** — they cannot be updated or deleted by any Admin:

| Account                    | Role   | Purpose                                          |
|----------------------------|--------|--------------------------------------------------|
| `email: system@dmoney.com` | Agent  | The SYSTEM virtual account — collects all fees   |
| `phone_number: SYSTEM`     | Agent  | Phone identifier for the SYSTEM account          |
| `email: admin@dmoney.com`  | Admin  | Default Admin account                            |
| `email: admin@roadtocareer.net` | Admin | Secondary protected Admin account            |

**Pre-seeded Test Accounts:**

| Name            | Email                    | Phone         | Role     | Password |
|-----------------|--------------------------|---------------|----------|----------|
| Admin           | admin@dmoney.com         | 01686606909   | Admin    | 1234     |
| Test Agent      | agent@dmoney.com         | 01686606901   | Agent    | 1234     |
| Test Customer 1 | customer1@dmoney.com     | 01686606902   | Customer | 1234     |
| Test Customer 2 | customer2@dmoney.com     | 01686606903   | Customer | 1234     |
| Test Merchant   | merchant@dmoney.com      | 01686606905   | Merchant | 1234     |
| SYSTEM          | system@dmoney.com        | SYSTEM        | Agent    | 1234     |

> **Note:** The pre-seeded test accounts use non-Gmail emails. Their OTPs (if login is attempted) will only appear in the server console — no email will be sent.

---

*End of Document — Version 1.2*