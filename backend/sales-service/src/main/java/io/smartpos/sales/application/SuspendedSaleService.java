package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.SuspendedSaleDto;
import io.smartpos.sales.domain.model.DiscountType;
import io.smartpos.sales.domain.model.SuspendedSale;
import io.smartpos.sales.domain.model.SuspendedSaleStatus;
import io.smartpos.sales.domain.model.TaxMethod;
import io.smartpos.sales.domain.repository.SuspendedSaleRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SuspendedSaleService {

    private final SuspendedSaleRepository repo;

    @Transactional(readOnly = true)
    public Page<SuspendedSaleDto> search(String search, SuspendedSaleStatus status, Pageable pageable) {
        return repo.search(TenantContext.require(), status, search, pageable)
                .map(SuspendedSaleDto::from);
    }

    @Transactional(readOnly = true)
    public SuspendedSaleDto get(UUID id) {
        return repo.findById(id)
                .map(SuspendedSaleDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Suspended sale not found"));
    }

    @Transactional
    public SuspendedSaleDto create(SuspendedSaleDto.CreateRequest req, UUID userId) {
        // Auto-expire old holds first
        repo.expireOldHolds(java.time.Instant.now());

        SuspendedSale s = SuspendedSale.builder()
                .ref(nextRef())
                .tenantId(req.tenantId())
                .terminalId(req.terminalId())
                .userId(userId)
                .customerId(req.customerId())
                .warehouseId(req.warehouseId())
                .lines(req.lines())
                .discountType(req.discountType() != null ? DiscountType.valueOf(req.discountType()) : null)
                .discountValue(req.discountValue())
                .taxMethod(req.taxMethod() != null ? TaxMethod.valueOf(req.taxMethod()) : null)
                .notes(req.notes())
                .grandTotal(req.grandTotal())
                .totalItems(req.totalItems())
                .build();
        return SuspendedSaleDto.from(repo.save(s));
    }

    @Transactional
    public SuspendedSaleDto resume(UUID id) {
        SuspendedSale s = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Suspended sale not found"));
        if (s.isExpired() || s.getStatus() == SuspendedSaleStatus.EXPIRED) {
            throw new ResponseStatusException(HttpStatus.GONE, "This hold has expired");
        }
        if (s.getStatus() == SuspendedSaleStatus.RESUMED) {
            return SuspendedSaleDto.from(s); // idempotent
        }
        s.setStatus(SuspendedSaleStatus.RESUMED);
        return SuspendedSaleDto.from(repo.save(s));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Suspended sale not found");
        }
        repo.deleteById(id);
    }

    @Transactional
    public int purgeExpired() {
        return repo.expireOldHolds(java.time.Instant.now());
    }

    private String nextRef() {
        long count = repo.count();
        return String.format("HOLD-%06d", count + 1);
    }
}
