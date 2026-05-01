package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    boolean existsByCodeIgnoreCase(String code);

    @Query("""
           SELECT c FROM Category c
           WHERE (COALESCE(:search, '') = '' OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
                                            OR LOWER(COALESCE(c.code, '')) LIKE LOWER(CONCAT('%', :search, '%')))
           """)
    Page<Category> search(@Param("search") String search, Pageable pageable);
}
