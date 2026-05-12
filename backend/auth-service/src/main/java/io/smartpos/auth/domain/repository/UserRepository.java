package io.smartpos.auth.domain.repository;

import io.smartpos.auth.domain.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    long count();
    long countByTenantId(UUID tenantId);
    Optional<User> findFirstByTenantIdOrderByCreatedAtAsc(UUID tenantId);
}
