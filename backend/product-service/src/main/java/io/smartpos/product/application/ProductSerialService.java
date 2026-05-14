package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.api.dto.SerialDto;
import io.smartpos.product.domain.model.Product;
import io.smartpos.product.domain.model.ProductSerial;
import io.smartpos.product.domain.model.SerialStatus;
import io.smartpos.product.domain.model.SerialType;
import io.smartpos.product.domain.repository.ProductRepository;
import io.smartpos.product.domain.repository.ProductSerialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Manages the IMEI / Serial registry. Lifecycle:
 * IN_STOCK → RESERVED → SOLD; or RETURNED / DEFECTIVE.
 *
 * Sales-service is expected to call {@link #markSold} when an order is confirmed
 * and {@link #markReturned} on a return. Inventory adjustments call {@link #create}.
 */
@Service
@RequiredArgsConstructor
public class ProductSerialService {

    private final ProductSerialRepository repo;
    private final ProductRepository productRepo;

    @Transactional(readOnly = true)
    public Page<SerialDto> search(UUID productId, UUID warehouseId, SerialStatus status,
                                  String search, Pageable pageable) {
        return repo.search(productId, warehouseId, status, search, TenantContext.get().orElse(null), pageable).map(SerialDto::from);
    }

    @Transactional(readOnly = true)
    public SerialDto get(UUID id) {
        return repo.findById(id).map(SerialDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Serial not found"));
    }

    @Transactional(readOnly = true)
    public SerialDto findByNumber(String serialNumber) {
        return repo.findBySerialNumberIgnoreCase(serialNumber).map(SerialDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Serial not found"));
    }

    @Transactional
    public SerialDto create(SerialDto.CreateRequest req) {
        if (repo.existsBySerialNumberIgnoreCase(req.serialNumber())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Serial already registered: " + req.serialNumber());
        }
        Product product = productRepo.findById(req.productId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown product"));

        // If product has a warranty term and caller passed start date but no end, derive it.
        LocalDate end = req.warrantyEnd();
        if (end == null && req.warrantyStart() != null && product.getWarrantyMonths() != null) {
            end = req.warrantyStart().plusMonths(product.getWarrantyMonths());
        }

        ProductSerial saved = repo.save(ProductSerial.builder()
                .productId(req.productId())
                .variantId(req.variantId())
                .warehouseId(req.warehouseId())
                .serialNumber(req.serialNumber())
                .serialType(Optional.ofNullable(req.serialType()).orElse(SerialType.SERIAL))
                .status(SerialStatus.IN_STOCK)
                .purchaseRef(req.purchaseRef())
                .warrantyStart(req.warrantyStart())
                .warrantyEnd(end)
                .notes(req.notes())
                .tenantId(product.getTenantId())
                .build());
        return SerialDto.from(saved);
    }

    /** Bulk create — used by purchase receipts where dozens of IMEIs arrive at once. */
    @Transactional
    public List<SerialDto> createBulk(List<SerialDto.CreateRequest> requests) {
        return requests.stream().map(this::create).toList();
    }

    @Transactional
    public SerialDto updateStatus(UUID id, SerialDto.StatusUpdate update) {
        ProductSerial s = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Serial not found"));
        s.setStatus(update.status());
        if (update.saleRef() != null) s.setSaleRef(update.saleRef());
        if (update.notes()   != null) s.setNotes(update.notes());
        return SerialDto.from(repo.save(s));
    }

    /** Helper used by sales-service via internal call: mark a list of serials SOLD against a sale. */
    @Transactional
    public void markSold(List<UUID> serialIds, String saleRef) {
        for (UUID id : serialIds) {
            ProductSerial s = repo.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Serial not found: " + id));
            if (s.getStatus() == SerialStatus.SOLD) continue;
            s.setStatus(SerialStatus.SOLD);
            s.setSaleRef(saleRef);
            repo.save(s);
        }
    }

    @Transactional
    public void markReturned(String saleRef) {
        repo.findBySaleRef(saleRef).forEach(s -> {
            s.setStatus(SerialStatus.RETURNED);
            repo.save(s);
        });
    }

    @Transactional
    public void delete(UUID id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Serial not found");
        }
        repo.deleteById(id);
    }
}
