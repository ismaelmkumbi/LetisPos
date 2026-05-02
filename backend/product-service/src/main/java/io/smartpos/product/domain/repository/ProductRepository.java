package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    boolean existsByCodeIgnoreCase(String code);

    Optional<Product> findByCodeIgnoreCase(String code);

    // Hibernate refuses to JOIN FETCH two `List` (bag) collections in one
    // query (MultipleBagFetchException). We eagerly fetch `variants` here and
    // rely on `default_batch_fetch_size` (set in application.yml) to cheaply
    // batch-load `barcodes` for the page in a follow-up IN query.
    //
    // The `:search` parameter is wrapped with COALESCE + an empty-string
    // sentinel because Postgres can't infer the type of a typed null bound
    // to LOWER(CONCAT(..., :search, ...)) and throws
    // `function lower(bytea) does not exist`. Forcing a non-null string
    // sidesteps that without changing every caller.
    @EntityGraph(attributePaths = {"variants"})
    @Query("""
           SELECT p FROM Product p
           WHERE (COALESCE(:search, '') = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))
                                            OR LOWER(p.code) LIKE LOWER(CONCAT('%', :search, '%')))
             AND (:categoryId IS NULL OR p.categoryId = :categoryId)
             AND (:brandId    IS NULL OR p.brandId    = :brandId)
             AND (:status     IS NULL OR p.status     = :status)
           """)
    Page<Product> search(@Param("search")     String search,
                         @Param("categoryId") UUID   categoryId,
                         @Param("brandId")    UUID   brandId,
                         @Param("status")     Boolean status,
                         Pageable pageable);
}
