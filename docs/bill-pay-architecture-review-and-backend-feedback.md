# Villeto Bill Pay, Recurring Obligations, Corporate Cards & Spend Reconciliation — Architecture Review & Backend Feedback

**Date:** 2026-11-19  
**Reviewed Modules:**
- `src/app/(dashboard)/bill-pay/*` (`page.tsx`, `[id]/page.tsx`, `add/page.tsx`, `add-recurring/page.tsx`, `recurring/[id]/page.tsx`, `recurring-card-subscriptions/[id]/page.tsx`, `payments/*`, `mailbox/*`, `settings/*`)
- `src/components/bill-pay/*` (`StandardBillsTable.tsx`, `RecurringBillsTable.tsx`, `RecurringCardSubscriptionsTable.tsx`, `RecurringBillForm.tsx`)
- `src/queries/bill-pay/*` (`invoices.ts`, `recurring.ts`, `recurring-card.ts`, `payments.ts`, `payment-requests.ts`, `bank-transactions.ts`)
- `src/app/(dashboard)/expenses/page.tsx` & `src/components/dashboard/sidebar/sidebar-constants.tsx`

---

## 1. Executive Summary: Current State vs. Target Architecture

Villeto already has strong foundational AP primitives on both the API contract and frontend:
- Multi-entity scoping via workspace selectors.
- Payment Request allocations with `Idempotency-Key` headers (`src/queries/bill-pay/payment-requests.ts`).
- Separate payment lifecycle endpoints (`submit`, `authorize`, `reject`, `schedule`, `initiate`, `record-external`) and bank transaction matching/reconciliation hooks (`src/queries/bill-pay/payments.ts`, `bank-transactions.ts`).
- Basic invoice intake, mailbox ingestion, recurring schedule profiles/occurrences, and draft card subscriptions.

However, comparing the current implementation to industry benchmarks (**Ramp, Brex, BILL, Airbase, NetSuite, Oracle Fusion, SAP, Coupa**) and Villeto's target operational model reveals **7 critical architectural gaps**:

### Gap 1: Corporate Card Logic & Company Expenses Integration
- **Current state:** `/cards` and `/expenses/card-transactions` are `comingSoon: true` in `sidebar-constants.tsx`. `RecurringCardSubscription` (`src/queries/bill-pay/recurring-card.ts`) creates isolated `draft` rows with `"Draft · Monitoring Pending"`, hardcoded `ownerUserId` to creator, and no connection to `/expenses`.
- **Target standard & Villeto rule:**
  - Card transactions **must not** live in a siloed screen or automatically generate fake unpaid AP bills.
  - **Every corporate card charge** (employee card swipes and recurring card subscription charges) must automatically flow into the **Company Expenses** tab (`/expenses?tab=company-expenses`), auto-submit into a `pending` state, and run immediately against the organization's existing **Expense Policies** (receipt thresholds, category/department limits, duplicate charge flags, subscription variance tolerance).
  - Once cleared and policy-approved, the card liability settles cleanly in **Bill Pay & Spend Reconciliation** without inventing an AP vendor invoice.

### Gap 2: Single Collapsed Bill Status vs. Independent Financial State Machines
- **Current state:** `StandardBillsTable` primarily surfaces `workflowStage` (`Awaiting Approval`, `Ready for Payment`, `Paid`, `Draft`). It obscures partial payments, matching holds, credit note reductions, and reconciliation status. Additionally, the `Pay Bill` and `Download PDF` actions in `StandardBillsTable.tsx` row menus currently have no wired handlers, and `/bill-pay/[id]` lacks a direct "Prepare / Schedule Payment" CTA when a bill is approved.
- **Target standard:** Separate four distinct state dimensions on every bill:
  1. `approvalStatus`: `DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | CANCELLED`
  2. `matchingStatus`: `NOT_APPLICABLE | UNMATCHED | MATCHED | EXCEPTION_HOLD | OVERRIDE_APPROVED`
  3. `paymentStatus`: `UNPAID | PARTIALLY_PAID | SCHEDULED | PROCESSING | AWAITING_CONFIRMATION | PAID | FAILED`
  4. `reconciliationStatus`: `NOT_STARTED | PENDING | RECONCILED | DISCREPANCY`

### Gap 3: Recurring Bills Engine (`recurring.ts`)
- **Current state:** Schedules store `cadence`, `firstExpectedInvoiceDate`, `expectedAmount`, `variancePercent`, and generate `occurrences` that wait for manual matching. Missing:
  - Fixed vs. variable amount flag (`amountType: "fixed" | "variable"`).
  - `invoiceRequired` boolean (monthly electricity requires an invoice attachment; fixed rent/maintenance can generate a payable directly from the contract).
  - Default accounting tags (`departmentId`, `categoryId`, `glAccountId`, `costCenterId`).
  - `approvalMode` (`each_occurrence` vs. `auto_approve_within_tolerance`).
  - Automated **3-tier variance policy routing** (e.g., `<= 5%` within tolerance; `5%–15%` Finance Review Hold; `> 15%` mandatory renewed Manager + Finance approval).

