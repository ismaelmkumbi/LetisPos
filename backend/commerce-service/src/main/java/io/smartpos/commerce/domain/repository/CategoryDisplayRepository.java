package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.CategoryDisplay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CategoryDisplayRepository extends JpaRepository<CategoryDisplay, UUID> {
    List<CategoryDisplay> findByStoreIdAndTenantIdOrderByDisplayOrderAsc(UUID storeId, UUID tenantId);
    List<CategoryDisplay> findByStoreIdAndTenantIdAndIsVisibleTrueOrderByDisplayOrderAsc(UUID storeId, UUID tenantId);
}
