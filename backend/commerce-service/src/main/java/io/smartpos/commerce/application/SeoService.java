package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.SeoDefaults;
import io.smartpos.commerce.domain.repository.SeoDefaultsRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeoService {

    private final SeoDefaultsRepository repository;

    @Transactional(readOnly = true)
    public SeoDefaults getOrCreate(UUID storeId) {
        UUID tenantId = TenantContext.require();
        return repository.findByStoreId(storeId)
            .orElseGet(() -> {
                SeoDefaults defaults = SeoDefaults.builder()
                    .tenantId(tenantId)
                    .storeId(storeId)
                    .build();
                return repository.save(defaults);
            });
    }

    @Transactional
    public SeoDefaults update(UUID storeId, SeoDefaults updates) {
        SeoDefaults defaults = getOrCreate(storeId);
        if (updates.getMetaTitleTemplate() != null) defaults.setMetaTitleTemplate(updates.getMetaTitleTemplate());
        if (updates.getMetaDescriptionTemplate() != null) defaults.setMetaDescriptionTemplate(updates.getMetaDescriptionTemplate());
        if (updates.getOgImageUrl() != null) defaults.setOgImageUrl(updates.getOgImageUrl());
        if (updates.getTwitterHandle() != null) defaults.setTwitterHandle(updates.getTwitterHandle());
        if (updates.getRobotsTxt() != null) defaults.setRobotsTxt(updates.getRobotsTxt());
        if (updates.getGoogleSiteVerification() != null) defaults.setGoogleSiteVerification(updates.getGoogleSiteVerification());
        if (updates.getCustomHeadHtml() != null) defaults.setCustomHeadHtml(updates.getCustomHeadHtml());
        return repository.save(defaults);
    }
}
