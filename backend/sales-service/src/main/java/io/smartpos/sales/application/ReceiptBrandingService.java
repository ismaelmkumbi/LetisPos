package io.smartpos.sales.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.api.dto.ReceiptBrandingDto;
import io.smartpos.sales.domain.model.ReceiptBranding;
import io.smartpos.sales.domain.repository.ReceiptBrandingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReceiptBrandingService {

    private final ReceiptBrandingRepository repo;

    @Transactional(readOnly = true)
    @Cacheable(value = "receiptBranding", key = "T(io.smartpos.common.context.TenantContext).require()")
    public ReceiptBrandingDto get() {
        UUID tenantId = TenantContext.require();
        ReceiptBranding rb = repo.findByTenantId(tenantId)
            .orElseGet(() -> createDefault(tenantId));
        return ReceiptBrandingDto.from(rb);
    }

    @Transactional
    @CacheEvict(value = "receiptBranding", key = "T(io.smartpos.common.context.TenantContext).require()")
    public ReceiptBrandingDto update(ReceiptBrandingDto.UpdateRequest request) {
        UUID tenantId = TenantContext.require();
        ReceiptBranding rb = repo.findByTenantId(tenantId)
            .orElseGet(() -> createDefault(tenantId));

        apply(rb, request);
        ReceiptBranding saved = repo.save(rb);
        return ReceiptBrandingDto.from(saved);
    }

    @Transactional
    @CacheEvict(value = "receiptBranding", key = "T(io.smartpos.common.context.TenantContext).require()")
    public ReceiptBrandingDto reset() {
        UUID tenantId = TenantContext.require();
        repo.findByTenantId(tenantId).ifPresent(repo::delete);
        ReceiptBranding rb = createDefault(tenantId);
        return ReceiptBrandingDto.from(rb);
    }

    private ReceiptBranding createDefault(UUID tenantId) {
        ReceiptBranding rb = ReceiptBranding.builder()
            .tenantId(tenantId)
            .build();
        return repo.save(rb);
    }

    private void apply(ReceiptBranding rb, ReceiptBrandingDto.UpdateRequest r) {
        if (r.getHeaderText() != null) rb.setHeaderText(r.getHeaderText());
        if (r.getFooterText() != null) rb.setFooterText(r.getFooterText());
        if (r.getShowLogo() != null) rb.setShowLogo(r.getShowLogo());
        if (r.getLogoWidthMm() != null) rb.setLogoWidthMm(r.getLogoWidthMm());
        if (r.getShowQrCode() != null) rb.setShowQrCode(r.getShowQrCode());
        if (r.getShowBarcode() != null) rb.setShowBarcode(r.getShowBarcode());
        if (r.getShowCustomerInfo() != null) rb.setShowCustomerInfo(r.getShowCustomerInfo());
        if (r.getPaperWidthMm() != null) rb.setPaperWidthMm(r.getPaperWidthMm());
        if (r.getFontSizeSmall() != null) rb.setFontSizeSmall(r.getFontSizeSmall());
        if (r.getFontSizeNormal() != null) rb.setFontSizeNormal(r.getFontSizeNormal());
        if (r.getFontSizeLarge() != null) rb.setFontSizeLarge(r.getFontSizeLarge());
        if (r.getLineSpacing() != null) rb.setLineSpacing(r.getLineSpacing());
        if (r.getCutPaperAfterPrint() != null) rb.setCutPaperAfterPrint(r.getCutPaperAfterPrint());
        if (r.getOpenCashDrawer() != null) rb.setOpenCashDrawer(r.getOpenCashDrawer());
    }
}
