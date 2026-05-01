package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.DepositCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DepositCategoryRepository extends JpaRepository<DepositCategory, UUID> {
}
