package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.RecurringInvoice;
import io.smartpos.sales.domain.model.RecurringStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RecurringInvoiceRepository extends JpaRepository<RecurringInvoice, UUID> {

    boolean existsByRefIgnoreCase(String ref);

    @Query("""
           SELECT r FROM RecurringInvoice r
           WHERE (:status      IS NULL OR r.status     = :status)
             AND (:customerId  IS NULL OR r.customerId = :customerId)
             AND (:warehouseId IS NULL OR r.warehouseId = :warehouseId)
           ORDER BY r.nextRunDate ASC
           """)
    Page<RecurringInvoice> search(@Param("status")      RecurringStatus status,
                                  @Param("customerId")  UUID customerId,
                                  @Param("warehouseId") UUID warehouseId,
                                  Pageable pageable);

    /**
     * Templates due to fire today. Picked up in batches by the scheduler.
     * Limit/offset come from {@code Pageable} (page-size = batch).
     */
    @Query("""
           SELECT r FROM RecurringInvoice r
           WHERE r.status = io.smartpos.sales.domain.model.RecurringStatus.ACTIVE
             AND r.nextRunDate <= :asOf
           ORDER BY r.nextRunDate ASC
           """)
    List<RecurringInvoice> findDue(@Param("asOf") LocalDate asOf, Pageable pageable);
}
