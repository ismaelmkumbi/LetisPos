# SmartPOS

Modern Smart POS system — rebuild of the legacy PHP/Vue Stocky v4.0.8 as a
React + Spring Boot microservice architecture.

> **Current state:** Phase 0 + Phase 1 complete — infra, Auth Service,
> User Service, API Gateway, and wired Modernize login page.

See [`ARCHITECTURE_PLAN.md`](./ARCHITECTURE_PLAN.md) for the full blueprint.

---

## Repository layout

```
smartpos/
├── ARCHITECTURE_PLAN.md          ← full architecture document
├── README.md                     ← this file
├── infra/
│   ├── docker-compose.yml        ← Postgres, Redis, Kafka, Kafka UI, MinIO, Mailhog, Jaeger
│   └── postgres/init-databases.sql
└── backend/
    ├── pom.xml                   ← parent POM (Java 21, Spring Boot 3.3)
    ├── libs/
    │   └── outbox-relay/         ← shared starter: outbox → Kafka relay (auto-configured)
    ├── auth-service/             ← port 8081
    ├── user-service/             ← port 8082
    ├── product-service/          ← port 8083
    ├── inventory-service/        ← port 8084
    ├── sales-service/            ← port 8085
    ├── payment-service/          ← port 8086
    ├── report-service/           ← port 8087
    └── gateway/                  ← port 8080 (the one the frontend talks to)

../main/                          ← Modernize React/TS/MUI frontend (template)
  ├── src/api/smartpos/           ← new: axios client, auth API
  ├── src/context/smartpos/       ← new: AuthContext / AuthProvider
  ├── src/routes/smartpos/        ← new: RequireAuth, PermissionGate
  └── src/views/smartpos/         ← new: functional LoginPage + AuthLoginForm
```

## Prerequisites

- **JDK 21** (Temurin recommended)
- **Maven 3.9+**
- **Docker + Docker Compose**
- **Node 20+** and **npm** for the frontend

---

## 1. Start infrastructure

```bash
cd smartpos/infra
docker compose up -d
```

This brings up Postgres (with per-service databases auto-provisioned from
`postgres/init-databases.sql`), Redis, Kafka (KRaft mode, no ZooKeeper),
Kafka UI, MinIO, Mailhog, and Jaeger.

Sanity-check:

```bash
docker compose ps
docker compose logs -f postgres    # wait for "database system is ready to accept connections"
docker compose logs -f kafka       # wait for "Kafka Server started"
```

**Kafka access:**

| From | Bootstrap server |
|---|---|
| Spring apps running on your host machine | `localhost:9094` |
| Apps running inside the Docker network  | `kafka:9092` |

Kafka UI: http://localhost:8085 — browse topics, consumers, messages.

Quick CLI check (from the host):

```bash
docker exec -it smartpos-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --list
```

## 2. Build everything

```bash
cd smartpos/backend
mvn -q -DskipTests clean install
```

## 3. Run the Auth Service

```bash
cd auth-service
JWT_ALLOW_EPHEMERAL_KEYS=true mvn spring-boot:run
```

Watch the log — on first start it seeds an admin user and prints something like:

```
Bootstrap admin created (change password after first login!)
  userId   : 8f3a5d2e-7cb1-4c18-bf3a-2a5f7a9b1c22
  email    : admin@smartpos.local
  password : Admin@12345
```

**Copy that userId.** You'll pass it to the User Service.

## 4. Run the User Service

```bash
cd ../user-service
SMARTPOS_USER_BOOTSTRAP_ADMIN_USER_ID=<paste-the-uuid-from-above> \
mvn spring-boot:run
```

(Or add the value to `application.yml` as `smartpos.user.bootstrap.admin-user-id`.)

This seeds a matching profile with the ADMIN role attached, so the JWT issued
at login will carry all permissions.

## 5. Run the Product Service

```bash
cd ../product-service
mvn spring-boot:run
```

Seeds 9 common retail units (pcs, box, kg, g, L, ml, m, dz, pk).

## 6. Run the Inventory Service

```bash
cd ../inventory-service
mvn spring-boot:run
```

Seeds a default `MAIN` warehouse on first start. Hosts the stock-reservation
saga, stock ledger, transfers, adjustments, and the stock-count wizard.

A scheduled job runs every 30 s to release reservations past their TTL.

## 7. Run the Sales / POS Service

