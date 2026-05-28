package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.BrandPreset;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BrandPresetRepository extends JpaRepository<BrandPreset, UUID> {
    List<BrandPreset> findAllByOrderBySortOrderAsc();
    List<BrandPreset> findByIndustryOrderBySortOrderAsc(String industry);
}
