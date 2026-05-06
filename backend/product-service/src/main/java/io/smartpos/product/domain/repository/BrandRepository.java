package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.Brand;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface BrandRepository extends JpaRepository<Brand, UUID> {
    boolean existsByNameIgnoreCase(String name);

    @Query("""
           SELECT b FROM Brand b
           WHERE (COALESCE(:search, '') = '' OR LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%')))
             AND b.tenantId = :tenantId
           """)
    Page<Brand> search(@Param("search") String search, @Param("tenantId") UUID tenantId, Pageable pageable);
}
