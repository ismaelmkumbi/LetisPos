# LetisPOS — Developer Commands
# ================================

.PHONY: dev dev-infra dev-backend dev-frontend build build-backend build-frontend test lint docker-up docker-down clean help gotenberg-up gotenberg-down

# ── Development ────────────────────────────────────────────────────────────────

dev: dev-infra  ## Start infrastructure + run all services locally
	@echo "Starting backend services (each in its own terminal)..."
	@echo "Run: cd backend && mvn -q spring-boot:run -pl gateway &"
	@echo "Or open each service separately."

dev-infra:  ## Start PostgreSQL, Redis, Kafka, MinIO, Mailhog, Jaeger, Gotenberg
	docker compose -f ops/infra/docker-compose.yml up -d
	$(MAKE) gotenberg-up
	@echo "Infra ready. Postgres: 5434 | Redis: 6379 | Kafka: 9094 | Kafka UI: http://localhost:8088 | MinIO: http://localhost:9001 | MailHog: http://localhost:8025 | Jaeger: http://localhost:16686 | Gotenberg: http://localhost:3000"

dev-backend:  ## Start all backend services via Maven (foreground)
	cd backend && mvn -q spring-boot:run -pl gateway &
	sleep 5
	cd backend && mvn -q spring-boot:run -pl auth-service &
	cd backend && mvn -q spring-boot:run -pl user-service &
	cd backend && mvn -q spring-boot:run -pl product-service &
	cd backend && mvn -q spring-boot:run -pl inventory-service &
	cd backend && mvn -q spring-boot:run -pl sales-service &
	cd backend && mvn -q spring-boot:run -pl payment-service &
	cd backend && mvn -q spring-boot:run -pl report-service &
	cd backend && mvn -q spring-boot:run -pl notification-service &
	cd backend && mvn -q spring-boot:run -pl hrm-service &
	cd backend && mvn -q spring-boot:run -pl ai-service &
tcd backend && mvn -q spring-boot:run -pl commerce-service &
	cd backend && mvn -q spring-boot:run -pl integration-service &
	cd backend && mvn -q spring-boot:run -pl document-service &
	@echo "All services starting..."

dev-frontend:  ## Start frontend dev server
	cd frontend && npm run dev

# ── Build ──────────────────────────────────────────────────────────────────────

build: build-backend build-frontend  ## Build everything

build-backend:  ## Compile + package all backend services
tcd backend && mvn -DskipTests package -pl commerce-service -am
	cd backend && mvn -q -DskipTests clean package

build-frontend:  ## Build frontend for production
	cd frontend && npm ci && npm run build

# ── Test ───────────────────────────────────────────────────────────────────────

test: test-backend test-frontend  ## Run all tests

test-backend:  ## Run all backend tests
	cd backend && mvn clean test

test-frontend:  ## Lint + type-check frontend (no test runner configured yet)
	cd frontend && npm run lint
	cd frontend && npx tsc --noEmit

# ── Lint ───────────────────────────────────────────────────────────────────────

lint: lint-backend lint-frontend  ## Lint everything

lint-backend:  ## Checkstyle / PMD (placeholder — not yet configured)
	@echo "Backend lint: no static analysis configured yet."

lint-frontend:  ## ESLint
	cd frontend && npm run lint

# ── Docker ─────────────────────────────────────────────────────────────────────

docker-build:  ## Build all service images with Jib (requires Docker for Testcontainers)
	cd backend && mvn -q -DskipTests compile com.google.cloud.tools:jib-maven-plugin:3.4.3:dockerBuild

docker-up:  ## Start full production stack locally
	docker compose -f ops/docker-compose.prod.yml up -d

docker-down:  ## Stop full production stack
	docker compose -f ops/docker-compose.prod.yml down

docker-logs:  ## Tail production stack logs
	docker compose -f ops/docker-compose.prod.yml logs -f

gotenberg-up:  ## Start Gotenberg (HTML-to-PDF engine)
	docker run -d --name gotenberg -p 3000:3000 gotenberg/gotenberg:8

gotenberg-down:  ## Stop Gotenberg
	docker rm -f gotenberg

# ── Clean ────────────────────────────────────────────────────────────────────────

clean:  ## Remove all build artifacts
	cd backend && mvn clean
	rm -rf frontend/dist frontend/node_modules/.vite
	@echo "Clean complete."

# ── Dev Dashboard ───────────────────────────────────────────────────────────────

status:  ## Terminal live status of all services
	@bash ops/tools/dev-dashboard.sh status

status-ui:  ## Start browser dashboard at http://localhost:9999
	@bash ops/tools/dev-status-ui.sh

restart:  ## Restart a service. Usage: make restart svc=ai-service
	@bash ops/tools/dev-dashboard.sh restart $(svc)

# ── Help ────────────────────────────────────────────────────────────────────────

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'
