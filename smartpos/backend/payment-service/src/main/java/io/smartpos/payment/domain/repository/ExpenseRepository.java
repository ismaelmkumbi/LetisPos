package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    @Query("""
           SELECT e FROM Expense e
           WHERE (:accountId  IS NULL OR e.accountId  = :accountId)
             AND (:categoryId IS NULL OR e.categoryId = :categoryId)
             AND (:dateFrom   IS NULL OR e.date >= :dateFrom)
             AND (:dateTo     IS NULL OR e.date <= :dateTo)
           """)
    Page<Expense> search(@Param("accountId")  UUID accountId,
                         @Param("categoryId") UUID categoryId,
                         @Param("dateFrom")   LocalDate dateFrom,
                         @Param("dateTo")     LocalDate dateTo,
                         Pageable pageable);

    long countByRefStartingWith(String prefix);
}