```bash
cd ../sales-service
mvn spring-boot:run
```

Owns sales, quotations, drafts, returns, purchases. On `POST /sales` or
`POST /pos/sales` it calls Inventory Service via Feign to reserve stock
(the JWT is forwarded automatically), then confirms — or releases on failure.

## 8. Run the Payment Service

```bash
cd ../payment-service
mvn spring-boot:run
```

Seeds a default Cash account on first start. Records payments against sales /
purchases / returns, double-entry ledger per account, expenses, deposits, and
account-to-account transfers. Stripe runs in **mock mode** unless you set
`STRIPE_ENABLED=true` + API keys.

## 9. Run the Report Service

```bash
cd ../report-service
mvn spring-boot:run
```

Read-only aggregation service. Fans out Feign calls to Sales / Inventory /
Payment for each dashboard/report query, caches results in Redis (2–10 min
TTLs). Synchronous exports in PDF / XLSX / CSV. No fact-table population
yet — Phase 6b will wire CDC consumers.

## 10. Run the Gateway

```bash
cd ../gateway
mvn spring-boot:run
```

Gateway is now on `http://localhost:8080`. Routing:

| Path prefix | Target |
|---|---|
| `/api/v1/auth/**` | Auth Service |
| `/api/v1/users/**`, `/api/v1/roles/**`, `/api/v1/permissions` | User Service |
| `/api/v1/products/**`, `/api/v1/categories/**`, `/api/v1/brands/**`, `/api/v1/units/**`, `/api/v1/customers/**`, `/api/v1/suppliers/**` | Product Service |
| `/api/v1/warehouses/**`, `/api/v1/stock/**`, `/api/v1/transfers/**`, `/api/v1/adjustments/**`, `/api/v1/stock-counts/**` | Inventory Service |
| `/api/v1/sales/**`, `/api/v1/pos/**`, `/api/v1/quotations/**`, `/api/v1/purchases/**` | Sales / POS Service |
| `/api/v1/payments/**`, `/api/v1/accounts/**`, `/api/v1/expenses/**`, `/api/v1/deposits/**` | Payment Service |
| `/api/v1/payments/stripe/webhook` **(public)** | Payment Service — Stripe webhook, rate-limited |
| `/api/v1/reports/**` | Report Service |

## 7. Smoke-test with curl

```bash
# Login
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@smartpos.local","password":"Admin@12345"}' | jq

# Copy accessToken, then:
TOKEN=<paste>
curl -s http://localhost:8080/api/v1/auth/me                  -H "Authorization: Bearer $TOKEN" | jq
curl -s http://localhost:8080/api/v1/users                    -H "Authorization: Bearer $TOKEN" | jq
curl -s http://localhost:8080/api/v1/roles                    -H "Authorization: Bearer $TOKEN" | jq
curl -s http://localhost:8080/api/v1/permissions              -H "Authorization: Bearer $TOKEN" | jq
curl -s http://localhost:8080/api/v1/units                    -H "Authorization: Bearer $TOKEN" | jq

# Create a product (pick a unit id from the call above)
UNIT_ID=<paste-unit-id>
curl -s -X POST http://localhost:8080/api/v1/products \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"code\":\"SKU-001\",\"name\":\"Coca-Cola 500ml\",\"cost\":0.80,\"price\":1.50,\"unitId\":\"$UNIT_ID\",\"barcodes\":[{\"barcode\":\"5449000000996\",\"barcodeType\":\"EAN13\",\"primary\":true}]}" | jq

# Scan it (Redis-cached)
curl -s http://localhost:8080/api/v1/products/by-barcode/5449000000996 -H "Authorization: Bearer $TOKEN" | jq

# Create a customer + supplier
curl -s -X POST http://localhost:8080/api/v1/customers \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Walk-in","phone":"+255700000000"}' | jq

curl -s -X POST http://localhost:8080/api/v1/suppliers \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Coca-Cola Kwanza","phone":"+255700111222"}' | jq
```

## 8. Run the frontend

