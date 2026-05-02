package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.SalePaymentApplied;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SalePaymentAppliedRepository extends JpaRepository<SalePaymentApplied, UUID> {
}
