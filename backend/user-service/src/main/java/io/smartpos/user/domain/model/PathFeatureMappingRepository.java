package io.smartpos.user.domain.model;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PathFeatureMappingRepository extends JpaRepository<PathFeatureMapping, UUID> {
    List<PathFeatureMapping> findAllByOrderBySortOrderAsc();
}
