package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.ProductSerial;
import io.smartpos.product.domain.model.SerialStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductSerialRepository extends JpaRepository<ProductSerial, UUID> {

    Optional<ProductSerial> findBySerialNumberIgnoreCase(String serialNumber);

    boolean existsBySerialNumberIgnoreCase(String serialNumber);

    List<ProductSerial> findByProductIdAndStatus(UUID productId, SerialStatus status);

    List<ProductSerial> findBySaleRef(String saleRef);

    @Query("""
           SELECT s FROM ProductSerial s
           WHERE (:productId IS NULL OR s.productId = :productId)
             AND (:warehouseId IS NULL OR s.warehouseId = :warehouseId)
             AND (:status IS NULL OR s.status = :status)
             AND (COALESCE(:search,'') = '' OR LOWER(s.serialNumber) LIKE LOWER(CONCAT('%', :search, '%')))
           """)
    Page<ProductSerial> search(@Param("productId")   UUID productId,
                               @Param("warehouseId") UUID warehouseId,
                               @Param("status")      SerialStatus status,
                               @Param("search")      String search,
                               Pageable pageable);
}
