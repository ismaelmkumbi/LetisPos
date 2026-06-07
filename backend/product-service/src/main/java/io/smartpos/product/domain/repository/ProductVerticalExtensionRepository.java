package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.ProductVerticalExtension;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductVerticalExtensionRepository extends JpaRepository<ProductVerticalExtension, UUID> {

    List<ProductVerticalExtension> findByProductId(UUID productId);

    Optional<ProductVerticalExtension> findByProductIdAndVerticalKey(UUID productId, String verticalKey);

    void deleteByProductIdAndVerticalKey(UUID productId, String verticalKey);

    boolean existsByProductIdAndVerticalKey(UUID productId, String verticalKey);
}
