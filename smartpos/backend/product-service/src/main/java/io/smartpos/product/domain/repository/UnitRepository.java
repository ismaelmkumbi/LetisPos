package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.Unit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface UnitRepository extends JpaRepository<Unit, UUID> {
    boolean existsByShortNameIgnoreCase(String shortName);

    @Query("""
           SELECT u FROM Unit u
           WHERE (COALESCE(:search, '') = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%'))
                                            OR LOWER(u.shortName) LIKE LOWER(CONCAT('%', :search, '%')))
           """)
    Page<Unit> search(@Param("search") String search, Pageable pageable);
}
