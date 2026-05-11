package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.GoodsReceiptLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GoodsReceiptLineRepository extends JpaRepository<GoodsReceiptLine, UUID> {
}
