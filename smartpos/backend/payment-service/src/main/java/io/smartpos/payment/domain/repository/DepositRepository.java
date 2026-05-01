package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.Deposit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.UUID;

public interface DepositRepository extends JpaRepository<Deposit, UUID> {

    @Query("""
           SELECT d FROM Deposit d
           WHERE (:accountId  IS NULL OR d.accountId  = :accountId)
             AND (:categoryId IS NULL OR d.categoryId = :categoryId)
             AND (:dateFrom   IS NULL OR d.date >= :dateFrom)
             AND (:dateTo     IS NULL OR d.date <= :dateTo)
           """)
    Page<Deposit> search(@Param("accountId")  UUID accountId,
                         @Param("categoryId") UUID categoryId,
                         @Param("dateFrom")   LocalDate dateFrom,
                         @Param("dateTo")     LocalDate dateTo,
                         Pageable pageable);

    long countByRefStartingWith(String prefix);
}
