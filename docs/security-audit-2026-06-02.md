# Security Audit Report — LetisPos

**Date:** 2026-06-02  
**Scope:** Full codebase scan (~16 microservices, SPA frontend, config, auth, tests)  
**Methodology:** Static analysis of config files (32+ application YAMLs), Java source (10+ SecurityConfig files, auth filters), frontend auth client, test files, and git commit history

---

## Summary

| Severity | Count | 
|----------|-------|
| **HIGH** | 3 |
| **MEDIUM** | 4 |
| LOW | 2 |

---

## 🔴 HIGH Severity

### V1: Shared Internal Secret Identical Across All Microservices

| Field | Value |
|-------|-------|
| **Confidence** | 10/10 |
| **Category** | Insecure Defaults / Hardcoded Secrets |
| **File** | All 10+ `backend/*/src/main/resources/application.yml` (e.g., `ai-service:70`, `auth-service:121`, `billing-service:35`, `notification-service:78`, `user-service:63`, `hrm-service:39`, `integration-service:50`, `crm-service:27`) |

**Description:** Every microservice shares the same internal auth secret: `dev-internal-token-change-me`. The `X-Internal-Token` header is accepted by multiple services (UserController, billing) for privileged inter-service calls. Any compromised service can impersonate any other service across the fleet.

**Exploit Scenario:** An attacker with RCE or SSRF in one service sends `X-Internal-Token: dev-internal-token-change-me` to any other service's internal endpoint, gaining privileged access to user data, billing operations, etc.

**Recommendation:** Generate a unique, cryptographically random (64+ char) secret per environment. Use different secrets per service pair or adopt mTLS for service-to-service auth. Add a startup-time guard that rejects the known default in production profiles.

---

### V2: Customer JWT Signed with Weak HMAC Secret, No Expiry

| Field | Value |
|-------|-------|
| **Confidence** | 10/10 |
| **Category** | Weak Cryptography / Hardcoded Secrets |
| **Files** | `backend/commerce-service/src/main/resources/application.yml:66` — `backend/commerce-service/src/main/java/io/smartpos/commerce/application/CustomerAuthService.java:26` |

**Description:** Customer JWTs are signed with HMAC-SHA256 using a default secret `commerce-customer-jwt-secret-change-me`. The `CustomerAuthService` builds JWTs via string concatenation of Base64-encoded header/payload (no standard JWT library), has no `exp` claim — tokens are valid forever.

**Exploit Scenario:** Anyone who discovers the secret can forge valid customer tokens for any store and any customer, gaining access to order history, addresses, and checkout-as-another-customer.

**Recommendation:**
1. Rotate to a 256+ bit random secret in production
2. Use `jjwt` (already in the dependency tree) instead of manual JWT construction
3. Add an `exp` claim (e.g., 15-30 minute TTL)
4. Consider RS256 so compromise of one service doesn't leak the signing key

---

### V3: Refresh Cookie Missing `Secure` Flag by Default

| Field | Value |
|-------|-------|
| **Confidence** | 10/10 |
| **Category** | Insecure Cookie Configuration |
| **Files** | `backend/auth-service/src/main/resources/application.yml:101` (`REFRESH_COOKIE_SECURE: false`) — `backend/auth-service/src/main/java/io/smartpos/auth/infrastructure/security/RefreshTokenCookies.java:29-30` |

**Description:** The refresh token cookie is HttpOnly and SameSite=Lax (good) but the `Secure` flag defaults to `false`. On any HTTPS production deployment, the cookie will be transmitted over plain HTTP if a user follows an `http://` link or if a MITM downgrades the connection. This leaks the long-lived refresh token.

**Exploit Scenario:** A network attacker performs SSLstrip on a user session; the refresh cookie is captured in cleartext and used to generate new access tokens indefinitely.

**Recommendation:** Change the default to `REFRESH_COOKIE_SECURE: true` and enforce it in every production deployment.

---

## 🟡 MEDIUM Severity

### V4: Product Service — `spring.jpa.open-in-view: true`

| Field | Value |
|-------|-------|
| **Confidence** | 10/10 |
| **Category** | Data Exposure |
| **File** | `backend/product-service/src/main/resources/application.yml:39` |

**Description:** Hibernate session stays open through response serialization. Lazy collections (e.g., `barcodes`) materialize during JSON serialization, potentially exposing data not intended for the API response and enabling N+1 query attacks.

