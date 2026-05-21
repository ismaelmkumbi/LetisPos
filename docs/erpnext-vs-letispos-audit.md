# LetisPos vs ERPNext — Architecture & Feature Audit

**Date:** 2026-05-20
**Scope:** Full audit of LetisPos (current solution) vs ERPNext (Nexp ERP) across architecture, feature coverage, and gap analysis.

---

## Executive Summary

LetisPos is a modern, microservices-based POS and inventory platform built on Java 21 / Spring Boot 3.3.4 + React 19 / TypeScript, targeting East African SMEs. ERPNext is a mature, monolithic ERP built on the Python-based Frappe Framework with 15+ years of domain logic across manufacturing, accounting, HR, and more.

**LetisPos wins on architecture and modern SaaS design.** ERPNext wins on ERP domain depth, particularly manufacturing and accounting.

---

## 1. Architecture Comparison

| Dimension | LetisPos | ERPNext |
|---|---|---|
| **Pattern** | Microservices (17 services + gateway) | Modular monolith (Frappe Framework) |
| **Language** | Java 21 + Spring Boot 3.3.4 | Python 3.14 + Frappe Framework v17 |
| **Database** | Database-per-service (PostgreSQL 16) | Single shared MariaDB/PostgreSQL |
| **API Layer** | REST via Spring Cloud Gateway + JWT | JSON-RPC + REST + Webhooks |
| **Message Bus** | Apache Kafka 3.8.0 (KRaft, outbox pattern) | Redis + background workers (RQ) |
| **Frontend** | React 19 + TypeScript + MUI 7 + Vite | Frappe Desk (Vue.js SPA) + Jinja SSR |
| **Auth** | JWT + JWKS + multi-tenant (X-Tenant-ID header) | Session-based + role permissions |
| **Caching** | Redis 7 (per-service TTL) | Redis |
| **Object Storage** | MinIO (S3-compatible) | File system / S3 |
| **Container Build** | Jib (no Docker daemon) | Docker / Frappe Bench |
| **Observability** | Jaeger tracing, Kafka UI | Built-in monitor, Frappe Cloud telemetry |
| **Deployment** | Docker Compose (K8s-ready), GHCR images | Frappe Bench CLI, Docker, Frappe Cloud |

### Architecture Assessment

