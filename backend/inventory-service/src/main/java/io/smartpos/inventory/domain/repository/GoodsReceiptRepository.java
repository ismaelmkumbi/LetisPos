package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.GoodsReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, UUID>,
        JpaSpecificationExecutor<GoodsReceipt> {

    long countByRefStartingWith(String prefix);
}
