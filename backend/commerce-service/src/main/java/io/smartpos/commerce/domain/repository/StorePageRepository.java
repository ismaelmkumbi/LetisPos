package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.StorePage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StorePageRepository extends JpaRepository<StorePage, UUID> {
    List<StorePage> findByStoreIdAndTenantIdOrderByCreatedAtDesc(UUID storeId, UUID tenantId);
    Optional<StorePage> findByStoreIdAndKey(UUID storeId, String key);
}
