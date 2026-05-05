package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.PosSetting;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PosSettingDto(
    UUID    id,
    UUID    warehouseId,

    // Receipt layout
    int receiptLayout,
    int receiptPaperSize,

    // Receipt display toggles
    boolean showLogo,
    int     logoSize,
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

    // Store branding
    String logoUrl,
    String storeWebsite,

    // Printing
    boolean autoPrint,

    // POS behaviour
    int     productsPerPage,
    boolean allowNegativeStock,
    boolean requireCustomerOnSale,
    boolean requireNoteOnSale,
    int     lowStockThreshold,
    boolean enableSound,
    int     kioskIdleTimeoutSec,

    // Sale reference
    String saleRefPrefix,
    short  saleRefPadding,

    // Tax defaults
    BigDecimal defaultTaxRate,
    String     defaultTaxMethod,

    // Discount & approval rules
    BigDecimal maxDiscountPercent,
    boolean    requirePinForDiscount,
    BigDecimal managerApprovalAbove,   // null = disabled

    // Currency
    String currencyCode,
    String currencySymbol,

    // Locale / regional
    String timezone,
    String dateFormat,
    String timeFormat,

    // Loyalty
    boolean    enableLoyalty,
    BigDecimal loyaltyPointsPerUnit,
    BigDecimal loyaltyValuePerPoint,
    int        loyaltyMinRedeemPoints,

    // Notifications
    boolean lowStockAlertEnabled,
    boolean dailySummaryEnabled,
    String  alertEmail,

    Instant createdAt,
    Instant updatedAt
) {
    // ── Mapper ────────────────────────────────────────────────────────────────
    public static PosSettingDto from(PosSetting s) {
        return new PosSettingDto(
            s.getId(), s.getWarehouseId(),
            // Receipt layout
            s.getReceiptLayout(), s.getReceiptPaperSize(),
            // Receipt toggles
            s.isShowLogo(), s.getLogoSize(),
            s.isShowStoreName(), s.isShowStoreAddress(), s.isShowStorePhone(), s.isShowStoreEmail(),
            s.isShowReference(), s.isShowDate(), s.isShowSeller(), s.isShowCustomer(),
            s.isShowWarehouse(), s.isShowTax(), s.isShowDiscount(), s.isShowShipping(),
            s.isShowBarcode(), s.isShowNote(), s.isShowPaid(), s.isShowDue(),
            s.isShowPayments(), s.isShowFooter(),
            // Store info
            s.getStoreName(), s.getStoreAddress(), s.getStorePhone(),
            s.getStoreEmail(), s.getStoreTaxId(), s.getFooterMessage(),
            // Store branding
            s.getLogoUrl(), s.getStoreWebsite(),
            // Printing
            s.isAutoPrint(),
            // POS behaviour
            s.getProductsPerPage(), s.isAllowNegativeStock(), s.isRequireCustomerOnSale(),
            s.isRequireNoteOnSale(), s.getLowStockThreshold(), s.isEnableSound(),
            s.getKioskIdleTimeoutSec(),
            // Sale reference
            s.getSaleRefPrefix(), s.getSaleRefPadding(),
            // Tax defaults
            s.getDefaultTaxRate(), s.getDefaultTaxMethod(),
            // Discount
            s.getMaxDiscountPercent(), s.isRequirePinForDiscount(), s.getManagerApprovalAbove(),
            // Currency
            s.getCurrencyCode(), s.getCurrencySymbol(),
            // Locale
            s.getTimezone(), s.getDateFormat(), s.getTimeFormat(),
            // Loyalty
            s.isEnableLoyalty(), s.getLoyaltyPointsPerUnit(), s.getLoyaltyValuePerPoint(),
            s.getLoyaltyMinRedeemPoints(),
            // Notifications
            s.isLowStockAlertEnabled(), s.isDailySummaryEnabled(), s.getAlertEmail(),
            s.getCreatedAt(), s.getUpdatedAt()
        );
    }

    // ── Patch request (all nullable — only provided fields are updated) ───────
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

        @Size(max = 255) String storeName,
        @Size(max = 255) String storeAddress,
        @Size(max = 64)  String storePhone,
        @Size(max = 128) String storeEmail,
        @Size(max = 64)  String storeTaxId,
        @Size(max = 255) String footerMessage,

        @Size(max = 512) String logoUrl,
        @Size(max = 255) String storeWebsite,

        Boolean autoPrint,

        @Min(1) @Max(200) Integer productsPerPage,
        Boolean allowNegativeStock,
        Boolean requireCustomerOnSale,
        Boolean requireNoteOnSale,
        @Min(0) @Max(10000) Integer lowStockThreshold,
        Boolean enableSound,
        @Min(30) @Max(3600) Integer kioskIdleTimeoutSec,

        @Size(max = 16) String saleRefPrefix,
        @Min(1) @Max(8) Short  saleRefPadding,

        @DecimalMin("0") @DecimalMax("100") BigDecimal defaultTaxRate,
        @Pattern(regexp = "EXCLUSIVE|INCLUSIVE") String defaultTaxMethod,

        @DecimalMin("0") @DecimalMax("100") BigDecimal maxDiscountPercent,
        Boolean    requirePinForDiscount,
        BigDecimal managerApprovalAbove,   // null clears the threshold

        @Size(max = 8)  String currencyCode,
        @Size(max = 8)  String currencySymbol,

        @Size(max = 64)  String timezone,
        @Size(max = 32)  String dateFormat,
        @Size(max = 16)  String timeFormat,

        Boolean    enableLoyalty,
        @DecimalMin("0") BigDecimal loyaltyPointsPerUnit,
        @DecimalMin("0") BigDecimal loyaltyValuePerPoint,
        @Min(0) Integer loyaltyMinRedeemPoints,

        Boolean lowStockAlertEnabled,
        Boolean dailySummaryEnabled,
        @Email @Size(max = 128) String alertEmail
    ) {}
}
