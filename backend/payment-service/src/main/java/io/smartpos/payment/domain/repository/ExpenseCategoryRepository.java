package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.ExpenseCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, UUID> {
    List<ExpenseCategory> findByTenantId(UUID tenantId);
}
