# EasyPay — Acceptance Criteria

## Feature 1: Merchant and Utility Bill Payment

### Scope Summary
Feature 1 covers two payment types — merchant and utility bill payments — with different fee/cashback treatment. Core promise: merchant payments always incur a 1%-or-5-TK-minimum service charge and may earn tiered cashback (10% above 5,000 TK, 20% above 10,000 TK, capped at 3,000 TK); utility payments never earn cashback. The requirement is silent on whether utility payments carry any service charge — flagged as an open question rather than assumed.

### Acceptance Criteria

- An EasyPay user can successfully pay merchant bills through the application.
- For merchant payments, the service charge is the greater of 1% of the transaction amount or 5 TK.
- A merchant payment of exactly 5,000 TK or less receives no cashback.
- A merchant payment of more than 5,000 TK and up to 10,000 TK receives 10% cashback.
- A merchant payment of more than 10,000 TK receives 20% cashback, with a maximum cashback limit of 3,000 TK.
- An EasyPay user can successfully pay utility bills through the application.
- No cashback is provided for utility bill payments, regardless of the transaction amount.

**Open question:** the requirement doesn't state whether the 1%/5 TK service charge applies to utility bill payments at all — needs clarification before writing a bullet or test case for utility-payment fees.

## Feature 2: Loan Management

### Scope Summary
Feature 2 lets a low-balance EasyPay user borrow up to 20,000 TK, distinguishes an interest-free repayment window (30 days) from a daily-compounding interest phase once that window lapses, and gates re-application on partial repayment of an existing loan. Key decision points: balance-based eligibility gate, loan amount ceiling, the 30-day interest-free cutoff, the daily-compound interest calculation applied afterward, and the 50%-repaid threshold for re-application.

### Acceptance Criteria

- A user is permitted to apply for a loan only when their current balance is below 100 TK.
- The maximum loan amount a user can apply for is 20,000 TK.
- If the loan is fully repaid within 30 days from the loan initiation date, no interest is charged.
- If any outstanding loan amount remains after 30 days, the system applies 1.8% daily compound interest to the remaining unpaid amount.
- A user becomes eligible to apply for another loan after repaying at least 50% of the outstanding loan amount.

### Open Questions

- Is the balance-below-100-TK threshold strictly exclusive — does a balance of exactly 100 TK qualify or not?
- Is there a stated minimum loan amount, or can a user apply for any amount up to 20,000 TK with no floor?
- Can a user hold multiple simultaneous outstanding loans, or is only one outstanding loan allowed at a time?
- Is the below-100-TK balance eligibility re-checked at any point after disbursement, or is it evaluated only at the moment of application?

## Feature 1: Test Cases

All cases are positive/functional. No negative/invalid-input cases were written: the requirement and agreed acceptance criteria define no validation rules (no min/max amount, no rejection condition), so any such case would invent an unstated rule. The two exact-boundary cases (TC-003, TC-005) are kept deliberately — they test the exclusivity of "more than X TK" at the tier edges (an off-by-one `>=` vs `>` bug would pass every other case and fail only these).

| Test Case ID | Test Case Title | Expected Result |
|---|---|---|
| **TC-001** | Verify merchant payment with percentage-based service charge and no cashback below the cashback threshold | Payment of **3,000 TK** is accepted. Service charge = **30 TK** (1% of 3,000, above the 5 TK floor). Cashback = **0 TK** (amount ≤ 5,000 TK). |
| **TC-002** | Verify minimum 5 TK service charge applies when 1% of the amount is below the floor | Payment of **300 TK** is accepted. 1% of 300 = 3 TK, below the 5 TK minimum, so service charge is forced to **5 TK**. Cashback = **0 TK**. |
| **TC-003** | Verify a merchant payment of exactly 5,000 TK receives no cashback (boundary) | Payment of **5,000 TK** is accepted. Service charge = **50 TK**. Cashback = **0 TK** — "more than 5,000 TK" excludes the exact boundary value. |
| **TC-004** | Verify a merchant payment above 5,000 TK receives 10% cashback | Payment of **7,000 TK** is accepted. Service charge = **70 TK**. Cashback = **700 TK** (10% of 7,000). |
| **TC-005** | Verify a merchant payment of exactly 10,000 TK still receives 10% cashback, not 20% (boundary) | Payment of **10,000 TK** is accepted. Service charge = **100 TK**. Cashback = **1,000 TK** (10%) — the 20% tier only applies strictly above 10,000 TK. |
| **TC-006** | Verify a merchant payment above 10,000 TK receives 20% cashback when under the cap | Payment of **12,000 TK** is accepted. Service charge = **120 TK**. Cashback = **2,400 TK** (20% of 12,000, below the 3,000 TK cap). |
| **TC-007** | Verify cashback is capped at 3,000 TK when 20% of the amount would exceed the cap | Payment of **20,000 TK** is accepted. Service charge = **200 TK**. Calculated cashback of 4,000 TK (20% of 20,000) is capped — actual cashback credited = **3,000 TK**. |
| **TC-008** | Verify a utility bill payment succeeds with no cashback | Utility payment of **2,000 TK** is accepted. Cashback = **0 TK**. (Service charge value not asserted — open question, see below.) |

