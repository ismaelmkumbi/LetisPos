package io.smartpos.user.domain.model;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface FeatureDefinitionRepository extends JpaRepository<FeatureDefinition, UUID> {
    List<FeatureDefinition> findByActiveTrueOrderBySortOrderAsc();
    List<FeatureDefinition> findByCategoryAndActiveTrue(String category);
    boolean existsByKey(String key);
}
