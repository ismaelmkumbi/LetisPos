package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.PublishedProduct;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PublishedProductRepository extends JpaRepository<PublishedProduct, UUID> {
    Optional<PublishedProduct> findByStoreIdAndProductId(UUID storeId, UUID productId);
    Optional<PublishedProduct> findByStoreIdAndSlug(UUID storeId, String slug);
    Page<PublishedProduct> findByStoreIdAndTenantId(UUID storeId, UUID tenantId, Pageable pageable);
    Page<PublishedProduct> findByStoreIdAndFeaturedTrue(UUID storeId, Pageable pageable);

    @Query("SELECT pp FROM PublishedProduct pp WHERE pp.storeId = :storeId ORDER BY pp.displayOrder ASC, pp.publishedAt DESC")
    List<PublishedProduct> findByStoreId(@Param("storeId") UUID storeId);

    @Query(value = """
        SELECT pp FROM PublishedProduct pp
        WHERE pp.storeId = :storeId
        AND pp.tenantId = :tenantId
        AND (:search IS NULL OR
             pp.metaTitle ILIKE CONCAT('%', CAST(:search AS string), '%') OR
             pp.metaDescription ILIKE CONCAT('%', CAST(:search AS string), '%'))
        ORDER BY pp.displayOrder ASC, pp.publishedAt DESC
        """, countQuery = """
        SELECT count(pp) FROM PublishedProduct pp
        WHERE pp.storeId = :storeId
        AND pp.tenantId = :tenantId
        AND (:search IS NULL OR
             pp.metaTitle ILIKE CONCAT('%', CAST(:search AS string), '%') OR
             pp.metaDescription ILIKE CONCAT('%', CAST(:search AS string), '%'))
        """)
    Page<PublishedProduct> searchPublished(
        @Param("storeId") UUID storeId,
        @Param("tenantId") UUID tenantId,
        @Param("search") String search,
        Pageable pageable
    );
}