**Recommendation:** Set `open-in-view: false` and use explicit DTOs or `@EntityGraph`/`JOIN FETCH` for all serialized paths.

---

### V5: User Service — `spring.jpa.open-in-view: true`

| Field | Value |
|-------|-------|
| **Confidence** | 10/10 |
| **Category** | Data Exposure |
| **File** | `backend/user-service/src/main/resources/application.yml:28` |

**Description:** Same issue as V4 but in the service handling PII (names, emails, phone numbers). Lazy-loaded user profile data can be inadvertently serialized into API responses.

**Recommendation:** Set `open-in-view: false`.

---

### V6: All Services Expose Full Error Details

| Field | Value |
|-------|-------|
| **Confidence** | 10/10 |
| **Category** | Information Disclosure |
| **File** | All `backend/*/src/main/resources/application.yml` (e.g., `product-service:4`) |

**Description:** All microservices expose full error messages via `include-message: always`. The `auth-service` additionally exposes `include-binding-errors: always`. The `document-service` sets `include-exception: true`, leaking full stack traces with internal package names, DB query details, and framework internals.

**Exploit Scenario:** An attacker sends malformed requests to enumerate internal package structure, discover endpoint parameters, and gain reconnaissance data for targeted attacks.

**Recommendation:** Set `include-message: never`, `include-exception: false`, `include-stacktrace: never` in production. Log errors server-side.

---

### V11: Multiple Weak/Placeholder Default Secrets Across Configs

| Field | Value |
|-------|-------|
| **Confidence** | 10/10 |
| **Category** | Weak Default Secrets |
| **Files** | `backend/product-service:85-86` (MinIO `smartpos`/`smartpos-secret`) — `backend/ai-service:8-9` (MinIO) — `backend/document-service:52-53` (MinIO), `:70` (`stub-key` for TRA VFD) — `backend/commerce-service:70` (`change-me-in-production` for cart cookie signing) — `backend/control-hub:18` (`change-me` for hub agent secret) |

**Description:** Multiple services embed weak or obvious default secrets: MinIO credentials, TRA VFD API key, hub agent secret, and cart cookie signing key. Any production deployment not overriding these via environment variables is trivially compromised.

**Recommendation:** Verify all production deployments override every one of these values. Add startup-time checks that reject known weak defaults when running in a production profile.

---

## 🔵 LOW Severity

### V12: SameSite=Lax (Not Strict) on Refresh Cookie

| Field | Value |
|-------|-------|
| **Confidence** | 8/10 |
| **Category** | Cookie Security |
| **File** | `backend/auth-service/src/main/java/io/smartpos/auth/infrastructure/security/RefreshTokenCookies.java:28` |

**Description:** SameSite is set to `Lax` rather than `Strict`. Combined with the non-Secure default (V3), this opens a narrow CSRF-in-GET attack window against the auth service.

**Recommendation:** Consider SameSite=Strict if no legitimate cross-site GET flows exist for auth endpoints.

---

### V13: Swagger/OpenAPI Publicly Accessible

| Field | Value |
|-------|-------|
| **Confidence** | 9/10 |
| **Category** | Information Disclosure |
| **Files** | `backend/gateway/src/main/java/io/smartpos/gateway/SecurityConfig.java:52-69` — All downstream `SecurityConfig.java` files |

**Description:** Every downstream service permits unauthenticated access to `/v3/api-docs/**` and `/swagger-ui/**`, exposing the full API surface, parameter schemas, and example payloads.

**Recommendation:** Gate Swagger docs behind authentication or disable them in a production Spring profile.

---

## Current Working Tree Changes

The uncommitted files in the working tree contain **no new security issues**:

- `frontend/tests/logo-generation-test.ts` — pure SVG generation logic, no external API calls, no credentials, no network requests
- `*.jsonl` pending-insights files — track file edits, no secrets
- `frontend/test-results/.last-run.json` — contains only `{"status":"failed","failedTests":[]}`
- `frontend/test-results/control-center.png` — test screenshot being deleted

---

## Positive Findings

- Access token stored in a JavaScript variable (in-memory) with localStorage as fallback — reduces XSS exposure vs. localStorage-only
- Refresh token correctly HttpOnly and path-scoped to `/api/v1/auth`
- Cross-tab refresh serialization uses the Web Locks API to prevent token rotation races
- Gateway CORS configuration reasonably scoped (localhost dev patterns + known production domains)
- All services correctly use OAuth2 resource server with JWKS-based JWT validation
