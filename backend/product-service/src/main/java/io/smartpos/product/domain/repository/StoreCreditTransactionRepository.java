package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.StoreCreditTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.UUID;

public interface StoreCreditTransactionRepository extends JpaRepository<StoreCreditTransaction, UUID> {

    @Query("SELECT t FROM StoreCreditTransaction t WHERE t.customerId = :customerId ORDER BY t.createdAt DESC")
    Page<StoreCreditTransaction> findByCustomerId(@Param("customerId") UUID customerId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM StoreCreditTransaction t WHERE t.customerId = :customerId")
    BigDecimal getBalance(@Param("customerId") UUID customerId);
}
