package io.smartpos.inventory.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.inventory.api.dto.CreateProductBatchRequest;
import io.smartpos.inventory.api.dto.ProductBatchDto;
import io.smartpos.inventory.domain.model.MovementType;
import io.smartpos.inventory.domain.model.ProductBatch;
import io.smartpos.inventory.domain.model.ReferenceType;
import io.smartpos.inventory.domain.model.StockMovement;
import io.smartpos.inventory.domain.repository.ProductBatchRepository;
import io.smartpos.inventory.domain.repository.StockMovementRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Manages product batch/lot records for FEFO/FIFO tracking and
 * expiry management.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductBatchService {

    private final ProductBatchRepository batchRepo;
    private final StockService stockService;
    private final StockMovementRepository movementRepo;

    // ---- queries ----

    @Transactional(readOnly = true)
    public Page<ProductBatchDto> listBatches(UUID productId, UUID warehouseId, String status,
                                              LocalDate expiringBefore, LocalDate expiringAfter,
                                              String search, Pageable pageable) {
        Specification<ProductBatch> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (productId != null) {
                predicates.add(cb.equal(root.get("productId"), productId));
            }
            if (warehouseId != null) {
                predicates.add(cb.equal(root.get("warehouseId"), warehouseId));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status.toUpperCase()));
            }
            if (expiringBefore != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("expiryDate"), expiringBefore));
            }
            if (expiringAfter != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("expiryDate"), expiringAfter));
            }
            if (search != null && !search.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("batchNumber")),
                        "%" + search.toLowerCase() + "%"));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return batchRepo.findAll(spec, pageable).map(ProductBatchDto::from);
    }

    @Transactional(readOnly = true)
    public ProductBatchDto get(UUID id) {
        return batchRepo.findById(id)
                .map(ProductBatchDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Batch not found: " + id));
    }

    // ---- commands ----

    /**
     * Register a new batch/lot in the system.
     * <p>
     * Ensures a {@link io.smartpos.inventory.domain.model.StockLevel} row exists
     * for the (product, variant, warehouse) tuple, persists the batch record with
     * its initial on-hand quantity, and appends a PURCHASE_IN stock movement
     * referencing the batch.
     */
    @Transactional
    public ProductBatchDto create(CreateProductBatchRequest req) {
        UUID tenantId = TenantContext.require();

        // 1. Ensure a stock_levels row exists for this product/warehouse.
        stockService.upsert(req.productId(), req.variantId(), req.warehouseId());

        // 2. Create the batch record.
        ProductBatch batch = ProductBatch.builder()
                .batchNumber(req.batchNumber())
                .productId(req.productId())
                .variantId(req.variantId())
                .warehouseId(req.warehouseId())
                .manufacturingDate(req.manufacturingDate())
                .expiryDate(req.expiryDate())
                .onHand(req.qty())
                .status("ACTIVE")
                .tenantId(tenantId)
                .build();
        batch = batchRepo.save(batch);

        // 3. Append a PURCHASE_IN stock movement referencing the batch.
        StockMovement movement = StockMovement.builder()
                .productId(req.productId())
                .variantId(req.variantId())
                .warehouseId(req.warehouseId())
                .movementType(MovementType.PURCHASE_IN)
                .qtyDelta(req.qty())
                .referenceType(ReferenceType.PURCHASE)
                .referenceId(batch.getId())
                .userId(null) // no authenticated user context for batch creation
                .tenantId(tenantId)
                .notes("Batch " + req.batchNumber())
                .build();
        movementRepo.save(movement);

        log.info("Created batch {} for product={} warehouse={} qty={}",
                batch.getBatchNumber(), req.productId(), req.warehouseId(), req.qty());

        return ProductBatchDto.from(batch);
    }

    // ---- expiry ----

    /**
     * Returns ACTIVE batches that will expire within {@code withinDays} days
     * and still have positive on-hand stock. Paginated — the frontend should
     * never load every batch at once.
     */
    @Transactional(readOnly = true)
    public Page<ProductBatchDto> getExpiring(UUID warehouseId, int withinDays, Pageable pageable) {
        LocalDate cutoff = LocalDate.now().plusDays(withinDays);
        Page<ProductBatch> page;
        if (warehouseId != null) {
            page = batchRepo.findByWarehouseIdAndExpiryDateBeforeAndStatusAndOnHandGreaterThan(
                    warehouseId, cutoff, "ACTIVE", BigDecimal.ZERO, pageable);
        } else {
            page = batchRepo.findByExpiryDateBeforeAndStatusAndOnHandGreaterThan(
                    cutoff, "ACTIVE", BigDecimal.ZERO, pageable);
        }
        return page.map(ProductBatchDto::from);
    }
}
