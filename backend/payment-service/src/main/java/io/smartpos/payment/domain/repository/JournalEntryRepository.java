package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.JournalEntry;
import io.smartpos.payment.domain.model.JournalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {

    boolean existsByRefIgnoreCaseAndTenantId(String ref, UUID tenantId);

    @Query("""
           SELECT j FROM JournalEntry j
           WHERE (:status IS NULL OR j.status = :status)
             AND (CAST(:from AS java.time.LocalDate) IS NULL OR j.entryDate >= :from)
             AND (CAST(:to   AS java.time.LocalDate) IS NULL OR j.entryDate <= :to)
             AND (:source IS NULL OR j.source = :source)
             AND j.tenantId = :tenantId
           ORDER BY j.entryDate DESC, j.createdAt DESC
           """)
    Page<JournalEntry> search(@Param("status") JournalStatus status,
                              @Param("from")   LocalDate from,
                              @Param("to")     LocalDate to,
                              @Param("source") String source,
                              @Param("tenantId") UUID tenantId,
                              Pageable pageable);

    /**
     * Per-account totals over a date window for POSTED entries only — feeds
     * the Trial Balance / P&amp;L / Balance Sheet builders.
     * Each row: [accountId(UUID), totalDebit(BigDecimal), totalCredit(BigDecimal)].
     */
    @Query("""
           SELECT l.accountId,
                  COALESCE(SUM(l.debit), 0),
                  COALESCE(SUM(l.credit), 0)
           FROM JournalEntry j JOIN j.lines l
           WHERE j.status = io.smartpos.payment.domain.model.JournalStatus.POSTED
             AND (CAST(:from AS java.time.LocalDate) IS NULL OR j.entryDate >= :from)
             AND (CAST(:to   AS java.time.LocalDate) IS NULL OR j.entryDate <= :to)
             AND j.tenantId = :tenantId
           GROUP BY l.accountId
           """)
    List<Object[]> sumByAccount(@Param("from") LocalDate from,
                                @Param("to")   LocalDate to,
                                @Param("tenantId") UUID tenantId);
}
