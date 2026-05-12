package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CartRepository extends JpaRepository<Cart, UUID> {
    Optional<Cart> findByIdAndStatus(UUID id, String status);
    Optional<Cart> findByCustomerIdAndStoreIdAndStatus(UUID customerId, UUID storeId, String status);
    Optional<Cart> findBySessionIdAndStoreIdAndStatus(String sessionId, UUID storeId, String status);
}
