package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.domain.model.ProductBatch;
import io.smartpos.product.domain.repository.ProductBatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductBatchService {

    private final ProductBatchRepository repo;

    @Transactional(readOnly = true)
    public List<ProductBatch> list() {
        return repo.findByTenantIdOrderByBatchNumberAsc(TenantContext.require());
    }

    @Transactional(readOnly = true)
    public List<ProductBatch> byProduct(UUID productId) {
        return repo.findByProductIdOrderByExpiryDateAsc(productId);
    }

    @Transactional(readOnly = true)
    public List<ProductBatch> expiring(LocalDate before) {
        return repo.findByExpiryDateBeforeAndQtyGreaterThan(before, 0);
    }

    @Transactional
    public ProductBatch create(ProductBatch batch) {
        if (repo.existsByBatchNumberIgnoreCaseAndTenantId(batch.getBatchNumber(), TenantContext.require())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Batch number already exists");
        }
        batch.setTenantId(TenantContext.require());
        return repo.save(batch);
    }

    @Transactional
    public ProductBatch update(UUID id, ProductBatch req) {
        ProductBatch b = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));
        b.setBatchNumber(req.getBatchNumber());
        b.setManufacturingDate(req.getManufacturingDate());
        b.setExpiryDate(req.getExpiryDate());
        b.setQty(req.getQty());
        b.setWarehouseId(req.getWarehouseId());
        b.setNotes(req.getNotes());
        return repo.save(b);
    }

    @Transactional
    public void delete(UUID id) {
        repo.deleteById(id);
    }
}
