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
}
