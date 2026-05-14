package io.smartpos.auth.domain.repository;

import io.smartpos.auth.domain.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(String hash, Instant now);
    long countByUserIdAndUsedAtIsNullAndCreatedAtAfter(UUID userId, Instant after);
}
