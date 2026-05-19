package io.smartpos.user.domain.model;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface MenuDefinitionRepository extends JpaRepository<MenuDefinition, UUID> {

    @Query("SELECT m FROM MenuDefinition m LEFT JOIN FETCH m.children WHERE m.parent IS NULL ORDER BY m.sortOrder ASC")
    List<MenuDefinition> findFullTree();

    List<MenuDefinition> findByParentIsNullAndVisibleTrueOrderBySortOrderAsc();
}