| Criteria | LetisPos | ERPNext |
|---|---|---|
| Scalability | Per-service independent scaling | Horizontal: web/worker/scheduler tiers |
| Development velocity | Slower (boilerplate per service) | Fast (DocType metadata-driven, no migrations) |
| Operational complexity | High (17 DBs, Kafka, 17 containers) | Low (single app, single DB) |
| Cross-domain transactions | Requires Kafka orchestration | Trivial (shared DB, in-process) |
| Fault isolation | Strong (service failures don't cascade) | Weak (monolith SPOF) |
| Hiring pool | Java/Spring + React (large) | Python/Frappe (small, niche) |
| API versioning | Natural (per-service) | Manual |

**Rating: LetisPos 8/10, ERPNext 7/10** — LetisPos has stronger architectural foundations for a SaaS platform. ERPNext is more pragmatic for rapid ERP delivery but carries monolith scaling debt.

---

## 2. Microservices Breakdown (LetisPos)

| # | Service | Port | Database | Responsibility |
|---|---|---|---|---|
| 1 | **gateway** | 8080 | — | Spring Cloud Gateway: routing, JWT validation, rate limiting, CORS, tenant header extraction |
| 2 | **auth-service** | 8081 | auth_db | Login, refresh tokens, registration, JWKS, multi-tenancy, email/SMS verification |
| 3 | **user-service** | 8082 | user_db | User profiles, RBAC (roles/permissions), feature flags, menu definitions, i18n, onboarding |
| 4 | **product-service** | 8083 | product_db | Products, variants, categories, brands, barcodes, serials, price lists, customers, suppliers, gift cards |
| 5 | **inventory-service** | 8084 | inventory_db | Warehouses, stock levels, transfers, adjustments, stock counts, batches, reorder rules, reservations |
| 6 | **sales-service** | 8085 | sales_db | Sales/POS, quotations, purchases, returns, recurring invoices, POS terminals, offline sync, promotions |
| 7 | **payment-service** | 8086 | payment_db | Payments, Stripe, chart of accounts, expenses, deposits, journal entries, financial statements, taxes |
| 8 | **report-service** | 8087 | report_db | Reporting, dashboards, scheduled reports, exports, data freshness tracking |
| 9 | **notification-service** | 8089 | notification_db | Notification templates, SMTP (MailHog/Resend), SMS/WhatsApp (Twilio) |
| 10 | **hrm-service** | 8090 | hrm_db | Employees, departments, attendance, leave, payroll, office shifts |
| 11 | **ai-service** | 8091 | ai_db | Multi-provider LLM (Claude, GPT, DeepSeek), demand forecasting, reorder suggestions, fraud detection |
| 12 | **integration-service** | 8092 | integration_db | Webhooks, ZATCA e-invoicing, WooCommerce, QuickBooks |
| 13 | **document-service** | 8093 | documents_db | Document generation/templates, Gotenberg PDF, TRA/VFD integration, printer management |
| 14 | **billing-service** | 8094 | billing_db | Subscription plans, Stripe billing, M-Pesa Daraja |
| 15 | **audit-service** | 8095 | audit_db | Audit events, error logs, API key management, backups, data retention |
| 16 | **crm-service** | 8096 | crm_db | Leads, opportunities, follow-ups, activity tracking |
| 17 | **commerce-service** | 8097 | commerce_db | Public storefront, cart, SEO, themes, navigation, custom domains, shipping zones |
| 18 | **control-hub** | 8100 | control_hub | Central admin/control plane |

### Shared Libraries

| Library | Purpose |
|---|---|
| `libs/common` | TenantContext (tenant header extraction/filter), JwtAuditorAware |
| `libs/outbox-relay` | Transactional outbox pattern — polls `outbox_event` table, publishes to Kafka |

---

## 3. ERPNext Module Breakdown

ERPNext v17 comprises 21 modules built on the Frappe Framework:

| Module | Key DocTypes | Description |
|---|---|---|
| **Accounts** | Account, Journal Entry, Payment Entry, Bank Reconciliation, Budget, Tax | Full double-entry accounting, bank rec, multi-currency, consolidated statements |
| **Selling** | Quotation, Sales Order, Customer, Delivery Note, Sales Team | Sales pipeline from quote to delivery |
| **Buying** | Purchase Order, Supplier, Material Request, Purchase Receipt, Landed Cost | Procurement with landed cost tracking |
| **Stock** | Item, Warehouse, Bin, Batch, Stock Entry, Pick List, Packing Slip | Multi-warehouse, batch/serial, bin-level tracking, reorder |
| **Manufacturing** | BOM, Work Order, Job Card, Routing, Production Plan, MRP, Blanket Order | Full discrete manufacturing with multi-level BOM, MRP, subcontracting |
| **CRM** | Lead, Opportunity, Campaign | Lead-to-opportunity pipeline |
| **HR** | Employee, Attendance, Leave, Payroll, Expense Claim, Shift, Recruitment | Full HRMS lifecycle |
| **Projects** | Project, Task, Timesheet, Activity Cost | Project management with time/cost tracking |
| **Assets** | Asset, Asset Depreciation, Asset Maintenance | Fixed asset lifecycle management |
| **Quality** | Quality Goal, Quality Review, Non-Conformance, Quality Procedure | Quality management system (QMS) |
| **Maintenance** | Maintenance Visit, Maintenance Schedule | Equipment maintenance tracking |
| **Support** | Issue, Warranty Claim | Helpdesk and support ticketing |
| **Banking** | Bank Account, Bank Statement Import, Bank Transaction Rule | Bank feed integration and reconciliation |
| **Regional** | GST Settings, E-Way Bill, Regional Tax Templates | Country-specific compliance (India, UAE, Australia, Italy, South Africa, Turkey, USA) |
| **ERPNext Integrations** | Plaid Settings | Third-party integrations |
| **EDI** | Code List, Common Code | Electronic Data Interchange framework |
| **Subcontracting** | Subcontracting Order, Subcontracting Receipt | Raw material supply to subcontractors |
| **Bulk Transaction** | — | Bulk data operations |
| **Communication** | — | Email/SMS communication |
| **Telephony** | — | VoIP integration |
| **Portal** | — | Customer/vendor portal |
| **Setup** | Company, Global Defaults, Print Format | System configuration |

---

## 4. Feature Coverage Matrix

| Domain | LetisPos | ERPNext | Delta |
|---|---|---|---|
| **POS** | Full offline-first POS, cash registers, suspended sales, second-screen customer display | Basic POS via Selling | LetisPos **significantly ahead** |
| **Sales Management** | Sales orders, quotations, returns, recurring invoices | Sales orders, quotations, delivery notes, returns | Comparable |
| **Purchasing** | Purchase orders, goods receipts, supplier returns | Purchase orders, receipts, returns, landed costs, material requests | ERPNext ahead (landed costs) |
| **Inventory** | Multi-warehouse, stock levels, transfers, adjustments, counts, batches, reorder, reservations | Multi-warehouse, bin-level, batch/serial, reorder, pick lists, packing slips, landed cost vouchers | Comparable; ERPNext has pick lists |
| **Accounting** | Chart of accounts, journal entries, ledger, financial statements, taxes, Stripe payments | Full double-entry: bank reconciliation, multi-currency, budgets, payment reconciliation, consolidated trial balance, auto-posting | ERPNext **significantly deeper** |
| **Banking** | Basic (Stripe payment processing) | Bank statement import (MT940, CSV, OFX), reconciliation tool, transaction rules, automated matching | ERPNext **far ahead** |
| **Manufacturing** | Not available | BOM (multi-level), work orders, job cards, routings, production planning, MRP, subcontracting, blanket orders, scrap/waste tracking | **Critical gap** |
| **HR & Payroll** | Employees, departments, attendance, leave, payroll runs | Recruitment, onboarding, attendance, leave, payroll with tax compliance, expense claims, shift management, overtime, arrears, earned leave | ERPNext deeper |
| **CRM** | Leads, opportunities, follow-ups, activities | Leads, opportunities, sales teams, campaigns, customer credit limits | Comparable |
| **Quality Management** | Not available | Goals, procedures, reviews, non-conformances, CAPA, inspection integration | **Gap** |
| **Project Management** | Not available | Projects, tasks, timesheets, activity costing, templates, dependencies | **Gap** |
| **Asset Management** | Not available | Lifecycle: purchase → depreciation schedules → maintenance → disposal | **Gap** |
| **Subcontracting** | Not available | Subcontracting orders, raw material supply tracking | **Gap** |
| **Maintenance** | Not available | Maintenance visits, schedules, equipment tracking | **Gap** |
| **EDI** | Not available | EDI framework for B2B data interchange | **Gap** |
| **E-Commerce** | Full React storefront, theme customizer, SEO, custom domains, navigation builder | Website builder, shopping cart, product catalog pages | LetisPos ahead (modern SPA) |
| **AI/ML** | Multi-provider LLM, demand forecasting, reorder suggestions, fraud detection, customer analytics | None built-in | **LetisPos ahead** |
| **Multi-Tenancy** | Native (X-Tenant-ID header, per-tenant DB isolation via Hibernate filter) | Via Frappe sites (separate site per tenant) | LetisPos cleaner |
| **Regional Compliance** | ZATCA e-invoicing (Saudi), TRA/VFD (Tanzania) | GST e-invoicing + e-way bills (India), regional variants for UAE, Australia, Italy, South Africa, Turkey, USA | Different regions covered |
| **Integrations** | Stripe, M-Pesa Daraja, WooCommerce, QuickBooks, Twilio, Resend, Gotenberg | Plaid, Google Maps, YouTube, payment gateways | Different ecosystem focus |
| **Reporting** | Report hub, scheduled reports, exports (MinIO), dashboards, report builder | Report center, financial reports, customizable via Script Report | Comparable |
| **Document Generation** | Templates with versioning, Gotenberg HTML-to-PDF, printer management, email documents | Print formats, email templates, letterhead | Comparable |
| **Workflow Engine** | Not available (custom per-feature logic) | Built-in workflow engine: states, transitions, role-based approvals | **Gap** |
| **RBAC** | CASL ability + custom FeatureGate with path/feature mapping | Role-based permissions at DocType level, field-level permissions | Comparable |

---

## 5. Gap Analysis — Priority Matrix

### Critical (must address for ERP completeness)

| Feature | Reason | Recommendation |
|---|---|---|
| **Manufacturing (BOM, MRP, Work Orders)** | Essential for product-based/manufacturing businesses. ERPNext has 50K+ lines of manufacturing logic. | **Build** as a new `manufacturing-service`. Study ERPNext's doctype definitions as reference spec. |
| **Bank Reconciliation** | Accounting module is incomplete without bank rec. ERPNext's reconciliation tool is mature. | **Build** into existing `payment-service`. Add bank statement import (MT940/CSV/OFX), transaction matching rules. |
| **Workflow Engine** | Many ERP features (approvals, multi-step processes) need generic workflow. ERPNext has this built-in. | **Build** as a shared library or new `workflow-service`. This is foundational for purchase approvals, leave approvals, etc. |

### High Priority

| Feature | Reason | Recommendation |
|---|---|---|
| **Asset Management** | Fixed asset depreciation, maintenance scheduling | **Build** as new `asset-service` |
| **Quality Management** | Inspections, non-conformance tracking, CAPA | **Build** as new `quality-service` |
| **Landed Cost Tracking** | Critical for import-heavy businesses to calculate true COGS | **Build** into `inventory-service` |
| **Budget Management** | Departmental/company budgeting with variance reporting | **Build** into `payment-service` |
| **Project Management** | Timesheets, project costing, task dependencies | **Build** as new `project-service` or integrate with external tool |

### Medium Priority

| Feature | Reason | Recommendation |
|---|---|---|
| **Consolidated Financial Statements** | Multi-entity reporting | **Build** into `report-service` |
| **Pick Lists / Packing Slips** | Warehouse operational efficiency | **Build** into `inventory-service` |
| **Supplier Payment Aging** | Working capital management | **Build** into `payment-service` |
| **Payroll Tax Compliance** | Country-specific calculations | **Integrate** with local payroll providers per market |

### Low Priority

| Feature | Reason | Recommendation |
|---|---|---|
| **EDI Framework** | B2B data interchange | Evaluate third-party EDI providers first |
| **Telephony Integration** | VoIP integration | Integrate via `integration-service` when needed |
| **Subcontracting** | Niche manufacturing need | Build after core manufacturing is established |

---

## 6. Unique Differentiators

### LetisPos Advantages

| Differentiator | Why It Matters |
|---|---|
| **Offline-first POS** | Continues operating during internet outages with automatic sync — essential for East African markets |
| **AI-native platform** | Built-in demand forecasting, reorder suggestions, fraud detection, and customer analytics via multi-provider LLM |
| **SaaS multi-tenancy** | Clean tenant isolation from day one. ERPNext requires separate sites per tenant or complex workarounds |
| **Modern frontend** | React 19, MUI 7, Vite, Framer Motion — developer experience and UX significantly ahead of Frappe Desk |
| **Kafka event-driven** | Reliable cross-service communication with transactional outbox pattern. ERPNext uses in-process events (weaker decoupling) |
| **Database-per-service** | Independent scaling, technology choice, and failure isolation per domain |
| **M-Pesa integration** | Native Kenyan mobile money support via billing-service |
| **Gotenberg PDF** | Modern headless Chrome PDF generation vs ERPNext's wkhtmltopdf |

### ERPNext Advantages

| Differentiator | Why It Matters |
|---|---|
| **20+ years of manufacturing logic** | BOM explosions, MRP, job card costing — battle-tested across thousands of factories |
| **Accounting maturity** | Double-entry with bank reconciliation, payment matching, and consolidated reporting — audited by real accountants |
| **Low-code extensibility** | Add fields to any DocType without migrations or redeployment. Business users can customize |
| **Workflow engine** | Generic state-machine workflow with role-based approvals, usable across any module |
| **Regional breadth** | 7+ countries with tax compliance built-in |
| **Ecosystem** | 20,000+ deployments, active community, established implementation partners |

---

## 7. Strategic Recommendation

### Core Finding

LetisPos is architecturally superior for a SaaS POS and commerce platform. ERPNext has deeper ERP domain logic accumulated over 15+ years. The gap is in *features*, not *architecture* — and features can be built.

### Recommended Path

1. **Keep LetisPos as the core platform** — the microservices architecture, modern frontend, AI integration, offline-first POS, and multi-tenancy are genuine competitive advantages that would be expensive to replicate on Frappe.

2. **Build the top missing microservices:**
   - `manufacturing-service` — BOM engine, work orders, MRP, routings
   - `workflow-service` — generic approval/workflow engine (shared library)
   - `asset-service` — fixed asset lifecycle management
   - `quality-service` — QMS with inspections and non-conformance tracking
   - `project-service` — projects, tasks, timesheets

3. **Deepen existing services:**
   - `payment-service` — add bank reconciliation, budget management, payment matching
   - `inventory-service` — add landed cost tracking, pick lists, packing slips

4. **Use ERPNext's DocType definitions as reference specifications.** The `/frappe/erpnext/erpnext/` doctype JSON files are excellent schemas for what fields, validations, and relationships each domain entity needs. Don't reinvent the wheel — study their domain models.

5. **Buy/integrate rather than build** for: payroll tax compliance engines (local providers per market), EDI (third-party gateways), telephony.

### Total Build Estimate

| Tier | Services | Approx. Effort |
|---|---|---|
| Critical (must have) | Manufacturing + Workflow + Bank Rec | 6–9 months |
| High Priority | Asset + Quality + Projects + Budget | 4–6 months |
| Medium Priority | Consolidated reporting + Pick lists + Supplier aging | 2–3 months |
| **Total** | | **12–18 months** to ERP parity |

---

## 8. Summary Scores

| Dimension | LetisPos | ERPNext | Notes |
|---|---|---|---|
| **Architecture** | 8/10 | 7/10 | LetisPos: microservices purity. ERPNext: pragmatic but monolith. |
| **POS Capability** | 9/10 | 4/10 | LetisPos built for POS. ERPNext is bolt-on. |
| **Accounting Depth** | 5/10 | 9/10 | ERPNext has 15+ years of accounting logic. |
| **Manufacturing** | 0/10 | 9/10 | LetisPos has none. ERPNext is market-leading. |
| **Inventory** | 8/10 | 8/10 | Both strong; ERPNext has pick lists and landed costs. |
| **HR / Payroll** | 5/10 | 8/10 | ERPNext has full lifecycle; LetisPos has basics. |
| **CRM** | 7/10 | 7/10 | Comparable. |
| **E-Commerce** | 9/10 | 6/10 | LetisPos has modern React storefront with theming. |
| **AI / ML** | 8/10 | 0/10 | LetisPos has LLM-powered insights built-in. |
| **Multi-Tenancy** | 9/10 | 6/10 | LetisPos was designed for SaaS. ERPNext requires workarounds. |
| **Developer Experience** | 8/10 | 6/10 | TypeScript/Java/MUI vs Python/Vue.js. Larger hiring pool. |
| **Extensibility** | 6/10 | 9/10 | ERPNext DocType low-code is unmatched. LetisPos requires code changes. |
| **Operational Maturity** | 6/10 | 8/10 | ERPNext has 15+ years of production hardening. |
| **Overall ERP Readiness** | 6.5/10 | 7.5/10 | ERPNext is more complete today. LetisPos has more potential. |
