package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.Modifying;

import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    @Query("""
           SELECT c FROM Customer c
           WHERE (:search IS NULL OR
                  LOWER(c.name)  LIKE LOWER(CONCAT('%', :search, '%')) OR
                  LOWER(c.phone) LIKE LOWER(CONCAT('%', :search, '%')) OR
                  LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')))
             AND (:active IS NULL OR c.active = :active)
             AND c.tenantId = :tenantId
           """)
    Page<Customer> search(@Param("search")   String search,
                          @Param("active")   Boolean active,
                          @Param("tenantId") UUID tenantId,
                          Pageable pageable);

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.groupId = :groupId AND c.deletedAt IS NULL")
    long countByGroupId(@Param("groupId") UUID groupId);

    @Modifying
    @Transactional
    @Query("UPDATE Customer c SET c.groupId = NULL WHERE c.groupId = :groupId")
    void clearGroupId(@Param("groupId") UUID groupId);
}
