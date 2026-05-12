package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.MarketingBanner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MarketingBannerRepository extends JpaRepository<MarketingBanner, UUID> {
    List<MarketingBanner> findByStoreIdAndTenantIdOrderByDisplayOrderAsc(UUID storeId, UUID tenantId);
    List<MarketingBanner> findByStoreIdAndIsActiveTrue(UUID storeId);
}
