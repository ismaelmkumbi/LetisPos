package io.smartpos.billing.domain.repository;

import io.smartpos.billing.domain.model.PaymentMethod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentMethodRepository extends JpaRepository<PaymentMethod, UUID> {
    List<PaymentMethod> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    Optional<PaymentMethod> findByTenantIdAndIsDefaultTrue(UUID tenantId);
}
