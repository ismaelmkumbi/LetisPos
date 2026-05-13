CREATE TABLE verification_tokens (
    id              UUID NOT NULL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    channel         VARCHAR(10) NOT NULL CHECK (channel IN ('EMAIL', 'PHONE')),
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts        INTEGER NOT NULL DEFAULT 0,
    used_at         TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token_hash ON verification_tokens(token_hash);
