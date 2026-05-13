# Signup Verification with Email & Phone

**Date**: 2026-05-13
**Status**: Draft

## Overview

Add verification step to registration: users choose email or phone at signup, receive a verification link (email via Resend) or OTP code (phone via Twilio). Users are created as PENDING and cannot log in until verified.

## Verification Flow

```
Registration wizard (steps 1-2 unchanged)
  → Step 3: Admin account
    → [Email] [Phone] toggle
    → Email selected: email input
    → Phone selected: phone number + country code input
  → Submit → POST /api/v1/auth/register
    → User created with status=PENDING
    → Verification token generated (24h TTL for email, 10min for phone OTP)
    → Email: Resend sends verification link
    → Phone: Twilio sends 6-digit OTP
  → Redirect to /auth/verify-sent
    → Email channel: "Check your email" with resend button
    → Phone channel: OTP input with resend button
  → User verifies:
    → Email: clicks link → /auth/verify?token=xxx → API call → success → redirect to login
    → Phone: enters OTP on verify-sent page → API call → success → redirect to login
```

## Backend Changes (auth-service)

### Database

**New table: `verification_tokens`**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → users, NOT NULL |
| token_hash | VARCHAR(255) | SHA-256 of random token, NOT NULL |
| channel | VARCHAR(10) | EMAIL or PHONE |
| expires_at | TIMESTAMP | NOT NULL |
| attempts | INTEGER | Default 0, for phone OTP retry tracking |
| used_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | NOT NULL |

**Modified: `users`** — add `phone_number VARCHAR(20)` nullable.

### Dependencies

- `com.resend:resend-java` — Resend Java SDK
- `com.twilio.sdk:twilio` — Twilio SDK

### Configuration (env vars)

- `RESEND_API_KEY` — Resend API key
- `RESEND_FROM_ADDRESS` — defaults to `onboarding@resend.dev`
- `TWILIO_ACCOUNT_SID` — Twilio account SID
- `TWILIO_AUTH_TOKEN` — Twilio auth token
- `TWILIO_PHONE_NUMBER` — Sender phone number
- `APP_BASE_URL` — Frontend base URL for generating verification links (e.g., `https://app.smartpos.local`)

### Modified Use Case

**`RegisterUserUseCase`**
- Accepts `channel` (EMAIL/PHONE) and optional `phoneNumber`
- Sets user status to PENDING (was ACTIVE)
- Calls `SendVerificationUseCase` after persisting user
- Skips auto-login (user must verify first)

### New Use Cases

**`SendVerificationUseCase`**
- Generates 48-byte random token, stores SHA-256 hash
- Email: calls Resend API with verification link (`{baseUrl}/auth/verify?token={rawToken}`)
- Phone: calls Twilio API with 6-digit OTP
- Enforces 60s resend cooldown per user
- Max 5 verification attempts per user

**`VerifyUserUseCase`**
- Looks up token by hash
- Validates: not expired, not used, not exceeded attempts (phone, max 3)
- Phone: increments attempt counter on mismatch
- On success: marks user ACTIVE, marks token used
- Returns the user's email/phone for display

### New API Endpoints

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/auth/verify` | `{ token, code? }` | Verify email (token) or phone (token + code) |
| POST | `/api/v1/auth/resend-verification` | `{ userId }` | Resend verification email/SMS |

### Gateway Whitelist

Add to unauthenticated paths:
- `POST /api/v1/auth/verify`
- `POST /api/v1/auth/resend-verification`

## Frontend Changes

### Modified: Registration Step 3 (`AuthRegister.tsx`)

Add channel toggle (Email / Phone) at top of admin account step. Phone mode shows country code dropdown + phone number input instead of email input. Submit payload includes `channel` and `phoneNumber` when phone selected.

### New Page: Verification Sent (`/auth/verify-sent`)

- Receives `channel` and `userId` via navigation state or query params
- Email mode: illustration + "Check your email at {email}" + "Resend email" button (60s cooldown)
- Phone mode: "Enter the 6-digit code sent to {phone}" + OTP input (6 digits, auto-submit on 6th) + "Resend code" button (60s cooldown)
- Resend calls `POST /api/v1/auth/resend-verification`
- On successful verification, redirects to `/auth/login` with success message

### New Page: Verify Processing (`/auth/verify`)

- Reads `token` from query params
- Immediately calls `POST /api/v1/auth/verify` with token
- Shows spinner while processing
- Success: "Account verified! Redirecting to login..."
- Error: shows error message with link to resend
- For phone OTP: verification happens on the verify-sent page itself (no deep link)

### Routing

| Path | Page | Layout |
|------|------|--------|
| `/auth/verify-sent` | VerificationSent | BlankLayout |
| `/auth/verify` | VerifyProcessing | BlankLayout |

## Edge Cases

- **Re-registration with same email/phone**: Return generic "If an account exists, a verification has been sent" to prevent enumeration
- **Token already used**: "This link has already been used. Please log in."
- **Token expired**: "This link has expired. Request a new one."
- **Invalid token**: "Invalid verification link."
- **Phone OTP max attempts (3)**: Token invalidated, must resend
- **Resend cooldown**: 60s enforced server-side
- **Max verification attempts (5)**: Prevents abuse, returns generic success message
- **Already verified**: "Account already verified. Please log in."

## Scope

This design covers verification during signup only. Login-time 2FA, forgot password, and password reset are out of scope for this spec.
