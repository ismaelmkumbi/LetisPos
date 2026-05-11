package io.smartpos.billing.domain.repository;

import io.smartpos.billing.domain.model.PlanDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlanDefinitionRepository extends JpaRepository<PlanDefinition, UUID> {

    Optional<PlanDefinition> findByCode(String code);

    List<PlanDefinition> findByIsPublicTrueOrderBySortOrderAsc();
}
