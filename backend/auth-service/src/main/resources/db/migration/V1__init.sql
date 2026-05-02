-- Auth Service — initial schema
-- Identity store only. Profile data lives in user_db.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id                     UUID        PRIMARY KEY,
    email                  CITEXT      NOT NULL,
    username               CITEXT,
    password_hash          TEXT        NOT NULL,
    status                 VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    failed_login_attempts  INT         NOT NULL DEFAULT 0,
    last_login_at          TIMESTAMPTZ,
    tenant_id              UUID,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    version                BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT users_status_chk CHECK (status IN ('ACTIVE','LOCKED','PENDING','DISABLED'))
);

CREATE UNIQUE INDEX idx_users_email  ON users (email);
CREATE UNIQUE INDEX idx_users_username ON users (username) WHERE username IS NOT NULL;

CREATE TABLE refresh_tokens (
    id                   UUID        PRIMARY KEY,
    user_id              UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash           TEXT        NOT NULL,
    device_fingerprint   TEXT,
    user_agent           TEXT,
    ip_address           VARCHAR(64),
    expires_at           TIMESTAMPTZ NOT NULL,
    revoked_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id, expires_at);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash);

CREATE TABLE password_reset_tokens (
    id          UUID        PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pwd_reset_user ON password_reset_tokens (user_id);
CREATE INDEX idx_pwd_reset_hash ON password_reset_tokens (token_hash);

-- Outbox for reliable UserRegistered / PasswordChanged events
CREATE TABLE outbox (
    id             UUID        PRIMARY KEY,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id   UUID        NOT NULL,
    event_type     VARCHAR(80) NOT NULL,
    payload        JSONB       NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ
);
CREATE INDEX idx_outbox_unpublished ON outbox (created_at) WHERE published_at IS NULL;
