package io.smartpos.auth.domain.repository;

import io.smartpos.auth.domain.model.VerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, UUID> {

    Optional<VerificationToken> findByTokenHash(String tokenHash);

    long countByUserIdAndUsedAtIsNullAndCreatedAtAfter(UUID userId, java.time.Instant since);

    Optional<VerificationToken> findTopByUserIdAndUsedAtIsNullOrderByCreatedAtDesc(UUID userId);
}
