package io.smartpos.sales.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.api.dto.EmailBrandingDto;
import io.smartpos.sales.domain.model.EmailBranding;
import io.smartpos.sales.domain.repository.EmailBrandingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmailBrandingService {

    private final EmailBrandingRepository repo;

    @Transactional(readOnly = true)
    @Cacheable(value = "emailBranding", key = "T(io.smartpos.common.context.TenantContext).require()")
    public EmailBrandingDto get() {
        UUID tenantId = TenantContext.require();
        EmailBranding eb = repo.findByTenantId(tenantId)
            .orElseGet(() -> createDefault(tenantId));
        return EmailBrandingDto.from(eb);
    }

    @Transactional
    @CacheEvict(value = "emailBranding", key = "T(io.smartpos.common.context.TenantContext).require()")
    public EmailBrandingDto update(EmailBrandingDto.UpdateRequest request) {
        UUID tenantId = TenantContext.require();
        EmailBranding eb = repo.findByTenantId(tenantId)
            .orElseGet(() -> createDefault(tenantId));

        apply(eb, request);
        EmailBranding saved = repo.save(eb);
        return EmailBrandingDto.from(saved);
    }

    @Transactional
    @CacheEvict(value = "emailBranding", key = "T(io.smartpos.common.context.TenantContext).require()")
    public EmailBrandingDto reset() {
        UUID tenantId = TenantContext.require();
        repo.findByTenantId(tenantId).ifPresent(repo::delete);
        EmailBranding eb = createDefault(tenantId);
        return EmailBrandingDto.from(eb);
    }

    private EmailBranding createDefault(UUID tenantId) {
        EmailBranding eb = EmailBranding.builder().tenantId(tenantId).build();
        return repo.save(eb);
    }

    private void apply(EmailBranding eb, EmailBrandingDto.UpdateRequest r) {
        if (r.getSenderName() != null) eb.setSenderName(r.getSenderName());
        if (r.getSenderEmail() != null) eb.setSenderEmail(r.getSenderEmail());
        if (r.getReplyTo() != null) eb.setReplyTo(r.getReplyTo());
        if (r.getFooterText() != null) eb.setFooterText(r.getFooterText());
        if (r.getShowSocialLinks() != null) eb.setShowSocialLinks(r.getShowSocialLinks());
        if (r.getInvoiceSubjectTemplate() != null) eb.setInvoiceSubjectTemplate(r.getInvoiceSubjectTemplate());
        if (r.getInvoiceBodyHtml() != null) eb.setInvoiceBodyHtml(r.getInvoiceBodyHtml());
        if (r.getReceiptSubjectTemplate() != null) eb.setReceiptSubjectTemplate(r.getReceiptSubjectTemplate());
        if (r.getReceiptBodyHtml() != null) eb.setReceiptBodyHtml(r.getReceiptBodyHtml());
        if (r.getWelcomeSubjectTemplate() != null) eb.setWelcomeSubjectTemplate(r.getWelcomeSubjectTemplate());
        if (r.getWelcomeBodyHtml() != null) eb.setWelcomeBodyHtml(r.getWelcomeBodyHtml());
        if (r.getResetPasswordSubjectTemplate() != null) eb.setResetPasswordSubjectTemplate(r.getResetPasswordSubjectTemplate());
        if (r.getResetPasswordBodyHtml() != null) eb.setResetPasswordBodyHtml(r.getResetPasswordBodyHtml());
    }
}
