# dMoney Transaction Commission Structures

---

## 1. Commission Summary Table

| Transaction Type | Flow | Commission/Fee Name | Fee Type | Rate | Minimum Fee | Paid By | Received By |
|---|---|---|---|---|---|---|---|
| Deposit | Platform → Agent | — | — | — | — | — | — |
| Deposit | Agent → Customer | Agent Commission | Percentage | 2.5% | — | Platform | Agent |
| Withdraw | Customer/Merchant → Agent | Service Fee | Percentage | 1% | 5 BDT | Customer/Merchant | Platform |
| Withdraw | Customer/Merchant → Agent | Agent Commission | Percentage | 2.5% | — | Platform | Agent |
| Send Money | Customer → Customer | Service Fee | Flat | 5 BDT | — | Sender | Platform |
| Payment | Customer/Agent → Merchant | Service Fee | Percentage | 1% | 5 BDT | Payer | Platform |
| Payment | Customer/Agent → Merchant | Merchant Commission | Percentage | 2.5% | — | — | Not applied |
| Admin Deposit | Admin → Platform | — | — | — | — | — | — |
| Bank Cash-In (Stripe) | Bank → Customer Wallet | — | — | — | — | — | — |

---

## 2. Special Commission Behavior

- **Deposit (Agent → Customer):** Commission is added on top of the deposit, not deducted from it — the Customer always receives the full amount.
- **Withdraw:** Two commission components apply to the same transaction — a Service Fee and an Agent Commission.
- **Send Money:** The only transaction type using a flat fee instead of a percentage-based fee.
- **Payment:** The Service Fee is calculated on the final payable amount (after any discount), not the original amount.
- **Deposit (Platform → Agent), Admin Deposit, Bank Cash-In:** No commission rule applies to these transaction types.

---

## 3. Commission Gaps

- Merchant Commission is configured (2.5%) but is not applied — Merchants receive no commission on Payment transactions.
- No commission rule exists for Admin Deposit.
- No commission rule exists for Bank Cash-In (Stripe).
- No maximum fee ceiling is implemented — percentage-based fees have a minimum floor but no upper limit.
