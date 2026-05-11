package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.GiftCard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface GiftCardRepository extends JpaRepository<GiftCard, UUID> {

    Optional<GiftCard> findByCardNumber(String cardNumber);

    @Query("SELECT g FROM GiftCard g WHERE g.tenantId = :tenantId")
    Page<GiftCard> findAllByTenant(@Param("tenantId") UUID tenantId, Pageable pageable);
}
