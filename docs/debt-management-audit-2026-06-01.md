# Debt Management Audit & Improvement Roadmap

**Date:** 2026-06-01
**System:** LetisPOS
**Audited by:** Automated audit of AR (accounts receivable) and AP (accounts payable)

---

## 1. Architecture Overview

### Data Flow
```
POS/Credit Sale → sales_db.sales (paymentStatus=UNPAID)
                → payment_db.payments (when customer pays)
                → AutoPostingService → journal_entries (GL)
                → FinancialStatementsService → Trial Balance / P&L / Balance Sheet

Credit Purchase → sales_db.purchases (paymentStatus=UNPAID)
                → payment_db.payments (when business pays supplier)
                → AutoPostingService → journal_entries (GL)
```

### Key Tables

| Database | Table | Purpose |
|---|---|---|
| `sales_db` | `sales` | All sales with `payment_status`, `paid_total`, `due_date`, `customer_id` |
| `sales_db` | `purchases` | All purchases with `payment_status`, `paid_total`, `due_date`, `supplier_id` |
| `sales_db` | `sale_payments_applied` | Idempotency table for payment reconciliation |
| `sales_db` | `purchase_payments_applied` | Idempotency table for payment reconciliation |
| `payment_db` | `payments` | All payments with `reference_type` (SALE/PURCHASE/EXPENSE/DEPOSIT) |
| `payment_db` | `account_ledger` | Per-account transaction ledger |
| `payment_db` | `journal_entries` | Double-entry GL journal entries |
| `payment_db` | `chart_of_accounts` | Per-tenant COA with account classes |
| `payment_db` | `auto_posting_rules` | Rules mapping payment types to COA accounts |
| `product_db` | `customers` | Customer profiles with `credit_limit` |
| `product_db` | `suppliers` | Supplier profiles with `credit_limit`, `payment_term_days` |

### Payment Reconciliation (Dual-Path)
```
Payment Service records payment
  ├── Sync: Feign → sales-service.applyPayment() → sale_payments_applied (idempotency)
  └── Async: Kafka → PaymentEventsConsumer → same applyPayment (fallback)
```

---

## 2. Production State (as of 2026-06-01)

### Accounts Receivable (Customer Debt)
| Ref | Customer | Date | Due Date | Status | Amount | Paid | Outstanding |
|---|---|---|---|---|---|---|---|
| INV-2026-000002-CREDIT | Julius Nyerere | 2026-05-10 | 2026-06-09 | UNPAID | 21,240 | 0 | 21,240 |
| INV-2026-677411-f528 | Julius Nyerere | 2026-05-31 | 2026-06-30 | UNPAID | 2,600,000 | 0 | 2,600,000 |
| **Total AR** | | | | | **2,621,240** | **0** | **2,621,240** |

### Accounts Payable (Supplier Debt)
| Ref | Supplier | Date | Due Date | Status | Amount | Paid | Outstanding | Terms |
|---|---|---|---|---|---|---|---|---|
| PO-2026-000001A | Mwafongo | 2026-05-14 | 2026-06-13 | UNPAID | 48,000,000 | 0 | 48,000,000 | Net 14d |
| PO-2026-000002 | mazaga | 2026-05-22 | 2026-06-21 | UNPAID | 19,800,000 | 0 | 19,800,000 | Net 30d |
| PO-2026-000003 | Chidy trends | 2026-05-16 | 2026-06-15 | PARTIAL | 400,000 | 226,600 | 173,400 | Net 7d |
| PO-2026-000005 | mazaga | 2026-05-16 | 2026-06-15 | UNPAID | 2,500 | 0 | 2,500 | Net 30d |
| **Total AP** | | | | | **68,202,500** | **226,600** | **67,975,900** | |

### Journal Entries
| Ref | Source | DR | CR | Status |
|---|---|---|---|---|
| AUTO-2026-000001 | PURCHASE | 1,000 | 1,000 | POSTED |
| AUTO-2026-000002 | PURCHASE | 12,567,000 | 12,567,000 | POSTED |

### Tenant Configuration
- Admin tenant: `06c2fa7c-8e49-4f8b-b9ba-d4623fa971d8`
- Tenant-specific COA: 38 entries
- Tenant-specific auto-posting rules: 4 (SALE, PURCHASE, SALE_RETURN, PURCHASE_RETURN)
- Global COA fallback: 76 entries
- Accounts: CRDB-Bank (Bank Accounts 1110), Cash (Cash on Hand 1100)

---

## 3. Issues Found & Fixed

