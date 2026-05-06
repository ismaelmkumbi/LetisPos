package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.StockCount;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;
import java.util.UUID;

public interface StockCountRepository extends JpaRepository<StockCount, UUID> {

    @EntityGraph(attributePaths = "lines")
    @Query("SELECT c FROM StockCount c WHERE c.id = :id")
    Optional<StockCount> findByIdWithLines(@Param("id") UUID id);

    long countByRefStartingWith(String prefix);

    @Query("""
           SELECT c FROM StockCount c
           WHERE (COALESCE(:search, '') = '' OR LOWER(c.ref) LIKE LOWER(CONCAT('%', :search, '%')))
             AND c.tenantId = :tenantId
           """)
    Page<StockCount> search(@Param("search") String search,
                            @Param("tenantId") UUID tenantId,
                            Pageable pageable);
}
