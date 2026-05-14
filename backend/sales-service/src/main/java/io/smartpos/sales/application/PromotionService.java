package io.smartpos.sales.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.api.dto.CreatePromotionRequest;
import io.smartpos.sales.api.dto.PromotionDto;
import io.smartpos.sales.domain.model.Promotion;
import io.smartpos.sales.domain.repository.PromotionRepository;
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
public class PromotionService {

    private final PromotionRepository repo;

    public Page<PromotionDto> list(Pageable pageable) {
        UUID tenantId = TenantContext.get().orElse(null);
        return repo.findByTenantId(tenantId, pageable).map(PromotionDto::from);
    }

    public PromotionDto get(UUID id) {
        return PromotionDto.from(repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found")));
    }

    @Transactional
    public PromotionDto create(CreatePromotionRequest req) {
        UUID tenantId = TenantContext.get().orElse(null);
        Promotion p = Promotion.builder()
            .tenantId(tenantId)
            .name(req.name())
            .type(req.type())
            .discountValue(req.discountValue())
            .startDate(req.startDate())
            .endDate(req.endDate())
            .appliesTo(req.appliesTo() != null ? req.appliesTo() : "all")
            .productIds(req.productIds())
            .categoryIds(req.categoryIds())
            .minPurchaseAmount(req.minPurchaseAmount())
            .maxDiscountAmount(req.maxDiscountAmount())
            .active(true)
            .build();
        return PromotionDto.from(repo.save(p));
    }

    @Transactional
    public PromotionDto update(UUID id, CreatePromotionRequest req) {
        Promotion p = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found"));
        p.setName(req.name());
        p.setType(req.type());
        p.setDiscountValue(req.discountValue());
        p.setStartDate(req.startDate());
        p.setEndDate(req.endDate());
        p.setAppliesTo(req.appliesTo() != null ? req.appliesTo() : "all");
        p.setProductIds(req.productIds());
        p.setCategoryIds(req.categoryIds());
        p.setMinPurchaseAmount(req.minPurchaseAmount());
        p.setMaxDiscountAmount(req.maxDiscountAmount());
        return PromotionDto.from(repo.save(p));
    }

    @Transactional
    public void delete(UUID id) {
        Promotion p = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found"));
        p.setActive(false);
        repo.save(p);
    }
}
