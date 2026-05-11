package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.CustomerGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CustomerGroupRepository extends JpaRepository<CustomerGroup, UUID> {

    @Query("SELECT g FROM CustomerGroup g WHERE g.tenantId = :tenantId")
    Page<CustomerGroup> findAllByTenant(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT g FROM CustomerGroup g WHERE g.tenantId = :tenantId")
    List<CustomerGroup> findAllByTenant(@Param("tenantId") UUID tenantId);
}
