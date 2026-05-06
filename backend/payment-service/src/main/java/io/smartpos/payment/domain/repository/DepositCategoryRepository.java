package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.DepositCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DepositCategoryRepository extends JpaRepository<DepositCategory, UUID> {
    List<DepositCategory> findByTenantId(UUID tenantId);
}