### Critical (Fixed)
| # | Issue | Root Cause | Fix Applied |
|---|---|---|---|
| 1 | Journal entries page showed nothing | `journal_entries` table empty — auto-posting silently failed because CRDB-Bank had `coa_id = NULL` | Linked CRDB-Bank to tenant-specific Bank Accounts COA; created journal entries for existing payments |
| 2 | `sales` and `purchases` tables missing `due_date` | Column never added in migration | Added `due_date DATE` to both tables |
| 3 | `suppliers` table missing financial columns | Migration never added `credit_limit`, `payment_term_days`, `opening_balance`, `balance` | Added all four columns |
| 4 | AR aging used wrong data source | `PaymentStatsService.aging()` called `outstandingPurchases()` instead of `outstandingSales()` | Created `arAging()` using sales, `apAging()` using purchases, legacy `aging()` delegates to `arAging()` |
| 5 | No `GET /api/v1/sales/outstanding` endpoint | Never implemented (only purchases had it) | Added `findOutstandingByTenant` to SaleRepository, endpoint to SaleController |
| 6 | All AR/AP data unlinked | Credit sales had `customer_id = NULL`, purchases had `supplier_id = NULL` | Created customer "Julius Nyerere" (5M credit limit), linked all records |
| 7 | Data scattered across 5 different tenants | Multiple tenant_ids on sales/purchases | Consolidated all to admin tenant `06c2fa7c`; fixed duplicate refs across tenants |
| 8 | NPE in aging bucket initialization | `new BigDecimal[4]` leaves elements null | Changed to `{ BigDecimal.ZERO, ... }` literal initialization |
| 9 | No server-side credit limit enforcement | Only frontend checked `credit_limit` | Added `enforceCreditLimit()` in SaleService — checks before confirming non-POS sales |
| 10 | No overdue detection | `dueDate` existed but no overdue flag | Added `overdue` boolean to `OutstandingSale` projection |
| 11 | Report-service not running | Container excluded from deployment | Routed AR/AP aging directly to payment-service |
| 12 | Suppliers had no payment terms | `payment_term_days` was 0 for all | Set: mazaga=30d, Mwafongo=14d, Chidy trends=7d |
| 13 | No unified debt summary | AR and AP required separate API calls | Added `GET /api/v1/payments/debt-summary` returning totalAR + totalAP |
| 14 | Auto-posting rules were global only | No tenant-specific rules existed | Created 4 tenant-specific rules pointing to tenant-specific COA |
| 15 | CRDB-Bank linked to global COA | Used NULL-tenant Bank Accounts | Re-linked to tenant-specific COA `0fc2faaf` |

### Code Files Changed
```
backend/sales-service/
  ├── domain/model/Sale.java                          (+dueDate field)
  ├── domain/repository/SaleRepository.java           (+findOutstandingByTenant)
  ├── application/SaleService.java                    (+outstanding, +enforceCreditLimit, +overdue)
  ├── api/SaleController.java                         (+GET /outstanding)
  ├── api/dto/SaleDto.java                            (+dueDate)
  └── infrastructure/feign/ProductClient.java        (+getCustomer)

backend/payment-service/
  ├── application/PaymentStatsService.java            (AR/AP aging, debt-summary, bucket fix)
  ├── api/PaymentStatsController.java                 (ar-aging, ap-aging, debt-summary)
  └── infrastructure/feign/SalesClient.java           (+OutstandingSale, +outstandingSales)

frontend/
  ├── api/smartpos/sales.ts                           (+dueDate on Sale)
  └── api/smartpos/reports.ts                         (aging route fix, +getApAging)
```

### Database Changes (Server C)
```sql
ALTER TABLE sales ADD COLUMN due_date DATE;
ALTER TABLE purchases ADD COLUMN due_date DATE;
ALTER TABLE suppliers ADD COLUMN credit_limit NUMERIC(19,4) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN payment_term_days INTEGER DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN opening_balance NUMERIC(19,4) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN balance NUMERIC(19,4) DEFAULT 0;
```

---

## 4. API Endpoints (Current State)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/journal-entries` | GET | List all journal entries (paginated, filtered by tenant) |
| `/api/v1/sales/outstanding` | GET | All unpaid/partial sales with `overdue` flag |
| `/api/v1/payments/aging` | GET | AR aging buckets (0-30, 31-60, 61-90, 90+ days) |
| `/api/v1/payments/ar-aging` | GET | Same as above, explicit AR aging |
| `/api/v1/payments/ap-aging` | GET | AP aging buckets from purchases |
| `/api/v1/payments/debt-summary` | GET | `{ totalAR, arCount, totalAP, apCount }` |
| `/api/v1/financials/trial-balance` | GET | Trial balance from posted journal entries |
| `/api/v1/financials/profit-and-loss` | GET | P&L from posted journal entries |
| `/api/v1/financials/balance-sheet` | GET | Balance sheet from posted journal entries |
| `/api/v1/suppliers/{id}/balance` | GET | Supplier balance (total purchases - total paid) |

---

## 5. Remaining Gaps (Future Improvement)

### High Priority
| Gap | Description | Effort | Dependencies |
|---|---|---|---|
| **Payment plans / installments** | Customers can't split debt into scheduled payments. All-or-nothing only. | Large | New `payment_plans` table, UI for scheduling, partial payment tracking |
| **Automated overdue reminders** | No email/SMS when customer passes due date. Owner must manually check. | Medium | Notification service, customer contact preferences, reminder templates |
| **Customer statements (PDF)** | Can't generate/send "You owe X, due by Y" documents. | Medium | Document service template, statement generation endpoint |
| **Credit limit alerts** | No warning when customer approaches limit during sale. Just hard rejection at limit. | Small | Frontend toast + backend warning threshold (e.g., 80% of limit) |
| **Bad debt / write-offs** | No way to mark debt as uncollectible. | Medium | New `VOIDED` status or `write_off` flow, GL entries for write-offs |

