package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.BrandProfileVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BrandProfileVersionRepository extends JpaRepository<BrandProfileVersion, UUID> {
    List<BrandProfileVersion> findByBrandProfileIdOrderByVersionNumberDesc(UUID brandProfileId);
    int countByBrandProfileId(UUID brandProfileId);
}