## Feature 2: Test Cases

All cases are positive/functional except TC-008, which is negative. Boundary cases: TC-002, TC-003, TC-005, TC-006, TC-009 (exact threshold/ceiling/day/percentage edges — kept deliberately; an off-by-one `<=` vs `<` bug would pass every mid-range case and fail only these). TC-002 and TC-004 additionally rest on inferred assumptions tied to the open questions in the Feature 2 Acceptance Criteria section above (100 TK exclusivity, and rejection behavior above the 20,000 TK ceiling) — flagged in their Expected Result rather than asserted as fact.

| Test Case ID | Test Case Title | Expected Result |
|---|---|---|
| **TC-001** | Verify a user with balance below 100 TK can apply for a loan within the 20,000 TK ceiling | User with balance **80 TK** applies for a loan of **15,000 TK**. Application is **approved**; loan is disbursed at 15,000 TK. |
| **TC-002** | Verify a user with balance of exactly 100 TK is rejected (boundary) | User with balance **exactly 100 TK** applies for a loan of **10,000 TK**. Application is **rejected** — assumes "below 100 TK" is strictly exclusive (open question: exclusivity at exactly 100 TK is unconfirmed); if the intended rule is inclusive, this expected result is invalid. |
| **TC-003** | Verify a loan application for exactly 20,000 TK (the stated ceiling) is approved (boundary) | User with balance **80 TK** applies for **exactly 20,000 TK**. Application is **approved**; loan disbursed at 20,000 TK. |
| **TC-004** | Verify a loan application above the 20,000 TK ceiling is rejected or capped (boundary) | User with balance **80 TK** applies for **20,001 TK**. Application is **rejected** (or capped to 20,000 TK) — inference from "up to 20,000 TK" phrasing; the requirement doesn't explicitly state rejection behavior above the ceiling, so hard-reject vs. cap is unconfirmed. |
| **TC-005** | Verify full repayment on exactly day 30 incurs zero interest (boundary) | Loan of **20,000 TK** initiated on Day 0 is fully repaid on **Day 30**. Interest charged = **0 TK** — Day 30 itself falls inside the interest-free window. |
| **TC-006** | Verify 1.8% daily compound interest is applied to outstanding balance one day past the interest-free window (boundary) | Loan with **10,000 TK** outstanding remains unpaid at **Day 31**. System applies 1.8% interest: 10,000 × 1.8% = **180 TK**. New outstanding balance = **10,180 TK**. |
| **TC-007** | Verify interest compounds day-over-day rather than applying as flat/simple interest | Same **10,000 TK** outstanding loan remains unpaid through **Day 32** (2 days past the window). Day 31: 10,000 → **10,180 TK**. Day 32: 10,180 × 1.8% = 183.24 → **10,363.24 TK**. Must differ from flat/simple interest, which would give 10,000 + (2 × 180) = **10,360.00 TK** — a system returning 10,360.00 indicates a simple-interest bug instead of compound. |
| **TC-008** | Verify a user who has repaid less than 50% of an outstanding loan is rejected for a new loan | User has an outstanding loan of **20,000 TK** and has repaid **9,000 TK** (45%). User applies for a new loan. Application is **rejected** — repayment is below the 50% eligibility threshold. |
| **TC-009** | Verify a user who has repaid exactly 50% of an outstanding loan is approved for a new loan (boundary) | User has an outstanding loan of **20,000 TK** and has repaid **exactly 10,000 TK** (50%). User applies for a new loan. Application is **approved** — "at least 50%" is inclusive of the exact 50% value. |
