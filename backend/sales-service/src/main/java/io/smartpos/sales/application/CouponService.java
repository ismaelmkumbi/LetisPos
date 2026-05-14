package io.smartpos.sales.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.api.dto.CouponDto;
import io.smartpos.sales.api.dto.CreateCouponRequest;
import io.smartpos.sales.api.dto.GenerateCouponCodesRequest;
import io.smartpos.sales.domain.model.Coupon;
import io.smartpos.sales.domain.model.CouponUsage;
import io.smartpos.sales.domain.repository.CouponRepository;
import io.smartpos.sales.domain.repository.CouponUsageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CouponService {

    private final CouponRepository repo;
    private final CouponUsageRepository usageRepo;

    public Page<CouponDto> list(Pageable pageable, Boolean active) {
        UUID tenantId = TenantContext.get().orElse(null);
        if (active != null) {
            return repo.findByTenantIdAndActive(tenantId, active, pageable).map(CouponDto::from);
        }
        return repo.findByTenantId(tenantId, pageable).map(CouponDto::from);
    }

    public CouponDto get(UUID id) {
        return CouponDto.from(repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Coupon not found")));
    }

    @Transactional
    public CouponDto create(CreateCouponRequest req) {
        UUID tenantId = TenantContext.get().orElse(null);
        // Check unique code
        if (repo.findByCode(req.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Coupon code already exists: " + req.code());
        }
        Coupon c = Coupon.builder()
            .tenantId(tenantId)
            .code(req.code())
            .type(req.type() != null ? req.type() : "PERCENTAGE")
            .discountValue(req.discountValue())
            .maxUses(req.maxUses())
            .minPurchaseAmount(req.minPurchaseAmount())
            .maxDiscountAmount(req.maxDiscountAmount())
            .validFrom(req.validFrom())
            .validUntil(req.validUntil())
            .active(true)
            .build();
        return CouponDto.from(repo.save(c));
    }

    @Transactional
    public List<CouponDto> generateCodes(UUID templateId, GenerateCouponCodesRequest req) {
        UUID tenantId = TenantContext.get().orElse(null);
        Coupon template = repo.findById(templateId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template coupon not found"));

        List<Coupon> generated = new ArrayList<>();
        for (int i = 0; i < req.quantity(); i++) {
            String code = String.format("%s-%04d", req.prefix().toUpperCase(), i + 1);
            // Skip if code already exists
            if (repo.findByCode(code).isPresent()) continue;
            Coupon c = Coupon.builder()
                .tenantId(tenantId)
                .code(code)
                .type(template.getType())
                .discountValue(template.getDiscountValue())
                .maxUses(template.getMaxUses())
                .minPurchaseAmount(template.getMinPurchaseAmount())
                .maxDiscountAmount(template.getMaxDiscountAmount())
                .validFrom(template.getValidFrom())
                .validUntil(template.getValidUntil())
                .active(true)
                .build();
            generated.add(repo.save(c));
        }
        return generated.stream().map(CouponDto::from).toList();
    }

    @Transactional
    public CouponDto update(UUID id, CreateCouponRequest req) {
        Coupon c = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Coupon not found"));
        c.setCode(req.code());
        c.setType(req.type() != null ? req.type() : "PERCENTAGE");
        c.setDiscountValue(req.discountValue());
        c.setMaxUses(req.maxUses());
        c.setMinPurchaseAmount(req.minPurchaseAmount());
        c.setMaxDiscountAmount(req.maxDiscountAmount());
        c.setValidFrom(req.validFrom());
        c.setValidUntil(req.validUntil());
        return CouponDto.from(repo.save(c));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Coupon not found");
        }
        repo.deleteById(id);
    }

    public record ValidateCouponResponse(
        boolean valid,
        String discountType,
        java.math.BigDecimal discountValue,
        java.math.BigDecimal maxDiscountAmount,
        String code
    ) {}

    public ValidateCouponResponse validate(String code) {
        Coupon c = repo.findByCode(code)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Coupon not found: " + code));

        if (!c.canUse()) {
            return new ValidateCouponResponse(false, c.getType(),
                c.getDiscountValue(), c.getMaxDiscountAmount(), c.getCode());
        }
        return new ValidateCouponResponse(true, c.getType(),
            c.getDiscountValue(), c.getMaxDiscountAmount(), c.getCode());
    }
}
