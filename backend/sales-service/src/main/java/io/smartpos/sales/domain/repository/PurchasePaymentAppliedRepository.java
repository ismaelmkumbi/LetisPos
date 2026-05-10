package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.PurchasePaymentApplied;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PurchasePaymentAppliedRepository extends JpaRepository<PurchasePaymentApplied, UUID> {
}