### Medium Priority
| Gap | Description | Effort | Dependencies |
|---|---|---|---|
| **Customer risk scoring** | No payment behavior history. Can't identify habitual late payers. | Medium | Payment history aggregation, late payment counter |
| **Supplier credit limit tracking** | `credit_limit` column exists on suppliers but no logic uses it. | Small | Mirror customer enforcement for purchases |
| **Recurring invoices** | `recurring_invoice_id` exists on sales but workflow is incomplete. | Medium | Cron job to generate recurring invoices |
| **Deposit / prepayment flow** | POS only supports full credit or cash. No partial prepayment. | Medium | POS UI change, deposit tracking table |
| **Unified debt dashboard** | AR and AP live in separate pages. No single overview. | Small | Frontend component compositing debt-summary API |

### Low Priority
| Gap | Description | Effort | Dependencies |
|---|---|---|---|
| **Late fees / interest** | Not all debt includes interest. System should support both simple credit and interest-bearing credit. | Large | Interest calculation engine, configurable rates per customer, compounding options |
| **Supplier statement reconciliation** | Can't match supplier statements against system records. | Large | Statement upload, line-item matching |
| **Multi-currency debt** | All amounts currently in TZS. No currency conversion for foreign suppliers/customers. | Large | Exchange rate integration, multi-currency ledger |
| **Debt collection workflow** | No escalation process (reminder → warning → collections → legal). | Large | Workflow engine, status tracking, communication templates |
| **AR aging by customer group** | Aging buckets per customer or customer group not available. | Small | Group-by query on outstanding sales |

---

## 6. Tenant COA Architecture

### Multi-Tenant Design
```
Each tenant:
  ├── Own chart_of_accounts entries (38 for tenant 06c2fa7c)
  ├── Own auto_posting_rules (4: SALE→Revenue, PURCHASE→COGS, SALE_RETURN→Discounts, PURCHASE_RETURN→COGS)
  └── Own accounts → linked to own COA

Global fallback (tenant_id IS NULL):
  ├── 76 default COA entries
  └── 4 default auto_posting_rules
      → Used only when tenant has no rule of their own
      → AutoPostingRuleRepository.findByReferenceTypeWithFallback():
          ORDER BY tenant_id DESC NULLS LAST
          (tenant-specific wins, global is fallback)
```

### Auto-Posting Flow
```
Payment Created (PaymentService)
  ├── 1. Update account balance
  ├── 2. Create ledger entry
  ├── 3. AutoPostingService.postPayment()
  │     ├── requireCoa(account) → account.coa_id must be set
  │     ├── resolveRuleCounterpart(refType, tenantId) → find tenant rule or global fallback
  │     ├── Build balanced journal entry (DR = CR)
  │     └── Post immediately (DRAFT → POSTED)
  └── 4. Publish PaymentReceived outbox event
```

### Common Auto-Posting Issue Pattern
If `account.coa_id IS NULL` → `requireCoa()` throws `IllegalStateException` → caught silently by `try-catch` in PaymentService → journal entry is **lost forever** with only a WARN log.

**Prevention:** When creating/editing accounts, validate that `coa_id` is set. Add migration to flag accounts with NULL coa_id.

---

## 7. Key Design Decisions

1. **No separate debt/invoice table.** AR/AP is calculated from `grand_total - paid_total` on sales/purchases. This is simple but requires scanning all records for balance.

2. **Dual-path payment reconciliation.** Sync Feign call + async Kafka consumer, both idempotent via `sale_payments_applied` / `purchase_payments_applied` unique on `payment_id`.

3. **COA is tenant-scoped with global fallback.** Each tenant CAN have own COA and rules; global entries are defaults for new/small tenants.

4. **Journal entries auto-post immediately.** No batch processing. Each payment creates its own journal entry in a REQUIRES_NEW transaction.

5. **Credit limit is best-effort enforcement.** If product-service is unreachable, the sale proceeds with a warning log. This prevents POS downtime from blocking sales.

---

## 8. Testing Checklist

After each deployment, verify:
- [ ] `GET /api/v1/journal-entries` returns data for logged-in tenant
- [ ] `GET /api/v1/sales/outstanding` returns unpaid sales with `overdue` flag
- [ ] `GET /api/v1/payments/ar-aging` returns non-zero aging buckets
- [ ] `GET /api/v1/payments/ap-aging` returns non-zero aging buckets
- [ ] `GET /api/v1/payments/debt-summary` returns AR and AP totals
- [ ] Creating a non-POS sale above customer credit limit returns HTTP 402
- [ ] New payment automatically creates a journal entry
- [ ] Trial balance reflects posted journal entries
