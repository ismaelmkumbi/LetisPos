# Document & Print Management System — Setup Guide

## Overview

The `document-service` is a Spring Boot microservice that powers the entire Document & Print Management System for LetisPOS. It generates professionally branded A4 PDFs via Gotenberg (Chromium headless), manages 34 document templates, and handles delivery (email, WhatsApp, print).

**Port:** 8093  
**Database:** `documents_db` (PostgreSQL)  
**Dependencies:** Gotenberg (Docker, port 3000), MinIO (port 9000)

---

## Quick Start (Local Development)

### 1. Start Infrastructure

```bash
# Start PostgreSQL, MinIO, Redis, Kafka
cd /path/to/LetisPos && make dev-infra

# Start Gotenberg
make gotenberg-up
```

### 2. Create Database

```bash
docker exec smartpos-postgres psql -U smartpos -d postgres <<SQL
CREATE ROLE documents_user WITH LOGIN PASSWORD 'documents_pass';
CREATE DATABASE documents_db OWNER documents_user;
GRANT ALL PRIVILEGES ON DATABASE documents_db TO documents_user;
SQL
```

### 3. Start document-service

```bash
cd backend && mvn spring-boot:run -pl document-service
```

The service starts on port **8093**. Flyway auto-migrates the database on first start.

### 4. Verify

```bash
curl http://localhost:8093/actuator/health
# {"status":"UP"}
```

---

## Production Deployment

### Systemd Unit

Create `/etc/systemd/system/letispos-document.service`:

```ini
[Unit]
Description=LetisPOS Document Service
After=network.target

[Service]
User=deploy
WorkingDirectory=/var/www/LetisPos/backend
ExecStart=/usr/bin/mvn -pl document-service spring-boot:run
Restart=always
RestartSec=10
Environment="SPRING_PROFILES_ACTIVE=production"

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now letispos-document
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5434/documents_db` | PostgreSQL URL |
| `DB_USER` | `documents_user` | DB username |
| `DB_PASSWORD` | `documents_pass` | DB password |
| `AUTH_JWKS_URI` | `http://localhost:8081/.well-known/jwks.json` | Auth JWKS URI |
| `MINIO_ENDPOINT` | `http://localhost:9000` | MinIO endpoint |
| `MINIO_ACCESS_KEY` | `smartpos` | MinIO access key |
| `MINIO_SECRET_KEY` | `smartpos-secret` | MinIO secret key |
| `MINIO_BUCKET` | `smartpos-documents` | MinIO bucket name |
| `GOTENBERG_URL` | `http://localhost:3000` | Gotenberg base URL |
| `TRA_VFD_URL` | `http://localhost:9999/vfd` | TRA VFD API URL |
| `TRA_VFD_API_KEY` | `stub-key` | TRA VFD API key |
| `TRA_SELLER_TIN` | `123-456-789` | Company TIN |
| `TRA_VAT_REG` | `VAT-123456` | VAT registration number |
| `PRINTER_MAIN_ENABLED` | `false` | Enable ESC/POS printer |
| `PRINTER_MAIN_IP` | `192.168.1.100` | Thermal printer IP |
| `PRINTER_MAIN_PORT` | `9100` | Thermal printer port |

### CI/CD

The service is auto-deployed via GitHub Actions. On push to `main`:

1. CI detects changes in `backend/document-service/**`
2. Maven builds `document-service` module
3. VPS runs `systemctl restart letispos-document`

---

## Architecture

