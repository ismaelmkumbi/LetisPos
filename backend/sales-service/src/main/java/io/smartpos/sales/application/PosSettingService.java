package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.PosSettingDto;
import io.smartpos.sales.domain.model.PosSetting;
import io.smartpos.sales.domain.repository.PosSettingRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PosSettingService {

    private final PosSettingRepository repo;

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PosSettingDto get(UUID warehouseId) {
        return PosSettingDto.from(findOrCreate(warehouseId));
    }

    // ── Patch (partial update) ────────────────────────────────────────────────

    public PosSettingDto update(UUID warehouseId, PosSettingDto.UpdateRequest req) {
        PosSetting s = findOrCreate(warehouseId);
        applyPatch(s, req);
        log.info("POS settings updated for warehouse {}", warehouseId);
        return PosSettingDto.from(repo.save(s));
    }

    // ── Reset to factory defaults ─────────────────────────────────────────────

    public PosSettingDto reset(UUID warehouseId) {
        UUID tenantId = TenantContext.get().orElse(null);
        PosSetting existing = repo.findByWarehouseId(warehouseId, tenantId).orElse(null);
        PosSetting defaults = PosSetting.builder().warehouseId(warehouseId).tenantId(tenantId).build();
        if (existing != null) {
            defaults.setId(existing.getId());
            defaults.setCreatedAt(existing.getCreatedAt());
        }
        log.info("POS settings reset to defaults for warehouse {}", warehouseId);
        return PosSettingDto.from(repo.save(defaults));
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private PosSetting findOrCreate(UUID warehouseId) {
        UUID tenantId = TenantContext.get().orElse(null);
        return repo.findByWarehouseId(warehouseId, tenantId)
                   .orElseGet(() -> repo.save(
                       PosSetting.builder().warehouseId(warehouseId).tenantId(tenantId).build()));
    }

    /** Apply all non-null fields from the patch request onto the entity. */
    private void applyPatch(PosSetting s, PosSettingDto.UpdateRequest r) {
        // Receipt layout
        if (r.receiptLayout()    != null) s.setReceiptLayout(r.receiptLayout());
        if (r.receiptPaperSize() != null) s.setReceiptPaperSize(r.receiptPaperSize());
        // Receipt toggles
        if (r.showLogo()         != null) s.setShowLogo(r.showLogo());
        if (r.logoSize()         != null) s.setLogoSize(r.logoSize());
        if (r.showStoreName()    != null) s.setShowStoreName(r.showStoreName());
        if (r.showStoreAddress() != null) s.setShowStoreAddress(r.showStoreAddress());
        if (r.showStorePhone()   != null) s.setShowStorePhone(r.showStorePhone());
        if (r.showStoreEmail()   != null) s.setShowStoreEmail(r.showStoreEmail());
        if (r.showReference()    != null) s.setShowReference(r.showReference());
        if (r.showDate()         != null) s.setShowDate(r.showDate());
        if (r.showSeller()       != null) s.setShowSeller(r.showSeller());
        if (r.showCustomer()     != null) s.setShowCustomer(r.showCustomer());
        if (r.showWarehouse()    != null) s.setShowWarehouse(r.showWarehouse());
        if (r.showTax()          != null) s.setShowTax(r.showTax());
        if (r.showDiscount()     != null) s.setShowDiscount(r.showDiscount());
        if (r.showShipping()     != null) s.setShowShipping(r.showShipping());
        if (r.showBarcode()      != null) s.setShowBarcode(r.showBarcode());
        if (r.showNote()         != null) s.setShowNote(r.showNote());
        if (r.showPaid()         != null) s.setShowPaid(r.showPaid());
        if (r.showDue()          != null) s.setShowDue(r.showDue());
        if (r.showPayments()     != null) s.setShowPayments(r.showPayments());
        if (r.showFooter()       != null) s.setShowFooter(r.showFooter());
        // Store info
        if (r.storeName()     != null) s.setStoreName(r.storeName());
        if (r.storeAddress()  != null) s.setStoreAddress(r.storeAddress());
        if (r.storePhone()    != null) s.setStorePhone(r.storePhone());
        if (r.storeEmail()    != null) s.setStoreEmail(r.storeEmail());
        if (r.storeTaxId()    != null) s.setStoreTaxId(r.storeTaxId());
        if (r.footerMessage() != null) s.setFooterMessage(r.footerMessage());
        // Store branding
        if (r.logoUrl()      != null) s.setLogoUrl(r.logoUrl());
        if (r.storeWebsite() != null) s.setStoreWebsite(r.storeWebsite());
        // Printing
        if (r.autoPrint() != null) s.setAutoPrint(r.autoPrint());
        // POS behaviour
        if (r.productsPerPage()       != null) s.setProductsPerPage(r.productsPerPage());
        if (r.allowNegativeStock()    != null) s.setAllowNegativeStock(r.allowNegativeStock());
        if (r.requireCustomerOnSale() != null) s.setRequireCustomerOnSale(r.requireCustomerOnSale());
        if (r.requireNoteOnSale()     != null) s.setRequireNoteOnSale(r.requireNoteOnSale());
        if (r.lowStockThreshold()     != null) s.setLowStockThreshold(r.lowStockThreshold());
        if (r.enableSound()           != null) s.setEnableSound(r.enableSound());
        if (r.kioskIdleTimeoutSec()   != null) s.setKioskIdleTimeoutSec(r.kioskIdleTimeoutSec());
        // Sale reference
        if (r.saleRefPrefix()  != null) s.setSaleRefPrefix(r.saleRefPrefix());
        if (r.saleRefPadding() != null) s.setSaleRefPadding(r.saleRefPadding());
        // Tax defaults
        if (r.defaultTaxRate()   != null) s.setDefaultTaxRate(r.defaultTaxRate());
        if (r.defaultTaxMethod() != null) s.setDefaultTaxMethod(r.defaultTaxMethod());
        // Discount
        if (r.maxDiscountPercent()    != null) s.setMaxDiscountPercent(r.maxDiscountPercent());
        if (r.requirePinForDiscount() != null) s.setRequirePinForDiscount(r.requirePinForDiscount());
        if (r.managerApprovalAbove()  != null) s.setManagerApprovalAbove(r.managerApprovalAbove());
        // Currency
        if (r.currencyCode()   != null) s.setCurrencyCode(r.currencyCode());
        if (r.currencySymbol() != null) s.setCurrencySymbol(r.currencySymbol());
        // Locale
        if (r.timezone()   != null) s.setTimezone(r.timezone());
        if (r.dateFormat() != null) s.setDateFormat(r.dateFormat());
        if (r.timeFormat() != null) s.setTimeFormat(r.timeFormat());
        // Loyalty
        if (r.enableLoyalty()          != null) s.setEnableLoyalty(r.enableLoyalty());
        if (r.loyaltyPointsPerUnit()   != null) s.setLoyaltyPointsPerUnit(r.loyaltyPointsPerUnit());
        if (r.loyaltyValuePerPoint()   != null) s.setLoyaltyValuePerPoint(r.loyaltyValuePerPoint());
        if (r.loyaltyMinRedeemPoints() != null) s.setLoyaltyMinRedeemPoints(r.loyaltyMinRedeemPoints());
        // Notifications
        if (r.lowStockAlertEnabled() != null) s.setLowStockAlertEnabled(r.lowStockAlertEnabled());
        if (r.dailySummaryEnabled()  != null) s.setDailySummaryEnabled(r.dailySummaryEnabled());
        if (r.alertEmail()           != null) s.setAlertEmail(r.alertEmail());
    }
}
