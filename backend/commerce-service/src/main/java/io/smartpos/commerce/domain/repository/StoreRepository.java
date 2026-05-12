package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StoreRepository extends JpaRepository<Store, UUID> {
    Optional<Store> findByTenantId(UUID tenantId);
    Optional<Store> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
