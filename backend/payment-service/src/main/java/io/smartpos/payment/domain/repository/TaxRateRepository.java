package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.TaxRate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaxRateRepository extends JpaRepository<TaxRate, UUID> {
    List<TaxRate> findByTenantIdOrderByNameAsc(UUID tenantId);
    List<TaxRate> findByTenantIdAndActiveTrueOrderByNameAsc(UUID tenantId);
}