```
Frontend (React)
  │ POST /api/v1/documents/generate
  ▼
Gateway (port 8080)
  │ route: /api/v1/documents/**,/api/v1/templates/**,/api/v1/print/**
  ▼
document-service (port 8093)
  ├── Handlebars templates (34 .hbs files)
  ├── TemplateCompiler (JSON block config → HTML)
  ├── GotenbergClient (HTML → PDF via Chromium)
  ├── MinioObjectStore (PDF storage + presigned URLs)
  ├── VfdClient (TRA fiscal device)
  ├── AiServiceClient (LLM summarization, anomaly detection)
  ├── VfdService (ESC/POS commands)
  ├── DeliveryService (email/WhatsApp via notification-service)
  └── BulkGenerationService (@Async batch PDF generation)
       │
       ▼
  PostgreSQL (documents_db)
    ├── documents (generated PDF metadata)
    ├── document_versions (version history)
    ├── template_overrides (per-tenant template customization)
    ├── template_versions (template edit history)
    ├── bulk_jobs (async bulk generation)
    └── V6-V9 migrations (TRA compliance, delivery, notes, search index)
```

---

## Database Migrations

| Version | Table/Change |
|---|---|
| V1 | `documents` + `template_overrides` |
| V2 | `document_versions` |
| V3 | `template_versions` |
| V4 | `bulk_jobs` |
| V5 | Search index `idx_documents_search` |
| V6 | `summary` column (AI) |
| V7 | TRA compliance columns (`fiscal_code`, `z_number`, etc.) |
| V8 | `delivery_channel` + `delivery_recipient` on bulk_jobs |
| V9 | `notes` column (internal staff notes) |

---

## API Reference

### Documents
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/documents/generate` | Generate PDF, store in MinIO |
| POST | `/api/v1/documents/preview` | Preview PDF without saving |
| GET | `/api/v1/documents/{id}` | Document metadata + download URL |
| GET | `/api/v1/documents/{id}/pdf` | Download PDF bytes |
| GET | `/api/v1/documents/search` | Search with filters |
| POST | `/api/v1/documents/{id}/email` | Email PDF |
| POST | `/api/v1/documents/{id}/whatsapp` | WhatsApp PDF |
| POST | `/api/v1/documents/{id}/summarize` | AI summary |
| POST | `/api/v1/documents/{id}/anomalies` | Anomaly detection |
| POST | `/api/v1/documents/field-map` | AI field mapping |
| POST | `/api/v1/documents/bulk` | Bulk generate (async) |
| GET | `/api/v1/documents/bulk/{jobId}` | Bulk job status |
| GET | `/api/v1/documents/bulk/{jobId}/download` | Bulk ZIP download |
| GET | `/api/v1/documents/{id}/versions` | Version history |
| PUT | `/api/v1/documents/{id}/notes` | Internal notes |

### Templates
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/templates` | List all templates |
| GET | `/api/v1/templates/{type}` | Get resolved template |
| PUT | `/api/v1/templates/{type}` | Save override |
| DELETE | `/api/v1/templates/{type}` | Remove override |
| POST | `/api/v1/templates/{type}/preview` | Preview PDF |
| POST | `/api/v1/templates/{type}/assist` | AI template assistant |
| GET | `/api/v1/templates/{type}/versions` | Template version history |
| POST | `/api/v1/templates/{type}/rollback` | Rollback template |

### Print
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/print/printers` | List ESC/POS printers |
| POST | `/api/v1/print/thermal` | Print to thermal printer |
| POST | `/api/v1/print/thermal/test` | Test print |

---

## Troubleshooting

**404 on generate:**
- Check document-service is running: `systemctl status letispos-document`
- Check gateway route: `grep -A3 document-service backend/gateway/src/main/resources/application.yml`
- Check port: document-service uses **8093** (not 8088 — that's Kafka UI)

**PDF generation fails:**
- Check Gotenberg is running: `docker ps | grep gotenberg`
- Check MinIO bucket exists: `curl http://localhost:9001` (MinIO console)

**Database errors:**
- Check Flyway ran: look for `flyway_schema_history` in `documents_db`
- Check user exists: `docker exec smartpos-postgres psql -U smartpos -c "\du"`

**Templates rendering with blank data:**
- The Feign clients need the corresponding services running (sales-service for sale data, etc.)
- If services are down, documents still generate but with placeholder data
