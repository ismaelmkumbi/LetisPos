package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.ReceiptBranding;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptBrandingDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private UUID id;
    private UUID tenantId;

    private String headerText;
    private String footerText;
    private boolean showLogo;
    private BigDecimal logoWidthMm;
    private boolean showQrCode;
    private boolean showBarcode;
    private boolean showCustomerInfo;
    private String paperWidthMm;
    private BigDecimal fontSizeSmall;
    private BigDecimal fontSizeNormal;
    private BigDecimal fontSizeLarge;
    private BigDecimal lineSpacing;
    private boolean cutPaperAfterPrint;
    private boolean openCashDrawer;

    private Instant createdAt;
    private Instant updatedAt;

    public static ReceiptBrandingDto from(ReceiptBranding rb) {
        return ReceiptBrandingDto.builder()
            .id(rb.getId())
            .tenantId(rb.getTenantId())
            .headerText(rb.getHeaderText())
            .footerText(rb.getFooterText())
            .showLogo(rb.isShowLogo())
            .logoWidthMm(rb.getLogoWidthMm())
            .showQrCode(rb.isShowQrCode())
            .showBarcode(rb.isShowBarcode())
            .showCustomerInfo(rb.isShowCustomerInfo())
            .paperWidthMm(rb.getPaperWidthMm())
            .fontSizeSmall(rb.getFontSizeSmall())
            .fontSizeNormal(rb.getFontSizeNormal())
            .fontSizeLarge(rb.getFontSizeLarge())
            .lineSpacing(rb.getLineSpacing())
            .cutPaperAfterPrint(rb.isCutPaperAfterPrint())
            .openCashDrawer(rb.isOpenCashDrawer())
            .createdAt(rb.getCreatedAt())
            .updatedAt(rb.getUpdatedAt())
            .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String headerText;
        private String footerText;
        private Boolean showLogo;
        private BigDecimal logoWidthMm;
        private Boolean showQrCode;
        private Boolean showBarcode;
        private Boolean showCustomerInfo;
        private String paperWidthMm;
        private BigDecimal fontSizeSmall;
        private BigDecimal fontSizeNormal;
        private BigDecimal fontSizeLarge;
        private BigDecimal lineSpacing;
        private Boolean cutPaperAfterPrint;
        private Boolean openCashDrawer;
    }
}
