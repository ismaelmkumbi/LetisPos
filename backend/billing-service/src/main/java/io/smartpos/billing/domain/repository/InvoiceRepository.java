package io.smartpos.billing.domain.repository;

import io.smartpos.billing.domain.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    List<Invoice> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    List<Invoice> findByStatus(String status);
}
