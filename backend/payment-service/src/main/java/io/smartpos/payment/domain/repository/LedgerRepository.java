package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.LedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.UUID;

public interface LedgerRepository extends JpaRepository<LedgerEntry, UUID> {

    @Query("""
           SELECT l FROM LedgerEntry l
           WHERE l.accountId = :accountId
             AND (:dateFrom IS NULL OR l.txnDate >= :dateFrom)
             AND (:dateTo   IS NULL OR l.txnDate <= :dateTo)
           ORDER BY l.txnDate DESC, l.createdAt DESC
           """)
    Page<LedgerEntry> ledgerFor(@Param("accountId") UUID accountId,
                                @Param("dateFrom")  LocalDate dateFrom,
                                @Param("dateTo")    LocalDate dateTo,
                                Pageable pageable);
}
