package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.Payment;
import io.smartpos.payment.domain.model.ReferenceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    @Query("""
           SELECT p FROM Payment p
           WHERE (:referenceType IS NULL OR p.referenceType = :referenceType)
             AND (:referenceId   IS NULL OR p.referenceId   = :referenceId)
             AND (:accountId     IS NULL OR p.accountId     = :accountId)
             AND (:dateFrom      IS NULL OR p.date >= :dateFrom)
             AND (:dateTo        IS NULL OR p.date <= :dateTo)
             AND p.tenantId = :tenantId
           """)
    Page<Payment> search(@Param("referenceType") ReferenceType referenceType,
                         @Param("referenceId")   UUID referenceId,
                         @Param("accountId")     UUID accountId,
                         @Param("dateFrom")      LocalDate dateFrom,
                         @Param("dateTo")        LocalDate dateTo,
                         @Param("tenantId")      UUID tenantId,
                         Pageable pageable);

    List<Payment> findByReferenceTypeAndReferenceIdAndTenantId(ReferenceType referenceType, UUID referenceId, UUID tenantId);

    long countByRefStartingWithAndTenantId(String prefix, UUID tenantId);

    @Query(value = """
        SELECT p.id as paymentId,
               p.reference_id as purchaseId, pur.ref as purchaseRef,
               pur.supplier_id as supplierId, s.name as supplierName,
               p.amount as amount, p.method as method,
               p.external_ref as reference, p.date as date,
               p.account_id as accountId, a.name as accountName
        FROM payments p
        JOIN purchases pur ON p.reference_id = pur.id
        JOIN suppliers s ON pur.supplier_id = s.id
        JOIN accounts a ON p.account_id = a.id
        WHERE p.reference_type = 'PURCHASE'
          AND p.tenant_id = :tenantId\s
          AND (:supplierId IS NULL OR pur.supplier_id = CAST(:supplierId AS uuid))
          AND (:method IS NULL OR p.method = :method)
          AND (:dateFrom IS NULL OR p.date >= CAST(:dateFrom AS date))
          AND (:dateTo IS NULL OR p.date <= CAST(:dateTo AS date))
          AND (:search IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%'))
                             OR LOWER(pur.ref) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%')))
        ORDER BY p.date DESC
        """, nativeQuery = true)
    Page<Object[]> findSupplierPaymentsRaw(@Param("tenantId") UUID tenantId,
                                            @Param("supplierId") UUID supplierId,
                                            @Param("method") String method,
                                            @Param("dateFrom") LocalDate dateFrom,
                                            @Param("dateTo") LocalDate dateTo,
                                            @Param("search") String search,
                                            Pageable pageable);
}
