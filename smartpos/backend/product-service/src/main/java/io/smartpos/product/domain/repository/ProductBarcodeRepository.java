package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.ProductBarcode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ProductBarcodeRepository extends JpaRepository<ProductBarcode, UUID> {
    Optional<ProductBarcode> findByBarcode(String barcode);
    boolean existsByBarcode(String barcode);

    @Query("""
           SELECT pb FROM ProductBarcode pb
           WHERE (COALESCE(:search, '') = '' OR LOWER(pb.barcode) LIKE LOWER(CONCAT('%', :search, '%')))
           """)
    Page<ProductBarcode> search(@Param("search") String search, Pageable pageable);
}
