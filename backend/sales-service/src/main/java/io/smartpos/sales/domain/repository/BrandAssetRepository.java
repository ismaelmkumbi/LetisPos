package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.BrandAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BrandAssetRepository extends JpaRepository<BrandAsset, UUID> {
    List<BrandAsset> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<BrandAsset> findByTenantIdAndCategoryOrderByCreatedAtDesc(UUID tenantId, String category);
}
