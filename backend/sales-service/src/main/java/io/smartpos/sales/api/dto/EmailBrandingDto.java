package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.EmailBranding;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailBrandingDto implements Serializable {
    private static final long serialVersionUID = 1L;

    private UUID id;
    private UUID tenantId;

    private String senderName;
    private String senderEmail;
    private String replyTo;
    private String footerText;
    private boolean showSocialLinks;

    private String invoiceSubjectTemplate;
    private String invoiceBodyHtml;
    private String receiptSubjectTemplate;
    private String receiptBodyHtml;
    private String welcomeSubjectTemplate;
    private String welcomeBodyHtml;
    private String resetPasswordSubjectTemplate;
    private String resetPasswordBodyHtml;

    private Instant createdAt;
    private Instant updatedAt;

    public static EmailBrandingDto from(EmailBranding eb) {
        return EmailBrandingDto.builder()
            .id(eb.getId())
            .tenantId(eb.getTenantId())
            .senderName(eb.getSenderName())
            .senderEmail(eb.getSenderEmail())
            .replyTo(eb.getReplyTo())
            .footerText(eb.getFooterText())
            .showSocialLinks(eb.isShowSocialLinks())
            .invoiceSubjectTemplate(eb.getInvoiceSubjectTemplate())
            .invoiceBodyHtml(eb.getInvoiceBodyHtml())
            .receiptSubjectTemplate(eb.getReceiptSubjectTemplate())
            .receiptBodyHtml(eb.getReceiptBodyHtml())
            .welcomeSubjectTemplate(eb.getWelcomeSubjectTemplate())
            .welcomeBodyHtml(eb.getWelcomeBodyHtml())
            .resetPasswordSubjectTemplate(eb.getResetPasswordSubjectTemplate())
            .resetPasswordBodyHtml(eb.getResetPasswordBodyHtml())
            .createdAt(eb.getCreatedAt())
            .updatedAt(eb.getUpdatedAt())
            .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String senderName;
        private String senderEmail;
        private String replyTo;
        private String footerText;
        private Boolean showSocialLinks;
        private String invoiceSubjectTemplate;
        private String invoiceBodyHtml;
        private String receiptSubjectTemplate;
        private String receiptBodyHtml;
        private String welcomeSubjectTemplate;
        private String welcomeBodyHtml;
        private String resetPasswordSubjectTemplate;
        private String resetPasswordBodyHtml;
    }
}
