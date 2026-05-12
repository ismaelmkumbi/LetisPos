package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.CustomerAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, UUID> {
    List<CustomerAddress> findByCustomerIdOrderByIsDefaultDesc(UUID customerId);
}
