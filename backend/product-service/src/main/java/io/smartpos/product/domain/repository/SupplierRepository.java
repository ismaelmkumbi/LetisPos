package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    @Query("""
           SELECT s FROM Supplier s
           WHERE (:search IS NULL OR
                  LOWER(s.name)  LIKE LOWER(CONCAT('%', :search, '%')) OR
                  LOWER(s.phone) LIKE LOWER(CONCAT('%', :search, '%')) OR
                  LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%')))
             AND (:active IS NULL OR s.active = :active)
             AND s.tenantId = :tenantId
           """)
    Page<Supplier> search(@Param("search")   String search,
                          @Param("active")   Boolean active,
                          @Param("tenantId") UUID tenantId,
                          Pageable pageable);
}
