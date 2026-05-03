package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.PosSetting;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PosSettingDto(
    UUID id,
    UUID warehouseId,

    // Receipt layout
    int receiptLayout,
    int receiptPaperSize,

    // Receipt display toggles
    boolean showLogo,
    int logoSize,
    boolean showStoreName,
    boolean showStoreAddress,
    boolean showStorePhone,
    boolean showStoreEmail,
    boolean showReference,
    boolean showDate,
    boolean showSeller,
    boolean showCustomer,
    boolean showWarehouse,
    boolean showTax,
    boolean showDiscount,
    boolean showShipping,
    boolean showBarcode,
    boolean showNote,
    boolean showPaid,
    boolean showDue,
    boolean showPayments,
    boolean showFooter,

    // Store info
    String storeName,
    String storeAddress,
    String storePhone,
    String storeEmail,
    String storeTaxId,
    String footerMessage,

    // Printing
    boolean autoPrint,

    // POS behaviour
    int productsPerPage,

    // Tax defaults
    BigDecimal defaultTaxRate,
    String defaultTaxMethod,

    // Currency
    String currencyCode,
    String currencySymbol,

    Instant createdAt,
    Instant updatedAt
) {
    public static PosSettingDto from(PosSetting s) {
        return new PosSettingDto(
            s.getId(),
            s.getWarehouseId(),
            s.getReceiptLayout(),
            s.getReceiptPaperSize(),
            s.isShowLogo(),
            s.getLogoSize(),
            s.isShowStoreName(),
            s.isShowStoreAddress(),
            s.isShowStorePhone(),
            s.isShowStoreEmail(),
            s.isShowReference(),
            s.isShowDate(),
            s.isShowSeller(),
            s.isShowCustomer(),
            s.isShowWarehouse(),
            s.isShowTax(),
            s.isShowDiscount(),
            s.isShowShipping(),
            s.isShowBarcode(),
            s.isShowNote(),
            s.isShowPaid(),
            s.isShowDue(),
            s.isShowPayments(),
            s.isShowFooter(),
            s.getStoreName(),
            s.getStoreAddress(),
            s.getStorePhone(),
            s.getStoreEmail(),
            s.getStoreTaxId(),
            s.getFooterMessage(),
            s.isAutoPrint(),
            s.getProductsPerPage(),
            s.getDefaultTaxRate(),
            s.getDefaultTaxMethod(),
            s.getCurrencyCode(),
            s.getCurrencySymbol(),
            s.getCreatedAt(),
            s.getUpdatedAt()
        );
    }

    public record UpdateRequest(
        Integer receiptLayout,
        Integer receiptPaperSize,
        Boolean showLogo,
        Integer logoSize,
        Boolean showStoreName,
        Boolean showStoreAddress,
        Boolean showStorePhone,
        Boolean showStoreEmail,
        Boolean showReference,
        Boolean showDate,
        Boolean showSeller,
        Boolean showCustomer,
        Boolean showWarehouse,
        Boolean showTax,
        Boolean showDiscount,
        Boolean showShipping,
        Boolean showBarcode,
        Boolean showNote,
        Boolean showPaid,
        Boolean showDue,
        Boolean showPayments,
        Boolean showFooter,
        String storeName,
        String storeAddress,
        String storePhone,
        String storeEmail,
        String storeTaxId,
        String footerMessage,
        Boolean autoPrint,
        Integer productsPerPage,
        BigDecimal defaultTaxRate,
        String defaultTaxMethod,
        String currencyCode,
        String currencySymbol
    ) {}
}
