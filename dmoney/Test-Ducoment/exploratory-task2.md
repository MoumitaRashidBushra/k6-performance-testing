# dMoney Transaction Limit Structures

---

## 1. Transaction Limit Summary Table

**a) Per-Transaction Limits** (checked on every individual transaction, regardless of role)

| Transaction Type | Minimum Amount | Maximum Amount |
|---|---|---|
| Send Money | 10 Tk | — |
| Withdraw | 10 Tk | — |
| Payment | 10 Tk | — |
| Deposit — Agent to Customer | 10 Tk | 10,000 Tk |
| Bank Cash-In (Stripe) | 10 Tk | 10,000 Tk |

**b) Cumulative Outgoing Limits — Customer role only** (Send Money, Withdraw, Payment combined; independent of the per-transaction limits above)

| Period | Max Amount | Max Transaction Count |
|---|---|---|
| Daily | 5,000 Tk | 10 |
| Monthly | 50,000 Tk | 50 |

**c) Wallet Balance Cap** (independent of both tables above — caps the customer's total live balance rather than a single transaction or period)

| Applies To | Cap |
|---|---|
| Deposit — Agent to Customer, Bank Cash-In (Stripe) | Customer's total wallet balance must not exceed 10,000 Tk |

---

## 2. Special Limit Behavior

- The daily/monthly limit applies only when the **sending/paying** account's role is Customer, and only to Send Money, Withdraw, and Payment — a Merchant withdrawing or an Agent paying a Merchant is not subject to this cap.
- The daily/monthly amount used for comparison is the full debit (transfer or withdrawal amount plus any applicable fee), not the transfer amount alone.
- Within a period, the transaction-count cap is checked before the cumulative-amount cap.
- Daily and monthly limits are evaluated independently and both must pass — failing either one blocks the transaction.
- The daily/monthly limit check runs before the minimum-amount check, which in turn runs before the balance-sufficiency check.
- The 10,000 Tk wallet balance cap (Deposit/Bank Cash-In) is an independent system from the daily/monthly outgoing limits — it caps the customer's total live balance rather than a period's cumulative activity, and applies only to incoming funds.
- A daily/monthly limit violation on Send Money, Withdraw, or Payment returns HTTP 400; a wallet-cap violation on Deposit or Bank Cash-In returns HTTP 208, the same soft-failure code used for insufficient balance.
- If no active daily/monthly limit rows exist for a role, the limit check is skipped and the transaction proceeds.
- A limit row can be soft-disabled without deletion via an active/inactive flag.

---

## 3. Transaction Limit Gaps

- Send Money, Withdraw, and Payment have no per-transaction maximum amount configured — only a minimum — so a single transaction can consume an entire daily or monthly quota at once.
- The remaining-wallet-headroom figure shown to users is calculated on a narrower basis (only transactions labeled "Deposit"/"Withdraw") than the customer's actual live balance enforced at the time of a Deposit or Bank Cash-In (Stripe) transaction — the two can disagree, so the reported remaining capacity may not match what can actually be deposited.
- No daily/monthly or per-transaction limit configuration exists for Agent, Merchant, or Admin roles on any transaction type.
