package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    @Query(value = """
            SELECT s FROM Supplier s
            WHERE (CAST(:search AS string) IS NULL OR
                   LOWER(s.name)  LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR
                   LOWER(s.phone) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR
                   LOWER(s.email) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))
              AND (:active IS NULL OR s.active = :active)
              AND s.tenantId = :tenantId
            """,
           countQuery = """
            SELECT COUNT(s) FROM Supplier s
            WHERE (CAST(:search AS string) IS NULL OR
                   LOWER(s.name)  LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR
                   LOWER(s.phone) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR
                   LOWER(s.email) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))
              AND (:active IS NULL OR s.active = :active)
              AND s.tenantId = :tenantId
            """)
    Page<Supplier> search(@Param("search")   String search,
                          @Param("active")   Boolean active,
                          @Param("tenantId") UUID tenantId,
                          Pageable pageable);
}
