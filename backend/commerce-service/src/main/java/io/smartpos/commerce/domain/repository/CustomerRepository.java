package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByStoreIdAndEmail(UUID storeId, String email);
}
