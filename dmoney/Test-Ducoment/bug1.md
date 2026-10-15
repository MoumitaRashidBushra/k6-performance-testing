# Deposit (Cash-In) — Bug Findings

*All findings below are Confirmed — reproduced via live API/DB testing. Items examined and cleared as not-bugs are listed separately at the end.*

---

### 1. Agent commission isn't deducted from any account — **Confirmed**

**Module:** Deposit (Agent → Customer)

**Steps to Reproduce:**
1. Log in as an Agent.
2. Deposit an amount to an active Customer.
3. Check the resulting transaction records for the deposit.

**Expected Result:** Total amount debited across accounts should equal total amount credited.

**Actual Result:** The agent's commission is credited to the agent but never debited from any account — the transaction doesn't balance.

**Evidence:** `deposit.controller.js:219-238`. Verified live against the `Transactions` table — commission credit has no matching debit. Same pattern also present in Withdraw (`withdraw.controller.js:104-133`).

---

### 2. Deposit limit shows an incorrect remaining amount — **Confirmed**

**Module:** Deposit (Cash-In) — remaining limit check

**Steps to Reproduce:**
1. Check an account's current balance.
2. Check the same account's remaining deposit limit.

**Expected Result:** Remaining limit should equal 10,000 minus the current balance.

**Actual Result:** Remaining limit is much higher than it should be (test case: balance 5970.5, expected limit 4029.5, actual limit returned 9285).

**Evidence:** `transactionDetails.controller.js:102-121`. Verified live via `GET /transaction/balance` and `GET /transaction/limit` on the same account.

---

### 3. Wallet cap can be exceeded via simultaneous cash-ins — **Confirmed**

**Module:** Deposit (Cash-In) via Stripe

**Steps to Reproduce:**
1. As a Customer with headroom under the 10,000 BDT wallet cap, start two Stripe cash-in payments at the same time, each within the remaining limit on its own.
2. Confirm both payments.

**Expected Result:** The second confirmation should be blocked once the combined total would exceed the cap.

**Actual Result:** Both confirmations succeed, pushing the wallet balance above the cap.

**Evidence:** `stripeCashIn.controller.js:70-85`, `:125-210` — cap is checked once, before payment, and never re-checked at confirmation. Reproduced live: test account balance 1449.5 (headroom 8550.5), two concurrent 5000 BDT cash-ins both returned `201 Cash in successful`, final balance 11449.5 — cap exceeded by 1449.5 BDT.

---

### 4. Stripe cash-in rejects amounts within the app's own advertised range — **Confirmed**

**Module:** Deposit (Cash-In) via Stripe

**Steps to Reproduce:**
1. As a Customer, call the create-intent step of the Stripe cash-in flow with an amount between 10 and 61 BDT (the app's own stated minimum is 10 BDT).
2. Try the same call with an amount of 62 BDT or higher.

**Expected Result:** Any amount from 10–10,000 BDT (the range the app itself validates and advertises) should be accepted, or — if a real floor exists below that — the app should reject it with the same clean validation error it uses for its own min/max checks.

**Actual Result:** Amounts from 10–61 BDT fail with an unhandled `500` error exposing Stripe's raw internal message; only 62 BDT and above succeed.

**Evidence:** `stripeCashIn.controller.js` — the app's own min/max check (`amt < minAmount`, minAmount = 10) passes for these amounts, but the subsequent `stripe.paymentIntents.create()` call throws, and the generic `catch` block returns it as `500 { message: "Failed to create payment intent", error: error.message }`. Reproduced live against the Stripe test API for every amount 10–100:
```
amount=10  -> 500 "Amount must convert to at least 50 cents. ৳10.00 converts to approximately $0.08."
amount=61  -> 500 "Amount must convert to at least 50 cents. ৳61.00 converts to approximately $0.49."
amount=62  -> 200 OK (clientSecret issued)
```

---

### 5. Duplicate Stripe confirmation isn't handled as an error — **Confirmed**

**Module:** Deposit (Cash-In) via Stripe

**Steps to Reproduce:**
1. Trigger the deposit-confirmation step for a Stripe cash-in payment.
2. Trigger the confirmation step again using the same payment.

**Expected Result:** The second confirmation should show an error indicating the payment was already processed.

**Actual Result:** Live-observed: on the second confirmation, the app proceeds as if the cash-in were done, but no message is shown to the user at all — no success confirmation, no error.

**Evidence:** `cash-in-bank/page.tsx:238-258` — `handlePaymentSuccess` never checks `response.status` before proceeding. Backend confirmed live: calling `/transaction/stripe/confirm` again with an already-processed `paymentIntentId` returns `208 { "message": "This payment has already been processed" }`, with no `trnxId`/`currentBalance` fields. The frontend has no branch for this response shape, so nothing meaningful is shown to the user either way.

---

### Examined and cleared — not a bug

**Agent Commission not applying `min_fee`.** `deposit.controller.js:170` computes commission as a raw `rate * amount`, bypassing `Commission.calcFee()` — confirmed live (set `min_fee=5.00`, deposit returned `commission: 1.25`, not 5.00). Initially flagged as a defect on the assumption that Agent Commission should respect a configured floor like other fees do. Checked against the BRD (`dmoney-web-react/README.md` §9, Fee & Commission Structure table): **Min Fee is documented as N/A for Deposit**, and for Withdraw/Payment the Min Fee column corresponds to the Service Fee, not the Agent/Merchant Commission. There is no business requirement that Agent Commission should ever have a floor — `min_fee` is scoped to Service Fees only by design. Not a bug.

**Deposit receipt not showing the Agent's earned commission.** `cash-in/page.tsx:175` hardcodes the "Service Fee" tile to ৳0.00 (technically correct — Deposit has no service fee) and never displays the commission the API actually returns. Reviewed and confirmed not a bug — nothing shown is factually wrong, and there's no requirement that this screen must surface commission.

**Cash-in payment screen getting stuck after a failed confirmation.** Traced from `cash-in-bank/page.tsx`'s `PaymentForm.loading` state. Reviewed and confirmed not a bug.