```bash
cd ../../../main
npm install
npm install axios
cp .env.example .env.local
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Follow the two-step swap described in `main/src/views/smartpos/README.md`:

1. wrap the app in `<SmartPosAuthProvider>`;
2. point the `/auth/login` route to `src/views/smartpos/auth/LoginPage`.

Log in with `admin@smartpos.local` / `Admin@12345`.

---

## What's implemented

### Auth Service (port 8081)
- `POST /api/v1/auth/login`          — email/password → JWT (RS256) + refresh token
- `POST /api/v1/auth/refresh`        — rotate refresh token, issue new access token
- `POST /api/v1/auth/logout`         — revoke refresh token
- `POST /api/v1/auth/register`       — create user + emit `UserRegistered` to outbox
- `POST /api/v1/auth/password/change`— change with verify-current
- `GET  /api/v1/auth/me`             — who am I
- `GET  /.well-known/jwks.json`      — public key for other services
- Bootstrap admin on empty DB
- Account lockout on 10 failed logins
- Refresh-token rotation, device fingerprint, IP capture

### Infrastructure — NEW in Phase 6b

**Shared outbox-relay library** (`backend/libs/outbox-relay/`)
- Auto-configured starter: any service with `outbox-relay` on classpath and
  `smartpos.outbox.topic-prefix` set gets a scheduled relay job that drains
  its `outbox` table to Kafka every 1 s (configurable).
- Wire format: every Kafka message is a `KafkaEventEnvelope` JSON containing
  `eventId, aggregateType, aggregateId, eventType, source, occurredAt, payload`.
- Topic naming: `${topic-prefix}.${event-type-kebab}.v1`
  - e.g. `smartpos.sales.sale-confirmed.v1`, `smartpos.payment.payment-received.v1`
- Partition key = `aggregate_id` → in-order consumption per aggregate.
- Producer configured with `acks=all`, idempotent — exactly-once semantics
  end-to-end when combined with consumer idempotency.

**Publishing services** (auth, product, inventory, sales, payment) all relay
their outbox → Kafka automatically.

**Expanded event payloads** so downstream projections can self-describe:
- `SaleConfirmed` now carries `date, warehouseId, userId, customerId, tenantId,
  grossTotal, taxTotal, discountTotal, netTotal, currency`.
- `PaymentReceived` now carries `date, accountId, method, amountIn, amountOut,
  tenantId, currency` (in/out derived from `referenceType`).

**User Service consumer** (`UserRegisteredConsumer`)
- Listens on `smartpos.auth.user-registered.v1`.
- Calls `UserProfileService.createOrUpdateFromAuth` — idempotent save-or-update.
- Replaces the manual `SMARTPOS_USER_BOOTSTRAP_ADMIN_USER_ID` workaround.
  The old bootstrap stays as a fallback for environments without Kafka.

**Report Service consumers + projections**
- `SalesEventsConsumer` on `smartpos.sales.sale-confirmed.v1`
  → `INSERT ... ON CONFLICT DO UPDATE` on `fact_sales_daily`.
- `PaymentEventsConsumer` on `smartpos.payment.payment-received.v1`
  → upsert on `fact_payments_daily`.
- Both protected by a `processed_events(event_id PK)` idempotency log —
  re-delivered events hit a PK conflict and silently skip.

### Infrastructure — NEW in Phase 6c

**MinIO async exports** (Report Service)
- `POST /api/v1/reports/export/jobs` — enqueue, returns `{id, status: PENDING}`.
- `GET  /api/v1/reports/export/jobs/{id}` — poll; when `status = READY`,
  `fileUrl` is a MinIO presigned GET URL valid for 1 h (configurable).
- Worker: dedicated 2–4 thread pool (`exportTaskExecutor`) + a 30 s sweeper
  (`ExportWorker`) that catches PENDING orphans after a service restart.
- Object key layout: `exports/{date}/{jobId}.{pdf|xlsx|csv}` — easy lifecycle
  cleanup via S3 prefix rules.
- The legacy synchronous `GET /api/v1/reports/export` endpoint still works for
  small datasets / scripted automation.

**Sales↔Payment idempotency**
- New table `sale_payments_applied(payment_id PK, sale_id, amount, source)` —
  PK is the source Payment Service payment ID.
- Two paths now race for the same row:
  1. Synchronous `POST /sales/{id}/apply-payment` from Payment Service Feign
     callback (existing).
  2. New `PaymentEventsConsumer` on `smartpos.payment.payment-received.v1`
     in Sales Service — eventually-consistent fallback for when the Feign
     call failed (network blip, restart, etc.).
- Whichever inserts first wins; the other gets `DataIntegrityViolationException`
  and exits silently — `paid_total` is bumped exactly once.
- `ApplyPaymentRequest` body grew a `paymentId` field (Payment Service updated
  to send it); legacy clients without an ID still work but skip the dedup check.

**DLT poison-message handling**
- `KafkaErrorConfig` in each consuming service (sales, user, report) wires a
  `DefaultErrorHandler` + `DeadLetterPublishingRecoverer`.
- 3× retry with 1 s `FixedBackOff`, then publish to `<original-topic>.dlt`
  (e.g. `smartpos.sales.sale-confirmed.v1.dlt`).
- Bad payloads (`IllegalArgumentException`, Jackson errors) skip retries and
  go straight to DLT.
- Existing consumers refactored to `throw RuntimeException` on failure (was
  silent no-ack) so the error handler actually fires.
- Producer config added to user-service + report-service application.yml so
  DLT publishing has a `KafkaTemplate` to use.

**More fact consumers**
- `fact_product_sales_daily` — `SaleConfirmed` payload now carries a `lines`
  array (`productId, qty, gross, tax, net`). `FactProjectionService.applySaleLine`
  upserts each line.
- `fact_inventory_snapshot` — new `InventorySnapshotJob` (cron `0 30 1 * * *` UTC,
  configurable). Walks `/api/v1/warehouses` then paginated `/api/v1/stock/levels`
  on Inventory Service and upserts (date, product, warehouse). `unit_cost` and
  `valuation` placeholder zeros until Inventory grows a WAC projection.

### Report Service (port 8087) — NEW in Phase 6
- `GET /api/v1/reports/dashboard?warehouseId=&period=TODAY|WEEK|MONTH|YTD|...`
- `GET /api/v1/reports/sales/summary?dateFrom=&dateTo=&warehouseId=&customerId=`
- `GET /api/v1/reports/sales/top-products?limit=10`
- `GET /api/v1/reports/sales/top-customers?limit=10`
- `GET /api/v1/reports/inventory/summary?warehouseId=`
- `GET /api/v1/reports/profit-loss?dateFrom=&dateTo=`
- `GET  /api/v1/reports/export?reportKey=&format=PDF|XLSX|CSV` — sync, returns file bytes
- `POST /api/v1/reports/export/jobs` — enqueue async export, returns `{id, status}`
- `GET  /api/v1/reports/export/jobs/{id}` — poll; `fileUrl` is a MinIO presigned URL when READY
- Live aggregation via Feign to Sales / Inventory / Payment (JWT forwarded)
- **Resilient dashboard** — a single failing downstream returns zeros for its section, rest still renders
- **Redis cache**: dashboard 5 min, summaries 2 min, top-N 5 min, P&L 10 min
- Aggregation helpers added to source services:
  - Sales: `/sales/stats`, `/sales/top-products`, `/sales/top-customers`, `/sales/series`, `/purchases/stats`
  - Inventory: `/stock/summary`
  - Payment: `/payments/stats`, `/payments/by-method`, `/expenses/stats`
- Fact tables now **populated** by Kafka CDC consumers (Phase 6b/6c):
  - `fact_sales_daily`, `fact_payments_daily` — incrementally upserted on each event.
  - `fact_product_sales_daily` — per-line breakdown driven by `SaleConfirmed.lines[]`.
  - `fact_inventory_snapshot` — nightly job (`InventorySnapshotJob`, cron `0 30 1 * * *` UTC).
  - All consumers idempotent via `processed_events(event_id PK)`; poison messages
    routed to `<topic>.dlt` after 3× retry.

### Payment Service (port 8086) — NEW in Phase 5
- `POST /api/v1/payments` — record payment for SALE | PURCHASE | SALE_RETURN | PURCHASE_RETURN
- `GET /api/v1/payments?referenceType=&referenceId=&accountId=&dateFrom=&dateTo=`
- `POST /api/v1/payments/{id}/refund`
- `GET/POST/PUT /api/v1/accounts/**` — bank/cash/card/mobile-money accounts (Cash seeded)
- `GET /api/v1/accounts/{id}/ledger` — append-only double-entry ledger
- `POST /api/v1/accounts/transfers` — atomic account-to-account move
- `GET/POST /api/v1/expenses/**` + `/categories`
- `GET/POST /api/v1/deposits/**` + `/categories`
- `POST /api/v1/payments/stripe/intent` — create Stripe PaymentIntent (mock in dev)
- `POST /api/v1/payments/stripe/webhook` — **public** endpoint, webhook-idempotent
- **Pessimistic row lock** on `accounts` for every balance mutation; deadlock-safe lock ordering for transfers
- **Feign callback to Sales Service** updates `paid_total` / `payment_status` (JWT forwarded)
- Outbox events: `PaymentReceived`, `PaymentRefunded`, `ExpenseRecorded`, `DepositRecorded`

### Sales / POS Service (port 8085) — NEW in Phase 4
- `GET/POST/{id}/commit|cancel /api/v1/sales/**` — create sale + reserve stock via Feign → Inventory
- `GET /api/v1/sales/{id}/invoice.pdf` — server-rendered A4 invoice (OpenPDF)
- `POST /api/v1/sales/{id}/returns` — creates a restocking adjustment on Inventory
- `POST /api/v1/pos/sales` — **fast path**: create + reserve + commit atomically (for counter POS)
- `POST /api/v1/pos/quote` — live totals preview without persistence (for cart UI)
- `GET/POST/PUT/DELETE /api/v1/pos/drafts` — resumable cart state (JSONB)
- `GET/POST/{id}/convert/{id}/status /api/v1/quotations/**` — quote lifecycle → sale
- `GET/POST/{id}/receive /api/v1/purchases/**` — purchase orders; receiving posts a positive stock adjustment
- **PricingEngine** handles inclusive/exclusive tax and fixed/percent line + header discounts with `BigDecimal(19,4) HALF_UP`
- **Saga**: sync reservation via `spring-cloud-starter-openfeign`, JWT forwarded via `RequestInterceptor`, circuit-breaker on failure (Resilience4j)
- Outbox events: `SaleConfirmed`, `SaleCompleted`, `SaleCancelled`, `SaleReturned`, `QuotationCreated`, `PurchaseOrdered`, `PurchaseReceived`

### Inventory Service (port 8084) — NEW in Phase 3
- `GET/POST/PUT /api/v1/warehouses/**` — seeded with a default `MAIN` warehouse
- `GET /api/v1/stock?productId=&variantId=&warehouseId=` — single row
- `GET /api/v1/stock/levels?warehouseId=` — all stock rows in a warehouse
- `GET /api/v1/stock/alerts` — rows at/below their alert threshold
- `POST /api/v1/stock/reservations` — reserve stock for a saleId (idempotent, TTL-based)
- `POST /api/v1/stock/reservations/{saleId}/commit` — finalise sale (deduct on_hand)
- `DELETE /api/v1/stock/reservations/{saleId}` — release (sale cancelled)
- `GET/POST/{id}/complete /api/v1/transfers/**` — atomic inter-warehouse moves
- `GET/POST /api/v1/adjustments/**` — signed stock deltas with reason
- `POST /api/v1/stock-counts` → `/{id}/lines` → `/{id}/post` — physical inventory wizard
- **Pessimistic row locking** (`SELECT ... FOR UPDATE` with 3 s timeout) on every stock write
- **Stock-movements ledger** — append-only audit trail (BRIN-indexed)
- **Scheduled job** releases expired reservations every 30 s
- Outbox events: `StockReserved`, `StockDeducted`, `StockReleased`, `StockReservationExpired`, `TransferCompleted`, `AdjustmentPosted`, `StockCountPosted`

### Product Service (port 8083) — NEW in Phase 2
- `GET    /api/v1/products?search=&categoryId=&brandId=&status=&page=&size=&sort=`
- `POST   /api/v1/products` (with variants + barcodes in one call)
- `GET    /api/v1/products/{id}`
- `PUT    /api/v1/products/{id}`
- `DELETE /api/v1/products/{id}` (soft delete)
- `GET    /api/v1/products/by-barcode/{barcode}` — Redis-cached POS hot path
- `GET/POST/PUT/DELETE /api/v1/categories`
- `GET/POST/PUT/DELETE /api/v1/brands`
- `GET/POST/PUT/DELETE /api/v1/units` (9 retail units pre-seeded)
- `GET/POST/PUT/DELETE /api/v1/customers` (pg_trgm fuzzy search)
- `GET/POST/PUT/DELETE /api/v1/suppliers` (pg_trgm fuzzy search)
- Outbox events: `ProductCreated`, `ProductUpdated`, `ProductDeleted`
- Redis caches: `product`, `product-barcode`, `category`, `brand`, `unit` — all evicted on write

### User Service (port 8082)
- `GET/POST/PUT/DELETE /api/v1/roles`
- `PUT /api/v1/roles/{id}/permissions`
- `GET /api/v1/permissions` (42 permissions seeded from the legacy Stocky schema)
- `GET /api/v1/users` (search + pagination)
- `GET/PUT /api/v1/users/{id}`
- `PATCH /api/v1/users/{id}/status`
- `PUT /api/v1/users/{id}/warehouses`
- System roles: **ADMIN** (all perms), **CASHIER** (POS-focused)
- JWT verification via Auth Service's JWKS, `@PreAuthorize` on every endpoint

### Gateway (port 8080)
- Public passthrough for login/refresh/register/JWKS
- JWT required for everything else (verified against JWKS)
- Redis-backed IP rate-limit on `/auth/login` & friends (20 req/s burst 40)
- Global CORS for the frontend dev server

### Frontend (in `main/`)
- `src/api/smartpos/client.ts` — axios with JWT attach + silent 401 refresh
- `src/api/smartpos/auth.ts`   — `login`, `logout`, `fetchMe`, `fetchMyProfile`
- `src/context/smartpos/AuthContext.tsx` — provider + `useAuth()` hook
- `src/routes/smartpos/RequireAuth.tsx` — `<RequireAuth perm="…">` + `<PermissionGate>`
- `src/views/smartpos/auth/LoginPage.tsx` — real login that calls the backend

## Demo Data Seeder

Use the API-based seeder to create realistic Tanzania retail records through the Gateway. It creates demo warehouses, accounts, categories, brands, products, customers, suppliers, opening stock, purchases, POS sales, payments, expenses, and returns.

```bash
node smartpos/tools/demo-seed.mjs
```

Defaults:

- Gateway: `http://localhost:8080`
- Admin: `admin@smartpos.local`
- Password: `Admin@12345`
- Currency: `TZS`
- Products: `72`
- Customers: `45`
- Suppliers: `18`
- Purchases: `18`
- Sales: `120`
- Expenses: `40`
- Returns: `8`

Override counts and credentials with environment variables:

```bash
SMARTPOS_API_BASE_URL=http://localhost:8080 \
SMARTPOS_ADMIN_EMAIL=admin@smartpos.local \
SMARTPOS_ADMIN_PASSWORD=Admin@12345 \
SMARTPOS_DEMO_PRODUCTS=150 \
SMARTPOS_DEMO_CUSTOMERS=100 \
SMARTPOS_DEMO_SUPPLIERS=30 \
SMARTPOS_DEMO_PURCHASES=40 \
SMARTPOS_DEMO_SALES=300 \
SMARTPOS_DEMO_EXPENSES=80 \
SMARTPOS_DEMO_RETURNS=20 \
node smartpos/tools/demo-seed.mjs
```

Each run uses a timestamped run code by default, so running the script again adds a new visible batch of demo data instead of trying to reuse old records. Set `SMARTPOS_DEMO_RUN_CODE=MYRUN01` if you want a predictable prefix.

## What's next (per ARCHITECTURE_PLAN.md)

- Phase 6b: outbox relay — drain all **six** `outbox` tables into Kafka
  (`smartpos.<domain>.<event>.v1` topics). Then:
  - Report Service populates `fact_*` tables from events (replacing live Feign aggregation).
  - Sales Service consumes `PaymentReceived` events (replacing the Feign callback).
  - User Service auto-creates profiles from `UserRegistered` events.
  - Async export jobs write to MinIO and return a presigned download URL.
- Phase 7: **Frontend big push** — back-office CRUD pages + POS terminal.
- Phase 4: Sales / POS Service + POS terminal UI.
- Phase 5: Payment Service + Stripe.
- Phase 6: Report Service + dashboards.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Auth Service fails to start with "FATAL: database 'auth_db' does not exist" | `docker compose down -v && docker compose up -d` — the init script only runs on a fresh volume. |
| JWT is 401 at Gateway right after login | Token rotated by refresh → clear `localStorage` and log in again. |
| User Service `/users/{id}` returns 404 for the admin | Admin profile bootstrap skipped — set `smartpos.user.bootstrap.admin-user-id` and restart. |
| Frontend CORS error | Gateway is on :8080 but you hit 8081/8082 directly; route traffic through :8080. |
