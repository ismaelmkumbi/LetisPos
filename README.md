# LetisPos

Modern point-of-sale and inventory platform for East African SMEs.
Replaces the legacy PHP Stocky stack with a Spring Boot microservice
backend and a React + TypeScript frontend.

## Layout

```
LetisPos/
├── smartpos/          # Backend — Spring Boot microservices + infra
│   ├── backend/       # Maven multi-module project (gateway + 11 services)
│   ├── infra/         # docker-compose: Postgres, Redis, Kafka, MinIO, Jaeger
│   └── tools/         # demo seeders, ops scripts
└── main/              # Frontend — React 18 + Vite + MUI v5 + TanStack Table
```

## Backend services

| Service               | Port | Role                                                        |
| --------------------- | ---- | ----------------------------------------------------------- |
| gateway               | 8080 | Spring Cloud Gateway — single entry, JWT, rate-limit        |
| auth-service          | 8081 | Login, refresh, JWKS                                        |
| user-service          | 8082 | Users, roles, i18n admin                                    |
| product-service       | 8083 | Catalog, brands, categories, units, serials                 |
| inventory-service     | 8084 | Warehouses, stock, transfers, adjustments, counts           |
| sales-service         | 8085 | Sales, POS, quotations, returns, recurring invoices         |
| payment-service       | 8086 | Payments, accounts, expenses, financials                    |
| report-service        | 8087 | Reporting & analytics                                       |
| notification-service  | 8089 | Templates & deliveries                                      |
| hrm-service           | 8090 | Employees, attendance, leave, payroll                       |
| ai-service            | 8091 | Insights & assistants (DeepSeek / OpenAI / Anthropic)       |
| integration-service   | 8092 | Webhooks & 3rd-party integrations                           |

Service discovery: **none** — gateway routes to fixed URIs (env-overridable).
This is intentional for single-instance deployments; switch to Kubernetes
Services if you need horizontal scaling.

## Quick start

```bash
# 1. Infra
cd smartpos/infra && docker compose up -d

# 2. Backend (one shell per service, or use a Procfile/foreman)
cd smartpos/backend
mvn -DskipTests install
DB_URL='jdbc:postgresql://localhost:5434/auth_db' \
  mvn -pl auth-service -am spring-boot:run
# …repeat for each service with its own DB_URL

# 3. Frontend
cd main
npm install
npm run dev   # http://localhost:5173
```

Postgres on host port **5434**, Redis on **6379**.

## Tech stack

- **Backend**: Java 21, Spring Boot 3, Spring Cloud Gateway, Spring Security
  (OAuth2 resource server / JWT), JPA/Hibernate, Flyway, Kafka, Redis,
  MinIO, OpenTelemetry → Jaeger
- **Frontend**: React 18, TypeScript, Vite, MUI v5, TanStack Table,
  i18next, Recharts/ApexCharts, React Router 6
- **Database**: PostgreSQL 16 (one schema per service)
- **Infra**: Docker Compose locally; production-ready for Kubernetes

## Status

Early-stage product. Active development.