### Gap 4: Dedicated Subscription Cards & Accountable Ownership
- **Current state:** `RecurringCardSubscription` locks owner to creator and mixes card account absence into disabled dropdowns.
- **Target standard (Ramp / Airbase pattern):**
  - Separate **Issuer Cardholder** (nullable legal/processor requirement), **Accountable Owner** (Engineering/Design/Marketing Lead responsible for the subscription), and **Card Administrator** (Finance controller).
  - Track **Expected Subscription Amount** separately from **Authorised Monthly Card Limit (Buffer)** (e.g., ₦250,000 subscription on a ₦300,000 virtual card) and **Actual Cleared Amount**.
  - Decouple Card State (`ACTIVE | FROZEN | EXPIRED | CANCELLED`) from Subscription State (`ACTIVE | PRICE_CHANGED | FAILED_RENEWAL | CANCELLED`) so freezing a card never destroys subscription history.

### Gap 5: 2-Way / 3-Way Procurement Matching & Vendor Credits
- **Current state:** `/bill-pay/[id]` renders `Related PO` as a text link and displays `lineItems`, `outstandingAmount`, and `totalAmount`, but does not render a **line-by-line 3-way match breakdown** (`PO Ordered Qty/Price` vs. `Goods Receipt Accepted/Rejected Qty` vs. `Invoice Billed Qty/Price`). Partial fulfillment mismatches and vendor credit notes cannot be visualized or resolved directly inside the AP bill workspace.
- **Target standard (NetSuite / BILL / Oracle pattern):**
  - Support `supportType: "po_backed" | "non_po"` explicitly (never force Goods Receipts on utility/rent/SaaS bills).
  - Flag quantity and unit-price variances per line item (e.g., PO for 20 laptops @ ₦500k, GR confirmed 18 accepted, Vendor invoiced 20 -> Hold 2 units / ₦1M discrepancy).
  - Support **Approve Eligible Received Portion (₦9M)**, **Apply Vendor Credit Note (₦1M)** without mutating historical invoice totals, and **Receive Remaining Units** to unlock the balance.

### Gap 6: AI/OCR Extraction Confidence & Fuzzy Duplicate Detection
- **Current state:** Document upload and mailbox ingestion create draft intakes, but there is no confidence-scored extraction review UI (`value + confidence score`) and no multi-factor duplicate check displayed to Finance.
- **Target standard (Brex / BILL pattern):**
  - OCR extraction must always create a **reviewable draft** (never auto-approve or release money), surfacing per-field confidence badges alongside the document preview and flagging potential duplicates using `(legalEntityId + vendorId + normalizedInvoiceNumber)` AND `(vendorId + amount + date ± 3 days + fileSha256)`.

### Gap 7: Payment Release Dual Control, Uncertain Webhooks & End-to-End Reconciliation
- **Current state:** `/bill-pay/payments` renders separate Payments and Bank Transactions tables. Missing:
  - Explicit visual **Dual Control** for sensitive vendor bank account changes (quarantine new bank details until second Finance Admin verifies, keeping verified account intact).
  - Explicit **`AWAITING_CONFIRMATION`** status when a payment provider callback/webhook is delayed—preventing dangerous retry clicks that cause duplicate transfers.
  - Two-stage accounting journal transparency (**Bill Posting**: `DR Expense / CR Accounts Payable`; **Settlement**: `DR Accounts Payable / CR Bank` or `DR Card Liability / CR Bank`) alongside **Card + Bank Reconciliation**.

---

## 2. Feedback Message for the Backend Engineering Team

