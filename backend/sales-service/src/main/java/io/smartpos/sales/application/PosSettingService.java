package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.PosSettingDto;
import io.smartpos.sales.domain.model.PosSetting;
import io.smartpos.sales.domain.repository.PosSettingRepository;
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

    @Transactional(readOnly = true)
    public PosSettingDto get(UUID warehouseId) {
        PosSetting setting = repo.findByWarehouseId(warehouseId)
            .orElseGet(() -> createDefaults(warehouseId));
        return PosSettingDto.from(setting);
    }

    public PosSettingDto update(UUID warehouseId, PosSettingDto.UpdateRequest req) {
        PosSetting s = repo.findByWarehouseId(warehouseId)
            .orElseGet(() -> createDefaults(warehouseId));

        if (req.receiptLayout() != null) s.setReceiptLayout(req.receiptLayout());
        if (req.receiptPaperSize() != null) s.setReceiptPaperSize(req.receiptPaperSize());
        if (req.showLogo() != null) s.setShowLogo(req.showLogo());
        if (req.logoSize() != null) s.setLogoSize(req.logoSize());
        if (req.showStoreName() != null) s.setShowStoreName(req.showStoreName());
        if (req.showStoreAddress() != null) s.setShowStoreAddress(req.showStoreAddress());
        if (req.showStorePhone() != null) s.setShowStorePhone(req.showStorePhone());
        if (req.showStoreEmail() != null) s.setShowStoreEmail(req.showStoreEmail());
        if (req.showReference() != null) s.setShowReference(req.showReference());
        if (req.showDate() != null) s.setShowDate(req.showDate());
        if (req.showSeller() != null) s.setShowSeller(req.showSeller());
        if (req.showCustomer() != null) s.setShowCustomer(req.showCustomer());
        if (req.showWarehouse() != null) s.setShowWarehouse(req.showWarehouse());
        if (req.showTax() != null) s.setShowTax(req.showTax());
        if (req.showDiscount() != null) s.setShowDiscount(req.showDiscount());
        if (req.showShipping() != null) s.setShowShipping(req.showShipping());
        if (req.showBarcode() != null) s.setShowBarcode(req.showBarcode());
        if (req.showNote() != null) s.setShowNote(req.showNote());
        if (req.showPaid() != null) s.setShowPaid(req.showPaid());
        if (req.showDue() != null) s.setShowDue(req.showDue());
        if (req.showPayments() != null) s.setShowPayments(req.showPayments());
        if (req.showFooter() != null) s.setShowFooter(req.showFooter());
        if (req.storeName() != null) s.setStoreName(req.storeName());
        if (req.storeAddress() != null) s.setStoreAddress(req.storeAddress());
        if (req.storePhone() != null) s.setStorePhone(req.storePhone());
        if (req.storeEmail() != null) s.setStoreEmail(req.storeEmail());
        if (req.storeTaxId() != null) s.setStoreTaxId(req.storeTaxId());
        if (req.footerMessage() != null) s.setFooterMessage(req.footerMessage());
        if (req.autoPrint() != null) s.setAutoPrint(req.autoPrint());
        if (req.productsPerPage() != null) s.setProductsPerPage(req.productsPerPage());
        if (req.defaultTaxRate() != null) s.setDefaultTaxRate(req.defaultTaxRate());
        if (req.defaultTaxMethod() != null) s.setDefaultTaxMethod(req.defaultTaxMethod());
        if (req.currencyCode() != null) s.setCurrencyCode(req.currencyCode());
        if (req.currencySymbol() != null) s.setCurrencySymbol(req.currencySymbol());

        s = repo.save(s);
        log.info("POS settings updated for warehouse {}", warehouseId);
        return PosSettingDto.from(s);
    }

    private PosSetting createDefaults(UUID warehouseId) {
        PosSetting s = PosSetting.builder().warehouseId(warehouseId).build();
        return repo.save(s);
    }
}