> **Subject:** Bill Pay, Recurring Obligations, Corporate Card Expenses & Reconciliation — Architectural Alignment & API Requirements
>
> Hi team,
>
> We reviewed our current Bill Pay, Recurring, Payment, and Card Subscription implementations against standard spend-management architectures (Ramp, Brex, BILL, Airbase, NetSuite) and our upcoming **Corporate Card -> Company Expenses + Billpay Reconciliation** requirements. To make sure frontend and backend move cleanly together without treating every payment type like an unpaid AP bill, here are the exact schema and API updates we need from the backend:
>
> **1. Corporate Card Logic (Auto-Submit into Company Expenses & Policy Engine)**
> - Please **do not** force corporate card swipes or recurring card subscription charges to generate unpaid AP vendor bills, and **do not** isolate them only in a separate card view.
> - Every incoming card transaction (from webhook `transactions.pending` / `transactions.cleared` or incremental sync cursor) should **auto-create and auto-submit** an expense record into the **Company Expenses** pipeline (`source: "corporate_card"`, initial state `pending`) and run synchronously/immediately through the organization's existing **Expense Policy Engine**:
>   - Receipt requirement check (e.g. receipt required above threshold).
>   - Category / per-transaction / department budget limit checks.
>   - Duplicate charge check (same `cardId + merchant + amount` within configurable window).
>   - Subscription variance check (if linked to a `recurringCardSubscriptionId`).
> - Return `policyEvaluation: { status: "compliant" | "flagged" | "violation", checks: [...] }` on Company Expense items so the UI shows exact policy blockers.
>
> **2. Separate State Machines on Standard Bills (`GET /bill-pay/invoices` & `GET /bill-pay/invoices/:id`)**
> - Instead of relying mainly on `workflowStage`, please expose explicit independent fields:
>   - `approvalStatus`: `draft | pending_approval | approved | rejected | cancelled`
>   - `matchingStatus`: `not_applicable | unmatched | matched | exception_hold | override_approved`
>   - `paymentStatus`: `unpaid | partially_paid | scheduled | processing | awaiting_confirmation | paid | failed`
>   - `reconciliationStatus`: `not_started | pending | reconciled | exception`
>   - Financial summary fields: `originalAmount`, `creditAppliedAmount`, `paidAmount`, `outstandingAmount` (all numeric/minor-unit safe).
> - Wire up `POST /bill-pay/invoices/:id/credit-notes` (or vendor credit application) so credits reduce `outstandingAmount` without overwriting original invoice amounts.
>
> **3. 2-Way / 3-Way Procurement Matching Payload (`GET /bill-pay/invoices/:id`)**
> - Respect `supportType: "po_backed" | "non_po"` cleanly so utility/rent/services don't require receipts.
> - For `po_backed` bills, include a `matchingSummary` array at line-item level:
>   - `{ purchaseOrderLineItemId, poOrderedQty, poUnitPrice, receiptAcceptedQty, receiptRejectedQty, invoicedQty, invoicedUnitPrice, qtyVariance, amountVariance, matchResult }`
> - Add an action endpoint to approve only the **receipt-eligible portion** or resolve an exception hold (`POST /bill-pay/invoices/:id/matching/resolve`).
>
> **4. Recurring Bill Templates (`recurring-bills`)**
> - Extend `RecurringProfile` and create payloads with:
>   - `amountType`: `"fixed" | "variable"`
>   - `invoiceRequired`: `boolean` (false = generate periodic payable directly from contract; true = generate occurrence awaiting vendor invoice)
>   - `approvalMode`: `"each_occurrence" | "auto_approve_within_tolerance"`
>   - Default classifications: `departmentId`, `categoryId`, `glAccountId`
>   - Tiered variance fields/results: surface `variancePercent` and enforce hold policies when actual > expected tolerance (`5-15%` Finance hold, `>15%` full re-approval).
>
> **5. Subscription Virtual Cards (`recurring-card-subscriptions` / `cards`)**
> - Do **not** require `cardholderUserId` as mandatory on company subscription cards (`cardholderUserId?: string | null`). Separate:
>   - `accountableOwnerUserId` (department/business owner)
>   - `cardAdminUserId` (finance controller)
> - Separate `expectedAmount` (commercial plan cost) from `monthlyLimit` & `perTransactionLimit` (spending buffer).
> - Decouple card status (`active | frozen | expired | cancelled`) from subscription status (`active | price_changed | failed_renewal | cancelled`).
> - On over-limit declines or failed renewals, fire an alert event and **never** auto-increase the card limit.
>
> **6. AI/OCR Intake & Duplicate Detection (`bill-pay/intakes`)**
> - Return extracted fields with per-field confidence scores (`confidence: 0..1`) and a structured `duplicateCheck: { status: "clean" | "exact_duplicate" | "possible_duplicate", matchedInvoiceId?: string, reasons: string[] }` checking `(legalEntityId, vendorId, normalizedInvoiceNumber)` plus `(vendorId, amount, date ± 3d, documentHash)`.
>
> **7. Payment Release, Bank Account Dual Control & Reconciliation**
> - Enforce **Dual Control** on vendor bank account changes: store new bank details as `pending_verification` while keeping existing `verified` payout details active until a second authorized user approves.
> - Use a durable webhook inbox (deduplicating on `providerEventId`) and expose `AWAITING_CONFIRMATION` when a payment callback is delayed—never let missing webhooks look like a confirmed failure so Finance avoids double-paying.
> - Return 2-stage GL posting status (`billPostedJournalId` for `DR Expense / CR AP`, `settlementJournalId` for `DR AP / CR Bank` or `DR Card Liability / CR Bank`) in the **Bill Pay & Card Reconciliation** workspace so Finance can match ERP payments + cleared Company Card expenses against bank statement lines in one view.
>
> Note: We've built an interactive end-to-end frontend demo module at `/bill-pay/demo` in the app so product, design, and backend can walk through all 5 real-world workflows (Standard Utility Bill, Variable Recurring Internet & Variance Spike, Dedicated Virtual Card Subscriptions, Corporate Card Auto-Submission into Company Expenses with Policy Evaluation, and 3-Way PO Matching + Reconciliation) before finalizing API contracts.
>
> Let us know which items are already live on staging vs. planned for the next backend sprint!
